import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendRealEmail, sendRealSMS, sendRealWhatsApp, sendRealWhatsAppLocation } from '../services/notificationService';

// Helper function to extract guest phone number
function getGuestPhone(guest: any): string | null {
  if (guest.preferences && typeof guest.preferences === 'object') {
    const prefs = guest.preferences as any;
    if (prefs.phone) return prefs.phone;
    if (prefs.telephone) return prefs.telephone;
  }
  const emailStr = guest.email.trim();
  const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
  if (isPhone) {
    return emailStr;
  }
  return null;
}

// Helper function to verify event ownership
async function verifyEventOwner(eventId: string, tenantId: string): Promise<boolean> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });
  return !!event;
}

// Get all invitations for an event
export async function getInvitations(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const invitations = await prisma.invitation.findMany({
      where: { eventId },
      include: { template: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(invitations);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des invitations:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des invitations' });
  }
}

// Create an invitation
export async function createInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const { templateId, subject, body, channel } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    if (!subject || !body || !channel) {
      return res.status(400).json({ error: 'Les champs subject, body et channel sont requis' });
    }

    const invitation = await prisma.invitation.create({
      data: {
        eventId,
        templateId: templateId || null,
        subject,
        body,
        channel, // EMAIL, LINK, QR
      },
    });

    return res.status(201).json(invitation);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'invitation:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'invitation' });
  }
}

// Send invitation (simulated sending)
export async function sendInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;
    const { guestIds, channel } = req.body || {};

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id, eventId },
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation non trouvée' });
    }

    // Retrieve guests for this event (either specific ones or all)
    let guests;
    if (guestIds && Array.isArray(guestIds) && guestIds.length > 0) {
      guests = await prisma.guest.findMany({
        where: { id: { in: guestIds }, eventId },
      });
    } else {
      guests = await prisma.guest.findMany({
        where: { eventId },
      });
    }

    if (guests.length === 0) {
      return res.status(400).json({ error: 'Aucun invité trouvé pour cet envoi. Veuillez d\'abord sélectionner ou ajouter des invités.' });
    }

    const activeChannel = channel || invitation.channel;

    // Fetch event details for variable replacement
    const event = await prisma.event.findFirst({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé' });
    }

    const formattedDate = event.date ? new Date(event.date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    // Send and generate RSVP links
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sentInvitations = await Promise.all(guests.map(async (guest) => {
      // Dynamic variables replacement
      let subject = invitation.subject || '';
      subject = subject
        .replaceAll('{{firstName}}', guest.firstName || '')
        .replaceAll('{{lastName}}', guest.lastName || '')
        .replaceAll('{{title}}', event.title || '')
        .replaceAll('{{description}}', event.description || '')
        .replaceAll('{{location}}', event.location || '')
        .replaceAll('{{date}}', formattedDate);
      
      let body = invitation.body || '';
      body = body
        .replaceAll('{{firstName}}', guest.firstName || '')
        .replaceAll('{{lastName}}', guest.lastName || '')
        .replaceAll('{{rsvpLink}}', `${FRONTEND_URL}/rsvp/${guest.id}`)
        .replaceAll('{{title}}', event.title || '')
        .replaceAll('{{description}}', event.description || '')
        .replaceAll('{{location}}', event.location || '')
        .replaceAll('{{date}}', formattedDate);

      // Support multiple channels (comma-separated, array, or specific combinations like EMAIL_AND_WHATSAPP)
      let channelsToSend: string[] = [];
      if (Array.isArray(activeChannel)) {
        channelsToSend = activeChannel;
      } else if (typeof activeChannel === 'string') {
        if (activeChannel === 'EMAIL_AND_WHATSAPP') {
          channelsToSend = ['EMAIL', 'WHATSAPP'];
        } else if (activeChannel === 'EMAIL_AND_SMS') {
          channelsToSend = ['EMAIL', 'SMS'];
        } else if (activeChannel === 'ALL_CHANNELS') {
          channelsToSend = ['EMAIL', 'WHATSAPP', 'SMS'];
        } else {
          channelsToSend = activeChannel.split(',').map(c => c.trim());
        }
      } else {
        channelsToSend = ['EMAIL'];
      }

      const channelResults = [];
      for (const chan of channelsToSend) {
        let sendResult: any = { success: true, simulated: true };

        if (chan === 'EMAIL') {
          sendResult = await sendRealEmail(guest.email, subject, body);
        } else if (chan === 'SMS') {
          const phone = getGuestPhone(guest);
          if (phone) {
            sendResult = await sendRealSMS(phone, body);
          } else {
            console.warn(`[Invitation Controller] Guest ${guest.firstName} ${guest.lastName} has no valid phone number for SMS sending.`);
            sendResult = { success: false, simulated: false, error: 'No valid phone number' };
          }
        } else if (chan === 'WHATSAPP') {
          const phone = getGuestPhone(guest);
          if (phone) {
            sendResult = await sendRealWhatsApp(phone, body);
            
            // If the main message succeeded and the event has GPS coordinates, send the location as a second message
            if (sendResult.success && event.latitude && event.longitude) {
              try {
                console.log(`[Invitation Controller] Sending WhatsApp Location for event "${event.title}" to ${guest.firstName} ${guest.lastName}...`);
                const locResult = await sendRealWhatsAppLocation(
                  phone, 
                  event.location || 'Lieu de l\'événement', 
                  event.latitude, 
                  event.longitude
                );
                if (!locResult.success) {
                  console.warn(`[Invitation Controller] Location message failed but main message succeeded:`, locResult.error);
                }
              } catch (locErr) {
                console.error(`[Invitation Controller] Error sending WhatsApp Location:`, locErr);
              }
            }
          } else {
            console.warn(`[Invitation Controller] Guest ${guest.firstName} ${guest.lastName} has no valid phone number for WhatsApp sending.`);
            sendResult = { success: false, simulated: false, error: 'No valid phone number' };
          }
        }

        channelResults.push({
          channel: chan,
          success: sendResult.success,
          simulated: sendResult.simulated,
          error: sendResult.error || null,
        });
      }

      // Determine overall status
      const anySuccess = channelResults.some(r => r.success);
      const allSimulated = channelResults.every(r => r.simulated);
      const errors = channelResults.filter(r => r.error).map(r => `${r.channel}: ${r.error}`).join('; ');

      return {
        guestId: guest.id,
        guestEmail: guest.email,
        subject,
        body,
        rsvpUrl: `${FRONTEND_URL}/rsvp/${guest.id}`,
        status: anySuccess ? (allSimulated ? 'SENT_SIMULATED' : 'SENT') : 'FAILED',
        channel: channelsToSend.join(', '),
        simulated: allSimulated,
        error: errors || null,
        channelResults,
      };
    }));

    const allSimulated = sentInvitations.every(inv => inv.simulated);
    const message = allSimulated
      ? `Envoi simulé réussi via ${activeChannel} pour ${guests.length} invités.`
      : `Envoi réel effectué avec succès via ${activeChannel} pour ${guests.length} invités.`;

    return res.json({
      message,
      invitationsSent: sentInvitations,
      results: sentInvitations.map(inv => {
        const guest = guests.find(g => g.id === inv.guestId);
        return {
          guestId: inv.guestId,
          guestName: guest ? `${guest.firstName} ${guest.lastName}` : 'Invité',
          email: inv.guestEmail,
          phone: guest ? getGuestPhone(guest) : null,
          rsvpLink: inv.rsvpUrl,
          subject: inv.subject,
          body: inv.body,
          channel: inv.channel,
          status: inv.status,
          error: inv.error,
        };
      })
    });
  } catch (error: any) {
    console.error('Erreur lors de la diffusion de l\'invitation:', error);
    return res.status(500).json({ error: 'Erreur lors de la diffusion de l\'invitation' });
  }
}

// Update an invitation
export async function updateInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;
    const { templateId, subject, body, channel } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: { id, eventId },
    });

    if (!existingInvitation) {
      return res.status(404).json({ error: 'Invitation non trouvée dans cet événement' });
    }

    const updatedInvitation = await prisma.invitation.update({
      where: { id },
      data: {
        templateId: templateId !== undefined ? (templateId || null) : existingInvitation.templateId,
        subject: subject !== undefined ? subject : existingInvitation.subject,
        body: body !== undefined ? body : existingInvitation.body,
        channel: channel !== undefined ? channel : existingInvitation.channel,
      },
      include: { template: true },
    });

    return res.json(updatedInvitation);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'invitation:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'invitation' });
  }
}

// Delete an invitation
export async function deleteInvitation(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: { id, eventId },
    });

    if (!existingInvitation) {
      return res.status(404).json({ error: 'Invitation non trouvée dans cet événement' });
    }

    await prisma.invitation.delete({
      where: { id },
    });

    return res.json({ message: 'Invitation supprimée avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'invitation:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invitation' });
  }
}

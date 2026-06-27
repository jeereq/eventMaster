import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

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

    // Retrieve all guests for this event
    const guests = await prisma.guest.findMany({
      where: { eventId },
    });

    if (guests.length === 0) {
      return res.status(400).json({ error: 'Aucun invité trouvé pour cet événement. Veuillez d\'abord ajouter des invités.' });
    }

    // Simulate sending email and generating RSVP links
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sentInvitations = guests.map(guest => {
      // Dynamic variables replacement
      let subject = invitation.subject
        .replace('{{firstName}}', guest.firstName)
        .replace('{{lastName}}', guest.lastName);
      
      let body = invitation.body
        .replace('{{firstName}}', guest.firstName)
        .replace('{{lastName}}', guest.lastName)
        .replace('{{rsvpLink}}', `${FRONTEND_URL}/rsvp/${guest.id}`);

      return {
        guestId: guest.id,
        guestEmail: guest.email,
        subject,
        body,
        rsvpUrl: `${FRONTEND_URL}/rsvp/${guest.id}`,
        status: 'SENT_SIMULATED',
      };
    });

    return res.json({
      message: `Envoi simulé réussi pour ${guests.length} invités.`,
      invitationsSent: sentInvitations,
      results: sentInvitations.map(inv => ({
        guestId: inv.guestId,
        guestName: guests.find(g => g.id === inv.guestId) ? `${guests.find(g => g.id === inv.guestId)?.firstName} ${guests.find(g => g.id === inv.guestId)?.lastName}` : 'Invité',
        email: inv.guestEmail,
        rsvpLink: inv.rsvpUrl
      }))
    });
  } catch (error: any) {
    console.error('Erreur lors de la diffusion de l\'invitation:', error);
    return res.status(500).json({ error: 'Erreur lors de la diffusion de l\'invitation' });
  }
}

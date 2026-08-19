import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendRealEmail, sendRealWhatsApp } from '../services/notificationService';
import { resolveDeliveryChannels } from '../utils/notificationChannels';
import { renderGuestMessage, applyTemplateVariables } from '../services/messageTemplateService';
import { applyInvitationGuidelineVariables, guestGuidelinesInvitationText } from '../utils/guestGuidelines';
import { canManageEvent, canAccessEvent } from '../services/permissionsService';
import {
  brandedEventDetailsHtml,
  loadOrgBrand,
  withOrgSignoff,
  wrapBrandedEmail,
  wrapBrandedWhatsApp,
} from '../utils/brandedMessaging';
import { escapeHtml } from '../utils/brandingUtils';
import { extractGuestEmail } from '../utils/guestIdentity';
async function verifyEventAccess(
  userId: string,
  tenantId: string,
  eventId: string,
  requireManage = false,
): Promise<boolean> {
  if (requireManage) {
    return canManageEvent(userId, tenantId, eventId);
  }
  return canAccessEvent(userId, tenantId, eventId);
}

function getGuestPhone(guest: any): string | null {
  if (guest.preferences && typeof guest.preferences === 'object') {
    const prefs = guest.preferences as any;
    if (prefs.phone) return prefs.phone;
    if (prefs.telephone) return prefs.telephone;
  }
  const emailStr = guest.email.trim();
  const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
  if (isPhone) return emailStr;
  return null;
}

// Get all invitations for an event
export async function getInvitations(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await verifyEventAccess(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Événement non trouvé ou non autorisé' });
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

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await verifyEventAccess(userId, tenantId, eventId, true))) {
      return res.status(403).json({ error: 'Événement non trouvé ou non autorisé' });
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

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await verifyEventAccess(userId, tenantId, eventId, true))) {
      return res.status(403).json({ error: 'Événement non trouvé ou non autorisé' });
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
    const orgBrand = await loadOrgBrand(event.tenantId);

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
        .replaceAll('{{date}}', formattedDate)
        .replaceAll('{{orgName}}', orgBrand.orgName);
      
      let body = invitation.body || '';
      body = body
        .replaceAll('{{firstName}}', guest.firstName || '')
        .replaceAll('{{lastName}}', guest.lastName || '')
        .replaceAll('{{rsvpLink}}', `${FRONTEND_URL}/rsvp/${guest.id}`)
        .replaceAll('{{title}}', event.title || '')
        .replaceAll('{{description}}', event.description || '')
        .replaceAll('{{location}}', event.location || '')
        .replaceAll('{{date}}', formattedDate)
        .replaceAll('{{orgName}}', orgBrand.orgName);

      subject = applyInvitationGuidelineVariables(subject, event.guestGuidelines);
      body = withOrgSignoff(applyInvitationGuidelineVariables(body, event.guestGuidelines), orgBrand.orgName);
      const guidelinesText = guestGuidelinesInvitationText(event.guestGuidelines);
      const guidelinesAlreadyInBody = Boolean(
        guidelinesText && body.includes(guidelinesText.slice(0, Math.min(24, guidelinesText.length))),
      );

      // Canaux : e-mail et WhatsApp uniquement (SMS / alias legacy convertis)
      const channelsToSend = resolveDeliveryChannels(activeChannel);

      const channelResults = [];
      for (const chan of channelsToSend) {
        let sendResult: any = { success: true, simulated: true };

        if (chan === 'EMAIL') {
          const destEmail = extractGuestEmail(guest);
          if (!destEmail) {
            sendResult = {
              success: false,
              simulated: false,
              error: 'Adresse e-mail invalide ou manquante',
              failureCode: 'noEmail',
            };
          } else {
          const htmlBody = wrapBrandedEmail({
            branding: orgBrand.branding,
            orgName: orgBrand.orgName,
            title: event.title,
            eyebrow: 'Invitation personnalisée',
            innerHtml: `
              <p style="font-size:16px;font-weight:700;color:#1e1b4b;margin:0 0 15px;">Bonjour ${escapeHtml(guest.firstName)},</p>
              <div style="font-size:15px;line-height:1.7;color:#475569;margin-bottom:28px;white-space:pre-line;">
                ${escapeHtml(body.replace(`${FRONTEND_URL}/rsvp/${guest.id}`, '')).replace(/\n/g, '<br/>')}
              </div>
              ${brandedEventDetailsHtml(orgBrand.branding, [
                { label: 'Date', value: formattedDate },
                { label: 'Lieu', value: event.location || 'Non spécifié' },
              ])}
              ${
                guidelinesText && !guidelinesAlreadyInBody
                  ? `<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:18px;margin:0 0 8px;">
                      <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:${orgBrand.branding.primary};text-transform:uppercase;letter-spacing:0.05em;">Infos pratiques</p>
                      <p style="margin:0;font-size:14px;color:#475569;white-space:pre-line;line-height:1.6;">${escapeHtml(guidelinesText)}</p>
                    </div>`
                  : ''
              }
            `,
            cta: { href: `${FRONTEND_URL}/rsvp/${guest.id}`, label: 'Confirmer ma présence (RSVP)' },
            footerNote: 'Merci de répondre avant la date de l’événement. Dès confirmation, votre plan de table, invitation PDF et localisation GPS vous sont envoyés si votre place est déjà assignée.',
          });
          sendResult = await sendRealEmail(
            destEmail,
            subject,
            body,
            htmlBody,
          );
          }
        } else if (chan === 'WHATSAPP') {
          const phone = getGuestPhone(guest);
          if (phone) {
            const templateVars = {
              firstName: guest.firstName || '',
              lastName: guest.lastName || '',
              rsvpLink: `${FRONTEND_URL}/rsvp/${guest.id}`,
              title: event.title || '',
              description: event.description || '',
              location: event.location || '',
              date: formattedDate,
              orgName: orgBrand.orgName,
            };

            let whatsappBody = body.trim()
              ? applyTemplateVariables(body, templateVars)
              : (await renderGuestMessage('INVITATION_WHATSAPP', templateVars)).body;
            whatsappBody = wrapBrandedWhatsApp(whatsappBody, orgBrand.orgName, {
              guidelinesBlock: guidelinesText,
            });
            sendResult = await sendRealWhatsApp(phone, whatsappBody);
          } else {
            console.warn(`[Invitation Controller] Guest ${guest.firstName} ${guest.lastName} has no valid phone number for WhatsApp sending.`);
            sendResult = {
              success: false,
              simulated: false,
              error: 'Numéro WhatsApp manquant ou invalide',
              failureCode: 'noPhone',
            };
          }
        }

        channelResults.push({
          channel: chan,
          success: sendResult.success,
          simulated: sendResult.simulated,
          error: sendResult.error || null,
          failureCode: sendResult.failureCode || null,
        });
      }

      // Determine overall status
      const anySuccess = channelResults.some(r => r.success);
      const allSimulated = channelResults.every(r => r.simulated);
      const errors = channelResults.filter(r => r.error).map(r => `${r.channel}: ${r.error}`).join('; ');
      const status = anySuccess ? (allSimulated ? 'SENT_SIMULATED' : 'SENT') : 'FAILED';
      const nowIso = new Date().toISOString();

      const prefs =
        guest.preferences && typeof guest.preferences === 'object'
          ? (guest.preferences as Record<string, unknown>)
          : {};
      await prisma.guest.update({
        where: { id: guest.id },
        data: {
          preferences: {
            ...prefs,
            ...(anySuccess ? { invitationSentAt: nowIso } : {}),
            invitationLastAttemptAt: nowIso,
            invitationLastStatus: status,
            invitationLastError: errors || null,
            invitationLastChannels: channelsToSend.join(', '),
          },
        },
      });

      return {
        guestId: guest.id,
        guestEmail: guest.email,
        subject,
        body,
        rsvpUrl: `${FRONTEND_URL}/rsvp/${guest.id}`,
        invitationPdfUrl: null,
        status,
        channel: channelsToSend.join(', '),
        simulated: allSimulated,
        error: errors || null,
        channelResults,
      };
    }));

    const allSimulated = sentInvitations.every(inv => inv.simulated);
    const failedCount = sentInvitations.filter(inv => inv.status === 'FAILED').length;
    const simulatedCount = sentInvitations.filter(inv => inv.status === 'SENT_SIMULATED').length;
    const sentCount = sentInvitations.filter(inv => inv.status === 'SENT').length;

    const failureReasons = { noPhone: 0, noEmail: 0, provider: 0 };
    for (const inv of sentInvitations) {
      if (inv.status !== 'FAILED') continue;
      const codes = (inv.channelResults || [])
        .filter((r: { success?: boolean }) => !r.success)
        .map((r: { failureCode?: string | null; error?: string | null }) => {
          if (r.failureCode === 'noPhone' || r.failureCode === 'noEmail') return r.failureCode;
          const err = String(r.error || '').toLowerCase();
          if (err.includes('phone') || err.includes('whatsapp') || err.includes('numéro')) return 'noPhone';
          if (err.includes('e-mail') || err.includes('email')) return 'noEmail';
          return 'provider';
        });
      const unique = Array.from(new Set(codes));
      if (unique.includes('noPhone')) failureReasons.noPhone += 1;
      else if (unique.includes('noEmail')) failureReasons.noEmail += 1;
      else failureReasons.provider += 1;
    }

    let message: string;
    if (failedCount === sentInvitations.length) {
      message = `Échec de l'envoi pour ${failedCount} invité(s) via ${activeChannel}.`;
    } else if (allSimulated) {
      message = `Envoi simulé pour ${guests.length} invité(s) via ${activeChannel} (SendGrid / UltraMsg non configurés).`;
    } else if (failedCount > 0 || simulatedCount > 0) {
      message = `Envoi partiel : ${sentCount} réussi(s), ${simulatedCount} simulé(s), ${failedCount} échec(s) via ${activeChannel}.`;
    } else {
      message = `Envoi réel effectué avec succès pour ${guests.length} invité(s) via ${activeChannel}.`;
    }

    return res.json({
      message,
      summary: {
        total: sentInvitations.length,
        sent: sentCount,
        simulated: simulatedCount,
        failed: failedCount,
        allSimulated,
        failureReasons,
      },
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
          simulated: inv.simulated,
          error: inv.error,
          channelResults: inv.channelResults,
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

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await verifyEventAccess(userId, tenantId, eventId, true))) {
      return res.status(403).json({ error: 'Événement non trouvé ou non autorisé' });
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

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await verifyEventAccess(userId, tenantId, eventId, true))) {
      return res.status(403).json({ error: 'Événement non trouvé ou non autorisé' });
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

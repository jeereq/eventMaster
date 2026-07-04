import { Request, Response } from 'express';
import { normalizeGuestPreferences } from '../utils/rsvpPreferences';
import { prisma } from '../db';
import { sendRealEmail, sendRealWhatsApp, sendRealWhatsAppImage } from '../services/notificationService';
import { renderGuestMessage, polishWhatsAppBody } from '../services/messageTemplateService';
import { findGuestsByIdentity } from '../services/legalService';
import { extractGuestEmail, extractGuestPhone } from '../utils/guestIdentity';
import { findGuestSeatInTablePlan } from '../services/commercialService';
import { buildInvitationPdfBuffer } from '../services/guestSeatNotificationService';
import { getTableMateGuestIds } from '../utils/tablePlanAssignment';
import { normalizeGuestGuidelines, formatDressCodeText } from '../utils/guestGuidelines';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function isEventDatePassed(eventDate: Date | string): boolean {
  return new Date(eventDate).getTime() < Date.now();
}

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

function getUserPhone(user: { phone?: string | null; email?: string | null }): string | null {
  if (user.phone?.trim()) return user.phone.trim();
  const emailStr = user.email?.trim() || '';
  const isPhone = /^\+?[0-9\s\-()]{7,20}$/.test(emailStr);
  return isPhone ? emailStr : null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatPreferencesDetails(preferences: unknown): string {
  if (!preferences || typeof preferences !== 'object') return '';

  const prefs = preferences as Record<string, unknown>;
  const lines: string[] = [];

  if (prefs.allergies) lines.push(`- Allergies : ${prefs.allergies}`);
  if (prefs.specialMeal) lines.push(`- Repas spécial : ${prefs.specialMeal}`);
  if (prefs.notes) lines.push(`- Notes : ${prefs.notes}`);

  if (prefs.customFields && typeof prefs.customFields === 'object') {
    for (const [key, value] of Object.entries(prefs.customFields as Record<string, unknown>)) {
      if (value !== undefined && value !== null && String(value).trim()) {
        lines.push(`- ${key} : ${value}`);
      }
    }
  }

  return lines.length > 0 ? `\n\nPréférences indiquées :\n${lines.join('\n')}` : '';
}

async function resolveEventOrganizer(tenantId: string, manager: { id: string; name: string | null; email: string; phone: string | null } | null) {
  if (manager) return manager;

  return prisma.user.findFirst({
    where: { tenantId, role: 'USER' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, phone: true },
  });
}

async function notifyOrganizerOfRsvp(params: {
  organizer: { name: string | null; email: string; phone: string | null };
  guest: { firstName: string; lastName: string; email: string };
  eventTitle: string;
  rsvp: 'ACCEPTED' | 'DECLINED';
  preferences: unknown;
}) {
  const { organizer, guest, eventTitle, rsvp, preferences } = params;
  const statusLabel = rsvp === 'ACCEPTED' ? 'Présence confirmée (Oui)' : 'Absence (Décliné)';
  const preferencesDetails = formatPreferencesDetails(preferences);
  const ownerSubject = `[RSVP] ${guest.firstName} ${guest.lastName} — ${rsvp === 'ACCEPTED' ? 'Présent' : 'Décliné'}`;
  const dashboardUrl = `${FRONTEND_URL}/dashboard/events`;

  const ownerTextBody =
    `Bonjour ${organizer.name || 'Organisateur'},\n\n` +
    `Un invité vient de répondre à votre invitation pour l'événement "${eventTitle}".\n\n` +
    `Invité : ${guest.firstName} ${guest.lastName}\n` +
    `Email : ${guest.email}\n` +
    `Statut : ${statusLabel}${preferencesDetails}\n\n` +
    `Consultez la liste complète : ${dashboardUrl}\n\n` +
    `L'équipe EventMaster`;

  const ownerHtmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e1b4b; margin-bottom: 5px;">Nouvelle réponse RSVP</h2>
      <p style="color: #64748b; margin-top: 0; margin-bottom: 20px;">Un invité a répondu pour <strong>${eventTitle}</strong>.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px;"><strong>Invité :</strong> ${guest.firstName} ${guest.lastName}</p>
        <p style="margin: 0 0 8px;"><strong>Email :</strong> ${guest.email}</p>
        <p style="margin: 0;">
          <strong>Statut :</strong>
          <span style="display: inline-block; padding: 4px 10px; font-size: 12px; font-weight: bold; border-radius: 20px; margin-left: 6px; ${rsvp === 'ACCEPTED' ? 'background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;' : 'background-color: #fff1f2; color: #be123c; border: 1px solid #fecdd3;'}">
            ${statusLabel}
          </span>
        </p>
      </div>
      ${preferencesDetails ? `<pre style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; padding: 15px; font-size: 13px; white-space: pre-wrap;">${preferencesDetails.trim()}</pre>` : ''}
      <div style="text-align: center; margin-top: 25px;">
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; font-size: 14px;">Voir mes invités</a>
      </div>
    </div>
  `;

  const ownerWhatsappRendered = await renderGuestMessage('RSVP_ORGANIZER_WHATSAPP', {
    title: eventTitle,
    firstName: guest.firstName,
    lastName: guest.lastName,
    statusLabel: rsvp === 'ACCEPTED' ? '✅ Présent' : '❌ Décliné',
    preferencesDetails: preferencesDetails ? `\n\n📋 *Préférences* :${preferencesDetails}` : '',
    dashboardUrl,
  });
  const ownerWhatsappBody = polishWhatsAppBody(ownerWhatsappRendered.body);

  const organizerPhone = getUserPhone(organizer);
  const results: string[] = [];

  if (isValidEmail(organizer.email)) {
    const emailResult = await sendRealEmail(organizer.email, ownerSubject, ownerTextBody, ownerHtmlBody);
    if (emailResult.success && !emailResult.simulated) {
      results.push(`email:${organizer.email}`);
    } else if (emailResult.simulated) {
      console.log(`[RSVP Controller] Organizer email simulated to ${organizer.email}`);
    } else {
      console.warn(`[RSVP Controller] Organizer email failed for ${organizer.email}`);
    }
  }

  if (organizerPhone) {
    const whatsappResult = await sendRealWhatsApp(organizerPhone, ownerWhatsappBody);
    if (whatsappResult.success && !whatsappResult.simulated) {
      results.push(`whatsapp:${organizerPhone}`);
    } else if (whatsappResult.simulated) {
      console.log(`[RSVP Controller] Organizer WhatsApp simulated to ${organizerPhone}`);
    } else {
      console.warn(`[RSVP Controller] Organizer WhatsApp failed for ${organizerPhone}:`, whatsappResult.error);
    }
  }

  if (results.length === 0) {
    console.warn(`[RSVP Controller] Aucune notification organisateur envoyée (email/téléphone manquants ou simulés).`);
  } else {
    console.log(`[RSVP Controller] Organisateur notifié via: ${results.join(', ')}`);
  }
}

// Public endpoint to get guest and event details
export async function getGuestRsvpDetails(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            date: true,
            location: true,
            latitude: true,
            longitude: true,
            tablePlan: true,
            guestGuidelines: true,
            room: {
              select: {
                layoutBlueprint: true,
              },
            },
            invitations: {
              where: {
                templateId: { not: null }
              },
              select: {
                template: true
              },
              take: 1
            }
          },
        },
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    // Extract table details if the guest is assigned to a table
    let tableDetails = null;
    let tablePlanOverview: Array<{
      id: string;
      name: string;
      shape: string;
      capacity: number;
      x: number;
      y: number;
      occupiedCount: number;
      isGuestTable: boolean;
      chairType?: string;
      chairImageUrl?: string;
    }> | null = null;
    let planFixtures: Array<{
      id: string;
      kind: string;
      x: number;
      y: number;
      w: number;
      h: number;
      label?: string;
      color?: string;
      columnShape?: string;
      rotation?: number;
    }> | null = null;
    let roomOutline: {
      shape: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
    } | null = null;
    let roomThemeId: string | null = null;
    let floorType: string | null = null;
    let floorImageUrl: string | null = null;

    const eventObj = guest.event as any;
    if (eventObj && eventObj.tablePlan && typeof eventObj.tablePlan === 'object') {
      const plan = eventObj.tablePlan;
      if (Array.isArray(plan.tables)) {
        tablePlanOverview = plan.tables.map((table: any) => ({
          id: table.id,
          name: table.name,
          shape: table.shape,
          capacity: table.capacity,
          x: table.x,
          y: table.y,
          occupiedCount: Object.values(table.seats || {}).filter(Boolean).length,
          isGuestTable: Object.values(table.seats || {}).includes(guestId),
          chairType: table.chairType,
          chairImageUrl: table.chairImageUrl,
          tableColor: table.tableColor,
          tableImageUrl: table.tableImageUrl,
        }));

        if (Array.isArray(plan.fixtures)) {
          planFixtures = plan.fixtures;
        }

        for (const table of plan.tables) {
          const seatsObj = table.seats || {};
          const seatEntries = Object.entries(seatsObj) as [string, string | null][];
          const guestSeatEntry = seatEntries.find(([, id]) => id === guestId);

          if (guestSeatEntry) {
            const seatIndex = parseInt(guestSeatEntry[0], 10);
            const neighborIds = seatEntries
              .filter(([, id]) => id && id !== guestId)
              .map(([, id]) => id as string);

            let neighbors: Array<{ id: string; firstName: string; lastName: string; seatIndex?: number }> = [];
            if (neighborIds.length > 0) {
              const neighborGuests = await prisma.guest.findMany({
                where: { id: { in: neighborIds } },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              });
              neighbors = neighborGuests.map((g) => {
                const neighborSeat = seatEntries.find(([, id]) => id === g.id);
                return {
                  ...g,
                  seatIndex: neighborSeat ? parseInt(neighborSeat[0], 10) : undefined,
                };
              });
            }

            tableDetails = {
              tableName: table.name,
              shape: table.shape,
              capacity: table.capacity,
              seatIndex,
              chairType: table.chairType,
              chairImageUrl: table.chairImageUrl,
              neighbors,
            };
            break;
          }
        }
      }

      const room = eventObj.room as any;
      if (room?.layoutBlueprint?.roomOutline) {
        roomOutline = room.layoutBlueprint.roomOutline;
      } else if (plan.roomOutline) {
        roomOutline = plan.roomOutline;
      }
      if (room?.layoutBlueprint?.metadata?.roomThemeId) {
        roomThemeId = room.layoutBlueprint.metadata.roomThemeId;
      } else if (plan.roomThemeId) {
        roomThemeId = plan.roomThemeId;
      }
      if (room?.layoutBlueprint?.metadata?.floorType) {
        floorType = room.layoutBlueprint.metadata.floorType;
      } else if (plan.floorType) {
        floorType = plan.floorType;
      }
      if (room?.layoutBlueprint?.metadata?.floorImageUrl) {
        floorImageUrl = room.layoutBlueprint.metadata.floorImageUrl;
      } else if (plan.floorImageUrl) {
        floorImageUrl = plan.floorImageUrl;
      }
    }

    return res.json({
      ...guest,
      tableDetails,
      tablePlanOverview,
      planFixtures,
      roomOutline,
      roomThemeId,
      floorType,
      floorImageUrl,
      eventPassed: isEventDatePassed(guest.event.date),
      rsvpLocked: isEventDatePassed(guest.event.date),
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des détails RSVP de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du RSVP' });
  }
}

// Public endpoint: all events where this guest (by email or phone) has been invited
export async function getGuestAllInvitations(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;

    const anchorGuest = await prisma.guest.findUnique({
      where: { id: guestId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, preferences: true },
    });

    if (!anchorGuest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien invalide.' });
    }

    const guestRecords = await findGuestsByIdentity(anchorGuest);
    const identityEmail = extractGuestEmail(anchorGuest);
    const identityPhone = extractGuestPhone(anchorGuest);

    const invitations = guestRecords
      .map((record) => {
        const eventPassed = isEventDatePassed(record.event.date);
        return {
          guestId: record.id,
          rsvp: record.rsvp,
          event: record.event,
          organizationName: record.event.tenant?.name || 'Organisation',
          eventPassed,
          rsvpLocked: eventPassed,
          isCurrent: record.id === guestId,
        };
      })
      .sort((a, b) => new Date(a.event.date).getTime() - new Date(b.event.date).getTime());

    return res.json({
      guest: {
        firstName: anchorGuest.firstName,
        lastName: anchorGuest.lastName,
        email: identityEmail,
        phone: identityPhone,
      },
      currentGuestId: guestId,
      invitations,
      total: invitations.length,
      upcomingCount: invitations.filter((i) => !i.eventPassed).length,
      pastCount: invitations.filter((i) => i.eventPassed).length,
      matchedBy: {
        email: Boolean(identityEmail),
        phone: Boolean(identityPhone),
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération des invitations invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de vos invitations.' });
  }
}

// Public endpoint to submit RSVP response and preferences
export async function submitRsvp(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { rsvp, preferences } = req.body; // Expects rsvp: 'ACCEPTED' | 'DECLINED' and preferences: object

    if (!rsvp || !['ACCEPTED', 'DECLINED'].includes(rsvp)) {
      return res.status(400).json({ error: 'Le statut RSVP doit être ACCEPTED ou DECLINED.' });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: { 
        event: {
          include: {
            tenant: {
              include: {
                manager: true
              }
            }
          }
        } 
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    if (isEventDatePassed(guest.event.date)) {
      return res.status(403).json({
        error: 'La date de célébration est passée. Votre réponse RSVP ne peut plus être modifiée.',
        rsvpLocked: true,
      });
    }

    const previousRsvp = guest.rsvp;
    const statusChanged = previousRsvp !== rsvp;
    const normalizedPreferences = normalizeGuestPreferences(preferences);

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        rsvp,
        preferences: normalizedPreferences as object,
      },
    });

    // Send QR Code notifications asynchronously if RSVP is accepted
    const formattedDate = guest.event.date ? new Date(guest.event.date).toLocaleDateString('fr-FR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : '';

    if (rsvp === 'ACCEPTED') {
      // Customized QR Code with platform colors (Indigo: #4f46e5) - point to the public RSVP landing page for this guest
      const rsvpUrl = `${FRONTEND_URL}/rsvp/${guest.id}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(rsvpUrl)}&color=4f-46-e5&bgcolor=ffffff&qzone=2`;

      const subject = `Confirmation de votre présence - ${guest.event.title}`;
      const textBody = `Bonjour ${guest.firstName},\n\nVotre présence à l'événement "${guest.event.title}" a été confirmée avec succès !\n\nVoici votre badge d'émargement QR Code : ${qrCodeUrl}\n\nPrésentez ce QR Code à l'entrée pour valider votre présence.\n\nDate : ${formattedDate}\nLieu : ${guest.event.location || 'Non défini'}\n\nMerci et à très bientôt !`;
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e1b4b; text-align: center; margin-bottom: 5px;">Présence Confirmée !</h2>
          <p style="text-align: center; color: #4f46e5; font-weight: bold; margin-top: 0; margin-bottom: 20px;">Merci, ${guest.firstName} !</p>
          <p>Bonjour <strong>${guest.firstName} ${guest.lastName}</strong>,</p>
          <p>Votre présence à l'événement <strong>${guest.event.title}</strong> a été enregistrée avec succès.</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 12px; font-weight: bold; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 10px;">Votre Badge d'Émargement</span>
            <img src="${qrCodeUrl}" alt="QR Code d'émargement" style="width: 180px; height: 180px; border: 1px solid #cbd5e1; border-radius: 8px; padding: 5px; background-color: white;" />
            <p style="font-size: 12px; color: #64748b; margin-top: 10px; margin-bottom: 0;">Présentez ce QR Code à l'entrée pour valider votre présence.</p>
          </div>

          <div style="margin-top: 20px; font-size: 14px; color: #334155; background-color: #f1f5f9; padding: 15px; border-radius: 8px;">
            <strong>Détails de l'événement :</strong><br />
            📅 Date : ${formattedDate}<br />
            📍 Lieu : ${guest.event.location || 'Non défini'}
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">Cet e-mail automatique a été envoyé par EventMaster.</p>
        </div>
      `;

      const whatsappRendered = await renderGuestMessage('RSVP_CONFIRMATION_WHATSAPP', {
        firstName: guest.firstName,
        title: guest.event.title,
        date: formattedDate,
        location: guest.event.location || 'Non défini',
      });
      const whatsappCaption = polishWhatsAppBody(whatsappRendered.body);

      // Run sending in the background to avoid blocking the user response
      (async () => {
        try {
          // 1. Send Email if valid email address
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest.email.trim());
          if (isEmail) {
            console.log(`[RSVP Controller] Sending confirmation email with QR Code to ${guest.email}...`);
            await sendRealEmail(guest.email, subject, textBody, htmlBody);
          }

          // 2. WhatsApp avec image QR
          const phone = getGuestPhone(guest);
          if (phone) {
            console.log(`[RSVP Controller] Sending confirmation WhatsApp Image with QR Code to ${phone}...`);
            await sendRealWhatsAppImage(phone, qrCodeUrl, whatsappCaption);
          }
        } catch (notifErr) {
          console.error('[RSVP Controller] Error sending QR Code confirmation notifications:', notifErr);
        }
      })();
    }

    // Notifier l'organisateur (email + WhatsApp) à chaque changement de statut RSVP
    if (statusChanged) {
      (async () => {
        try {
          const organizer = await resolveEventOrganizer(
            guest.event.tenantId,
            guest.event.tenant?.manager ?? null
          );

          if (!organizer) {
            console.warn(`[RSVP Controller] Aucun organisateur trouvé pour le tenant ${guest.event.tenantId}`);
            return;
          }

          await notifyOrganizerOfRsvp({
            organizer,
            guest: {
              firstName: guest.firstName,
              lastName: guest.lastName,
              email: guest.email,
            },
            eventTitle: guest.event.title,
            rsvp,
            preferences: preferences || {},
          });
        } catch (ownerNotifErr) {
          console.error('[RSVP Controller] Error sending notification to event organizer:', ownerNotifErr);
        }
      })();
    }

    return res.json({
      message: 'Votre réponse RSVP a été enregistrée avec succès.',
      guest: {
        id: updatedGuest.id,
        firstName: updatedGuest.firstName,
        lastName: updatedGuest.lastName,
        rsvp: updatedGuest.rsvp,
        preferences: updatedGuest.preferences,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission du RSVP:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre réponse RSVP.' });
  }
}

export async function downloadSeatingInvitationPdf(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        event: {
          select: {
            title: true,
            description: true,
            date: true,
            location: true,
            guestGuidelines: true,
            tablePlan: true,
          },
        },
      },
    });

    if (!guest?.event) {
      return res.status(404).json({ error: 'Invitation introuvable.' });
    }

    const assigned = findGuestSeatInTablePlan(guest.event.tablePlan, guestId);
    if (!assigned) {
      return res.status(404).json({ error: 'Aucun placement de table pour cet invité.' });
    }

    const mateIds = getTableMateGuestIds(guest.event.tablePlan, guestId);
    const tableMates = mateIds.length
      ? await prisma.guest.findMany({
          where: { id: { in: mateIds } },
          select: { firstName: true, lastName: true },
          orderBy: { lastName: 'asc' },
        })
      : [];

    const dressCode = formatDressCodeText(normalizeGuestGuidelines(guest.event.guestGuidelines)) || null;

    const pdf = await buildInvitationPdfBuffer({
      guest: {
        id: guest.id,
        firstName: guest.firstName,
        lastName: guest.lastName,
      },
      event: guest.event,
      assignedSeat: assigned,
      tableMates,
      dressCode,
    });

    const filename = `invitation-${guest.lastName || 'invite'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.send(pdf);
  } catch (error: any) {
    console.error('Erreur génération PDF invitation:', error);
    return res.status(500).json({ error: 'Impossible de générer le PDF.' });
  }
}

import {
  sendRealEmail,
  sendRealWhatsApp,
  sendRealWhatsAppDocument,
} from './notificationService';
import { generateAndStoreSeatingInvitationPdf } from './seatingInvitationStorageService';
import { extractGuestEmail, extractGuestPhone } from '../utils/guestIdentity';
import { resolveDeliveryChannels } from '../utils/notificationChannels';
import { applyInvitationGuidelineVariables } from '../utils/guestGuidelines';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export interface SeatNotificationResult {
  sent: boolean;
  channels: string[];
  errors: string[];
}

function formatFrenchDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTableMatesList(mates: Array<{ firstName: string; lastName: string }>): string {
  if (mates.length === 0) return 'Aucun autre invité assigné pour le moment.';
  return mates.map((m) => `• ${m.firstName} ${m.lastName}`.trim()).join('\n');
}

function formatTableMatesInline(mates: Array<{ firstName: string; lastName: string }>): string {
  if (mates.length === 0) return '';
  return mates.map((m) => `${m.firstName} ${m.lastName}`.trim()).join(', ');
}

function applyPlacementVariables(
  text: string,
  vars: {
    firstName: string;
    lastName: string;
    title: string;
    description: string;
    location: string;
    date: string;
    rsvpLink: string;
    tableName: string;
    seatNumber: string;
    tableMates: string;
    tableMatesInline: string;
  },
  guestGuidelines?: unknown,
): string {
  let result = text
    .replaceAll('{{firstName}}', vars.firstName)
    .replaceAll('{{lastName}}', vars.lastName)
    .replaceAll('{{title}}', vars.title)
    .replaceAll('{{description}}', vars.description)
    .replaceAll('{{location}}', vars.location)
    .replaceAll('{{date}}', vars.date)
    .replaceAll('{{rsvpLink}}', vars.rsvpLink)
    .replaceAll('{{tableName}}', vars.tableName)
    .replaceAll('{{seatNumber}}', vars.seatNumber)
    .replaceAll('{{tableMates}}', vars.tableMates)
    .replaceAll('{{tableMatesInline}}', vars.tableMatesInline);

  return applyInvitationGuidelineVariables(result, guestGuidelines);
}

/** Notification lors de l'assignation au plan de table (canaux de l'invitation + PDF). */
export async function notifyGuestTableAssignment(params: {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    preferences?: unknown;
  };
  eventId: string;
  event: {
    title: string;
    description?: string | null;
    date?: Date | string | null;
    location?: string | null;
    guestGuidelines?: unknown;
  };
  assignedSeat: {
    tableName: string;
    seatIndex: number;
  };
  tableMates: Array<{ firstName: string; lastName: string }>;
  invitation?: { channel: string; subject?: string | null; body?: string | null } | null;
  dressCode?: string | null;
}): Promise<SeatNotificationResult> {
  const { guest, eventId, event, assignedSeat, tableMates, invitation, dressCode } = params;
  const channels: string[] = [];
  const errors: string[] = [];

  const email = extractGuestEmail(guest);
  const phone = extractGuestPhone(guest);
  const rsvpUrl = `${FRONTEND_URL}/rsvp/${guest.id}`;
  const seatNumber = String(assignedSeat.seatIndex + 1);
  const formattedDate = formatFrenchDate(event.date);
  const tableMatesText = formatTableMatesList(tableMates);
  const tableMatesInline = formatTableMatesInline(tableMates);

  const vars = {
    firstName: guest.firstName || '',
    lastName: guest.lastName || '',
    title: event.title || '',
    description: event.description || '',
    location: event.location || '',
    date: formattedDate,
    rsvpLink: rsvpUrl,
    tableName: assignedSeat.tableName,
    seatNumber,
    tableMates: tableMatesText,
    tableMatesInline,
  };

  const defaultSubject = `Votre placement — ${event.title}`;
  const defaultBody = [
    `Bonjour ${guest.firstName},`,
    '',
    `Votre place est confirmée pour « ${event.title} ».`,
    '',
    `Table : ${assignedSeat.tableName}`,
    `Siège : n°${seatNumber}`,
    '',
    'Vous serez accompagné(e) de :',
    tableMatesText,
    '',
    formattedDate ? `Date : ${formattedDate}` : '',
    event.location ? `Lieu : ${event.location}` : '',
    '',
    `Consultez votre invitation et plan de table : ${rsvpUrl}`,
    '',
    'Votre invitation PDF est jointe à cet e-mail.',
  ]
    .filter(Boolean)
    .join('\n');

  const subject = applyPlacementVariables(
    invitation?.subject?.trim() || defaultSubject,
    vars,
    event.guestGuidelines,
  );
  const textBody = applyPlacementVariables(
    invitation?.body?.trim() || defaultBody,
    vars,
    event.guestGuidelines,
  );

  const storedPdf = await generateAndStoreSeatingInvitationPdf({
    guestId: guest.id,
    eventId,
    guest: { firstName: guest.firstName, lastName: guest.lastName },
    event,
    assignedSeat,
    tableMates,
    dressCode,
  });

  const pdfBuffer = storedPdf.buffer;
  const pdfUrl = storedPdf.url || `${FRONTEND_URL}/rsvp/${guest.id}`;

  if (!storedPdf.url) {
    errors.push('Cloudinary: PDF non stocké (configuration manquante ou erreur d\'upload).');
  }

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e1b4b; text-align: center; margin-bottom: 8px;">Votre placement est confirmé</h2>
      <p style="text-align: center; color: #4f46e5; font-weight: bold; margin-top: 0;">Bonjour ${guest.firstName} !</p>
      <div style="font-size: 15px; line-height: 1.7; color: #475569; margin-bottom: 24px; white-space: pre-line;">${textBody.replace(rsvpUrl, '').trim()}</div>
      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; color: #4338ca; text-transform: uppercase;">Votre place</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1e1b4b;">${assignedSeat.tableName}</p>
        <p style="margin: 8px 0 0; font-size: 16px; color: #4f46e5;">Siège n°${seatNumber}</p>
      </div>
      ${tableMates.length > 0 ? `
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 13px; font-weight: bold; color: #0f172a;">Vous serez accompagné(e) de :</p>
        <p style="margin: 0; font-size: 14px; color: #334155; white-space: pre-line;">${tableMatesText}</p>
      </div>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${rsvpUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 12px;">Voir mon invitation</a>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center;">Votre invitation PDF est jointe à cet e-mail${storedPdf.url ? ' et disponible en ligne.' : '.'}</p>
    </div>
  `;

  const whatsappBody = [
    `Bonjour ${guest.firstName} 👋`,
    '',
    `Votre placement pour *${event.title}* est confirmé ✅`,
    '',
    `🪑 *${assignedSeat.tableName}* — Siège n°${seatNumber}`,
    tableMatesInline ? `\n👥 Avec : ${tableMatesInline}` : '',
    event.location ? `\n📍 ${event.location}` : '',
    formattedDate ? `\n📅 ${formattedDate}` : '',
    '',
    `📄 Invitation PDF : ${storedPdf.url || 'voir pièce jointe'}`,
    `\n🔗 Plan de table : ${rsvpUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  const channelsToSend = resolveDeliveryChannels(invitation?.channel);
  const tasks: Promise<void>[] = [];

  if (channelsToSend.includes('EMAIL') && email) {
    tasks.push(
      sendRealEmail(email, subject, textBody, htmlBody, [
        {
          filename: `invitation-${guest.lastName || 'invite'}.pdf`,
          content: pdfBuffer,
          type: 'application/pdf',
        },
      ]).then((r) => {
        if (r.success) channels.push(r.simulated ? 'email (simulation)' : 'email');
        else if (r.error) errors.push(`email: ${r.error}`);
      }),
    );
  } else if (channelsToSend.includes('EMAIL') && !email) {
    errors.push('email: adresse e-mail invalide');
  }

  if (channelsToSend.includes('WHATSAPP') && phone) {
    tasks.push(
      sendRealWhatsApp(phone, whatsappBody).then(async (r) => {
        if (r.success) {
          channels.push(r.simulated ? 'WhatsApp (simulation)' : 'WhatsApp');
          if (!r.simulated && storedPdf.url) {
            const docResult = await sendRealWhatsAppDocument(
              phone,
              storedPdf.url,
              `invitation-${guest.lastName || 'invite'}.pdf`,
              'Votre invitation PDF',
            );
            if (!docResult.success && docResult.error) {
              errors.push(`WhatsApp PDF: ${docResult.error}`);
            }
          }
        } else if (r.error) {
          errors.push(`WhatsApp: ${r.error}`);
        }
      }),
    );
  } else if (channelsToSend.includes('WHATSAPP') && !phone) {
    errors.push('WhatsApp: numéro de téléphone manquant');
  }

  if (tasks.length === 0) {
    if (errors.length === 0) {
      errors.push('Aucun canal de livraison disponible pour cet invité.');
    }
    return { sent: false, channels, errors };
  }

  await Promise.all(tasks);

  return {
    sent: channels.length > 0,
    channels,
    errors,
  };
}

/** Notification protocole (siège vérifié sur place). */
export async function notifyGuestSeatConfirmed(params: {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    preferences?: unknown;
  };
  eventId: string;
  event: {
    title: string;
    date?: Date | string | null;
    location?: string | null;
  };
  assignedSeat: {
    tableName: string;
    seatIndex: number;
  };
}): Promise<SeatNotificationResult> {
  return notifyGuestTableAssignment({
    guest: params.guest,
    eventId: params.eventId,
    event: params.event,
    assignedSeat: params.assignedSeat,
    tableMates: [],
    invitation: { channel: 'EMAIL_AND_WHATSAPP' },
  });
}

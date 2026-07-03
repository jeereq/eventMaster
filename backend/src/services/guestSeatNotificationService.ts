import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import { extractGuestEmail, extractGuestPhone } from '../utils/guestIdentity';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export interface SeatNotificationResult {
  sent: boolean;
  channels: string[];
  errors: string[];
}

export async function notifyGuestSeatConfirmed(params: {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    preferences?: unknown;
  };
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
  const { guest, event, assignedSeat } = params;
  const channels: string[] = [];
  const errors: string[] = [];

  const phone = extractGuestPhone(guest);
  const email = extractGuestEmail(guest);
  const rsvpUrl = `${FRONTEND_URL}/rsvp/${guest.id}`;
  const seatNumber = assignedSeat.seatIndex + 1;
  const formattedDate = event.date
    ? new Date(event.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const subject = `Votre placement est confirmé — ${event.title}`;
  const textBody = [
    `Bonjour ${guest.firstName},`,
    '',
    `Bonne nouvelle ! L'équipe protocole vous a installé(e) à votre place pour « ${event.title} ».`,
    '',
    `Table : ${assignedSeat.tableName}`,
    `Siège : n°${seatNumber}`,
    event.location ? `Lieu : ${event.location}` : '',
    formattedDate ? `Date : ${formattedDate}` : '',
    '',
    `Consultez votre plan de table : ${rsvpUrl}`,
    '',
    'Bon événement !',
    '— L\'équipe EventMaster',
  ]
    .filter(Boolean)
    .join('\n');

  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1e1b4b; text-align: center; margin-bottom: 8px;">Placement confirmé</h2>
      <p style="text-align: center; color: #4f46e5; font-weight: bold; margin-top: 0;">Bonjour ${guest.firstName} !</p>
      <p>L'équipe protocole vous a installé(e) à votre place pour l'événement <strong>${event.title}</strong>.</p>
      <div style="background-color: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; color: #4338ca; text-transform: uppercase;">Votre place</p>
        <p style="margin: 0; font-size: 20px; font-weight: bold; color: #1e1b4b;">${assignedSeat.tableName}</p>
        <p style="margin: 8px 0 0; font-size: 16px; color: #4f46e5;">Siège n°${seatNumber}</p>
      </div>
      ${formattedDate || event.location ? `
      <div style="font-size: 14px; color: #334155; background-color: #f8fafc; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
        ${formattedDate ? `📅 ${formattedDate}<br />` : ''}
        ${event.location ? `📍 ${event.location}` : ''}
      </div>` : ''}
      <div style="text-align: center; margin: 24px 0;">
        <a href="${rsvpUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 28px; font-weight: bold; text-decoration: none; border-radius: 12px;">Voir mon plan de table</a>
      </div>
      <p style="font-size: 11px; color: #94a3b8; text-align: center;">Notification automatique EventMaster</p>
    </div>
  `;

  const whatsappBody = `Bonjour ${guest.firstName} 👋\n\nVotre placement pour *${event.title}* est confirmé ✅\n\n🪑 *${assignedSeat.tableName}* — Siège n°${seatNumber}${event.location ? `\n📍 ${event.location}` : ''}\n\nConsultez votre plan : ${rsvpUrl}\n\nBon événement !`;

  const tasks: Promise<void>[] = [];

  if (email) {
    tasks.push(
      sendRealEmail(email, subject, textBody, htmlBody).then((r) => {
        if (r.success) channels.push(r.simulated ? 'email (simulation)' : 'email');
        else if (r.error) errors.push(`email: ${r.error}`);
      }),
    );
  }

  if (phone) {
    tasks.push(
      sendRealWhatsApp(phone, whatsappBody).then((r) => {
        if (r.success) channels.push(r.simulated ? 'WhatsApp (simulation)' : 'WhatsApp');
        else if (r.error) errors.push(`WhatsApp: ${r.error}`);
      }),
    );
  }

  if (tasks.length === 0) {
    errors.push('Aucun e-mail ou téléphone valide pour contacter l\'invité.');
    return { sent: false, channels, errors };
  }

  await Promise.all(tasks);

  return {
    sent: channels.length > 0,
    channels,
    errors,
  };
}

import { prisma } from '../db';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import { buildGuestRsvpUrl } from './guestAccessService';
import { guestUpdateChannels, isEventAlertEnabledIn } from './eventNotificationSettings';
import { loadOrgBrand, wrapBrandedEmail, wrapBrandedWhatsApp } from '../utils/brandedMessaging';
import { escapeHtml } from '../utils/brandingUtils';
import { extractGuestEmail, extractGuestPhone } from '../utils/guestIdentity';

const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');

function excerpt(content: string | null | undefined, max = 280): string {
  const text = (content || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Prévient les invités abonnés qu’une nouvelle publication est en ligne sur l’événement.
 * Seuls les invités qui ont activé les notifications, sur les canaux qu’ils ont choisis,
 * et seulement si l’organisateur laisse les nouvelles partir pour cet événement.
 */
export async function notifyGuestsOfEventPost(params: { eventId: string; content: string | null; hasMedia: boolean }) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { id: true, title: true, tenantId: true, notificationSettings: true },
  });
  if (!event || !isEventAlertEnabledIn(event.notificationSettings, 'guestUpdates')) return { sent: 0 };

  const guests = await prisma.guest.findMany({
    where: { eventId: event.id, rsvp: { not: 'DECLINED' }, notificationPrefs: { path: ['enabled'], equals: true } },
    select: { id: true, firstName: true, email: true, phone: true, phoneCountryCode: true, preferences: true, notificationPrefs: true },
  });
  if (guests.length === 0) return { sent: 0 };

  const orgBrand = await loadOrgBrand(event.tenantId);
  const preview = excerpt(params.content) || (params.hasMedia ? 'Une nouvelle photo ou vidéo a été partagée.' : '');
  let sent = 0;

  for (const guest of guests) {
    const email = extractGuestEmail(guest);
    const phone = extractGuestPhone(guest);
    const channels = guestUpdateChannels(event.notificationSettings, guest.notificationPrefs, { email, phone });
    if (!channels.email && !channels.whatsapp) continue;
    const link = `${buildGuestRsvpUrl(FRONTEND_URL, guest.id)}`;
    const hello = guest.firstName ? `Bonjour ${guest.firstName},` : 'Bonjour,';

    if (channels.email && email) {
      const subject = `Nouvelle publication — ${event.title}`;
      const text = `${hello}\n\n${orgBrand.orgName} a publié une nouvelle sur « ${event.title} ».\n\n${preview}\n\nVoir la publication : ${link}\n\nVous recevez ce message car vous avez activé les notifications de cet événement. Vous pouvez les couper depuis votre espace invité.`;
      const html = wrapBrandedEmail({
        branding: orgBrand.branding,
        orgName: orgBrand.orgName,
        title: 'Nouvelle publication',
        eyebrow: event.title,
        innerHtml: `
          <p style="margin:0 0 12px;">${escapeHtml(hello)}</p>
          <p style="color:#64748b;margin:0 0 16px;">${escapeHtml(orgBrand.orgName)} a publié une nouvelle sur <strong>${escapeHtml(event.title)}</strong>.</p>
          ${preview ? `<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;white-space:pre-wrap;">${escapeHtml(preview)}</div>` : ''}
        `,
        cta: { href: link, label: 'Voir la publication' },
        footerNote: 'Vous avez activé les notifications de cet événement. Vous pouvez les couper depuis votre espace invité.',
      });
      const result = await sendRealEmail(email, subject, text, html).catch(() => null);
      if (result?.success) sent += 1;
    }

    if (channels.whatsapp && phone) {
      const body = wrapBrandedWhatsApp(
        `${hello}\n\n📣 Nouvelle publication sur *${event.title}*.${preview ? `\n\n${preview}` : ''}\n\n👉 ${link}\n\n_Notifications activées depuis votre espace invité._`,
        orgBrand.orgName,
      );
      const result = await sendRealWhatsApp(phone, body).catch(() => null);
      if (result?.success) sent += 1;
    }
  }
  return { sent };
}

import { DEFAULT_TENANT_BRANDING, escapeHtml } from './brandingUtils';
import { wrapBrandedEmail, wrapBrandedWhatsApp } from './brandedMessaging';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const MAX_WHATSAPP_CHARS = 900;

export function resolveNotificationHref(metadata?: Record<string, unknown> | null): string | null {
  const raw = metadata?.href;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const href = raw.trim();
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) return `${FRONTEND_URL.replace(/\/$/, '')}${href}`;
  return `${FRONTEND_URL.replace(/\/$/, '')}/${href}`;
}

function messageToHtml(message: string): string {
  const escaped = escapeHtml(message).replace(/\n/g, '<br>');
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">${escaped}</p>`;
}

export function renderOperatorNotificationEmail(params: {
  title: string;
  message: string;
  href?: string | null;
  extraHtml?: string;
  familyLabel?: string;
}): { subject: string; text: string; html: string } {
  const href = params.href || `${FRONTEND_URL}/dashboard/notifications`;
  const subject = `EventMaster — ${params.title}`.slice(0, 200);
  const text = [params.message, '', `Ouvrir : ${href}`, '', '— EventMaster'].join('\n');
  const html = wrapBrandedEmail({
    branding: DEFAULT_TENANT_BRANDING,
    orgName: 'EventMaster',
    title: params.title,
    eyebrow: params.familyLabel || 'Notification',
    headerEmoji: '🔔',
    innerHtml: `${messageToHtml(params.message)}${params.extraHtml || ''}`,
    cta: { href, label: 'Ouvrir dans EventMaster' },
    footerNote: 'Vous pouvez modifier vos canaux (e-mail, WhatsApp, push) depuis Notifications.',
  });
  return { subject, text, html };
}

export function formatOperatorWhatsApp(body: string): string {
  return wrapBrandedWhatsApp(body.replace(/\n{3,}/g, '\n\n').trim(), 'EventMaster').slice(0, MAX_WHATSAPP_CHARS);
}

export function renderOperatorWhatsApp(params: {
  title: string;
  message: string;
  href?: string | null;
}): string {
  const parts = [params.title.trim(), '', params.message.trim()];
  if (params.href) parts.push('', params.href);
  return formatOperatorWhatsApp(parts.join('\n'));
}

export function userWhatsAppNumber(user: {
  phone?: string | null;
  phoneCountryCode?: string | null;
}): string | null {
  const phone = user.phone?.trim();
  if (!phone) return null;
  if (phone.startsWith('+')) return phone;
  const cc = user.phoneCountryCode?.trim();
  if (cc) {
    const digits = phone.replace(/[^\d]/g, '').replace(/^0/, '');
    const ccDigits = cc.replace(/[^\d]/g, '');
    if (!digits) return null;
    return `+${ccDigits}${digits}`;
  }
  return phone;
}

export const FAMILY_LABEL_FR: Record<string, string> = {
  billing: 'Facturation',
  commissions: 'Commissions',
  catalog: 'Catalogue',
  account: 'Compte',
};

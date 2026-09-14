const DEDUP_WINDOW_MS = 90_000;
const OUTBOUND_DEDUP_MS = 12_000;

export function notificationDedupeKey(params: {
  type: string;
  title: string;
  message?: string;
  metadata?: Record<string, unknown> | null;
}): string {
  const meta = params.metadata || {};
  const entity = String(meta.inquiryId || meta.bookingId || '');
  const body = (params.message || '').slice(0, 80);
  return `${params.type}|${params.title}|${entity}|${body}`;
}

export function isWithinDedupWindow(createdAt: Date, now = new Date(), windowMs = DEDUP_WINDOW_MS): boolean {
  return now.getTime() - createdAt.getTime() < windowMs;
}

function normalizeOutboundPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Empreinte d’un e-mail / WhatsApp : même destinataire, même sujet, même début de corps. */
export function outboundChannelFingerprint(input: {
  channel: 'EMAIL' | 'WHATSAPP';
  to: string;
  subject?: string;
  body?: string;
}): string {
  const dest = normalizeOutboundPart(input.to);
  const subject = normalizeOutboundPart(input.subject || '');
  const body = normalizeOutboundPart(input.body || '').slice(0, 80);
  return `${input.channel}|${dest}|${subject}|${body}`;
}

const recentOutbound = new Map<string, number>();

export function claimSimilarOutbound(
  fingerprint: string,
  now = Date.now(),
  windowMs = OUTBOUND_DEDUP_MS,
): boolean {
  const last = recentOutbound.get(fingerprint);
  if (last != null && now - last < windowMs) return false;
  recentOutbound.set(fingerprint, now);
  return true;
}

export function resetOutboundClaims() {
  recentOutbound.clear();
}

export function isPlatformBrandedEmailSubject(subject: string): boolean {
  return /^eventmaster\s[—–-]/i.test(subject.trim());
}

export { DEDUP_WINDOW_MS, OUTBOUND_DEDUP_MS };

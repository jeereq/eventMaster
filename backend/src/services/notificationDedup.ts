const DEDUP_WINDOW_MS = 90_000;

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

export { DEDUP_WINDOW_MS };

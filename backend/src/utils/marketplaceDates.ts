export function toDateKey(value: Date | string): string | null {
  const raw = typeof value === 'string' ? value : value.toISOString();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function parseDateKey(value: unknown): Date | null {
  const key = typeof value === 'string' ? toDateKey(value) : null;
  if (!key) return null;
  const date = new Date(`${key}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function eachDateKey(from: string, to: string): string[] {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const match = start.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const endMatch = end.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match || !endMatch) return [];
  const keys: string[] = [];
  const cursor = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  const last = new Date(Date.UTC(Number(endMatch[1]), Number(endMatch[2]) - 1, Number(endMatch[3])));
  while (cursor.getTime() <= last.getTime() && keys.length < 366) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}

export function parseBlockedDates(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const keys = new Set<string>();
  for (const item of input) {
    const key = toDateKey(String(item));
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

export function mergeBlockedDate(existing: unknown, extra: string): string[] {
  return parseBlockedDates([...(parseBlockedDates(existing)), extra]);
}

export function mergeBlockedDates(existing: unknown, extras: string[]): string[] {
  return parseBlockedDates([...(parseBlockedDates(existing)), ...extras]);
}

export type BookingDateSpan = { eventDate: Date; eventEndDate?: Date | null };

export function bookingOccupiedKeys(booking: BookingDateSpan): string[] {
  const start = toDateKey(booking.eventDate);
  if (!start) return [];
  const end = toDateKey(booking.eventEndDate || booking.eventDate) || start;
  return eachDateKey(start, end);
}

export function collectUnavailableDates(blocked: unknown, bookings?: BookingDateSpan[]): string[] {
  const fromBookings = (bookings || []).flatMap(bookingOccupiedKeys);
  return parseBlockedDates([...(parseBlockedDates(blocked)), ...fromBookings]);
}

export function isRangeAvailable(unavailable: string[], from: string, to: string): boolean {
  const keys = eachDateKey(from, to);
  if (!keys.length) return false;
  const blocked = new Set(unavailable);
  return keys.every((key) => !blocked.has(key));
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
}

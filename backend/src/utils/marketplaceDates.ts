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

export function collectUnavailableDates(blocked: unknown, bookings?: Array<{ eventDate: Date }>): string[] {
  const fromBookings = (bookings || [])
    .map((b) => toDateKey(b.eventDate))
    .filter((key): key is string => Boolean(key));
  return parseBlockedDates([...(parseBlockedDates(blocked)), ...fromBookings]);
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

export type EventPrepVenue = {
  slug: string;
  name: string;
  headline?: string | null;
  city?: string | null;
  address?: string | null;
  coverUrl?: string | null;
  orgName?: string | null;
  priceFromFc?: number | null;
  capacity?: number | null;
};

export type EventPrepVendor = {
  slug: string;
  title: string;
  category: string;
  categoryLabel?: string | null;
  city?: string | null;
  coverUrl?: string | null;
  orgName?: string | null;
  priceFromFc?: number | null;
};

export type EventPrep = {
  venue: EventPrepVenue | null;
  vendors: EventPrepVendor[];
  notes: string;
};

export function emptyEventPrep(): EventPrep {
  return { venue: null, vendors: [], notes: '' };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function parseVenue(raw: unknown): EventPrepVenue | null {
  const row = asRecord(raw);
  const slug = asString(row?.slug);
  const name = asString(row?.name) || asString(row?.headline);
  if (!slug || !name) return null;
  return {
    slug,
    name,
    headline: asString(row?.headline) || null,
    city: asString(row?.city) || null,
    address: asString(row?.address) || null,
    coverUrl: asString(row?.coverUrl) || null,
    orgName: asString(row?.orgName) || null,
    priceFromFc: asNumber(row?.priceFromFc),
    capacity: asNumber(row?.capacity),
  };
}

function parseVendor(raw: unknown): EventPrepVendor | null {
  const row = asRecord(raw);
  const slug = asString(row?.slug);
  const title = asString(row?.title) || asString(row?.name);
  if (!slug || !title) return null;
  return {
    slug,
    title,
    category: asString(row?.category),
    categoryLabel: asString(row?.categoryLabel) || null,
    city: asString(row?.city) || null,
    coverUrl: asString(row?.coverUrl) || null,
    orgName: asString(row?.orgName) || null,
    priceFromFc: asNumber(row?.priceFromFc),
  };
}

export function parseEventPrep(raw: unknown): EventPrep {
  const row = asRecord(raw);
  if (!row) return emptyEventPrep();
  const vendorsRaw = Array.isArray(row.vendors) ? row.vendors : [];
  const seen = new Set<string>();
  const vendors: EventPrepVendor[] = [];
  for (const item of vendorsRaw) {
    const vendor = parseVendor(item);
    if (!vendor || seen.has(vendor.slug)) continue;
    seen.add(vendor.slug);
    vendors.push(vendor);
  }
  return {
    venue: parseVenue(row.venue),
    vendors,
    notes: asString(row.notes).slice(0, 2000),
  };
}

export function eventPrepSummary(prep: EventPrep): string | null {
  const parts: string[] = [];
  if (prep.venue) parts.push(prep.venue.name);
  if (prep.vendors.length === 1) parts.push(prep.vendors[0].title);
  else if (prep.vendors.length > 1) parts.push(`${prep.vendors.length} prestataires`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

export function hasEventPrepSelection(prep: EventPrep): boolean {
  return Boolean(prep.venue || prep.vendors.length > 0 || prep.notes);
}

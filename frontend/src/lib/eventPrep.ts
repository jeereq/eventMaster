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

export function isEventPrepRental(vendor: Pick<EventPrepVendor, 'category'>): boolean {
  return vendor.category.startsWith('RENTAL_');
}

export function splitEventPrepVendors(vendors: EventPrepVendor[]): {
  trades: EventPrepVendor[];
  rentals: EventPrepVendor[];
} {
  const trades: EventPrepVendor[] = [];
  const rentals: EventPrepVendor[] = [];
  for (const vendor of vendors) {
    if (isEventPrepRental(vendor)) rentals.push(vendor);
    else trades.push(vendor);
  }
  return { trades, rentals };
}

export function eventPrepSummary(prep: EventPrep): string | null {
  const parts: string[] = [];
  if (prep.venue) parts.push(prep.venue.name);
  const { trades, rentals } = splitEventPrepVendors(prep.vendors);
  if (trades.length === 1) parts.push(trades[0].title);
  else if (trades.length > 1) parts.push(`${trades.length} métiers`);
  if (rentals.length === 1) parts.push(rentals[0].title);
  else if (rentals.length > 1) parts.push(`${rentals.length} locations`);
  if (parts.length === 0) return null;
  return parts.join(' · ');
}

export function hasEventPrepShortlist(prep: EventPrep): boolean {
  return Boolean(prep.venue || prep.vendors.length > 0);
}

export function hasEventPrepSelection(prep: EventPrep): boolean {
  return hasEventPrepShortlist(prep) || Boolean(prep.notes);
}

export function eventPrepEstimateFc(prep: EventPrep): {
  total: number;
  priced: number;
  totalItems: number;
} {
  const prices = [
    prep.venue?.priceFromFc ?? null,
    ...prep.vendors.map((vendor) => vendor.priceFromFc ?? null),
  ];
  const priced = prices.filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  return {
    total: priced.reduce((sum, value) => sum + value, 0),
    priced: priced.length,
    totalItems: (prep.venue ? 1 : 0) + prep.vendors.length,
  };
}

export function eventDateKey(value?: string | null): string {
  return String(value || '').slice(0, 10);
}

export function eventPrepFromSavedPack(
  pack: {
    name?: string | null;
    venue: {
      slug: string;
      title: string;
      orgName?: string | null;
      location?: string | null;
      coverUrl?: string | null;
      estimatedFc?: number;
      capacity?: number | null;
    } | null;
    services: Array<{
      slug: string;
      title: string;
      orgName?: string | null;
      location?: string | null;
      coverUrl?: string | null;
      estimatedFc?: number;
      categoryLabel?: string;
      category?: string;
      href?: string;
    }>;
  },
  current: EventPrep,
): EventPrep {
  const venue = pack.venue
    ? {
        slug: pack.venue.slug,
        name: pack.venue.title,
        city: pack.venue.location || null,
        coverUrl: pack.venue.coverUrl || null,
        orgName: pack.venue.orgName || null,
        priceFromFc: pack.venue.estimatedFc ?? null,
        capacity: pack.venue.capacity ?? null,
      }
    : current.venue;
  const seen = new Set<string>();
  const vendors: EventPrepVendor[] = [];
  for (const item of pack.services) {
    if (!item.slug || seen.has(item.slug)) continue;
    seen.add(item.slug);
    vendors.push({
      slug: item.slug,
      title: item.title,
      category: item.category || (item.href?.includes('/locations/') ? 'RENTAL_EQUIPMENT' : ''),
      categoryLabel: item.categoryLabel || null,
      city: item.location || null,
      coverUrl: item.coverUrl || null,
      orgName: item.orgName || null,
      priceFromFc: item.estimatedFc ?? null,
    });
  }
  const noteLine = pack.name ? `Pack appliqué : ${pack.name}` : '';
  const notes = [current.notes, noteLine].filter(Boolean).join('\n').slice(0, 2000);
  return { venue, vendors: vendors.length ? vendors : current.vendors, notes };
}

export function eventPrepFromAiRecommendation(
  result: {
    summary?: string;
    venue: {
      slug: string;
      title: string;
      orgName?: string | null;
      location?: string | null;
      coverUrl?: string | null;
      estimatedFc?: number;
      capacity?: number | null;
    } | null;
    services: Array<{
      slug: string;
      title: string;
      orgName?: string | null;
      location?: string | null;
      coverUrl?: string | null;
      estimatedFc?: number;
      categoryLabel?: string;
      category?: string;
      href?: string;
    }>;
  },
  current: EventPrep,
): EventPrep {
  return eventPrepFromSavedPack(
    {
      name: result.summary || 'Simulation IA',
      venue: result.venue,
      services: result.services.map((item) => ({
        ...item,
        href: item.category?.startsWith('RENTAL_') || item.href?.includes('/locations/')
          ? `/dashboard/catalogue/locations/${item.slug}`
          : item.href,
      })),
    },
    current,
  );
}

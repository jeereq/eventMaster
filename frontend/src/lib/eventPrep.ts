export type EventPrepVenue = {
  slug: string;
  name: string;
  headline?: string | null;
  city?: string | null;
  address?: string | null;
  coverUrl?: string | null;
  orgName?: string | null;
  orgSlug?: string | null;
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
  orgSlug?: string | null;
  priceFromFc?: number | null;
};

export type EventPrepViewId = 'manual' | 'ai' | 'final';

export type EventPrepBasket = {
  venue: EventPrepVenue | null;
  vendors: EventPrepVendor[];
  notes: string;
  summary?: string;
};

export type EventPrep = EventPrepBasket & {
  activeView?: EventPrepViewId;
  /** Une fois vrai, les simulations ne recouvrent plus la solution finale. */
  finalComposed?: boolean;
  manual?: EventPrepBasket;
  ai?: EventPrepBasket;
};

export function emptyEventPrepBasket(): EventPrepBasket {
  return { venue: null, vendors: [], notes: '' };
}

export function emptyEventPrep(): EventPrep {
  return {
    ...emptyEventPrepBasket(),
    activeView: 'manual',
    manual: emptyEventPrepBasket(),
    ai: emptyEventPrepBasket(),
  };
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
    orgSlug: asString(row?.orgSlug) || null,
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
    orgSlug: asString(row?.orgSlug) || null,
    priceFromFc: asNumber(row?.priceFromFc),
  };
}

function parseBasket(raw: unknown): EventPrepBasket {
  const row = asRecord(raw);
  if (!row) return emptyEventPrepBasket();
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
    summary: asString(row.summary).slice(0, 400) || undefined,
  };
}

export function parseEventPrep(raw: unknown): EventPrep {
  const row = asRecord(raw);
  if (!row) return emptyEventPrep();
  const root = parseBasket(row);
  const hasLegacy = Boolean(root.venue || root.vendors.length || root.notes);
  const manual = row.manual != null ? parseBasket(row.manual) : hasLegacy ? { ...root, summary: undefined } : emptyEventPrepBasket();
  const ai = row.ai != null ? parseBasket(row.ai) : emptyEventPrepBasket();
  const activeView: EventPrepViewId =
    row.activeView === 'ai' || row.activeView === 'final' || row.activeView === 'manual'
      ? row.activeView
      : 'manual';
  return {
    ...root,
    activeView,
    finalComposed: row.finalComposed === true,
    manual,
    ai,
  };
}

export function eventPrepBasketCount(basket: EventPrepBasket): number {
  return (basket.venue ? 1 : 0) + basket.vendors.length;
}

export function eventPrepBasket(prep: EventPrep, view: EventPrepViewId): EventPrepBasket {
  if (view === 'ai') return prep.ai || emptyEventPrepBasket();
  if (view === 'manual') return prep.manual || emptyEventPrepBasket();
  return { venue: prep.venue, vendors: prep.vendors, notes: prep.notes };
}

export function withEventPrepBasket(prep: EventPrep, view: EventPrepViewId, basket: EventPrepBasket): EventPrep {
  if (view === 'final') {
    return {
      ...prep,
      venue: basket.venue,
      vendors: basket.vendors,
      notes: basket.notes,
      activeView: 'final',
      finalComposed: true,
    };
  }
  const next: EventPrep = { ...prep, [view]: basket, activeView: view };
  if (!prep.finalComposed) {
    return {
      ...next,
      venue: basket.venue,
      vendors: basket.vendors,
      notes: basket.notes,
    };
  }
  return next;
}

export function eventPrepBasketKey(item: { slug: string }, kind: 'venue' | 'service') {
  return `${kind}:${item.slug}`;
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

export type EventPrepVendorGroup = {
  key: string;
  orgName: string;
  orgSlug: string | null;
  venue: EventPrepVenue | null;
  vendors: EventPrepVendor[];
};

export function eventPrepVendorKey(item: { orgSlug?: string | null; orgName?: string | null }): string {
  return (item.orgSlug || '').trim() || (item.orgName || '').trim() || 'Sans enseigne';
}

export function groupEventPrepBasketByVendor(basket: EventPrepBasket): EventPrepVendorGroup[] {
  return groupEventPrepByVendor({
    ...emptyEventPrep(),
    venue: basket.venue,
    vendors: basket.vendors,
    notes: basket.notes,
  });
}

export function groupEventPrepByVendor(prep: EventPrep): EventPrepVendorGroup[] {
  const map = new Map<string, EventPrepVendorGroup>();
  const upsert = (item: { orgSlug?: string | null; orgName?: string | null }) => {
    const key = eventPrepVendorKey(item);
    const existing = map.get(key);
    if (existing) return existing;
    const created: EventPrepVendorGroup = {
      key,
      orgName: (item.orgName || '').trim() || 'Sans enseigne',
      orgSlug: (item.orgSlug || '').trim() || null,
      venue: null,
      vendors: [],
    };
    map.set(key, created);
    return created;
  };
  if (prep.venue) {
    upsert(prep.venue).venue = prep.venue;
  }
  for (const vendor of prep.vendors) {
    upsert(vendor).vendors.push(vendor);
  }
  return [...map.values()];
}

export function eventPrepSummary(prep: EventPrep): string | null {
  const parts: string[] = [];
  if (prep.venue) parts.push(prep.venue.name);
  const { trades, rentals } = splitEventPrepVendors(prep.vendors);
  if (trades.length === 1) parts.push(trades[0].title);
  else if (trades.length > 1) parts.push(`${trades.length} prestataires`);
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

export function eventPrepEstimateFc(prep: Pick<EventPrepBasket, 'venue' | 'vendors'>): {
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
  return { ...current, venue, vendors: vendors.length ? vendors : current.vendors, notes };
}

export function applyPackToEventPrepBasket(
  pack: Parameters<typeof eventPrepFromSavedPack>[0],
  current: EventPrepBasket,
): EventPrepBasket {
  const next = eventPrepFromSavedPack(pack, { ...current, activeView: 'manual', manual: current, ai: emptyEventPrepBasket() });
  return {
    venue: next.venue,
    vendors: next.vendors,
    notes: next.notes,
    summary: pack.name || current.summary,
  };
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
  const packed = eventPrepFromSavedPack(
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
    {
      ...emptyEventPrep(),
      venue: current.ai?.venue ?? null,
      vendors: current.ai?.vendors ?? [],
      notes: current.ai?.notes ?? '',
    },
  );
  return withEventPrepBasket(current, 'ai', {
    venue: packed.venue,
    vendors: packed.vendors,
    notes: packed.notes,
    summary: result.summary || packed.notes,
  });
}

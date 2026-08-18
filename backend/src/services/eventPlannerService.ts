import { ServiceCategory, VenuePriceUnit } from '@prisma/client';
import { prisma } from '../db';
import { parseListingDetails } from '../utils/listingDetails';
import { parsePhotoUrls, coverFromMedia, priceUnitLabel, serviceCategoryLabel } from '../utils/publicVenue';
import { normalizeAllowedCity } from '../utils/rdcCities';

export const EVENT_PLAN_TYPES = [
  'wedding',
  'birthday',
  'corporate',
  'gala',
  'religious',
  'private',
  'shooting',
] as const;

export type EventPlanType = (typeof EVENT_PLAN_TYPES)[number];

type PackSlot = { category: ServiceCategory; share: number };

const EVENT_PACKS: Record<EventPlanType, { venueShare: number; required: PackSlot[]; optional: PackSlot[] }> = {
  wedding: {
    venueShare: 0.38,
    required: [
      { category: 'CATERING', share: 0.28 },
      { category: 'PHOTOGRAPHY', share: 0.1 },
      { category: 'DJ', share: 0.08 },
      { category: 'DECORATION', share: 0.1 },
    ],
    optional: [
      { category: 'VIDEO', share: 0.06 },
      { category: 'FLORIST', share: 0.05 },
      { category: 'MC', share: 0.04 },
    ],
  },
  birthday: {
    venueShare: 0.4,
    required: [
      { category: 'CATERING', share: 0.28 },
      { category: 'DJ', share: 0.14 },
      { category: 'DECORATION', share: 0.1 },
    ],
    optional: [{ category: 'PHOTOGRAPHY', share: 0.08 }],
  },
  corporate: {
    venueShare: 0.42,
    required: [
      { category: 'CATERING', share: 0.28 },
      { category: 'MC', share: 0.08 },
    ],
    optional: [
      { category: 'PHOTOGRAPHY', share: 0.08 },
      { category: 'VIDEO', share: 0.07 },
      { category: 'TRANSPORT', share: 0.06 },
    ],
  },
  gala: {
    venueShare: 0.4,
    required: [
      { category: 'CATERING', share: 0.26 },
      { category: 'DJ', share: 0.08 },
      { category: 'DECORATION', share: 0.1 },
      { category: 'MC', share: 0.06 },
    ],
    optional: [
      { category: 'PHOTOGRAPHY', share: 0.08 },
      { category: 'VIDEO', share: 0.06 },
    ],
  },
  religious: {
    venueShare: 0.4,
    required: [
      { category: 'CATERING', share: 0.26 },
      { category: 'DECORATION', share: 0.12 },
    ],
    optional: [
      { category: 'TRANSPORT', share: 0.08 },
      { category: 'PHOTOGRAPHY', share: 0.08 },
      { category: 'MC', share: 0.05 },
    ],
  },
  private: {
    venueShare: 0.4,
    required: [
      { category: 'CATERING', share: 0.28 },
      { category: 'DJ', share: 0.12 },
    ],
    optional: [
      { category: 'DECORATION', share: 0.1 },
      { category: 'PHOTOGRAPHY', share: 0.08 },
    ],
  },
  shooting: {
    venueShare: 0.35,
    required: [
      { category: 'PHOTOGRAPHY', share: 0.28 },
      { category: 'VIDEO', share: 0.18 },
    ],
    optional: [
      { category: 'DECORATION', share: 0.1 },
      { category: 'OTHER', share: 0.08 },
    ],
  },
};

type Scored<T> = T & { cost: number; match: 'exact' | 'unknown'; favorite: boolean };

function parseEventType(value: unknown): EventPlanType | null {
  return typeof value === 'string' && EVENT_PLAN_TYPES.includes(value as EventPlanType)
    ? value as EventPlanType
    : null;
}

function estimateCost(priceFromFc: number | null, priceUnit: string, guestCount: number): number | null {
  if (priceFromFc == null || priceFromFc <= 0) return null;
  if (priceUnit === 'PERSON' || priceUnit === 'QUOTA') {
    return priceFromFc * Math.max(1, guestCount || 1);
  }
  return priceFromFc;
}

function eventMatch(details: unknown, eventType: string): 'exact' | 'unknown' | 'no' {
  const types = parseListingDetails(details).eventTypes;
  if (!types.length) return 'unknown';
  return types.includes(eventType) ? 'exact' : 'no';
}

function pickForBudget<T extends { cost: number; favorite: boolean; match: 'exact' | 'unknown' }>(
  items: T[],
  budget: number,
  style: 'cheap' | 'balanced' | 'comfort',
): T | null {
  const affordable = items.filter((item) => item.cost <= budget);
  const pool = affordable.length ? affordable : items.slice();
  if (!pool.length) return null;
  return pool.slice().sort((a, b) => {
    const fav = Number(b.favorite) - Number(a.favorite);
    if (fav) return fav;
    const match = Number(b.match === 'exact') - Number(a.match === 'exact');
    if (match) return match;
    if (style === 'cheap') return a.cost - b.cost;
    if (style === 'comfort') return b.cost - a.cost;
    return Math.abs(a.cost - budget * 0.85) - Math.abs(b.cost - budget * 0.85);
  })[0] || null;
}

function serializeVenue(listing: {
  slug: string;
  headline: string | null;
  city: string | null;
  commune: string | null;
  neighborhood: string | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  photos: unknown;
  room: { name: string; capacity: number | null };
  tenant: { name: string; vendorProfile: { displayName: string } | null };
}, cost: number) {
  const photos = parsePhotoUrls(listing.photos);
  return {
    kind: 'venue' as const,
    slug: listing.slug,
    title: listing.headline || listing.room.name,
    orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
    city: listing.city,
    location: [listing.neighborhood, listing.commune, listing.city].filter(Boolean).join(', '),
    coverUrl: coverFromMedia(photos),
    priceFromFc: listing.priceFromFc,
    priceUnitLabel: priceUnitLabel(listing.priceUnit),
    estimatedFc: cost,
    capacity: listing.room.capacity,
    href: `/dashboard/catalogue/salles/${listing.slug}`,
    favorite: Boolean((listing as { favorite?: boolean }).favorite),
  };
}

function serializeService(offering: {
  slug: string;
  title: string;
  category: ServiceCategory;
  city: string | null;
  commune: string | null;
  neighborhood: string | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  photos: unknown;
  vendorProfile: { displayName: string };
  tenant: { name: string };
}, cost: number) {
  const photos = parsePhotoUrls(offering.photos);
  return {
    kind: 'service' as const,
    slug: offering.slug,
    title: offering.title,
    category: offering.category,
    categoryLabel: serviceCategoryLabel(offering.category),
    orgName: offering.vendorProfile.displayName || offering.tenant.name,
    city: offering.city,
    location: [offering.neighborhood, offering.commune, offering.city].filter(Boolean).join(', '),
    coverUrl: coverFromMedia(photos),
    priceFromFc: offering.priceFromFc,
    priceUnitLabel: priceUnitLabel(offering.priceUnit),
    estimatedFc: cost,
    href: `/dashboard/catalogue/prestataires/${offering.slug}`,
    favorite: Boolean((offering as { favorite?: boolean }).favorite),
  };
}

export async function buildEventPlanProposals(input: {
  eventType: unknown;
  budgetFc: unknown;
  city?: unknown;
  guestCount?: unknown;
  favoriteSlugs?: Array<{ kind: string; slug: string }>;
}) {
  const eventType = parseEventType(input.eventType);
  const budgetFc = Number(input.budgetFc);
  const guestCount = Number(input.guestCount);
  const city = normalizeAllowedCity(typeof input.city === 'string' ? input.city : '') || '';

  if (!eventType) {
    throw Object.assign(new Error('Choisissez un type d’événement.'), { status: 400 });
  }
  if (!Number.isFinite(budgetFc) || budgetFc < 50000) {
    throw Object.assign(new Error('Indiquez un budget d’au moins 50 000 FC.'), { status: 400 });
  }

  const pack = EVENT_PACKS[eventType];
  const guests = Number.isFinite(guestCount) && guestCount > 0 ? Math.floor(guestCount) : 0;
  const favoriteVenues = new Set(
    (input.favoriteSlugs || []).filter((item) => item.kind === 'venue').map((item) => item.slug),
  );
  const favoriteServices = new Set(
    (input.favoriteSlugs || []).filter((item) => item.kind === 'service').map((item) => item.slug),
  );

  const [listings, offerings] = await Promise.all([
    prisma.venueListing.findMany({
      where: {
        isPublic: true,
        ...(city ? { city } : {}),
        ...(guests ? { room: { capacity: { gte: guests } } } : {}),
      },
      include: {
        room: { select: { name: true, capacity: true } },
        tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
      },
      take: 200,
    }),
    prisma.serviceOffering.findMany({
      where: {
        isPublic: true,
        ...(city ? { city } : {}),
      },
      include: {
        vendorProfile: { select: { displayName: true } },
        tenant: { select: { name: true } },
      },
      take: 300,
    }),
  ]);

  const rankedVenues: Array<Scored<(typeof listings)[number]>> = listings.flatMap((listing) => {
    const match = eventMatch(listing.details, eventType);
    if (match === 'no') return [];
    const cost = estimateCost(listing.priceFromFc, listing.priceUnit, guests || 50);
    if (cost == null) return [];
    return [{ ...listing, cost, match, favorite: favoriteVenues.has(listing.slug) }];
  });

  const rankedServices: Array<Scored<(typeof offerings)[number]>> = offerings.flatMap((offering) => {
    const match = eventMatch(offering.details, eventType);
    if (match === 'no') return [];
    const cost = estimateCost(offering.priceFromFc, offering.priceUnit, guests || 50);
    if (cost == null) return [];
    return [{ ...offering, cost, match, favorite: favoriteServices.has(offering.slug) }];
  });

  const styles: Array<{ id: string; label: string; style: 'cheap' | 'balanced' | 'comfort' }> = [
    { id: 'eco', label: 'Économique', style: 'cheap' },
    { id: 'balanced', label: 'Équilibré', style: 'balanced' },
    { id: 'comfort', label: 'Confort', style: 'comfort' },
  ];

  const packages = styles.map((style) => {
    const usedServiceSlugs = new Set<string>();
    const venueBudget = Math.round(budgetFc * pack.venueShare);
    const venue = pickForBudget(rankedVenues, venueBudget, style.style);
    const items: Array<ReturnType<typeof serializeVenue> | ReturnType<typeof serializeService>> = [];
    let total = 0;
    if (venue) {
      items.push(serializeVenue(venue, venue.cost));
      total += venue.cost;
    }

    const addSlot = (slot: PackSlot) => {
      const pool = rankedServices.filter(
        (service) => service.category === slot.category && !usedServiceSlugs.has(service.slug),
      );
      const remaining = Math.max(0, budgetFc - total);
      const cap = Math.min(Math.round(budgetFc * slot.share), remaining || Math.round(budgetFc * slot.share));
      const picked = pickForBudget(pool, cap > 0 ? cap : remaining || budgetFc, style.style);
      if (!picked) return;
      usedServiceSlugs.add(picked.slug);
      items.push(serializeService(picked, picked.cost));
      total += picked.cost;
    };

    pack.required.forEach(addSlot);
    pack.optional.forEach((slot) => {
      if (total >= budgetFc) return;
      addSlot(slot);
    });

    return {
      id: style.id,
      label: style.label,
      totalFc: total,
      leftoverFc: Math.max(0, budgetFc - total),
      overBudget: total > budgetFc,
      venue: items.find((item) => item.kind === 'venue') || null,
      services: items.filter((item) => item.kind === 'service'),
      items,
    };
  }).filter((packResult) => packResult.items.length > 0);

  return {
    eventType,
    budgetFc,
    city: city || null,
    guestCount: guests || null,
    packages,
    catalog: {
      venues: rankedVenues.length,
      services: rankedServices.length,
    },
  };
}

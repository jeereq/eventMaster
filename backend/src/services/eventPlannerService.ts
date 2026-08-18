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
type PackStyle = 'cheap' | 'balanced' | 'comfort';

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

const STYLE_VENUE_FACTOR: Record<PackStyle, number> = {
  cheap: 0.78,
  balanced: 1,
  comfort: 1.22,
};

type Scored<T> = T & { cost: number; match: 'exact' | 'unknown'; favorite: boolean };

type MissingSlot = {
  slot: 'venue' | ServiceCategory;
  label: string;
  reason: string;
};

function parseEventType(value: unknown): EventPlanType | null {
  return typeof value === 'string' && EVENT_PLAN_TYPES.includes(value as EventPlanType)
    ? value as EventPlanType
    : null;
}

function parseCategories(value: unknown): ServiceCategory[] | null {
  if (!Array.isArray(value)) return null;
  const allowed = new Set<string>(Object.values(ServiceCategory));
  const unique: ServiceCategory[] = [];
  for (const item of value) {
    if (typeof item === 'string' && allowed.has(item) && !unique.includes(item as ServiceCategory)) {
      unique.push(item as ServiceCategory);
    }
  }
  return unique;
}

function formatFc(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}

function estimateCost(priceFromFc: number | null, priceUnit: string, guestCount: number): number | null {
  if (priceFromFc == null || priceFromFc <= 0) return null;
  if ((priceUnit === 'PERSON' || priceUnit === 'QUOTA') && guestCount > 0) {
    return priceFromFc * guestCount;
  }
  return priceFromFc;
}

function eventMatch(details: unknown, eventType: string): 'exact' | 'unknown' | 'no' {
  const types = parseListingDetails(details).eventTypes;
  if (!types.length) return 'unknown';
  return types.includes(eventType) ? 'exact' : 'no';
}

function sortCandidates<T extends { cost: number; favorite: boolean; match: 'exact' | 'unknown' }>(
  items: T[],
  budget: number,
  style: PackStyle,
): T[] {
  return items.slice().sort((a, b) => {
    if (style === 'cheap') {
      const cost = a.cost - b.cost;
      if (cost) return cost;
    } else if (style === 'comfort') {
      const cost = b.cost - a.cost;
      if (cost) return cost;
    } else {
      const target = budget * 0.85;
      const diff = Math.abs(a.cost - target) - Math.abs(b.cost - target);
      if (diff) return diff;
    }
    const match = Number(b.match === 'exact') - Number(a.match === 'exact');
    if (match) return match;
    return Number(b.favorite) - Number(a.favorite);
  });
}

function pickForBudget<T extends { slug: string; cost: number; favorite: boolean; match: 'exact' | 'unknown' }>(
  items: T[],
  budget: number,
  style: PackStyle,
  excludeSlugs: Set<string>,
): { item: T; reused: boolean } | null {
  const affordable = items.filter((item) => item.cost <= budget);
  if (!affordable.length) return null;
  const fresh = affordable.filter((item) => !excludeSlugs.has(item.slug));
  const pool = fresh.length ? fresh : affordable;
  const picked = sortCandidates(pool, budget, style)[0];
  if (!picked) return null;
  return { item: picked, reused: excludeSlugs.has(picked.slug) };
}

function missingReason<T extends { cost: number }>(
  pool: T[],
  budget: number,
  label: string,
): string {
  if (!pool.length) return `Aucune offre « ${label} » pour ce type d’événement.`;
  if (!pool.some((item) => item.cost <= budget)) {
    return `Aucune offre « ${label} » sous ${formatFc(budget)}.`;
  }
  return `Aucune autre offre « ${label} » pour ce pack.`;
}

type VenueItem = {
  kind: 'venue';
  slug: string;
  title: string;
  orgName: string;
  city: string | null;
  location: string;
  coverUrl: string | null;
  priceFromFc: number | null;
  priceUnitLabel: string;
  estimatedFc: number;
  capacity: number | null;
  href: string;
  favorite: boolean;
  match: 'exact' | 'unknown';
  reused: boolean;
  alternatives: PlanItem[];
};

type ServiceItem = {
  kind: 'service';
  slug: string;
  title: string;
  category: ServiceCategory;
  categoryLabel: string;
  orgName: string;
  city: string | null;
  location: string;
  coverUrl: string | null;
  priceFromFc: number | null;
  priceUnitLabel: string;
  estimatedFc: number;
  href: string;
  favorite: boolean;
  match: 'exact' | 'unknown';
  reused: boolean;
  alternatives: PlanItem[];
};

type PlanItem = VenueItem | ServiceItem;

function serializeVenue(listing: Scored<{
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
}>, cost: number, extras?: { reused?: boolean }): VenueItem {
  const photos = parsePhotoUrls(listing.photos);
  return {
    kind: 'venue',
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
    favorite: listing.favorite,
    match: listing.match,
    reused: Boolean(extras?.reused),
    alternatives: [],
  };
}

function serializeService(offering: Scored<{
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
}>, cost: number, extras?: { reused?: boolean }): ServiceItem {
  const photos = parsePhotoUrls(offering.photos);
  return {
    kind: 'service',
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
    favorite: offering.favorite,
    match: offering.match,
    reused: Boolean(extras?.reused),
    alternatives: [],
  };
}

function attachAlternatives<T extends { slug: string; cost: number; favorite: boolean; match: 'exact' | 'unknown' }>(
  serialized: PlanItem,
  pool: T[],
  budget: number,
  style: PackStyle,
  serialize: (item: T, cost: number) => PlanItem,
  exclude: Set<string>,
  limit = 3,
): PlanItem {
  const alternatives = sortCandidates(
    pool.filter((item) => item.cost <= budget && item.slug !== serialized.slug && !exclude.has(item.slug)),
    budget,
    style,
  )
    .slice(0, limit)
    .map((item) => ({ ...serialize(item, item.cost), alternatives: [] }));
  return { ...serialized, alternatives };
}

export async function buildEventPlanProposals(input: {
  eventType: unknown;
  budgetFc: unknown;
  city?: unknown;
  guestCount?: unknown;
  favoriteSlugs?: Array<{ kind: string; slug: string }>;
  categories?: unknown;
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

  const template = EVENT_PACKS[eventType];
  const requested = parseCategories(input.categories);
  const required: PackSlot[] = requested
    ? requested.map((category) => (
      template.required.find((slot) => slot.category === category)
      || template.optional.find((slot) => slot.category === category)
      || { category, share: 0.08 }
    ))
    : template.required;
  const optional: PackSlot[] = requested
    ? template.optional.filter((slot) => !requested.includes(slot.category))
    : template.optional;

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
    const cost = estimateCost(listing.priceFromFc, listing.priceUnit, guests);
    if (cost == null) return [];
    return [{ ...listing, cost, match, favorite: favoriteVenues.has(listing.slug) }];
  });

  const rankedServices: Array<Scored<(typeof offerings)[number]>> = offerings.flatMap((offering) => {
    const match = eventMatch(offering.details, eventType);
    if (match === 'no') return [];
    const cost = estimateCost(offering.priceFromFc, offering.priceUnit, guests);
    if (cost == null) return [];
    return [{ ...offering, cost, match, favorite: favoriteServices.has(offering.slug) }];
  });

  const styles: Array<{ id: string; label: string; style: PackStyle; blurb: string }> = [
    { id: 'eco', label: 'Économique', style: 'cheap', blurb: 'Le moins cher qui tient dans le budget, sans options.' },
    { id: 'balanced', label: 'Équilibré', style: 'balanced', blurb: 'Répartition proche de l’enveloppe, options si le budget le permet.' },
    { id: 'comfort', label: 'Confort', style: 'comfort', blurb: 'Le plus complet dans le budget, options incluses.' },
  ];

  const usedVenueSlugs = new Set<string>();
  const usedServiceSlugs = new Set<string>();

  const packages = styles.map((style) => {
    const missing: MissingSlot[] = [];
    const notes: string[] = [];
    const items: PlanItem[] = [];
    let total = 0;

    const venueBudget = Math.min(
      budgetFc,
      Math.round(budgetFc * template.venueShare * STYLE_VENUE_FACTOR[style.style]),
    );
    const venuePick = pickForBudget(rankedVenues, venueBudget, style.style, usedVenueSlugs);
    if (venuePick) {
      usedVenueSlugs.add(venuePick.item.slug);
      const serialized = attachAlternatives(
        serializeVenue(venuePick.item, venuePick.item.cost, { reused: venuePick.reused }),
        rankedVenues,
        venueBudget,
        style.style,
        (item, cost) => serializeVenue(item, cost),
        new Set(),
      );
      items.push(serialized);
      total += venuePick.item.cost;
      if (venuePick.reused) notes.push('Même salle qu’un autre pack : pas d’alternative dans le budget.');
      if (venuePick.item.favorite) notes.push('Salle prise parmi vos favoris.');
    } else {
      missing.push({
        slot: 'venue',
        label: 'Salle',
        reason: missingReason(rankedVenues, venueBudget, 'Salle'),
      });
    }

    const addSlot = (slot: PackSlot, requiredSlot: boolean) => {
      const remaining = Math.max(0, budgetFc - total);
      if (remaining <= 0) {
        if (requiredSlot) {
          missing.push({
            slot: slot.category,
            label: serviceCategoryLabel(slot.category),
            reason: 'Budget déjà consommé par les autres lignes.',
          });
        }
        return;
      }
      const cap = Math.min(Math.round(budgetFc * slot.share * STYLE_VENUE_FACTOR[style.style]), remaining);
      const pool = rankedServices.filter((service) => service.category === slot.category);
      const picked = pickForBudget(pool, cap > 0 ? cap : remaining, style.style, usedServiceSlugs);
      if (!picked) {
        if (requiredSlot) {
          missing.push({
            slot: slot.category,
            label: serviceCategoryLabel(slot.category),
            reason: missingReason(pool, cap > 0 ? cap : remaining, serviceCategoryLabel(slot.category)),
          });
        }
        return;
      }
      usedServiceSlugs.add(picked.item.slug);
      const packExclude = new Set(items.filter((item) => item.kind === 'service').map((item) => item.slug));
      items.push(attachAlternatives(
        serializeService(picked.item, picked.item.cost, { reused: picked.reused }),
        pool,
        remaining,
        style.style,
        (item, cost) => serializeService(item, cost),
        packExclude,
      ));
      total += picked.item.cost;
      if (picked.reused) {
        notes.push(`${serviceCategoryLabel(slot.category)} : même prestataire qu’un autre pack.`);
      }
    };

    required.forEach((slot) => addSlot(slot, true));

    if (style.style !== 'cheap') {
      optional.forEach((slot) => {
        const remaining = budgetFc - total;
        const minKeep = style.style === 'comfort' ? 0 : Math.round(budgetFc * 0.04);
        if (remaining <= minKeep) return;
        addSlot(slot, false);
      });
    }

    const leftoverFc = Math.max(0, budgetFc - total);
    const favoriteCount = items.filter((item) => item.favorite).length;
    if (favoriteCount > 0) {
      notes.push(`${favoriteCount} favori${favoriteCount > 1 ? 's' : ''} inclus.`);
    }
    if (guests && items.some((item) => item.kind === 'venue' && item.capacity && item.capacity >= guests)) {
      notes.push(`Salle prévue pour au moins ${guests} invités.`);
    }
    if (!missing.length && leftoverFc > 0) {
      notes.push(`Reste ${formatFc(leftoverFc)} à réallouer ou à garder en marge.`);
    }

    return {
      id: style.id,
      label: style.label,
      blurb: style.blurb,
      style: style.style,
      totalFc: total,
      leftoverFc,
      overBudget: false,
      complete: missing.length === 0 && Boolean(items.find((item) => item.kind === 'venue')),
      venue: (items.find((item) => item.kind === 'venue') as VenueItem | undefined) || null,
      services: items.filter((item) => item.kind === 'service') as ServiceItem[],
      items,
      missing,
      notes,
      requiredCount: required.length + 1,
      filledCount: items.length,
    };
  }).filter((packResult) => packResult.items.length > 0 || packResult.missing.length > 0);

  return {
    eventType,
    budgetFc,
    city: city || null,
    guestCount: guests || null,
    slots: {
      required: required.map((slot) => ({ category: slot.category, label: serviceCategoryLabel(slot.category) })),
      optional: optional.map((slot) => ({ category: slot.category, label: serviceCategoryLabel(slot.category) })),
    },
    packages,
    catalog: {
      venues: rankedVenues.length,
      services: rankedServices.length,
    },
  };
}

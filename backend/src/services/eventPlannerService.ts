import { MarketplaceBookingStatus, ServiceCategory, VenuePriceUnit } from '@prisma/client';
import { prisma } from '../db';
import { parseListingDetails } from '../utils/listingDetails';
import { parsePhotoUrls, coverFromMedia, priceUnitLabel, serviceCategoryLabel } from '../utils/publicVenue';
import { normalizeAllowedCity, normalizeAllowedCommune } from '../utils/rdcCities';
import { collectUnavailableDates, isRangeAvailable } from '../utils/marketplaceDates';
import {
  EVENT_PLAN_TYPES,
  parseEventPlanInput,
  type EventPlanType,
  type FavoriteMode,
  type ParsedEventPlanInput,
  type SlotPriority,
} from './eventPlanBrief';

export { EVENT_PLAN_TYPES, type EventPlanType };

type PackSlot = { category: ServiceCategory; share: number; required: boolean; flex: boolean };
type PackStyle = 'cheap' | 'balanced' | 'comfort';

const EVENT_PACKS: Record<EventPlanType, { venueShare: number; required: Array<{ category: ServiceCategory; share: number }>; optional: Array<{ category: ServiceCategory; share: number }> }> = {
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

const HOLD_BOOKING_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];

type Scored<T> = T & {
  cost: number;
  match: 'exact' | 'unknown';
  favorite: boolean;
  amenityScore: number;
};

type MissingSlot = {
  slot: 'venue' | ServiceCategory;
  label: string;
  reason: string;
};

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

function amenityScore(details: unknown, wanted: string[]): number {
  if (!wanted.length) return 0;
  const have = new Set(parseListingDetails(details).amenities);
  return wanted.reduce((sum, id) => sum + (have.has(id) ? 1 : 0), 0);
}

function hasAllAmenities(details: unknown, wanted: string[]): boolean {
  if (!wanted.length) return true;
  const have = new Set(parseListingDetails(details).amenities);
  return wanted.every((id) => have.has(id));
}

function sortCandidates<T extends { cost: number; favorite: boolean; match: 'exact' | 'unknown'; amenityScore: number }>(
  items: T[],
  budget: number,
  style: PackStyle,
  favoriteMode: FavoriteMode,
): T[] {
  return items.slice().sort((a, b) => {
    if (favoriteMode === 'force') {
      const fav = Number(b.favorite) - Number(a.favorite);
      if (fav) return fav;
    }
    const amenities = b.amenityScore - a.amenityScore;
    if (amenities) return amenities;
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
    if (favoriteMode === 'ignore') return 0;
    return Number(b.favorite) - Number(a.favorite);
  });
}

function pickForBudget<T extends { slug: string; cost: number; favorite: boolean; match: 'exact' | 'unknown'; amenityScore: number }>(
  items: T[],
  budget: number,
  style: PackStyle,
  excludeSlugs: Set<string>,
  favoriteMode: FavoriteMode,
): { item: T; reused: boolean } | null {
  const affordable = items.filter((item) => item.cost <= budget);
  if (!affordable.length) return null;
  const fresh = affordable.filter((item) => !excludeSlugs.has(item.slug));
  const pool = fresh.length ? affordable.filter((item) => !excludeSlugs.has(item.slug)) : affordable;
  if (favoriteMode === 'force') {
    const favorites = pool.filter((item) => item.favorite);
    const forced = sortCandidates(favorites, budget, style, favoriteMode)[0];
    if (forced) return { item: forced, reused: excludeSlugs.has(forced.slug) };
  }
  const picked = sortCandidates(pool, budget, style, favoriteMode)[0];
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

function attachAlternatives<T extends { slug: string; cost: number; favorite: boolean; match: 'exact' | 'unknown'; amenityScore: number }>(
  serialized: PlanItem,
  pool: T[],
  budget: number,
  style: PackStyle,
  serialize: (item: T, cost: number) => PlanItem,
  exclude: Set<string>,
  favoriteMode: FavoriteMode,
  limit = 3,
): PlanItem {
  const alternatives = sortCandidates(
    pool.filter((item) => item.cost <= budget && item.slug !== serialized.slug && !exclude.has(item.slug)),
    budget,
    style,
    favoriteMode,
  )
    .slice(0, limit)
    .map((item) => ({ ...serialize(item, item.cost), alternatives: [] }));
  return { ...serialized, alternatives };
}

function templateShare(eventType: EventPlanType, key: string): number {
  const template = EVENT_PACKS[eventType];
  if (key === 'venue') return template.venueShare * 100;
  const slot = [...template.required, ...template.optional].find((item) => item.category === key);
  return (slot?.share || 0.08) * 100;
}

function resolveSlots(input: ParsedEventPlanInput): PackSlot[] {
  const template = EVENT_PACKS[input.eventType];
  const hasCustomSlots = Object.keys(input.slots).length > 0;
  if (!hasCustomSlots && input.legacyCategories) {
    return input.legacyCategories.map((category) => ({
      category,
      share: (template.required.find((slot) => slot.category === category)?.share
        || template.optional.find((slot) => slot.category === category)?.share
        || 0.08),
      required: true,
      flex: input.flexSlots.includes(category),
    }));
  }
  if (!hasCustomSlots) {
    return template.required.map((slot) => ({
      category: slot.category,
      share: slot.share,
      required: true,
      flex: input.flexSlots.includes(slot.category),
    }));
  }
  return (Object.entries(input.slots) as Array<[ServiceCategory, SlotPriority]>)
    .filter(([, priority]) => priority !== 'excluded')
    .map(([category, priority]) => ({
      category,
      share: (input.shares[category] || templateShare(input.eventType, category)) / 100,
      required: priority === 'required',
      flex: input.flexSlots.includes(category),
    }));
}

function resolveVenueShare(input: ParsedEventPlanInput, serviceSlots: PackSlot[]): number {
  if (input.includeVenue === 'no') return 0;
  if (input.shares.venue != null) return input.shares.venue / 100;
  const template = EVENT_PACKS[input.eventType].venueShare;
  const raw = [template, ...serviceSlots.map((slot) => slot.share)];
  const total = raw.reduce((sum, value) => sum + value, 0) || 1;
  return template / total;
}

function renormalizeShares(venueShare: number, slots: PackSlot[]): { venueShare: number; slots: PackSlot[] } {
  const total = venueShare + slots.reduce((sum, slot) => sum + slot.share, 0) || 1;
  return {
    venueShare: venueShare / total,
    slots: slots.map((slot) => ({ ...slot, share: slot.share / total })),
  };
}

const listingInclude = {
  room: { select: { name: true, capacity: true } },
  tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
  bookings: {
    where: { status: { in: HOLD_BOOKING_STATUSES } },
    select: { eventDate: true, eventEndDate: true },
  },
} as const;

const offeringInclude = {
  vendorProfile: { select: { displayName: true } },
  tenant: { select: { name: true } },
  bookings: {
    where: { status: { in: HOLD_BOOKING_STATUSES } },
    select: { eventDate: true, eventEndDate: true },
  },
} as const;

export async function buildEventPlanProposals(body: Record<string, unknown> & {
  favoriteSlugs?: Array<{ kind: string; slug: string }>;
}) {
  const input = parseEventPlanInput(body);
  const city = normalizeAllowedCity(input.city) || '';
  const commune = city ? (normalizeAllowedCommune(city, input.commune) || '') : '';
  const guests = input.guestCount;
  const favoriteVenues = new Set(
    (body.favoriteSlugs || []).filter((item) => item.kind === 'venue').map((item) => item.slug),
  );
  const favoriteServices = new Set(
    (body.favoriteSlugs || []).filter((item) => item.kind === 'service').map((item) => item.slug),
  );

  const relaxed: { commune?: boolean; city?: boolean; eventType?: boolean; availability?: boolean } = {};
  const serviceSlotsRaw = resolveSlots(input);
  const { venueShare, slots: serviceSlots } = renormalizeShares(
    resolveVenueShare(input, serviceSlotsRaw),
    serviceSlotsRaw,
  );

  const loadCatalog = async (cityFilter: string) => {
    const [listings, offerings] = await Promise.all([
      prisma.venueListing.findMany({
        where: {
          isPublic: true,
          ...(cityFilter ? { city: cityFilter } : {}),
          ...(guests ? { room: { capacity: { gte: guests } } } : {}),
        },
        include: listingInclude,
        take: 400,
      }),
      prisma.serviceOffering.findMany({
        where: {
          isPublic: true,
          ...(cityFilter ? { city: cityFilter } : {}),
        },
        include: offeringInclude,
        take: 400,
      }),
    ]);
    return { listings, offerings };
  };

  let { listings, offerings } = await loadCatalog(city);
  if (!listings.length && !offerings.length && city && (input.matchMode === 'widen' || input.missingStrategy === 'widen_city')) {
    const broader = await loadCatalog('');
    listings = broader.listings;
    offerings = broader.offerings;
    relaxed.city = true;
  }

  const dateKey = input.eventDate || '';
  const rankVenues = (rows: typeof listings, opts: { commune: string; date: boolean; type: 'strict' | 'unknown' | 'any'; amenities: boolean }) => (
    rows.flatMap((listing) => {
      if (opts.commune && String(listing.commune || '').toLowerCase() !== opts.commune.toLowerCase()) return [];
      if (opts.date && dateKey) {
        const unavailable = collectUnavailableDates(listing.blockedDates, listing.bookings);
        if (!isRangeAvailable(unavailable, dateKey, dateKey)) return [];
      }
      const match = eventMatch(listing.details, input.eventType);
      if (opts.type === 'strict' && match !== 'exact') return [];
      if (opts.type === 'unknown' && match === 'no') return [];
      if (opts.amenities && input.amenityMode === 'blocking' && !hasAllAmenities(listing.details, input.venueAmenities)) return [];
      const cost = estimateCost(listing.priceFromFc, listing.priceUnit, guests);
      if (cost == null) return [];
      return [{
        ...listing,
        cost,
        match: match === 'no' ? 'unknown' as const : match,
        favorite: input.favoriteMode === 'ignore' ? false : favoriteVenues.has(listing.slug),
        amenityScore: input.venueAmenities.length ? amenityScore(listing.details, input.venueAmenities) : 0,
      }];
    })
  );

  const rankServices = (rows: typeof offerings, opts: { commune: string; date: boolean; type: 'strict' | 'unknown' | 'any' }) => (
    rows.flatMap((offering) => {
      if (opts.commune && String(offering.commune || '').toLowerCase() !== opts.commune.toLowerCase()) return [];
      if (opts.date && dateKey) {
        const unavailable = collectUnavailableDates(offering.blockedDates, offering.bookings);
        if (!isRangeAvailable(unavailable, dateKey, dateKey)) return [];
      }
      const match = eventMatch(offering.details, input.eventType);
      if (opts.type === 'strict' && match !== 'exact') return [];
      if (opts.type === 'unknown' && match === 'no') return [];
      const cost = estimateCost(offering.priceFromFc, offering.priceUnit, guests);
      if (cost == null) return [];
      return [{
        ...offering,
        cost,
        match: match === 'no' ? 'unknown' as const : match,
        favorite: input.favoriteMode === 'ignore' ? false : favoriteServices.has(offering.slug),
        amenityScore: 0,
      }];
    })
  );

  const widen = input.matchMode === 'widen' || input.missingStrategy === 'widen_city';
  let rankedVenues = rankVenues(listings, {
    commune,
    date: Boolean(dateKey),
    type: input.matchMode === 'exact' ? 'strict' : 'unknown',
    amenities: true,
  });
  let rankedServices = rankServices(offerings, {
    commune,
    date: Boolean(dateKey),
    type: input.matchMode === 'exact' ? 'strict' : 'unknown',
  });

  if (commune && widen && (!rankedVenues.length || !rankedServices.length)) {
    rankedVenues = rankVenues(listings, { commune: '', date: Boolean(dateKey), type: 'unknown', amenities: true });
    rankedServices = rankServices(offerings, { commune: '', date: Boolean(dateKey), type: 'unknown' });
    relaxed.commune = true;
  }
  if (dateKey && widen && (!rankedVenues.length || !rankedServices.length)) {
    rankedVenues = rankVenues(listings, { commune: relaxed.commune ? '' : commune, date: false, type: 'unknown', amenities: true });
    rankedServices = rankServices(offerings, { commune: relaxed.commune ? '' : commune, date: false, type: 'unknown' });
    relaxed.availability = true;
  }
  if (widen && (!rankedVenues.length || !rankedServices.length)) {
    rankedVenues = rankVenues(listings, { commune: '', date: false, type: 'any', amenities: false });
    rankedServices = rankServices(offerings, { commune: '', date: false, type: 'any' });
    relaxed.eventType = true;
  }

  const styles: Array<{ id: string; label: string; style: PackStyle; blurb: string }> = [
    { id: 'eco', label: 'Économique', style: 'cheap', blurb: 'Le moins cher qui tient dans l’enveloppe, sans options.' },
    { id: 'balanced', label: 'Équilibré', style: 'balanced', blurb: 'Répartition proche de votre brief, options si le budget le permet.' },
    { id: 'comfort', label: 'Confort', style: 'comfort', blurb: 'Le plus complet dans l’enveloppe, options incluses.' },
  ];

  const usedVenueSlugs = new Set<string>();
  const usedServiceSlugs = new Set<string>();
  const envelope = input.spendableFc;
  const favoriteMode = input.favoriteMode;

  const packages = styles.map((style) => {
    const missing: MissingSlot[] = [];
    const notes: string[] = [];
    const items: PlanItem[] = [];
    let total = 0;
    const skippedRequired: PackSlot[] = [];

    const addVenue = (requiredVenue: boolean) => {
      if (input.lock?.kind === 'venue') {
        const locked = rankedVenues.find((item) => item.slug === input.lock?.slug);
        if (locked && locked.cost <= envelope) {
          if (input.distinctVenues) usedVenueSlugs.add(locked.slug);
          const serialized = attachAlternatives(
            serializeVenue(locked, locked.cost),
            rankedVenues,
            envelope,
            style.style,
            (item, cost) => serializeVenue(item, cost),
            new Set(),
            favoriteMode,
          );
          items.push(serialized);
          total += locked.cost;
          notes.push('Salle figée depuis votre relance.');
          return;
        }
        notes.push('La salle figée n’est plus disponible dans l’enveloppe.');
      }
      const venueBudget = Math.min(envelope, Math.round(envelope * venueShare * STYLE_VENUE_FACTOR[style.style]));
      const venuePick = pickForBudget(
        rankedVenues,
        venueBudget,
        style.style,
        input.distinctVenues ? usedVenueSlugs : new Set(),
        favoriteMode,
      );
      if (venuePick) {
        if (input.distinctVenues) usedVenueSlugs.add(venuePick.item.slug);
        const serialized = attachAlternatives(
          serializeVenue(venuePick.item, venuePick.item.cost, { reused: venuePick.reused }),
          rankedVenues,
          venueBudget,
          style.style,
          (item, cost) => serializeVenue(item, cost),
          new Set(),
          favoriteMode,
        );
        items.push(serialized);
        total += venuePick.item.cost;
        if (venuePick.reused) notes.push('Même salle qu’un autre pack : pas d’alternative dans le budget.');
        if (venuePick.item.favorite) notes.push('Salle prise parmi vos favoris.');
      } else if (requiredVenue) {
        missing.push({
          slot: 'venue',
          label: 'Salle',
          reason: missingReason(rankedVenues, venueBudget, 'Salle'),
        });
      }
    };

    if (input.includeVenue === 'yes') addVenue(true);
    else if (input.includeVenue === 'if_fits') addVenue(false);

    const addSlot = (slot: PackSlot, requiredSlot: boolean) => {
      if (input.lock?.kind === 'service' && (input.lock.category === slot.category || (!input.lock.category && items.every((item) => item.kind !== 'service' || item.category !== slot.category)))) {
        const locked = rankedServices.find((item) => item.slug === input.lock?.slug && item.category === slot.category);
        if (locked && locked.cost <= envelope - total) {
          usedServiceSlugs.add(locked.slug);
          items.push(attachAlternatives(
            serializeService(locked, locked.cost),
            rankedServices.filter((service) => service.category === slot.category),
            envelope - total,
            style.style,
            (item, cost) => serializeService(item, cost),
            new Set(items.filter((item) => item.kind === 'service').map((item) => item.slug)),
            favoriteMode,
          ));
          total += locked.cost;
          notes.push(`${serviceCategoryLabel(slot.category)} : ligne figée.`);
          return;
        }
      }
      const remaining = Math.max(0, envelope - total);
      if (remaining <= 0) {
        if (requiredSlot) {
          missing.push({
            slot: slot.category,
            label: serviceCategoryLabel(slot.category),
            reason: 'Budget déjà consommé par les autres lignes.',
          });
          skippedRequired.push(slot);
        }
        return;
      }
      const cap = slot.flex
        ? remaining
        : Math.min(Math.round(envelope * slot.share * STYLE_VENUE_FACTOR[style.style]), remaining);
      const pool = rankedServices.filter((service) => service.category === slot.category);
      const picked = pickForBudget(pool, cap > 0 ? cap : remaining, style.style, usedServiceSlugs, favoriteMode);
      if (!picked) {
        if (requiredSlot) {
          missing.push({
            slot: slot.category,
            label: serviceCategoryLabel(slot.category),
            reason: missingReason(pool, cap > 0 ? cap : remaining, serviceCategoryLabel(slot.category)),
          });
          skippedRequired.push(slot);
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
        favoriteMode,
      ));
      total += picked.item.cost;
      if (picked.reused) {
        notes.push(`${serviceCategoryLabel(slot.category)} : même prestataire qu’un autre pack.`);
      }
    };

    const requiredSlots = serviceSlots.filter((slot) => slot.required);
    const optionalSlots = serviceSlots.filter((slot) => !slot.required);

    requiredSlots.forEach((slot) => addSlot(slot, true));

    if (input.missingStrategy === 'reallocate' && skippedRequired.length) {
      notes.push('Part des métiers introuvables réallouée au reste du pack.');
    }

    if (style.style !== 'cheap') {
      optionalSlots.forEach((slot) => {
        const remaining = envelope - total;
        const minKeep = style.style === 'comfort' ? 0 : Math.round(envelope * 0.04);
        if (remaining <= minKeep) return;
        addSlot(slot, false);
      });
    }

    const leftoverFc = Math.max(0, envelope - total);
    const favoriteCount = items.filter((item) => item.favorite).length;
    if (favoriteCount > 0) {
      notes.push(`${favoriteCount} favori${favoriteCount > 1 ? 's' : ''} inclus.`);
    }
    if (guests && items.some((item) => item.kind === 'venue' && item.capacity && item.capacity >= guests)) {
      notes.push(`Salle prévue pour au moins ${guests} invités.`);
    }
    if (input.budgetMinFc > 0 && total < input.budgetMinFc) {
      notes.push(`Sous le budget minimum (${formatFc(input.budgetMinFc)}).`);
    }
    if (input.marginPct > 0) {
      notes.push(`Marge de sécurité ${input.marginPct} % · enveloppe utile ${formatFc(envelope)}.`);
    }
    if (!missing.length && leftoverFc > 0) {
      notes.push(`Reste ${formatFc(leftoverFc)} à réallouer ou à garder en marge.`);
    }
    if (relaxed.city) notes.push('Ville élargie faute de catalogue local.');
    if (relaxed.commune) notes.push('Commune élargie pour trouver des offres.');
    if (relaxed.availability) notes.push('Date ignorée : trop peu d’offres disponibles ce jour-là.');
    if (relaxed.eventType) notes.push('Type d’événement élargi pour remplir le pack.');

    const venueItem = (items.find((item) => item.kind === 'venue') as VenueItem | undefined) || null;
    const serviceItems = items.filter((item) => item.kind === 'service') as ServiceItem[];
    const allocation = [
      ...(venueItem ? [{ key: 'venue', label: 'Salle', amountFc: venueItem.estimatedFc }] : []),
      ...serviceItems.map((item) => ({
        key: item.category,
        label: item.categoryLabel,
        amountFc: item.estimatedFc,
      })),
    ];

    const venueRequired = input.includeVenue === 'yes';
    return {
      id: style.id,
      label: style.label,
      blurb: style.blurb,
      style: style.style,
      totalFc: total,
      leftoverFc,
      overBudget: total > input.budgetMaxFc,
      complete: missing.length === 0 && (!venueRequired || Boolean(venueItem)),
      venue: venueItem,
      services: serviceItems,
      items,
      missing,
      notes: [...new Set(notes)],
      requiredCount: requiredSlots.length + (venueRequired ? 1 : 0),
      filledCount: items.length,
      allocation,
    };
  }).filter((packResult) => packResult.items.length > 0 || packResult.missing.length > 0);

  return {
    eventType: input.eventType,
    budgetFc: input.budgetMaxFc,
    budgetMinFc: input.budgetMinFc,
    budgetMaxFc: input.budgetMaxFc,
    spendableFc: envelope,
    city: city || null,
    commune: commune || null,
    guestCount: guests || null,
    eventDate: dateKey || null,
    relaxed,
    slots: {
      required: serviceSlots.filter((slot) => slot.required).map((slot) => ({ category: slot.category, label: serviceCategoryLabel(slot.category) })),
      optional: serviceSlots.filter((slot) => !slot.required).map((slot) => ({ category: slot.category, label: serviceCategoryLabel(slot.category) })),
    },
    packages,
    catalog: {
      venues: rankedVenues.length,
      services: rankedServices.length,
    },
  };
}

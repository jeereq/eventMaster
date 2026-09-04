import { ServiceCategory } from '@prisma/client';
import { loadPlatformSettings } from './platformSettingsService';

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

export const SERVICE_CATEGORY_VALUES = Object.values(ServiceCategory);

export type SlotPriority = 'required' | 'optional' | 'excluded';
export type IncludeVenue = 'yes' | 'no' | 'if_fits';
export type FavoriteMode = 'bonus' | 'force' | 'ignore';
export type MatchMode = 'exact' | 'widen';
export type MissingStrategy = 'gap' | 'reallocate' | 'widen_city';
export type AmenityMode = 'preferred' | 'blocking';

export type EventPlanLock = {
  kind: 'venue' | 'service';
  slug: string;
  category?: ServiceCategory;
};

export type ParsedEventPlanInput = {
  eventType: EventPlanType;
  budgetMinFc: number;
  budgetMaxFc: number;
  spendableFc: number;
  marginPct: 0 | 5 | 10;
  city: string;
  commune: string;
  guestCount: number;
  eventDate: string;
  includeVenue: IncludeVenue;
  slots: Record<ServiceCategory, SlotPriority>;
  shares: Record<string, number>;
  favoriteMode: FavoriteMode;
  matchMode: MatchMode;
  missingStrategy: MissingStrategy;
  distinctVenues: boolean;
  venueAmenities: string[];
  amenityMode: AmenityMode;
  lock: EventPlanLock | null;
  flexSlots: ServiceCategory[];
  legacyCategories: ServiceCategory[] | null;
};

const AMENITY_IDS = new Set([
  'wifi', 'parking', 'ac', 'generator', 'sound', 'kitchen', 'stage', 'cloakroom',
  'accessible', 'garden', 'security', 'projector', 'toilets', 'lighting', 'bar',
]);

function parseEventType(value: unknown): EventPlanType | null {
  return typeof value === 'string' && EVENT_PLAN_TYPES.includes(value as EventPlanType)
    ? value as EventPlanType
    : null;
}

function parseEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function parseMargin(value: unknown): 0 | 5 | 10 {
  const n = Number(value);
  return n === 0 || n === 5 || n === 10 ? n : 5;
}

function parseMoney(value: unknown): number {
  const n = Number(typeof value === 'string' ? value.replace(/\s/g, '') : value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function parseSlots(value: unknown): Record<ServiceCategory, SlotPriority> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const slots = {} as Record<ServiceCategory, SlotPriority>;
  for (const category of SERVICE_CATEGORY_VALUES) {
    const item = raw[category];
    slots[category] = item === 'required' || item === 'optional' || item === 'excluded' ? item : 'excluded';
  }
  return slots;
}

function parseShares(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const next: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) continue;
    next[key] = n > 1 ? n : n * 100;
  }
  return Object.keys(next).length ? next : null;
}

function parseLock(value: unknown): EventPlanLock | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const kind = raw.kind === 'venue' || raw.kind === 'service' ? raw.kind : null;
  const slug = typeof raw.slug === 'string' ? raw.slug.trim().toLowerCase() : '';
  if (!kind || !slug) return null;
  const category = typeof raw.category === 'string' && SERVICE_CATEGORY_VALUES.includes(raw.category as ServiceCategory)
    ? raw.category as ServiceCategory
    : undefined;
  return { kind, slug, category };
}

function parseCategories(value: unknown): ServiceCategory[] | null {
  if (!Array.isArray(value)) return null;
  const unique: ServiceCategory[] = [];
  for (const item of value) {
    if (typeof item === 'string' && SERVICE_CATEGORY_VALUES.includes(item as ServiceCategory) && !unique.includes(item as ServiceCategory)) {
      unique.push(item as ServiceCategory);
    }
  }
  return unique;
}

export function parseEventPlanInput(body: Record<string, unknown>): ParsedEventPlanInput {
  const eventType = parseEventType(body.eventType);
  if (!eventType) {
    throw Object.assign(new Error('Choisissez un type d’événement.'), { status: 400 });
  }

  const settings = loadPlatformSettings();
  const rate = Number(settings.usdExchangeRateCdf) > 0 ? Number(settings.usdExchangeRateCdf) : 2800;

  let budgetMaxFc = parseMoney(body.budgetMaxFc ?? body.budgetFc);
  let budgetMinFc = Math.max(0, parseMoney(body.budgetMinFc));

  const budgetMaxUsd = parseMoney(body.budgetMaxUsd ?? body.budgetUsd);
  const budgetMinUsd = Math.max(0, parseMoney(body.budgetMinUsd));

  if ((!budgetMaxFc || budgetMaxFc <= 0) && budgetMaxUsd > 0) {
    budgetMaxFc = Math.round(budgetMaxUsd * rate);
  }
  if ((!budgetMinFc || budgetMinFc <= 0) && budgetMinUsd > 0) {
    budgetMinFc = Math.round(budgetMinUsd * rate);
  }

  if (!Number.isFinite(budgetMaxFc) || budgetMaxFc < 50000) {
    throw Object.assign(new Error('Indiquez un budget d’au moins 50 000 FC (ou environ 20 $).'), { status: 400 });
  }
  if (budgetMinFc > 0 && budgetMinFc > budgetMaxFc) {
    throw Object.assign(new Error('Le budget minimum ne peut pas dépasser le maximum.'), { status: 400 });
  }

  const marginPct = parseMargin(body.marginPct);
  const spendableFc = Math.max(50000, Math.round(budgetMaxFc * (1 - marginPct / 100)));

  const guestCountRaw = Number(body.guestCount);
  const guestCount = Number.isFinite(guestCountRaw) && guestCountRaw > 0 ? Math.floor(guestCountRaw) : 0;
  const eventDate = typeof body.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)
    ? body.eventDate
    : '';

  const includeVenue = parseEnum<IncludeVenue>(body.includeVenue, ['yes', 'no', 'if_fits'], 'yes');
  const slots = parseSlots(body.slots);
  const shares = parseShares(body.shares) || {};
  const venueAmenities = Array.isArray(body.venueAmenities)
    ? body.venueAmenities.filter((id): id is string => typeof id === 'string' && AMENITY_IDS.has(id)).slice(0, 8)
    : [];

  const flexSlots = Array.isArray(body.flexSlots)
    ? body.flexSlots.filter((item): item is ServiceCategory => typeof item === 'string' && SERVICE_CATEGORY_VALUES.includes(item as ServiceCategory))
    : [];

  return {
    eventType,
    budgetMinFc,
    budgetMaxFc,
    spendableFc,
    marginPct,
    city: typeof body.city === 'string' ? body.city.trim() : '',
    commune: typeof body.commune === 'string' ? body.commune.trim() : '',
    guestCount,
    eventDate,
    includeVenue,
    slots: slots || ({} as Record<ServiceCategory, SlotPriority>),
    shares,
    favoriteMode: parseEnum<FavoriteMode>(body.favoriteMode, ['bonus', 'force', 'ignore'], 'bonus'),
    matchMode: parseEnum<MatchMode>(body.matchMode, ['exact', 'widen'], 'widen'),
    missingStrategy: parseEnum<MissingStrategy>(body.missingStrategy, ['gap', 'reallocate', 'widen_city'], 'reallocate'),
    distinctVenues: body.distinctVenues !== false,
    venueAmenities,
    amenityMode: parseEnum<AmenityMode>(body.amenityMode, ['preferred', 'blocking'], 'preferred'),
    lock: parseLock(body.lock),
    flexSlots,
    legacyCategories: slots ? null : parseCategories(body.categories),
  };
}

export function serializeBriefPayload(input: ParsedEventPlanInput) {
  return {
    eventType: input.eventType,
    budgetMinFc: input.budgetMinFc,
    budgetMaxFc: input.budgetMaxFc,
    marginPct: input.marginPct,
    city: input.city,
    commune: input.commune,
    guestCount: input.guestCount,
    eventDate: input.eventDate,
    includeVenue: input.includeVenue,
    slots: input.slots,
    shares: input.shares,
    favoriteMode: input.favoriteMode,
    matchMode: input.matchMode,
    missingStrategy: input.missingStrategy,
    distinctVenues: input.distinctVenues,
    venueAmenities: input.venueAmenities,
    amenityMode: input.amenityMode,
  };
}

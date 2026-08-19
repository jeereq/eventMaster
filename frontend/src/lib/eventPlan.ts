import type { ListingAmenityId, ListingEventTypeId } from '@/lib/listingDetails';
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategory } from '@/lib/marketplace';

export const EVENT_PLAN_SLOTS: Record<ListingEventTypeId, { required: ServiceCategory[]; optional: ServiceCategory[] }> = {
  wedding: {
    required: ['CATERING', 'PHOTOGRAPHY', 'DJ', 'DECORATION'],
    optional: ['VIDEO', 'FLORIST', 'MC', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CAR'],
  },
  birthday: {
    required: ['CATERING', 'DJ', 'DECORATION'],
    optional: ['PHOTOGRAPHY', 'RENTAL_CLOTHING_CHILD'],
  },
  corporate: {
    required: ['CATERING', 'MC'],
    optional: ['PHOTOGRAPHY', 'VIDEO', 'TRANSPORT', 'RENTAL_CAR'],
  },
  gala: {
    required: ['CATERING', 'DJ', 'DECORATION', 'MC'],
    optional: ['PHOTOGRAPHY', 'VIDEO', 'RENTAL_CLOTHING_MEN', 'RENTAL_CLOTHING_WOMEN'],
  },
  religious: {
    required: ['CATERING', 'DECORATION'],
    optional: ['TRANSPORT', 'PHOTOGRAPHY', 'MC', 'RENTAL_EQUIPMENT'],
  },
  private: {
    required: ['CATERING', 'DJ'],
    optional: ['DECORATION', 'PHOTOGRAPHY', 'RENTAL_EQUIPMENT'],
  },
  shooting: {
    required: ['PHOTOGRAPHY', 'VIDEO'],
    optional: ['DECORATION', 'OTHER', 'RENTAL_CLOTHING_WOMEN', 'RENTAL_CLOTHING_MEN'],
  },
};

/** Parts par défaut (pourcentages). Les options peuvent dépasser 100 — elles sont renormalisées. */
export const EVENT_PACK_SHARES: Record<ListingEventTypeId, Record<string, number>> = {
  wedding: { venue: 38, CATERING: 28, PHOTOGRAPHY: 10, DJ: 8, DECORATION: 10, VIDEO: 6, FLORIST: 5, MC: 4 },
  birthday: { venue: 40, CATERING: 28, DJ: 14, DECORATION: 10, PHOTOGRAPHY: 8 },
  corporate: { venue: 42, CATERING: 28, MC: 8, PHOTOGRAPHY: 8, VIDEO: 7, TRANSPORT: 6 },
  gala: { venue: 40, CATERING: 26, DJ: 8, DECORATION: 10, MC: 6, PHOTOGRAPHY: 8, VIDEO: 6 },
  religious: { venue: 40, CATERING: 26, DECORATION: 12, TRANSPORT: 8, PHOTOGRAPHY: 8, MC: 5 },
  private: { venue: 40, CATERING: 28, DJ: 12, DECORATION: 10, PHOTOGRAPHY: 8 },
  shooting: { venue: 35, PHOTOGRAPHY: 28, VIDEO: 18, DECORATION: 10, OTHER: 8 },
};

export type SlotPriority = 'required' | 'optional' | 'excluded';
export type IncludeVenue = 'yes' | 'no' | 'if_fits';
export type FavoriteMode = 'bonus' | 'force' | 'ignore';
export type MatchMode = 'exact' | 'widen';
export type MissingStrategy = 'gap' | 'reallocate' | 'widen_city';
export type AmenityMode = 'preferred' | 'blocking';
export type MarginPct = 0 | 5 | 10;

export type EventPlanLock = {
  kind: 'venue' | 'service';
  slug: string;
  category?: ServiceCategory;
};

export type EventPlanBrief = {
  eventType: ListingEventTypeId;
  budgetMinFc: number;
  budgetMaxFc: number;
  marginPct: MarginPct;
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
  venueAmenities: ListingAmenityId[];
  amenityMode: AmenityMode;
};

export type EventPlanRequest = EventPlanBrief & {
  lock?: EventPlanLock;
  flexSlots?: ServiceCategory[];
};

export const EVENT_PLAN_BRIEF_STORAGE_KEY = 'em-event-plan-brief';

export function defaultSlotPriorities(eventType: ListingEventTypeId): Record<ServiceCategory, SlotPriority> {
  const spec = EVENT_PLAN_SLOTS[eventType];
  return Object.fromEntries(
    SERVICE_CATEGORIES.map((category) => [
      category,
      spec.required.includes(category) ? 'required' : spec.optional.includes(category) ? 'optional' : 'excluded',
    ]),
  ) as Record<ServiceCategory, SlotPriority>;
}

export function defaultShares(eventType: ListingEventTypeId, includeVenue: IncludeVenue, slots: Record<ServiceCategory, SlotPriority>): Record<string, number> {
  const preset = EVENT_PACK_SHARES[eventType] || {};
  const keys = [
    ...(includeVenue === 'no' ? [] : ['venue']),
    ...SERVICE_CATEGORIES.filter((category) => slots[category] !== 'excluded'),
  ];
  const raw: Record<string, number> = {};
  for (const key of keys) raw[key] = preset[key] || 8;
  const total = Object.values(raw).reduce((sum, value) => sum + value, 0) || 1;
  const next: Record<string, number> = {};
  for (const key of keys) next[key] = Math.max(1, Math.round((raw[key] / total) * 100));
  return next;
}

export function createDefaultBrief(eventType: ListingEventTypeId = 'wedding'): EventPlanBrief {
  const slots = defaultSlotPriorities(eventType);
  return {
    eventType,
    budgetMinFc: 0,
    budgetMaxFc: 1500000,
    marginPct: 5,
    city: '',
    commune: '',
    guestCount: 100,
    eventDate: '',
    includeVenue: 'yes',
    slots,
    shares: defaultShares(eventType, 'yes', slots),
    favoriteMode: 'bonus',
    matchMode: 'widen',
    missingStrategy: 'reallocate',
    distinctVenues: true,
    venueAmenities: [],
    amenityMode: 'preferred',
  };
}

export function hydrateBrief(raw: unknown): EventPlanBrief {
  const base = createDefaultBrief();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const value = raw as Partial<EventPlanBrief>;
  const eventType = value.eventType && EVENT_PLAN_SLOTS[value.eventType] ? value.eventType : base.eventType;
  const slots = { ...defaultSlotPriorities(eventType), ...(value.slots || {}) };
  const includeVenue = value.includeVenue === 'no' || value.includeVenue === 'if_fits' || value.includeVenue === 'yes'
    ? value.includeVenue
    : 'yes';
  return {
    ...base,
    ...value,
    eventType,
    includeVenue,
    slots,
    shares: value.shares && Object.keys(value.shares).length ? value.shares : defaultShares(eventType, includeVenue, slots),
    budgetMinFc: Number(value.budgetMinFc) || 0,
    budgetMaxFc: Number(value.budgetMaxFc) || Number((value as { budgetFc?: number }).budgetFc) || base.budgetMaxFc,
    marginPct: value.marginPct === 0 || value.marginPct === 5 || value.marginPct === 10 ? value.marginPct : 5,
    guestCount: Number(value.guestCount) || 0,
    venueAmenities: Array.isArray(value.venueAmenities) ? value.venueAmenities : [],
  };
}

export function readStoredBrief(): EventPlanBrief {
  try {
    const raw = localStorage.getItem(EVENT_PLAN_BRIEF_STORAGE_KEY);
    return raw ? hydrateBrief(JSON.parse(raw)) : createDefaultBrief();
  } catch {
    return createDefaultBrief();
  }
}

export function writeStoredBrief(brief: EventPlanBrief) {
  try {
    localStorage.setItem(EVENT_PLAN_BRIEF_STORAGE_KEY, JSON.stringify(brief));
  } catch {
    /* ignore */
  }
}

/** Préremplit le brief catalogue à partir d’un événement (date, ville, invités). */
export function seedBriefFromEvent(opts: {
  eventDate?: string | null;
  location?: string | null;
  guestCount?: number | null;
}) {
  const current = readStoredBrief();
  const dateKey = String(opts.eventDate || '').slice(0, 10);
  const raw = String(opts.location || '').toLowerCase();
  const city = raw.includes('lubumbashi')
    ? 'Lubumbashi'
    : raw.includes('kinshasa')
      ? 'Kinshasa'
      : current.city;
  writeStoredBrief({
    ...current,
    ...(dateKey ? { eventDate: dateKey } : {}),
    ...(city ? { city } : {}),
    ...(opts.guestCount && opts.guestCount > 0 ? { guestCount: opts.guestCount } : {}),
  });
}

export function briefWithEventType(brief: EventPlanBrief, eventType: ListingEventTypeId): EventPlanBrief {
  const slots = defaultSlotPriorities(eventType);
  return {
    ...brief,
    eventType,
    slots,
    shares: defaultShares(eventType, brief.includeVenue, slots),
  };
}

/** Enveloppe réellement cherchée (budget max moins la marge). Aligné sur le backend (plancher 50 000 FC). */
export function briefSpendableFc(brief: EventPlanBrief): number {
  const max = Math.max(0, brief.budgetMaxFc);
  return Math.max(50000, Math.round(max * (1 - brief.marginPct / 100)));
}

/** Montant exact mis de côté grâce à la marge (budget max − enveloppe utile). */
export function briefMarginFc(brief: EventPlanBrief): number {
  return Math.max(0, brief.budgetMaxFc - briefSpendableFc(brief));
}

export function shareRows(brief: EventPlanBrief): Array<{ key: string; label: string; pct: number; amountFc: number }> {
  const spendable = briefSpendableFc(brief);
  const keys = [
    ...(brief.includeVenue === 'no' ? [] : ['venue']),
    ...SERVICE_CATEGORIES.filter((category) => brief.slots[category] !== 'excluded'),
  ];
  return keys.map((key) => {
    const pct = brief.shares[key] || 0;
    return {
      key,
      label: key === 'venue' ? 'Salle' : SERVICE_CATEGORY_LABELS[key as ServiceCategory],
      pct,
      amountFc: Math.round(spendable * (pct / 100)),
    };
  });
}

/** Brief d’exemple : mariage à Kinshasa, 100 invités, 1 500 000 FC. */
export function createDemoWeddingBrief(): EventPlanBrief {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  const toSaturday = (6 - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + toSaturday);
  return {
    ...createDefaultBrief('wedding'),
    budgetMinFc: 0,
    budgetMaxFc: 1_500_000,
    marginPct: 5,
    city: 'Kinshasa',
    commune: '',
    guestCount: 100,
    eventDate: date.toISOString().slice(0, 10),
    includeVenue: 'yes',
  };
}

export function cycleSlotPriority(current: SlotPriority): SlotPriority {
  if (current === 'required') return 'optional';
  if (current === 'optional') return 'excluded';
  return 'required';
}

export type PlanItem = {
  kind: 'venue' | 'service';
  slug: string;
  title: string;
  orgName: string;
  location: string;
  coverUrl: string | null;
  estimatedFc: number;
  categoryLabel?: string;
  category?: ServiceCategory;
  href: string;
  favorite?: boolean;
  match?: 'exact' | 'unknown';
  reused?: boolean;
  capacity?: number | null;
  alternatives?: PlanItem[];
};

export type PlanMissingSlot = {
  slot: 'venue' | ServiceCategory;
  label: string;
  reason: string;
};

export type PlanAllocation = {
  key: string;
  label: string;
  amountFc: number;
};

export type SavedPackItem = Omit<PlanItem, 'alternatives' | 'match' | 'reused' | 'favorite' | 'category'>;

export type SavedEventPack = {
  id: string;
  name: string;
  eventType: string;
  budgetFc: number;
  city: string | null;
  guestCount: number | null;
  eventDate: string | null;
  source: 'search' | 'custom';
  styleLabel: string | null;
  totalFc: number;
  leftoverFc: number;
  items: SavedPackItem[];
  venue: SavedPackItem | null;
  services: SavedPackItem[];
  createdAt: string;
};

export type SavedEventBrief = {
  id: string;
  name: string;
  payload: EventPlanBrief;
  createdAt: string;
  updatedAt: string;
};

export function snapshotPlanItems(items: PlanItem[]): SavedPackItem[] {
  return items.map((item) => ({
    kind: item.kind,
    slug: item.slug,
    title: item.title,
    orgName: item.orgName,
    location: item.location,
    coverUrl: item.coverUrl,
    estimatedFc: item.estimatedFc,
    categoryLabel: item.categoryLabel,
    href: item.href,
    capacity: item.capacity ?? null,
  }));
}

export type PlanPackage = {
  id: string;
  label: string;
  blurb?: string;
  totalFc: number;
  leftoverFc: number;
  overBudget: boolean;
  complete?: boolean;
  venue: PlanItem | null;
  services: PlanItem[];
  items?: PlanItem[];
  missing?: PlanMissingSlot[];
  notes?: string[];
  filledCount?: number;
  requiredCount?: number;
  allocation?: PlanAllocation[];
};

export type EventPlanRelaxed = {
  commune?: boolean;
  city?: boolean;
  eventType?: boolean;
  availability?: boolean;
};

export type EventPlanResult = {
  eventType: ListingEventTypeId;
  budgetFc: number;
  budgetMinFc: number;
  budgetMaxFc: number;
  spendableFc: number;
  city: string | null;
  commune: string | null;
  guestCount: number | null;
  eventDate: string | null;
  relaxed: EventPlanRelaxed;
  packages: PlanPackage[];
  catalog: { venues: number; services: number };
};

export type EventPlanAiItem = PlanItem;

export type EventPlanAiResult = {
  summary: string;
  rationale: string;
  warnings: string[];
  estimatedTotalFc: number;
  catalog: { venues: number; trades: number; rentals: number };
  venue: PlanItem | null;
  services: PlanItem[];
};

export function eventPlanAiToPackage(result: EventPlanAiResult, budgetMaxFc = 0): PlanPackage {
  const items = [
    ...(result.venue ? [result.venue] : []),
    ...result.services,
  ];
  return {
    id: 'ai',
    label: 'Proposition IA',
    blurb: result.summary,
    totalFc: result.estimatedTotalFc,
    leftoverFc: Math.max(0, budgetMaxFc - result.estimatedTotalFc),
    overBudget: budgetMaxFc > 0 && result.estimatedTotalFc > budgetMaxFc,
    complete: items.length > 0,
    venue: result.venue,
    services: result.services,
    items,
    notes: [result.rationale, ...result.warnings].filter(Boolean),
    filledCount: items.length,
    requiredCount: items.length,
  };
}

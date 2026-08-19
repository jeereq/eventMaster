import { MarketplaceBookingStatus, ServiceCategory } from '@prisma/client';
import { prisma } from '../db';
import { parseListingDetails } from '../utils/listingDetails';
import { coverFromMedia, isServiceRentalCategory, parsePhotoUrls, serviceCategoryLabel } from '../utils/publicVenue';
import { collectUnavailableDates, isRangeAvailable, toDateKey } from '../utils/marketplaceDates';
import { allowedCityPrismaFilter, normalizeAllowedCity, normalizeAllowedCommune } from '../utils/rdcCities';
import { EVENT_PLAN_TYPES, type EventPlanType } from './eventPlanBrief';

const HOLD_BOOKING_STATUSES: MarketplaceBookingStatus[] = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const rateBuckets = new Map<string, { count: number; startedAt: number }>();

type HttpError = Error & { status?: number };

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

function rateLimit(userId: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, startedAt: now });
    return;
  }
  if (bucket.count >= RATE_MAX) {
    fail(429, 'Trop de simulations. Réessayez dans une minute.');
  }
  bucket.count += 1;
}

function estimateCost(priceFromFc: number | null, priceUnit: string, guestCount: number): number {
  if (priceFromFc == null || priceFromFc <= 0) return 0;
  if ((priceUnit === 'PERSON' || priceUnit === 'QUOTA') && guestCount > 0) {
    return priceFromFc * guestCount;
  }
  return priceFromFc;
}

function snippet(text: string | null | undefined, max = 180): string {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

type CatalogKind = 'venue' | 'trade' | 'rental';

type CatalogRow = {
  slug: string;
  kind: CatalogKind;
  title: string;
  category: string;
  city: string | null;
  commune: string | null;
  priceFromFc: number | null;
  estimatedFc: number;
  capacity: number | null;
  travels: boolean | null;
  summary: string;
};

export type EventPlanAiItem = {
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
  capacity?: number | null;
};

export type EventPlanAiResult = {
  summary: string;
  rationale: string;
  warnings: string[];
  estimatedTotalFc: number;
  catalog: { venues: number; trades: number; rentals: number };
  venue: EventPlanAiItem | null;
  services: EventPlanAiItem[];
};

function parseEventType(value: unknown): EventPlanType {
  return typeof value === 'string' && EVENT_PLAN_TYPES.includes(value as EventPlanType)
    ? value as EventPlanType
    : 'private';
}

async function loadCatalog(opts: {
  city: string;
  commune: string;
  dateKey: string;
  guestCount: number;
}): Promise<{
  venues: Array<CatalogRow & { item: EventPlanAiItem }>;
  services: Array<CatalogRow & { item: EventPlanAiItem }>;
}> {
  const cityFilter = allowedCityPrismaFilter(opts.city);
  const communeFilter = opts.commune
    ? { commune: { contains: opts.commune, mode: 'insensitive' as const } }
    : {};

  const [venueRows, serviceRows] = await Promise.all([
    prisma.venueListing.findMany({
      where: { isPublic: true, ...cityFilter, ...communeFilter },
      include: {
        room: { select: { name: true, capacity: true, description: true } },
        tenant: { select: { name: true, vendorProfile: { select: { displayName: true } } } },
        bookings: {
          where: { status: { in: HOLD_BOOKING_STATUSES } },
          select: { eventDate: true, eventEndDate: true },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 80,
    }),
    prisma.serviceOffering.findMany({
      where: { isPublic: true, ...cityFilter, ...communeFilter },
      include: {
        vendorProfile: { select: { displayName: true } },
        tenant: { select: { name: true } },
        bookings: {
          where: { status: { in: HOLD_BOOKING_STATUSES } },
          select: { eventDate: true, eventEndDate: true },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 120,
    }),
  ]);

  const available = <T extends { blockedDates?: unknown; bookings?: Array<{ eventDate: Date; eventEndDate?: Date | null }> }>(
    rows: T[],
  ) => {
    if (!opts.dateKey) return rows;
    return rows.filter((row) => {
      const unavailable = collectUnavailableDates(row.blockedDates, row.bookings);
      return isRangeAvailable(unavailable, opts.dateKey, opts.dateKey);
    });
  };

  const venues = available(venueRows)
    .filter((row) => !opts.guestCount || !row.room.capacity || row.room.capacity >= opts.guestCount)
    .slice(0, 28)
    .map((row) => {
      const extra = parseListingDetails(row.details);
      const photos = parsePhotoUrls(row.photos);
      const orgName = row.tenant.vendorProfile?.displayName || row.tenant.name;
      const estimatedFc = estimateCost(row.priceFromFc, row.priceUnit, opts.guestCount);
      const item: EventPlanAiItem = {
        kind: 'venue',
        slug: row.slug,
        title: row.headline || row.room.name,
        orgName,
        location: [row.neighborhood, row.commune, row.city].filter(Boolean).join(', '),
        coverUrl: coverFromMedia(photos),
        estimatedFc,
        categoryLabel: 'Salle',
        href: `/dashboard/catalogue/salles/${row.slug}`,
        capacity: row.room.capacity,
      };
      const catalog: CatalogRow = {
        slug: row.slug,
        kind: 'venue',
        title: item.title,
        category: 'VENUE',
        city: row.city,
        commune: row.commune,
        priceFromFc: row.priceFromFc,
        estimatedFc,
        capacity: row.room.capacity,
        travels: null,
        summary: snippet(extra.description || row.room.description),
      };
      return { ...catalog, item };
    });

  const services = available(serviceRows).slice(0, 72).map((row) => {
    const extra = parseListingDetails(row.details);
    const photos = parsePhotoUrls(row.photos);
    const rental = isServiceRentalCategory(row.category);
    const estimatedFc = estimateCost(row.priceFromFc, row.priceUnit, opts.guestCount);
    const item: EventPlanAiItem = {
      kind: 'service',
      slug: row.slug,
      title: row.title,
      orgName: row.vendorProfile.displayName || row.tenant.name,
      location: [row.neighborhood, row.commune, row.city].filter(Boolean).join(', '),
      coverUrl: coverFromMedia(photos),
      estimatedFc,
      category: row.category,
      categoryLabel: serviceCategoryLabel(row.category),
      href: rental
        ? `/dashboard/catalogue/locations/${row.slug}`
        : `/dashboard/catalogue/prestataires/${row.slug}`,
    };
    const catalog: CatalogRow = {
      slug: row.slug,
      kind: rental ? 'rental' : 'trade',
      title: row.title,
      category: row.category,
      city: row.city,
      commune: row.commune,
      priceFromFc: row.priceFromFc,
      estimatedFc,
      capacity: null,
      travels: Boolean(row.travels),
      summary: snippet(extra.description || row.description),
    };
    return { ...catalog, item };
  });

  const trades = services.filter((row) => row.kind === 'trade').slice(0, 36);
  const rentals = services.filter((row) => row.kind === 'rental').slice(0, 24);
  return { venues, services: [...trades, ...rentals] };
}

async function askOpenAi(system: string, user: string): Promise<Record<string, unknown>> {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    fail(503, 'La simulation IA n’est pas configurée. Ajoutez OPENAI_API_KEY sur le serveur.');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const payload = await response.json().catch(() => ({})) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || 'OpenAI n’a pas pu préparer la simulation.');
    }
    const raw = payload.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      fail(502, 'Réponse IA invalide.');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as HttpError).status) throw error;
    if ((error as Error).name === 'AbortError') fail(504, 'La simulation IA a mis trop longtemps.');
    fail(502, 'Impossible de joindre OpenAI.');
  } finally {
    clearTimeout(timer);
  }
}

export async function simulateEventPlanAi(userId: string, body: Record<string, unknown>): Promise<EventPlanAiResult> {
  rateLimit(userId);
  const eventType = parseEventType(body.eventType);
  const city = normalizeAllowedCity(body.city) || '';
  const commune = normalizeAllowedCommune(city || undefined, body.commune) || '';
  const guestCount = Number(body.guestCount);
  const guests = Number.isFinite(guestCount) && guestCount > 0 ? Math.round(guestCount) : 0;
  const budgetMaxFc = Number(body.budgetMaxFc);
  const budget = Number.isFinite(budgetMaxFc) && budgetMaxFc > 0 ? Math.round(budgetMaxFc) : 0;
  const dateKey = toDateKey(String(body.eventDate || '')) || '';
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1200) : '';
  const includeVenue = body.includeVenue !== false;
  const includeTrades = body.includeTrades !== false;
  const includeRentals = body.includeRentals !== false;
  const keepVenueSlug = typeof body.keepVenueSlug === 'string' ? body.keepVenueSlug.trim() : '';
  const keepServiceSlugs = Array.isArray(body.keepServiceSlugs)
    ? body.keepServiceSlugs.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
    : [];

  const catalog = await loadCatalog({ city, commune, dateKey, guestCount: guests });
  if (!catalog.venues.length && !catalog.services.length) {
    fail(404, 'Aucune fiche publique ne correspond à ces critères.');
  }

  const compact = [...(includeVenue ? catalog.venues : []), ...catalog.services.filter((row) => {
    if (row.kind === 'trade') return includeTrades;
    if (row.kind === 'rental') return includeRentals;
    return false;
  })].map((row) => ({
    slug: row.slug,
    kind: row.kind,
    title: row.title,
    category: row.category,
    city: row.city,
    commune: row.commune,
    estimatedFc: row.estimatedFc,
    capacity: row.capacity,
    travels: row.travels,
    summary: row.summary,
  }));

  const allowed = new Set(compact.map((row) => row.slug));
  const system = [
    'Tu es l’assistant EventMaster (Kinshasa et Lubumbashi).',
    'Tu ne proposes QUE des fiches dont le slug est dans le catalogue JSON fourni. N’invente jamais de slug, de prix ou de prestataire.',
    'Réponds uniquement en JSON : { "summary": string, "rationale": string, "venueSlug": string|null, "serviceSlugs": string[], "warnings": string[] }.',
    'Choisis au plus 1 salle, 4 métiers et 3 locations, cohérents avec le type d’événement, la ville, la date et le budget.',
    'Si un budget est donné, vise un total estimé inférieur ou égal. Si c’est impossible, explique-le dans warnings.',
    'Préfère des fiches du même quartier / commune quand c’est possible.',
  ].join(' ');

  const user = JSON.stringify({
    brief: {
      eventType,
      city: city || null,
      commune: commune || null,
      guestCount: guests || null,
      budgetMaxFc: budget || null,
      eventDate: dateKey || null,
      prompt: prompt || null,
      includeVenue,
      includeTrades,
      includeRentals,
      keepVenueSlug: keepVenueSlug || null,
      keepServiceSlugs,
    },
    catalog: compact,
  });

  const ai = await askOpenAi(system, user);
  const venueBySlug = new Map(catalog.venues.map((row) => [row.slug, row.item]));
  const serviceBySlug = new Map(catalog.services.map((row) => [row.slug, row.item]));

  const venueSlug = typeof ai.venueSlug === 'string' && allowed.has(ai.venueSlug) ? ai.venueSlug : null;
  const serviceSlugs = Array.isArray(ai.serviceSlugs)
    ? ai.serviceSlugs.filter((value): value is string => typeof value === 'string' && allowed.has(value) && serviceBySlug.has(value))
    : [];

  const venue = includeVenue
    ? (keepVenueSlug && venueBySlug.has(keepVenueSlug)
      ? venueBySlug.get(keepVenueSlug) || null
      : venueSlug ? venueBySlug.get(venueSlug) || null : null)
    : null;
  const uniqueServices: EventPlanAiItem[] = [];
  const seen = new Set<string>();
  for (const slug of [...keepServiceSlugs, ...serviceSlugs]) {
    if (seen.has(slug)) continue;
    const item = serviceBySlug.get(slug);
    if (!item) continue;
    if (item.category && isServiceRentalCategory(item.category) && !includeRentals) continue;
    if (item.category && !isServiceRentalCategory(item.category) && !includeTrades) continue;
    seen.add(slug);
    uniqueServices.push(item);
    if (uniqueServices.length >= 8) break;
  }

  const warnings = Array.isArray(ai.warnings)
    ? ai.warnings.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 6)
    : [];
  if (includeVenue && !venue) warnings.unshift('Aucune salle retenue dans le catalogue disponible.');
  if (!uniqueServices.length) warnings.push('Aucun métier ni location retenu dans le catalogue disponible.');

  const estimatedTotalFc = [venue, ...uniqueServices].reduce((sum, item) => sum + (item?.estimatedFc || 0), 0);
  if (budget && estimatedTotalFc > budget) {
    warnings.push(`Estimation ${estimatedTotalFc.toLocaleString('fr-FR')} FC au-dessus du budget ${budget.toLocaleString('fr-FR')} FC.`);
  }

  return {
    summary: typeof ai.summary === 'string' && ai.summary.trim() ? ai.summary.trim().slice(0, 400) : 'Proposition basée sur le catalogue EventMaster.',
    rationale: typeof ai.rationale === 'string' ? ai.rationale.trim().slice(0, 1200) : '',
    warnings,
    estimatedTotalFc,
    catalog: {
      venues: catalog.venues.length,
      trades: catalog.services.filter((row) => row.kind === 'trade').length,
      rentals: catalog.services.filter((row) => row.kind === 'rental').length,
    },
    venue,
    services: uniqueServices,
  };
}

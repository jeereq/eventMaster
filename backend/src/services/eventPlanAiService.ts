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
  neighborhood: string | null;
  priceFromFc: number | null;
  estimatedFc: number;
  capacity: number | null;
  travels: boolean | null;
  summary: string;
  amenities: string[];
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

export type EventPlanAiStyleId = 'eco' | 'balanced' | 'comfort';

export type EventPlanAiPackage = {
  id: EventPlanAiStyleId;
  label: string;
  blurb: string;
  summary: string;
  rationale: string;
  warnings: string[];
  estimatedTotalFc: number;
  venue: EventPlanAiItem | null;
  services: EventPlanAiItem[];
};

export type EventPlanAiResult = {
  catalog: { venues: number; trades: number; rentals: number; widenedCommune?: boolean };
  packages: EventPlanAiPackage[];
  warnings?: string[];
  criteria?: {
    ambiance?: string;
    moment?: string;
    setting?: string;
    neighborhood?: string;
    budgetMinFc?: number | null;
    wantedCategories?: string[];
    venueAmenities?: string[];
  };
};

const AI_STYLES: Array<{ id: EventPlanAiStyleId; label: string; blurb: string; maxTrades: number; maxRentals: number }> = [
  { id: 'eco', label: 'Économique', blurb: 'Le moins cher qui tient dans l’enveloppe, sans options.', maxTrades: 2, maxRentals: 1 },
  { id: 'balanced', label: 'Équilibré', blurb: 'Répartition proche de votre projet, options si le budget le permet.', maxTrades: 3, maxRentals: 1 },
  { id: 'comfort', label: 'Confort', blurb: 'Le plus complet dans l’enveloppe, options incluses.', maxTrades: 4, maxRentals: 2 },
];

function parseEventType(value: unknown): EventPlanType {
  return typeof value === 'string' && EVENT_PLAN_TYPES.includes(value as EventPlanType)
    ? value as EventPlanType
    : 'private';
}

function scoreVenue(
  amenities: string[],
  opts: { venueAmenities: string[]; setting: string; neighborhood: string },
  neighborhood?: string | null,
): number {
  let score = 0;
  if (opts.venueAmenities.length) {
    score += opts.venueAmenities.filter((id) => amenities.includes(id)).length * 4;
  }
  if (opts.setting === 'outdoor' && amenities.includes('garden')) score += 5;
  if (opts.setting === 'indoor' && amenities.includes('garden')) score -= 1;
  const needle = opts.neighborhood.trim().toLowerCase();
  if (needle && neighborhood && neighborhood.toLowerCase().includes(needle)) score += 6;
  return score;
}

async function loadCatalog(opts: {
  city: string;
  commune: string;
  dateKey: string;
  guestCount: number;
  wantedCategories: string[];
  venueAmenities: string[];
  setting: string;
  neighborhood: string;
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
        neighborhood: row.neighborhood,
        priceFromFc: row.priceFromFc,
        estimatedFc,
        capacity: row.room.capacity,
        travels: null,
        summary: snippet(extra.description || row.room.description),
        amenities: extra.amenities.slice(0, 10),
      };
      return { ...catalog, item, score: scoreVenue(extra.amenities, opts, row.neighborhood) };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...row }) => row);

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
      neighborhood: row.neighborhood,
      priceFromFc: row.priceFromFc,
      estimatedFc,
      capacity: null,
      travels: Boolean(row.travels),
      summary: snippet(extra.description || row.description),
      amenities: extra.amenities.slice(0, 8),
    };
    return { ...catalog, item };
  });

  const preferred = opts.wantedCategories.length
    ? services.filter((row) => opts.wantedCategories.includes(row.category))
    : [];
  const rest = opts.wantedCategories.length
    ? services.filter((row) => !opts.wantedCategories.includes(row.category))
    : services;
  const rankedServices = preferred.length ? [...preferred, ...rest] : rest;

  const trades = rankedServices.filter((row) => row.kind === 'trade').slice(0, 36);
  const rentals = rankedServices.filter((row) => row.kind === 'rental').slice(0, 24);
  return { venues, services: [...trades, ...rentals] };
}

async function askOpenAi(system: string, user: string): Promise<Record<string, unknown>> {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    // Si la clé OpenAI n'est pas définie sur le serveur, basculer proprement sur le moteur heuristique intelligent
    return { packages: [] };
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
        temperature: 0.55,
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
      console.warn('OpenAI API warning:', payload.error?.message);
      return { packages: [] };
    }
    const raw = payload.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { packages: [] };
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    console.warn('Simulation IA fetch fallback to heuristic:', (error as Error)?.message);
    return { packages: [] };
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
  const neighborhood = typeof body.neighborhood === 'string' ? body.neighborhood.trim().slice(0, 80) : '';
  const ambiance = typeof body.ambiance === 'string' ? body.ambiance.trim().slice(0, 32) : '';
  const moment = typeof body.moment === 'string' ? body.moment.trim().slice(0, 32) : '';
  const setting = typeof body.setting === 'string' ? body.setting.trim().slice(0, 32) : '';
  const budgetMinRaw = Number(body.budgetMinFc);
  const budgetMinFc = Number.isFinite(budgetMinRaw) && budgetMinRaw > 0 ? Math.round(budgetMinRaw) : 0;
  const wantedCategories = Array.isArray(body.wantedCategories)
    ? body.wantedCategories.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 12)
    : [];
  const venueAmenities = Array.isArray(body.venueAmenities)
    ? body.venueAmenities.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).slice(0, 10)
    : [];
  const criteria = {
    ambiance: ambiance || undefined,
    moment: moment || undefined,
    setting: setting || undefined,
    neighborhood: neighborhood || undefined,
    budgetMinFc: budgetMinFc || null,
    wantedCategories,
    venueAmenities,
  };
  const catalogOpts = {
    city,
    commune,
    dateKey,
    guestCount: guests,
    wantedCategories,
    venueAmenities,
    setting,
    neighborhood,
  };

  const catalogWarnings: string[] = [];
  let widenedCommune = false;
  let catalog = await loadCatalog(catalogOpts);
  if (!catalog.venues.length && !catalog.services.length && commune) {
    catalog = await loadCatalog({ ...catalogOpts, commune: '' });
    if (catalog.venues.length || catalog.services.length) {
      widenedCommune = true;
      catalogWarnings.push(
        `La commune « ${commune} » n’avait pas assez de fiches publiques : recherche élargie à ${city || 'toute la ville'}.`,
      );
    }
  }
  if (!catalog.venues.length && !catalog.services.length) {
    const where = city || 'Kinshasa / Lubumbashi';
    const communeHint = commune ? ` (${commune})` : '';
    fail(
      404,
      `Aucune salle/presta publique à ${where}${communeHint} — élargissez la commune ou le budget.`,
    );
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
    neighborhood: row.neighborhood,
    estimatedFc: row.estimatedFc,
    capacity: row.capacity,
    travels: row.travels,
    summary: row.summary,
    amenities: row.amenities,
  }));

  const allowed = new Set(compact.map((row) => row.slug));
  const venueBySlug = new Map(catalog.venues.map((row) => [row.slug, row.item]));
  const serviceBySlug = new Map(catalog.services.map((row) => [row.slug, row.item]));
  const venuesPool = includeVenue ? catalog.venues.map((row) => row.item) : [];
  const tradesPool = includeTrades
    ? catalog.services.filter((row) => row.kind === 'trade').map((row) => row.item)
    : [];
  const rentalsPool = includeRentals
    ? catalog.services.filter((row) => row.kind === 'rental').map((row) => row.item)
    : [];

  const system = [
    'Tu es l’assistant EventMaster (Kinshasa et Lubumbashi).',
    'Tu ne proposes QUE des fiches dont le slug est dans le catalogue JSON fourni. N’invente jamais de slug, de prix ou de prestataire.',
    'Réponds uniquement en JSON : { "packages": [ { "id": "eco"|"balanced"|"comfort", "summary": string, "rationale": string, "venueSlug": string|null, "serviceSlugs": string[], "warnings": string[] } ] }.',
    'Propose EXACTEMENT 3 packs distincts : eco (sobre, moins cher), balanced (compromis), comfort (plus complet).',
    'Chaque pack : au plus 1 salle, métiers et locations cohérents. Varie les slugs entre packs quand le catalogue le permet.',
    'Si un budget est donné, chaque pack vise un total estimé inférieur ou égal. Sinon, explique-le dans warnings.',
    'Préfère le même quartier / commune. Si keepVenueSlug est fourni, utilise-le pour les 3 packs.',
    'Si ambiance, moment, intérieur/extérieur, quartier ou prestations souhaitées sont fournis, oriente les packs dessus sans inventer de fiches.',
    'Si un budget min est donné, évite les packs trop en dessous sauf le pack économique.',
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
      ...criteria,
    },
    catalog: compact,
  });

  const ai = await askOpenAi(system, user);
  const rawPackages = Array.isArray(ai.packages) ? ai.packages : [];

  const hydrate = (
    style: typeof AI_STYLES[number],
    venueSlug: string | null,
    serviceSlugs: string[],
    summary: string,
    rationale: string,
    extraWarnings: string[],
  ): EventPlanAiPackage => {
    const venue = includeVenue
      ? (keepVenueSlug && venueBySlug.has(keepVenueSlug)
        ? venueBySlug.get(keepVenueSlug) || null
        : venueSlug && allowed.has(venueSlug) ? venueBySlug.get(venueSlug) || null : null)
      : null;

    const uniqueServices: EventPlanAiItem[] = [];
    const seen = new Set<string>();
    for (const slug of [...keepServiceSlugs, ...serviceSlugs]) {
      if (seen.has(slug) || !allowed.has(slug)) continue;
      const item = serviceBySlug.get(slug);
      if (!item) continue;
      if (item.category && isServiceRentalCategory(item.category) && !includeRentals) continue;
      if (item.category && !isServiceRentalCategory(item.category) && !includeTrades) continue;
      seen.add(slug);
      uniqueServices.push(item);
      if (uniqueServices.length >= 8) break;
    }

    const warnings = extraWarnings.slice(0, 6);
    if (includeVenue && !venue) warnings.unshift('Aucune salle retenue dans le catalogue disponible.');
    if (!uniqueServices.length && (includeTrades || includeRentals)) {
      warnings.push('Aucun métier ni location retenu dans le catalogue disponible.');
    }
    const estimatedTotalFc = [venue, ...uniqueServices].reduce((sum, item) => sum + (item?.estimatedFc || 0), 0);
    if (budget && estimatedTotalFc > budget) {
      warnings.push(`Estimation ${estimatedTotalFc.toLocaleString('fr-FR')} FC au-dessus du budget ${budget.toLocaleString('fr-FR')} FC.`);
    }

    return {
      id: style.id,
      label: style.label,
      blurb: style.blurb,
      summary: summary.trim().slice(0, 400) || `Proposition ${style.label.toLowerCase()} basée sur le catalogue EventMaster.`,
      rationale: rationale.trim().slice(0, 1200),
      warnings,
      estimatedTotalFc,
      venue,
      services: uniqueServices,
    };
  };

  const pickByStyle = <T extends { slug: string; estimatedFc: number }>(
    items: T[],
    style: EventPlanAiStyleId,
    used: Set<string>,
    allowReuse = true,
  ): T | null => {
    const available = items.filter((item) => !used.has(item.slug));
    const pool = available.length ? available : (allowReuse ? items : []);
    if (!pool.length) return null;
    const sorted = [...pool].sort((a, b) => a.estimatedFc - b.estimatedFc);
    if (style === 'eco') return sorted[0];
    if (style === 'comfort') return sorted[sorted.length - 1];
    return sorted[Math.floor((sorted.length - 1) / 2)];
  };

  const heuristicPackage = (style: typeof AI_STYLES[number], usedVenues: Set<string>, usedServices: Set<string>): EventPlanAiPackage => {
    const venue = includeVenue
      ? (keepVenueSlug && venueBySlug.has(keepVenueSlug)
        ? venueBySlug.get(keepVenueSlug) || null
        : pickByStyle(venuesPool, style.id, usedVenues, false))
      : null;
    if (venue) usedVenues.add(venue.slug);

    const services: EventPlanAiItem[] = [];
    let remaining = budget > 0 ? Math.max(0, budget - (venue?.estimatedFc || 0)) : Number.POSITIVE_INFINITY;
    const byCategory = new Map<string, EventPlanAiItem[]>();
    for (const item of [...tradesPool, ...rentalsPool]) {
      const key = item.category || item.slug;
      const list = byCategory.get(key) || [];
      list.push(item);
      byCategory.set(key, list);
    }

    let trades = 0;
    let rentals = 0;
    const groups = [...byCategory.entries()].sort(([a], [b]) => {
      const aw = wantedCategories.includes(a) ? 0 : 1;
      const bw = wantedCategories.includes(b) ? 0 : 1;
      return aw - bw;
    });
    for (const [, group] of groups) {
      const rental = Boolean(group[0]?.category && isServiceRentalCategory(group[0].category));
      if (rental && rentals >= style.maxRentals) continue;
      if (!rental && trades >= style.maxTrades) continue;
      const pick = pickByStyle(group, style.id, usedServices);
      if (!pick) continue;
      const cost = pick.estimatedFc || 0;
      if (budget > 0 && cost > remaining && services.length > 0) continue;
      usedServices.add(pick.slug);
      services.push(pick);
      remaining -= cost;
      if (rental) rentals += 1;
      else trades += 1;
    }

    for (const slug of keepServiceSlugs) {
      if (services.some((item) => item.slug === slug)) continue;
      const item = serviceBySlug.get(slug);
      if (item) services.unshift(item);
    }

    return hydrate(style, venue?.slug || null, services.map((item) => item.slug), '', '', []);
  };

  const usedVenues = new Set<string>();
  const usedServices = new Set<string>();
  const packages = AI_STYLES.map((style, index) => {
    const raw = rawPackages.find((row) => row && typeof row === 'object' && (row as { id?: string }).id === style.id)
      || (rawPackages[index] && typeof rawPackages[index] === 'object' ? rawPackages[index] : null);
    const row = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const venueSlug = typeof row.venueSlug === 'string' ? row.venueSlug : null;
    const serviceSlugs = Array.isArray(row.serviceSlugs)
      ? row.serviceSlugs.filter((value): value is string => typeof value === 'string')
      : [];
    const summary = typeof row.summary === 'string' ? row.summary : '';
    const rationale = typeof row.rationale === 'string' ? row.rationale : '';
    const warnings = Array.isArray(row.warnings)
      ? row.warnings.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      : [];

    let pack = hydrate(style, venueSlug, serviceSlugs, summary, rationale, warnings);
    const empty = !pack.venue && pack.services.length === 0;
    if (empty) {
      pack = heuristicPackage(style, usedVenues, usedServices);
    } else {
      if (pack.venue) usedVenues.add(pack.venue.slug);
      pack.services.forEach((item) => usedServices.add(item.slug));
    }
    return pack;
  });

  if (!keepVenueSlug) {
    const assignedVenues = new Set<string>();
    for (let index = 0; index < packages.length; index += 1) {
      const pack = packages[index];
      if (!pack.venue) continue;
      if (!assignedVenues.has(pack.venue.slug)) {
        assignedVenues.add(pack.venue.slug);
        continue;
      }
      const alt = pickByStyle(venuesPool, pack.id, assignedVenues, false);
      if (!alt) continue;
      assignedVenues.add(alt.slug);
      const estimatedTotalFc = (alt.estimatedFc || 0)
        + pack.services.reduce((sum, item) => sum + (item.estimatedFc || 0), 0);
      packages[index] = {
        ...pack,
        venue: alt,
        estimatedTotalFc,
        warnings: pack.warnings.includes('Salle distincte choisie pour différencier ce pack.')
          ? pack.warnings
          : [...pack.warnings, 'Salle distincte choisie pour différencier ce pack.'],
      };
    }
  }

  if (!packages.some((pack) => pack.venue || pack.services.length > 0)) {
    fail(404, 'Impossible de composer 3 propositions avec le catalogue actuel.');
  }

  if (catalogWarnings.length) {
    for (const pack of packages) {
      pack.warnings = [...catalogWarnings, ...pack.warnings];
    }
  }

  return {
    catalog: {
      venues: catalog.venues.length,
      trades: catalog.services.filter((row) => row.kind === 'trade').length,
      rentals: catalog.services.filter((row) => row.kind === 'rental').length,
      widenedCommune: widenedCommune || undefined,
    },
    packages,
    warnings: catalogWarnings.length ? catalogWarnings : undefined,
    criteria,
  };
}

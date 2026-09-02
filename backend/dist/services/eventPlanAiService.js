"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateEventPlanAi = simulateEventPlanAi;
const db_1 = require("../db");
const listingDetails_1 = require("../utils/listingDetails");
const publicVenue_1 = require("../utils/publicVenue");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const rdcCities_1 = require("../utils/rdcCities");
const eventPlanBrief_1 = require("./eventPlanBrief");
const HOLD_BOOKING_STATUSES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const rateBuckets = new Map();
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
function rateLimit(userId) {
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
function estimateCost(priceFromFc, priceUnit, guestCount) {
    if (priceFromFc == null || priceFromFc <= 0)
        return 0;
    if ((priceUnit === 'PERSON' || priceUnit === 'QUOTA') && guestCount > 0) {
        return priceFromFc * guestCount;
    }
    return priceFromFc;
}
function snippet(text, max = 180) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (value.length <= max)
        return value;
    return `${value.slice(0, max - 1)}…`;
}
const AI_STYLES = [
    { id: 'eco', label: 'Économique', blurb: 'Le moins cher qui tient dans l’enveloppe, sans options.', maxTrades: 2, maxRentals: 1 },
    { id: 'balanced', label: 'Équilibré', blurb: 'Répartition proche de votre brief, options si le budget le permet.', maxTrades: 3, maxRentals: 1 },
    { id: 'comfort', label: 'Confort', blurb: 'Le plus complet dans l’enveloppe, options incluses.', maxTrades: 4, maxRentals: 2 },
];
function parseEventType(value) {
    return typeof value === 'string' && eventPlanBrief_1.EVENT_PLAN_TYPES.includes(value)
        ? value
        : 'private';
}
async function loadCatalog(opts) {
    const cityFilter = (0, rdcCities_1.allowedCityPrismaFilter)(opts.city);
    const communeFilter = opts.commune
        ? { commune: { contains: opts.commune, mode: 'insensitive' } }
        : {};
    const [venueRows, serviceRows] = await Promise.all([
        db_1.prisma.venueListing.findMany({
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
        db_1.prisma.serviceOffering.findMany({
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
    const available = (rows) => {
        if (!opts.dateKey)
            return rows;
        return rows.filter((row) => {
            const unavailable = (0, marketplaceDates_1.collectUnavailableDates)(row.blockedDates, row.bookings);
            return (0, marketplaceDates_1.isRangeAvailable)(unavailable, opts.dateKey, opts.dateKey);
        });
    };
    const venues = available(venueRows)
        .filter((row) => !opts.guestCount || !row.room.capacity || row.room.capacity >= opts.guestCount)
        .slice(0, 28)
        .map((row) => {
        const extra = (0, listingDetails_1.parseListingDetails)(row.details);
        const photos = (0, publicVenue_1.parsePhotoUrls)(row.photos);
        const orgName = row.tenant.vendorProfile?.displayName || row.tenant.name;
        const estimatedFc = estimateCost(row.priceFromFc, row.priceUnit, opts.guestCount);
        const item = {
            kind: 'venue',
            slug: row.slug,
            title: row.headline || row.room.name,
            orgName,
            location: [row.neighborhood, row.commune, row.city].filter(Boolean).join(', '),
            coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
            estimatedFc,
            categoryLabel: 'Salle',
            href: `/dashboard/catalogue/salles/${row.slug}`,
            capacity: row.room.capacity,
        };
        const catalog = {
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
        const extra = (0, listingDetails_1.parseListingDetails)(row.details);
        const photos = (0, publicVenue_1.parsePhotoUrls)(row.photos);
        const rental = (0, publicVenue_1.isServiceRentalCategory)(row.category);
        const estimatedFc = estimateCost(row.priceFromFc, row.priceUnit, opts.guestCount);
        const item = {
            kind: 'service',
            slug: row.slug,
            title: row.title,
            orgName: row.vendorProfile.displayName || row.tenant.name,
            location: [row.neighborhood, row.commune, row.city].filter(Boolean).join(', '),
            coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
            estimatedFc,
            category: row.category,
            categoryLabel: (0, publicVenue_1.serviceCategoryLabel)(row.category),
            href: rental
                ? `/dashboard/catalogue/locations/${row.slug}`
                : `/dashboard/catalogue/prestataires/${row.slug}`,
        };
        const catalog = {
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
async function askOpenAi(system, user) {
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
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
            console.warn('OpenAI API warning:', payload.error?.message);
            return { packages: [] };
        }
        const raw = payload.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { packages: [] };
        }
        return parsed;
    }
    catch (error) {
        console.warn('Simulation IA fetch fallback to heuristic:', error?.message);
        return { packages: [] };
    }
    finally {
        clearTimeout(timer);
    }
}
async function simulateEventPlanAi(userId, body) {
    rateLimit(userId);
    const eventType = parseEventType(body.eventType);
    const city = (0, rdcCities_1.normalizeAllowedCity)(body.city) || '';
    const commune = (0, rdcCities_1.normalizeAllowedCommune)(city || undefined, body.commune) || '';
    const guestCount = Number(body.guestCount);
    const guests = Number.isFinite(guestCount) && guestCount > 0 ? Math.round(guestCount) : 0;
    const budgetMaxFc = Number(body.budgetMaxFc);
    const budget = Number.isFinite(budgetMaxFc) && budgetMaxFc > 0 ? Math.round(budgetMaxFc) : 0;
    const dateKey = (0, marketplaceDates_1.toDateKey)(String(body.eventDate || '')) || '';
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 1200) : '';
    const includeVenue = body.includeVenue !== false;
    const includeTrades = body.includeTrades !== false;
    const includeRentals = body.includeRentals !== false;
    const keepVenueSlug = typeof body.keepVenueSlug === 'string' ? body.keepVenueSlug.trim() : '';
    const keepServiceSlugs = Array.isArray(body.keepServiceSlugs)
        ? body.keepServiceSlugs.filter((value) => typeof value === 'string' && Boolean(value.trim()))
        : [];
    const catalog = await loadCatalog({ city, commune, dateKey, guestCount: guests });
    if (!catalog.venues.length && !catalog.services.length) {
        fail(404, 'Aucune fiche publique ne correspond à ces critères.');
    }
    const compact = [...(includeVenue ? catalog.venues : []), ...catalog.services.filter((row) => {
            if (row.kind === 'trade')
                return includeTrades;
            if (row.kind === 'rental')
                return includeRentals;
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
    const rawPackages = Array.isArray(ai.packages) ? ai.packages : [];
    const hydrate = (style, venueSlug, serviceSlugs, summary, rationale, extraWarnings) => {
        const venue = includeVenue
            ? (keepVenueSlug && venueBySlug.has(keepVenueSlug)
                ? venueBySlug.get(keepVenueSlug) || null
                : venueSlug && allowed.has(venueSlug) ? venueBySlug.get(venueSlug) || null : null)
            : null;
        const uniqueServices = [];
        const seen = new Set();
        for (const slug of [...keepServiceSlugs, ...serviceSlugs]) {
            if (seen.has(slug) || !allowed.has(slug))
                continue;
            const item = serviceBySlug.get(slug);
            if (!item)
                continue;
            if (item.category && (0, publicVenue_1.isServiceRentalCategory)(item.category) && !includeRentals)
                continue;
            if (item.category && !(0, publicVenue_1.isServiceRentalCategory)(item.category) && !includeTrades)
                continue;
            seen.add(slug);
            uniqueServices.push(item);
            if (uniqueServices.length >= 8)
                break;
        }
        const warnings = extraWarnings.slice(0, 6);
        if (includeVenue && !venue)
            warnings.unshift('Aucune salle retenue dans le catalogue disponible.');
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
    const pickByStyle = (items, style, used) => {
        const available = items.filter((item) => !used.has(item.slug));
        const pool = available.length ? available : items;
        if (!pool.length)
            return null;
        const sorted = [...pool].sort((a, b) => a.estimatedFc - b.estimatedFc);
        if (style === 'eco')
            return sorted[0];
        if (style === 'comfort')
            return sorted[sorted.length - 1];
        return sorted[Math.floor((sorted.length - 1) / 2)];
    };
    const heuristicPackage = (style, usedVenues, usedServices) => {
        const venue = includeVenue
            ? (keepVenueSlug && venueBySlug.has(keepVenueSlug)
                ? venueBySlug.get(keepVenueSlug) || null
                : pickByStyle(venuesPool, style.id, usedVenues))
            : null;
        if (venue)
            usedVenues.add(venue.slug);
        const services = [];
        let remaining = budget > 0 ? Math.max(0, budget - (venue?.estimatedFc || 0)) : Number.POSITIVE_INFINITY;
        const byCategory = new Map();
        for (const item of [...tradesPool, ...rentalsPool]) {
            const key = item.category || item.slug;
            const list = byCategory.get(key) || [];
            list.push(item);
            byCategory.set(key, list);
        }
        let trades = 0;
        let rentals = 0;
        for (const group of byCategory.values()) {
            const rental = Boolean(group[0]?.category && (0, publicVenue_1.isServiceRentalCategory)(group[0].category));
            if (rental && rentals >= style.maxRentals)
                continue;
            if (!rental && trades >= style.maxTrades)
                continue;
            const pick = pickByStyle(group, style.id, usedServices);
            if (!pick)
                continue;
            const cost = pick.estimatedFc || 0;
            if (budget > 0 && cost > remaining && services.length > 0)
                continue;
            usedServices.add(pick.slug);
            services.push(pick);
            remaining -= cost;
            if (rental)
                rentals += 1;
            else
                trades += 1;
        }
        for (const slug of keepServiceSlugs) {
            if (services.some((item) => item.slug === slug))
                continue;
            const item = serviceBySlug.get(slug);
            if (item)
                services.unshift(item);
        }
        return hydrate(style, venue?.slug || null, services.map((item) => item.slug), '', '', []);
    };
    const usedVenues = new Set();
    const usedServices = new Set();
    const packages = AI_STYLES.map((style, index) => {
        const raw = rawPackages.find((row) => row && typeof row === 'object' && row.id === style.id)
            || (rawPackages[index] && typeof rawPackages[index] === 'object' ? rawPackages[index] : null);
        const row = raw && typeof raw === 'object' ? raw : {};
        const venueSlug = typeof row.venueSlug === 'string' ? row.venueSlug : null;
        const serviceSlugs = Array.isArray(row.serviceSlugs)
            ? row.serviceSlugs.filter((value) => typeof value === 'string')
            : [];
        const summary = typeof row.summary === 'string' ? row.summary : '';
        const rationale = typeof row.rationale === 'string' ? row.rationale : '';
        const warnings = Array.isArray(row.warnings)
            ? row.warnings.filter((value) => typeof value === 'string' && value.trim().length > 0)
            : [];
        let pack = hydrate(style, venueSlug, serviceSlugs, summary, rationale, warnings);
        const empty = !pack.venue && pack.services.length === 0;
        if (empty) {
            pack = heuristicPackage(style, usedVenues, usedServices);
        }
        else {
            if (pack.venue)
                usedVenues.add(pack.venue.slug);
            pack.services.forEach((item) => usedServices.add(item.slug));
        }
        return pack;
    });
    if (!packages.some((pack) => pack.venue || pack.services.length > 0)) {
        fail(404, 'Impossible de composer 3 propositions avec le catalogue actuel.');
    }
    return {
        catalog: {
            venues: catalog.venues.length,
            trades: catalog.services.filter((row) => row.kind === 'trade').length,
            rentals: catalog.services.filter((row) => row.kind === 'rental').length,
        },
        packages,
    };
}

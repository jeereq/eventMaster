"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SERVICE_CATEGORY_VALUES = exports.EVENT_PLAN_TYPES = void 0;
exports.parseEventPlanInput = parseEventPlanInput;
exports.serializeBriefPayload = serializeBriefPayload;
const client_1 = require("@prisma/client");
exports.EVENT_PLAN_TYPES = [
    'wedding',
    'birthday',
    'corporate',
    'gala',
    'religious',
    'private',
    'shooting',
];
exports.SERVICE_CATEGORY_VALUES = Object.values(client_1.ServiceCategory);
const AMENITY_IDS = new Set([
    'wifi', 'parking', 'ac', 'generator', 'sound', 'kitchen', 'stage', 'cloakroom',
    'accessible', 'garden', 'security', 'projector', 'toilets', 'lighting', 'bar',
]);
function parseEventType(value) {
    return typeof value === 'string' && exports.EVENT_PLAN_TYPES.includes(value)
        ? value
        : null;
}
function parseEnum(value, allowed, fallback) {
    return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}
function parseMargin(value) {
    const n = Number(value);
    return n === 0 || n === 5 || n === 10 ? n : 5;
}
function parseMoney(value) {
    const n = Number(typeof value === 'string' ? value.replace(/\s/g, '') : value);
    return Number.isFinite(n) ? Math.round(n) : 0;
}
function parseSlots(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const raw = value;
    const slots = {};
    for (const category of exports.SERVICE_CATEGORY_VALUES) {
        const item = raw[category];
        slots[category] = item === 'required' || item === 'optional' || item === 'excluded' ? item : 'excluded';
    }
    return slots;
}
function parseShares(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const next = {};
    for (const [key, raw] of Object.entries(value)) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0)
            continue;
        next[key] = n > 1 ? n : n * 100;
    }
    return Object.keys(next).length ? next : null;
}
function parseLock(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const raw = value;
    const kind = raw.kind === 'venue' || raw.kind === 'service' ? raw.kind : null;
    const slug = typeof raw.slug === 'string' ? raw.slug.trim().toLowerCase() : '';
    if (!kind || !slug)
        return null;
    const category = typeof raw.category === 'string' && exports.SERVICE_CATEGORY_VALUES.includes(raw.category)
        ? raw.category
        : undefined;
    return { kind, slug, category };
}
function parseCategories(value) {
    if (!Array.isArray(value))
        return null;
    const unique = [];
    for (const item of value) {
        if (typeof item === 'string' && exports.SERVICE_CATEGORY_VALUES.includes(item) && !unique.includes(item)) {
            unique.push(item);
        }
    }
    return unique;
}
function parseEventPlanInput(body) {
    const eventType = parseEventType(body.eventType);
    if (!eventType) {
        throw Object.assign(new Error('Choisissez un type d’événement.'), { status: 400 });
    }
    const budgetMaxFc = parseMoney(body.budgetMaxFc ?? body.budgetFc);
    const budgetMinFc = Math.max(0, parseMoney(body.budgetMinFc));
    if (!Number.isFinite(budgetMaxFc) || budgetMaxFc < 50000) {
        throw Object.assign(new Error('Indiquez un budget d’au moins 50 000 FC.'), { status: 400 });
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
    const includeVenue = parseEnum(body.includeVenue, ['yes', 'no', 'if_fits'], 'yes');
    const slots = parseSlots(body.slots);
    const shares = parseShares(body.shares) || {};
    const venueAmenities = Array.isArray(body.venueAmenities)
        ? body.venueAmenities.filter((id) => typeof id === 'string' && AMENITY_IDS.has(id)).slice(0, 8)
        : [];
    const flexSlots = Array.isArray(body.flexSlots)
        ? body.flexSlots.filter((item) => typeof item === 'string' && exports.SERVICE_CATEGORY_VALUES.includes(item))
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
        slots: slots || {},
        shares,
        favoriteMode: parseEnum(body.favoriteMode, ['bonus', 'force', 'ignore'], 'bonus'),
        matchMode: parseEnum(body.matchMode, ['exact', 'widen'], 'widen'),
        missingStrategy: parseEnum(body.missingStrategy, ['gap', 'reallocate', 'widen_city'], 'reallocate'),
        distinctVenues: body.distinctVenues !== false,
        venueAmenities,
        amenityMode: parseEnum(body.amenityMode, ['preferred', 'blocking'], 'preferred'),
        lock: parseLock(body.lock),
        flexSlots,
        legacyCategories: slots ? null : parseCategories(body.categories),
    };
}
function serializeBriefPayload(input) {
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

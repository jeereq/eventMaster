"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_PLAN_TYPES = void 0;
exports.buildEventPlanProposals = buildEventPlanProposals;
const db_1 = require("../db");
const listingDetails_1 = require("../utils/listingDetails");
const publicVenue_1 = require("../utils/publicVenue");
const rdcCities_1 = require("../utils/rdcCities");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const eventPlanBrief_1 = require("./eventPlanBrief");
Object.defineProperty(exports, "EVENT_PLAN_TYPES", { enumerable: true, get: function () { return eventPlanBrief_1.EVENT_PLAN_TYPES; } });
const EVENT_PACKS = {
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
            { category: 'RENTAL_CLOTHING_WOMEN', share: 0.05 },
            { category: 'RENTAL_CAR', share: 0.05 },
        ],
    },
    birthday: {
        venueShare: 0.4,
        required: [
            { category: 'CATERING', share: 0.28 },
            { category: 'DJ', share: 0.14 },
            { category: 'DECORATION', share: 0.1 },
        ],
        optional: [{ category: 'PHOTOGRAPHY', share: 0.08 }, { category: 'RENTAL_CLOTHING_CHILD', share: 0.06 }],
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
            { category: 'RENTAL_CLOTHING_MEN', share: 0.05 },
            { category: 'RENTAL_CLOTHING_WOMEN', share: 0.05 },
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
const STYLE_VENUE_FACTOR = {
    cheap: 0.78,
    balanced: 1,
    comfort: 1.22,
};
const HOLD_BOOKING_STATUSES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
function formatFc(amount) {
    return `${Math.round(amount).toLocaleString('fr-FR')} FC`;
}
function estimateCost(priceFromFc, priceUnit, guestCount) {
    if (priceFromFc == null || priceFromFc <= 0)
        return null;
    if ((priceUnit === 'PERSON' || priceUnit === 'QUOTA') && guestCount > 0) {
        return priceFromFc * guestCount;
    }
    return priceFromFc;
}
function eventMatch(details, eventType) {
    const types = (0, listingDetails_1.parseListingDetails)(details).eventTypes;
    if (!types.length)
        return 'unknown';
    return types.includes(eventType) ? 'exact' : 'no';
}
function amenityScore(details, wanted) {
    if (!wanted.length)
        return 0;
    const have = new Set((0, listingDetails_1.parseListingDetails)(details).amenities);
    return wanted.reduce((sum, id) => sum + (have.has(id) ? 1 : 0), 0);
}
function hasAllAmenities(details, wanted) {
    if (!wanted.length)
        return true;
    const have = new Set((0, listingDetails_1.parseListingDetails)(details).amenities);
    return wanted.every((id) => have.has(id));
}
function sortCandidates(items, budget, style, favoriteMode) {
    return items.slice().sort((a, b) => {
        if (favoriteMode === 'force') {
            const fav = Number(b.favorite) - Number(a.favorite);
            if (fav)
                return fav;
        }
        const amenities = b.amenityScore - a.amenityScore;
        if (amenities)
            return amenities;
        if (style === 'cheap') {
            const cost = a.cost - b.cost;
            if (cost)
                return cost;
        }
        else if (style === 'comfort') {
            const cost = b.cost - a.cost;
            if (cost)
                return cost;
        }
        else {
            const target = budget * 0.85;
            const diff = Math.abs(a.cost - target) - Math.abs(b.cost - target);
            if (diff)
                return diff;
        }
        const match = Number(b.match === 'exact') - Number(a.match === 'exact');
        if (match)
            return match;
        if (favoriteMode === 'ignore')
            return 0;
        return Number(b.favorite) - Number(a.favorite);
    });
}
function pickForBudget(items, budget, style, excludeSlugs, favoriteMode) {
    const affordable = items.filter((item) => item.cost <= budget);
    if (!affordable.length)
        return null;
    const fresh = affordable.filter((item) => !excludeSlugs.has(item.slug));
    const pool = fresh.length ? affordable.filter((item) => !excludeSlugs.has(item.slug)) : affordable;
    if (favoriteMode === 'force') {
        const favorites = pool.filter((item) => item.favorite);
        const forced = sortCandidates(favorites, budget, style, favoriteMode)[0];
        if (forced)
            return { item: forced, reused: excludeSlugs.has(forced.slug) };
    }
    const picked = sortCandidates(pool, budget, style, favoriteMode)[0];
    if (!picked)
        return null;
    return { item: picked, reused: excludeSlugs.has(picked.slug) };
}
function missingReason(pool, budget, label) {
    if (!pool.length)
        return `Aucune offre « ${label} » pour ce type d’événement.`;
    if (!pool.some((item) => item.cost <= budget)) {
        return `Aucune offre « ${label} » sous ${formatFc(budget)}.`;
    }
    return `Aucune autre offre « ${label} » pour ce pack.`;
}
function serializeVenue(listing, cost, extras) {
    const photos = (0, publicVenue_1.parsePhotoUrls)(listing.photos);
    return {
        kind: 'venue',
        slug: listing.slug,
        title: listing.headline || listing.room.name,
        orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
        city: listing.city,
        location: [listing.neighborhood, listing.commune, listing.city].filter(Boolean).join(', '),
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        priceFromFc: listing.priceFromFc,
        priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(listing.priceUnit),
        estimatedFc: cost,
        capacity: listing.room.capacity,
        href: `/dashboard/catalogue/salles/${listing.slug}`,
        favorite: listing.favorite,
        match: listing.match,
        reused: Boolean(extras?.reused),
        alternatives: [],
    };
}
function serializeService(offering, cost, extras) {
    const photos = (0, publicVenue_1.parsePhotoUrls)(offering.photos);
    return {
        kind: 'service',
        slug: offering.slug,
        title: offering.title,
        category: offering.category,
        categoryLabel: (0, publicVenue_1.serviceCategoryLabel)(offering.category),
        orgName: offering.vendorProfile.displayName || offering.tenant.name,
        city: offering.city,
        location: [offering.neighborhood, offering.commune, offering.city].filter(Boolean).join(', '),
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        priceFromFc: offering.priceFromFc,
        priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(offering.priceUnit),
        estimatedFc: cost,
        href: `/dashboard/catalogue/prestataires/${offering.slug}`,
        favorite: offering.favorite,
        match: offering.match,
        reused: Boolean(extras?.reused),
        alternatives: [],
    };
}
function attachAlternatives(serialized, pool, budget, style, serialize, exclude, favoriteMode, limit = 3) {
    const alternatives = sortCandidates(pool.filter((item) => item.cost <= budget && item.slug !== serialized.slug && !exclude.has(item.slug)), budget, style, favoriteMode)
        .slice(0, limit)
        .map((item) => ({ ...serialize(item, item.cost), alternatives: [] }));
    return { ...serialized, alternatives };
}
function templateShare(eventType, key) {
    const template = EVENT_PACKS[eventType];
    if (key === 'venue')
        return template.venueShare * 100;
    const slot = [...template.required, ...template.optional].find((item) => item.category === key);
    return (slot?.share || 0.08) * 100;
}
function resolveSlots(input) {
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
    return Object.entries(input.slots)
        .filter(([, priority]) => priority !== 'excluded')
        .map(([category, priority]) => ({
        category,
        share: (input.shares[category] || templateShare(input.eventType, category)) / 100,
        required: priority === 'required',
        flex: input.flexSlots.includes(category),
    }));
}
function resolveVenueShare(input, serviceSlots) {
    if (input.includeVenue === 'no')
        return 0;
    if (input.shares.venue != null)
        return input.shares.venue / 100;
    const template = EVENT_PACKS[input.eventType].venueShare;
    const raw = [template, ...serviceSlots.map((slot) => slot.share)];
    const total = raw.reduce((sum, value) => sum + value, 0) || 1;
    return template / total;
}
function renormalizeShares(venueShare, slots) {
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
};
const offeringInclude = {
    vendorProfile: { select: { displayName: true } },
    tenant: { select: { name: true } },
    bookings: {
        where: { status: { in: HOLD_BOOKING_STATUSES } },
        select: { eventDate: true, eventEndDate: true },
    },
};
async function buildEventPlanProposals(body) {
    const input = (0, eventPlanBrief_1.parseEventPlanInput)(body);
    const city = (0, rdcCities_1.normalizeAllowedCity)(input.city) || '';
    const commune = city ? ((0, rdcCities_1.normalizeAllowedCommune)(city, input.commune) || '') : '';
    const guests = input.guestCount;
    const favoriteVenues = new Set((body.favoriteSlugs || []).filter((item) => item.kind === 'venue').map((item) => item.slug));
    const favoriteServices = new Set((body.favoriteSlugs || []).filter((item) => item.kind === 'service').map((item) => item.slug));
    const relaxed = {};
    const serviceSlotsRaw = resolveSlots(input);
    const { venueShare, slots: serviceSlots } = renormalizeShares(resolveVenueShare(input, serviceSlotsRaw), serviceSlotsRaw);
    const loadCatalog = async (cityFilter) => {
        const [listings, offerings] = await Promise.all([
            db_1.prisma.venueListing.findMany({
                where: {
                    isPublic: true,
                    ...(cityFilter ? { city: cityFilter } : {}),
                    ...(guests ? { room: { capacity: { gte: guests } } } : {}),
                },
                include: listingInclude,
                take: 400,
            }),
            db_1.prisma.serviceOffering.findMany({
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
    const rankVenues = (rows, opts) => (rows.flatMap((listing) => {
        if (opts.commune && String(listing.commune || '').toLowerCase() !== opts.commune.toLowerCase())
            return [];
        if (opts.date && dateKey) {
            const unavailable = (0, marketplaceDates_1.collectUnavailableDates)(listing.blockedDates, listing.bookings);
            if (!(0, marketplaceDates_1.isRangeAvailable)(unavailable, dateKey, dateKey))
                return [];
        }
        const match = eventMatch(listing.details, input.eventType);
        if (opts.type === 'strict' && match !== 'exact')
            return [];
        if (opts.type === 'unknown' && match === 'no')
            return [];
        if (opts.amenities && input.amenityMode === 'blocking' && !hasAllAmenities(listing.details, input.venueAmenities))
            return [];
        const cost = estimateCost(listing.priceFromFc, listing.priceUnit, guests);
        if (cost == null)
            return [];
        return [{
                ...listing,
                cost,
                match: match === 'no' ? 'unknown' : match,
                favorite: input.favoriteMode === 'ignore' ? false : favoriteVenues.has(listing.slug),
                amenityScore: input.venueAmenities.length ? amenityScore(listing.details, input.venueAmenities) : 0,
            }];
    }));
    const rankServices = (rows, opts) => (rows.flatMap((offering) => {
        if (opts.commune && String(offering.commune || '').toLowerCase() !== opts.commune.toLowerCase())
            return [];
        if (opts.date && dateKey) {
            const unavailable = (0, marketplaceDates_1.collectUnavailableDates)(offering.blockedDates, offering.bookings);
            if (!(0, marketplaceDates_1.isRangeAvailable)(unavailable, dateKey, dateKey))
                return [];
        }
        const match = eventMatch(offering.details, input.eventType);
        if (opts.type === 'strict' && match !== 'exact')
            return [];
        if (opts.type === 'unknown' && match === 'no')
            return [];
        const cost = estimateCost(offering.priceFromFc, offering.priceUnit, guests);
        if (cost == null)
            return [];
        return [{
                ...offering,
                cost,
                match: match === 'no' ? 'unknown' : match,
                favorite: input.favoriteMode === 'ignore' ? false : favoriteServices.has(offering.slug),
                amenityScore: 0,
            }];
    }));
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
    const styles = [
        { id: 'eco', label: 'Économique', style: 'cheap', blurb: 'Le moins cher qui tient dans l’enveloppe, sans options.' },
        { id: 'balanced', label: 'Équilibré', style: 'balanced', blurb: 'Répartition proche de votre brief, options si le budget le permet.' },
        { id: 'comfort', label: 'Confort', style: 'comfort', blurb: 'Le plus complet dans l’enveloppe, options incluses.' },
    ];
    const usedVenueSlugs = new Set();
    const usedServiceSlugs = new Set();
    const envelope = input.spendableFc;
    const favoriteMode = input.favoriteMode;
    const packages = styles.map((style) => {
        const missing = [];
        const notes = [];
        const items = [];
        let total = 0;
        const skippedRequired = [];
        const addVenue = (requiredVenue) => {
            if (input.lock?.kind === 'venue') {
                const locked = rankedVenues.find((item) => item.slug === input.lock?.slug);
                if (locked && locked.cost <= envelope) {
                    if (input.distinctVenues)
                        usedVenueSlugs.add(locked.slug);
                    const serialized = attachAlternatives(serializeVenue(locked, locked.cost), rankedVenues, envelope, style.style, (item, cost) => serializeVenue(item, cost), new Set(), favoriteMode);
                    items.push(serialized);
                    total += locked.cost;
                    notes.push('Salle figée depuis votre relance.');
                    return;
                }
                notes.push('La salle figée n’est plus disponible dans l’enveloppe.');
            }
            const venueBudget = Math.min(envelope, Math.round(envelope * venueShare * STYLE_VENUE_FACTOR[style.style]));
            const venuePick = pickForBudget(rankedVenues, venueBudget, style.style, input.distinctVenues ? usedVenueSlugs : new Set(), favoriteMode);
            if (venuePick) {
                if (input.distinctVenues)
                    usedVenueSlugs.add(venuePick.item.slug);
                const serialized = attachAlternatives(serializeVenue(venuePick.item, venuePick.item.cost, { reused: venuePick.reused }), rankedVenues, venueBudget, style.style, (item, cost) => serializeVenue(item, cost), new Set(), favoriteMode);
                items.push(serialized);
                total += venuePick.item.cost;
                if (venuePick.reused)
                    notes.push('Même salle qu’un autre pack : pas d’alternative dans le budget.');
                if (venuePick.item.favorite)
                    notes.push('Salle prise parmi vos favoris.');
            }
            else if (requiredVenue) {
                missing.push({
                    slot: 'venue',
                    label: 'Salle',
                    reason: missingReason(rankedVenues, venueBudget, 'Salle'),
                });
            }
        };
        if (input.includeVenue === 'yes')
            addVenue(true);
        else if (input.includeVenue === 'if_fits')
            addVenue(false);
        const addSlot = (slot, requiredSlot) => {
            if (input.lock?.kind === 'service' && (input.lock.category === slot.category || (!input.lock.category && items.every((item) => item.kind !== 'service' || item.category !== slot.category)))) {
                const locked = rankedServices.find((item) => item.slug === input.lock?.slug && item.category === slot.category);
                if (locked && locked.cost <= envelope - total) {
                    usedServiceSlugs.add(locked.slug);
                    items.push(attachAlternatives(serializeService(locked, locked.cost), rankedServices.filter((service) => service.category === slot.category), envelope - total, style.style, (item, cost) => serializeService(item, cost), new Set(items.filter((item) => item.kind === 'service').map((item) => item.slug)), favoriteMode));
                    total += locked.cost;
                    notes.push(`${(0, publicVenue_1.serviceCategoryLabel)(slot.category)} : ligne figée.`);
                    return;
                }
            }
            const remaining = Math.max(0, envelope - total);
            if (remaining <= 0) {
                if (requiredSlot) {
                    missing.push({
                        slot: slot.category,
                        label: (0, publicVenue_1.serviceCategoryLabel)(slot.category),
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
                        label: (0, publicVenue_1.serviceCategoryLabel)(slot.category),
                        reason: missingReason(pool, cap > 0 ? cap : remaining, (0, publicVenue_1.serviceCategoryLabel)(slot.category)),
                    });
                    skippedRequired.push(slot);
                }
                return;
            }
            usedServiceSlugs.add(picked.item.slug);
            const packExclude = new Set(items.filter((item) => item.kind === 'service').map((item) => item.slug));
            items.push(attachAlternatives(serializeService(picked.item, picked.item.cost, { reused: picked.reused }), pool, remaining, style.style, (item, cost) => serializeService(item, cost), packExclude, favoriteMode));
            total += picked.item.cost;
            if (picked.reused) {
                notes.push(`${(0, publicVenue_1.serviceCategoryLabel)(slot.category)} : même prestataire qu’un autre pack.`);
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
                if (remaining <= minKeep)
                    return;
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
            const reservedFc = Math.max(0, input.budgetMaxFc - envelope);
            notes.push(`Marge de sécurité ${input.marginPct} % = ${formatFc(reservedFc)} mis de côté · enveloppe utile ${formatFc(envelope)}.`);
        }
        if (!missing.length && leftoverFc > 0) {
            notes.push(`Reste ${formatFc(leftoverFc)} à réallouer ou à garder en marge.`);
        }
        if (relaxed.city)
            notes.push('Ville élargie faute de catalogue local.');
        if (relaxed.commune)
            notes.push('Commune élargie pour trouver des offres.');
        if (relaxed.availability)
            notes.push('Date ignorée : trop peu d’offres disponibles ce jour-là.');
        if (relaxed.eventType)
            notes.push('Type d’événement élargi pour remplir le pack.');
        const venueItem = items.find((item) => item.kind === 'venue') || null;
        const serviceItems = items.filter((item) => item.kind === 'service');
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
            required: serviceSlots.filter((slot) => slot.required).map((slot) => ({ category: slot.category, label: (0, publicVenue_1.serviceCategoryLabel)(slot.category) })),
            optional: serviceSlots.filter((slot) => !slot.required).map((slot) => ({ category: slot.category, label: (0, publicVenue_1.serviceCategoryLabel)(slot.category) })),
        },
        packages,
        catalog: {
            venues: rankedVenues.length,
            services: rankedServices.length,
        },
    };
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicVenues = listPublicVenues;
exports.getPublicVenue = getPublicVenue;
exports.createVenueInquiry = createVenueInquiry;
exports.upsertRoomListing = upsertRoomListing;
exports.listPublicServices = listPublicServices;
exports.getPublicService = getPublicService;
exports.getPublicVendor = getPublicVendor;
exports.createServiceInquiry = createServiceInquiry;
exports.listMyServices = listMyServices;
exports.upsertService = upsertService;
exports.deleteService = deleteService;
exports.listMyInquiries = listMyInquiries;
exports.updateInquiryStatus = updateInquiryStatus;
exports.saveVendorOnboarding = saveVendorOnboarding;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const notificationService_1 = require("../services/notificationService");
const slug_1 = require("../utils/slug");
const marketplaceNotifyCopy_1 = require("../utils/marketplaceNotifyCopy");
const publicVenue_1 = require("../utils/publicVenue");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const listingDetails_1 = require("../utils/listingDetails");
const marketplaceFeedController_1 = require("./marketplaceFeedController");
const client_1 = require("@prisma/client");
const planFeaturesService_1 = require("../services/planFeaturesService");
const platformNotificationService_1 = require("../services/platformNotificationService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const rdcCities_1 = require("../utils/rdcCities");
const platformSettingsService_1 = require("../services/platformSettingsService");
function enabledMarketplaceCityNames() {
    return (0, platformSettingsService_1.sanitizeEnabledCities)((0, platformSettingsService_1.loadPlatformSettings)().enabledCities).filter((city) => city === 'Kinshasa' || city === 'Lubumbashi');
}
function cityNotEnabledError(cityName) {
    const enabled = enabledMarketplaceCityNames();
    if (enabled.includes(cityName))
        return null;
    const list = enabled.join(' ou ') || 'une ville active';
    return `${cityName} n’est pas une ville active. Choisissez ${list}.`;
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
async function resolveInquirer(req) {
    if (!req.user?.id)
        return null;
    return db_1.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true, email: true, phone: true },
    });
}
function inquiryIdentity(account, body) {
    const fromName = String(body.name || account.name || '').trim().slice(0, 120) || account.email;
    const fromPhone = body.phone ? String(body.phone).trim().slice(0, 40) : account.phone;
    return {
        fromName,
        fromEmail: account.email.trim().toLowerCase(),
        fromPhone: fromPhone || null,
    };
}
async function resolveLinkedEventId(req, eventId) {
    if (!eventId || !req.user?.tenantId)
        return null;
    const event = await db_1.prisma.event.findFirst({
        where: { id: String(eventId), tenantId: req.user.tenantId },
        select: { id: true },
    });
    return event?.id || null;
}
function toPublicVenue(listing) {
    const photos = (0, publicVenue_1.parsePhotoUrls)(listing.photos);
    const extra = (0, listingDetails_1.parseListingDetails)(listing.details);
    return {
        slug: listing.slug,
        name: listing.room.name,
        headline: listing.headline || listing.room.name,
        description: extra.description || listing.room.description,
        city: listing.city,
        commune: listing.commune || null,
        neighborhood: listing.neighborhood || null,
        address: listing.address || listing.room.location,
        floor: listing.room.floor,
        capacity: listing.room.capacity,
        roomType: listing.room.roomType,
        latitude: listing.latitude,
        longitude: listing.longitude,
        priceFromFc: listing.priceFromFc,
        priceUnit: listing.priceUnit,
        priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(listing.priceUnit),
        quotaMin: listing.quotaMin ?? null,
        quotaMax: listing.quotaMax ?? null,
        photos,
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        publishedAt: listing.publishedAt,
        orgName: listing.tenant.vendorProfile?.displayName || listing.tenant.name,
        orgSlug: listing.tenant.vendorProfile?.slug || null,
        orgCity: listing.tenant.vendorProfile?.city || listing.city,
        layoutPreview: (0, publicVenue_1.sanitizeLayoutBlueprint)(listing.room.layoutBlueprint),
        blockedDates: (0, marketplaceDates_1.parseBlockedDates)(listing.blockedDates),
        bookedDates: (0, marketplaceDates_1.collectUnavailableDates)([], listing.bookings),
        unavailableDates: (0, marketplaceDates_1.collectUnavailableDates)(listing.blockedDates, listing.bookings),
        details: extra,
    };
}
function readGeoQuery(req) {
    const lat = Number.parseFloat(String(req.query.lat || ''));
    const lng = Number.parseFloat(String(req.query.lng || ''));
    const rawRadius = Number.parseFloat(String(req.query.radiusKm || ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(rawRadius) || rawRadius <= 0) {
        return null;
    }
    return { lat, lng, radiusKm: Math.min(80, Math.max(0.5, rawRadius)) };
}
function publicWithDistance(rows, geo, toPublic) {
    const mapped = rows.map((row) => {
        const lat = row.latitude ?? null;
        const lng = row.longitude ?? null;
        const distanceKm = geo && lat != null && lng != null
            ? (0, marketplaceDates_1.haversineKm)(geo.lat, geo.lng, lat, lng)
            : null;
        return { row, distanceKm };
    });
    const filtered = geo
        ? mapped.filter((entry) => entry.distanceKm != null && entry.distanceKm <= geo.radiusKm)
        : mapped;
    if (geo) {
        filtered.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }
    return filtered.flatMap(({ row, distanceKm }) => {
        try {
            return [{
                    ...toPublic(row),
                    distanceKm: distanceKm != null ? Math.round(distanceKm * 10) / 10 : null,
                }];
        }
        catch (error) {
            console.error('publicWithDistance: fiche ignorée', error);
            return [];
        }
    });
}
function readStreetQuery(req) {
    return typeof req.query.street === 'string' ? req.query.street.trim() : '';
}
function readPriceRange(req) {
    const minPrice = Number.parseInt(String(req.query.minPrice || ''), 10);
    const maxPrice = Number.parseInt(String(req.query.maxPrice || ''), 10);
    const filter = {};
    if (Number.isFinite(minPrice) && minPrice > 0)
        filter.gte = minPrice;
    if (Number.isFinite(maxPrice) && maxPrice > 0)
        filter.lte = maxPrice;
    return Object.keys(filter).length ? filter : null;
}
function readAvailabilityRange(req) {
    const from = (0, marketplaceDates_1.toDateKey)(String(req.query.availableFrom || ''));
    const to = (0, marketplaceDates_1.toDateKey)(String(req.query.availableTo || ''));
    if (!from && !to)
        return null;
    const start = from || to;
    const end = to || from;
    return start <= end ? { from: start, to: end } : { from: end, to: start };
}
function filterByAvailability(rows, range) {
    if (!range)
        return rows;
    return rows.filter((row) => {
        const unavailable = (0, marketplaceDates_1.collectUnavailableDates)(row.blockedDates, row.bookings);
        return (0, marketplaceDates_1.isRangeAvailable)(unavailable, range.from, range.to);
    });
}
function publishLocationError(city, commune, neighborhood, latitude, longitude) {
    const cityName = (0, rdcCities_1.normalizeAllowedCity)(city);
    if (cityName === null)
        return 'La ville doit être Kinshasa ou Lubumbashi.';
    if (!cityName)
        return 'Choisissez une ville active pour publier.';
    const blocked = cityNotEnabledError(cityName);
    if (blocked)
        return blocked;
    const communeName = (0, rdcCities_1.normalizeAllowedCommune)(cityName, commune);
    if (communeName === null)
        return `La commune doit appartenir à ${cityName}.`;
    if (!communeName)
        return 'La commune est requise pour publier.';
    if (!String(neighborhood || '').trim())
        return 'Le quartier est requis pour publier.';
    const lat = latitude != null && latitude !== '' ? Number(latitude) : NaN;
    const lng = longitude != null && longitude !== '' ? Number(longitude) : NaN;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return 'Placez la position GPS sur la carte pour publier.';
    }
    if (!(0, rdcCities_1.pointInCityBounds)(lat, lng, cityName)) {
        return `Placez la position GPS dans le cadre de ${cityName}.`;
    }
    return null;
}
function normalizeListingPlace(city, commune, neighborhood) {
    const cityName = (0, rdcCities_1.normalizeAllowedCity)(city);
    if (cityName === null) {
        return { error: 'La ville doit être Kinshasa ou Lubumbashi.' };
    }
    if (cityName) {
        const blocked = cityNotEnabledError(cityName);
        if (blocked)
            return { error: blocked };
    }
    const communeName = cityName
        ? (0, rdcCities_1.normalizeAllowedCommune)(cityName, commune)
        : (String(commune || '').trim() ? null : '');
    if (communeName === null) {
        return { error: cityName ? `La commune doit appartenir à ${cityName}.` : 'Choisissez d’abord Kinshasa ou Lubumbashi.' };
    }
    return {
        city: cityName || null,
        commune: communeName || null,
        neighborhood: String(neighborhood || '').trim() || null,
    };
}
function parseOptionalInt(value) {
    if (value == null || value === '')
        return null;
    const n = Number.parseInt(String(value), 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
}
const HOLD_BOOKING_STATUSES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
const listingInclude = {
    room: true,
    tenant: {
        select: {
            name: true,
            branding: true,
            vendorProfile: { select: { displayName: true, city: true, slug: true } },
        },
    },
    bookings: {
        where: { status: { in: HOLD_BOOKING_STATUSES } },
        select: { eventDate: true, eventEndDate: true },
    },
};
async function listPublicVenues(req, res) {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
        const commune = typeof req.query.commune === 'string' ? req.query.commune.trim() : '';
        const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim() : '';
        const street = readStreetQuery(req);
        const roomType = typeof req.query.roomType === 'string' ? req.query.roomType.trim() : '';
        const minCapacity = Number.parseInt(String(req.query.minCapacity || ''), 10);
        const maxCapacity = Number.parseInt(String(req.query.maxCapacity || ''), 10);
        const priceRange = readPriceRange(req);
        const availability = readAvailabilityRange(req);
        const roomFilter = {};
        const allowedTypes = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
        if (roomType && allowedTypes.includes(roomType)) {
            roomFilter.roomType = roomType;
        }
        if (Number.isFinite(minCapacity) && minCapacity > 0) {
            roomFilter.capacity = { ...roomFilter.capacity, gte: minCapacity };
        }
        if (Number.isFinite(maxCapacity) && maxCapacity > 0) {
            roomFilter.capacity = { ...roomFilter.capacity, lte: maxCapacity };
        }
        const listings = await db_1.prisma.venueListing.findMany({
            where: {
                isPublic: true,
                isBlockedByAdmin: false,
                tenant: {
                    vendorProfile: {
                        isBlockedByAdmin: false
                    }
                },
                ...(0, rdcCities_1.allowedCityPrismaFilter)(city),
                ...(commune ? { commune: { contains: commune, mode: 'insensitive' } } : {}),
                ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } } : {}),
                ...(priceRange ? { priceFromFc: priceRange } : {}),
                ...(Object.keys(roomFilter).length > 0 ? { room: roomFilter } : {}),
                ...((street || q)
                    ? {
                        AND: [
                            ...(street
                                ? [{
                                        OR: [
                                            { address: { contains: street, mode: 'insensitive' } },
                                            { neighborhood: { contains: street, mode: 'insensitive' } },
                                            { commune: { contains: street, mode: 'insensitive' } },
                                        ],
                                    }]
                                : []),
                            ...(q
                                ? [{
                                        OR: [
                                            { headline: { contains: q, mode: 'insensitive' } },
                                            { city: { contains: q, mode: 'insensitive' } },
                                            { commune: { contains: q, mode: 'insensitive' } },
                                            { neighborhood: { contains: q, mode: 'insensitive' } },
                                            { address: { contains: q, mode: 'insensitive' } },
                                            { room: { name: { contains: q, mode: 'insensitive' } } },
                                            { tenant: { name: { contains: q, mode: 'insensitive' } } },
                                        ],
                                    }]
                                : []),
                        ],
                    }
                    : {}),
            },
            include: listingInclude,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: availability ? 240 : 160,
        });
        const geo = readGeoQuery(req);
        const venues = publicWithDistance(filterByAvailability(listings, availability), geo, toPublicVenue);
        return res.json({
            venues,
            total: venues.length,
        });
    }
    catch (error) {
        console.error('listPublicVenues:', error);
        return res.status(500).json({ error: 'Impossible de charger les salles.' });
    }
}
function canViewUnpublishedListing(req, tenantId) {
    const user = req.user;
    if (!user)
        return false;
    return user.role === 'SUPER_ADMIN' || user.tenantId === tenantId;
}
/** SuperAdmin (et org propriétaire) : voir fiches non publiques ou bloquées pour modération. */
function canViewRestrictedListing(req, tenantId) {
    return canViewUnpublishedListing(req, tenantId);
}
async function getPublicVenue(req, res) {
    try {
        const slug = String(req.params.slug || '').trim();
        if (!slug)
            return res.status(400).json({ error: 'Slug requis.' });
        const listing = await db_1.prisma.venueListing.findFirst({
            where: { slug },
            include: listingInclude,
        });
        if (!listing) {
            return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
        }
        const canStaffView = canViewRestrictedListing(req, listing.tenantId);
        if (listing.isBlockedByAdmin && !canStaffView) {
            return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
        }
        if (!listing.isPublic && !canStaffView) {
            return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
        }
        const [relatedVenues, relatedOfferings] = await Promise.all([
            db_1.prisma.venueListing.findMany({
                where: {
                    tenantId: listing.tenantId,
                    id: { not: listing.id },
                    isPublic: true,
                    isBlockedByAdmin: false,
                },
                include: listingInclude,
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 12,
            }),
            db_1.prisma.serviceOffering.findMany({
                where: {
                    tenantId: listing.tenantId,
                    isPublic: true,
                    isBlockedByAdmin: false,
                },
                include: offeringInclude,
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 12,
            }),
        ]);
        return res.json({
            ...toPublicVenue(listing),
            isPublic: listing.isPublic,
            isBlockedByAdmin: listing.isBlockedByAdmin,
            relatedVenues: relatedVenues.map(toPublicVenue),
            relatedServices: relatedOfferings.map(toPublicService),
            activityPreview: await (0, marketplaceFeedController_1.fetchActivityPreview)({ venueListingId: listing.id }),
        });
    }
    catch (error) {
        console.error('getPublicVenue:', error);
        return res.status(500).json({ error: 'Impossible de charger la salle.' });
    }
}
async function createVenueInquiry(req, res) {
    try {
        const account = await resolveInquirer(req);
        if (!account?.email) {
            return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
        }
        const slug = String(req.params.slug || '').trim();
        const { name, phone, eventDate, guestCount, message, eventId } = req.body || {};
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Le message est requis.' });
        }
        const listing = await db_1.prisma.venueListing.findFirst({
            where: { slug, isPublic: true },
            include: {
                room: { select: { name: true } },
                tenant: { select: { id: true, name: true, managerId: true } },
            },
        });
        if (!listing) {
            return res.status(404).json({ error: 'Salle introuvable ou non publiée.' });
        }
        const identity = inquiryIdentity(account, { name, phone });
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await db_1.prisma.marketplaceInquiry.count({
            where: { listingId: listing.id, fromEmail: identity.fromEmail, createdAt: { gte: since } },
        });
        if (recent >= 3) {
            return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour cette salle. Réessayez demain.' });
        }
        const parsedDate = eventDate ? new Date(eventDate) : null;
        const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
        const linkedEventId = await resolveLinkedEventId(req, eventId);
        const inquiry = await db_1.prisma.marketplaceInquiry.create({
            data: {
                listingId: listing.id,
                fromName: identity.fromName,
                fromEmail: identity.fromEmail,
                fromPhone: identity.fromPhone,
                eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
                guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
                message: String(message).trim().slice(0, 4000),
                fromTenantId: req.user?.tenantId || null,
                eventId: linkedEventId,
            },
        });
        const listingUrl = `${FRONTEND_URL}/marketplace/salles/${listing.slug}`;
        const dashboardHref = `${FRONTEND_URL}/dashboard/marketplace`;
        const operatorCopy = (0, marketplaceNotifyCopy_1.buildInquiryOperatorNotify)({
            subjectTitle: listing.room.name,
            ownerOrgName: listing.tenant.name,
            publicUrl: listingUrl,
            dashboardHref,
            inquiry,
        });
        void (0, platformNotificationService_1.notifyTenantOperators)(listing.tenant.id, {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
            title: `Devis — ${listing.room.name}`,
            message: `${inquiry.fromName} a demandé un devis pour votre salle.`,
            metadata: {
                listingId: listing.id,
                inquiryId: inquiry.id,
                href: dashboardHref,
            },
            email: operatorCopy.email,
            whatsapp: operatorCopy.whatsapp,
        });
        await (0, notificationService_1.sendRealEmail)(inquiry.fromEmail, `Votre demande — ${listing.room.name}`, `Nous avons transmis votre demande pour « ${listing.room.name} » à ${listing.tenant.name}. Ils vous recontacteront directement.`, `<p>Nous avons transmis votre demande pour <strong>${listing.room.name}</strong> à ${listing.tenant.name}.</p><p>Ils vous recontacteront directement.</p>`);
        return res.status(201).json({
            success: true,
            message: 'Votre demande a été transmise au propriétaire de la salle.',
        });
    }
    catch (error) {
        console.error('createVenueInquiry:', error);
        return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
    }
}
async function ensureVendorProfile(tenantId, displayName, city) {
    const existing = await db_1.prisma.vendorProfile.findUnique({ where: { tenantId } });
    if (existing)
        return existing;
    const slug = await (0, slug_1.uniqueSlug)(displayName, async (s) => {
        const hit = await db_1.prisma.vendorProfile.findUnique({ where: { slug: s }, select: { id: true } });
        return Boolean(hit);
    });
    return db_1.prisma.vendorProfile.create({
        data: { tenantId, slug, displayName, city: city || null },
    });
}
async function upsertRoomListing(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const roomId = req.params.roomId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent publier une salle.' });
        }
        const room = await db_1.prisma.organizationRoom.findFirst({ where: { id: roomId, tenantId } });
        if (!room)
            return res.status(404).json({ error: 'Salle introuvable.' });
        const { isPublic, headline, city, commune, neighborhood, address, latitude, longitude, priceFromFc, priceUnit, quotaMin, quotaMax, photos, blockedDates, details, } = req.body || {};
        const wantPublic = Boolean(isPublic);
        const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
        const photosSafe = (0, publicVenue_1.parsePhotoUrls)(photos);
        if (photosSafe.filter(publicVenue_1.isVideoUrl).length > publicVenue_1.MARKETPLACE_MAX_VIDEOS) {
            return res.status(400).json({ error: `Maximum ${publicVenue_1.MARKETPLACE_MAX_VIDEOS} vidéos par salle.` });
        }
        const blockedSafe = (0, marketplaceDates_1.parseBlockedDates)(blockedDates);
        const detailsSafe = (0, listingDetails_1.parseListingDetails)(details);
        const place = normalizeListingPlace(city, commune, neighborhood);
        if ('error' in place)
            return res.status(400).json({ error: place.error });
        if (wantPublic) {
            try {
                await (0, planFeaturesService_1.assertVenueCatalogPublish)(tenantId);
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
            const locationError = publishLocationError(city, commune, neighborhood, latitude, longitude);
            if (locationError)
                return res.status(400).json({ error: locationError });
            if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
            }
        }
        const existing = await db_1.prisma.venueListing.findUnique({ where: { roomId } });
        const slug = existing?.slug
            || await (0, slug_1.uniqueSlug)(`${room.name}-${place.city || room.location || 'kinshasa'}`, async (s) => {
                const hit = await db_1.prisma.venueListing.findUnique({ where: { slug: s }, select: { id: true } });
                return Boolean(hit);
            });
        const listing = await db_1.prisma.venueListing.upsert({
            where: { roomId },
            create: {
                tenantId,
                roomId,
                slug,
                isPublic: wantPublic,
                headline: headline?.trim() || room.name,
                city: place.city,
                commune: place.commune,
                neighborhood: place.neighborhood,
                address: address?.trim() || room.location,
                latitude: latitude != null && latitude !== '' ? Number(latitude) : null,
                longitude: longitude != null && longitude !== '' ? Number(longitude) : null,
                priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
                priceUnit: (0, publicVenue_1.parsePriceUnit)(priceUnit),
                quotaMin: parseOptionalInt(quotaMin),
                quotaMax: parseOptionalInt(quotaMax),
                photos: photosSafe,
                blockedDates: blockedSafe,
                details: detailsSafe,
                publishedAt: wantPublic ? new Date() : null,
            },
            update: {
                isPublic: wantPublic,
                headline: headline !== undefined ? (headline?.trim() || room.name) : undefined,
                city: city !== undefined ? place.city : undefined,
                commune: commune !== undefined ? place.commune : undefined,
                neighborhood: neighborhood !== undefined ? place.neighborhood : undefined,
                address: address !== undefined ? (address?.trim() || null) : undefined,
                latitude: latitude !== undefined ? (latitude != null && latitude !== '' ? Number(latitude) : null) : undefined,
                longitude: longitude !== undefined ? (longitude != null && longitude !== '' ? Number(longitude) : null) : undefined,
                priceFromFc: priceFromFc !== undefined ? (Number.isFinite(parsedPrice) ? parsedPrice : null) : undefined,
                priceUnit: priceUnit !== undefined ? (0, publicVenue_1.parsePriceUnit)(priceUnit) : undefined,
                quotaMin: quotaMin !== undefined ? parseOptionalInt(quotaMin) : undefined,
                quotaMax: quotaMax !== undefined ? parseOptionalInt(quotaMax) : undefined,
                photos: photos !== undefined ? photosSafe : undefined,
                blockedDates: blockedDates !== undefined ? blockedSafe : undefined,
                details: details !== undefined ? detailsSafe : undefined,
                publishedAt: wantPublic ? (existing?.publishedAt || new Date()) : null,
            },
        });
        if (wantPublic) {
            const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
            await ensureVendorProfile(tenantId, tenant?.name || room.name, place.city || listing.city);
            if (tenant && tenant.accountKind === client_1.TenantAccountKind.ORGANIZER) {
                await db_1.prisma.tenant.update({
                    where: { id: tenantId },
                    data: { accountKind: client_1.TenantAccountKind.BOTH },
                });
            }
        }
        return res.json(listing);
    }
    catch (error) {
        console.error('upsertRoomListing:', error);
        return res.status(500).json({ error: 'Impossible d’enregistrer la publication.' });
    }
}
function toPublicService(offering) {
    const photos = (0, publicVenue_1.parsePhotoUrls)(offering.photos);
    const extra = (0, listingDetails_1.parseListingDetails)(offering.details);
    return {
        slug: offering.slug,
        title: offering.title,
        description: extra.description || offering.description,
        category: offering.category,
        categoryLabel: (0, publicVenue_1.serviceCategoryLabel)(offering.category),
        city: offering.city,
        commune: offering.commune || null,
        neighborhood: offering.neighborhood || null,
        coverageRadiusKm: offering.travels ? offering.coverageRadiusKm : null,
        travels: Boolean(offering.travels),
        latitude: offering.latitude ?? null,
        longitude: offering.longitude ?? null,
        priceFromFc: offering.priceFromFc,
        priceUnit: offering.priceUnit,
        priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(offering.priceUnit),
        quotaMin: offering.quotaMin ?? null,
        quotaMax: offering.quotaMax ?? null,
        photos,
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        publishedAt: offering.publishedAt,
        orgName: offering.vendorProfile.displayName || offering.tenant.name,
        orgSlug: offering.vendorProfile.slug,
        blockedDates: (0, marketplaceDates_1.parseBlockedDates)(offering.blockedDates),
        bookedDates: (0, marketplaceDates_1.collectUnavailableDates)([], offering.bookings),
        unavailableDates: (0, marketplaceDates_1.collectUnavailableDates)(offering.blockedDates, offering.bookings),
        details: extra,
    };
}
const offeringInclude = {
    vendorProfile: { select: { displayName: true, city: true, slug: true, isBlockedByAdmin: true } },
    tenant: { select: { name: true } },
    bookings: {
        where: { status: { in: HOLD_BOOKING_STATUSES } },
        select: { eventDate: true, eventEndDate: true },
    },
};
async function listPublicServices(req, res) {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
        const commune = typeof req.query.commune === 'string' ? req.query.commune.trim() : '';
        const neighborhood = typeof req.query.neighborhood === 'string' ? req.query.neighborhood.trim() : '';
        const street = readStreetQuery(req);
        const category = (0, publicVenue_1.parseServiceCategory)(req.query.category);
        const group = (0, publicVenue_1.parseServiceGroup)(req.query.group);
        const priceUnit = (0, publicVenue_1.parsePriceUnitFilter)(req.query.priceUnit);
        const priceRange = readPriceRange(req);
        const availability = readAvailabilityRange(req);
        const mobility = typeof req.query.mobility === 'string' ? req.query.mobility.trim() : '';
        const travelsFilter = mobility === 'travels' ? true : mobility === 'on_site' ? false : null;
        const where = {
            isPublic: true,
            isBlockedByAdmin: false,
            vendorProfile: {
                isBlockedByAdmin: false
            },
            ...(0, rdcCities_1.allowedCityPrismaFilter)(city),
            ...(commune ? { commune: { contains: commune, mode: 'insensitive' } } : {}),
            ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } } : {}),
            ...(category ? { category } : (0, publicVenue_1.serviceGroupPrismaFilter)(group)),
            ...(priceUnit ? { priceUnit } : {}),
            ...(priceRange ? { priceFromFc: priceRange } : {}),
            ...(travelsFilter == null ? {} : { travels: travelsFilter }),
            ...((street || q)
                ? {
                    AND: [
                        ...(street
                            ? [{
                                    OR: [
                                        { neighborhood: { contains: street, mode: 'insensitive' } },
                                        { commune: { contains: street, mode: 'insensitive' } },
                                        { city: { contains: street, mode: 'insensitive' } },
                                        { title: { contains: street, mode: 'insensitive' } },
                                        { description: { contains: street, mode: 'insensitive' } },
                                    ],
                                }]
                            : []),
                        ...(q
                            ? [{
                                    OR: [
                                        { title: { contains: q, mode: 'insensitive' } },
                                        { description: { contains: q, mode: 'insensitive' } },
                                        { city: { contains: q, mode: 'insensitive' } },
                                        { commune: { contains: q, mode: 'insensitive' } },
                                        { neighborhood: { contains: q, mode: 'insensitive' } },
                                        { vendorProfile: { displayName: { contains: q, mode: 'insensitive' } } },
                                    ],
                                }]
                            : []),
                    ],
                }
                : {}),
        };
        const findOfferings = (extraWhere, take) => db_1.prisma.serviceOffering.findMany({
            where: { AND: [where, extraWhere] },
            include: offeringInclude,
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take,
        });
        const take = availability ? 200 : 80;
        const offerings = !category && !group
            ? (await Promise.all([
                findOfferings((0, publicVenue_1.serviceGroupPrismaFilter)('trade'), availability ? 100 : 50),
                findOfferings((0, publicVenue_1.serviceGroupPrismaFilter)('rental'), availability ? 100 : 50),
            ])).flat()
            : await findOfferings({}, take);
        const geo = readGeoQuery(req);
        const services = publicWithDistance(filterByAvailability(offerings, availability), geo, toPublicService);
        return res.json({ services, total: services.length });
    }
    catch (error) {
        console.error('listPublicServices:', error);
        return res.status(500).json({ error: 'Impossible de charger les prestataires.' });
    }
}
async function getPublicService(req, res) {
    try {
        const slug = String(req.params.slug || '').trim();
        if (!slug)
            return res.status(400).json({ error: 'Slug requis.' });
        const offering = await db_1.prisma.serviceOffering.findFirst({
            where: { slug },
            include: offeringInclude,
        });
        if (!offering)
            return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
        const canStaffView = canViewRestrictedListing(req, offering.tenantId);
        const vendorBlocked = Boolean(offering.vendorProfile?.isBlockedByAdmin);
        if ((offering.isBlockedByAdmin || vendorBlocked) && !canStaffView) {
            return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
        }
        if (!offering.isPublic && !canStaffView) {
            return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
        }
        const [relatedOfferings, relatedVenues] = await Promise.all([
            db_1.prisma.serviceOffering.findMany({
                where: {
                    tenantId: offering.tenantId,
                    id: { not: offering.id },
                    isPublic: true,
                    isBlockedByAdmin: false,
                },
                include: offeringInclude,
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 12,
            }),
            db_1.prisma.venueListing.findMany({
                where: {
                    tenantId: offering.tenantId,
                    isPublic: true,
                    isBlockedByAdmin: false,
                },
                include: listingInclude,
                orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                take: 12,
            }),
        ]);
        return res.json({
            ...toPublicService(offering),
            isPublic: offering.isPublic,
            isBlockedByAdmin: offering.isBlockedByAdmin || Boolean(offering.vendorProfile?.isBlockedByAdmin),
            relatedServices: relatedOfferings.map(toPublicService),
            relatedVenues: relatedVenues.map(toPublicVenue),
            activityPreview: await (0, marketplaceFeedController_1.fetchActivityPreview)({
                OR: [
                    { serviceOfferingId: offering.id },
                    { vendorProfileId: offering.vendorProfileId },
                ],
            }),
        });
    }
    catch (error) {
        console.error('getPublicService:', error);
        return res.status(500).json({ error: 'Impossible de charger la prestation.' });
    }
}
async function getPublicVendor(req, res) {
    try {
        const slug = String(req.params.slug || '').trim();
        if (!slug)
            return res.status(400).json({ error: 'Slug requis.' });
        const profile = await db_1.prisma.vendorProfile.findFirst({
            where: {
                slug,
                isBlockedByAdmin: false
            },
            include: {
                offerings: {
                    where: { isPublic: true, isBlockedByAdmin: false },
                    include: offeringInclude,
                    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                    take: 24,
                },
                tenant: {
                    include: {
                        venueListings: {
                            where: { isPublic: true, isBlockedByAdmin: false },
                            include: listingInclude,
                            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
                            take: 24,
                        },
                    },
                },
            },
        });
        if (!profile)
            return res.status(404).json({ error: 'Prestataire introuvable.' });
        return res.json({
            id: profile.id,
            slug: profile.slug,
            displayName: profile.displayName,
            city: profile.city,
            bio: profile.bio,
            services: (profile.offerings || []).map(toPublicService),
            venues: (profile.tenant?.venueListings || []).map(toPublicVenue),
            activityPreview: await (0, marketplaceFeedController_1.fetchActivityPreview)({ vendorProfileId: profile.id }),
        });
    }
    catch (error) {
        console.error('getPublicVendor:', error);
        return res.status(500).json({ error: 'Impossible de charger le prestataire.' });
    }
}
async function notifyInquiry(params) {
    const { inquiry } = params;
    const operatorCopy = (0, marketplaceNotifyCopy_1.buildInquiryOperatorNotify)({
        subjectTitle: params.subjectTitle,
        ownerOrgName: params.ownerOrgName,
        publicUrl: params.publicUrl,
        dashboardHref: params.dashboardHref,
        inquiry,
    });
    void (0, platformNotificationService_1.notifyTenantOperators)(params.vendorTenantId, {
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_INQUIRY,
        title: `Devis — ${params.subjectTitle}`,
        message: `${inquiry.fromName} a demandé un devis pour votre prestation.`,
        metadata: {
            offeringId: params.offeringId,
            inquiryId: inquiry.id,
            href: params.dashboardHref,
        },
        email: operatorCopy.email,
        whatsapp: operatorCopy.whatsapp,
    });
    await (0, notificationService_1.sendRealEmail)(inquiry.fromEmail, `Votre demande — ${params.subjectTitle}`, `Nous avons transmis votre demande pour « ${params.subjectTitle} » à ${params.ownerOrgName}. Ils vous recontacteront directement.`, `<p>Nous avons transmis votre demande pour <strong>${params.subjectTitle}</strong> à ${params.ownerOrgName}.</p><p>Ils vous recontacteront directement.</p>`);
}
async function createServiceInquiry(req, res) {
    try {
        const account = await resolveInquirer(req);
        if (!account?.email) {
            return res.status(401).json({ error: 'Connectez-vous pour envoyer un devis.' });
        }
        const slug = String(req.params.slug || '').trim();
        const { name, phone, eventDate, guestCount, message, eventId } = req.body || {};
        if (!message?.trim()) {
            return res.status(400).json({ error: 'Le message est requis.' });
        }
        const offering = await db_1.prisma.serviceOffering.findFirst({
            where: { slug, isPublic: true },
            include: { tenant: { select: { id: true, name: true, managerId: true } } },
        });
        if (!offering)
            return res.status(404).json({ error: 'Prestation introuvable ou non publiée.' });
        const identity = inquiryIdentity(account, { name, phone });
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recent = await db_1.prisma.marketplaceInquiry.count({
            where: { offeringId: offering.id, fromEmail: identity.fromEmail, createdAt: { gte: since } },
        });
        if (recent >= 3) {
            return res.status(429).json({ error: 'Trop de demandes aujourd’hui pour ce prestataire. Réessayez demain.' });
        }
        const parsedDate = eventDate ? new Date(eventDate) : null;
        const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
        const linkedEventId = await resolveLinkedEventId(req, eventId);
        const inquiry = await db_1.prisma.marketplaceInquiry.create({
            data: {
                offeringId: offering.id,
                fromName: identity.fromName,
                fromEmail: identity.fromEmail,
                fromPhone: identity.fromPhone,
                eventDate: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
                guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
                message: String(message).trim().slice(0, 4000),
                fromTenantId: req.user?.tenantId || null,
                eventId: linkedEventId,
            },
        });
        await notifyInquiry({
            ownerOrgName: offering.tenant.name,
            subjectTitle: offering.title,
            publicUrl: `${FRONTEND_URL}/marketplace/prestataires/${offering.slug}`,
            dashboardHref: `${FRONTEND_URL}/dashboard/marketplace`,
            vendorTenantId: offering.tenant.id,
            offeringId: offering.id,
            inquiry,
        });
        return res.status(201).json({
            success: true,
            message: 'Votre demande a été transmise au prestataire.',
        });
    }
    catch (error) {
        console.error('createServiceInquiry:', error);
        return res.status(500).json({ error: 'Impossible d’envoyer la demande.' });
    }
}
async function listMyServices(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const services = await db_1.prisma.serviceOffering.findMany({
            where: { tenantId },
            include: {
                bookings: {
                    where: { status: { in: HOLD_BOOKING_STATUSES } },
                    select: { eventDate: true, eventEndDate: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            services: services.map(({ bookings, ...rest }) => ({
                ...rest,
                blockedDates: (0, marketplaceDates_1.parseBlockedDates)(rest.blockedDates),
                bookedDates: (0, marketplaceDates_1.collectUnavailableDates)([], bookings),
            })),
        });
    }
    catch (error) {
        console.error('listMyServices:', error);
        return res.status(500).json({ error: 'Impossible de charger les prestations.' });
    }
}
async function upsertService(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent gérer les prestations.' });
        }
        const { title, description, city, commune, neighborhood, coverageRadiusKm, travels, latitude, longitude, priceFromFc, priceUnit, quotaMin, quotaMax, photos, isPublic, category, blockedDates, details, } = req.body || {};
        if (!title?.trim())
            return res.status(400).json({ error: 'Le titre est requis.' });
        const parsedCategory = (0, publicVenue_1.parseServiceCategory)(category) || 'OTHER';
        const wantPublic = Boolean(isPublic);
        const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
        const parsedRadius = Number.parseInt(String(coverageRadiusKm ?? ''), 10);
        const doesTravel = travels === undefined || travels === null
            ? Number.isFinite(parsedRadius) && parsedRadius > 0
            : Boolean(travels);
        const photosSafe = (0, publicVenue_1.parsePhotoUrls)(photos);
        if (photosSafe.filter(publicVenue_1.isVideoUrl).length > publicVenue_1.MARKETPLACE_MAX_VIDEOS) {
            return res.status(400).json({ error: `Maximum ${publicVenue_1.MARKETPLACE_MAX_VIDEOS} vidéos par prestation.` });
        }
        const blockedSafe = (0, marketplaceDates_1.parseBlockedDates)(blockedDates);
        const detailsSafe = (0, listingDetails_1.parseListingDetails)(details);
        const place = normalizeListingPlace(city, commune, neighborhood);
        if ('error' in place)
            return res.status(400).json({ error: place.error });
        if (wantPublic) {
            const locationError = publishLocationError(city, commune, neighborhood, latitude, longitude);
            if (locationError)
                return res.status(400).json({ error: locationError });
            if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
                return res.status(400).json({ error: 'Indiquez un tarif de départ en FC.' });
            }
            if (doesTravel && !(Number.isFinite(parsedRadius) && parsedRadius > 0)) {
                return res.status(400).json({ error: 'Indiquez le rayon d’intervention (km) si vous vous déplacez.' });
            }
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, accountKind: true } });
        const profile = await ensureVendorProfile(tenantId, tenant?.name || title, place.city);
        const serviceId = typeof req.params.id === 'string' ? req.params.id : '';
        const existing = serviceId
            ? await db_1.prisma.serviceOffering.findFirst({ where: { id: serviceId, tenantId } })
            : null;
        if (serviceId && !existing)
            return res.status(404).json({ error: 'Prestation introuvable.' });
        if (!existing) {
            try {
                await (0, planFeaturesService_1.assertServiceQuota)(tenantId);
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
        }
        const slug = existing?.slug
            || await (0, slug_1.uniqueSlug)(`${title}-${place.city || 'kinshasa'}`, async (s) => {
                const hit = await db_1.prisma.serviceOffering.findUnique({ where: { slug: s }, select: { id: true } });
                return Boolean(hit);
            });
        const data = {
            title: String(title).trim(),
            description: description?.trim() || null,
            city: place.city,
            commune: place.commune,
            neighborhood: place.neighborhood,
            coverageRadiusKm: doesTravel && Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
            travels: doesTravel,
            latitude: latitude != null && latitude !== '' && Number.isFinite(Number(latitude)) ? Number(latitude) : null,
            longitude: longitude != null && longitude !== '' && Number.isFinite(Number(longitude)) ? Number(longitude) : null,
            priceFromFc: Number.isFinite(parsedPrice) ? parsedPrice : null,
            priceUnit: (0, publicVenue_1.parsePriceUnit)(priceUnit),
            quotaMin: parseOptionalInt(quotaMin),
            quotaMax: parseOptionalInt(quotaMax),
            photos: photosSafe,
            blockedDates: blockedSafe,
            details: detailsSafe,
            isPublic: wantPublic,
            category: parsedCategory,
            publishedAt: wantPublic ? (existing?.publishedAt || new Date()) : null,
        };
        const offering = existing
            ? await db_1.prisma.serviceOffering.update({ where: { id: existing.id }, data })
            : await db_1.prisma.serviceOffering.create({
                data: { ...data, tenantId, vendorProfileId: profile.id, slug },
            });
        if (wantPublic && tenant?.accountKind === client_1.TenantAccountKind.ORGANIZER) {
            await db_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { accountKind: client_1.TenantAccountKind.BOTH },
            });
        }
        return res.json(offering);
    }
    catch (error) {
        console.error('upsertService:', error);
        return res.status(500).json({ error: 'Impossible d’enregistrer la prestation.' });
    }
}
async function deleteService(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms)
            return res.status(403).json({ error: 'Accès refusé.' });
        const existing = await db_1.prisma.serviceOffering.findFirst({ where: { id, tenantId } });
        if (!existing)
            return res.status(404).json({ error: 'Prestation introuvable.' });
        await db_1.prisma.serviceOffering.delete({ where: { id } });
        return res.json({ message: 'Prestation supprimée.' });
    }
    catch (error) {
        console.error('deleteService:', error);
        return res.status(500).json({ error: 'Impossible de supprimer la prestation.' });
    }
}
async function listMyInquiries(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const role = req.query.role === 'organizer' ? 'organizer' : 'vendor';
        if (role === 'vendor') {
            const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
            if (!access.canManageRooms)
                return res.status(403).json({ error: 'Accès refusé.' });
        }
        const sender = role === 'organizer'
            ? await db_1.prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
            : null;
        const senderEmail = sender?.email?.trim().toLowerCase() || '';
        const inquiries = await db_1.prisma.marketplaceInquiry.findMany({
            where: role === 'organizer'
                ? {
                    OR: [
                        { fromTenantId: tenantId },
                        ...(senderEmail ? [{ fromEmail: senderEmail }] : []),
                    ],
                }
                : {
                    OR: [
                        { listing: { tenantId } },
                        { offering: { tenantId } },
                    ],
                },
            include: {
                listing: {
                    select: {
                        slug: true,
                        headline: true,
                        room: { select: { name: true } },
                        tenant: { select: { name: true, vendorProfile: { select: { slug: true, displayName: true } } } },
                    },
                },
                offering: {
                    select: {
                        slug: true,
                        title: true,
                        category: true,
                        tenant: { select: { name: true } },
                        vendorProfile: { select: { slug: true, displayName: true } },
                    },
                },
                event: { select: { id: true, title: true, date: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const linked = await db_1.prisma.marketplaceBooking.findMany({
            where: { inquiryId: { in: inquiries.map((item) => item.id) } },
            select: { inquiryId: true, id: true, status: true },
        });
        const bookingByInquiry = new Map(linked
            .filter((row) => Boolean(row.inquiryId))
            .map((row) => [row.inquiryId, row]));
        return res.json({
            inquiries: inquiries.map((item) => {
                const booking = bookingByInquiry.get(item.id);
                return {
                    id: item.id,
                    kind: item.offeringId
                        ? ((0, publicVenue_1.isServiceRentalCategory)(item.offering?.category) ? 'rental' : 'service')
                        : 'venue',
                    title: item.offering?.title || item.listing?.headline || item.listing?.room.name || 'Demande',
                    fromName: item.fromName,
                    fromEmail: item.fromEmail,
                    fromPhone: item.fromPhone,
                    eventDate: item.eventDate,
                    guestCount: item.guestCount,
                    message: item.message,
                    status: item.status,
                    createdAt: item.createdAt,
                    event: item.event,
                    hasBooking: Boolean(booking),
                    bookingId: booking?.id || null,
                    bookingStatus: booking?.status || null,
                    vendorName: item.offering?.vendorProfile?.displayName
                        || item.offering?.tenant.name
                        || item.listing?.tenant.vendorProfile?.displayName
                        || item.listing?.tenant.name
                        || null,
                    vendorSlug: item.offering?.vendorProfile?.slug || item.listing?.tenant.vendorProfile?.slug || null,
                    listingSlug: item.listing?.slug || null,
                    offeringSlug: item.offering?.slug || null,
                    offeringCategory: item.offering?.category || null,
                    viewerRole: role,
                };
            }),
        });
    }
    catch (error) {
        console.error('listMyInquiries:', error);
        return res.status(500).json({ error: 'Impossible de charger les demandes.' });
    }
}
async function updateInquiryStatus(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms)
            return res.status(403).json({ error: 'Accès refusé.' });
        const status = req.body?.status === 'CONTACTED' ? 'CONTACTED' : req.body?.status === 'NEW' ? 'NEW' : null;
        if (!status)
            return res.status(400).json({ error: 'Statut invalide.' });
        const existing = await db_1.prisma.marketplaceInquiry.findFirst({
            where: {
                id,
                OR: [{ listing: { tenantId } }, { offering: { tenantId } }],
            },
        });
        if (!existing)
            return res.status(404).json({ error: 'Demande introuvable.' });
        const updated = await db_1.prisma.marketplaceInquiry.update({
            where: { id },
            data: { status },
        });
        return res.json(updated);
    }
    catch (error) {
        console.error('updateInquiryStatus:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la demande.' });
    }
}
async function saveVendorOnboarding(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const { displayName, category, city, commune, neighborhood, travels = true, coverageRadiusKm, title, description, priceFromFc, priceUnit = 'EVENT', } = req.body || {};
        const nameToUse = String(displayName || '').trim() || 'Mon Entreprise';
        const place = normalizeListingPlace(city, commune, neighborhood);
        const resolvedCity = ('error' in place ? null : place.city) || (city ? String(city).trim() : null);
        // 1. S'assurer du profil prestataire
        let profile = await db_1.prisma.vendorProfile.findUnique({ where: { tenantId } });
        if (profile) {
            profile = await db_1.prisma.vendorProfile.update({
                where: { tenantId },
                data: {
                    displayName: nameToUse,
                    city: resolvedCity,
                },
            });
        }
        else {
            const slug = await (0, slug_1.uniqueSlug)(nameToUse, async (s) => {
                const hit = await db_1.prisma.vendorProfile.findUnique({ where: { slug: s }, select: { id: true } });
                return Boolean(hit);
            });
            profile = await db_1.prisma.vendorProfile.create({
                data: {
                    tenantId,
                    slug,
                    displayName: nameToUse,
                    city: resolvedCity,
                },
            });
        }
        // 2. Créer ou mettre à jour la 1ère prestation si category est fournie
        let offering = null;
        if (category) {
            const parsedCategory = (0, publicVenue_1.parseServiceCategory)(category) || 'OTHER';
            const parsedPrice = Number.parseInt(String(priceFromFc ?? ''), 10);
            const parsedRadius = Number.parseInt(String(coverageRadiusKm ?? ''), 10);
            const offerTitle = String(title || '').trim() || `Prestation ${parsedCategory}`;
            const existingOffer = await db_1.prisma.serviceOffering.findFirst({
                where: { tenantId, vendorProfileId: profile.id },
            });
            const offerSlug = existingOffer?.slug || await (0, slug_1.uniqueSlug)(`${offerTitle}-${resolvedCity || 'kinshasa'}`, async (s) => {
                const hit = await db_1.prisma.serviceOffering.findUnique({ where: { slug: s }, select: { id: true } });
                return Boolean(hit);
            });
            const offerData = {
                title: offerTitle,
                description: description?.trim() || null,
                category: parsedCategory,
                city: resolvedCity,
                commune: ('error' in place ? null : place.commune) || (commune ? String(commune).trim() : null),
                neighborhood: ('error' in place ? null : place.neighborhood) || (neighborhood ? String(neighborhood).trim() : null),
                travels: Boolean(travels),
                coverageRadiusKm: travels && Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null,
                priceFromFc: Number.isFinite(parsedPrice) && parsedPrice >= 0 ? parsedPrice : null,
                priceUnit: (0, publicVenue_1.parsePriceUnit)(priceUnit),
            };
            if (existingOffer) {
                offering = await db_1.prisma.serviceOffering.update({
                    where: { id: existingOffer.id },
                    data: offerData,
                });
            }
            else {
                offering = await db_1.prisma.serviceOffering.create({
                    data: {
                        ...offerData,
                        tenantId,
                        vendorProfileId: profile.id,
                        slug: offerSlug,
                        isPublic: false,
                    },
                });
            }
        }
        return res.status(200).json({
            success: true,
            vendorProfile: profile,
            serviceOffering: offering,
        });
    }
    catch (error) {
        console.error('saveVendorOnboarding error:', error);
        return res.status(500).json({ error: 'Erreur lors de la configuration initiale du profil prestataire.' });
    }
}

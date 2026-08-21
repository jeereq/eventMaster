"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCatalogOverview = getCatalogOverview;
exports.listAdminVenues = listAdminVenues;
exports.listAdminOfferings = listAdminOfferings;
exports.listAdminInquiries = listAdminInquiries;
exports.listAdminBookings = listAdminBookings;
exports.listAdminCommissions = listAdminCommissions;
exports.settleMarketplaceCommission = settleMarketplaceCommission;
exports.setVenueListingVisibility = setVenueListingVisibility;
exports.setServiceOfferingVisibility = setServiceOfferingVisibility;
exports.unpublishVenueListing = unpublishVenueListing;
exports.unpublishServiceOffering = unpublishServiceOffering;
exports.toggleVendorBlock = toggleVendorBlock;
exports.toggleVenueBlock = toggleVenueBlock;
exports.toggleOfferingBlock = toggleOfferingBlock;
const db_1 = require("../db");
const adminAuditService_1 = require("../services/adminAuditService");
const publicVenue_1 = require("../utils/publicVenue");
function pager(req) {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100);
    return { page, pageSize, skip: (page - 1) * pageSize };
}
function searchQ(req) {
    return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
}
function cityFilter(req) {
    return typeof req.query.city === 'string' && req.query.city.trim() ? req.query.city.trim() : undefined;
}
function communeFilter(req) {
    return typeof req.query.commune === 'string' && req.query.commune.trim() ? req.query.commune.trim() : undefined;
}
function neighborhoodFilter(req) {
    return typeof req.query.neighborhood === 'string' && req.query.neighborhood.trim() ? req.query.neighborhood.trim() : undefined;
}
function streetFilter(req) {
    return typeof req.query.street === 'string' && req.query.street.trim() ? req.query.street.trim() : undefined;
}
const ROOM_TYPES = ['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM'];
function roomTypeFilter(req) {
    const raw = typeof req.query.roomType === 'string' ? req.query.roomType.trim() : '';
    return ROOM_TYPES.includes(raw) ? raw : undefined;
}
function capacityRange(req) {
    const min = Number.parseInt(String(req.query.minCapacity || ''), 10);
    const max = Number.parseInt(String(req.query.maxCapacity || ''), 10);
    const range = {};
    if (Number.isFinite(min) && min > 0)
        range.gte = min;
    if (Number.isFinite(max) && max > 0)
        range.lte = max;
    return range.gte != null || range.lte != null ? range : undefined;
}
function priceUnitFilter(req) {
    const raw = typeof req.query.priceUnit === 'string' ? req.query.priceUnit.trim() : '';
    if (!raw)
        return undefined;
    return (0, publicVenue_1.parsePriceUnit)(raw);
}
function travelsFilter(req) {
    const mobility = typeof req.query.mobility === 'string' ? req.query.mobility.trim() : '';
    if (mobility === 'travels')
        return true;
    if (mobility === 'on_site')
        return false;
    return undefined;
}
function priceRange(req) {
    const min = Number.parseInt(String(req.query.minPrice || ''), 10);
    const max = Number.parseInt(String(req.query.maxPrice || ''), 10);
    const range = {};
    if (Number.isFinite(min) && min >= 0)
        range.gte = min;
    if (Number.isFinite(max) && max >= 0)
        range.lte = max;
    return range.gte != null || range.lte != null ? range : undefined;
}
function listingHref(kind, slug, category) {
    if (kind === 'venue')
        return `/dashboard/catalogue/salles/${slug}`;
    return (0, publicVenue_1.isServiceRentalCategory)(category)
        ? `/dashboard/catalogue/locations/${slug}`
        : `/dashboard/catalogue/prestataires/${slug}`;
}
function publicFilter(req) {
    const raw = typeof req.query.isPublic === 'string' ? req.query.isPublic : '';
    if (raw === '1' || raw === 'true')
        return true;
    if (raw === '0' || raw === 'false')
        return false;
    return undefined;
}
const INQUIRY_STATUSES = ['NEW', 'CONTACTED'];
const BOOKING_STATUSES = [
    'REQUESTED',
    'ACCEPTED',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
];
const BILLABLE_BOOKING_STATUSES = ['CONFIRMED', 'COMPLETED'];
function parseInquiryStatus(value) {
    if (typeof value === 'string' && INQUIRY_STATUSES.includes(value)) {
        return value;
    }
    return undefined;
}
function parseBookingStatus(value) {
    if (typeof value === 'string' && BOOKING_STATUSES.includes(value)) {
        return value;
    }
    return undefined;
}
async function getCatalogOverview(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const billableWhere = { status: { in: BILLABLE_BOOKING_STATUSES } };
        const [venuesTotal, venuesPublic, offeringsTotal, offeringsPublic, tradesTotal, tradesPublic, rentalsTotal, rentalsPublic, inquiriesTotal, inquiriesNew, bookingsTotal, bookingsRequested, commissionDue, commissionPaid, favoritesTotal, packsTotal, gmvVenue, gmvTrade, gmvRental,] = await Promise.all([
            db_1.prisma.venueListing.count(),
            db_1.prisma.venueListing.count({ where: { isPublic: true } }),
            db_1.prisma.serviceOffering.count(),
            db_1.prisma.serviceOffering.count({ where: { isPublic: true } }),
            db_1.prisma.serviceOffering.count({ where: (0, publicVenue_1.serviceGroupPrismaFilter)('trade') }),
            db_1.prisma.serviceOffering.count({ where: { isPublic: true, ...(0, publicVenue_1.serviceGroupPrismaFilter)('trade') } }),
            db_1.prisma.serviceOffering.count({ where: (0, publicVenue_1.serviceGroupPrismaFilter)('rental') }),
            db_1.prisma.serviceOffering.count({ where: { isPublic: true, ...(0, publicVenue_1.serviceGroupPrismaFilter)('rental') } }),
            db_1.prisma.marketplaceInquiry.count(),
            db_1.prisma.marketplaceInquiry.count({ where: { status: 'NEW' } }),
            db_1.prisma.marketplaceBooking.count(),
            db_1.prisma.marketplaceBooking.count({ where: { status: 'REQUESTED' } }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { status: { in: BILLABLE_BOOKING_STATUSES }, commissionSettledAt: null },
                _count: { _all: true },
                _sum: { commissionFc: true },
            }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { status: { in: BILLABLE_BOOKING_STATUSES }, commissionSettledAt: { not: null } },
                _count: { _all: true },
                _sum: { commissionFc: true },
            }),
            db_1.prisma.listingFavorite.count(),
            db_1.prisma.savedEventPack.count(),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, listingId: { not: null } },
                _count: { _all: true },
                _sum: { amountFc: true, commissionFc: true },
            }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, offering: (0, publicVenue_1.serviceGroupPrismaFilter)('trade') },
                _count: { _all: true },
                _sum: { amountFc: true, commissionFc: true },
            }),
            db_1.prisma.marketplaceBooking.aggregate({
                where: { ...billableWhere, offering: (0, publicVenue_1.serviceGroupPrismaFilter)('rental') },
                _count: { _all: true },
                _sum: { amountFc: true, commissionFc: true },
            }),
        ]);
        return res.json({
            venues: { total: venuesTotal, publicCount: venuesPublic },
            offerings: { total: offeringsTotal, publicCount: offeringsPublic },
            trades: { total: tradesTotal, publicCount: tradesPublic },
            rentals: { total: rentalsTotal, publicCount: rentalsPublic },
            inquiries: { total: inquiriesTotal, newCount: inquiriesNew },
            bookings: { total: bookingsTotal, requestedCount: bookingsRequested },
            commissions: {
                dueCount: commissionDue._count._all,
                dueFc: commissionDue._sum.commissionFc || 0,
                paidCount: commissionPaid._count._all,
                paidFc: commissionPaid._sum.commissionFc || 0,
            },
            engagement: {
                favorites: favoritesTotal,
                packs: packsTotal,
            },
            gmv: {
                venueFc: gmvVenue._sum.amountFc || 0,
                venueCount: gmvVenue._count._all,
                tradeFc: gmvTrade._sum.amountFc || 0,
                tradeCount: gmvTrade._count._all,
                rentalFc: gmvRental._sum.amountFc || 0,
                rentalCount: gmvRental._count._all,
                venueCommissionFc: gmvVenue._sum.commissionFc || 0,
                tradeCommissionFc: gmvTrade._sum.commissionFc || 0,
                rentalCommissionFc: gmvRental._sum.commissionFc || 0,
            },
        });
    }
    catch (error) {
        console.error('Erreur catalog overview admin:', error);
        return res.status(500).json({ error: 'Impossible de charger le catalogue.' });
    }
}
async function listAdminVenues(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { page, pageSize, skip } = pager(req);
        const q = searchQ(req);
        const isPublic = publicFilter(req);
        const city = cityFilter(req);
        const commune = communeFilter(req);
        const neighborhood = neighborhoodFilter(req);
        const street = streetFilter(req);
        const price = priceRange(req);
        const roomType = roomTypeFilter(req);
        const capacity = capacityRange(req);
        const unit = priceUnitFilter(req);
        const roomWhere = {
            ...(roomType ? { roomType } : {}),
            ...(capacity ? { capacity } : {}),
        };
        const where = {
            isPublic,
            ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
            ...(commune ? { commune: { contains: commune, mode: 'insensitive' } } : {}),
            ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } } : {}),
            ...(street ? { address: { contains: street, mode: 'insensitive' } } : {}),
            ...(price ? { priceFromFc: price } : {}),
            ...(unit ? { priceUnit: unit } : {}),
            ...(Object.keys(roomWhere).length > 0 ? { room: roomWhere } : {}),
            ...(q
                ? {
                    OR: [
                        { headline: { contains: q, mode: 'insensitive' } },
                        { slug: { contains: q, mode: 'insensitive' } },
                        { city: { contains: q, mode: 'insensitive' } },
                        { commune: { contains: q, mode: 'insensitive' } },
                        { neighborhood: { contains: q, mode: 'insensitive' } },
                        { address: { contains: q, mode: 'insensitive' } },
                        { room: { name: { contains: q, mode: 'insensitive' } } },
                        { tenant: { name: { contains: q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db_1.prisma.venueListing.findMany({
                where,
                include: {
                    room: { select: { name: true, roomType: true, capacity: true } },
                    tenant: { select: { id: true, name: true } },
                },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: pageSize,
            }),
            db_1.prisma.venueListing.count({ where }),
        ]);
        return res.json({
            items: rows.map((row) => {
                const photos = (0, publicVenue_1.parsePhotoUrls)(row.photos);
                return {
                    id: row.id,
                    slug: row.slug,
                    isPublic: row.isPublic,
                    isBlockedByAdmin: row.isBlockedByAdmin,
                    headline: row.headline || row.room.name,
                    roomName: row.room.name,
                    roomType: row.room.roomType,
                    capacity: row.room.capacity,
                    city: row.city,
                    commune: row.commune,
                    neighborhood: row.neighborhood,
                    address: row.address,
                    latitude: row.latitude,
                    longitude: row.longitude,
                    coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
                    photos,
                    priceFromFc: row.priceFromFc,
                    priceUnit: row.priceUnit,
                    priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(row.priceUnit),
                    publishedAt: row.publishedAt,
                    createdAt: row.createdAt,
                    tenantId: row.tenantId,
                    tenantName: row.tenant.name,
                    href: listingHref('venue', row.slug),
                };
            }),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
        });
    }
    catch (error) {
        console.error('Erreur catalog venues admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les salles.' });
    }
}
async function listAdminOfferings(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { page, pageSize, skip } = pager(req);
        const q = searchQ(req);
        const isPublic = publicFilter(req);
        const category = (0, publicVenue_1.parseServiceCategory)(req.query.category) || undefined;
        const group = (0, publicVenue_1.parseServiceGroup)(req.query.group);
        const city = cityFilter(req);
        const commune = communeFilter(req);
        const neighborhood = neighborhoodFilter(req);
        const street = streetFilter(req);
        const price = priceRange(req);
        const unit = priceUnitFilter(req);
        const travels = travelsFilter(req);
        const where = {
            isPublic,
            ...(category ? { category } : (0, publicVenue_1.serviceGroupPrismaFilter)(group)),
            ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
            ...(commune ? { commune: { contains: commune, mode: 'insensitive' } } : {}),
            ...(neighborhood ? { neighborhood: { contains: neighborhood, mode: 'insensitive' } } : {}),
            ...(street
                ? {
                    OR: [
                        { neighborhood: { contains: street, mode: 'insensitive' } },
                        { commune: { contains: street, mode: 'insensitive' } },
                        { city: { contains: street, mode: 'insensitive' } },
                    ],
                }
                : {}),
            ...(price ? { priceFromFc: price } : {}),
            ...(unit ? { priceUnit: unit } : {}),
            ...(travels == null ? {} : { travels }),
            ...(q
                ? {
                    OR: [
                        { title: { contains: q, mode: 'insensitive' } },
                        { slug: { contains: q, mode: 'insensitive' } },
                        { city: { contains: q, mode: 'insensitive' } },
                        { commune: { contains: q, mode: 'insensitive' } },
                        { neighborhood: { contains: q, mode: 'insensitive' } },
                        { tenant: { name: { contains: q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db_1.prisma.serviceOffering.findMany({
                where,
                include: { tenant: { select: { id: true, name: true } } },
                orderBy: { updatedAt: 'desc' },
                skip,
                take: pageSize,
            }),
            db_1.prisma.serviceOffering.count({ where }),
        ]);
        return res.json({
            items: rows.map((row) => {
                const photos = (0, publicVenue_1.parsePhotoUrls)(row.photos);
                return {
                    id: row.id,
                    slug: row.slug,
                    isPublic: row.isPublic,
                    isBlockedByAdmin: row.isBlockedByAdmin,
                    title: row.title,
                    category: row.category,
                    categoryLabel: (0, publicVenue_1.serviceCategoryLabel)(row.category),
                    city: row.city,
                    commune: row.commune,
                    neighborhood: row.neighborhood,
                    latitude: row.latitude,
                    longitude: row.longitude,
                    coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
                    photos,
                    priceFromFc: row.priceFromFc,
                    priceUnit: row.priceUnit,
                    priceUnitLabel: (0, publicVenue_1.priceUnitLabel)(row.priceUnit),
                    travels: row.travels,
                    publishedAt: row.publishedAt,
                    createdAt: row.createdAt,
                    tenantId: row.tenantId,
                    tenantName: row.tenant.name,
                    href: listingHref('offering', row.slug, row.category),
                };
            }),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
        });
    }
    catch (error) {
        console.error('Erreur catalog offerings admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les prestataires.' });
    }
}
async function listAdminInquiries(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { page, pageSize, skip } = pager(req);
        const q = searchQ(req);
        const status = parseInquiryStatus(req.query.status);
        const where = {
            status,
            ...(q
                ? {
                    OR: [
                        { fromName: { contains: q, mode: 'insensitive' } },
                        { fromEmail: { contains: q, mode: 'insensitive' } },
                        { message: { contains: q, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db_1.prisma.marketplaceInquiry.findMany({
                where,
                include: {
                    listing: {
                        select: {
                            slug: true,
                            headline: true,
                            tenantId: true,
                            tenant: { select: { name: true } },
                            room: { select: { name: true } },
                        },
                    },
                    offering: {
                        select: {
                            slug: true,
                            title: true,
                            category: true,
                            tenantId: true,
                            tenant: { select: { name: true } },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            db_1.prisma.marketplaceInquiry.count({ where }),
        ]);
        return res.json({
            items: rows.map((row) => {
                const vendorTenantId = row.listing?.tenantId || row.offering?.tenantId || null;
                const vendorName = row.listing?.tenant.name || row.offering?.tenant.name || null;
                const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Fiche';
                const slug = row.offering?.slug || row.listing?.slug;
                const kind = row.offeringId ? 'offering' : 'venue';
                return {
                    id: row.id,
                    kind,
                    title,
                    status: row.status,
                    fromName: row.fromName,
                    fromEmail: row.fromEmail,
                    fromPhone: row.fromPhone,
                    message: row.message,
                    eventDate: row.eventDate,
                    guestCount: row.guestCount,
                    createdAt: row.createdAt,
                    vendorTenantId,
                    vendorName,
                    href: slug
                        ? listingHref(kind === 'offering' ? 'offering' : 'venue', slug, row.offering?.category)
                        : null,
                };
            }),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
        });
    }
    catch (error) {
        console.error('Erreur catalog inquiries admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les demandes.' });
    }
}
async function listAdminBookings(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { page, pageSize, skip } = pager(req);
        const q = searchQ(req);
        const status = parseBookingStatus(req.query.status);
        const where = {
            status,
            ...(q
                ? {
                    OR: [
                        { vendorTenant: { name: { contains: q, mode: 'insensitive' } } },
                        { organizerTenant: { name: { contains: q, mode: 'insensitive' } } },
                        { listing: { headline: { contains: q, mode: 'insensitive' } } },
                        { offering: { title: { contains: q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const [rows, total] = await Promise.all([
            db_1.prisma.marketplaceBooking.findMany({
                where,
                include: {
                    listing: { select: { slug: true, headline: true, room: { select: { name: true } } } },
                    offering: { select: { slug: true, title: true, category: true } },
                    vendorTenant: { select: { id: true, name: true } },
                    organizerTenant: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            db_1.prisma.marketplaceBooking.count({ where }),
        ]);
        return res.json({
            items: rows.map((row) => {
                const kind = row.offeringId ? 'offering' : 'venue';
                const slug = row.offering?.slug || row.listing?.slug;
                const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
                return {
                    id: row.id,
                    kind,
                    title,
                    status: row.status,
                    eventDate: row.eventDate,
                    eventEndDate: row.eventEndDate,
                    amountFc: row.amountFc,
                    depositFc: row.depositFc,
                    commissionFc: row.commissionFc,
                    createdAt: row.createdAt,
                    vendorTenantId: row.vendorTenantId,
                    vendorName: row.vendorTenant.name,
                    organizerTenantId: row.organizerTenantId,
                    organizerName: row.organizerTenant?.name || null,
                    href: slug
                        ? listingHref(kind === 'offering' ? 'offering' : 'venue', slug, row.offering?.category)
                        : null,
                };
            }),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
        });
    }
    catch (error) {
        console.error('Erreur catalog bookings admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les réservations.' });
    }
}
function csvEscape(value) {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw))
        return `"${raw.replace(/"/g, '""')}"`;
    return raw;
}
function mapCommissionRow(row) {
    const kind = row.offeringId ? 'offering' : 'venue';
    const slug = row.offering?.slug || row.listing?.slug;
    const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
    return {
        id: row.id,
        kind,
        title,
        status: row.status,
        eventDate: row.eventDate,
        amountFc: row.amountFc,
        commissionRate: row.commissionRate,
        commissionFc: row.commissionFc,
        commissionSettledAt: row.commissionSettledAt,
        createdAt: row.createdAt,
        vendorTenantId: row.vendorTenantId,
        vendorName: row.vendorTenant.name,
        organizerName: row.organizerTenant?.name || null,
        href: slug ? listingHref(kind === 'offering' ? 'offering' : 'venue', slug, row.offering?.category) : null,
    };
}
async function listAdminCommissions(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const q = searchQ(req);
        const settlementRaw = typeof req.query.settlement === 'string' ? req.query.settlement.trim() : 'due';
        const settlementFilter = settlementRaw === 'paid'
            ? { commissionSettledAt: { not: null } }
            : settlementRaw === 'all'
                ? {}
                : { commissionSettledAt: null };
        const where = {
            status: { in: BILLABLE_BOOKING_STATUSES },
            ...settlementFilter,
            ...(q
                ? {
                    OR: [
                        { vendorTenant: { name: { contains: q, mode: 'insensitive' } } },
                        { organizerTenant: { name: { contains: q, mode: 'insensitive' } } },
                        { listing: { headline: { contains: q, mode: 'insensitive' } } },
                        { offering: { title: { contains: q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        };
        const include = {
            listing: { select: { slug: true, headline: true, room: { select: { name: true } } } },
            offering: { select: { slug: true, title: true, category: true } },
            vendorTenant: { select: { id: true, name: true } },
            organizerTenant: { select: { id: true, name: true } },
        };
        if (req.query.export === 'csv') {
            const rows = await db_1.prisma.marketplaceBooking.findMany({
                where,
                include,
                orderBy: { eventDate: 'desc' },
                take: 5000,
            });
            const header = [
                'Date événement',
                'Vendeur',
                'Fiche',
                'Organisateur',
                'Montant FC',
                'Commission FC',
                'Taux',
                'Statut résa',
                'Encaissement',
                'Date encaissement',
            ].join(',');
            const lines = rows.map((row) => {
                const mapped = mapCommissionRow(row);
                return [
                    csvEscape(mapped.eventDate.toISOString().slice(0, 10)),
                    csvEscape(mapped.vendorName),
                    csvEscape(mapped.title),
                    csvEscape(mapped.organizerName),
                    mapped.amountFc,
                    mapped.commissionFc,
                    mapped.commissionRate,
                    csvEscape(mapped.status),
                    mapped.commissionSettledAt ? 'payée' : 'due',
                    csvEscape(mapped.commissionSettledAt ? mapped.commissionSettledAt.toISOString().slice(0, 10) : ''),
                ].join(',');
            });
            const csv = `\uFEFF${header}\n${lines.join('\n')}`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="commissions-marketplace.csv"');
            return res.send(csv);
        }
        const { page, pageSize, skip } = pager(req);
        const [rows, total, sums] = await Promise.all([
            db_1.prisma.marketplaceBooking.findMany({
                where,
                include,
                orderBy: [{ commissionSettledAt: 'asc' }, { eventDate: 'desc' }],
                skip,
                take: pageSize,
            }),
            db_1.prisma.marketplaceBooking.count({ where }),
            db_1.prisma.marketplaceBooking.aggregate({
                where,
                _sum: { commissionFc: true, amountFc: true },
            }),
        ]);
        return res.json({
            items: rows.map(mapCommissionRow),
            total,
            page,
            pageSize,
            hasMore: page * pageSize < total,
            sumCommissionFc: sums._sum.commissionFc || 0,
            sumAmountFc: sums._sum.amountFc || 0,
        });
    }
    catch (error) {
        console.error('Erreur catalog commissions admin:', error);
        return res.status(500).json({ error: 'Impossible de charger les commissions marketplace.' });
    }
}
async function settleMarketplaceCommission(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = String(req.params.id || '');
        const settled = req.body?.settled !== false;
        const booking = await db_1.prisma.marketplaceBooking.findUnique({
            where: { id },
            include: { vendorTenant: { select: { name: true } } },
        });
        if (!booking) {
            return res.status(404).json({ error: 'Réservation introuvable.' });
        }
        if (!BILLABLE_BOOKING_STATUSES.includes(booking.status)) {
            return res.status(400).json({ error: 'La commission n’est due qu’après confirmation de la réservation.' });
        }
        const updated = await db_1.prisma.marketplaceBooking.update({
            where: { id },
            data: {
                commissionSettledAt: settled ? new Date() : null,
                commissionSettledBy: settled ? req.user.id : null,
            },
        });
        await (0, adminAuditService_1.auditReq)(req, {
            action: settled ? 'CATALOG_COMMISSION_SETTLE' : 'CATALOG_COMMISSION_UNSETTLE',
            targetType: 'marketplace_booking',
            targetId: booking.id,
            tenantId: booking.vendorTenantId,
            summary: settled
                ? `Commission marketplace ${booking.commissionFc} FC encaissée — ${booking.vendorTenant.name}`
                : `Commission marketplace ${booking.commissionFc} FC marquée due — ${booking.vendorTenant.name}`,
            metadata: { commissionFc: booking.commissionFc, settled },
        });
        return res.json({
            id: updated.id,
            commissionSettledAt: updated.commissionSettledAt,
            commissionFc: updated.commissionFc,
        });
    }
    catch (error) {
        console.error('Erreur encaissement commission marketplace:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour l’encaissement.' });
    }
}
const MIN_UNPUBLISH_REASON = 8;
function parseVisibilityReason(req) {
    const raw = req.body && typeof req.body === 'object' ? req.body.reason : undefined;
    return typeof raw === 'string' ? raw.trim().slice(0, 500) : '';
}
function parseIsPublicFlag(req) {
    const raw = req.body && typeof req.body === 'object' ? req.body.isPublic : undefined;
    if (typeof raw === 'boolean')
        return raw;
    if (raw === 'true' || raw === '1')
        return true;
    if (raw === 'false' || raw === '0')
        return false;
    return undefined;
}
async function setVenueListingPublic(req, res, isPublic) {
    if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const reason = parseVisibilityReason(req);
    if (!isPublic && reason.length < MIN_UNPUBLISH_REASON) {
        return res.status(400).json({
            error: `Motif obligatoire (${MIN_UNPUBLISH_REASON} caractères min.) pour dépublier une fiche.`,
        });
    }
    const id = req.params.id;
    const listing = await db_1.prisma.venueListing.findUnique({
        where: { id },
        include: { room: { select: { name: true } }, tenant: { select: { name: true } } },
    });
    if (!listing)
        return res.status(404).json({ error: 'Fiche salle introuvable.' });
    const updated = await db_1.prisma.venueListing.update({
        where: { id },
        data: {
            isPublic,
            publishedAt: isPublic ? listing.publishedAt || new Date() : listing.publishedAt,
        },
    });
    const label = listing.headline || listing.room.name;
    await (0, adminAuditService_1.auditReq)(req, {
        action: isPublic ? 'CATALOG_PUBLISH' : 'CATALOG_UNPUBLISH',
        targetType: 'venueListing',
        targetId: listing.id,
        tenantId: listing.tenantId,
        summary: isPublic
            ? `Republication de la salle « ${label} » (${listing.tenant.name})`
            : `Dépublication de la salle « ${label} » (${listing.tenant.name})`,
        metadata: { slug: listing.slug, reason: reason || null, isPublic },
    });
    return res.json({
        id: updated.id,
        isPublic: updated.isPublic,
        message: isPublic ? 'Fiche salle republicée.' : 'Fiche salle dépubliée.',
    });
}
async function setServiceOfferingPublic(req, res, isPublic) {
    if (req.user?.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const reason = parseVisibilityReason(req);
    if (!isPublic && reason.length < MIN_UNPUBLISH_REASON) {
        return res.status(400).json({
            error: `Motif obligatoire (${MIN_UNPUBLISH_REASON} caractères min.) pour dépublier une fiche.`,
        });
    }
    const id = req.params.id;
    const offering = await db_1.prisma.serviceOffering.findUnique({
        where: { id },
        include: { tenant: { select: { name: true } } },
    });
    if (!offering)
        return res.status(404).json({ error: 'Prestation introuvable.' });
    const updated = await db_1.prisma.serviceOffering.update({
        where: { id },
        data: {
            isPublic,
            publishedAt: isPublic ? offering.publishedAt || new Date() : offering.publishedAt,
        },
    });
    await (0, adminAuditService_1.auditReq)(req, {
        action: isPublic ? 'CATALOG_PUBLISH' : 'CATALOG_UNPUBLISH',
        targetType: 'serviceOffering',
        targetId: offering.id,
        tenantId: offering.tenantId,
        summary: isPublic
            ? `Republication de la prestation « ${offering.title} » (${offering.tenant.name})`
            : `Dépublication de la prestation « ${offering.title} » (${offering.tenant.name})`,
        metadata: { slug: offering.slug, reason: reason || null, isPublic },
    });
    return res.json({
        id: updated.id,
        isPublic: updated.isPublic,
        message: isPublic ? 'Prestation republicée.' : 'Prestation dépubliée.',
    });
}
async function setVenueListingVisibility(req, res) {
    try {
        const isPublic = parseIsPublicFlag(req);
        if (isPublic === undefined) {
            return res.status(400).json({ error: 'Indiquez isPublic (true ou false).' });
        }
        return await setVenueListingPublic(req, res, isPublic);
    }
    catch (error) {
        console.error('Erreur visibilité salle admin:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la visibilité.' });
    }
}
async function setServiceOfferingVisibility(req, res) {
    try {
        const isPublic = parseIsPublicFlag(req);
        if (isPublic === undefined) {
            return res.status(400).json({ error: 'Indiquez isPublic (true ou false).' });
        }
        return await setServiceOfferingPublic(req, res, isPublic);
    }
    catch (error) {
        console.error('Erreur visibilité prestation admin:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la visibilité.' });
    }
}
async function unpublishVenueListing(req, res) {
    try {
        return await setVenueListingPublic(req, res, false);
    }
    catch (error) {
        console.error('Erreur unpublish venue admin:', error);
        return res.status(500).json({ error: 'Impossible de dépublier la fiche.' });
    }
}
async function unpublishServiceOffering(req, res) {
    try {
        return await setServiceOfferingPublic(req, res, false);
    }
    catch (error) {
        console.error('Erreur unpublish offering admin:', error);
        return res.status(500).json({ error: 'Impossible de dépublier la prestation.' });
    }
}
async function toggleVendorBlock(req, res) {
    try {
        const { id } = req.params;
        const { isBlocked, reason } = req.body;
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({ error: 'Le champ isBlocked est requis (boolean).' });
        }
        const updated = await db_1.prisma.vendorProfile.update({
            where: { id },
            data: {
                isBlockedByAdmin: isBlocked,
                adminBlockReason: isBlocked ? (typeof reason === 'string' ? reason : 'Non-respect des règles') : null,
            },
        });
        return res.json({ success: true, vendor: updated });
    }
    catch (error) {
        console.error('Erreur toggleVendorBlock admin:', error);
        return res.status(500).json({ error: 'Impossible de bloquer/débloquer le prestataire.' });
    }
}
async function toggleVenueBlock(req, res) {
    try {
        const { id } = req.params;
        const { isBlocked, reason } = req.body;
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({ error: 'Le champ isBlocked est requis (boolean).' });
        }
        const updated = await db_1.prisma.venueListing.update({
            where: { id },
            data: {
                isBlockedByAdmin: isBlocked,
                adminBlockReason: isBlocked ? (typeof reason === 'string' ? reason : 'Non-respect des règles') : null,
            },
        });
        return res.json({ success: true, venue: updated });
    }
    catch (error) {
        console.error('Erreur toggleVenueBlock admin:', error);
        return res.status(500).json({ error: 'Impossible de bloquer/débloquer la salle.' });
    }
}
async function toggleOfferingBlock(req, res) {
    try {
        const { id } = req.params;
        const { isBlocked, reason } = req.body;
        if (typeof isBlocked !== 'boolean') {
            return res.status(400).json({ error: 'Le champ isBlocked est requis (boolean).' });
        }
        const updated = await db_1.prisma.serviceOffering.update({
            where: { id },
            data: {
                isBlockedByAdmin: isBlocked,
                adminBlockReason: isBlocked ? (typeof reason === 'string' ? reason : 'Non-respect des règles') : null,
            },
        });
        return res.json({ success: true, offering: updated });
    }
    catch (error) {
        console.error('Erreur toggleOfferingBlock admin:', error);
        return res.status(500).json({ error: 'Impossible de bloquer/débloquer la prestation.' });
    }
}

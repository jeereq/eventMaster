"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.listBookings = listBookings;
exports.updateBooking = updateBooking;
exports.convertInquiryToBooking = convertInquiryToBooking;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const platformNotificationService_1 = require("../services/platformNotificationService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const plansConfig_1 = require("../config/plansConfig");
const marketplaceBilling_1 = require("../config/marketplaceBilling");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const HOLD_STATUSES = ['REQUESTED', 'ACCEPTED', 'CONFIRMED'];
const bookingInclude = {
    listing: { select: { slug: true, headline: true, roomId: true, address: true, latitude: true, longitude: true, room: { select: { name: true, location: true } } } },
    offering: { select: { slug: true, title: true, category: true } },
    event: { select: { id: true, title: true, date: true } },
    vendorTenant: { select: { id: true, name: true, managerId: true, vendorProfile: { select: { slug: true, displayName: true } } } },
    organizerTenant: { select: { id: true, name: true } },
};
function serializeBooking(row) {
    const kind = row.offeringId ? 'service' : 'venue';
    const title = row.offering?.title || row.listing?.headline || row.listing?.room.name || 'Réservation';
    return {
        id: row.id,
        kind,
        title,
        listingSlug: row.listing?.slug || null,
        offeringSlug: row.offering?.slug || null,
        offeringCategory: row.offering?.category || null,
        vendorTenantId: row.vendorTenantId,
        organizerTenantId: row.organizerTenantId,
        vendorName: row.vendorTenant.vendorProfile?.displayName || row.vendorTenant.name,
        vendorSlug: row.vendorTenant.vendorProfile?.slug || null,
        organizerName: row.organizerTenant?.name || null,
        eventDate: row.eventDate,
        eventEndDate: row.eventEndDate,
        guestCount: row.guestCount,
        amountFc: row.amountFc,
        depositFc: row.depositFc,
        commissionRate: row.commissionRate,
        commissionFc: row.commissionFc,
        status: row.status,
        depositMarkedAt: row.depositMarkedAt,
        notes: row.notes,
        createdAt: row.createdAt,
        event: row.event,
    };
}
async function notifyBookingStatus(booking, message) {
    const title = booking.offering?.title || booking.listing?.headline || booking.listing?.room.name || 'Réservation';
    void (0, platformNotificationService_1.notifyTenantOperators)(booking.vendorTenantId, {
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
        title: `${title}`,
        message,
        metadata: { bookingId: booking.id, href: `${FRONTEND_URL}/dashboard/marketplace` },
    });
    if (booking.organizerUserId) {
        void (0, platformNotificationService_1.notifyUsers)([booking.organizerUserId], {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING_STATUS,
            title: `${title}`,
            message,
            metadata: { bookingId: booking.id, href: `${FRONTEND_URL}/dashboard/bookings` },
        });
    }
}
async function isRangeTaken(params) {
    const start = (0, marketplaceDates_1.parseDateKey)(params.from);
    const end = (0, marketplaceDates_1.parseDateKey)(params.to);
    if (!start || !end)
        return true;
    const rangeStart = new Date(`${params.from <= params.to ? params.from : params.to}T00:00:00.000Z`);
    const rangeEnd = new Date(`${params.from <= params.to ? params.to : params.from}T23:59:59.999Z`);
    const clash = await db_1.prisma.marketplaceBooking.findFirst({
        where: {
            status: { in: HOLD_STATUSES },
            ...(params.listingId ? { listingId: params.listingId } : {}),
            ...(params.offeringId ? { offeringId: params.offeringId } : {}),
            ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
            OR: [
                {
                    eventEndDate: null,
                    eventDate: { gte: rangeStart, lte: rangeEnd },
                },
                {
                    eventEndDate: { not: null },
                    AND: [
                        { eventDate: { lte: rangeEnd } },
                        { eventEndDate: { gte: rangeStart } },
                    ],
                },
            ],
        },
        select: { id: true },
    });
    return Boolean(clash);
}
function parseBookingRange(eventDate, eventEndDate) {
    const from = (0, marketplaceDates_1.toDateKey)(String(eventDate || ''));
    const to = (0, marketplaceDates_1.toDateKey)(String(eventEndDate || eventDate || '')) || from;
    if (!from || !to)
        return null;
    const start = from <= to ? from : to;
    const end = from <= to ? to : from;
    const keys = (0, marketplaceDates_1.eachDateKey)(start, end);
    if (!keys.length || keys.length > 31)
        return null;
    const parsedStart = (0, marketplaceDates_1.parseDateKey)(start);
    const parsedEnd = (0, marketplaceDates_1.parseDateKey)(end);
    if (!parsedStart || !parsedEnd)
        return null;
    return {
        from: start,
        to: end,
        keys,
        parsedStart,
        parsedEnd: start === end ? null : parsedEnd,
        dayCount: keys.length,
    };
}
function formatRangeLabel(from, to) {
    return from === to ? from : `du ${from} au ${to}`;
}
async function createBooking(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(401).json({ error: 'Connectez-vous pour réserver.' });
        }
        const { listingSlug, offeringSlug, eventDate, eventEndDate, guestCount, eventId, notes } = req.body || {};
        const range = parseBookingRange(eventDate, eventEndDate);
        if (!range) {
            return res.status(400).json({ error: 'Indiquez une date, ou une plage de 31 jours maximum.' });
        }
        const listing = listingSlug
            ? await db_1.prisma.venueListing.findFirst({
                where: { slug: String(listingSlug), isPublic: true },
                include: { room: { select: { name: true, location: true } }, tenant: { select: { id: true, name: true, managerId: true } } },
            })
            : null;
        const offering = offeringSlug
            ? await db_1.prisma.serviceOffering.findFirst({
                where: { slug: String(offeringSlug), isPublic: true },
                include: { tenant: { select: { id: true, name: true, managerId: true } } },
            })
            : null;
        if (!listing && !offering) {
            return res.status(404).json({ error: 'Offre introuvable ou non publiée.' });
        }
        const vendorTenantId = listing?.tenantId || offering.tenantId;
        if (vendorTenantId === tenantId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas réserver votre propre offre.' });
        }
        const price = listing?.priceFromFc ?? offering?.priceFromFc;
        if (price == null || price < 0) {
            return res.status(400).json({ error: 'Cette offre n’a pas de tarif. Envoyez d’abord un devis.' });
        }
        const blocked = (0, marketplaceDates_1.parseBlockedDates)(listing?.blockedDates ?? offering?.blockedDates);
        const taken = await isRangeTaken({
            listingId: listing?.id,
            offeringId: offering?.id,
            from: range.from,
            to: range.to,
        });
        if (!(0, marketplaceDates_1.isRangeAvailable)(blocked, range.from, range.to) || taken) {
            return res.status(409).json({ error: 'Une ou plusieurs dates de cette plage ne sont plus disponibles.' });
        }
        let linkedEventId = null;
        if (eventId) {
            const organizer = await db_1.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { accountKind: true },
            });
            if (organizer?.accountKind !== 'CLIENT') {
                const event = await db_1.prisma.event.findFirst({
                    where: { id: String(eventId), tenantId },
                    select: { id: true },
                });
                linkedEventId = event?.id || null;
            }
        }
        const amounts = (0, marketplaceBilling_1.billedMarketplaceAmount)(price, listing?.priceUnit ?? offering?.priceUnit, range.dayCount);
        const parsedGuests = Number.parseInt(String(guestCount || ''), 10);
        const inquiryCandidates = await db_1.prisma.marketplaceInquiry.findMany({
            where: {
                fromTenantId: tenantId,
                ...(listing ? { listingId: listing.id } : { offeringId: offering.id }),
            },
            orderBy: { createdAt: 'desc' },
            take: 15,
            select: { id: true, eventId: true },
        });
        const takenInquiries = inquiryCandidates.length
            ? await db_1.prisma.marketplaceBooking.findMany({
                where: { inquiryId: { in: inquiryCandidates.map((row) => row.id) } },
                select: { inquiryId: true },
            })
            : [];
        const takenInquiryIds = new Set(takenInquiries.map((row) => row.inquiryId).filter(Boolean));
        const openInquiries = inquiryCandidates.filter((row) => !takenInquiryIds.has(row.id));
        const linkedInquiryId = (linkedEventId ? openInquiries.find((row) => row.eventId === linkedEventId)?.id : null)
            || openInquiries.find((row) => !row.eventId)?.id
            || (!linkedEventId ? openInquiries[0]?.id : null)
            || null;
        const booking = await db_1.prisma.marketplaceBooking.create({
            data: {
                listingId: listing?.id || null,
                offeringId: offering?.id || null,
                inquiryId: linkedInquiryId,
                vendorTenantId,
                organizerTenantId: tenantId,
                organizerUserId: userId,
                eventId: linkedEventId,
                eventDate: range.parsedStart,
                eventEndDate: range.parsedEnd,
                guestCount: Number.isFinite(parsedGuests) && parsedGuests > 0 ? parsedGuests : null,
                ...amounts,
                notes: notes ? String(notes).trim().slice(0, 2000) : null,
            },
            include: bookingInclude,
        });
        const title = offering?.title || listing?.headline || listing?.room.name || 'Offre';
        const period = formatRangeLabel(range.from, range.to);
        const vendorHref = `${FRONTEND_URL}/dashboard/marketplace`;
        const organizerHref = `${FRONTEND_URL}/dashboard/bookings`;
        const vendorMessage = `Demande ${period}. Montant ${amounts.amountFc} FC, acompte ${amounts.depositFc} FC.`;
        void (0, platformNotificationService_1.notifyTenantOperators)(vendorTenantId, {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
            title: `Réservation — ${title}`,
            message: vendorMessage,
            metadata: {
                bookingId: booking.id,
                href: vendorHref,
            },
            whatsapp: `Nouvelle réservation ${period} pour « ${title} ». Montant ${amounts.amountFc} FC, acompte ${amounts.depositFc} FC.`,
        });
        void (0, platformNotificationService_1.notifyUsers)([userId], {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MARKETPLACE_BOOKING,
            title: `Demande envoyée — ${title}`,
            message: `Votre réservation ${period} a été transmise.`,
            metadata: {
                bookingId: booking.id,
                href: organizerHref,
            },
        });
        return res.status(201).json({
            booking: serializeBooking(booking),
            message: 'Demande de réservation envoyée. Le professionnel doit l’accepter, puis l’acompte sera marqué hors plateforme.',
        });
    }
    catch (error) {
        console.error('createBooking:', error);
        return res.status(500).json({ error: 'Impossible de créer la réservation.' });
    }
}
async function listBookings(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const role = req.query.role === 'organizer' ? 'organizer' : req.query.role === 'vendor' ? 'vendor' : 'all';
        const where = role === 'vendor'
            ? { vendorTenantId: tenantId }
            : role === 'organizer'
                ? { organizerTenantId: tenantId }
                : { OR: [{ vendorTenantId: tenantId }, { organizerTenantId: tenantId }] };
        const rows = await db_1.prisma.marketplaceBooking.findMany({
            where,
            include: bookingInclude,
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        const commissionDue = rows
            .filter((b) => b.vendorTenantId === tenantId && (b.status === 'CONFIRMED' || b.status === 'COMPLETED'))
            .reduce((sum, b) => sum + b.commissionFc, 0);
        return res.json({
            bookings: rows.map((row) => ({
                ...serializeBooking(row),
                viewerRole: row.vendorTenantId === tenantId ? 'vendor' : 'organizer',
            })),
            commissionDueFc: commissionDue,
            commissionRate: 0.08,
        });
    }
    catch (error) {
        console.error('listBookings:', error);
        return res.status(500).json({ error: 'Impossible de charger les réservations.' });
    }
}
async function updateBooking(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const id = req.params.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const booking = await db_1.prisma.marketplaceBooking.findFirst({
            where: { id, OR: [{ vendorTenantId: tenantId }, { organizerTenantId: tenantId }] },
            include: {
                listing: { include: { room: true } },
                offering: true,
                vendorTenant: { select: { id: true, name: true, managerId: true } },
                organizerTenant: { select: { id: true, name: true } },
            },
        });
        if (!booking)
            return res.status(404).json({ error: 'Réservation introuvable.' });
        const isVendor = booking.vendorTenantId === tenantId;
        const isOrganizer = booking.organizerTenantId === tenantId;
        const action = String(req.body?.action || '');
        if (action === 'accept') {
            if (!isVendor)
                return res.status(403).json({ error: 'Seul le professionnel peut accepter.' });
            if (booking.status !== 'REQUESTED')
                return res.status(400).json({ error: 'Cette demande n’est plus en attente.' });
            const amountFc = req.body?.amountFc != null ? Number.parseInt(String(req.body.amountFc), 10) : booking.amountFc;
            if (!Number.isFinite(amountFc) || amountFc < 0)
                return res.status(400).json({ error: 'Montant invalide.' });
            const amounts = (0, marketplaceBilling_1.computeMarketplaceAmounts)(amountFc);
            const updated = await db_1.prisma.marketplaceBooking.update({
                where: { id },
                data: { status: 'ACCEPTED', ...amounts },
                include: bookingInclude,
            });
            void notifyBookingStatus({ ...booking, organizerUserId: booking.organizerUserId }, 'Réservation acceptée. En attente de l’acompte.');
            return res.json({ booking: serializeBooking(updated), message: 'Réservation acceptée. En attente de l’acompte.' });
        }
        if (action === 'decline' || action === 'cancel') {
            if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
                return res.status(400).json({ error: 'Une réservation confirmée ne peut plus être annulée ici.' });
            }
            if (!isVendor && !isOrganizer)
                return res.status(403).json({ error: 'Accès refusé.' });
            const updated = await db_1.prisma.marketplaceBooking.update({
                where: { id },
                data: { status: 'CANCELLED' },
                include: bookingInclude,
            });
            void notifyBookingStatus(booking, 'Réservation annulée.');
            return res.json({ booking: serializeBooking(updated), message: 'Réservation annulée.' });
        }
        if (action === 'mark-deposit') {
            if (booking.status !== 'ACCEPTED') {
                return res.status(400).json({ error: 'Acceptez d’abord la réservation.' });
            }
            if (!isVendor && !isOrganizer)
                return res.status(403).json({ error: 'Accès refusé.' });
            const updated = await db_1.prisma.marketplaceBooking.update({
                where: { id },
                data: { depositMarkedAt: new Date() },
                include: bookingInclude,
            });
            return res.json({ booking: serializeBooking(updated), message: 'Acompte marqué. Confirmez pour bloquer la date.' });
        }
        if (action === 'confirm') {
            if (!isVendor)
                return res.status(403).json({ error: 'Seul le professionnel peut confirmer.' });
            if (booking.status !== 'ACCEPTED')
                return res.status(400).json({ error: 'La réservation doit être acceptée.' });
            if (!booking.depositMarkedAt) {
                return res.status(400).json({ error: 'Marquez d’abord l’acompte comme reçu.' });
            }
            const dateKeys = (0, marketplaceDates_1.eachDateKey)((0, marketplaceDates_1.toDateKey)(booking.eventDate) || '', (0, marketplaceDates_1.toDateKey)(booking.eventEndDate || booking.eventDate) || (0, marketplaceDates_1.toDateKey)(booking.eventDate) || '');
            let eventId = booking.eventId;
            const attachEvent = req.body?.attachEvent !== false;
            if (booking.listing && booking.organizerTenantId && attachEvent) {
                const organizer = await db_1.prisma.tenant.findUnique({
                    where: { id: booking.organizerTenantId },
                    include: { _count: { select: { events: true } } },
                });
                if (organizer?.accountKind !== 'CLIENT') {
                    if (eventId) {
                        await db_1.prisma.event.update({
                            where: { id: eventId },
                            data: {
                                roomId: booking.listing.roomId,
                                location: booking.listing.address || booking.listing.room.location || undefined,
                                latitude: booking.listing.latitude ?? undefined,
                                longitude: booking.listing.longitude ?? undefined,
                                date: booking.eventDate,
                            },
                        });
                    }
                    else {
                        const limits = organizer ? (0, plansConfig_1.getPlanLimitsForTenant)(organizer.plan, organizer.accountKind) : null;
                        if (organizer && limits && organizer._count.events < limits.maxEvents) {
                            const created = await db_1.prisma.event.create({
                                data: {
                                    tenantId: booking.organizerTenantId,
                                    title: `Réservation — ${booking.listing.headline || booking.listing.room.name}`,
                                    date: booking.eventDate,
                                    location: booking.listing.address || booking.listing.room.location || booking.listing.room.name,
                                    latitude: booking.listing.latitude,
                                    longitude: booking.listing.longitude,
                                    roomId: booking.listing.roomId,
                                },
                            });
                            eventId = created.id;
                        }
                    }
                }
            }
            if (dateKeys.length) {
                if (booking.listingId) {
                    const listing = await db_1.prisma.venueListing.findUnique({ where: { id: booking.listingId }, select: { blockedDates: true } });
                    await db_1.prisma.venueListing.update({
                        where: { id: booking.listingId },
                        data: { blockedDates: (0, marketplaceDates_1.mergeBlockedDates)(listing?.blockedDates, dateKeys) },
                    });
                }
                if (booking.offeringId) {
                    const offering = await db_1.prisma.serviceOffering.findUnique({ where: { id: booking.offeringId }, select: { blockedDates: true } });
                    await db_1.prisma.serviceOffering.update({
                        where: { id: booking.offeringId },
                        data: { blockedDates: (0, marketplaceDates_1.mergeBlockedDates)(offering?.blockedDates, dateKeys) },
                    });
                }
            }
            const updated = await db_1.prisma.marketplaceBooking.update({
                where: { id },
                data: { status: 'CONFIRMED', eventId },
                include: bookingInclude,
            });
            notifyBookingStatus(updated, `Réservation confirmée pour « ${updated.offering?.title || updated.listing?.headline || updated.listing?.room.name} ».`);
            return res.json({
                booking: serializeBooking(updated),
                message: eventId
                    ? 'Réservation confirmée. La salle a été rattachée à l’événement.'
                    : 'Réservation confirmée. Date bloquée au calendrier.',
            });
        }
        return res.status(400).json({ error: 'Action inconnue.' });
    }
    catch (error) {
        console.error('updateBooking:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la réservation.' });
    }
}
async function convertInquiryToBooking(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const inquiryId = req.params.id;
        if (!tenantId || !userId)
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageRooms)
            return res.status(403).json({ error: 'Accès refusé.' });
        const inquiry = await db_1.prisma.marketplaceInquiry.findFirst({
            where: {
                id: inquiryId,
                OR: [{ listing: { tenantId } }, { offering: { tenantId } }],
            },
            include: {
                listing: true,
                offering: true,
            },
        });
        if (!inquiry)
            return res.status(404).json({ error: 'Demande introuvable.' });
        if (!inquiry.eventDate) {
            return res.status(400).json({ error: 'La demande n’a pas de date. Demandez-la au client avant de réserver.' });
        }
        const existing = await db_1.prisma.marketplaceBooking.findUnique({ where: { inquiryId } });
        if (existing)
            return res.status(409).json({ error: 'Une réservation existe déjà pour cette demande.' });
        const price = inquiry.listing?.priceFromFc ?? inquiry.offering?.priceFromFc;
        if (price == null)
            return res.status(400).json({ error: 'Ajoutez un tarif sur l’offre avant de convertir.' });
        const dateKey = (0, marketplaceDates_1.toDateKey)(inquiry.eventDate);
        const blocked = (0, marketplaceDates_1.parseBlockedDates)(inquiry.listing?.blockedDates ?? inquiry.offering?.blockedDates);
        if (!dateKey
            || !(0, marketplaceDates_1.isRangeAvailable)(blocked, dateKey, dateKey)
            || await isRangeTaken({ listingId: inquiry.listingId, offeringId: inquiry.offeringId, from: dateKey, to: dateKey })) {
            return res.status(409).json({ error: 'Cette date n’est plus disponible.' });
        }
        const amounts = (0, marketplaceBilling_1.computeMarketplaceAmounts)(price);
        const booking = await db_1.prisma.marketplaceBooking.create({
            data: {
                listingId: inquiry.listingId,
                offeringId: inquiry.offeringId,
                inquiryId: inquiry.id,
                vendorTenantId: tenantId,
                organizerTenantId: inquiry.fromTenantId,
                eventId: inquiry.eventId,
                eventDate: inquiry.eventDate,
                guestCount: inquiry.guestCount,
                notes: inquiry.message,
                ...amounts,
                status: 'ACCEPTED',
            },
            include: bookingInclude,
        });
        await db_1.prisma.marketplaceInquiry.update({
            where: { id: inquiry.id },
            data: { status: 'CONTACTED' },
        });
        return res.status(201).json({
            booking: serializeBooking(booking),
            message: 'Demande convertie en réservation acceptée. Marquez l’acompte puis confirmez.',
        });
    }
    catch (error) {
        console.error('convertInquiryToBooking:', error);
        return res.status(500).json({ error: 'Impossible de convertir la demande.' });
    }
}

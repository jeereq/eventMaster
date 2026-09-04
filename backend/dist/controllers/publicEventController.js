"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicEvents = listPublicEvents;
exports.getPublicEvent = getPublicEvent;
exports.listPublicEventSeats = listPublicEventSeats;
exports.checkoutPublicEvent = checkoutPublicEvent;
exports.getTicketOrderBySession = getTicketOrderBySession;
const db_1 = require("../db");
const ticketOrderService_1 = require("../services/ticketOrderService");
const seatSelectionService_1 = require("../services/seatSelectionService");
const ticketPricingService_1 = require("../services/ticketPricingService");
const plansConfig_1 = require("../config/plansConfig");
const publicVenue_1 = require("../utils/publicVenue");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const rdcCities_1 = require("../utils/rdcCities");
const platformSettingsService_1 = require("../services/platformSettingsService");
const prismaJson_1 = require("../utils/prismaJson");
const flexPayCardService_1 = require("../services/flexPayCardService");
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
function serializePublicPost(post) {
    let media = [];
    if (Array.isArray(post.mediaUrls)) {
        media = post.mediaUrls.flatMap((item) => {
            const url = item && typeof item === 'object' && 'url' in item ? String(item.url || '') : '';
            if (!url || !/^https?:\/\//i.test(url))
                return [];
            const type = item && typeof item === 'object' && item.type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
            return [{ url, type: type }];
        });
    }
    else if (post.mediaUrl && /^https?:\/\//i.test(post.mediaUrl)) {
        media = [{ url: post.mediaUrl, type: post.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE' }];
    }
    return {
        id: post.id,
        content: post.content,
        media,
        createdAt: post.createdAt,
    };
}
function serializePublicEvent(event) {
    const remaining = (0, ticketOrderService_1.ticketsRemaining)(event);
    const pricingMode = (0, ticketPricingService_1.normalizeTicketPricingMode)(event.ticketPricingMode);
    const pricingZones = (0, ticketPricingService_1.pricingZonesFromPlan)(event.tablePlan);
    const onlinePayments = (0, platformSettingsService_1.isOnlinePaymentsEnabled)();
    const paid = onlinePayments &&
        event.ticketingEnabled &&
        (event.ticketPriceFc > 0 || (pricingMode === 'by_zone' && pricingZones.some((z) => z.priceFc > 0)));
    const photos = (0, publicVenue_1.parsePhotoUrls)(event.photos);
    const plan = event.tablePlan;
    const hasTablePlan = Boolean(plan?.tables && plan.tables.length > 0);
    const priceFromFc = (0, ticketPricingService_1.priceFromFcForEvent)(event);
    return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        description: event.description,
        date: event.date,
        location: event.location,
        latitude: event.latitude,
        longitude: event.longitude,
        orgName: event.tenant.name,
        ticketingEnabled: event.ticketingEnabled,
        ticketPriceFc: event.ticketPriceFc,
        ticketPricingMode: pricingMode,
        priceFromFc,
        pricingZones: pricingMode === 'by_zone' ? pricingZones : [],
        onlinePaymentsEnabled: onlinePayments,
        paid,
        ticketsTotal: event.ticketsTotal,
        ticketsSold: event.ticketsSold,
        ticketsRemaining: remaining,
        soldOut: remaining === 0,
        seatSelectionEnabled: Boolean(event.seatSelectionEnabled) && hasTablePlan,
        eventProgram: event.eventProgram ?? null,
        photos,
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        posts: (event.posts || []).map(serializePublicPost),
    };
}
async function listPublicEvents(req, res) {
    try {
        const q = String(req.query.q || '').trim();
        const enabledCities = (0, rdcCities_1.enabledMarketplaceCities)();
        const requestedCity = (0, rdcCities_1.normalizeAllowedCity)(req.query.city) || '';
        const city = requestedCity && enabledCities.includes(requestedCity) ? requestedCity : '';
        const commune = String(req.query.commune || '').trim();
        const neighborhood = String(req.query.neighborhood || '').trim();
        const street = String(req.query.street || '').trim();
        const entry = String(req.query.entry || '').trim();
        const minPrice = Number.parseInt(String(req.query.minPrice || ''), 10);
        const maxPrice = Number.parseInt(String(req.query.maxPrice || ''), 10);
        const fromKey = (0, marketplaceDates_1.toDateKey)(String(req.query.availableFrom || ''));
        const toKey = (0, marketplaceDates_1.toDateKey)(String(req.query.availableTo || ''));
        const lat = Number(req.query.lat);
        const lng = Number(req.query.lng);
        const radiusKm = Number(req.query.radiusKm);
        const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;
        const dateFrom = fromKey ? new Date(`${fromKey}T00:00:00.000Z`) : null;
        const dateTo = toKey ? new Date(`${toKey}T23:59:59.999Z`) : null;
        const locationBits = [city, commune, neighborhood, street].filter(Boolean);
        const priceFilter = {};
        if (entry === 'paid')
            priceFilter.gt = 0;
        if (Number.isFinite(minPrice) && minPrice >= 0)
            priceFilter.gte = minPrice;
        if (Number.isFinite(maxPrice) && maxPrice >= 0)
            priceFilter.lte = maxPrice;
        const events = await db_1.prisma.event.findMany({
            where: {
                isPublic: true,
                isBlockedByAdmin: false,
                slug: { not: null },
                date: {
                    gte: dateFrom || new Date(Date.now() - 12 * 60 * 60 * 1000),
                    ...(dateTo ? { lte: dateTo } : {}),
                },
                ...(entry === 'free' ? { OR: [{ ticketingEnabled: false }, { ticketPriceFc: { lte: 0 } }] } : {}),
                ...(entry === 'paid' ? { ticketingEnabled: true } : {}),
                ...(Object.keys(priceFilter).length ? { ticketPriceFc: priceFilter } : {}),
                ...((q || locationBits.length)
                    ? {
                        AND: [
                            ...(q
                                ? [{
                                        OR: [
                                            { title: { contains: q, mode: 'insensitive' } },
                                            { location: { contains: q, mode: 'insensitive' } },
                                            { description: { contains: q, mode: 'insensitive' } },
                                            { tenant: { name: { contains: q, mode: 'insensitive' } } },
                                        ],
                                    }]
                                : []),
                            ...locationBits.map((bit) => ({
                                location: { contains: bit, mode: 'insensitive' },
                            })),
                        ],
                    }
                    : {}),
            },
            include: { tenant: { select: { name: true } } },
            orderBy: { date: 'asc' },
            take: hasGeo || locationBits.length ? 200 : 80,
        });
        const filtered = events.filter((event) => {
            if (city && event.latitude != null && event.longitude != null && !(0, rdcCities_1.pointInCityBounds)(event.latitude, event.longitude, city)) {
                return false;
            }
            if (!city && enabledCities.length) {
                const loc = String(event.location || '').toLowerCase();
                const inEnabled = enabledCities.some((name) => {
                    if (event.latitude != null && event.longitude != null) {
                        return (0, rdcCities_1.pointInCityBounds)(event.latitude, event.longitude, name);
                    }
                    return loc.includes(name.toLowerCase());
                });
                if (!inEnabled && (event.latitude != null || loc))
                    return false;
            }
            if (hasGeo) {
                if (event.latitude == null || event.longitude == null)
                    return false;
                if ((0, marketplaceDates_1.haversineKm)(lat, lng, event.latitude, event.longitude) > Math.min(80, radiusKm))
                    return false;
            }
            return true;
        });
        return res.json({ events: filtered.map(serializePublicEvent) });
    }
    catch (error) {
        console.error('[Public events] list', error);
        return res.status(500).json({ error: 'Impossible de charger les événements publics.' });
    }
}
async function getPublicEvent(req, res) {
    try {
        const slug = String(req.params.slug || '');
        const event = await db_1.prisma.event.findFirst({
            where: { slug, isPublic: true, isBlockedByAdmin: false },
            include: {
                tenant: { select: { name: true } },
                posts: {
                    where: { publishedOnListing: true },
                    orderBy: { createdAt: 'desc' },
                    take: 12,
                    select: { id: true, content: true, mediaUrl: true, mediaUrls: true, mediaType: true, createdAt: true },
                },
            },
        });
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable ou privé.' });
        return res.json({ event: serializePublicEvent(event) });
    }
    catch (error) {
        console.error('[Public events] get', error);
        return res.status(500).json({ error: 'Impossible de charger l’événement.' });
    }
}
async function listPublicEventSeats(req, res) {
    try {
        const slug = String(req.params.slug || '');
        const event = await db_1.prisma.event.findFirst({
            where: { slug, isPublic: true, isBlockedByAdmin: false },
            select: { id: true, seatSelectionEnabled: true, tablePlan: true },
        });
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable ou privé.' });
        if (!event.seatSelectionEnabled) {
            return res.status(400).json({ error: 'Sélection de siège non activée.' });
        }
        const inventory = await (0, seatSelectionService_1.listSeatInventory)(event.id);
        return res.json(inventory);
    }
    catch (error) {
        console.error('[Public events] seats', error);
        return res.status(500).json({ error: 'Impossible de charger les places.' });
    }
}
async function checkoutPublicEvent(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Connectez-vous pour réserver ou vous inscrire.' });
        }
        const slug = String(req.params.slug || '');
        const account = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true, name: true, phone: true },
        });
        if (!account) {
            return res.status(401).json({ error: 'Connectez-vous pour réserver ou vous inscrire.' });
        }
        const buyerEmail = account.email.trim().toLowerCase();
        const buyerName = String(req.body?.buyerName || account.name || '').trim();
        const buyerPhone = String(req.body?.buyerPhone || account.phone || '').trim() || null;
        let quantity = 1;
        const tableId = req.body?.tableId ? String(req.body.tableId) : null;
        const seatIndexRaw = req.body?.seatIndex;
        const seatIndex = seatIndexRaw === 0 || seatIndexRaw === '0'
            ? 0
            : seatIndexRaw != null && seatIndexRaw !== ''
                ? Number(seatIndexRaw)
                : null;
        const userId = account.id;
        if (!buyerName || !buyerEmail || !buyerEmail.includes('@')) {
            return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { slug, isPublic: true, isBlockedByAdmin: false },
            include: { tenant: { select: { plan: true, accountKind: true } } },
        });
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable ou privé.' });
        if (new Date(event.date).getTime() < Date.now()) {
            return res.status(400).json({ error: 'Cet événement est déjà passé.' });
        }
        const bodyPricingZoneId = req.body?.pricingZoneId ? String(req.body.pricingZoneId) : null;
        let requestedSeats = [];
        if (Array.isArray(req.body?.seats) && req.body.seats.length > 0) {
            requestedSeats = req.body.seats
                .map((s) => ({
                tableId: String(s.tableId || ''),
                seatIndex: Number(s.seatIndex),
            }))
                .filter((s) => s.tableId && Number.isFinite(s.seatIndex) && s.seatIndex >= 0);
        }
        else if (tableId && seatIndex != null && Number.isFinite(seatIndex) && seatIndex >= 0) {
            requestedSeats = [{ tableId, seatIndex }];
        }
        if (event.seatSelectionEnabled) {
            if (requestedSeats.length === 0) {
                return res.status(400).json({ error: 'Sélectionnez au moins une place sur le plan.' });
            }
            if (requestedSeats.length > 8) {
                return res.status(400).json({ error: 'Vous pouvez réserver au maximum 8 places à la fois.' });
            }
            const seen = new Set();
            for (const s of requestedSeats) {
                const key = `${s.tableId}:${s.seatIndex}`;
                if (seen.has(key)) {
                    return res.status(400).json({ error: 'Vous avez sélectionné plusieurs fois le même siège.' });
                }
                seen.add(key);
            }
            quantity = requestedSeats.length;
        }
        else {
            quantity = Math.min(8, Math.max(1, Number(req.body?.quantity) || 1));
        }
        const pricingMode = (0, ticketPricingService_1.normalizeTicketPricingMode)(event.ticketPricingMode);
        let unitPriceFc = 0;
        let amountFc = 0;
        let pricingZoneId = null;
        let seatsWithPricing = [];
        try {
            if (event.seatSelectionEnabled) {
                let sum = 0;
                seatsWithPricing = requestedSeats.map((s) => {
                    if (pricingMode === 'by_zone') {
                        const resolved = (0, ticketPricingService_1.resolveSeatPrice)(event, s.tableId, s.seatIndex);
                        sum += resolved.priceFc;
                        return {
                            tableId: s.tableId,
                            seatIndex: s.seatIndex,
                            priceFc: resolved.priceFc,
                            pricingZoneId: resolved.pricingZoneId,
                            pricingZoneName: resolved.pricingZoneName,
                        };
                    }
                    else {
                        const price = Math.max(0, event.ticketPriceFc);
                        sum += price;
                        return {
                            tableId: s.tableId,
                            seatIndex: s.seatIndex,
                            priceFc: price,
                            pricingZoneId: null,
                            pricingZoneName: null,
                        };
                    }
                });
                amountFc = sum;
                unitPriceFc = quantity > 0 ? Math.round(sum / quantity) : 0;
                pricingZoneId = seatsWithPricing[0]?.pricingZoneId || null;
            }
            else if (pricingMode === 'by_zone') {
                if (!bodyPricingZoneId) {
                    return res.status(400).json({ error: 'Choisissez une zone tarifaire.' });
                }
                const resolved = (0, ticketPricingService_1.resolveZoneTicketPrice)(event, bodyPricingZoneId);
                unitPriceFc = resolved.priceFc;
                pricingZoneId = resolved.pricingZoneId;
                amountFc = unitPriceFc * quantity;
            }
            else {
                unitPriceFc = Math.max(0, event.ticketPriceFc);
                amountFc = unitPriceFc * quantity;
            }
        }
        catch (err) {
            return res.status(400).json({ error: err?.message || 'Tarif invalide.' });
        }
        const remaining = (0, ticketOrderService_1.ticketsRemaining)(event);
        if (remaining != null && remaining < quantity) {
            return res.status(400).json({
                error: remaining === 0 ? 'Complet.' : `Il ne reste que ${remaining} place${remaining > 1 ? 's' : ''}.`,
            });
        }
        const guestCount = await db_1.prisma.guest.count({ where: { event: { tenantId: event.tenantId } } });
        const limits = (0, plansConfig_1.getPlanLimitsForTenant)(event.tenant.plan, event.tenant.accountKind);
        if (guestCount + quantity > limits.maxGuests) {
            return res.status(403).json({ error: 'Plus de places du côté de l’organisateur (quota atteint).' });
        }
        const existing = await db_1.prisma.guest.findUnique({
            where: { eventId_email: { eventId: event.id, email: buyerEmail } },
        });
        if (existing) {
            return res.status(400).json({ error: 'Cet e-mail a déjà une inscription pour cet événement.' });
        }
        const paid = event.ticketingEnabled && amountFc > 0 && (0, platformSettingsService_1.isOnlinePaymentsEnabled)();
        if (!paid)
            amountFc = 0;
        const rawMethod = String(req.body?.paymentMethod || 'card').toLowerCase();
        const paymentMethod = rawMethod === 'mobile' ? 'mobile' : 'card';
        const paymentProvider = paid
            ? (paymentMethod === 'mobile' ? 'flexpay_mobile' : 'flexpay_card')
            : null;
        const order = await db_1.prisma.ticketOrder.create({
            data: {
                eventId: event.id,
                buyerName,
                buyerEmail,
                buyerPhone,
                quantity,
                amountFc,
                unitPriceFc: paid ? unitPriceFc : null,
                pricingZoneId,
                status: paid ? 'PENDING' : 'PAID',
                paidAt: paid ? null : new Date(),
                paymentProvider,
                userId,
                tableId: requestedSeats[0]?.tableId || null,
                seatIndex: requestedSeats[0]?.seatIndex ?? null,
                selectedSeats: seatsWithPricing.length > 0 ? (0, prismaJson_1.toPrismaJson)(seatsWithPricing) : undefined,
            },
        });
        if (event.seatSelectionEnabled && requestedSeats.length > 0) {
            try {
                await (0, seatSelectionService_1.createMultipleSeatHolds)({
                    eventId: event.id,
                    seats: requestedSeats,
                    buyerEmail,
                    orderId: order.id,
                });
            }
            catch (err) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                return res.status(409).json({ error: err?.message || 'Un ou plusieurs sièges sélectionnés sont indisponibles.' });
            }
        }
        if (!paid) {
            const fulfilled = await (0, ticketOrderService_1.fulfillTicketOrder)(order.id);
            const primary = fulfilled?.guests?.find((g) => g.email.toLowerCase() === buyerEmail) || fulfilled?.guests?.[0];
            return res.status(201).json({
                paid: false,
                orderId: order.id,
                guestId: primary?.id,
                rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
                message: 'Inscription confirmée. Conservez le lien de votre badge QR.',
            });
        }
        if (paymentProvider === 'flexpay_card' || paymentProvider === 'flexpay_mobile') {
            if (!(0, flexPayCardService_1.isFlexPayCardConfigured)()) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                return res.status(503).json({
                    error: 'Paiements FlexPay non configurés. Réessayez plus tard ou contactez le support.',
                });
            }
            if (paymentProvider === 'flexpay_mobile') {
                const phone = String(req.body?.phone || buyerPhone || '').trim();
                if (!phone) {
                    await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                    return res.status(400).json({ error: 'Numéro Mobile Money requis (243…).' });
                }
                const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
                const reference = (0, flexPayCardService_1.buildFlexPayReference)('tk', order.id);
                try {
                    const flex = await (0, flexPayCardService_1.createFlexPayMobileCheckout)({
                        reference,
                        amount: amountFc,
                        currency: 'CDF',
                        phone,
                        callbackUrl: `${apiBase}/api/public/payments/flexpay/callback`,
                    });
                    await db_1.prisma.ticketOrder.update({
                        where: { id: order.id },
                        data: {
                            paymentProvider: 'flexpay_mobile',
                            flexPayOrderNumber: flex.orderNumber,
                            flexPayReference: reference,
                        },
                    });
                    return res.json({
                        paid: false,
                        mock: false,
                        provider: 'flexpay_mobile',
                        orderId: order.id,
                        orderNumber: flex.orderNumber,
                        message: 'Demande envoyée sur votre téléphone. Confirmez le paiement Mobile Money, puis ouvrez la page de succès.',
                    });
                }
                catch (err) {
                    await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                    return res.status(502).json({
                        error: err?.message || 'Impossible d’ouvrir le paiement Mobile Money FlexPay.',
                    });
                }
            }
            const apiBase = (0, flexPayCardService_1.getPublicApiBaseUrl)();
            const reference = (0, flexPayCardService_1.buildFlexPayReference)('tk', order.id);
            try {
                const flex = await (0, flexPayCardService_1.createFlexPayCardCheckout)({
                    reference,
                    amount: amountFc,
                    currency: 'CDF',
                    description: `${event.title} — ${quantity} billet${quantity > 1 ? 's' : ''}`.slice(0, 200),
                    callbackUrl: `${apiBase}/api/public/payments/flexpay/callback`,
                    approveUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=approve`,
                    cancelUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=cancel`,
                    declineUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=decline`,
                    language: 'fr',
                });
                await db_1.prisma.ticketOrder.update({
                    where: { id: order.id },
                    data: {
                        paymentProvider: 'flexpay_card',
                        flexPayOrderNumber: flex.orderNumber,
                        flexPayReference: reference,
                    },
                });
                return res.json({
                    paid: true,
                    mock: false,
                    provider: 'flexpay_card',
                    orderId: order.id,
                    checkoutUrl: flex.redirectUrl,
                });
            }
            catch (err) {
                await db_1.prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
                return res.status(502).json({
                    error: err?.message || 'Impossible d’ouvrir le paiement FlexPay.',
                });
            }
        }
        return res.status(400).json({ error: 'Mode de paiement non supporté. Utilisez Visa ou Mobile Money.' });
    }
    catch (error) {
        console.error('[Public events] checkout', error);
        return res.status(500).json({ error: error?.message || 'Inscription impossible.' });
    }
}
async function getTicketOrderBySession(req, res) {
    try {
        const sessionId = String(req.params.sessionId || '');
        if (!sessionId)
            return res.status(400).json({ error: 'Session manquante.' });
        const order = await db_1.prisma.ticketOrder.findFirst({
            where: {
                OR: [{ stripeCheckoutSessionId: sessionId }, { id: sessionId }, { flexPayOrderNumber: sessionId }],
            },
            include: {
                event: { select: { title: true, slug: true, date: true, location: true } },
                guests: { select: { id: true, email: true, firstName: true } },
            },
        });
        if (!order)
            return res.status(404).json({ error: 'Commande introuvable.' });
        const primary = order.guests[0];
        return res.json({
            status: order.status,
            paid: order.status === 'PAID',
            quantity: order.quantity,
            amountFc: order.amountFc,
            event: order.event,
            guestId: primary?.id,
            rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
            guests: order.guests.map((g) => ({
                id: g.id,
                firstName: g.firstName,
                email: g.email,
                rsvpUrl: `${FRONTEND_URL}/rsvp/${g.id}`,
            })),
        });
    }
    catch (error) {
        console.error('[Public events] session', error);
        return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
    }
}

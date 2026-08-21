"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicEvents = listPublicEvents;
exports.getPublicEvent = getPublicEvent;
exports.checkoutPublicEvent = checkoutPublicEvent;
exports.getTicketOrderBySession = getTicketOrderBySession;
const stripe_1 = __importDefault(require("stripe"));
const db_1 = require("../db");
const ticketOrderService_1 = require("../services/ticketOrderService");
const plansConfig_1 = require("../config/plansConfig");
const publicVenue_1 = require("../utils/publicVenue");
const marketplaceDates_1 = require("../utils/marketplaceDates");
const rdcCities_1 = require("../utils/rdcCities");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-13',
});
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const STRIPE_TICKET_CURRENCY = (process.env.STRIPE_TICKET_CURRENCY || 'usd').toLowerCase();
const FC_PER_USD = Number(process.env.FC_PER_USD || 2800);
function isStripeMock() {
    return !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('mock');
}
function fcToStripeUnitAmount(amountFc) {
    if (STRIPE_TICKET_CURRENCY === 'cdf') {
        return Math.max(1, Math.round(amountFc));
    }
    const usd = amountFc / Math.max(1, FC_PER_USD);
    return Math.max(50, Math.round(usd * 100));
}
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
    const paid = event.ticketingEnabled && event.ticketPriceFc > 0;
    const photos = (0, publicVenue_1.parsePhotoUrls)(event.photos);
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
        paid,
        ticketsTotal: event.ticketsTotal,
        ticketsSold: event.ticketsSold,
        ticketsRemaining: remaining,
        soldOut: remaining === 0,
        photos,
        coverUrl: (0, publicVenue_1.coverFromMedia)(photos),
        posts: (event.posts || []).map(serializePublicPost),
    };
}
async function listPublicEvents(req, res) {
    try {
        const q = String(req.query.q || '').trim();
        const city = (0, rdcCities_1.normalizeAllowedCity)(req.query.city) || '';
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
            where: { slug, isPublic: true },
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
        const quantity = Math.min(8, Math.max(1, Number(req.body?.quantity) || 1));
        const userId = account.id;
        if (!buyerName || !buyerEmail || !buyerEmail.includes('@')) {
            return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { slug, isPublic: true },
            include: { tenant: { select: { plan: true, accountKind: true } } },
        });
        if (!event)
            return res.status(404).json({ error: 'Événement introuvable ou privé.' });
        if (new Date(event.date).getTime() < Date.now()) {
            return res.status(400).json({ error: 'Cet événement est déjà passé.' });
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
        const paid = event.ticketingEnabled && event.ticketPriceFc > 0;
        const amountFc = paid ? event.ticketPriceFc * quantity : 0;
        const order = await db_1.prisma.ticketOrder.create({
            data: {
                eventId: event.id,
                buyerName,
                buyerEmail,
                buyerPhone,
                quantity,
                amountFc,
                status: paid ? 'PENDING' : 'PAID',
                paidAt: paid ? null : new Date(),
                userId,
            },
        });
        if (!paid) {
            const fulfilled = await (0, ticketOrderService_1.fulfillTicketOrder)(order.id);
            const primary = fulfilled?.guests?.find((g) => g.email.toLowerCase() === buyerEmail) || fulfilled?.guests?.[0];
            return res.status(201).json({
                paid: false,
                mock: true,
                orderId: order.id,
                guestId: primary?.id,
                rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
                message: 'Inscription confirmée. Conservez le lien de votre badge QR.',
            });
        }
        if (isStripeMock()) {
            const fulfilled = await (0, ticketOrderService_1.fulfillTicketOrder)(order.id);
            const primary = fulfilled?.guests?.find((g) => g.email.toLowerCase() === buyerEmail) || fulfilled?.guests?.[0];
            return res.status(201).json({
                paid: true,
                mock: true,
                orderId: order.id,
                guestId: primary?.id,
                rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
                message: 'Paiement simulé (mode développement). Billet confirmé.',
            });
        }
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            customer_email: buyerEmail,
            line_items: [
                {
                    quantity: 1,
                    price_data: {
                        currency: STRIPE_TICKET_CURRENCY,
                        unit_amount: fcToStripeUnitAmount(amountFc),
                        product_data: {
                            name: `${event.title} — ${quantity} billet${quantity > 1 ? 's' : ''}`,
                            description: `${amountFc.toLocaleString('fr-FR')} FC`,
                        },
                    },
                },
            ],
            success_url: `${FRONTEND_URL}/marketplace/evenements/${event.slug}/succes?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONTEND_URL}/marketplace/evenements/${event.slug}?canceled=1`,
            client_reference_id: order.id,
            metadata: {
                purpose: 'event_ticket',
                orderId: order.id,
                eventId: event.id,
            },
        });
        await db_1.prisma.ticketOrder.update({
            where: { id: order.id },
            data: { stripeCheckoutSessionId: session.id },
        });
        return res.json({
            paid: true,
            mock: false,
            orderId: order.id,
            checkoutUrl: session.url,
        });
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
        let order = await db_1.prisma.ticketOrder.findFirst({
            where: { stripeCheckoutSessionId: sessionId },
            include: {
                event: { select: { title: true, slug: true, date: true, location: true } },
                guests: { select: { id: true, email: true, firstName: true } },
            },
        });
        if (!order && !isStripeMock()) {
            const session = await stripe.checkout.sessions.retrieve(sessionId);
            const orderId = session.metadata?.orderId || session.client_reference_id;
            if (orderId && session.payment_status === 'paid') {
                await (0, ticketOrderService_1.fulfillTicketOrder)(orderId, {
                    id: session.id,
                    payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
                });
                order = await db_1.prisma.ticketOrder.findFirst({
                    where: { id: orderId },
                    include: {
                        event: { select: { title: true, slug: true, date: true, location: true } },
                        guests: { select: { id: true, email: true, firstName: true } },
                    },
                });
            }
        }
        if (!order)
            return res.status(404).json({ error: 'Commande introuvable.' });
        const primary = order.guests[0];
        return res.json({
            status: order.status,
            quantity: order.quantity,
            amountFc: order.amountFc,
            event: order.event,
            guestId: primary?.id,
            rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
        });
    }
    catch (error) {
        console.error('[Public events] session', error);
        return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
    }
}

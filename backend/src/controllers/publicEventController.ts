import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import {
  fulfillTicketOrder,
  ticketsRemaining,
} from '../services/ticketOrderService';
import { createSeatHold, listSeatInventory } from '../services/seatSelectionService';
import {
  normalizeTicketPricingMode,
  priceFromFcForEvent,
  pricingZonesFromPlan,
  resolveSeatPrice,
  resolveZoneTicketPrice,
} from '../services/ticketPricingService';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { AuthenticatedRequest } from '../middleware/auth';
import { parsePhotoUrls, coverFromMedia } from '../utils/publicVenue';
import { haversineKm, toDateKey } from '../utils/marketplaceDates';
import { normalizeAllowedCity, pointInCityBounds } from '../utils/rdcCities';
import { isOnlinePaymentsEnabled } from '../services/platformSettingsService';
import {
  createFlexPayCardCheckout,
  getPublicApiBaseUrl,
  isFlexPayCardMock,
  resolveTicketCheckoutProvider,
} from '../services/flexPayCardService';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-13' as any,
});
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const STRIPE_TICKET_CURRENCY = (process.env.STRIPE_TICKET_CURRENCY || 'usd').toLowerCase();
const FC_PER_USD = Number(process.env.FC_PER_USD || 2800);

function isStripeMock() {
  return !STRIPE_SECRET_KEY || STRIPE_SECRET_KEY.includes('mock');
}

function fcToStripeUnitAmount(amountFc: number): number {
  if (STRIPE_TICKET_CURRENCY === 'cdf') {
    return Math.max(1, Math.round(amountFc));
  }
  const usd = amountFc / Math.max(1, FC_PER_USD);
  return Math.max(50, Math.round(usd * 100));
}

function serializePublicPost(post: {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  mediaUrls: unknown;
  mediaType: string | null;
  createdAt: Date;
}) {
  let media: Array<{ url: string; type: 'IMAGE' | 'VIDEO' }> = [];
  if (Array.isArray(post.mediaUrls)) {
    media = post.mediaUrls.flatMap((item) => {
      const url = item && typeof item === 'object' && 'url' in item ? String((item as { url?: unknown }).url || '') : '';
      if (!url || !/^https?:\/\//i.test(url)) return [];
      const type = item && typeof item === 'object' && (item as { type?: unknown }).type === 'VIDEO' ? 'VIDEO' : 'IMAGE';
      return [{ url, type: type as 'IMAGE' | 'VIDEO' }];
    });
  } else if (post.mediaUrl && /^https?:\/\//i.test(post.mediaUrl)) {
    media = [{ url: post.mediaUrl, type: post.mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE' }];
  }
  return {
    id: post.id,
    content: post.content,
    media,
    createdAt: post.createdAt,
  };
}

function serializePublicEvent(event: {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  date: Date;
  location: string;
  latitude: number | null;
  longitude: number | null;
  isPublic: boolean;
  ticketingEnabled: boolean;
  ticketPriceFc: number;
  ticketsTotal: number | null;
  ticketsSold: number;
  seatSelectionEnabled?: boolean;
  ticketPricingMode?: string;
  tablePlan?: unknown;
  eventProgram?: unknown;
  photos?: unknown;
  tenant: { name: string };
  posts?: Array<{
    id: string;
    content: string | null;
    mediaUrl: string | null;
    mediaUrls: unknown;
    mediaType: string | null;
    createdAt: Date;
  }>;
}) {
  const remaining = ticketsRemaining(event);
  const pricingMode = normalizeTicketPricingMode(event.ticketPricingMode);
  const pricingZones = pricingZonesFromPlan(event.tablePlan);
  const onlinePayments = isOnlinePaymentsEnabled();
  const paid =
    onlinePayments &&
    event.ticketingEnabled &&
    (event.ticketPriceFc > 0 || (pricingMode === 'by_zone' && pricingZones.some((z) => z.priceFc > 0)));
  const photos = parsePhotoUrls(event.photos);
  const plan = event.tablePlan as { tables?: unknown[] } | null;
  const hasTablePlan = Boolean(plan?.tables && plan.tables.length > 0);
  const priceFromFc = priceFromFcForEvent(event);
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
    coverUrl: coverFromMedia(photos),
    posts: (event.posts || []).map(serializePublicPost),
  };
}

export async function listPublicEvents(req: Request, res: Response) {
  try {
    const q = String(req.query.q || '').trim();
    const city = normalizeAllowedCity(req.query.city) || '';
    const commune = String(req.query.commune || '').trim();
    const neighborhood = String(req.query.neighborhood || '').trim();
    const street = String(req.query.street || '').trim();
    const entry = String(req.query.entry || '').trim();
    const minPrice = Number.parseInt(String(req.query.minPrice || ''), 10);
    const maxPrice = Number.parseInt(String(req.query.maxPrice || ''), 10);
    const fromKey = toDateKey(String(req.query.availableFrom || ''));
    const toKey = toDateKey(String(req.query.availableTo || ''));
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm);
    const hasGeo = Number.isFinite(lat) && Number.isFinite(lng) && Number.isFinite(radiusKm) && radiusKm > 0;
    const dateFrom = fromKey ? new Date(`${fromKey}T00:00:00.000Z`) : null;
    const dateTo = toKey ? new Date(`${toKey}T23:59:59.999Z`) : null;

    const locationBits = [city, commune, neighborhood, street].filter(Boolean);

    const priceFilter: { gt?: number; gte?: number; lte?: number } = {};
    if (entry === 'paid') priceFilter.gt = 0;
    if (Number.isFinite(minPrice) && minPrice >= 0) priceFilter.gte = minPrice;
    if (Number.isFinite(maxPrice) && maxPrice >= 0) priceFilter.lte = maxPrice;

    const events = await prisma.event.findMany({
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
                        { title: { contains: q, mode: 'insensitive' as const } },
                        { location: { contains: q, mode: 'insensitive' as const } },
                        { description: { contains: q, mode: 'insensitive' as const } },
                        { tenant: { name: { contains: q, mode: 'insensitive' as const } } },
                      ],
                    }]
                  : []),
                ...locationBits.map((bit) => ({
                  location: { contains: bit, mode: 'insensitive' as const },
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
      if (city && event.latitude != null && event.longitude != null && !pointInCityBounds(event.latitude, event.longitude, city)) {
        return false;
      }
      if (hasGeo) {
        if (event.latitude == null || event.longitude == null) return false;
        if (haversineKm(lat, lng, event.latitude, event.longitude) > Math.min(80, radiusKm)) return false;
      }
      return true;
    });

    return res.json({ events: filtered.map(serializePublicEvent) });
  } catch (error) {
    console.error('[Public events] list', error);
    return res.status(500).json({ error: 'Impossible de charger les événements publics.' });
  }
}

export async function getPublicEvent(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const event = await prisma.event.findFirst({
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
    if (!event) return res.status(404).json({ error: 'Événement introuvable ou privé.' });
    return res.json({ event: serializePublicEvent(event) });
  } catch (error) {
    console.error('[Public events] get', error);
    return res.status(500).json({ error: 'Impossible de charger l’événement.' });
  }
}

export async function listPublicEventSeats(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const event = await prisma.event.findFirst({
      where: { slug, isPublic: true, isBlockedByAdmin: false },
      select: { id: true, seatSelectionEnabled: true, tablePlan: true },
    });
    if (!event) return res.status(404).json({ error: 'Événement introuvable ou privé.' });
    if (!event.seatSelectionEnabled) {
      return res.status(400).json({ error: 'Sélection de siège non activée.' });
    }
    const inventory = await listSeatInventory(event.id);
    return res.json(inventory);
  } catch (error) {
    console.error('[Public events] seats', error);
    return res.status(500).json({ error: 'Impossible de charger les places.' });
  }
}

export async function checkoutPublicEvent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Connectez-vous pour réserver ou vous inscrire.' });
    }

    const slug = String(req.params.slug || '');
    const account = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true },
    });
    if (!account) {
      return res.status(401).json({ error: 'Connectez-vous pour réserver ou vous inscrire.' });
    }

    const buyerEmail = account.email.trim().toLowerCase();
    const buyerName = String(req.body?.buyerName || account.name || '').trim();
    const buyerPhone = String(req.body?.buyerPhone || account.phone || '').trim() || null;
    let quantity = Math.min(8, Math.max(1, Number(req.body?.quantity) || 1));
    const tableId = req.body?.tableId ? String(req.body.tableId) : null;
    const seatIndexRaw = req.body?.seatIndex;
    const seatIndex =
      seatIndexRaw === 0 || seatIndexRaw === '0'
        ? 0
        : seatIndexRaw != null && seatIndexRaw !== ''
          ? Number(seatIndexRaw)
          : null;
    const userId = account.id;

    if (!buyerName || !buyerEmail || !buyerEmail.includes('@')) {
      return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
    }

    const event = await prisma.event.findFirst({
      where: { slug, isPublic: true, isBlockedByAdmin: false },
      include: { tenant: { select: { plan: true, accountKind: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Événement introuvable ou privé.' });
    if (new Date(event.date).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Cet événement est déjà passé.' });
    }

    const bodyPricingZoneId = req.body?.pricingZoneId ? String(req.body.pricingZoneId) : null;

    if (event.seatSelectionEnabled) {
      quantity = 1;
      if (!tableId || seatIndex == null || !Number.isFinite(seatIndex)) {
        return res.status(400).json({ error: 'Choisissez une table et un siège sur le plan.' });
      }
    }

    const pricingMode = normalizeTicketPricingMode(event.ticketPricingMode);
    let unitPriceFc = 0;
    let pricingZoneId: string | null = null;

    try {
      if (pricingMode === 'by_zone') {
        if (event.seatSelectionEnabled && tableId != null && seatIndex != null) {
          const resolved = resolveSeatPrice(event, tableId, seatIndex);
          unitPriceFc = resolved.priceFc;
          pricingZoneId = resolved.pricingZoneId;
        } else if (bodyPricingZoneId) {
          const resolved = resolveZoneTicketPrice(event, bodyPricingZoneId);
          unitPriceFc = resolved.priceFc;
          pricingZoneId = resolved.pricingZoneId;
        } else {
          return res.status(400).json({ error: 'Choisissez une zone tarifaire.' });
        }
      } else {
        unitPriceFc = Math.max(0, event.ticketPriceFc);
      }
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Tarif invalide.' });
    }

    const remaining = ticketsRemaining(event);
    if (remaining != null && remaining < quantity) {
      return res.status(400).json({
        error: remaining === 0 ? 'Complet.' : `Il ne reste que ${remaining} place${remaining > 1 ? 's' : ''}.`,
      });
    }

    const guestCount = await prisma.guest.count({ where: { event: { tenantId: event.tenantId } } });
    const limits = getPlanLimitsForTenant(event.tenant.plan, event.tenant.accountKind);
    if (guestCount + quantity > limits.maxGuests) {
      return res.status(403).json({ error: 'Plus de places du côté de l’organisateur (quota atteint).' });
    }

    const existing = await prisma.guest.findUnique({
      where: { eventId_email: { eventId: event.id, email: buyerEmail } },
    });
    if (existing) {
      return res.status(400).json({ error: 'Cet e-mail a déjà une inscription pour cet événement.' });
    }

    const paid = event.ticketingEnabled && unitPriceFc > 0 && isOnlinePaymentsEnabled();
    const amountFc = paid ? unitPriceFc * quantity : 0;
    const paymentProvider = paid ? resolveTicketCheckoutProvider() : null;

    const order = await prisma.ticketOrder.create({
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
        tableId: event.seatSelectionEnabled ? tableId : null,
        seatIndex: event.seatSelectionEnabled ? seatIndex : null,
      },
    });

    if (event.seatSelectionEnabled && tableId != null && seatIndex != null) {
      try {
        await createSeatHold({
          eventId: event.id,
          tableId,
          seatIndex,
          buyerEmail,
          orderId: order.id,
        });
      } catch (err: any) {
        await prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        return res.status(409).json({ error: err?.message || 'Siège indisponible.' });
      }
    }

    if (!paid) {
      const fulfilled = await fulfillTicketOrder(order.id);
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

    if (paymentProvider === 'flexpay_card') {
      if (isFlexPayCardMock()) {
        const fulfilled = await fulfillTicketOrder(order.id);
        const primary =
          fulfilled?.guests?.find((g) => g.email.toLowerCase() === buyerEmail) || fulfilled?.guests?.[0];
        return res.status(201).json({
          paid: true,
          mock: true,
          provider: 'flexpay_card',
          orderId: order.id,
          guestId: primary?.id,
          rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
          message: 'Paiement FlexPay simulé (credentials absents). Billet confirmé.',
        });
      }

      const apiBase = getPublicApiBaseUrl();
      const reference = order.id;
      try {
        const flex = await createFlexPayCardCheckout({
          reference,
          amount: amountFc,
          currency: 'CDF',
          description: `${event.title} — ${quantity} billet${quantity > 1 ? 's' : ''}`,
          callbackUrl: `${apiBase}/api/public/payments/flexpay/callback`,
          approveUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=approve`,
          cancelUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=cancel`,
          declineUrl: `${apiBase}/api/public/payments/flexpay/return?orderId=${order.id}&result=decline`,
          language: 'fr',
        });

        await prisma.ticketOrder.update({
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
      } catch (err: any) {
        await prisma.ticketOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
        return res.status(502).json({
          error: err?.message || 'Impossible d’ouvrir le paiement FlexPay.',
        });
      }
    }

    if (isStripeMock()) {
      const fulfilled = await fulfillTicketOrder(order.id);
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

    const seatHint =
      event.seatSelectionEnabled && tableId != null && seatIndex != null
        ? ` · siège ${seatIndex + 1}`
        : '';

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
              name: `${event.title} — ${quantity} billet${quantity > 1 ? 's' : ''}${seatHint}`,
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
        ...(tableId ? { tableId } : {}),
        ...(seatIndex != null ? { seatIndex: String(seatIndex) } : {}),
      },
    });

    await prisma.ticketOrder.update({
      where: { id: order.id },
      data: {
        paymentProvider: 'stripe',
        stripeCheckoutSessionId: session.id,
      },
    });

    return res.json({
      paid: true,
      mock: false,
      provider: 'stripe',
      orderId: order.id,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    console.error('[Public events] checkout', error);
    return res.status(500).json({ error: error?.message || 'Inscription impossible.' });
  }
}

export async function getTicketOrderBySession(req: Request, res: Response) {
  try {
    const sessionId = String(req.params.sessionId || '');
    if (!sessionId) return res.status(400).json({ error: 'Session manquante.' });

    let order = await prisma.ticketOrder.findFirst({
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
        await fulfillTicketOrder(orderId, {
          id: session.id,
          payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        });
        order = await prisma.ticketOrder.findFirst({
          where: { id: orderId },
          include: {
            event: { select: { title: true, slug: true, date: true, location: true } },
            guests: { select: { id: true, email: true, firstName: true } },
          },
        });
      }
    }

    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    const primary = order.guests[0];
    return res.json({
      status: order.status,
      quantity: order.quantity,
      amountFc: order.amountFc,
      event: order.event,
      guestId: primary?.id,
      rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
    });
  } catch (error) {
    console.error('[Public events] session', error);
    return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
  }
}

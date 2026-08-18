import { Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';
import {
  fulfillTicketOrder,
  ticketsRemaining,
} from '../services/ticketOrderService';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { AuthenticatedRequest } from '../middleware/auth';
import { parsePhotoUrls, coverFromMedia } from '../utils/publicVenue';

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
  const paid = event.ticketingEnabled && event.ticketPriceFc > 0;
  const photos = parsePhotoUrls(event.photos);
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
    coverUrl: coverFromMedia(photos),
    posts: (event.posts || []).map(serializePublicPost),
  };
}

export async function listPublicEvents(req: Request, res: Response) {
  try {
    const q = String(req.query.q || '').trim();
    const events = await prisma.event.findMany({
      where: {
        isPublic: true,
        slug: { not: null },
        date: { gte: new Date(Date.now() - 12 * 60 * 60 * 1000) },
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { location: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { tenant: { select: { name: true } } },
      orderBy: { date: 'asc' },
      take: 80,
    });
    return res.json({ events: events.map(serializePublicEvent) });
  } catch (error) {
    console.error('[Public events] list', error);
    return res.status(500).json({ error: 'Impossible de charger les événements publics.' });
  }
}

export async function getPublicEvent(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const event = await prisma.event.findFirst({
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
    if (!event) return res.status(404).json({ error: 'Événement introuvable ou privé.' });
    return res.json({ event: serializePublicEvent(event) });
  } catch (error) {
    console.error('[Public events] get', error);
    return res.status(500).json({ error: 'Impossible de charger l’événement.' });
  }
}

export async function checkoutPublicEvent(req: AuthenticatedRequest, res: Response) {
  try {
    const slug = String(req.params.slug || '');
    const buyerName = String(req.body?.buyerName || '').trim();
    const buyerEmail = String(req.body?.buyerEmail || '').trim().toLowerCase();
    const buyerPhone = String(req.body?.buyerPhone || '').trim() || null;
    const quantity = Math.min(8, Math.max(1, Number(req.body?.quantity) || 1));
    const userId = req.user?.id || null;

    if (!buyerName || !buyerEmail || !buyerEmail.includes('@')) {
      return res.status(400).json({ error: 'Nom et e-mail valides requis.' });
    }

    const event = await prisma.event.findFirst({
      where: { slug, isPublic: true },
      include: { tenant: { select: { plan: true, accountKind: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Événement introuvable ou privé.' });
    if (new Date(event.date).getTime() < Date.now()) {
      return res.status(400).json({ error: 'Cet événement est déjà passé.' });
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

    const paid = event.ticketingEnabled && event.ticketPriceFc > 0;
    const amountFc = paid ? event.ticketPriceFc * quantity : 0;

    const order = await prisma.ticketOrder.create({
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

    await prisma.ticketOrder.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return res.json({
      paid: true,
      mock: false,
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

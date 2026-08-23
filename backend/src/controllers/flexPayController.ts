import { Request, Response } from 'express';
import { prisma } from '../db';
import { fulfillTicketOrder } from '../services/ticketOrderService';
import {
  checkFlexPayCardOrder,
  parseFlexPayCallbackPayload,
} from '../services/flexPayCardService';

async function findOrderForFlexPay(opts: { reference?: string; orderNumber?: string }) {
  if (opts.orderNumber) {
    const byNumber = await prisma.ticketOrder.findFirst({
      where: { flexPayOrderNumber: opts.orderNumber },
      include: { event: { select: { slug: true, title: true } } },
    });
    if (byNumber) return byNumber;
  }
  if (opts.reference) {
    const byRef = await prisma.ticketOrder.findFirst({
      where: {
        OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
      },
      include: { event: { select: { slug: true, title: true } } },
    });
    if (byRef) return byRef;
  }
  return null;
}

/** Callback serveur FlexPay — POST/GET /api/public/payments/flexpay/callback */
export async function flexPayCardCallback(req: Request, res: Response) {
  try {
    const parsed = parseFlexPayCallbackPayload(
      (req.body || {}) as Record<string, unknown>,
      (req.query || {}) as Record<string, unknown>,
    );

    const order = await findOrderForFlexPay({
      reference: parsed.reference || undefined,
      orderNumber: parsed.orderNumber || undefined,
    });

    if (!order) {
      console.warn('[FlexPay] callback sans commande', parsed);
      return res.status(404).json({ error: 'Commande introuvable.' });
    }

    if (order.status === 'PAID') {
      return res.json({ ok: true, alreadyPaid: true, orderId: order.id });
    }

    let success = parsed.success;
    const orderNumber = order.flexPayOrderNumber || parsed.orderNumber;
    if (orderNumber) {
      try {
        const checked = await checkFlexPayCardOrder(orderNumber);
        if (checked.found) success = checked.status === 'success';
      } catch (err) {
        console.warn('[FlexPay] check après callback échoué:', err);
      }
    }

    if (!success) {
      await prisma.ticketOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      return res.json({ ok: true, paid: false, orderId: order.id });
    }

    await fulfillTicketOrder(order.id, {
      id: orderNumber || order.id,
      payment_intent: orderNumber || null,
    });

    return res.json({ ok: true, paid: true, orderId: order.id });
  } catch (error: any) {
    console.error('[FlexPay] callback', error);
    return res.status(500).json({ error: error?.message || 'Callback FlexPay impossible.' });
  }
}

/** Retour navigateur — GET /api/public/payments/flexpay/return */
export async function flexPayCardReturn(req: Request, res: Response) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const orderId = String(req.query.orderId || '');
    const result = String(req.query.result || 'approve');

    const order = await prisma.ticketOrder.findUnique({
      where: { id: orderId },
      include: { event: { select: { slug: true } } },
    });

    if (!order?.event?.slug) {
      return res.redirect(`${FRONTEND_URL}/marketplace/evenements`);
    }

    const slug = order.event.slug;

    if (result === 'cancel') {
      return res.redirect(`${FRONTEND_URL}/marketplace/evenements/${slug}?canceled=1`);
    }
    if (result === 'decline') {
      return res.redirect(`${FRONTEND_URL}/marketplace/evenements/${slug}?declined=1`);
    }

    if (order.status !== 'PAID' && order.flexPayOrderNumber) {
      try {
        const checked = await checkFlexPayCardOrder(order.flexPayOrderNumber);
        if (checked.status === 'success') {
          await fulfillTicketOrder(order.id, {
            id: order.flexPayOrderNumber,
            payment_intent: order.flexPayOrderNumber,
          });
        }
      } catch (err) {
        console.warn('[FlexPay] verify on return:', err);
      }
    }

    return res.redirect(
      `${FRONTEND_URL}/marketplace/evenements/${slug}/succes?order=${order.id}&provider=flexpay`,
    );
  } catch (error) {
    console.error('[FlexPay] return', error);
    return res.redirect(`${FRONTEND_URL}/marketplace/evenements`);
  }
}

/** Vérifie une commande — GET /api/public/payments/flexpay/orders/:orderId/verify */
export async function verifyFlexPayCardOrder(req: Request, res: Response) {
  try {
    const orderId = String(req.params.orderId || '');
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
    const order = await prisma.ticketOrder.findUnique({
      where: { id: orderId },
      include: {
        event: { select: { title: true, slug: true, date: true, location: true } },
        guests: { select: { id: true, email: true, firstName: true } },
      },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });

    if (order.status === 'PAID' && order.guests.length > 0) {
      const primary = order.guests[0];
      return res.json({
        paid: true,
        orderId: order.id,
        guestId: primary?.id,
        rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
        event: order.event,
      });
    }

    if (!order.flexPayOrderNumber) {
      return res.status(400).json({ error: 'Aucun orderNumber FlexPay sur cette commande.' });
    }

    const checked = await checkFlexPayCardOrder(order.flexPayOrderNumber);
    if (checked.status !== 'success') {
      return res.json({
        paid: false,
        status: checked.status,
        orderId: order.id,
        event: order.event,
      });
    }

    const fulfilled = await fulfillTicketOrder(order.id, {
      id: order.flexPayOrderNumber,
      payment_intent: order.flexPayOrderNumber,
    });
    const primary =
      fulfilled?.guests?.find((g) => g.email.toLowerCase() === order.buyerEmail.toLowerCase()) ||
      fulfilled?.guests?.[0];

    return res.json({
      paid: true,
      orderId: order.id,
      guestId: primary?.id,
      rsvpUrl: primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null,
      event: order.event,
    });
  } catch (error: any) {
    console.error('[FlexPay] verify', error);
    return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
  }
}

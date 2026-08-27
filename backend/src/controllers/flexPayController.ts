import { Request, Response } from 'express';
import { prisma } from '../db';
import { fulfillTicketOrder } from '../services/ticketOrderService';
import { activateSubscriptionRequest } from '../services/subscriptionActivationService';
import {
  buildFlexPayMetadataUpdate,
  checkFlexPayCardOrder,
  parseFlexPayCallbackPayload,
  type FlexPayCallbackParsed,
  type FlexPayCheckResult,
  type FlexPayMetadataUpdate,
} from '../services/flexPayCardService';

async function findTicketOrderForFlexPay(opts: { reference?: string; orderNumber?: string }) {
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

async function findSubscriptionRequestForFlexPay(opts: { reference?: string; orderNumber?: string }) {
  if (opts.orderNumber) {
    const byNumber = await prisma.subscriptionRequest.findFirst({
      where: { flexPayOrderNumber: opts.orderNumber },
    });
    if (byNumber) return byNumber;
  }
  if (opts.reference) {
    const byRef = await prisma.subscriptionRequest.findFirst({
      where: {
        OR: [{ id: opts.reference }, { flexPayReference: opts.reference }],
      },
    });
    if (byRef) return byRef;
  }
  return null;
}

function metadataFromCallback(parsed: FlexPayCallbackParsed): FlexPayMetadataUpdate {
  return buildFlexPayMetadataUpdate({
    channel: parsed.channel,
    amountCustomer: parsed.amountCustomer,
    providerReference: parsed.providerReference,
  });
}

function metadataFromCheck(checked: FlexPayCheckResult): FlexPayMetadataUpdate {
  return buildFlexPayMetadataUpdate({
    channel: checked.channel,
    amountCustomer: checked.amountCustomer,
    providerReference: checked.providerReference,
  });
}

function mergeMetadata(...parts: FlexPayMetadataUpdate[]): FlexPayMetadataUpdate {
  return Object.assign({}, ...parts.filter((p) => Object.keys(p).length > 0));
}

async function confirmFlexPaySuccess(
  orderNumber: string | null | undefined,
  parsedSuccess: boolean,
): Promise<{ success: boolean; checkMeta: FlexPayMetadataUpdate }> {
  let success = parsedSuccess;
  let checkMeta: FlexPayMetadataUpdate = {};
  if (orderNumber) {
    try {
      const checked = await checkFlexPayCardOrder(orderNumber);
      checkMeta = metadataFromCheck(checked);
      if (checked.found) success = checked.status === 'success';
    } catch (err) {
      console.warn('[FlexPay] check échoué:', err);
    }
  }
  return { success, checkMeta };
}

/** Callback serveur FlexPay — POST/GET /api/public/payments/flexpay/callback */
export async function flexPayCardCallback(req: Request, res: Response) {
  try {
    const parsed = parseFlexPayCallbackPayload(
      (req.body || {}) as Record<string, unknown>,
      (req.query || {}) as Record<string, unknown>,
    );
    const callbackMeta = metadataFromCallback(parsed);

    // 1) Billet événement
    const order = await findTicketOrderForFlexPay({
      reference: parsed.reference || undefined,
      orderNumber: parsed.orderNumber || undefined,
    });

    if (order) {
      if (order.status === 'PAID') {
        const meta = mergeMetadata(callbackMeta);
        if (Object.keys(meta).length) {
          await prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
        }
        return res.json({ ok: true, alreadyPaid: true, kind: 'ticket', orderId: order.id });
      }

      const orderNumber = order.flexPayOrderNumber || parsed.orderNumber;
      const { success, checkMeta } = await confirmFlexPaySuccess(orderNumber, parsed.success);
      const meta = mergeMetadata(callbackMeta, checkMeta);

      if (!success) {
        await prisma.ticketOrder.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', ...meta },
        });
        return res.json({ ok: true, paid: false, kind: 'ticket', orderId: order.id });
      }

      if (Object.keys(meta).length) {
        await prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
      }
      await fulfillTicketOrder(order.id, {
        id: orderNumber || order.id,
        payment_intent: orderNumber || null,
      });
      return res.json({ ok: true, paid: true, kind: 'ticket', orderId: order.id });
    }

    // 2) Forfait SaaS
    const sub = await findSubscriptionRequestForFlexPay({
      reference: parsed.reference || undefined,
      orderNumber: parsed.orderNumber || undefined,
    });

    if (sub) {
      if (sub.status === 'APPROVED') {
        const meta = mergeMetadata(callbackMeta);
        if (Object.keys(meta).length) {
          await prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
        }
        return res.json({ ok: true, alreadyPaid: true, kind: 'subscription', requestId: sub.id });
      }

      const orderNumber = sub.flexPayOrderNumber || parsed.orderNumber;
      const { success, checkMeta } = await confirmFlexPaySuccess(orderNumber, parsed.success);
      const meta = mergeMetadata(callbackMeta, checkMeta);

      if (!success) {
        await prisma.subscriptionRequest.update({
          where: { id: sub.id },
          data: { status: 'REJECTED', ...meta },
        });
        return res.json({ ok: true, paid: false, kind: 'subscription', requestId: sub.id });
      }

      if (Object.keys(meta).length) {
        await prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
      }
      await activateSubscriptionRequest(sub.id, {
        approvedAmount: sub.approvedAmount ?? undefined,
        markPaid: true,
      });
      return res.json({ ok: true, paid: true, kind: 'subscription', requestId: sub.id });
    }

    console.warn('[FlexPay] callback sans commande / demande', parsed);
    return res.status(404).json({ error: 'Commande ou demande introuvable.' });
  } catch (error: any) {
    console.error('[FlexPay] callback', error);
    return res.status(500).json({ error: error?.message || 'Callback FlexPay impossible.' });
  }
}

/** Retour navigateur — GET /api/public/payments/flexpay/return */
export async function flexPayCardReturn(req: Request, res: Response) {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
  try {
    const kind = String(req.query.kind || 'ticket');
    const result = String(req.query.result || 'approve');

    if (kind === 'subscription') {
      const requestId = String(req.query.requestId || '');
      if (result === 'cancel' || result === 'decline') {
        return res.redirect(`${FRONTEND_URL}/dashboard/billing?flexpay=canceled`);
      }

      const sub = await prisma.subscriptionRequest.findUnique({ where: { id: requestId } });
      if (!sub) {
        return res.redirect(`${FRONTEND_URL}/dashboard/billing?flexpay=error`);
      }

      if (sub.status !== 'APPROVED' && sub.flexPayOrderNumber) {
        try {
          const checked = await checkFlexPayCardOrder(sub.flexPayOrderNumber);
          const meta = metadataFromCheck(checked);
          if (Object.keys(meta).length) {
            await prisma.subscriptionRequest.update({ where: { id: sub.id }, data: meta });
          }
          if (checked.status === 'success') {
            await activateSubscriptionRequest(sub.id, {
              approvedAmount: sub.approvedAmount ?? undefined,
              markPaid: true,
            });
          }
        } catch (err) {
          console.warn('[FlexPay] verify subscription on return:', err);
        }
      }

      return res.redirect(
        `${FRONTEND_URL}/dashboard/billing?flexpay=return&requestId=${encodeURIComponent(requestId)}`,
      );
    }

    const orderId = String(req.query.orderId || '');
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
        const meta = metadataFromCheck(checked);
        if (Object.keys(meta).length) {
          await prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
        }
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
      `${FRONTEND_URL}/marketplace/evenements/${slug}/succes?order=${order.id}&provider=flexpay&method=card&pending=1`,
    );
  } catch (error) {
    console.error('[FlexPay] return', error);
    return res.redirect(`${FRONTEND_URL}/marketplace/evenements`);
  }
}

/** Vérifie une commande billet — GET /api/public/payments/flexpay/orders/:orderId/verify */
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
        channel: order.flexPayChannel,
      });
    }

    if (!order.flexPayOrderNumber) {
      return res.status(400).json({ error: 'Aucun orderNumber FlexPay sur cette commande.' });
    }

    const checked = await checkFlexPayCardOrder(order.flexPayOrderNumber);
    const meta = metadataFromCheck(checked);
    if (Object.keys(meta).length) {
      await prisma.ticketOrder.update({ where: { id: order.id }, data: meta });
    }

    if (checked.status === 'failed') {
      await prisma.ticketOrder.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', ...meta },
      });
      return res.json({
        paid: false,
        status: 'failed',
        orderId: order.id,
        event: order.event,
        channel: checked.channel || order.flexPayChannel,
        canRetry: true,
      });
    }

    if (checked.status !== 'success') {
      return res.json({
        paid: false,
        status: checked.status === 'pending' ? 'pending' : checked.status,
        orderId: order.id,
        event: order.event,
        channel: checked.channel || order.flexPayChannel,
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
      channel: checked.channel || order.flexPayChannel,
    });
  } catch (error: any) {
    console.error('[FlexPay] verify', error);
    return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
  }
}

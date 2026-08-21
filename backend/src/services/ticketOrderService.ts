import { prisma } from '../db';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { sendRealEmail } from './notificationService';
import { assignSeatInTablePlan } from './seatSelectionService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export function splitBuyerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Invité', lastName: 'Billet' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Billet' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function companionTicketEmail(baseEmail: string, index: number, orderId: string): string {
  const at = baseEmail.lastIndexOf('@');
  if (at < 1) return `billet-${orderId.slice(0, 8)}-${index}@tickets.eventmaster.local`;
  const local = baseEmail.slice(0, at);
  const domain = baseEmail.slice(at + 1);
  return `${local}+billet${index}-${orderId.slice(0, 8)}@${domain}`;
}

export function ticketsRemaining(event: { ticketsTotal: number | null; ticketsSold: number }): number | null {
  if (event.ticketsTotal == null) return null;
  return Math.max(0, event.ticketsTotal - event.ticketsSold);
}

export async function fulfillTicketOrder(orderId: string, stripeSession?: {
  id?: string;
  payment_intent?: string | null;
}) {
  const order = await prisma.ticketOrder.findUnique({
    where: { id: orderId },
    include: {
      event: { include: { tenant: { select: { id: true, plan: true, accountKind: true, name: true } } } },
      guests: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!order) throw new Error('Commande introuvable.');
  if (order.status === 'PAID' && order.guests.length > 0) {
    return order;
  }

  const event = order.event;
  const remaining = ticketsRemaining(event);
  if (remaining != null && remaining < order.quantity) {
    await prisma.ticketOrder.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });
    throw new Error('Plus assez de billets disponibles.');
  }

  const guestCount = await prisma.guest.count({ where: { event: { tenantId: event.tenantId } } });
  const limits = getPlanLimitsForTenant(event.tenant.plan, event.tenant.accountKind);
  if (guestCount + order.quantity > limits.maxGuests) {
    throw new Error('Quota d’invités de l’organisation atteint. Contactez l’organisateur.');
  }

  const { firstName, lastName } = splitBuyerName(order.buyerName);
  const guestPayloads = Array.from({ length: order.quantity }, (_, i) => {
    const email = i === 0 ? order.buyerEmail.trim().toLowerCase() : companionTicketEmail(order.buyerEmail, i + 1, order.id);
    return {
      eventId: event.id,
      firstName: i === 0 ? firstName : `Invité ${i + 1}`,
      lastName,
      email,
      phone: i === 0 ? order.buyerPhone : null,
      category: event.ticketingEnabled && event.ticketPriceFc > 0 ? 'Billet' : 'Public',
      rsvp: event.ticketPriceFc > 0 ? 'ACCEPTED' : 'PENDING',
      ticketOrderId: order.id,
      ...(i === 0 && order.buyerPhone ? { preferences: { phone: order.buyerPhone } } : {}),
    };
  });

  for (const row of guestPayloads) {
    const clash = await prisma.guest.findUnique({
      where: { eventId_email: { eventId: event.id, email: row.email } },
    });
    if (clash) {
      throw new Error(`Un invité avec l’e-mail ${row.email} existe déjà pour cet événement.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of guestPayloads) {
      await tx.guest.create({ data: row });
    }
    await tx.event.update({
      where: { id: event.id },
      data: { ticketsSold: { increment: order.quantity } },
    });
    await tx.ticketOrder.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stripeCheckoutSessionId: stripeSession?.id || order.stripeCheckoutSessionId,
        stripePaymentIntentId: stripeSession?.payment_intent
          ? String(stripeSession.payment_intent)
          : order.stripePaymentIntentId,
      },
    });
  });

  const paid = await prisma.ticketOrder.findUnique({
    where: { id: order.id },
    include: { guests: { select: { id: true, email: true, firstName: true, lastName: true } } },
  });

  const primary = paid?.guests.find((g) => g.email.toLowerCase() === order.buyerEmail.toLowerCase()) || paid?.guests[0];
  if (primary && order.tableId != null && order.seatIndex != null) {
    try {
      await assignSeatInTablePlan(event.id, order.tableId, order.seatIndex, primary.id);
    } catch (err) {
      console.error('[Ticket] assignSeatInTablePlan', err);
    }
  }

  if (primary) {
    const rsvpUrl = `${FRONTEND_URL}/rsvp/${primary.id}`;
    const seatLine =
      order.tableId != null && order.seatIndex != null
        ? `\nPlace réservée : table ${order.tableId} · siège ${order.seatIndex + 1}\n`
        : '';
    const subject = `Votre billet — ${event.title}`;
    const text = `Bonjour ${order.buyerName},\n\nVotre inscription à « ${event.title} » est confirmée (${order.quantity} place${order.quantity > 1 ? 's' : ''}).${seatLine}\nAccédez à votre espace invité (badge QR) :\n${rsvpUrl}\n\nOrganisé par ${event.tenant.name}.\n`;
    void sendRealEmail(order.buyerEmail, subject, text).catch(() => undefined);
  }

  return paid;
}

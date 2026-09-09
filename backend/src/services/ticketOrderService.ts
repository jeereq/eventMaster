import { prisma } from '../db';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import { sendRealEmail } from './notificationService';
import { notifyTicketPayment } from './paymentTraceService';
import { assignSeatInTablePlan, assignMultipleSeatsInTablePlan } from './seatSelectionService';
import { brandedEventDetailsHtml, orgBrandFromTenant, wrapBrandedEmail } from '../utils/brandedMessaging';
import { escapeHtml } from '../utils/brandingUtils';
import { GUEST_COPY } from '../utils/guestMessageCopy';

import { splitBuyerName, companionTicketEmail, ticketsRemaining } from '../utils/ticketOrderUtils';
export { splitBuyerName, companionTicketEmail, ticketsRemaining };

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function fulfillTicketOrder(orderId: string, stripeSession?: {
  id?: string;
  payment_intent?: string | null;
}) {
  const order = await prisma.ticketOrder.findUnique({
    where: { id: orderId },
    include: {
      event: { include: { tenant: { select: { id: true, plan: true, accountKind: true, name: true, branding: true } } } },
      guests: { select: { id: true, email: true, firstName: true, lastName: true } },
    },
  });
  if (!order) throw new Error('Commande introuvable.');
  if (order.status === 'PAID' && order.guests.length > 0) {
    return order;
  }

  const event = order.event;
  const isDonation = order.pricingZoneId === 'donation';
  const donationMeta =
    order.selectedSeats && typeof order.selectedSeats === 'object' && !Array.isArray(order.selectedSeats)
      ? (order.selectedSeats as Record<string, unknown>)
      : null;
  const wantDonorPass = isDonation ? donationMeta?.donorAttendancePass !== false : true;

  if (!isDonation) {
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
  }

  const { firstName, lastName } = splitBuyerName(order.buyerName);
  const guestPayloads: Array<{
    eventId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    category: string;
    rsvp: string;
    ticketOrderId: string;
    preferences?: { phone: string };
  }> = [];

  if (!isDonation || wantDonorPass) {
    const rawPayloads = Array.from({ length: order.quantity }, (_, i) => {
      const email = i === 0 ? order.buyerEmail.trim().toLowerCase() : companionTicketEmail(order.buyerEmail, i + 1, order.id);
      return {
        eventId: event.id,
        firstName: i === 0 ? firstName : `Invité ${i + 1}`,
        lastName,
        email,
        phone: i === 0 ? order.buyerPhone : null,
        category: isDonation ? 'Donateur' : (event.ticketingEnabled ? 'Billet' : 'Public'),
        rsvp: 'ACCEPTED',
        ticketOrderId: order.id,
        ...(i === 0 && order.buyerPhone ? { preferences: { phone: order.buyerPhone } } : {}),
      };
    });

    for (const row of rawPayloads) {
      const clash = await prisma.guest.findUnique({
        where: { eventId_email: { eventId: event.id, email: row.email } },
      });
      if (clash) {
        if (isDonation) {
          await prisma.guest.update({
            where: { id: clash.id },
            data: { category: 'Donateur', rsvp: 'ACCEPTED', ticketOrderId: order.id },
          });
        } else {
          throw new Error(`Un invité avec l’e-mail ${row.email} existe déjà pour cet événement.`);
        }
      } else {
        guestPayloads.push(row);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const row of guestPayloads) {
      await tx.guest.create({ data: row });
    }
    if (!isDonation) {
      await tx.event.update({
        where: { id: event.id },
        data: { ticketsSold: { increment: order.quantity } },
      });
    }
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
    include: {
      guests: {
        select: { id: true, email: true, firstName: true, lastName: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const rawSeats = order.selectedSeats;
  const parsedSeats: Array<{ tableId: string; seatIndex: number }> =
    Array.isArray(rawSeats) && rawSeats.length > 0
      ? (rawSeats as Array<{ tableId?: unknown; seatIndex?: unknown }>).map((s) => ({
          tableId: String(s.tableId),
          seatIndex: Number(s.seatIndex),
        }))
      : order.tableId != null && order.seatIndex != null
        ? [{ tableId: order.tableId, seatIndex: order.seatIndex }]
        : [];

  if (paid?.guests && parsedSeats.length > 0) {
    const assignments: Array<{ tableId: string; seatIndex: number; guestId: string }> = [];
    for (let i = 0; i < parsedSeats.length; i++) {
      const g = paid.guests[i];
      const s = parsedSeats[i];
      if (g && s) {
        assignments.push({ tableId: s.tableId, seatIndex: s.seatIndex, guestId: g.id });
      }
    }
    if (assignments.length > 0) {
      try {
        await assignMultipleSeatsInTablePlan(event.id, assignments);
      } catch (err) {
        console.error('[Ticket] assignMultipleSeatsInTablePlan', err);
      }
    }
  }

  // Libérer tous les holds de cette commande
  await prisma.seatHold.deleteMany({
    where: { orderId: order.id },
  }).catch(() => undefined);

  void notifyTicketPayment({
    id: order.id,
    userId: order.userId,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    buyerName: order.buyerName,
    amountFc: order.amountFc,
    quantity: order.quantity,
    eventTitle: event.title,
    eventId: event.id,
    tenantId: event.tenantId,
    tenantName: event.tenant.name,
  }).catch((err) => console.error('[Ticket] notify payment:', err));

  const primary = paid?.guests.find((g) => g.email.toLowerCase() === order.buyerEmail.toLowerCase()) || paid?.guests[0];
  const orgBrand = orgBrandFromTenant(event.tenant);
  if (isDonation) {
    const subject = `Merci pour votre don — ${event.title}`;
    const text = `Bonjour ${order.buyerName},\n\nNous vous remercions très chaleureusement pour votre don de ${order.amountFc.toLocaleString('fr-FR')} FC en soutien à « ${event.title} ».\n\nOrganisé par ${event.tenant.name}.\n`;
    const rsvpUrl = primary ? `${FRONTEND_URL}/rsvp/${primary.id}` : null;
    const html = wrapBrandedEmail({
      branding: orgBrand.branding,
      orgName: orgBrand.orgName,
      title: 'Don confirmé avec succès',
      eyebrow: event.title,
      innerHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${escapeHtml(order.buyerName)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Nous vous remercions très chaleureusement pour votre contribution solidaire de <strong>${order.amountFc.toLocaleString('fr-FR')} FC</strong> en soutien à <strong>${escapeHtml(event.title)}</strong>.</p>
        ${donationMeta?.donationNote ? `<div style="margin:0 0 16px;padding:12px 14px;background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#475569;font-style:italic;">« ${escapeHtml(String(donationMeta.donationNote))} »</div>` : ''}
        ${rsvpUrl ? `<p style="margin:0 0 16px;font-size:14px;color:#334155;">Un pass d’accès invité vous a été attribué pour l'événement.</p>` : ''}
      `,
      ...(rsvpUrl ? { cta: { href: rsvpUrl, label: 'Ouvrir mon espace invité' } } : {}),
      footerNote: 'Votre générosité fait la différence. Reçu de paiement généré par EventMaster.',
    });
    void sendRealEmail(order.buyerEmail, subject, text, html).catch(() => undefined);
  } else if (primary) {
    const rsvpUrl = `${FRONTEND_URL}/rsvp/${primary.id}`;
    let seatLine = '';
    if (parsedSeats.length === 1) {
      seatLine = `\nPlace réservée : table ${parsedSeats[0].tableId} · siège ${parsedSeats[0].seatIndex + 1}\n`;
    } else if (parsedSeats.length > 1) {
      seatLine =
        `\nPlaces réservées (${parsedSeats.length}) :\n` +
        parsedSeats.map((s, idx) => ` - Place ${idx + 1} : table ${s.tableId} · siège ${s.seatIndex + 1}`).join('\n') +
        '\n';
    }
    const subject = `Votre billet — ${event.title}`;
    const text = `Bonjour ${order.buyerName},\n\nVotre inscription à « ${event.title} » est confirmée (${order.quantity} place${order.quantity > 1 ? 's' : ''}).${seatLine}\nAccédez à votre espace invité (badge QR et itinéraire) :\n${rsvpUrl}\n\n${GUEST_COPY.ticket}\n\nOrganisé par ${event.tenant.name}.\n`;
    const html = wrapBrandedEmail({
      branding: orgBrand.branding,
      orgName: orgBrand.orgName,
      title: 'Billet confirmé',
      eyebrow: event.title,
      innerHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${escapeHtml(order.buyerName)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Votre inscription à <strong>${escapeHtml(event.title)}</strong> est confirmée (${order.quantity} place${order.quantity > 1 ? 's' : ''}).</p>
        ${seatLine ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;white-space:pre-line;">${escapeHtml(seatLine.trim())}</p>` : ''}
        ${brandedEventDetailsHtml(orgBrand.branding, [{ label: 'Lieu', value: event.location || '' }])}
      `,
      cta: { href: rsvpUrl, label: 'Ouvrir mon espace invité' },
      footerNote: GUEST_COPY.ticket,
    });
    void sendRealEmail(order.buyerEmail, subject, text, html).catch(() => undefined);
  }

  return paid;
}

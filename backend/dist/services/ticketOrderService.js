"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitBuyerName = splitBuyerName;
exports.companionTicketEmail = companionTicketEmail;
exports.ticketsRemaining = ticketsRemaining;
exports.fulfillTicketOrder = fulfillTicketOrder;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const notificationService_1 = require("./notificationService");
const paymentTraceService_1 = require("./paymentTraceService");
const seatSelectionService_1 = require("./seatSelectionService");
const brandedMessaging_1 = require("../utils/brandedMessaging");
const brandingUtils_1 = require("../utils/brandingUtils");
const guestMessageCopy_1 = require("../utils/guestMessageCopy");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
function splitBuyerName(fullName) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0)
        return { firstName: 'Invité', lastName: 'Billet' };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: 'Billet' };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}
function companionTicketEmail(baseEmail, index, orderId) {
    const at = baseEmail.lastIndexOf('@');
    if (at < 1)
        return `billet-${orderId.slice(0, 8)}-${index}@tickets.eventmaster.local`;
    const local = baseEmail.slice(0, at);
    const domain = baseEmail.slice(at + 1);
    return `${local}+billet${index}-${orderId.slice(0, 8)}@${domain}`;
}
function ticketsRemaining(event) {
    if (event.ticketsTotal == null)
        return null;
    return Math.max(0, event.ticketsTotal - event.ticketsSold);
}
async function fulfillTicketOrder(orderId, stripeSession) {
    const order = await db_1.prisma.ticketOrder.findUnique({
        where: { id: orderId },
        include: {
            event: { include: { tenant: { select: { id: true, plan: true, accountKind: true, name: true, branding: true } } } },
            guests: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
    });
    if (!order)
        throw new Error('Commande introuvable.');
    if (order.status === 'PAID' && order.guests.length > 0) {
        return order;
    }
    const event = order.event;
    const remaining = ticketsRemaining(event);
    if (remaining != null && remaining < order.quantity) {
        await db_1.prisma.ticketOrder.update({
            where: { id: orderId },
            data: { status: 'CANCELLED' },
        });
        throw new Error('Plus assez de billets disponibles.');
    }
    const guestCount = await db_1.prisma.guest.count({ where: { event: { tenantId: event.tenantId } } });
    const limits = (0, plansConfig_1.getPlanLimitsForTenant)(event.tenant.plan, event.tenant.accountKind);
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
        const clash = await db_1.prisma.guest.findUnique({
            where: { eventId_email: { eventId: event.id, email: row.email } },
        });
        if (clash) {
            throw new Error(`Un invité avec l’e-mail ${row.email} existe déjà pour cet événement.`);
        }
    }
    await db_1.prisma.$transaction(async (tx) => {
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
    const paid = await db_1.prisma.ticketOrder.findUnique({
        where: { id: order.id },
        include: {
            guests: {
                select: { id: true, email: true, firstName: true, lastName: true },
                orderBy: { createdAt: 'asc' },
            },
        },
    });
    const rawSeats = order.selectedSeats;
    const parsedSeats = Array.isArray(rawSeats) && rawSeats.length > 0
        ? rawSeats.map((s) => ({
            tableId: String(s.tableId),
            seatIndex: Number(s.seatIndex),
        }))
        : order.tableId != null && order.seatIndex != null
            ? [{ tableId: order.tableId, seatIndex: order.seatIndex }]
            : [];
    if (paid?.guests && parsedSeats.length > 0) {
        const assignments = [];
        for (let i = 0; i < parsedSeats.length; i++) {
            const g = paid.guests[i];
            const s = parsedSeats[i];
            if (g && s) {
                assignments.push({ tableId: s.tableId, seatIndex: s.seatIndex, guestId: g.id });
            }
        }
        if (assignments.length > 0) {
            try {
                await (0, seatSelectionService_1.assignMultipleSeatsInTablePlan)(event.id, assignments);
            }
            catch (err) {
                console.error('[Ticket] assignMultipleSeatsInTablePlan', err);
            }
        }
    }
    // Libérer tous les holds de cette commande
    await db_1.prisma.seatHold.deleteMany({
        where: { orderId: order.id },
    }).catch(() => undefined);
    void (0, paymentTraceService_1.notifyTicketPayment)({
        id: order.id,
        userId: order.userId,
        buyerEmail: order.buyerEmail,
        buyerPhone: order.buyerPhone,
        buyerName: order.buyerName,
        amountFc: order.amountFc,
        quantity: order.quantity,
        eventTitle: event.title,
    }).catch((err) => console.error('[Ticket] notify payment:', err));
    const primary = paid?.guests.find((g) => g.email.toLowerCase() === order.buyerEmail.toLowerCase()) || paid?.guests[0];
    if (primary) {
        const rsvpUrl = `${FRONTEND_URL}/rsvp/${primary.id}`;
        let seatLine = '';
        if (parsedSeats.length === 1) {
            seatLine = `\nPlace réservée : table ${parsedSeats[0].tableId} · siège ${parsedSeats[0].seatIndex + 1}\n`;
        }
        else if (parsedSeats.length > 1) {
            seatLine =
                `\nPlaces réservées (${parsedSeats.length}) :\n` +
                    parsedSeats.map((s, idx) => ` - Place ${idx + 1} : table ${s.tableId} · siège ${s.seatIndex + 1}`).join('\n') +
                    '\n';
        }
        const orgBrand = (0, brandedMessaging_1.orgBrandFromTenant)(event.tenant);
        const subject = `Votre billet — ${event.title}`;
        const text = `Bonjour ${order.buyerName},\n\nVotre inscription à « ${event.title} » est confirmée (${order.quantity} place${order.quantity > 1 ? 's' : ''}).${seatLine}\nAccédez à votre espace invité (badge QR et itinéraire) :\n${rsvpUrl}\n\n${guestMessageCopy_1.GUEST_COPY.ticket}\n\nOrganisé par ${event.tenant.name}.\n`;
        const html = (0, brandedMessaging_1.wrapBrandedEmail)({
            branding: orgBrand.branding,
            orgName: orgBrand.orgName,
            title: 'Billet confirmé',
            eyebrow: event.title,
            innerHtml: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${(0, brandingUtils_1.escapeHtml)(order.buyerName)}</strong>,</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Votre inscription à <strong>${(0, brandingUtils_1.escapeHtml)(event.title)}</strong> est confirmée (${order.quantity} place${order.quantity > 1 ? 's' : ''}).</p>
        ${seatLine ? `<p style="margin:0 0 16px;font-size:14px;color:#475569;white-space:pre-line;">${(0, brandingUtils_1.escapeHtml)(seatLine.trim())}</p>` : ''}
        ${(0, brandedMessaging_1.brandedEventDetailsHtml)(orgBrand.branding, [{ label: 'Lieu', value: event.location || '' }])}
      `,
            cta: { href: rsvpUrl, label: 'Ouvrir mon espace invité' },
            footerNote: guestMessageCopy_1.GUEST_COPY.ticket,
        });
        void (0, notificationService_1.sendRealEmail)(order.buyerEmail, subject, text, html).catch(() => undefined);
    }
    return paid;
}

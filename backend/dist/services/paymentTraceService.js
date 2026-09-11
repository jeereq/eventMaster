"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPaymentSuccess = recordPaymentSuccess;
exports.notifyAiTokenPayment = notifyAiTokenPayment;
exports.notifySubscriptionPayment = notifySubscriptionPayment;
exports.notifyTicketPayment = notifyTicketPayment;
exports.notifyTicketPaymentFailed = notifyTicketPaymentFailed;
const db_1 = require("../db");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const platformNotificationService_1 = require("./platformNotificationService");
const adminAuditService_1 = require("./adminAuditService");
const notificationService_1 = require("./notificationService");
const notificationTemplates_1 = require("../utils/notificationTemplates");
const tenantNotificationSettingsService_1 = require("./tenantNotificationSettingsService");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const KIND_LABEL = {
    ai_tokens: 'Jetons IA',
    subscription: 'Abonnement',
    ticket: 'Billet',
};
function formatAmount(amountFc, currency = 'CDF') {
    return `${Math.round(amountFc).toLocaleString('fr-FR')} ${currency === 'CDF' ? 'FC' : currency}`;
}
function isUniqueConstraint(error) {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002');
}
function staffPaymentHref(kind, metadata) {
    if (kind === 'ticket')
        return `${FRONTEND_URL}/dashboard/admin/payments?kind=ticket`;
    if (kind === 'subscription')
        return `${FRONTEND_URL}/dashboard/admin/payments?kind=subscription`;
    if (kind === 'ai_tokens')
        return `${FRONTEND_URL}/dashboard/admin/payments?kind=ai_tokens`;
    const href = metadata?.href;
    if (typeof href === 'string' && href.startsWith('/'))
        return `${FRONTEND_URL}${href}`;
    return `${FRONTEND_URL}/dashboard/audit`;
}
function staffPaymentTitle(kind, metadata) {
    if (kind === 'ticket') {
        const isDonation = Boolean(metadata?.isDonation);
        const eventTitle = typeof metadata?.eventTitle === 'string' ? metadata.eventTitle : '';
        if (isDonation) {
            return eventTitle ? `Don reçu — ${eventTitle}` : 'Don solidaire reçu';
        }
        return eventTitle ? `Billet vendu — ${eventTitle}` : 'Billet vendu';
    }
    if (kind === 'subscription') {
        const plan = typeof metadata?.plan === 'string' ? metadata.plan : '';
        return plan ? `Abonnement payé — ${plan}` : 'Abonnement payé';
    }
    if (kind === 'ai_tokens')
        return 'Recharge jetons IA';
    return `Paiement reçu — ${KIND_LABEL[kind]}`;
}
function staffPaymentMessage(input, amountLabel) {
    const tenantName = typeof input.metadata?.tenantName === 'string' ? input.metadata.tenantName : '';
    const buyer = (typeof input.metadata?.buyerName === 'string' && input.metadata.buyerName) ||
        input.payerEmail ||
        input.payerPhone ||
        '';
    const parts = [input.summary, amountLabel];
    if (tenantName)
        parts.push(tenantName);
    if (buyer && input.kind === 'ticket')
        parts.push(buyer);
    return parts.join(' · ');
}
/**
 * Enregistre un paiement réussi une seule fois, notifie le Super Admin et le payeur,
 * et écrit une ligne d’audit. Idempotent via PaymentTrace.reference.
 */
async function recordPaymentSuccess(input) {
    const reference = `${input.kind}:${input.reference}`;
    const currency = input.currency || 'CDF';
    const amountLabel = formatAmount(input.amountFc, currency);
    const kindLabel = KIND_LABEL[input.kind];
    try {
        await db_1.prisma.paymentTrace.create({
            data: {
                kind: input.kind,
                reference,
                amountFc: input.amountFc,
                currency,
                payerUserId: input.payerUserId || null,
                payerEmail: input.payerEmail || null,
                payerPhone: input.payerPhone || null,
                deviceId: input.deviceId || null,
                summary: input.summary,
                metadata: (input.metadata || undefined),
            },
        });
    }
    catch (error) {
        if (isUniqueConstraint(error)) {
            return { created: false };
        }
        console.error('[PaymentTrace] create:', error);
        return { created: false };
    }
    const titlePayer = 'Paiement confirmé';
    const hrefPayer = input.kind === 'ticket' ? `${FRONTEND_URL}/dashboard/tickets` : `${FRONTEND_URL}/dashboard`;
    const hrefStaff = staffPaymentHref(input.kind, input.metadata);
    const staffType = input.kind === 'ticket'
        ? platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.TICKET_SALE
        : platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED;
    const skipStaffNoise = input.kind === 'ticket' && input.amountFc <= 0;
    await (0, adminAuditService_1.logAdminAction)({
        actorId: input.payerUserId || 'system',
        actorRole: input.payerUserId ? 'USER' : 'SYSTEM',
        action: 'PAYMENT_RECEIVED',
        targetType: input.kind,
        targetId: input.reference,
        summary: input.summary,
        metadata: {
            amountFc: input.amountFc,
            currency,
            payerEmail: input.payerEmail || null,
            payerPhone: input.payerPhone || null,
            deviceId: input.deviceId || null,
            ...(input.metadata || {}),
        },
    });
    if (!skipStaffNoise) {
        void (0, platformNotificationService_1.notifyPlatformStaff)({
            type: staffType,
            title: staffPaymentTitle(input.kind, input.metadata),
            message: staffPaymentMessage(input, amountLabel),
            metadata: {
                kind: input.kind,
                kindLabel,
                reference: input.reference,
                amountFc: input.amountFc,
                href: hrefStaff,
                payerUserId: input.payerUserId || null,
                payerEmail: input.payerEmail || null,
                ...(input.metadata || {}),
            },
        }).catch((err) => console.error('[PaymentTrace] notify staff:', err));
    }
    if (input.payerUserId) {
        void (0, platformNotificationService_1.notifyUsers)([input.payerUserId], {
            type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
            title: titlePayer,
            message: `${input.summary} · ${amountLabel}`,
            metadata: {
                kind: input.kind,
                reference: input.reference,
                amountFc: input.amountFc,
                href: hrefPayer,
            },
        }).catch((err) => console.error('[PaymentTrace] notify payer:', err));
    }
    else {
        const emailCopy = (0, notificationTemplates_1.renderOperatorNotificationEmail)({
            title: titlePayer,
            message: `${input.summary} · ${amountLabel}`,
            href: FRONTEND_URL,
            familyLabel: 'Paiement',
        });
        if (input.payerEmail) {
            void (0, notificationService_1.sendRealEmail)(input.payerEmail, emailCopy.subject, emailCopy.text, emailCopy.html).catch((err) => console.error('[PaymentTrace] email guest:', err));
        }
        if (input.payerPhone) {
            void (0, notificationService_1.sendRealWhatsApp)(input.payerPhone, (0, notificationTemplates_1.renderOperatorWhatsApp)({
                title: titlePayer,
                message: `${input.summary} · ${amountLabel}`,
                href: FRONTEND_URL,
            })).catch((err) => console.error('[PaymentTrace] whatsapp guest:', err));
        }
    }
    return { created: true };
}
async function notifyAiTokenPayment(order) {
    let payerEmail = null;
    let payerPhone = order.phone || null;
    if (order.userId) {
        const user = await db_1.prisma.user.findUnique({
            where: { id: order.userId },
            select: { email: true, phone: true, phoneCountryCode: true },
        });
        payerEmail = user?.email || null;
        if (!payerPhone && user?.phone) {
            const cc = user.phoneCountryCode?.replace(/[^\d]/g, '') || '';
            const digits = user.phone.replace(/[^\d]/g, '').replace(/^0/, '');
            payerPhone = user.phone.startsWith('+') ? user.phone : cc && digits ? `+${cc}${digits}` : user.phone;
        }
    }
    return recordPaymentSuccess({
        kind: 'ai_tokens',
        reference: order.id,
        amountFc: Number(order.amountFc) || 2500,
        payerUserId: order.userId,
        payerEmail,
        payerPhone,
        deviceId: order.deviceId,
        summary: `Recharge ${order.tokensCount || 6} jetons IA (${order.paymentMethod === 'card' ? 'carte' : 'Mobile Money'})`,
        metadata: {
            tokensCount: order.tokensCount || 6,
            paymentMethod: order.paymentMethod || null,
            orderId: order.id,
        },
    });
}
async function notifySubscriptionPayment(params) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: {
            name: true,
            managerId: true,
            manager: { select: { email: true, phone: true, phoneCountryCode: true } },
        },
    });
    const manager = tenant?.manager;
    let payerPhone = null;
    if (manager?.phone) {
        const cc = manager.phoneCountryCode?.replace(/[^\d]/g, '') || '';
        const digits = manager.phone.replace(/[^\d]/g, '').replace(/^0/, '');
        payerPhone = manager.phone.startsWith('+') ? manager.phone : cc && digits ? `+${cc}${digits}` : manager.phone;
    }
    return recordPaymentSuccess({
        kind: 'subscription',
        reference: params.requestId,
        amountFc: params.amountFc,
        payerUserId: tenant?.managerId,
        payerEmail: manager?.email || null,
        payerPhone,
        summary: `Abonnement ${params.plan} — ${tenant?.name || 'Organisation'}`,
        metadata: {
            tenantId: params.tenantId,
            tenantName: tenant?.name || null,
            plan: params.plan,
            requestId: params.requestId,
        },
    });
}
async function notifyTicketPayment(order) {
    const isDonation = Boolean(order.isDonation);
    const quantity = order.quantity || 1;
    const amountFc = Number(order.amountFc) || 0;
    const eventTitle = order.eventTitle || 'événement';
    const amountLabel = formatAmount(amountFc);
    const buyer = order.buyerName || order.buyerEmail || (isDonation ? 'Un donateur anonyme' : 'Un acheteur');
    const donationNote = order.donationNote ? order.donationNote.trim() : '';
    const created = await recordPaymentSuccess({
        kind: 'ticket',
        reference: order.id,
        amountFc,
        payerUserId: order.userId,
        payerEmail: order.buyerEmail,
        payerPhone: order.buyerPhone,
        summary: isDonation
            ? `Don solidaire « ${eventTitle} » · ${amountLabel}`
            : `Billet${quantity > 1 ? 's' : ''} « ${eventTitle} » × ${quantity}`,
        metadata: {
            orderId: order.id,
            quantity,
            buyerName: order.buyerName || null,
            eventId: order.eventId || null,
            eventTitle,
            tenantId: order.tenantId || null,
            tenantName: order.tenantName || null,
            isDonation,
            donationNote: donationNote || null,
        },
    });
    if (!created.created || !order.tenantId)
        return created;
    const isPaid = amountFc > 0;
    const href = order.eventId
        ? `${FRONTEND_URL}/dashboard/events/${order.eventId}?tab=ticketing${isDonation ? '&type=DONATIONS' : ''}`
        : `${FRONTEND_URL}/dashboard/events`;
    // Résolution dynamique des destinataires selon la configuration du Propriétaire
    const { shouldNotify, recipientUserIds } = await (0, tenantNotificationSettingsService_1.resolveNotificationRecipients)({
        tenantId: order.tenantId,
        eventId: order.eventId,
        isDonation,
        isFailed: false,
    });
    if (!shouldNotify || recipientUserIds.length === 0) {
        return created;
    }
    const title = isDonation
        ? 'Nouveau don solidaire reçu'
        : isPaid
            ? 'Nouveau billet payé'
            : 'Nouvelle inscription';
    const message = isDonation
        ? `${buyer} a fait un don de ${amountLabel} pour « ${eventTitle} »${donationNote ? ` (« ${donationNote} »)` : ''}`
        : isPaid
            ? `${buyer} a acheté ${quantity} place${quantity > 1 ? 's' : ''} pour « ${eventTitle} » · ${amountLabel}`
            : `${buyer} s’est inscrit à « ${eventTitle} » (${quantity} place${quantity > 1 ? 's' : ''})`;
    void (0, platformNotificationService_1.notifyUsers)(recipientUserIds, {
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.TICKET_SALE,
        title,
        message,
        metadata: {
            kind: isDonation ? 'donation' : 'ticket',
            orderId: order.id,
            eventId: order.eventId || null,
            eventTitle,
            tenantId: order.tenantId,
            quantity,
            amountFc,
            isDonation,
            donationNote: donationNote || null,
            href,
        },
    }).catch((err) => console.error('[PaymentTrace] notify ticket/donation payment:', err));
    return created;
}
async function notifyTicketPaymentFailed(order) {
    if (!order.tenantId)
        return;
    const isDonation = Boolean(order.isDonation);
    const eventTitle = order.eventTitle || 'événement';
    const buyer = order.buyerName || order.buyerEmail || (isDonation ? 'Un donateur' : 'Un acheteur');
    const quantity = order.quantity || 1;
    const href = order.eventId
        ? `${FRONTEND_URL}/dashboard/events/${order.eventId}?tab=ticketing${isDonation ? '&type=DONATIONS' : ''}`
        : `${FRONTEND_URL}/dashboard/events`;
    // Résolution dynamique des destinataires selon la configuration du Propriétaire
    const { shouldNotify, recipientUserIds } = await (0, tenantNotificationSettingsService_1.resolveNotificationRecipients)({
        tenantId: order.tenantId,
        eventId: order.eventId,
        isDonation,
        isFailed: true,
    });
    if (!shouldNotify || recipientUserIds.length === 0) {
        return;
    }
    const title = isDonation ? 'Paiement de don non abouti' : 'Paiement de billet non abouti';
    const message = isDonation
        ? `${buyer} n’a pas finalisé son don solidaire pour « ${eventTitle} »`
        : `${buyer} n’a pas finalisé ${quantity} place${quantity > 1 ? 's' : ''} pour « ${eventTitle} »`;
    void (0, platformNotificationService_1.notifyUsers)(recipientUserIds, {
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.TICKET_PAYMENT_FAILED,
        title,
        message,
        metadata: {
            kind: isDonation ? 'donation' : 'ticket',
            orderId: order.id,
            eventId: order.eventId || null,
            eventTitle,
            tenantId: order.tenantId,
            quantity,
            amountFc: Number(order.amountFc) || 0,
            isDonation,
            href,
        },
    }).catch((err) => console.error('[PaymentTrace] notify ticket payment failed:', err));
}

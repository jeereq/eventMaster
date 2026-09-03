"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordPaymentSuccess = recordPaymentSuccess;
exports.notifyAiTokenPayment = notifyAiTokenPayment;
exports.notifySubscriptionPayment = notifySubscriptionPayment;
exports.notifyTicketPayment = notifyTicketPayment;
const db_1 = require("../db");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const platformNotificationService_1 = require("./platformNotificationService");
const adminAuditService_1 = require("./adminAuditService");
const notificationService_1 = require("./notificationService");
const notificationTemplates_1 = require("../utils/notificationTemplates");
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
    const titleStaff = `Paiement reçu — ${kindLabel}`;
    const hrefPayer = input.kind === 'ticket' ? `${FRONTEND_URL}/dashboard/tickets` : `${FRONTEND_URL}/dashboard`;
    const hrefStaff = `${FRONTEND_URL}/dashboard/audit`;
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
    void (0, platformNotificationService_1.notifyPlatformStaff)({
        type: platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.PAYMENT_RECEIVED,
        title: titleStaff,
        message: `${input.summary} · ${amountLabel}`,
        metadata: {
            kind: input.kind,
            reference: input.reference,
            amountFc: input.amountFc,
            href: hrefStaff,
            payerUserId: input.payerUserId || null,
            payerEmail: input.payerEmail || null,
        },
    }).catch((err) => console.error('[PaymentTrace] notify staff:', err));
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
        amountFc: Number(order.amountFc) || 2000,
        payerUserId: order.userId,
        payerEmail,
        payerPhone,
        deviceId: order.deviceId,
        summary: `Recharge ${order.tokensCount || 15} simulations IA (${order.paymentMethod === 'card' ? 'carte' : 'Mobile Money'})`,
        metadata: {
            tokensCount: order.tokensCount || 15,
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
            plan: params.plan,
            requestId: params.requestId,
        },
    });
}
async function notifyTicketPayment(order) {
    return recordPaymentSuccess({
        kind: 'ticket',
        reference: order.id,
        amountFc: Number(order.amountFc) || 0,
        payerUserId: order.userId,
        payerEmail: order.buyerEmail,
        payerPhone: order.buyerPhone,
        summary: `Billet${(order.quantity || 1) > 1 ? 's' : ''} « ${order.eventTitle || 'événement'} » × ${order.quantity || 1}`,
        metadata: {
            orderId: order.id,
            quantity: order.quantity || 1,
            buyerName: order.buyerName || null,
        },
    });
}

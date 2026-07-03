"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommercialBillingNotification = createCommercialBillingNotification;
exports.getUserNotifications = getUserNotifications;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
function formatAmountFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
function titleForEvent(event, tenantName) {
    switch (event) {
        case 'ADMIN_RENEWAL':
        case 'LICENSE_RENEWAL':
            return `Renouvellement — ${tenantName}`;
        case 'ADMIN_PLAN_CHANGE':
            return `Changement de forfait — ${tenantName}`;
        case 'ADMIN_ACTIVATION':
        case 'SUBSCRIPTION_APPROVAL':
        default:
            return `Abonnement activé — ${tenantName}`;
    }
}
async function createCommercialBillingNotification(params) {
    const planName = (0, plansConfig_1.getPlanLimits)(params.plan).name;
    const discountPart = params.discountAmount > 0
        ? ` Réduction ${params.discountPercent} % (− ${formatAmountFc(params.discountAmount)}).`
        : '';
    const commissionPart = params.commissionAmount !== undefined
        ? ` Votre commission estimée : ${formatAmountFc(params.commissionAmount)}.`
        : ' Votre commission sera calculée sur le montant facturé.';
    const message = [
        `Forfait ${planName} (${params.plan}) — ${params.durationDays} jours.`,
        `Montant facturé : ${formatAmountFc(params.finalAmount)} (catalogue ${formatAmountFc(params.baseAmount)}).${discountPart}`,
        params.invoiceNumber ? `Facture ${params.invoiceNumber}.` : '',
        commissionPart,
    ]
        .filter(Boolean)
        .join(' ');
    return db_1.prisma.platformNotification.create({
        data: {
            userId: params.userId,
            type: params.event,
            title: titleForEvent(params.event, params.tenantName),
            message,
            metadata: {
                tenantId: params.tenantId,
                tenantName: params.tenantName,
                plan: params.plan,
                finalAmount: params.finalAmount,
                baseAmount: params.baseAmount,
                discountPercent: params.discountPercent,
                discountAmount: params.discountAmount,
                invoiceNumber: params.invoiceNumber ?? null,
                commissionAmount: params.commissionAmount ?? null,
            },
        },
    });
}
async function getUserNotifications(userId, limit = 30) {
    const [items, unreadCount] = await Promise.all([
        db_1.prisma.platformNotification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        }),
        db_1.prisma.platformNotification.count({
            where: { userId, readAt: null },
        }),
    ]);
    return { items, unreadCount };
}
async function markNotificationRead(userId, notificationId) {
    const notification = await db_1.prisma.platformNotification.findFirst({
        where: { id: notificationId, userId },
    });
    if (!notification)
        return null;
    return db_1.prisma.platformNotification.update({
        where: { id: notificationId },
        data: { readAt: notification.readAt ?? new Date() },
    });
}
async function markAllNotificationsRead(userId) {
    const result = await db_1.prisma.platformNotification.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
    });
    return result.count;
}

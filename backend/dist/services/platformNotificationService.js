"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommercialBillingNotification = createCommercialBillingNotification;
exports.createPlatformNotification = createPlatformNotification;
exports.hasNotificationForPeriod = hasNotificationForPeriod;
exports.getUserNotifications = getUserNotifications;
exports.notifyUsers = notifyUsers;
exports.notifyPlatformStaff = notifyPlatformStaff;
exports.notifyTenantOperators = notifyTenantOperators;
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const expoPushService_1 = require("./expoPushService");
const notificationService_1 = require("./notificationService");
const notificationPreferenceService_1 = require("./notificationPreferenceService");
const notificationTemplates_1 = require("../utils/notificationTemplates");
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
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
async function logDelivery(params) {
    try {
        await db_1.prisma.notificationDelivery.create({
            data: {
                notificationId: params.notificationId,
                channel: params.channel,
                status: params.status,
                providerId: params.providerId || null,
                error: params.error ? params.error.slice(0, 500) : null,
            },
        });
    }
    catch (err) {
        console.error('[platformNotification] journal livraison:', err);
    }
}
async function fanOutChannels(notification, extras) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true, phone: true, phoneCountryCode: true },
    });
    if (!user)
        return;
    const pref = await (0, notificationPreferenceService_1.resolveChannelPreference)(notification.userId, notification.type);
    const channels = (0, notificationPreferenceService_1.allowedChannels)(pref, extras.channels);
    const metadata = notification.metadata ?? null;
    const href = (0, notificationTemplates_1.resolveNotificationHref)(metadata);
    if (channels.has('PUSH')) {
        try {
            const result = await (0, expoPushService_1.sendExpoPushToUser)(notification.userId, {
                title: notification.title,
                body: notification.message,
                data: {
                    notificationId: notification.id,
                    type: notification.type,
                    ...(metadata || {}),
                },
            });
            if (result.sent > 0) {
                await logDelivery({
                    notificationId: notification.id,
                    channel: 'PUSH',
                    status: 'SENT',
                    providerId: `${result.sent} device(s)`,
                });
            }
        }
        catch (err) {
            await logDelivery({
                notificationId: notification.id,
                channel: 'PUSH',
                status: 'FAILED',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (channels.has('EMAIL') && user.email) {
        const family = (0, platformNotificationTypes_1.familyForType)(notification.type);
        const rendered = (0, notificationTemplates_1.renderOperatorNotificationEmail)({
            title: notification.title,
            message: notification.message,
            href,
            familyLabel: notificationTemplates_1.FAMILY_LABEL_FR[family] || 'Compte',
        });
        const subject = extras.email?.subject || rendered.subject;
        const text = extras.email?.text || rendered.text;
        const html = extras.email?.html || rendered.html;
        const result = await (0, notificationService_1.sendRealEmail)(user.email, subject, text, html);
        await logDelivery({
            notificationId: notification.id,
            channel: 'EMAIL',
            status: result.simulated ? 'SIMULATED' : result.success ? 'SENT' : 'FAILED',
            providerId: result.messageId,
            error: result.error,
        });
    }
    const waTo = (0, notificationTemplates_1.userWhatsAppNumber)(user);
    if (channels.has('WHATSAPP') && waTo) {
        const body = extras.whatsapp?.trim()
            ? (0, notificationTemplates_1.formatOperatorWhatsApp)(extras.whatsapp)
            : (0, notificationTemplates_1.renderOperatorWhatsApp)({
                title: notification.title,
                message: notification.message,
                href,
            });
        const result = await (0, notificationService_1.sendRealWhatsApp)(waTo, body);
        await logDelivery({
            notificationId: notification.id,
            channel: 'WHATSAPP',
            status: result.simulated ? 'SIMULATED' : result.success ? 'SENT' : 'FAILED',
            providerId: result.messageSid,
            error: result.error,
        });
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
    return createPlatformNotification({
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
            href: `${FRONTEND_URL}/dashboard/notifications`,
        },
    });
}
async function createPlatformNotification(params) {
    const notification = await db_1.prisma.platformNotification.create({
        data: {
            userId: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            metadata: params.metadata ?? undefined,
        },
    });
    void fanOutChannels(notification, {
        channels: params.channels,
        email: params.email,
        whatsapp: params.whatsapp,
    }).catch((err) => {
        console.error('[platformNotification] fan-out:', err);
    });
    return notification;
}
async function hasNotificationForPeriod(params) {
    const rows = await db_1.prisma.platformNotification.findMany({
        where: { userId: params.userId, type: params.type },
        select: { metadata: true },
        take: 40,
        orderBy: { createdAt: 'desc' },
    });
    return rows.some((row) => {
        const meta = row.metadata;
        return meta?.period === params.period;
    });
}
async function getUserNotifications(userId, opts) {
    const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 100);
    const page = Math.max(opts?.page ?? 1, 1);
    const familyTypes = (0, platformNotificationTypes_1.typesForFamily)(opts?.family);
    const where = {
        userId,
        ...(opts?.unread ? { readAt: null } : {}),
        ...(opts?.type ? { type: opts.type } : {}),
        ...(familyTypes ? { type: { in: familyTypes } } : {}),
        ...(opts?.eventId
            ? { metadata: { path: ['eventId'], equals: opts.eventId } }
            : {}),
    };
    const [items, unreadCount, total] = await Promise.all([
        db_1.prisma.platformNotification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: (page - 1) * limit,
        }),
        db_1.prisma.platformNotification.count({ where: { userId, readAt: null } }),
        db_1.prisma.platformNotification.count({ where }),
    ]);
    return {
        items,
        unreadCount,
        total,
        page,
        pageSize: limit,
        hasMore: page * limit < total,
    };
}
async function notifyUsers(userIds, params) {
    const unique = [...new Set(userIds.filter((id) => Boolean(id)))];
    await Promise.all(unique.map((userId) => createPlatformNotification({ userId, ...params })));
}
async function notifyPlatformStaff(params) {
    const { includeCommercials, ...notifyParams } = params;
    const users = await db_1.prisma.user.findMany({
        where: includeCommercials
            ? { OR: [{ role: 'SUPER_ADMIN' }, { role: 'COMMERCIAL', tenantId: null }] }
            : { role: 'SUPER_ADMIN' },
        select: { id: true },
    });
    await notifyUsers(users.map((u) => u.id), notifyParams);
}
async function notifyTenantOperators(tenantId, params) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            managerId: true,
            users: {
                where: { orgRole: 'MANAGER' },
                select: { id: true },
            },
        },
    });
    if (!tenant)
        return;
    await notifyUsers([tenant.managerId, ...tenant.users.map((u) => u.id)], params);
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

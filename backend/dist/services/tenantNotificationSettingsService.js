"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TENANT_NOTIFICATION_SETTINGS = void 0;
exports.getTenantNotificationSettings = getTenantNotificationSettings;
exports.updateTenantNotificationSettings = updateTenantNotificationSettings;
exports.resolveNotificationRecipients = resolveNotificationRecipients;
const db_1 = require("../db");
exports.DEFAULT_TENANT_NOTIFICATION_SETTINGS = {
    ticketsEnabled: true,
    donationsEnabled: true,
    recipientMode: 'OWNER_AND_MANAGERS',
    customUserIds: [],
    includeEventStaff: true,
    notifyOnPaymentFailed: true,
};
function sanitizeSettings(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return { ...exports.DEFAULT_TENANT_NOTIFICATION_SETTINGS };
    }
    const obj = raw;
    const validModes = ['OWNER_ONLY', 'OWNER_AND_MANAGERS', 'CUSTOM'];
    const recipientMode = typeof obj.recipientMode === 'string' && validModes.includes(obj.recipientMode)
        ? obj.recipientMode
        : exports.DEFAULT_TENANT_NOTIFICATION_SETTINGS.recipientMode;
    const customUserIds = Array.isArray(obj.customUserIds)
        ? obj.customUserIds.filter((id) => typeof id === 'string' && Boolean(id.trim()))
        : [];
    return {
        ticketsEnabled: typeof obj.ticketsEnabled === 'boolean' ? obj.ticketsEnabled : true,
        donationsEnabled: typeof obj.donationsEnabled === 'boolean' ? obj.donationsEnabled : true,
        recipientMode,
        customUserIds,
        includeEventStaff: typeof obj.includeEventStaff === 'boolean' ? obj.includeEventStaff : true,
        notifyOnPaymentFailed: typeof obj.notifyOnPaymentFailed === 'boolean' ? obj.notifyOnPaymentFailed : true,
    };
}
/**
 * Récupère les paramètres de notification de l'organisation.
 */
async function getTenantNotificationSettings(tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { notificationSettings: true },
    });
    return sanitizeSettings(tenant?.notificationSettings);
}
/**
 * Met à jour les paramètres de notification configurés par le propriétaire.
 */
async function updateTenantNotificationSettings(tenantId, input) {
    const current = await getTenantNotificationSettings(tenantId);
    let validatedCustomUserIds = current.customUserIds;
    if (Array.isArray(input.customUserIds)) {
        // Sécurité : s'assurer que les utilisateurs sélectionnés appartiennent bien à cette organisation
        const cleanIds = input.customUserIds.filter((id) => typeof id === 'string' && Boolean(id.trim()));
        if (cleanIds.length > 0) {
            const validOrgUsers = await db_1.prisma.user.findMany({
                where: { tenantId, id: { in: cleanIds } },
                select: { id: true },
            });
            validatedCustomUserIds = validOrgUsers.map((u) => u.id);
        }
        else {
            validatedCustomUserIds = [];
        }
    }
    const validModes = ['OWNER_ONLY', 'OWNER_AND_MANAGERS', 'CUSTOM'];
    const nextMode = input.recipientMode && validModes.includes(input.recipientMode)
        ? input.recipientMode
        : current.recipientMode;
    const merged = {
        ticketsEnabled: typeof input.ticketsEnabled === 'boolean' ? input.ticketsEnabled : current.ticketsEnabled,
        donationsEnabled: typeof input.donationsEnabled === 'boolean' ? input.donationsEnabled : current.donationsEnabled,
        recipientMode: nextMode,
        customUserIds: validatedCustomUserIds,
        includeEventStaff: typeof input.includeEventStaff === 'boolean' ? input.includeEventStaff : current.includeEventStaff,
        notifyOnPaymentFailed: typeof input.notifyOnPaymentFailed === 'boolean' ? input.notifyOnPaymentFailed : current.notifyOnPaymentFailed,
    };
    await db_1.prisma.tenant.update({
        where: { id: tenantId },
        data: {
            notificationSettings: merged,
        },
    });
    return merged;
}
/**
 * Résout la liste des identifiants d'utilisateurs à notifier selon la configuration du propriétaire.
 */
async function resolveNotificationRecipients(params) {
    const { tenantId, eventId, isDonation, isFailed } = params;
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            managerId: true,
            notificationSettings: true,
            users: {
                select: { id: true, orgRole: true },
            },
        },
    });
    if (!tenant) {
        return { shouldNotify: false, recipientUserIds: [] };
    }
    const settings = sanitizeSettings(tenant.notificationSettings);
    // 1. Vérification si la notification est activée
    if (isDonation && !settings.donationsEnabled) {
        return { shouldNotify: false, recipientUserIds: [] };
    }
    if (!isDonation && !settings.ticketsEnabled) {
        return { shouldNotify: false, recipientUserIds: [] };
    }
    if (isFailed && !settings.notifyOnPaymentFailed) {
        return { shouldNotify: false, recipientUserIds: [] };
    }
    // 2. Détermination des destinataires de base
    const recipientIds = new Set();
    // Le propriétaire est toujours inclus dans les destinataires autorisés
    if (tenant.managerId) {
        recipientIds.add(tenant.managerId);
    }
    if (settings.recipientMode === 'OWNER_AND_MANAGERS') {
        tenant.users
            .filter((u) => u.orgRole === 'MANAGER')
            .forEach((u) => recipientIds.add(u.id));
    }
    else if (settings.recipientMode === 'CUSTOM') {
        const orgUserIds = new Set(tenant.users.map((u) => u.id));
        settings.customUserIds
            .filter((id) => orgUserIds.has(id))
            .forEach((id) => recipientIds.add(id));
    }
    // 3. Membres assignés à l'événement spécifique (EventStaff)
    if (settings.includeEventStaff && eventId) {
        try {
            const staffRows = await db_1.prisma.eventStaff.findMany({
                where: { eventId },
                select: { userId: true },
            });
            staffRows.forEach((s) => recipientIds.add(s.userId));
        }
        catch (err) {
            console.error('[tenantNotificationSettings] fetch event staff failed:', err);
        }
    }
    return {
        shouldNotify: true,
        recipientUserIds: Array.from(recipientIds),
    };
}

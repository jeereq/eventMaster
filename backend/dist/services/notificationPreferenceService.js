"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultChannelPreference = defaultChannelPreference;
exports.getNotificationPreferences = getNotificationPreferences;
exports.saveNotificationPreferences = saveNotificationPreferences;
exports.resolveChannelPreference = resolveChannelPreference;
exports.allowedChannels = allowedChannels;
const db_1 = require("../db");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const notificationTemplates_1 = require("../utils/notificationTemplates");
const platformSettingsService_1 = require("./platformSettingsService");
function defaultChannelPreference(hasPhone) {
    return {
        email: true,
        whatsapp: hasPhone,
        push: true,
        sms: false,
    };
}
function mergePreference(row, hasPhone) {
    const defaults = defaultChannelPreference(hasPhone);
    if (!row)
        return defaults;
    return {
        email: typeof row.email === 'boolean' ? row.email : defaults.email,
        whatsapp: hasPhone ? (typeof row.whatsapp === 'boolean' ? row.whatsapp : false) : false,
        push: typeof row.push === 'boolean' ? row.push : defaults.push,
        sms: hasPhone ? (typeof row.sms === 'boolean' ? row.sms : false) : false,
    };
}
async function getNotificationPreferences(userId) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneCountryCode: true },
    });
    const hasPhone = Boolean((0, notificationTemplates_1.userWhatsAppNumber)(user ?? {}));
    const rows = await db_1.prisma.notificationPreference.findMany({
        where: { userId },
    });
    const byFamily = new Map(rows.map((row) => [row.family, row]));
    const families = {};
    for (const family of platformNotificationTypes_1.NOTIFICATION_PREF_FAMILIES) {
        const row = byFamily.get(family);
        families[family] = mergePreference(row, hasPhone);
    }
    return { hasPhone, families };
}
async function saveNotificationPreferences(userId, input) {
    const updates = Object.entries(input).filter(([family]) => (0, platformNotificationTypes_1.isNotificationPrefFamily)(family));
    await Promise.all(updates.map(([family, value]) => {
        const next = value || {};
        return db_1.prisma.notificationPreference.upsert({
            where: { userId_family: { userId, family } },
            create: {
                userId,
                family,
                email: next.email ?? true,
                whatsapp: next.whatsapp ?? false,
                push: next.push ?? true,
                sms: next.sms ?? false,
            },
            update: {
                ...(typeof next.email === 'boolean' ? { email: next.email } : {}),
                ...(typeof next.whatsapp === 'boolean' ? { whatsapp: next.whatsapp } : {}),
                ...(typeof next.push === 'boolean' ? { push: next.push } : {}),
                ...(typeof next.sms === 'boolean' ? { sms: next.sms } : {}),
            },
        });
    }));
    return getNotificationPreferences(userId);
}
async function resolveChannelPreference(userId, type) {
    const family = (0, platformNotificationTypes_1.familyForType)(type);
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true, phoneCountryCode: true },
    });
    const hasPhone = Boolean((0, notificationTemplates_1.userWhatsAppNumber)(user ?? {}));
    if (family === 'account') {
        return defaultChannelPreference(hasPhone);
    }
    const row = await db_1.prisma.notificationPreference.findUnique({
        where: { userId_family: { userId, family } },
    });
    return mergePreference(row ?? undefined, hasPhone);
}
function allowedChannels(pref, override, platformEnabled) {
    const globalChannels = platformEnabled ?? (0, platformSettingsService_1.loadPlatformSettings)().notificationChannels;
    const platformSet = globalChannels ? new Set(globalChannels) : null;
    const enabled = ['IN_APP'];
    if (pref.email && (!platformSet || platformSet.has('EMAIL')))
        enabled.push('EMAIL');
    if (pref.whatsapp && (!platformSet || platformSet.has('WHATSAPP')))
        enabled.push('WHATSAPP');
    if (pref.push && (!platformSet || platformSet.has('PUSH')))
        enabled.push('PUSH');
    if (pref.sms && (!platformSet || platformSet.has('SMS')))
        enabled.push('SMS');
    const allowed = new Set(enabled);
    if (!override?.length)
        return allowed;
    return new Set(override.filter((channel) => allowed.has(channel) || channel === 'IN_APP'));
}

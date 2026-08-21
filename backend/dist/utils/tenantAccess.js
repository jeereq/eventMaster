"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAccountKind = parseAccountKind;
exports.formatTenantResponse = formatTenantResponse;
exports.getTenantForUser = getTenantForUser;
exports.isTenantManager = isTenantManager;
exports.verifyTenantMember = verifyTenantMember;
exports.verifyEventBelongsToTenant = verifyEventBelongsToTenant;
const db_1 = require("../db");
const brandingUtils_1 = require("./brandingUtils");
function parseAccountKind(raw, fallback = 'ORGANIZER') {
    if (raw === 'VENDOR' || raw === 'BOTH' || raw === 'ORGANIZER' || raw === 'CLIENT') {
        return raw;
    }
    return fallback;
}
function formatTenantResponse(tenant) {
    const branding = (0, brandingUtils_1.parseBranding)(tenant.branding);
    return {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        licenseActive: tenant.licenseActive,
        licenseExpiresAt: tenant.licenseExpiresAt,
        managerId: tenant.managerId,
        branding: branding || undefined,
        accountKind: tenant.accountKind || 'ORGANIZER',
    };
}
async function getTenantForUser(tenantId) {
    if (!tenantId)
        return null;
    return db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
}
async function isTenantManager(userId, tenantId) {
    const tenant = await db_1.prisma.tenant.findFirst({
        where: { id: tenantId, managerId: userId },
    });
    return Boolean(tenant);
}
async function verifyTenantMember(userId, tenantId) {
    if (!tenantId)
        return false;
    const user = await db_1.prisma.user.findFirst({
        where: { id: userId, tenantId, role: 'USER' },
    });
    return Boolean(user);
}
async function verifyEventBelongsToTenant(eventId, tenantId) {
    return db_1.prisma.event.findFirst({
        where: { id: eventId, tenantId },
    });
}

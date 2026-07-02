"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTenantResponse = formatTenantResponse;
exports.getTenantForUser = getTenantForUser;
exports.isTenantManager = isTenantManager;
exports.verifyTenantMember = verifyTenantMember;
exports.verifyEventBelongsToTenant = verifyEventBelongsToTenant;
const db_1 = require("../db");
function formatTenantResponse(tenant) {
    return {
        id: tenant.id,
        name: tenant.name,
        plan: tenant.plan,
        licenseActive: tenant.licenseActive,
        licenseExpiresAt: tenant.licenseExpiresAt,
        managerId: tenant.managerId,
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

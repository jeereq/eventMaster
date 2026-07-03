"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPlatformCommercial = isPlatformCommercial;
exports.commercialReferredTenantFilter = commercialReferredTenantFilter;
exports.assertCommercialOwnsTenant = assertCommercialOwnsTenant;
exports.assertCommercialOwnsInvoice = assertCommercialOwnsInvoice;
const db_1 = require("../db");
function isPlatformCommercial(role) {
    return role === 'COMMERCIAL';
}
function commercialReferredTenantFilter(commercialUserId) {
    return { referredByCommercialId: commercialUserId };
}
async function assertCommercialOwnsTenant(commercialUserId, tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { referredByCommercialId: true },
    });
    return tenant?.referredByCommercialId === commercialUserId;
}
async function assertCommercialOwnsInvoice(commercialUserId, invoiceId) {
    const invoice = await db_1.prisma.platformInvoice.findUnique({
        where: { id: invoiceId },
        select: { tenant: { select: { referredByCommercialId: true } } },
    });
    return invoice?.tenant?.referredByCommercialId === commercialUserId;
}

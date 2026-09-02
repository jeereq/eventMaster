"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RENEWAL_COMMISSION_RATE = exports.DEFAULT_COMMISSION_RATE = void 0;
exports.formatAmountFc = formatAmountFc;
exports.defaultFirstCommissionRate = defaultFirstCommissionRate;
exports.defaultRenewalCommissionRate = defaultRenewalCommissionRate;
exports.generateReferralCode = generateReferralCode;
exports.parsePlanPrice = parsePlanPrice;
exports.getBillingPeriod = getBillingPeriod;
exports.normalizeCommissionRate = normalizeCommissionRate;
exports.resolveCommissionRates = resolveCommissionRates;
exports.ensureCommercialReferralCode = ensureCommercialReferralCode;
exports.ensureOrgCommercialReferralCode = ensureOrgCommercialReferralCode;
exports.resolveCommercialByReferralCode = resolveCommercialByReferralCode;
exports.recordCommercialCommission = recordCommercialCommission;
exports.notifyCommercialsOnSubscriptionApproval = notifyCommercialsOnSubscriptionApproval;
exports.findGuestSeatInTablePlan = findGuestSeatInTablePlan;
exports.extractGuestIdFromScanPayload = extractGuestIdFromScanPayload;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const platformNotificationService_1 = require("./platformNotificationService");
const platformSettingsService_1 = require("./platformSettingsService");
const ratePercent_1 = require("../utils/ratePercent");
function formatAmountFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
exports.DEFAULT_COMMISSION_RATE = 0.3;
exports.DEFAULT_RENEWAL_COMMISSION_RATE = 0.2;
function defaultFirstCommissionRate() {
    try {
        return (0, ratePercent_1.parseRateInput)((0, platformSettingsService_1.loadPlatformSettings)().commercialFirstCommissionRate, exports.DEFAULT_COMMISSION_RATE, 0, 1);
    }
    catch {
        return exports.DEFAULT_COMMISSION_RATE;
    }
}
function defaultRenewalCommissionRate() {
    try {
        return (0, ratePercent_1.parseRateInput)((0, platformSettingsService_1.loadPlatformSettings)().commercialRenewalCommissionRate, exports.DEFAULT_RENEWAL_COMMISSION_RATE, 0, 1);
    }
    catch {
        return exports.DEFAULT_RENEWAL_COMMISSION_RATE;
    }
}
function generateReferralCode(name, prefix = 'EM') {
    const rolePrefix = prefix === 'ORG' ? 'ORG' : 'EM';
    const namePart = (name || 'COM')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase()
        .padEnd(4, 'X');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${rolePrefix}-${namePart}-${suffix}`;
}
function parsePlanPrice(priceLabel) {
    const digits = priceLabel.replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
}
function getBillingPeriod(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}
function normalizeCommissionRate(rate, fallback = exports.DEFAULT_COMMISSION_RATE) {
    const value = typeof rate === 'number' ? rate : parseFloat(String(rate));
    if (!Number.isFinite(value))
        return fallback;
    return Math.min(1, Math.max(0, value));
}
function resolveCommissionRates(params) {
    return {
        first: normalizeCommissionRate(params.first, params.firstFallback ?? defaultFirstCommissionRate()),
        renewal: normalizeCommissionRate(params.renewal, params.renewalFallback ?? defaultRenewalCommissionRate()),
    };
}
function isRenewalCommissionSource(source) {
    return /RENEWAL/i.test(source);
}
async function assignUniqueReferralCode(userId, name, prefix = 'EM') {
    let code = generateReferralCode(name, prefix);
    for (let attempt = 0; attempt < 8; attempt++) {
        const existing = await db_1.prisma.user.findUnique({ where: { referralCode: code } });
        if (!existing)
            break;
        code = generateReferralCode(name, prefix);
    }
    const updated = await db_1.prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
    });
    return updated.referralCode;
}
async function ensureCommercialReferralCode(userId) {
    const user = await db_1.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, referralCode: true, name: true, tenantId: true },
    });
    if (!user || user.role !== 'COMMERCIAL' || user.tenantId) {
        throw new Error('Utilisateur commercial plateforme introuvable.');
    }
    if (user.referralCode)
        return user.referralCode;
    return assignUniqueReferralCode(userId, user.name, 'EM');
}
async function ensureOrgCommercialReferralCode(userId, tenantId) {
    const user = await db_1.prisma.user.findFirst({
        where: { id: userId, tenantId, role: 'USER', orgRole: 'COMMERCIAL' },
        select: { id: true, referralCode: true, name: true },
    });
    if (!user) {
        throw new Error('Commercial organisation introuvable.');
    }
    if (user.referralCode)
        return user.referralCode;
    return assignUniqueReferralCode(userId, user.name, 'ORG');
}
async function resolveCommercialByReferralCode(referralCode) {
    const code = referralCode.trim().toUpperCase();
    const platformCommercial = await db_1.prisma.user.findFirst({
        where: { referralCode: code, role: 'COMMERCIAL', tenantId: null },
        select: { id: true, name: true, referralCode: true, commissionRate: true, renewalCommissionRate: true },
    });
    if (platformCommercial?.referralCode) {
        const rates = resolveCommissionRates({
            first: platformCommercial.commissionRate,
            renewal: platformCommercial.renewalCommissionRate,
        });
        return {
            type: 'platform',
            id: platformCommercial.id,
            name: platformCommercial.name,
            referralCode: platformCommercial.referralCode,
            commissionRate: rates.first,
            renewalCommissionRate: rates.renewal,
        };
    }
    const orgCommercial = await db_1.prisma.user.findFirst({
        where: { referralCode: code, role: 'USER', orgRole: 'COMMERCIAL' },
        select: {
            id: true,
            name: true,
            referralCode: true,
            commissionRate: true,
            renewalCommissionRate: true,
            tenantId: true,
            tenant: {
                select: {
                    defaultOrgCommercialCommissionRate: true,
                    defaultOrgCommercialRenewalCommissionRate: true,
                },
            },
        },
    });
    if (orgCommercial?.referralCode && orgCommercial.tenantId) {
        const rates = resolveCommissionRates({
            first: orgCommercial.commissionRate,
            renewal: orgCommercial.renewalCommissionRate,
            firstFallback: orgCommercial.tenant?.defaultOrgCommercialCommissionRate ?? exports.DEFAULT_COMMISSION_RATE,
            renewalFallback: orgCommercial.tenant?.defaultOrgCommercialRenewalCommissionRate ?? exports.DEFAULT_RENEWAL_COMMISSION_RATE,
        });
        return {
            type: 'org',
            id: orgCommercial.id,
            name: orgCommercial.name,
            referralCode: orgCommercial.referralCode,
            commissionRate: rates.first,
            renewalCommissionRate: rates.renewal,
            parentTenantId: orgCommercial.tenantId,
        };
    }
    return null;
}
async function recordCommercialCommission(params) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: {
            id: true,
            referredByCommercialId: true,
            referredByOrgUserId: true,
        },
    });
    if (!tenant)
        return [];
    const invoiceAmount = params.invoiceAmount ?? parsePlanPrice((0, plansConfig_1.getPlanLimits)(params.plan).price);
    if (invoiceAmount <= 0)
        return [];
    const billingPeriod = getBillingPeriod();
    const results = [];
    const forceRenewal = isRenewalCommissionSource(params.source);
    const upsertCommission = async (opts) => {
        const previousCount = await db_1.prisma.commercialCommission.count({
            where: {
                commercialId: opts.commercialId,
                tenantId: tenant.id,
                NOT: { billingPeriod },
            },
        });
        const isFirst = previousCount === 0 && !forceRenewal;
        const rate = isFirst ? opts.rates.first : opts.rates.renewal;
        const commissionAmount = Math.round(invoiceAmount * rate);
        await db_1.prisma.commercialCommission.upsert({
            where: {
                commercialId_tenantId_billingPeriod: {
                    commercialId: opts.commercialId,
                    tenantId: tenant.id,
                    billingPeriod,
                },
            },
            create: {
                commercialId: opts.commercialId,
                tenantId: tenant.id,
                plan: params.plan,
                invoiceAmount,
                commissionRate: rate,
                commissionAmount,
                billingPeriod,
                source: opts.source,
                platformInvoiceId: params.platformInvoiceId ?? null,
            },
            update: {
                plan: params.plan,
                invoiceAmount,
                commissionRate: rate,
                commissionAmount,
                source: opts.source,
                platformInvoiceId: params.platformInvoiceId ?? undefined,
            },
        });
        results.push({ commercialId: opts.commercialId, commissionAmount });
    };
    if (tenant.referredByCommercialId) {
        const commercial = await db_1.prisma.user.findUnique({
            where: { id: tenant.referredByCommercialId },
            select: { id: true, commissionRate: true, renewalCommissionRate: true, role: true },
        });
        if (commercial?.role === 'COMMERCIAL') {
            await upsertCommission({
                commercialId: commercial.id,
                rates: resolveCommissionRates({
                    first: commercial.commissionRate,
                    renewal: commercial.renewalCommissionRate,
                }),
                source: params.source,
            });
        }
    }
    if (tenant.referredByOrgUserId) {
        const orgCommercial = await db_1.prisma.user.findFirst({
            where: { id: tenant.referredByOrgUserId, role: 'USER', orgRole: 'COMMERCIAL' },
            select: {
                id: true,
                commissionRate: true,
                renewalCommissionRate: true,
                tenant: {
                    select: {
                        defaultOrgCommercialCommissionRate: true,
                        defaultOrgCommercialRenewalCommissionRate: true,
                    },
                },
            },
        });
        if (orgCommercial) {
            await upsertCommission({
                commercialId: orgCommercial.id,
                rates: resolveCommissionRates({
                    first: orgCommercial.commissionRate,
                    renewal: orgCommercial.renewalCommissionRate,
                    firstFallback: orgCommercial.tenant?.defaultOrgCommercialCommissionRate ?? exports.DEFAULT_COMMISSION_RATE,
                    renewalFallback: orgCommercial.tenant?.defaultOrgCommercialRenewalCommissionRate ?? exports.DEFAULT_RENEWAL_COMMISSION_RATE,
                }),
                source: `${params.source}_ORG`,
            });
        }
    }
    return results;
}
async function getTenantCommercialContacts(tenantId) {
    const tenant = await db_1.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            referredByCommercial: {
                select: { id: true, name: true, email: true, phone: true, role: true },
            },
            referredByOrgUser: {
                select: { id: true, name: true, email: true, phone: true, orgRole: true },
            },
        },
    });
    const contacts = [];
    const seen = new Set();
    if (tenant?.referredByCommercial?.role === 'COMMERCIAL') {
        seen.add(tenant.referredByCommercial.id);
        contacts.push({
            id: tenant.referredByCommercial.id,
            name: tenant.referredByCommercial.name,
            email: tenant.referredByCommercial.email,
            phone: tenant.referredByCommercial.phone,
            kind: 'platform',
        });
    }
    if (tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL' && !seen.has(tenant.referredByOrgUser.id)) {
        contacts.push({
            id: tenant.referredByOrgUser.id,
            name: tenant.referredByOrgUser.name,
            email: tenant.referredByOrgUser.email,
            phone: tenant.referredByOrgUser.phone,
            kind: 'org',
        });
    }
    return contacts;
}
async function notifyCommercialsOnSubscriptionApproval(params) {
    const contacts = await getTenantCommercialContacts(params.tenantId);
    if (contacts.length === 0) {
        return { notified: [] };
    }
    const event = params.event ?? 'SUBSCRIPTION_APPROVAL';
    const notified = [];
    for (const contact of contacts) {
        try {
            await (0, platformNotificationService_1.createCommercialBillingNotification)({
                userId: contact.id,
                tenantId: params.tenantId,
                tenantName: params.tenantName,
                plan: params.plan,
                event,
                durationDays: params.durationDays,
                baseAmount: params.baseAmount,
                finalAmount: params.finalAmount,
                discountPercent: params.discountPercent,
                discountAmount: params.discountAmount,
                invoiceNumber: params.invoiceNumber,
                commissionAmount: params.commissionsByUserId?.[contact.id],
            });
            notified.push(contact.email);
        }
        catch (err) {
            console.error('[notifyCommercialsOnSubscriptionApproval] notification:', err);
        }
    }
    return { notified };
}
function findGuestSeatInTablePlan(tablePlan, guestId) {
    if (!tablePlan || typeof tablePlan !== 'object')
        return null;
    const plan = tablePlan;
    if (!Array.isArray(plan.tables))
        return null;
    for (const table of plan.tables) {
        const seats = table.seats || {};
        for (const [seatKey, assignedGuestId] of Object.entries(seats)) {
            if (assignedGuestId === guestId) {
                return {
                    tableId: table.id,
                    tableName: table.name || `Table ${table.id.slice(0, 6)}`,
                    seatIndex: parseInt(seatKey, 10),
                };
            }
        }
    }
    return null;
}
function extractGuestIdFromScanPayload(payload) {
    const trimmed = payload.trim();
    if (/^[0-9a-f-]{36}$/i.test(trimmed))
        return trimmed;
    try {
        const url = new URL(trimmed);
        const parts = url.pathname.split('/').filter(Boolean);
        const rsvpIdx = parts.indexOf('rsvp');
        if (rsvpIdx >= 0 && parts[rsvpIdx + 1])
            return parts[rsvpIdx + 1];
    }
    catch {
        // not a URL
    }
    const match = trimmed.match(/rsvp\/([0-9a-f-]{36})/i);
    return match?.[1] ?? null;
}

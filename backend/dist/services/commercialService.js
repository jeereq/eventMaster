"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatAmountFc = formatAmountFc;
exports.generateReferralCode = generateReferralCode;
exports.parsePlanPrice = parsePlanPrice;
exports.getBillingPeriod = getBillingPeriod;
exports.normalizeCommissionRate = normalizeCommissionRate;
exports.ensureCommercialReferralCode = ensureCommercialReferralCode;
exports.ensureOrgCommercialReferralCode = ensureOrgCommercialReferralCode;
exports.resolveCommercialByReferralCode = resolveCommercialByReferralCode;
exports.recordCommercialCommission = recordCommercialCommission;
exports.notifyCommercialsOnSubscriptionApproval = notifyCommercialsOnSubscriptionApproval;
exports.findGuestSeatInTablePlan = findGuestSeatInTablePlan;
exports.extractGuestIdFromScanPayload = extractGuestIdFromScanPayload;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const notificationService_1 = require("./notificationService");
const platformNotificationService_1 = require("./platformNotificationService");
function formatAmountFc(amount) {
    return `${amount.toLocaleString('fr-FR')} FC`;
}
const DEFAULT_COMMISSION_RATE = 0.2;
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
function normalizeCommissionRate(rate, fallback = DEFAULT_COMMISSION_RATE) {
    const value = typeof rate === 'number' ? rate : parseFloat(String(rate));
    if (!Number.isFinite(value))
        return fallback;
    return Math.min(1, Math.max(0, value));
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
        select: { id: true, name: true, referralCode: true, commissionRate: true },
    });
    if (platformCommercial?.referralCode) {
        return {
            type: 'platform',
            id: platformCommercial.id,
            name: platformCommercial.name,
            referralCode: platformCommercial.referralCode,
            commissionRate: normalizeCommissionRate(platformCommercial.commissionRate),
        };
    }
    const orgCommercial = await db_1.prisma.user.findFirst({
        where: { referralCode: code, role: 'USER', orgRole: 'COMMERCIAL' },
        select: { id: true, name: true, referralCode: true, commissionRate: true, tenantId: true },
    });
    if (orgCommercial?.referralCode && orgCommercial.tenantId) {
        return {
            type: 'org',
            id: orgCommercial.id,
            name: orgCommercial.name,
            referralCode: orgCommercial.referralCode,
            commissionRate: normalizeCommissionRate(orgCommercial.commissionRate),
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
    if (tenant.referredByCommercialId) {
        const commercial = await db_1.prisma.user.findUnique({
            where: { id: tenant.referredByCommercialId },
            select: { id: true, commissionRate: true, role: true },
        });
        if (commercial?.role === 'COMMERCIAL') {
            const rate = normalizeCommissionRate(commercial.commissionRate);
            const commissionAmount = Math.round(invoiceAmount * rate);
            await db_1.prisma.commercialCommission.upsert({
                where: {
                    commercialId_tenantId_billingPeriod: {
                        commercialId: commercial.id,
                        tenantId: tenant.id,
                        billingPeriod,
                    },
                },
                create: {
                    commercialId: commercial.id,
                    tenantId: tenant.id,
                    plan: params.plan,
                    invoiceAmount,
                    commissionRate: rate,
                    commissionAmount,
                    billingPeriod,
                    source: params.source,
                    platformInvoiceId: params.platformInvoiceId ?? null,
                },
                update: {
                    plan: params.plan,
                    invoiceAmount,
                    commissionRate: rate,
                    commissionAmount,
                    source: params.source,
                    platformInvoiceId: params.platformInvoiceId ?? undefined,
                },
            });
            results.push({ commercialId: commercial.id, commissionAmount });
        }
    }
    if (tenant.referredByOrgUserId) {
        const orgCommercial = await db_1.prisma.user.findFirst({
            where: { id: tenant.referredByOrgUserId, role: 'USER', orgRole: 'COMMERCIAL' },
            select: { id: true, commissionRate: true },
        });
        if (orgCommercial) {
            const rate = normalizeCommissionRate(orgCommercial.commissionRate);
            const commissionAmount = Math.round(invoiceAmount * rate);
            await db_1.prisma.commercialCommission.upsert({
                where: {
                    commercialId_tenantId_billingPeriod: {
                        commercialId: orgCommercial.id,
                        tenantId: tenant.id,
                        billingPeriod,
                    },
                },
                create: {
                    commercialId: orgCommercial.id,
                    tenantId: tenant.id,
                    plan: params.plan,
                    invoiceAmount,
                    commissionRate: rate,
                    commissionAmount,
                    billingPeriod,
                    source: `${params.source}_ORG`,
                    platformInvoiceId: params.platformInvoiceId ?? null,
                },
                update: {
                    plan: params.plan,
                    invoiceAmount,
                    commissionRate: rate,
                    commissionAmount,
                    source: `${params.source}_ORG`,
                    platformInvoiceId: params.platformInvoiceId ?? undefined,
                },
            });
            results.push({ commercialId: orgCommercial.id, commissionAmount });
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
    const planName = (0, plansConfig_1.getPlanLimits)(params.plan).name;
    const discountLine = params.discountAmount > 0
        ? `\nRéduction accordée : − ${formatAmountFc(params.discountAmount)} (${params.discountPercent} %)\nMontant facturé : ${formatAmountFc(params.finalAmount)}`
        : `\nMontant facturé : ${formatAmountFc(params.finalAmount)}`;
    const event = params.event ?? 'SUBSCRIPTION_APPROVAL';
    const notified = [];
    for (const contact of contacts) {
        const roleLabel = contact.kind === 'platform' ? 'commercial plateforme' : 'commercial organisation';
        const subject = `EventMaster — Abonnement approuvé pour ${params.tenantName}`;
        const text = [
            `Bonjour${contact.name ? ` ${contact.name}` : ''},`,
            '',
            `L'abonnement de l'organisation « ${params.tenantName} » vient d'être approuvé.`,
            '',
            `Forfait : ${planName} (${params.plan})`,
            `Durée : ${params.durationDays} jours`,
            `Prix catalogue : ${formatAmountFc(params.baseAmount)}`,
            discountLine.trim(),
            params.invoiceNumber ? `Facture : ${params.invoiceNumber}` : '',
            '',
            `Votre commission sera calculée sur le montant facturé (${formatAmountFc(params.finalAmount)}).`,
            '',
            '— EventMaster',
        ]
            .filter(Boolean)
            .join('\n');
        const html = `
      <p>Bonjour${contact.name ? ` ${contact.name}` : ''},</p>
      <p>L'abonnement de l'organisation <strong>${params.tenantName}</strong> vient d'être approuvé.</p>
      <ul>
        <li>Forfait : <strong>${planName}</strong> (${params.plan})</li>
        <li>Durée : ${params.durationDays} jours</li>
        <li>Prix catalogue : ${formatAmountFc(params.baseAmount)}</li>
        ${params.discountAmount > 0 ? `<li>Réduction accordée : <strong style="color:#059669">− ${formatAmountFc(params.discountAmount)} (${params.discountPercent} %)</strong></li>` : ''}
        <li>Montant facturé : <strong>${formatAmountFc(params.finalAmount)}</strong></li>
        ${params.invoiceNumber ? `<li>Facture : ${params.invoiceNumber}</li>` : ''}
      </ul>
      <p style="color:#64748b;font-size:13px;">En tant que ${roleLabel}, votre commission sera calculée sur le montant facturé.</p>
    `;
        const emailResult = await (0, notificationService_1.sendRealEmail)(contact.email, subject, text, html);
        if (emailResult.success) {
            notified.push(contact.email);
        }
        if (contact.phone) {
            const waBody = `EventMaster — Abonnement approuvé pour ${params.tenantName} (${planName}). Montant facturé : ${formatAmountFc(params.finalAmount)}.${params.discountAmount > 0 ? ` Réduction : ${params.discountPercent}%.` : ''} Votre commission sera mise à jour.`;
            await (0, notificationService_1.sendRealWhatsApp)(contact.phone, waBody);
        }
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
        }
        catch (err) {
            console.error('[notifyCommercialsOnSubscriptionApproval] notification in-app:', err);
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

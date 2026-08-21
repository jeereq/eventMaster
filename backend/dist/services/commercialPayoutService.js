"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_PAYOUT_REASON = exports.MONTHLY_PAYOUT_PAID_TYPE = exports.MONTHLY_PAYOUT_TYPE = void 0;
exports.previousBillingPeriod = previousBillingPeriod;
exports.formatBillingPeriodLabel = formatBillingPeriodLabel;
exports.listMonthlyPayouts = listMonthlyPayouts;
exports.notifyMonthlyCommissionPayouts = notifyMonthlyCommissionPayouts;
exports.markCommercialPeriodPaid = markCommercialPeriodPaid;
exports.isPlatformCommercialAccount = isPlatformCommercialAccount;
exports.isOrgCommercialAccount = isOrgCommercialAccount;
exports.listPlatformSaaSPayouts = listPlatformSaaSPayouts;
exports.listOrgSaaSPayouts = listOrgSaaSPayouts;
exports.unsettlePlatformPeriodPayout = unsettlePlatformPeriodPayout;
exports.markOrgPeriodPaid = markOrgPeriodPaid;
exports.unsettleOrgPeriodPayout = unsettleOrgPeriodPayout;
exports.previousPeriodPlatformPayoutSummary = previousPeriodPlatformPayoutSummary;
exports.shouldAutoNotifyMonthlyPayouts = shouldAutoNotifyMonthlyPayouts;
const db_1 = require("../db");
const commercialService_1 = require("./commercialService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const platformNotificationService_1 = require("./platformNotificationService");
exports.MONTHLY_PAYOUT_TYPE = platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MONTHLY_COMMISSION_DUE;
exports.MONTHLY_PAYOUT_PAID_TYPE = platformNotificationTypes_1.PLATFORM_NOTIFICATION_TYPE.MONTHLY_COMMISSION_PAID;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
function previousBillingPeriod(from = new Date()) {
    const d = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    return (0, commercialService_1.getBillingPeriod)(d);
}
function formatBillingPeriodLabel(period) {
    const [year, month] = period.split('-').map(Number);
    if (!year || !month)
        return period;
    const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric',
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
}
async function listMonthlyPayouts(period) {
    const commissions = await db_1.prisma.commercialCommission.findMany({
        where: { billingPeriod: period },
        include: {
            commercial: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    referralCode: true,
                    role: true,
                    tenantId: true,
                    orgRole: true,
                },
            },
        },
    });
    const map = new Map();
    for (const row of commissions) {
        const kind = row.commercial.role === 'COMMERCIAL' && !row.commercial.tenantId ? 'platform' : 'org';
        const current = map.get(row.commercialId) || {
            commercialId: row.commercialId,
            name: row.commercial.name,
            email: row.commercial.email,
            phone: row.commercial.phone,
            referralCode: row.commercial.referralCode,
            kind,
            totalCommission: 0,
            unpaidCommission: 0,
            paidCommission: 0,
            orgCount: 0,
        };
        current.totalCommission += row.commissionAmount;
        current.orgCount += 1;
        if (row.paidAt)
            current.paidCommission += row.commissionAmount;
        else
            current.unpaidCommission += row.commissionAmount;
        map.set(row.commercialId, current);
    }
    return Array.from(map.values()).sort((a, b) => b.unpaidCommission - a.unpaidCommission || b.totalCommission - a.totalCommission);
}
async function notifyOneCommercial(row, period, force) {
    if (row.unpaidCommission <= 0 && !force)
        return { emailed: false, skipped: true };
    const already = force
        ? false
        : await (0, platformNotificationService_1.hasNotificationForPeriod)({ userId: row.commercialId, type: exports.MONTHLY_PAYOUT_TYPE, period });
    if (already)
        return { emailed: false, skipped: true };
    const periodLabel = formatBillingPeriodLabel(period);
    const amount = (0, commercialService_1.formatAmountFc)(row.unpaidCommission || row.totalCommission);
    const href = row.kind === 'platform' ? `${FRONTEND_URL}/dashboard/commercial` : `${FRONTEND_URL}/dashboard/org-commercial`;
    const payer = row.kind === 'platform' ? 'EventMaster (Super Admin)' : 'votre organisation parrainante';
    const subject = `EventMaster — Commission ${periodLabel} : ${amount}`;
    const text = [
        `Bonjour${row.name ? ` ${row.name}` : ''},`,
        '',
        `Récapitulatif de vos commissions pour ${periodLabel}.`,
        `Montant à verser : ${amount}`,
        `Organisations facturées : ${row.orgCount}`,
        '',
        `Le versement est hors plateforme, effectué par ${payer}.`,
        '',
        `Suivi : ${href}`,
        '',
        '— EventMaster',
    ].join('\n');
    const html = `
    <p>Bonjour${row.name ? ` ${row.name}` : ''},</p>
    <p>Récapitulatif de vos commissions pour <strong>${periodLabel}</strong>.</p>
    <ul>
      <li>Montant à verser : <strong>${amount}</strong></li>
      <li>Organisations facturées : ${row.orgCount}</li>
    </ul>
    <p style="color:#64748b;font-size:13px;">Le versement est hors plateforme, effectué par ${payer}.</p>
    <p><a href="${href}">Ouvrir le suivi des commissions</a></p>
  `;
    await (0, platformNotificationService_1.createPlatformNotification)({
        userId: row.commercialId,
        type: exports.MONTHLY_PAYOUT_TYPE,
        title: `Commission ${periodLabel}`,
        message: `${amount} à verser (${row.orgCount} organisation${row.orgCount > 1 ? 's' : ''}). Paiement hors plateforme par ${payer}.`,
        metadata: {
            period,
            amount: row.unpaidCommission || row.totalCommission,
            orgCount: row.orgCount,
            href,
        },
        email: { subject, text, html },
        whatsapp: `EventMaster — Commission ${periodLabel} : ${amount} à verser par ${payer}. ${row.orgCount} org. facturée(s).`,
    });
    return { emailed: true, skipped: false };
}
async function notifySuperAdmins(rows, period, force) {
    const admins = await db_1.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, name: true, email: true, phone: true },
    });
    if (admins.length === 0)
        return { notified: [] };
    const unpaid = rows.reduce((sum, row) => sum + row.unpaidCommission, 0);
    const total = rows.reduce((sum, row) => sum + row.totalCommission, 0);
    const dueRows = rows.filter((row) => row.unpaidCommission > 0);
    if (unpaid <= 0 && !force)
        return { notified: [] };
    const periodLabel = formatBillingPeriodLabel(period);
    const href = `${FRONTEND_URL}/dashboard?tab=analytics&section=revenus`;
    const lines = dueRows
        .slice(0, 12)
        .map((row) => `  - ${row.name || row.email} (${row.kind === 'platform' ? 'plateforme' : 'org'}) : ${(0, commercialService_1.formatAmountFc)(row.unpaidCommission)}`)
        .join('\n');
    const notified = [];
    for (const admin of admins) {
        const already = force
            ? false
            : await (0, platformNotificationService_1.hasNotificationForPeriod)({ userId: admin.id, type: exports.MONTHLY_PAYOUT_TYPE, period });
        if (already)
            continue;
        const subject = `EventMaster — Versements commerciaux ${periodLabel} : ${(0, commercialService_1.formatAmountFc)(unpaid)}`;
        const text = [
            `Bonjour${admin.name ? ` ${admin.name}` : ''},`,
            '',
            `Commissions commerciales dues pour ${periodLabel} : ${(0, commercialService_1.formatAmountFc)(unpaid)} (total du mois ${(0, commercialService_1.formatAmountFc)(total)}).`,
            `${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} à régler hors plateforme.`,
            '',
            lines,
            '',
            `Ouvrir le rapport : ${href}`,
            '',
            '— EventMaster',
        ].join('\n');
        const html = `
      <p>Bonjour${admin.name ? ` ${admin.name}` : ''},</p>
      <p>Commissions commerciales <strong>dues</strong> pour <strong>${periodLabel}</strong> :
        <strong>${(0, commercialService_1.formatAmountFc)(unpaid)}</strong> (total du mois ${(0, commercialService_1.formatAmountFc)(total)}).</p>
      <p>${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} à régler hors plateforme.</p>
      <ul>
        ${dueRows
            .slice(0, 12)
            .map((row) => `<li>${row.name || row.email} (${row.kind === 'platform' ? 'plateforme' : 'org'}) — <strong>${(0, commercialService_1.formatAmountFc)(row.unpaidCommission)}</strong></li>`)
            .join('')}
      </ul>
      <p><a href="${href}">Ouvrir Revenus &amp; commissions</a></p>
    `;
        await (0, platformNotificationService_1.createPlatformNotification)({
            userId: admin.id,
            type: exports.MONTHLY_PAYOUT_TYPE,
            title: `Versements dus — ${periodLabel}`,
            message: `${(0, commercialService_1.formatAmountFc)(unpaid)} à verser à ${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} (hors plateforme).`,
            metadata: {
                period,
                unpaidCommission: unpaid,
                totalCommission: total,
                commercialCount: dueRows.length,
                href,
            },
            email: { subject, text, html },
            whatsapp: `EventMaster — Versements commerciaux ${periodLabel} : ${(0, commercialService_1.formatAmountFc)(unpaid)} dus (${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''}). ${href}`,
        });
        notified.push(admin.email);
    }
    return { notified };
}
async function notifyMonthlyCommissionPayouts(options) {
    const period = options?.period || previousBillingPeriod();
    const force = Boolean(options?.force);
    const rows = await listMonthlyPayouts(period);
    const commercials = [];
    for (const row of rows) {
        const result = await notifyOneCommercial(row, period, force);
        commercials.push({ email: row.email, skipped: result.skipped });
    }
    const admins = await notifySuperAdmins(rows, period, force);
    const unpaid = rows.reduce((sum, row) => sum + row.unpaidCommission, 0);
    return {
        period,
        periodLabel: formatBillingPeriodLabel(period),
        unpaidCommission: unpaid,
        commercialCount: rows.filter((row) => row.unpaidCommission > 0).length,
        commercialsNotified: commercials.filter((c) => !c.skipped).length,
        adminsNotified: admins.notified,
    };
}
async function markCommercialPeriodPaid(params) {
    const commercial = await db_1.prisma.user.findUnique({
        where: { id: params.commercialId },
        select: { id: true, name: true, email: true, phone: true, role: true, tenantId: true },
    });
    if (!commercial || !isPlatformCommercialAccount(commercial)) {
        return { updated: 0, error: 'NOT_PLATFORM' };
    }
    const now = new Date();
    const result = await db_1.prisma.commercialCommission.updateMany({
        where: {
            commercialId: params.commercialId,
            billingPeriod: params.period,
            paidAt: null,
        },
        data: {
            paidAt: now,
            paidByUserId: params.paidByUserId,
            payoutProofUrl: params.proofUrl || null,
            payoutNote: params.note || null,
        },
    });
    if (result.count === 0) {
        return { updated: 0 };
    }
    const rows = await listMonthlyPayouts(params.period);
    const row = rows.find((item) => item.commercialId === params.commercialId);
    const amount = (0, commercialService_1.formatAmountFc)(row?.paidCommission || 0);
    const periodLabel = formatBillingPeriodLabel(params.period);
    const href = `${FRONTEND_URL}/dashboard/commercial`;
    const text = `Bonjour${commercial.name ? ` ${commercial.name}` : ''},\n\nVotre commission ${periodLabel} (${amount}) a été marquée comme versée par EventMaster, hors plateforme.${params.proofUrl ? `\nRéférence : ${params.proofUrl}` : ''}\n\nSuivi : ${href}\n\n— EventMaster`;
    await (0, platformNotificationService_1.createPlatformNotification)({
        userId: commercial.id,
        type: exports.MONTHLY_PAYOUT_PAID_TYPE,
        title: `Versement effectué — ${periodLabel}`,
        message: `${amount} marqué comme versé par EventMaster (hors plateforme).`,
        metadata: { period: params.period, href, proofUrl: params.proofUrl || null },
        email: { subject: `EventMaster — Versement ${periodLabel} effectué`, text },
        whatsapp: `EventMaster — Versement ${periodLabel} effectué : ${amount} (hors plateforme).`,
    });
    return { updated: result.count };
}
function isPlatformCommercialAccount(user) {
    return user.role === 'COMMERCIAL' && !user.tenantId;
}
function isOrgCommercialAccount(user) {
    return user.role === 'USER' && user.orgRole === 'COMMERCIAL' && Boolean(user.tenantId);
}
exports.MIN_PAYOUT_REASON = 8;
function payoutKey(commercialId, period) {
    return `${commercialId}::${period}`;
}
async function fetchAndAggregatePayouts(params) {
    const settlement = params.settlement || 'due';
    const page = Math.max(params.page || 1, 1);
    const pageSize = Math.min(Math.max(params.pageSize || 20, 1), 100);
    const q = params.q?.trim();
    const commissions = await db_1.prisma.commercialCommission.findMany({
        where: {
            ...(params.period ? { billingPeriod: params.period } : {}),
            commercial: params.commercialWhere,
            ...(q
                ? {
                    OR: [
                        { commercial: { name: { contains: q, mode: 'insensitive' } } },
                        { commercial: { email: { contains: q, mode: 'insensitive' } } },
                        { commercial: { referralCode: { contains: q, mode: 'insensitive' } } },
                        { tenant: { name: { contains: q, mode: 'insensitive' } } },
                    ],
                }
                : {}),
        },
        include: {
            commercial: {
                select: { id: true, name: true, email: true, referralCode: true, role: true, tenantId: true, orgRole: true },
            },
            tenant: { select: { name: true } },
        },
        orderBy: [{ billingPeriod: 'desc' }, { createdAt: 'desc' }],
        take: 5000,
    });
    const map = new Map();
    for (const row of commissions) {
        if (!params.accept(row.commercial))
            continue;
        const key = payoutKey(row.commercialId, row.billingPeriod);
        const current = map.get(key) || {
            commercialId: row.commercialId,
            name: row.commercial.name,
            email: row.commercial.email,
            referralCode: row.commercial.referralCode,
            period: row.billingPeriod,
            orgCount: 0,
            orgNames: [],
            totalInvoiceAmount: 0,
            totalCommission: 0,
            unpaidCommission: 0,
            paidCommission: 0,
            paidAt: null,
            payoutProofUrl: null,
            payoutNote: null,
            payer: params.payer,
        };
        current.totalInvoiceAmount += row.invoiceAmount;
        current.totalCommission += row.commissionAmount;
        current.orgCount += 1;
        if (!current.orgNames.includes(row.tenant.name))
            current.orgNames.push(row.tenant.name);
        if (row.paidAt) {
            current.paidCommission += row.commissionAmount;
            if (!current.paidAt || row.paidAt > current.paidAt)
                current.paidAt = row.paidAt;
            current.payoutProofUrl = row.payoutProofUrl || current.payoutProofUrl;
            current.payoutNote = row.payoutNote || current.payoutNote;
        }
        else {
            current.unpaidCommission += row.commissionAmount;
        }
        map.set(key, current);
    }
    let items = Array.from(map.values());
    if (settlement === 'due')
        items = items.filter((row) => row.unpaidCommission > 0);
    else if (settlement === 'paid')
        items = items.filter((row) => row.unpaidCommission === 0 && row.paidCommission > 0);
    const proof = params.proof || 'all';
    if (proof === 'yes')
        items = items.filter((row) => Boolean(row.payoutProofUrl));
    else if (proof === 'no')
        items = items.filter((row) => !row.payoutProofUrl);
    items.sort((a, b) => b.unpaidCommission - a.unpaidCommission || b.totalCommission - a.totalCommission || b.period.localeCompare(a.period));
    const dueItems = Array.from(map.values()).filter((row) => row.unpaidCommission > 0);
    const paidItems = Array.from(map.values()).filter((row) => row.unpaidCommission === 0 && row.paidCommission > 0);
    const total = items.length;
    const paged = items.slice((page - 1) * pageSize, page * pageSize);
    return {
        items: paged,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
        sums: {
            dueCount: dueItems.length,
            dueFc: dueItems.reduce((s, r) => s + r.unpaidCommission, 0),
            paidCount: paidItems.length,
            paidFc: paidItems.reduce((s, r) => s + r.paidCommission, 0),
        },
    };
}
async function listPlatformSaaSPayouts(params) {
    return fetchAndAggregatePayouts({
        ...params,
        commercialWhere: { role: 'COMMERCIAL', tenantId: null },
        payer: 'eventmaster',
        accept: isPlatformCommercialAccount,
    });
}
async function listOrgSaaSPayouts(params) {
    return fetchAndAggregatePayouts({
        ...params,
        commercialWhere: { role: 'USER', tenantId: params.payerTenantId, orgRole: 'COMMERCIAL' },
        payer: 'organization',
        accept: isOrgCommercialAccount,
    });
}
async function unsettlePlatformPeriodPayout(params) {
    const commercial = await db_1.prisma.user.findUnique({
        where: { id: params.commercialId },
        select: { role: true, tenantId: true },
    });
    if (!commercial || !isPlatformCommercialAccount(commercial)) {
        return { updated: 0, error: 'NOT_PLATFORM' };
    }
    const result = await db_1.prisma.commercialCommission.updateMany({
        where: {
            commercialId: params.commercialId,
            billingPeriod: params.period,
            paidAt: { not: null },
        },
        data: {
            paidAt: null,
            paidByUserId: null,
            payoutProofUrl: null,
            payoutNote: null,
        },
    });
    return { updated: result.count };
}
async function markOrgPeriodPaid(params) {
    const commercial = await db_1.prisma.user.findUnique({
        where: { id: params.commercialId },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            orgRole: true,
            tenantId: true,
        },
    });
    if (!commercial || !isOrgCommercialAccount(commercial)) {
        return { updated: 0, error: 'NOT_ORG' };
    }
    if (commercial.tenantId !== params.payerTenantId) {
        return { updated: 0, error: 'WRONG_TENANT' };
    }
    const now = new Date();
    const result = await db_1.prisma.commercialCommission.updateMany({
        where: {
            commercialId: params.commercialId,
            billingPeriod: params.period,
            paidAt: null,
        },
        data: {
            paidAt: now,
            paidByUserId: params.paidByUserId,
            payoutProofUrl: params.proofUrl || null,
            payoutNote: params.note || null,
        },
    });
    if (result.count === 0) {
        return { updated: 0 };
    }
    const rows = await listMonthlyPayouts(params.period);
    const row = rows.find((item) => item.commercialId === params.commercialId);
    const amount = (0, commercialService_1.formatAmountFc)(row?.paidCommission || 0);
    const periodLabel = formatBillingPeriodLabel(params.period);
    const href = `${FRONTEND_URL}/dashboard/org-commercial`;
    const text = `Bonjour${commercial.name ? ` ${commercial.name}` : ''},\n\nVotre commission ${periodLabel} (${amount}) a été marquée comme versée par votre organisation, hors plateforme.${params.proofUrl ? `\nRéférence : ${params.proofUrl}` : ''}\n\nSuivi : ${href}\n\n— EventMaster`;
    await (0, platformNotificationService_1.createPlatformNotification)({
        userId: commercial.id,
        type: exports.MONTHLY_PAYOUT_PAID_TYPE,
        title: `Versement effectué — ${periodLabel}`,
        message: `${amount} marqué comme versé par votre organisation (hors plateforme).`,
        metadata: { period: params.period, href, proofUrl: params.proofUrl || null },
        email: { subject: `EventMaster — Versement ${periodLabel} effectué`, text },
        whatsapp: `EventMaster — Versement ${periodLabel} effectué : ${amount} (hors plateforme, par votre organisation).`,
    });
    return { updated: result.count };
}
async function unsettleOrgPeriodPayout(params) {
    const commercial = await db_1.prisma.user.findUnique({
        where: { id: params.commercialId },
        select: { role: true, orgRole: true, tenantId: true },
    });
    if (!commercial || !isOrgCommercialAccount(commercial)) {
        return { updated: 0, error: 'NOT_ORG' };
    }
    if (commercial.tenantId !== params.payerTenantId) {
        return { updated: 0, error: 'WRONG_TENANT' };
    }
    const result = await db_1.prisma.commercialCommission.updateMany({
        where: {
            commercialId: params.commercialId,
            billingPeriod: params.period,
            paidAt: { not: null },
        },
        data: {
            paidAt: null,
            paidByUserId: null,
            payoutProofUrl: null,
            payoutNote: null,
        },
    });
    return { updated: result.count };
}
async function previousPeriodPlatformPayoutSummary(now = new Date()) {
    const period = previousBillingPeriod(now);
    const rows = await listMonthlyPayouts(period);
    const due = rows.filter((row) => row.kind === 'platform' && row.unpaidCommission > 0);
    return {
        period,
        periodLabel: formatBillingPeriodLabel(period),
        count: due.length,
        amountFc: due.reduce((sum, row) => sum + row.unpaidCommission, 0),
        overdue: now.getDate() > 3 && due.length > 0,
    };
}
function shouldAutoNotifyMonthlyPayouts(now = new Date()) {
    return now.getDate() <= 3;
}

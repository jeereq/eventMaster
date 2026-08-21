"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrgBillingPayouts = listOrgBillingPayouts;
exports.settleOrgBillingPayout = settleOrgBillingPayout;
const db_1 = require("../db");
const adminAuditService_1 = require("../services/adminAuditService");
const permissionsService_1 = require("../services/permissionsService");
const commercialService_1 = require("../services/commercialService");
const commercialPayoutService_1 = require("../services/commercialPayoutService");
const revenueReportService_1 = require("../services/revenueReportService");
function csvEscape(value) {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw))
        return `"${raw.replace(/"/g, '""')}"`;
    return raw;
}
function parseReason(req) {
    const raw = req.body && typeof req.body === 'object' ? req.body.reason : undefined;
    return typeof raw === 'string' ? raw.trim().slice(0, 500) : '';
}
function parseOptionalString(body, key, max = 2000) {
    if (!body || typeof body !== 'object')
        return null;
    const raw = body[key];
    if (typeof raw !== 'string')
        return null;
    const value = raw.trim().slice(0, max);
    return value || null;
}
async function requireBillingOwner(req, res) {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId || !tenantId || req.user?.role !== 'USER') {
        res.status(403).json({ error: 'Accès réservé au propriétaire de l’organisation.' });
        return null;
    }
    if (!(await (0, permissionsService_1.assertCanViewBilling)(userId, tenantId))) {
        res.status(403).json({ error: 'Seul le propriétaire (facturation) peut marquer les versements des commerciaux org.' });
        return null;
    }
    return { userId, tenantId };
}
async function listOrgBillingPayouts(req, res) {
    try {
        const auth = await requireBillingOwner(req, res);
        if (!auth)
            return;
        const periodRaw = typeof req.query.period === 'string' ? req.query.period.trim() : '';
        const period = periodRaw === 'all' || periodRaw === '' ? undefined : (0, revenueReportService_1.parseBillingPeriod)(periodRaw);
        const settlementRaw = typeof req.query.settlement === 'string' ? req.query.settlement.trim() : 'due';
        const settlement = settlementRaw === 'paid' || settlementRaw === 'all' || settlementRaw === 'due' ? settlementRaw : 'due';
        const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
        const proofRaw = typeof req.query.proof === 'string' ? req.query.proof.trim() : 'all';
        const proof = proofRaw === 'yes' || proofRaw === 'no' ? proofRaw : 'all';
        const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: auth.tenantId },
            select: {
                name: true,
                defaultOrgCommercialCommissionRate: true,
                defaultOrgCommercialRenewalCommissionRate: true,
            },
        });
        const firstPct = Math.round((tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE) * 100);
        const renewalPct = Math.round((tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE) * 100);
        if (req.query.export === 'csv') {
            const full = await (0, commercialPayoutService_1.listOrgSaaSPayouts)({
                payerTenantId: auth.tenantId,
                period,
                settlement,
                proof,
                q,
                page: 1,
                pageSize: 5000,
            });
            const header = [
                'Période',
                'Commercial',
                'E-mail',
                'Code',
                'Organisations',
                'CA facturé FC',
                'Commission FC',
                'Dû FC',
                'Versé FC',
                'Statut',
                'Payeur',
                'Preuve',
                'Date versement',
            ].join(',');
            const lines = full.items.map((row) => [
                csvEscape(row.period),
                csvEscape(row.name || ''),
                csvEscape(row.email),
                csvEscape(row.referralCode),
                csvEscape(row.orgNames.join(' | ')),
                row.totalInvoiceAmount,
                row.totalCommission,
                row.unpaidCommission,
                row.paidCommission,
                row.unpaidCommission > 0 ? 'due' : 'payée',
                tenant?.name || 'Organisation',
                csvEscape(row.payoutProofUrl),
                csvEscape(row.paidAt ? row.paidAt.toISOString().slice(0, 10) : ''),
            ].join(','));
            const csv = `\uFEFF${header}\n${lines.join('\n')}`;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="versements-commerciaux-org.csv"');
            return res.send(csv);
        }
        const result = await (0, commercialPayoutService_1.listOrgSaaSPayouts)({
            payerTenantId: auth.tenantId,
            period,
            settlement,
            proof,
            q,
            page,
            pageSize,
        });
        return res.json({
            ...result,
            defaultPeriod: (0, commercialPayoutService_1.previousBillingPeriod)(),
            payerName: tenant?.name || 'Organisation',
            rates: { firstPercent: firstPct, renewalPercent: renewalPct },
        });
    }
    catch (error) {
        console.error('Erreur liste versements org.:', error);
        return res.status(500).json({ error: 'Impossible de charger les versements commerciaux.' });
    }
}
async function settleOrgBillingPayout(req, res) {
    try {
        const auth = await requireBillingOwner(req, res);
        if (!auth)
            return;
        const commercialId = String(req.body?.commercialId || '');
        const period = (0, revenueReportService_1.parseBillingPeriod)(req.body?.period);
        const settled = req.body?.settled !== false;
        const reason = parseReason(req);
        const proofUrl = parseOptionalString(req.body, 'proofUrl');
        const note = parseOptionalString(req.body, 'note', 500);
        if (!commercialId) {
            return res.status(400).json({ error: 'commercialId requis.' });
        }
        if (reason.length < commercialPayoutService_1.MIN_PAYOUT_REASON) {
            return res.status(400).json({
                error: `Motif obligatoire (${commercialPayoutService_1.MIN_PAYOUT_REASON} caractères min.).`,
            });
        }
        if (settled) {
            if (!proofUrl || proofUrl.length < commercialPayoutService_1.MIN_PAYOUT_REASON) {
                return res.status(400).json({
                    error: 'Référence ou URL de preuve obligatoire (8 caractères min.) pour marquer un versement.',
                });
            }
            const result = await (0, commercialPayoutService_1.markOrgPeriodPaid)({
                commercialId,
                period,
                paidByUserId: auth.userId,
                payerTenantId: auth.tenantId,
                proofUrl,
                note: note || reason,
            });
            if (result.error === 'NOT_ORG' || result.error === 'WRONG_TENANT') {
                return res.status(403).json({
                    error: 'Vous ne versez que les commerciaux de votre organisation.',
                });
            }
            if (result.updated === 0) {
                return res.status(404).json({ error: 'Aucune commission due pour ce commercial sur cette période.' });
            }
            await (0, adminAuditService_1.auditReq)(req, {
                action: 'ORG_PAYOUT_SETTLE',
                targetType: 'commercial_payout',
                targetId: commercialId,
                tenantId: auth.tenantId,
                summary: `Versement commercial org. ${(0, commercialPayoutService_1.formatBillingPeriodLabel)(period)} — ${result.updated} ligne(s), preuve jointe`,
                metadata: { period, proofUrl, reason, updated: result.updated },
            });
            return res.json({
                message: `Versement marqué pour ${result.updated} ligne(s). Paiement hors plateforme par votre organisation.`,
                period,
                commercialId,
                updated: result.updated,
                settled: true,
            });
        }
        const result = await (0, commercialPayoutService_1.unsettleOrgPeriodPayout)({
            commercialId,
            period,
            payerTenantId: auth.tenantId,
        });
        if (result.error === 'NOT_ORG' || result.error === 'WRONG_TENANT') {
            return res.status(403).json({
                error: 'Vous ne gérez que les versements des commerciaux de votre organisation.',
            });
        }
        if (result.updated === 0) {
            return res.status(404).json({ error: 'Aucune ligne versée à remettre due pour cette période.' });
        }
        await (0, adminAuditService_1.auditReq)(req, {
            action: 'ORG_PAYOUT_UNSETTLE',
            targetType: 'commercial_payout',
            targetId: commercialId,
            tenantId: auth.tenantId,
            summary: `Versement commercial org. ${(0, commercialPayoutService_1.formatBillingPeriodLabel)(period)} remis dû — ${result.updated} ligne(s)`,
            metadata: { period, reason, updated: result.updated },
        });
        return res.json({
            message: `Versement remis dû (${result.updated} ligne(s)).`,
            period,
            commercialId,
            updated: result.updated,
            settled: false,
        });
    }
    catch (error) {
        console.error('Erreur versement org.:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour le versement.' });
    }
}

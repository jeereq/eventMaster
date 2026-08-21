"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueReport = getRevenueReport;
exports.exportRevenueReport = exportRevenueReport;
exports.notifyRevenuePayouts = notifyRevenuePayouts;
exports.markRevenuePayoutPaid = markRevenuePayoutPaid;
const revenueReportService_1 = require("../services/revenueReportService");
const commercialPayoutService_1 = require("../services/commercialPayoutService");
async function getRevenueReport(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const period = (0, revenueReportService_1.parseBillingPeriod)(req.query.period);
        const report = await (0, revenueReportService_1.buildRevenueReport)(period);
        return res.json(report);
    }
    catch (error) {
        console.error('[Revenue Report] Erreur:', error);
        return res.status(500).json({ error: 'Erreur lors de la génération du rapport.' });
    }
}
async function exportRevenueReport(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const period = (0, revenueReportService_1.parseBillingPeriod)(req.query.period);
        const format = req.query.format?.toLowerCase() || 'csv';
        const report = await (0, revenueReportService_1.buildRevenueReport)(period);
        if (format === 'pdf') {
            const pdf = await (0, revenueReportService_1.buildRevenueReportPdf)(report);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="eventmaster-revenus-${period}.pdf"`);
            return res.send(pdf);
        }
        const csv = (0, revenueReportService_1.buildRevenueReportCsv)(report);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="eventmaster-revenus-${period}.csv"`);
        return res.send('\uFEFF' + csv);
    }
    catch (error) {
        console.error('[Revenue Report Export] Erreur:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'export du rapport.' });
    }
}
async function notifyRevenuePayouts(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const period = (0, revenueReportService_1.parseBillingPeriod)(req.body?.period || req.query.period);
        const force = req.body?.force === true || req.query.force === '1';
        const result = await (0, commercialPayoutService_1.notifyMonthlyCommissionPayouts)({ period, force });
        return res.json({
            message: `Récapitulatif ${result.periodLabel} envoyé : ${result.commercialsNotified} commercial(aux), ${result.adminsNotified.length} super admin(s). Dû : ${result.unpaidCommission.toLocaleString('fr-FR')} FC.`,
            ...result,
        });
    }
    catch (error) {
        console.error('[Revenue Payout Notify] Erreur:', error);
        return res.status(500).json({ error: 'Impossible d\'envoyer les notifications de versement.' });
    }
}
async function markRevenuePayoutPaid(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const commercialId = String(req.body?.commercialId || '');
        const period = (0, revenueReportService_1.parseBillingPeriod)(req.body?.period);
        const proofUrl = typeof req.body?.proofUrl === 'string' ? req.body.proofUrl.trim() : '';
        const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
        if (!commercialId) {
            return res.status(400).json({ error: 'commercialId requis.' });
        }
        if (reason.length < commercialPayoutService_1.MIN_PAYOUT_REASON || proofUrl.length < commercialPayoutService_1.MIN_PAYOUT_REASON) {
            return res.status(400).json({
                error: 'Utilisez la file Versements SaaS : motif et preuve (8 caractères min.) sont obligatoires.',
            });
        }
        const result = await (0, commercialPayoutService_1.markCommercialPeriodPaid)({
            commercialId,
            period,
            paidByUserId: req.user.id,
            proofUrl,
            note: reason,
        });
        if (result.error === 'NOT_PLATFORM') {
            return res.status(403).json({
                error: 'EventMaster ne verse que les commerciaux plateforme. Utilisez la file Versements SaaS. Les commerciaux org. sont payés par l’organisation parrainante.',
            });
        }
        if (result.updated === 0) {
            return res.status(404).json({ error: 'Aucune commission due pour ce commercial sur cette période.' });
        }
        return res.json({
            message: `Versement marqué pour ${result.updated} ligne(s) de commission.`,
            period,
            commercialId,
            updated: result.updated,
        });
    }
    catch (error) {
        console.error('[Revenue Payout Paid] Erreur:', error);
        return res.status(500).json({ error: 'Impossible de marquer le versement.' });
    }
}

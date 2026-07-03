"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRevenueReport = getRevenueReport;
exports.exportRevenueReport = exportRevenueReport;
const revenueReportService_1 = require("../services/revenueReportService");
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

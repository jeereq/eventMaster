"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminEventPayoutsReport = getAdminEventPayoutsReport;
exports.exportAdminEventPayoutsReport = exportAdminEventPayoutsReport;
exports.settleAdminEventPayout = settleAdminEventPayout;
const eventPayoutService_1 = require("../services/eventPayoutService");
const adminAuditService_1 = require("../services/adminAuditService");
async function getAdminEventPayoutsReport(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { tenantId, status, q } = req.query;
        const report = await (0, eventPayoutService_1.buildAdminEventPayoutsReport)({
            tenantId: typeof tenantId === 'string' ? tenantId : undefined,
            status: typeof status === 'string' ? status : undefined,
            q: typeof q === 'string' ? q : undefined,
        });
        return res.json(report);
    }
    catch (error) {
        console.error('[EventPayoutController] Erreur récupération rapport:', error);
        return res.status(500).json({ error: 'Impossible de charger le rapport de reversement des événements.' });
    }
}
async function exportAdminEventPayoutsReport(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { tenantId, status, q } = req.query;
        const report = await (0, eventPayoutService_1.buildAdminEventPayoutsReport)({
            tenantId: typeof tenantId === 'string' ? tenantId : undefined,
            status: typeof status === 'string' ? status : undefined,
            q: typeof q === 'string' ? q : undefined,
        });
        const csv = (0, eventPayoutService_1.buildEventPayoutsCsv)(report);
        const now = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="eventmaster-versements-evenements-${now}.csv"`);
        return res.send(csv);
    }
    catch (error) {
        console.error('[EventPayoutController] Erreur export CSV:', error);
        return res.status(500).json({ error: 'Impossible d\'exporter les reversements d\'événements.' });
    }
}
async function settleAdminEventPayout(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const eventId = req.params.eventId;
        const { status = 'PAID', settledAmountFc, proofUrl, notes, paymentMethod } = req.body;
        if (!eventId) {
            return res.status(400).json({ error: 'eventId requis.' });
        }
        const result = await (0, eventPayoutService_1.settleEventPayoutRecord)({
            eventId,
            status: status === 'PAID' || status === 'PARTIAL' || status === 'DUE' ? status : 'PAID',
            settledAmountFc: typeof settledAmountFc === 'number' ? settledAmountFc : undefined,
            proofUrl: typeof proofUrl === 'string' ? proofUrl : undefined,
            notes: typeof notes === 'string' ? notes : undefined,
            paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
            actorId: req.user.id || 'super-admin',
        });
        await (0, adminAuditService_1.auditReq)(req, {
            action: 'EVENT_PAYOUT_SETTLE',
            targetType: 'event',
            targetId: eventId,
            summary: `Reversement événement ${eventId} marqué (${status}) — Montant: ${settledAmountFc || 'non spécifié'} FC`,
            metadata: { eventId, status, settledAmountFc, proofUrl },
        });
        return res.json({
            message: 'Reversement d\'événement mis à jour avec succès.',
            ...result,
        });
    }
    catch (error) {
        console.error('[EventPayoutController] Erreur mise à jour versement:', error);
        return res.status(500).json({ error: error?.message || 'Erreur lors de la mise à jour du reversement.' });
    }
}

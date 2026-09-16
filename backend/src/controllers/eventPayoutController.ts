import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  buildAdminEventPayoutsReport,
  buildEventPayoutsCsv,
  settleEventPayoutRecord,
} from '../services/eventPayoutService';
import { auditReq } from '../services/adminAuditService';

export async function getAdminEventPayoutsReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { tenantId, status, q } = req.query;
    const report = await buildAdminEventPayoutsReport({
      tenantId: typeof tenantId === 'string' ? tenantId : undefined,
      status: typeof status === 'string' ? status : undefined,
      q: typeof q === 'string' ? q : undefined,
    });

    return res.json(report);
  } catch (error: any) {
    console.error('[EventPayoutController] Erreur récupération rapport:', error);
    return res.status(500).json({ error: 'Impossible de charger le rapport de reversement des événements.' });
  }
}

export async function exportAdminEventPayoutsReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { tenantId, status, q } = req.query;
    const report = await buildAdminEventPayoutsReport({
      tenantId: typeof tenantId === 'string' ? tenantId : undefined,
      status: typeof status === 'string' ? status : undefined,
      q: typeof q === 'string' ? q : undefined,
    });

    const csv = buildEventPayoutsCsv(report);
    const now = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="eventmaster-versements-evenements-${now}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    console.error('[EventPayoutController] Erreur export CSV:', error);
    return res.status(500).json({ error: 'Impossible d\'exporter les reversements d\'événements.' });
  }
}

export async function settleAdminEventPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const eventId = req.params.eventId as string;
    const { status = 'PAID', settledAmountFc, proofUrl, notes, paymentMethod } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: 'eventId requis.' });
    }

    const result = await settleEventPayoutRecord({
      eventId,
      status: status === 'PAID' || status === 'PARTIAL' || status === 'DUE' ? status : 'PAID',
      settledAmountFc: typeof settledAmountFc === 'number' ? settledAmountFc : undefined,
      proofUrl: typeof proofUrl === 'string' ? proofUrl : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
      paymentMethod: typeof paymentMethod === 'string' ? paymentMethod : undefined,
      actorId: req.user.id || 'super-admin',
    });

    await auditReq(req, {
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
  } catch (error: any) {
    console.error('[EventPayoutController] Erreur mise à jour versement:', error);
    return res.status(500).json({ error: error?.message || 'Erreur lors de la mise à jour du reversement.' });
  }
}

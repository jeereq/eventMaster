import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  buildAdminSubscriptionReport,
  buildAdminSubscriptionCsv,
  manageSubscriptionTarget,
} from '../services/adminSubscriptionService';
import { auditReq } from '../services/adminAuditService';

export async function getAdminSubscriptionReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'COMMERCIAL') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin ou Commercial requis.' });
    }

    const report = await buildAdminSubscriptionReport();
    return res.json(report);
  } catch (error: any) {
    console.error('[AdminSubscriptionReport] Erreur génération rapport:', error);
    return res.status(500).json({ error: 'Impossible de générer le rapport des abonnements.' });
  }
}

export async function exportAdminSubscriptionReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' && req.user?.role !== 'COMMERCIAL') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin ou Commercial requis.' });
    }

    const report = await buildAdminSubscriptionReport();
    const csv = buildAdminSubscriptionCsv(report);

    const now = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="eventmaster-abonnements-${now}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    console.error('[AdminSubscriptionReport] Erreur export CSV:', error);
    return res.status(500).json({ error: 'Impossible d\'exporter le rapport des abonnements.' });
  }
}

export async function manageAdminSubscription(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès réservé au Super Admin.' });
    }

    const { targetType, targetId, plan, action, durationDays, customExpiresAt, accountKind, notes } = req.body;

    if (!targetType || !targetId || !action) {
      return res.status(400).json({ error: 'targetType, targetId et action sont obligatoires.' });
    }

    const result = await manageSubscriptionTarget({
      targetType,
      targetId,
      plan,
      action,
      durationDays: durationDays ? Number(durationDays) : undefined,
      customExpiresAt,
      accountKind,
      notes,
      actorId: req.user.id || 'super-admin',
    });

    await auditReq(req, {
      action: 'SUBSCRIPTION_MANUAL_MANAGE',
      targetType,
      targetId,
      summary: `Mise à jour manuelle abonnement (${action} - plan: ${plan || 'inchangé'}) pour ${targetType} ${targetId}`,
      metadata: { targetType, targetId, plan, action, durationDays, customExpiresAt },
    });

    return res.json({
      message: 'Abonnement mis à jour avec succès.',
      ...result,
    });
  } catch (error: any) {
    console.error('[AdminSubscriptionReport] Erreur mise à jour abonnement:', error);
    return res.status(500).json({ error: error?.message || 'Erreur lors de la mise à jour de l\'abonnement.' });
  }
}

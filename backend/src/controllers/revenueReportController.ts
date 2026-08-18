import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  buildRevenueReport,
  buildRevenueReportCsv,
  buildRevenueReportPdf,
  parseBillingPeriod,
} from '../services/revenueReportService';
import {
  markCommercialPeriodPaid,
  notifyMonthlyCommissionPayouts,
} from '../services/commercialPayoutService';

export async function getRevenueReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const period = parseBillingPeriod(req.query.period as string | undefined);
    const report = await buildRevenueReport(period);
    return res.json(report);
  } catch (error: any) {
    console.error('[Revenue Report] Erreur:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération du rapport.' });
  }
}

export async function exportRevenueReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const period = parseBillingPeriod(req.query.period as string | undefined);
    const format = (req.query.format as string)?.toLowerCase() || 'csv';

    const report = await buildRevenueReport(period);

    if (format === 'pdf') {
      const pdf = await buildRevenueReportPdf(report);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="eventmaster-revenus-${period}.pdf"`);
      return res.send(pdf);
    }

    const csv = buildRevenueReportCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="eventmaster-revenus-${period}.csv"`);
    return res.send('\uFEFF' + csv);
  } catch (error: any) {
    console.error('[Revenue Report Export] Erreur:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'export du rapport.' });
  }
}

export async function notifyRevenuePayouts(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const period = parseBillingPeriod(
      (req.body?.period as string | undefined) || (req.query.period as string | undefined),
    );
    const force = req.body?.force === true || req.query.force === '1';
    const result = await notifyMonthlyCommissionPayouts({ period, force });
    return res.json({
      message: `Récapitulatif ${result.periodLabel} envoyé : ${result.commercialsNotified} commercial(aux), ${result.adminsNotified.length} super admin(s). Dû : ${result.unpaidCommission.toLocaleString('fr-FR')} FC.`,
      ...result,
    });
  } catch (error: any) {
    console.error('[Revenue Payout Notify] Erreur:', error);
    return res.status(500).json({ error: 'Impossible d\'envoyer les notifications de versement.' });
  }
}

export async function markRevenuePayoutPaid(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const commercialId = String(req.body?.commercialId || '');
    const period = parseBillingPeriod(req.body?.period as string | undefined);
    if (!commercialId) {
      return res.status(400).json({ error: 'commercialId requis.' });
    }

    const result = await markCommercialPeriodPaid({
      commercialId,
      period,
      paidByUserId: req.user.id,
    });
    if (result.updated === 0) {
      return res.status(404).json({ error: 'Aucune commission due pour ce commercial sur cette période.' });
    }
    return res.json({
      message: `Versement marqué pour ${result.updated} ligne(s) de commission.`,
      period,
      commercialId,
      updated: result.updated,
    });
  } catch (error: any) {
    console.error('[Revenue Payout Paid] Erreur:', error);
    return res.status(500).json({ error: 'Impossible de marquer le versement.' });
  }
}

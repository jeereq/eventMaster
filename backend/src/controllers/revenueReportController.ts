import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  buildRevenueReport,
  buildRevenueReportCsv,
  buildRevenueReportPdf,
  parseBillingPeriod,
} from '../services/revenueReportService';

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

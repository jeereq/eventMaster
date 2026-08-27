import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { auditReq } from '../services/adminAuditService';
import {
  MIN_PAYOUT_REASON,
  formatBillingPeriodLabel,
  listPlatformSaaSPayouts,
  markCommercialPeriodPaid,
  previousBillingPeriod,
  unsettlePlatformPeriodPayout,
} from '../services/commercialPayoutService';
import {
  initiateCommercialFlexPayPayout,
  verifyCommercialFlexPayPayout,
} from '../services/commercialFlexPayPayoutService';
import { parseBillingPeriod } from '../services/revenueReportService';

function csvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

function parseReason(req: AuthenticatedRequest): string {
  const raw = req.body && typeof req.body === 'object' ? (req.body as { reason?: unknown }).reason : undefined;
  return typeof raw === 'string' ? raw.trim().slice(0, 500) : '';
}

function parseOptionalString(body: unknown, key: string, max = 2000): string | null {
  if (!body || typeof body !== 'object') return null;
  const raw = (body as Record<string, unknown>)[key];
  if (typeof raw !== 'string') return null;
  const value = raw.trim().slice(0, max);
  return value || null;
}

export async function listAdminSaasPayouts(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const periodRaw = typeof req.query.period === 'string' ? req.query.period.trim() : '';
    const period = periodRaw === 'all' || periodRaw === '' ? undefined : parseBillingPeriod(periodRaw);
    const settlementRaw = typeof req.query.settlement === 'string' ? req.query.settlement.trim() : 'due';
    const settlement =
      settlementRaw === 'paid' || settlementRaw === 'all' || settlementRaw === 'due' ? settlementRaw : 'due';
    const q = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
    const proofRaw = typeof req.query.proof === 'string' ? req.query.proof.trim() : 'all';
    const proof = proofRaw === 'yes' || proofRaw === 'no' ? proofRaw : 'all';
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);

    if (req.query.export === 'csv') {
      const full = await listPlatformSaaSPayouts({ period, settlement, proof, q, page: 1, pageSize: 5000 });
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
      const lines = full.items.map((row) =>
        [
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
          'EventMaster',
          csvEscape(row.payoutProofUrl),
          csvEscape(row.paidAt ? row.paidAt.toISOString().slice(0, 10) : ''),
        ].join(','),
      );
      const csv = `\uFEFF${header}\n${lines.join('\n')}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="versements-saas.csv"');
      return res.send(csv);
    }

    const result = await listPlatformSaaSPayouts({ period, settlement, proof, q, page, pageSize });

    return res.json({
      ...result,
      defaultPeriod: previousBillingPeriod(),
    });
  } catch (error) {
    console.error('Erreur liste versements SaaS:', error);
    return res.status(500).json({ error: 'Impossible de charger les versements commerciaux.' });
  }
}

export async function settleAdminSaasPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const commercialId = String(req.body?.commercialId || '');
    const period = parseBillingPeriod(req.body?.period as string | undefined);
    const settled = req.body?.settled !== false;
    const reason = parseReason(req);
    const proofUrl = parseOptionalString(req.body, 'proofUrl');
    const note = parseOptionalString(req.body, 'note', 500);

    if (!commercialId) {
      return res.status(400).json({ error: 'commercialId requis.' });
    }
    if (reason.length < MIN_PAYOUT_REASON) {
      return res.status(400).json({
        error: `Motif obligatoire (${MIN_PAYOUT_REASON} caractères min.).`,
      });
    }

    if (settled) {
      if (!proofUrl || proofUrl.length < MIN_PAYOUT_REASON) {
        return res.status(400).json({
          error: 'Référence ou URL de preuve obligatoire (8 caractères min.) pour marquer un versement.',
        });
      }
      const result = await markCommercialPeriodPaid({
        commercialId,
        period,
        paidByUserId: req.user.id,
        proofUrl,
        note: note || reason,
      });
      if (result.error === 'NOT_PLATFORM') {
        return res.status(403).json({
          error: 'EventMaster ne verse que les commerciaux plateforme. Les commerciaux org. sont payés par l’organisation parrainante.',
        });
      }
      if (result.updated === 0) {
        return res.status(404).json({ error: 'Aucune commission due pour ce commercial sur cette période.' });
      }
      await auditReq(req, {
        action: 'SAAS_PAYOUT_SETTLE',
        targetType: 'commercial_payout',
        targetId: commercialId,
        summary: `Versement SaaS ${formatBillingPeriodLabel(period)} — ${result.updated} ligne(s), preuve jointe`,
        metadata: { period, proofUrl, reason, updated: result.updated },
      });
      return res.json({
        message: `Versement marqué pour ${result.updated} ligne(s). Paiement hors plateforme par EventMaster.`,
        period,
        commercialId,
        updated: result.updated,
        settled: true,
      });
    }

    const result = await unsettlePlatformPeriodPayout({ commercialId, period });
    if (result.error === 'NOT_PLATFORM') {
      return res.status(403).json({
        error: 'EventMaster ne gère le versement que des commerciaux plateforme.',
      });
    }
    if (result.updated === 0) {
      return res.status(404).json({ error: 'Aucune ligne versée à remettre due pour cette période.' });
    }
    await auditReq(req, {
      action: 'SAAS_PAYOUT_UNSETTLE',
      targetType: 'commercial_payout',
      targetId: commercialId,
      summary: `Versement SaaS ${formatBillingPeriodLabel(period)} remis dû — ${result.updated} ligne(s)`,
      metadata: { period, reason, updated: result.updated },
    });
    return res.json({
      message: `Versement remis dû (${result.updated} ligne(s)).`,
      period,
      commercialId,
      updated: result.updated,
      settled: false,
    });
  } catch (error) {
    console.error('Erreur versement SaaS:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour le versement.' });
  }
}

/** POST /api/admin/payouts/flexpay — initie un Pay Out FlexPay réel */
export async function initiateAdminSaasFlexPayPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const commercialId = String(req.body?.commercialId || '');
    const period = parseBillingPeriod(req.body?.period as string | undefined);
    const phone = typeof req.body?.phone === 'string' ? req.body.phone : null;

    if (!commercialId) {
      return res.status(400).json({ error: 'commercialId requis.' });
    }

    const result = await initiateCommercialFlexPayPayout({
      kind: 'platform',
      commercialId,
      period,
      initiatedByUserId: req.user.id,
      phone,
    });

    if (result.error === 'NOT_PLATFORM') {
      return res.status(403).json({
        error: 'EventMaster ne verse que les commerciaux plateforme via FlexPay.',
      });
    }
    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Commercial introuvable.' });
    }
    if (result.error === 'NOTHING_DUE') {
      return res.status(404).json({ error: 'Aucune commission due pour cette période.' });
    }
    if (result.error === 'PHONE_REQUIRED') {
      return res.status(400).json({
        error: 'Numéro Mobile Money requis (243…). Renseignez-le sur le profil du commercial ou dans la requête.',
      });
    }
    if (result.error === 'ALREADY_PENDING') {
      return res.status(409).json({
        error: 'Un versement FlexPay est déjà en cours pour ce dossier.',
        transferId: result.transfer?.id,
        status: result.transfer?.status,
      });
    }

    await auditReq(req, {
      action: 'SAAS_PAYOUT_FLEXPAY',
      targetType: 'commercial_payout',
      targetId: commercialId,
      summary: `Pay Out FlexPay ${formatBillingPeriodLabel(period)} — ${result.transfer?.amountFc} FC`,
      metadata: {
        period,
        transferId: result.transfer?.id,
        orderNumber: result.transfer?.flexPayOrderNumber,
      },
    });

    return res.status(201).json({
      message: result.message,
      transferId: result.transfer?.id,
      amountFc: result.transfer?.amountFc,
      phone: result.transfer?.phone,
      orderNumber: result.transfer?.flexPayOrderNumber,
      status: result.transfer?.status,
    });
  } catch (error: any) {
    console.error('Erreur Pay Out FlexPay SaaS:', error);
    return res.status(502).json({
      error: error?.message || 'Impossible d’initier le versement FlexPay.',
    });
  }
}

/** GET /api/admin/payouts/flexpay/:transferId/verify */
export async function verifyAdminSaasFlexPayPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const transferId = String(req.params.transferId || '');
    const result = await verifyCommercialFlexPayPayout(transferId);
    if (result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Versement introuvable.' });
    }
    return res.json(result);
  } catch (error: any) {
    console.error('Erreur verify Pay Out:', error);
    return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
  }
}

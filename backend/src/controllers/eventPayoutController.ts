import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  buildAdminEventPayoutsReport,
  buildEventPayoutsCsv,
  settleEventPayoutRecord,
} from '../services/eventPayoutService';
import { auditReq } from '../services/adminAuditService';
import {
  abandonEventFlexPayPayout,
  initiateEventFlexPayPayout,
  verifyEventFlexPayPayout,
} from '../services/eventFlexPayPayoutService';
import { getFlexPayPayoutClient, isFlexPayPayoutConfigured } from '../services/flexPayPayoutClient';

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

    const pendingTransfer = await prisma.eventPayoutTransfer.findFirst({
      where: { eventId, status: 'PENDING' },
      select: { id: true },
    });
    if (pendingTransfer) {
      return res.status(409).json({
        error: 'Un versement FlexPay est en cours pour cet événement : vérifiez-le avant de marquer le reversement à la main.',
        transferId: pendingTransfer.id,
      });
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

/** POST /api/admin/reports/event-payouts/:eventId/flexpay — Pay Out FlexPay du net de l'événement. */
export async function initiateAdminEventFlexPayPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || !req.user.id) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const eventId = String(req.params.eventId || '');
    const phone = typeof req.body?.phone === 'string' ? req.body.phone : null;
    const amountRaw = req.body?.amountFc;
    const amountFc =
      amountRaw === undefined || amountRaw === null || amountRaw === '' ? null : Number(amountRaw);

    const result = await initiateEventFlexPayPayout({
      eventId,
      initiatedByUserId: req.user.id,
      phone,
      amountFc,
    });

    switch (result.error) {
      case 'NOT_CONFIGURED':
        return res.status(503).json({
          error: 'FlexPay Payout n’est pas encore configuré sur le serveur (identifiants Payout manquants).',
        });
      case 'NOT_FOUND':
        return res.status(404).json({ error: 'Événement introuvable.' });
      case 'NOTHING_DUE':
        return res.status(409).json({ error: 'Rien à reverser pour cet événement.' });
      case 'INVALID_AMOUNT':
        return res.status(400).json({
          error: `Montant invalide : entre 1 et ${result.remainingFc} FC.`,
          remainingFc: result.remainingFc,
        });
      case 'PHONE_REQUIRED':
        return res.status(400).json({
          error: 'Numéro Mobile Money requis (243…). Le responsable de l’organisation n’en a pas.',
        });
      case 'ALREADY_PENDING':
        return res.status(409).json({
          error: 'Un versement FlexPay est déjà en cours pour cet événement.',
          transferId: result.transfer?.id,
        });
      default:
        break;
    }

    await auditReq(req, {
      action: 'EVENT_PAYOUT_FLEXPAY',
      targetType: 'event',
      targetId: eventId,
      tenantId: result.transfer?.tenantId,
      summary: `Pay Out FlexPay événement ${eventId} — ${result.transfer?.amountFc} FC vers ${result.transfer?.phone}${result.error ? ` (${result.error})` : ''}`,
      metadata: {
        transferId: result.transfer?.id,
        orderNumber: result.transfer?.flexPayOrderNumber,
        status: result.transfer?.status,
        error: result.error,
      },
    });

    if (result.error === 'FLEXPAY_REFUSED') {
      return res.status(502).json({ error: result.message, transferId: result.transfer?.id });
    }
    if (result.error === 'UNCERTAIN') {
      return res.status(202).json({
        message: `${result.message} Le versement reste en attente : vérifiez dans FlexPay avant toute nouvelle tentative.`,
        transferId: result.transfer?.id,
        status: 'PENDING',
      });
    }
    return res.status(201).json({
      message: `Versement FlexPay envoyé (${result.transfer.amountFc.toLocaleString('fr-FR')} FC vers ${result.transfer.phone}). Il sera marqué versé dès que FlexPay confirme.`,
      transferId: result.transfer.id,
      amountFc: result.transfer.amountFc,
      phone: result.transfer.phone,
      orderNumber: result.transfer.flexPayOrderNumber,
      status: result.transfer.status,
    });
  } catch (error: any) {
    console.error('[EventPayoutController] Pay Out FlexPay:', error);
    return res.status(500).json({ error: error?.message || 'Impossible d’initier le versement FlexPay.' });
  }
}

/** GET /api/admin/reports/event-payouts/transfers/:transferId/verify */
export async function verifyAdminEventFlexPayPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const result = await verifyEventFlexPayPayout(String(req.params.transferId || ''));
    if ('error' in result && result.error === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Versement introuvable.' });
    }
    return res.json(result);
  } catch (error: any) {
    console.error('[EventPayoutController] verify Pay Out:', error);
    return res.status(502).json({ error: error?.message || 'Vérification FlexPay impossible.' });
  }
}

/** POST /api/admin/reports/event-payouts/transfers/:transferId/abandon */
export async function abandonAdminEventFlexPayPayout(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
    if (reason.length < 5) {
      return res.status(400).json({ error: 'Indiquez pourquoi vous abandonnez ce versement.' });
    }
    const transferId = String(req.params.transferId || '');
    const result = await abandonEventFlexPayPayout(transferId, reason);
    if ('error' in result) {
      const messages: Record<string, [number, string]> = {
        NOT_FOUND: [404, 'Versement introuvable.'],
        NOT_PENDING: [409, 'Ce versement n’est plus en attente.'],
        HAS_ORDER_NUMBER: [409, 'FlexPay a enregistré ce versement : utilisez « Vérifier ».'],
      };
      const [code, error] = messages[result.error as string] || [400, 'Abandon impossible.'];
      return res.status(code).json({ error });
    }
    await auditReq(req, {
      action: 'EVENT_PAYOUT_FLEXPAY_ABANDON',
      targetType: 'event_payout_transfer',
      targetId: transferId,
      summary: `Versement FlexPay ${transferId} abandonné : ${reason}`,
      metadata: { transferId, reason },
    });
    return res.json(result);
  } catch (error: any) {
    console.error('[EventPayoutController] abandon Pay Out:', error);
    return res.status(500).json({ error: error?.message || 'Abandon impossible.' });
  }
}

/** GET /api/admin/payouts/flexpay/balance — solde du compte marchand FlexPay Payout. */
export async function getAdminFlexPayPayoutBalance(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }
    if (!isFlexPayPayoutConfigured()) {
      return res.json({ configured: false, balances: [] });
    }
    const balances = await getFlexPayPayoutClient().checkBalance();
    return res.json({ configured: true, balances });
  } catch (error: any) {
    console.error('[EventPayoutController] solde FlexPay:', error);
    return res.status(502).json({ configured: true, error: error?.message || 'Solde FlexPay indisponible.' });
  }
}

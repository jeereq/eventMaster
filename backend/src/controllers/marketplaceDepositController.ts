import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import {
  getVendorDepositSettings,
  saveVendorDepositSettings,
  serializeDepositPayment,
  startDepositPayment,
  verifyDepositPayment,
} from '../services/marketplaceDepositService';
import { startCommissionPayment, verifyCommissionPayment } from '../services/marketplaceCommissionPaymentService';

/** Réglage « acompte en ligne » du prestataire connecté. */
export async function getDepositSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const settings = await getVendorDepositSettings(tenantId);
    const access = req.user?.id ? await resolveOrgAccess(req.user.id, tenantId) : null;
    // Le numéro complet n'est montré qu'à ceux qui peuvent le modifier.
    const canEdit = Boolean(access?.canManageRooms);
    return res.json({ settings: { ...settings, payoutPhone: canEdit ? settings.payoutPhone : null }, canEdit });
  } catch (error) {
    console.error('getDepositSettings:', error);
    return res.status(500).json({ error: 'Impossible de charger le réglage.' });
  }
}

export async function updateDepositSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers modifient ce réglage.' });
    }
    const result = await saveVendorDepositSettings(tenantId, req.body || {});
    if (!result.ok) return res.status(400).json({ error: result.error });
    return res.json({
      settings: result.settings,
      canEdit: true,
      message: result.settings.enabled ? 'Acompte en ligne activé.' : 'Acompte en ligne désactivé.',
    });
  } catch (error) {
    console.error('updateDepositSettings:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer le réglage.' });
  }
}

/** Le client lance le paiement en ligne de l'acompte. */
export async function payBookingDeposit(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Connectez-vous pour payer l’acompte.' });
    const result = await startDepositPayment({
      bookingId: String(req.params.id || ''),
      tenantId: req.user?.tenantId || null,
      userId,
      paymentMethod: req.body?.paymentMethod,
      phone: req.body?.phone,
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result);
  } catch (error) {
    console.error('payBookingDeposit:', error);
    return res.status(500).json({ error: 'Impossible de lancer le paiement.' });
  }
}

/** Suivi du paiement (client ou prestataire de la réservation). */
export async function getBookingDepositPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const tenantId = req.user?.tenantId;
    if (!userId) return res.status(401).json({ error: 'Connexion requise.' });
    const payment = await prisma.marketplaceDepositPayment.findFirst({
      where: { id: String(req.params.paymentId || ''), bookingId: String(req.params.id || '') },
      include: { booking: { select: { vendorTenantId: true, organizerTenantId: true, organizerUserId: true } } },
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
    const b = payment.booking;
    const allowed =
      (tenantId && (b.vendorTenantId === tenantId || b.organizerTenantId === tenantId)) || b.organizerUserId === userId;
    if (!allowed) return res.status(404).json({ error: 'Paiement introuvable.' });

    if (payment.status === 'PENDING') await verifyDepositPayment(payment.id);
    const fresh = await prisma.marketplaceDepositPayment.findUnique({ where: { id: payment.id } });
    return res.json({ payment: serializeDepositPayment(fresh) });
  } catch (error) {
    console.error('getBookingDepositPayment:', error);
    return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
  }
}

/** Le prestataire règle en ligne toute sa commission due (propriétaire et managers). */
export async function payCommission(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers règlent la commission.' });
    }
    const result = await startCommissionPayment({
      vendorTenantId: tenantId,
      userId,
      paymentMethod: req.body?.paymentMethod,
      phone: req.body?.phone,
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result);
  } catch (error) {
    console.error('payCommission:', error);
    return res.status(500).json({ error: 'Impossible de lancer le paiement.' });
  }
}

export async function getCommissionPayment(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const payment = await prisma.marketplaceCommissionPayment.findFirst({
      where: { id: String(req.params.paymentId || ''), vendorTenantId: tenantId },
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable.' });
    if (payment.status === 'PENDING') await verifyCommissionPayment(payment.id);
    const fresh = await prisma.marketplaceCommissionPayment.findUnique({ where: { id: payment.id } });
    return res.json({
      payment: fresh ? { id: fresh.id, status: fresh.status, amountFc: fresh.amountFc, paidAt: fresh.paidAt } : null,
    });
  } catch (error) {
    console.error('getCommissionPayment:', error);
    return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
  }
}

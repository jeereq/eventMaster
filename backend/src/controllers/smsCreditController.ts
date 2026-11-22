import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { getSmsCreditSummary, startSmsCreditPurchase, verifySmsCreditOrder } from '../services/smsCreditService';

async function resolveBillingContext(req: AuthenticatedRequest, res: Response) {
  const tenantId = req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    res.status(403).json({ error: 'Organisation non identifiée.' });
    return null;
  }
  const access = await resolveOrgAccess(userId, tenantId);
  if (!access.canViewBilling) {
    res.status(403).json({ error: 'Seuls le propriétaire et les responsables de la facturation gèrent les crédits SMS.' });
    return null;
  }
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
  return { tenantId, userId, plan: tenant?.plan ?? 'FREE' };
}

/** Solde de SMS : quota inclus de la période, crédits achetés, packs proposés. */
export async function getSmsCredits(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = await resolveBillingContext(req, res);
    if (!ctx) return;
    return res.json({ summary: await getSmsCreditSummary(ctx.tenantId, ctx.plan) });
  } catch (error) {
    console.error('getSmsCredits:', error);
    return res.status(500).json({ error: 'Impossible de charger vos SMS.' });
  }
}

export async function checkoutSmsCredits(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = await resolveBillingContext(req, res);
    if (!ctx) return;
    const result = await startSmsCreditPurchase({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      plan: ctx.plan,
      packId: req.body?.packId,
      paymentMethod: req.body?.paymentMethod,
      phone: req.body?.phone,
    });
    if (!result.ok) return res.status(result.status).json({ error: result.error });
    return res.status(201).json(result);
  } catch (error) {
    console.error('checkoutSmsCredits:', error);
    return res.status(500).json({ error: 'Impossible de lancer le paiement.' });
  }
}

export async function getSmsCreditOrder(req: AuthenticatedRequest, res: Response) {
  try {
    const ctx = await resolveBillingContext(req, res);
    if (!ctx) return;
    const order = await prisma.smsCreditOrder.findFirst({
      where: { id: String(req.params.orderId || ''), tenantId: ctx.tenantId },
      select: { id: true, status: true },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
    const result = order.status === 'PENDING' ? await verifySmsCreditOrder(order.id) : { status: order.status };
    const fresh = await prisma.smsCreditOrder.findUnique({
      where: { id: order.id },
      select: { id: true, status: true, smsCount: true, amountFc: true, paidAt: true },
    });
    return res.json({ order: fresh, status: result.status });
  } catch (error) {
    console.error('getSmsCreditOrder:', error);
    return res.status(500).json({ error: 'Impossible de vérifier le paiement.' });
  }
}

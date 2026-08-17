import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  ensureOrgCommercialReferralCode,
  DEFAULT_COMMISSION_RATE,
  normalizeCommissionRate,
} from '../services/commercialService';

export async function getOrgCommercialDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId || req.user?.role !== 'USER') {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux organisation.' });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId, orgRole: 'COMMERCIAL' },
      select: {
        id: true,
        name: true,
        referralCode: true,
        commissionRate: true,
        tenant: { select: { name: true, defaultOrgCommercialCommissionRate: true } },
      },
    });

    if (!user) {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux organisation.' });
    }

    const referralCode = await ensureOrgCommercialReferralCode(userId, tenantId);
    const commissionRate = normalizeCommissionRate(
      user.commissionRate,
      user.tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
    );

    const [organizations, commissions] = await Promise.all([
      prisma.tenant.findMany({
        where: { referredByOrgUserId: userId },
        include: {
          manager: { select: { name: true, email: true } },
          _count: { select: { events: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commercialCommission.findMany({
        where: { commercialId: userId },
        include: { tenant: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const monthlyCommission = commissions
      .filter((c) => c.billingPeriod === new Date().toISOString().slice(0, 7))
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return res.json({
      referralCode,
      commissionRate,
      organizationName: user.tenant?.name,
      stats: {
        organizations: organizations.length,
        totalCommission,
        monthlyCommission,
      },
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        plan: o.plan,
        licenseActive: o.licenseActive,
        managerName: o.manager?.name,
        eventsCount: o._count.events,
        createdAt: o.createdAt,
      })),
      commissions,
    });
  } catch (error) {
    console.error('getOrgCommercialDashboard:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement du tableau commercial.' });
  }
}

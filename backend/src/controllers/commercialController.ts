import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  ensureCommercialReferralCode,
  recordCommercialCommission,
  normalizeCommissionRate,
} from '../services/commercialService';

export async function getCommercialDashboard(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
    }

    const referralCode = await ensureCommercialReferralCode(req.user.id);

    const commercialUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { commissionRate: true },
    });
    const commissionRate = normalizeCommissionRate(commercialUser?.commissionRate);

    const [organizations, commissions] = await Promise.all([
      prisma.tenant.findMany({
        where: { referredByCommercialId: req.user.id },
        include: {
          manager: { select: { name: true, email: true } },
          _count: { select: { events: true, users: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.commercialCommission.findMany({
        where: { commercialId: req.user.id },
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
        createdAt: o.createdAt,
        managerName: o.manager?.name,
        managerEmail: o.manager?.email,
        eventsCount: o._count.events,
        usersCount: o._count.users,
      })),
      commissions,
    });
  } catch (error) {
    console.error('getCommercialDashboard:', error);
    return res.status(500).json({ error: 'Erreur lors du chargement du tableau commercial.' });
  }
}

export async function createCommercialOrganization(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
    }

    const { organizationName, managerName, managerEmail, managerPassword, managerPhone, plan } = req.body;

    if (!organizationName || !managerName || !managerEmail || !managerPassword) {
      return res.status(400).json({
        error: 'Nom de l\'organisation, nom, e-mail et mot de passe du manager sont requis.',
      });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: managerEmail } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un compte existe déjà avec cet e-mail.' });
    }

    const passwordHash = await bcrypt.hash(managerPassword, 10);
    const referralCode = await ensureCommercialReferralCode(req.user.id);

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: organizationName.trim(),
          plan: plan || 'FREE',
          referredByCommercialId: req.user!.id,
        },
      });

      const manager = await tx.user.create({
        data: {
          name: managerName.trim(),
          email: managerEmail.trim().toLowerCase(),
          phone: managerPhone || null,
          passwordHash,
          role: 'USER',
          tenantId: tenant.id,
          isEmailVerified: true,
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { managerId: manager.id },
      });

      return { tenant, manager };
    });

    return res.status(201).json({
      message: 'Organisation créée avec succès.',
      referralCode,
      organization: {
        id: result.tenant.id,
        name: result.tenant.name,
        plan: result.tenant.plan,
      },
      manager: {
        id: result.manager.id,
        name: result.manager.name,
        email: result.manager.email,
      },
    });
  } catch (error) {
    console.error('createCommercialOrganization:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation.' });
  }
}

export async function getCommercialReferralInfo(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
    }

    const referralCode = await ensureCommercialReferralCode(req.user.id);
    const commercialUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { commissionRate: true },
    });
    return res.json({
      referralCode,
      commissionRate: normalizeCommissionRate(commercialUser?.commissionRate),
      description: '20% de la facture mensuelle générée par chaque organisation parrainée.',
    });
  } catch (error) {
    console.error('getCommercialReferralInfo:', error);
    return res.status(500).json({ error: 'Erreur interne.' });
  }
}

export { recordCommercialCommission };

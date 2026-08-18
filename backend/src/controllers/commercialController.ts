import bcrypt from 'bcryptjs';
import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import {
  ensureCommercialReferralCode,
  recordCommercialCommission,
  normalizeCommissionRate,
} from '../services/commercialService';
import { setupUserOtpVerification } from './authController';
import { VerificationMethod } from '../services/otpService';

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
          manager: { select: { id: true, name: true, email: true, isEmailVerified: true } },
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
    const monthlyCommissions = commissions.filter((c) => c.billingPeriod === new Date().toISOString().slice(0, 7));
    const monthlyCommission = monthlyCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const monthlyDue = monthlyCommissions
      .filter((c) => !c.paidAt)
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    return res.json({
      referralCode,
      commissionRate,
      stats: {
        organizations: organizations.length,
        totalCommission,
        monthlyCommission,
        monthlyDue,
      },
      organizations: organizations.map((o) => ({
        id: o.id,
        name: o.name,
        plan: o.plan,
        licenseActive: o.licenseActive,
        createdAt: o.createdAt,
        managerName: o.manager?.name,
        managerEmail: o.manager?.email,
        managerId: o.manager?.id,
        managerIsEmailVerified: o.manager?.isEmailVerified ?? true,
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

    const { organizationName, managerName, managerEmail, managerPassword, managerPhone, plan, verificationMethod = 'EMAIL' } = req.body;

    if (!organizationName || !managerName || !managerEmail || !managerPassword) {
      return res.status(400).json({
        error: 'Nom de l\'organisation, nom, e-mail et mot de passe du manager sont requis.',
      });
    }

    const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL') as VerificationMethod;
    if (method === 'WHATSAPP' && !managerPhone) {
      return res.status(400).json({ error: 'Le téléphone est obligatoire pour la validation par WhatsApp.' });
    }

    if (managerPassword.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
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
          isEmailVerified: false,
          verificationMethod: method,
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { managerId: manager.id },
      });

      return { tenant, manager };
    });

    await setupUserOtpVerification({
      userId: result.manager.id,
      name: result.manager.name || managerName.trim(),
      email: result.manager.email,
      phone: managerPhone,
      method,
      invitedByCommercial: true,
    });

    const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';

    return res.status(201).json({
      message:
        `Organisation créée. Un code OTP a été envoyé par ${channelLabel} à ${result.manager.email}. ` +
        `Le manager doit se connecter sur /login avec son mot de passe, valider le code OTP, puis accéder à son espace.`,
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
        isEmailVerified: false,
      },
    });
  } catch (error) {
    console.error('createCommercialOrganization:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation.' });
  }
}

export async function resendCommercialManagerVerification(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
      return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
    }

    const managerId = req.params.managerId as string;

    const manager = await prisma.user.findFirst({
      where: {
        id: managerId,
        role: 'USER',
        tenant: { referredByCommercialId: req.user.id },
      },
      include: { tenant: { select: { managerId: true } } },
    });

    if (!manager || manager.tenant?.managerId !== manager.id) {
      return res.status(404).json({ error: 'Manager introuvable parmi vos organisations parrainées.' });
    }

    if (manager.isEmailVerified) {
      return res.status(400).json({ error: 'Ce compte manager est déjà validé.' });
    }

    const method = (manager.verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL') as VerificationMethod;
    if (method === 'WHATSAPP' && !manager.phone) {
      return res.status(400).json({ error: 'Aucun numéro WhatsApp associé à ce compte.' });
    }

    await setupUserOtpVerification({
      userId: manager.id,
      name: manager.name || 'Manager',
      email: manager.email,
      phone: manager.phone,
      method,
      invitedByCommercial: true,
    });

    const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';

    return res.json({
      message: `Un nouveau code OTP a été envoyé par ${channelLabel} à ${manager.email}.`,
    });
  } catch (error) {
    console.error('resendCommercialManagerVerification:', error);
    return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
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
      description: '30 % de la facture mensuelle générée par chaque organisation parrainée.',
    });
  } catch (error) {
    console.error('getCommercialReferralInfo:', error);
    return res.status(500).json({ error: 'Erreur interne.' });
  }
}

export { recordCommercialCommission };

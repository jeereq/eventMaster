import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { isValidOrgRole, resolveOrgAccess } from '../services/permissionsService';
import { assertOrgManagerQuota, assertPlanFeature, PlanFeatureError } from '../services/planFeaturesService';
import {
  ensureOrgCommercialReferralCode,
  DEFAULT_COMMISSION_RATE,
  DEFAULT_RENEWAL_COMMISSION_RATE,
  normalizeCommissionRate,
  resolveCommissionRates,
} from '../services/commercialService';
import { setupUserOtpVerification } from './authController';
import { VerificationMethod } from '../services/otpService';
import { resolvePhoneFields } from '../utils/phone';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  phoneCountryCode: true,
  orgRole: true,
  referralCode: true,
  commissionRate: true,
  renewalCommissionRate: true,
  isEmailVerified: true,
  createdAt: true,
};

export async function getTeamMembers(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    if (req.user?.role !== 'USER') {
      return res.status(403).json({ error: 'Accès réservé aux membres d\'organisation.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);

    const members = await prisma.user.findMany({
      where: { tenantId, role: 'USER' },
      select: userSelect,
      orderBy: { createdAt: 'asc' },
    });

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        managerId: true,
        defaultOrgCommercialCommissionRate: true,
        defaultOrgCommercialRenewalCommissionRate: true,
      },
    });

    return res.json({
      members: members.map((m) => {
        const rates = resolveCommissionRates({
          first: m.commissionRate,
          renewal: m.renewalCommissionRate,
          firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
          renewalFallback:
            tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
        });
        return {
          ...m,
          commissionRate: rates.first,
          renewalCommissionRate: rates.renewal,
          isOwner: tenant?.managerId === m.id,
          orgRoleLabel:
            tenant?.managerId === m.id
              ? 'OWNER'
              : m.orgRole || 'MANAGER',
        };
      }),
      access,
      isManager: access.canManageTeam,
      orgCommercialSettings: {
        defaultCommissionRate: tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
        defaultRenewalCommissionRate:
          tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération de l\'équipe:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de l\'équipe.' });
  }
}

export async function createTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent créer des utilisateurs.' });
    }

    const { name, email, password, phone, phoneCountryCode, nationalNumber, orgRole = 'MANAGER', verificationMethod = 'EMAIL', commissionRate, renewalCommissionRate } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Le nom, l\'e-mail et le mot de passe sont requis.' });
    }

    const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL') as VerificationMethod;
    const phoneFields = resolvePhoneFields({ phone, phoneCountryCode, nationalNumber });
    if (method === 'WHATSAPP' && !phoneFields.phone) {
      return res.status(400).json({ error: 'Le téléphone est obligatoire pour la validation par WhatsApp.' });
    }

    if (!isValidOrgRole(orgRole)) {
      return res.status(400).json({ error: 'orgRole doit être MANAGER ou PROTOCOL.' });
    }

    if (orgRole === 'COMMERCIAL') {
      return res.status(403).json({
        error: 'Le rôle de commercial organisationnel n’est plus disponible. Les rôles d’équipe sont MANAGER et PROTOCOL.',
      });
    }

    if (orgRole === 'MANAGER') {
      try {
        await assertOrgManagerQuota(tenantId, true);
      } catch (err) {
        if (err instanceof PlanFeatureError) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone: phoneFields.phone,
        phoneCountryCode: phoneFields.phoneCountryCode,
        passwordHash,
        role: 'USER',
        orgRole,
        tenantId,
        commissionRate: null,
        renewalCommissionRate: null,
        isEmailVerified: false,
        verificationMethod: method,
      },
      select: userSelect,
    });

    await setupUserOtpVerification({
      userId: newUser.id,
      name,
      email,
      phone: phoneFields.phone,
      method,
      invitedToTeam: true,
    });

    const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';

    const refreshed = await prisma.user.findUnique({
      where: { id: newUser.id },
      select: userSelect,
    });

    return res.status(201).json({
      message:
        `Utilisateur créé. Un code OTP a été envoyé par ${channelLabel} à ${email}. ` +
        `Le membre doit se connecter sur /login avec son mot de passe, saisir le code OTP, puis accéder au tableau de bord.`,
      member: {
        ...refreshed,
        isOwner: false,
        orgRoleLabel: orgRole,
        commissionRate: null,
        renewalCommissionRate: null,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'utilisateur d\'équipe:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
  }
}

export async function updateTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.managerId === memberId) {
      return res.status(400).json({ error: 'Impossible de modifier le rôle du propriétaire.' });
    }

    const { orgRole } = req.body;
    if (!isValidOrgRole(orgRole)) {
      return res.status(400).json({ error: 'orgRole doit être MANAGER ou PROTOCOL.' });
    }

    if (orgRole === 'COMMERCIAL') {
      return res.status(403).json({
        error: 'Le rôle de commercial organisationnel n’est plus disponible. Les rôles d’équipe sont MANAGER et PROTOCOL.',
      });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER' },
    });
    if (!member) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }

    if (orgRole === 'MANAGER' && member.orgRole !== 'MANAGER') {
      try {
        await assertOrgManagerQuota(tenantId, true);
      } catch (err) {
        if (err instanceof PlanFeatureError) {
          return res.status(403).json({ error: err.message });
        }
        throw err;
      }
    }

    const updateData: {
      orgRole: typeof orgRole;
      commissionRate?: number | null;
      renewalCommissionRate?: number | null;
    } = {
      orgRole,
      commissionRate: null,
      renewalCommissionRate: null,
    };

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: updateData,
      select: userSelect,
    });

    const finalUser = await prisma.user.findUnique({ where: { id: memberId }, select: userSelect });

    return res.json({
      message: 'Rôle mis à jour.',
      member: {
        ...finalUser,
        isOwner: false,
        orgRoleLabel: orgRole,
        ...(() => {
          const rates = resolveCommissionRates({
            first: finalUser?.commissionRate,
            renewal: finalUser?.renewalCommissionRate,
            firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
            renewalFallback:
              tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
          });
          return { commissionRate: rates.first, renewalCommissionRate: rates.renewal };
        })(),
      },
    });
  } catch (error: any) {
    console.error('Erreur updateTeamMember:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour l\'utilisateur.' });
  }
}

export async function updateMemberCommissionRate(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent modifier les commissions.' });
    }

    try {
      await assertPlanFeature(tenantId, 'commercialNetwork');
    } catch (err) {
      if (err instanceof PlanFeatureError) {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const { commissionRate, renewalCommissionRate } = req.body;
    if (commissionRate === undefined && renewalCommissionRate === undefined) {
      return res.status(400).json({ error: 'commissionRate ou renewalCommissionRate est requis.' });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER', orgRole: 'COMMERCIAL' },
    });

    if (!member) {
      return res.status(404).json({ error: 'Commercial organisation introuvable.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        defaultOrgCommercialCommissionRate: true,
        defaultOrgCommercialRenewalCommissionRate: true,
      },
    });

    const rates = resolveCommissionRates({
      first: commissionRate ?? member.commissionRate,
      renewal: renewalCommissionRate ?? member.renewalCommissionRate,
      firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
      renewalFallback:
        tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
    });

    const updated = await prisma.user.update({
      where: { id: memberId },
      data: {
        commissionRate: rates.first,
        renewalCommissionRate: rates.renewal,
      },
      select: userSelect,
    });

    return res.json({
      message: 'Taux de commission mis à jour.',
      member: { ...updated, commissionRate: rates.first, renewalCommissionRate: rates.renewal },
    });
  } catch (error: any) {
    console.error('Erreur updateMemberCommissionRate:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour la commission.' });
  }
}

export async function updateOrgCommercialSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent modifier les paramètres commerciaux.' });
    }

    try {
      await assertPlanFeature(tenantId, 'commercialNetwork');
    } catch (err) {
      if (err instanceof PlanFeatureError) {
        return res.status(403).json({ error: err.message });
      }
      throw err;
    }

    const { defaultCommissionRate, defaultRenewalCommissionRate } = req.body;
    if (defaultCommissionRate === undefined && defaultRenewalCommissionRate === undefined) {
      return res.status(400).json({ error: 'Un taux de commission est requis.' });
    }

    const data: {
      defaultOrgCommercialCommissionRate?: number;
      defaultOrgCommercialRenewalCommissionRate?: number;
    } = {};
    if (defaultCommissionRate !== undefined) {
      data.defaultOrgCommercialCommissionRate = normalizeCommissionRate(defaultCommissionRate);
    }
    if (defaultRenewalCommissionRate !== undefined) {
      data.defaultOrgCommercialRenewalCommissionRate = normalizeCommissionRate(
        defaultRenewalCommissionRate,
        DEFAULT_RENEWAL_COMMISSION_RATE,
      );
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data,
      select: {
        defaultOrgCommercialCommissionRate: true,
        defaultOrgCommercialRenewalCommissionRate: true,
      },
    });

    return res.json({
      message: 'Commissions par défaut mises à jour.',
      defaultCommissionRate: tenant.defaultOrgCommercialCommissionRate,
      defaultRenewalCommissionRate: tenant.defaultOrgCommercialRenewalCommissionRate,
    });
  } catch (error: any) {
    console.error('Erreur updateOrgCommercialSettings:', error);
    return res.status(500).json({ error: 'Impossible de mettre à jour les paramètres.' });
  }
}

export async function resendTeamMemberVerification(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent renvoyer un code OTP.' });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER' },
    });

    if (!member) {
      return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
    }

    if (member.isEmailVerified) {
      return res.status(400).json({ error: 'Ce compte est déjà validé.' });
    }

    const method = (member.verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL') as VerificationMethod;
    if (method === 'WHATSAPP' && !member.phone) {
      return res.status(400).json({ error: 'Aucun numéro WhatsApp associé à ce compte.' });
    }

    await setupUserOtpVerification({
      userId: member.id,
      name: member.name || 'Utilisateur',
      email: member.email,
      phone: member.phone,
      method,
      invitedToTeam: true,
    });

    const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';

    return res.json({
      message: `Un nouveau code OTP a été envoyé par ${channelLabel} à ${member.email}.`,
    });
  } catch (error: any) {
    console.error('Erreur resendTeamMemberVerification:', error);
    return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
  }
}

export async function deleteTeamMember(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const memberId = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageTeam) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent supprimer des utilisateurs.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (tenant?.managerId === memberId) {
      return res.status(400).json({ error: 'Impossible de supprimer le propriétaire de l\'organisation.' });
    }

    const member = await prisma.user.findFirst({
      where: { id: memberId, tenantId, role: 'USER' },
    });

    if (!member) {
      return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
    }

    await prisma.user.delete({ where: { id: memberId } });

    return res.json({ message: 'Utilisateur supprimé de l\'organisation.' });
  } catch (error: any) {
    console.error('Erreur deleteTeamMember:', error);
    return res.status(500).json({ error: 'Impossible de supprimer l\'utilisateur.' });
  }
}

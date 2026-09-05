import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';
import { AuthenticatedRequest, signUserToken } from '../middleware/auth';
import { formatTenantResponse, parseAccountKind } from '../utils/tenantAccess';
import { grantWelcomeAiTokens } from '../services/welcomeAiTokens';
import { isPlanAllowedForAccountKind } from '../config/plansConfig';
import { PlanType } from '@prisma/client';
import { recordUserLegalAcceptance } from '../services/legalService';
import { resolveOrgAccess } from '../services/permissionsService';
import { resolveCommercialByReferralCode } from '../services/commercialService';
import {
  generateOtpCode,
  hashOtpCode,
  verifyOtpCode,
  getOtpExpiryDate,
  isOtpExpired,
  canResendOtp,
  sendRegistrationOtp,
  maskEmail,
  maskPhone,
  VerificationMethod,
} from '../services/otpService';
import { loadPlatformSettings, getContactDestinations, assertAuthOtpMethodAllowed, resolveAuthOtpMethod, defaultAuthOtpMethod } from '../services/platformSettingsService';
import { resolvePhoneFields } from '../utils/phone';
import { wrapBrandedEmail } from '../utils/brandedMessaging';
import { escapeHtml, getPlatformBrand } from '../utils/brandingUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';

async function issueAndSendOtp(params: {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  method: VerificationMethod;
  invitedToTeam?: boolean;
  invitedByCommercial?: boolean;
}) {
  const code = generateOtpCode();
  const otpHash = await hashOtpCode(code);
  const otpExpiresAt = getOtpExpiryDate();

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      otpHash,
      otpExpiresAt,
      verificationMethod: params.method,
      verificationToken: null,
      isEmailVerified: false,
    },
  });

  const { sentVia } = await sendRegistrationOtp({
    name: params.name,
    email: params.email,
    phone: params.phone,
    code,
    method: params.method,
    invitedToTeam: params.invitedToTeam,
    invitedByCommercial: params.invitedByCommercial,
  });

  return sentVia;
}

function publicUser(user: {
  id: string;
  email: string;
  name: string | null;
  phone?: string | null;
  phoneCountryCode?: string | null;
  avatarUrl?: string | null;
  role: string;
  orgRole?: string | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode ?? null,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    orgRole: user.orgRole ?? null,
  };
}

function buildAuthToken(
  user: { id: string; tenantId: string | null; role: string },
  options?: { impersonatedBy?: string; expiresIn?: string },
) {
  return signUserToken(
    {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role as 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER',
      impersonatedBy: options?.impersonatedBy,
    },
    options?.expiresIn || '24h',
  );
}

export async function register(req: Request, res: Response) {
  try {
    const platform = loadPlatformSettings();
    if (platform.maintenanceMode) {
      return res.status(503).json({
        error: 'maintenance',
        message: platform.maintenanceMessage || 'La plateforme est en maintenance.',
      });
    }
    if (!platform.allowRegistration) {
      return res.status(403).json({
        error: 'Les inscriptions sont actuellement fermées. Contactez le support pour créer une organisation.',
      });
    }

    const { email, password, name, tenantName, phone, phoneCountryCode, nationalNumber, verificationMethod = 'EMAIL', acceptTerms, acceptPrivacy, referralCode, accountKind: rawAccountKind, intent: rawIntent } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires (email, password, name)' });
    }

    if (!acceptTerms || !acceptPrivacy) {
      return res.status(400).json({ error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.' });
    }

    const methodCheck = assertAuthOtpMethodAllowed(verificationMethod, platform);
    if (!methodCheck.ok) {
      return res.status(400).json({ error: methodCheck.error });
    }
    const method = methodCheck.method as VerificationMethod;
    const phoneFields = resolvePhoneFields({ phone, phoneCountryCode, nationalNumber });

    if (method === 'WHATSAPP' && !phoneFields.phone) {
      return res.status(400).json({ error: 'Le numéro de téléphone est obligatoire pour la validation par WhatsApp.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let referredByCommercialId: string | null = null;
    let referredByOrgUserId: string | null = null;
    if (referralCode) {
      const commercial = await resolveCommercialByReferralCode(String(referralCode));
      if (!commercial) {
        return res.status(400).json({ error: 'Code parrainage commercial invalide.' });
      }
      if (commercial.type === 'platform') {
        referredByCommercialId = commercial.id;
      } else {
        referredByOrgUserId = commercial.id;
      }
    }

    const accountKind = parseAccountKind(rawAccountKind);
    const resolvedTenantName = String(tenantName || '').trim() || (accountKind === 'CLIENT' ? String(name).trim() : '');
    if (!resolvedTenantName) {
      return res.status(400).json({ error: 'Le nom de l’organisation est obligatoire.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: resolvedTenantName,
          plan: 'FREE',
          accountKind,
          referredByCommercialId,
          referredByOrgUserId,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          phone: phoneFields.phone,
          phoneCountryCode: phoneFields.phoneCountryCode,
          role: 'USER',
          tenantId: tenant.id,
          isEmailVerified: false,
          verificationMethod: method,
        },
      });

      await tx.tenant.update({
        where: { id: tenant.id },
        data: { managerId: user.id },
      });

      return { user, tenant };
    });

    await recordUserLegalAcceptance({
      userId: result.user.id,
      acceptTerms: true,
      acceptPrivacy: true,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || null,
      userAgent: (req.headers['user-agent'] as string) || null,
    });

    try {
      await grantWelcomeAiTokens({
        userId: result.user.id,
        accountKind,
        intent: typeof rawIntent === 'string' ? rawIntent : null,
      });
    } catch (grantError) {
      console.error('[register] welcome AI tokens:', grantError);
    }

    const sentVia = await issueAndSendOtp({
      userId: result.user.id,
      name,
      email,
      phone: phoneFields.phone,
      method,
    });

    const destination =
      sentVia === 'WHATSAPP' && phoneFields.phone
        ? maskPhone(phoneFields.phone)
        : maskEmail(email);

    return res.status(201).json({
      message:
        sentVia === 'WHATSAPP'
          ? `Compte créé ! Un code OTP a été envoyé sur WhatsApp (${destination}). Saisissez-le pour activer votre compte.`
          : `Compte créé ! Un code OTP a été envoyé par e-mail (${destination}). Saisissez-le pour activer votre compte.`,
      requiresVerification: true,
      verificationMethod: sentVia,
      email: result.user.email,
      user: publicUser(result.user),
      tenant: formatTenantResponse(result.tenant),
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de l\'inscription' });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'L\'e-mail et le code OTP sont requis.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Code invalide ou compte introuvable.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Ce compte est déjà validé. Vous pouvez vous connecter.' });
    }

    if (isOtpExpired(user.otpExpiresAt)) {
      return res.status(400).json({ error: 'Le code OTP a expiré. Demandez un nouveau code.', expired: true });
    }

    const valid = await verifyOtpCode(String(otp).trim(), user.otpHash);
    if (!valid) {
      return res.status(400).json({ error: 'Code OTP incorrect.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        otpHash: null,
        otpExpiresAt: null,
        verificationToken: null,
      },
    });

    const token = buildAuthToken(updatedUser);

    const access =
      updatedUser.tenantId && updatedUser.role === 'USER'
        ? await resolveOrgAccess(updatedUser.id, updatedUser.tenantId)
        : null;

    return res.json({
      message: 'Compte validé avec succès ! Connexion en cours...',
      token,
      user: publicUser(updatedUser),
      tenant: user.tenant ? formatTenantResponse(user.tenant) : null,
      access,
    });
  } catch (error: any) {
    console.error('Erreur verifyOtp:', error);
    return res.status(500).json({ error: 'Erreur lors de la validation du code OTP.' });
  }
}

export async function resendOtp(req: Request, res: Response) {
  try {
    const { email, verificationMethod } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'L\'adresse e-mail est requise.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.json({ message: 'Si le compte existe, un nouveau code OTP a été envoyé.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ error: 'Ce compte est déjà validé.' });
    }

    if (!canResendOtp(user.updatedAt, user.otpExpiresAt)) {
      return res.status(429).json({ error: 'Veuillez patienter une minute avant de redemander un code.' });
    }

    const method = resolveAuthOtpMethod(
      verificationMethod || user.verificationMethod || defaultAuthOtpMethod(),
    ) as VerificationMethod;

    if (method === 'WHATSAPP' && !user.phone) {
      return res.status(400).json({ error: 'Aucun numéro WhatsApp associé à ce compte.' });
    }

    const sentVia = await issueAndSendOtp({
      userId: user.id,
      name: user.name || 'Utilisateur',
      email: user.email,
      phone: user.phone,
      method,
    });

    const destination =
      sentVia === 'WHATSAPP' && user.phone ? maskPhone(user.phone) : maskEmail(user.email);

    return res.json({
      message:
        sentVia === 'WHATSAPP'
          ? `Un nouveau code OTP a été envoyé sur WhatsApp (${destination}).`
          : `Un nouveau code OTP a été envoyé par e-mail (${destination}).`,
      verificationMethod: sentVia,
    });
  } catch (error: any) {
    console.error('Erreur resendOtp:', error);
    return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Veuillez saisir votre email (ou téléphone) et mot de passe' });
    }

    const identifier = String(email).trim();
    const digits = identifier.replace(/[^\d]/g, '');
    const phoneCandidates = Array.from(new Set([
      identifier,
      identifier.startsWith('+') ? identifier : digits ? `+${digits}` : '',
    ].filter(Boolean)));

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          ...phoneCandidates.map((phone) => ({ phone })),
        ],
      },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    if (!user.isEmailVerified && user.role !== 'SUPER_ADMIN' && user.role !== 'COMMERCIAL') {
      return res.status(403).json({
        error: 'Votre compte n\'est pas encore validé. Saisissez le code OTP reçu par e-mail ou WhatsApp.',
        notVerified: true,
        email: user.email,
        verificationMethod: resolveAuthOtpMethod(user.verificationMethod || defaultAuthOtpMethod()),
      });
    }

    const token = buildAuthToken(user);

    const access =
      user.tenantId && user.role === 'USER'
        ? await resolveOrgAccess(user.id, user.tenantId)
        : null;

    return res.json({
      token,
      user: publicUser(user),
      tenant: user.tenant ? formatTenantResponse(user.tenant) : null,
      access,
    });
  } catch (error: any) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
  }
}

/** @deprecated Conservé pour les anciens liens e-mail — préférer verifyOtp */
export async function verifyEmail(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Jeton de vérification manquant ou invalide' });
    }

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Le jeton de vérification est invalide ou a expiré' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        otpHash: null,
        otpExpiresAt: null,
      },
    });

    const jwtToken = buildAuthToken(updatedUser);

    return res.json({
      message: 'Votre compte a été confirmé avec succès ! Connexion automatique en cours...',
      token: jwtToken,
      user: publicUser(updatedUser),
      tenant: user.tenant ? formatTenantResponse(user.tenant) : null,
    });
  } catch (error: any) {
    console.error('Erreur lors de la vérification du compte:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification du compte' });
  }
}

export async function getProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { tenant: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const access = user.tenantId
      ? await resolveOrgAccess(user.id, user.tenantId)
      : null;

    return res.json({
      user: {
        ...publicUser(user),
        impersonatedBy: req.user.impersonatedBy || null,
      },
      tenant: user.tenant ? formatTenantResponse(user.tenant) : null,
      access,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du profil:', error);
    return res.status(500).json({ error: 'Erreur interne lors de la récupération du profil.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const { name, phone, phoneCountryCode, nationalNumber, avatarUrl, password, tenantName, accountKind } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Le nom est obligatoire.' });
    }

    const phoneFields = resolvePhoneFields({ phone, phoneCountryCode, nationalNumber });
    const updateData: any = {
      name,
      phone: phoneFields.phone,
      phoneCountryCode: phoneFields.phoneCountryCode,
    };
    if (typeof avatarUrl === 'string') {
      updateData.avatarUrl = avatarUrl.trim() || null;
    }
    if (avatarUrl === null) {
      updateData.avatarUrl = null;
    }

    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const wantsAccountKind =
      accountKind === 'ORGANIZER' || accountKind === 'VENDOR' || accountKind === 'BOTH' || accountKind === 'CLIENT';
    if (wantsAccountKind && req.user.tenantId) {
      const access = await resolveOrgAccess(req.user.id, req.user.tenantId);
      if (!access.isOwner && access.level !== 'manager' && access.level !== 'client') {
        return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent changer le type de compte.' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: req.user!.id },
        data: updateData,
      });

      let updatedTenant = null;
      let planResetToFree = false;
      if (req.user!.tenantId) {
        const currentTenant = await tx.tenant.findUnique({
          where: { id: req.user!.tenantId },
          select: { plan: true },
        });
        const tenantData: {
          name?: string;
          accountKind?: 'ORGANIZER' | 'VENDOR' | 'BOTH' | 'CLIENT';
          plan?: PlanType;
        } = {};
        if (tenantName) tenantData.name = tenantName;
        if (wantsAccountKind) {
          const nextKind = parseAccountKind(accountKind);
          tenantData.accountKind = nextKind;
          const currentPlan = currentTenant?.plan || 'FREE';
          if (nextKind === 'CLIENT' || !isPlanAllowedForAccountKind(currentPlan, nextKind)) {
            if (currentPlan !== 'FREE') planResetToFree = true;
            tenantData.plan = 'FREE';
          }
        }
        if (Object.keys(tenantData).length > 0) {
          updatedTenant = await tx.tenant.update({
            where: { id: req.user!.tenantId },
            data: tenantData,
          });
        } else {
          updatedTenant = await tx.tenant.findUnique({
            where: { id: req.user!.tenantId },
          });
        }
      }

      return { user: updatedUser, tenant: updatedTenant, planResetToFree };
    });

    return res.json({
      message: result.planResetToFree
        ? 'Profil mis à jour. L’ancien forfait n’était pas destiné à ce type de compte : l’espace est passé à l’essai Essentials. Choisissez un forfait adapté dans Facturation.'
        : 'Profil mis à jour avec succès !',
      planResetToFree: result.planResetToFree,
      user: publicUser(result.user),
      tenant: result.tenant ? formatTenantResponse(result.tenant) : null,
    });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    return res.status(500).json({ error: 'Erreur interne lors de la mise à jour du profil.' });
  }
}

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email, method = 'EMAIL' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Veuillez saisir votre adresse e-mail ou numéro de téléphone' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { phone: email }],
      },
    });

    if (!user) {
      return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
    }

    const methodCheck = assertAuthOtpMethodAllowed(method);
    if (!methodCheck.ok) {
      return res.status(400).json({ error: methodCheck.error });
    }
    const resolvedMethod = methodCheck.method;

    const resetToken = jwt.sign(
      { userId: user.id, purpose: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

    if (resolvedMethod === 'WHATSAPP') {
      if (!user.phone) {
        return res.status(400).json({
          error: 'Aucun numéro WhatsApp associé à ce compte. Utilisez l’e-mail ou mettez à jour votre profil.',
        });
      }
      const { sendRealWhatsApp } = await import('../services/notificationService');
      const whatsappBody = `Bonjour *${user.name || 'Utilisateur'}*,\n\nVous avez demandé la réinitialisation de votre mot de passe sur *EventMaster*.\n\nVeuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n👉 ${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\nL'équipe EventMaster ✨`;
      await sendRealWhatsApp(user.phone, whatsappBody);
    } else {
      const { sendRealEmail } = await import('../services/notificationService');
      const brand = getPlatformBrand();
      const { platformName } = getContactDestinations();
      const emailSubject = `Réinitialisation de votre mot de passe - ${platformName}`;
      const emailText = `Bonjour ${user.name || 'Utilisateur'},\n\nVous avez demandé la réinitialisation de votre mot de passe sur ${platformName}. Veuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n${resetLink}\n\nSi vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe ${platformName}`;
      const emailHtml = wrapBrandedEmail({
        branding: brand,
        orgName: platformName,
        title: 'Réinitialisation de mot de passe',
        eyebrow: 'Sécurité',
        headerEmoji: '🔑',
        innerHtml: `
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">Bonjour <strong>${escapeHtml(user.name || 'Utilisateur')}</strong>,</p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte ${escapeHtml(platformName)}.</p>
        `,
        cta: { href: resetLink, label: 'Réinitialiser mon mot de passe' },
        footerNote: 'Lien valable 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.',
      });
      await sendRealEmail(user.email, emailSubject, emailText, emailHtml);
    }

    return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
  } catch (error: any) {
    console.error('Erreur forgotPassword:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la demande de réinitialisation' });
  }
}

export async function resetPassword(req: Request, res: Response) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Le jeton et le mot de passe sont obligatoires.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide ou a expiré.' });
    }

    if (!decoded || decoded.purpose !== 'password-reset' || !decoded.userId) {
      return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide.' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return res.json({ message: 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.' });
  } catch (error: any) {
    console.error('Erreur resetPassword:', error);
    return res.status(500).json({ error: 'Erreur interne du serveur lors de la réinitialisation du mot de passe' });
  }
}

/** Utilitaire partagé pour création d'utilisateur avec OTP (équipe, admin) */
export async function setupUserOtpVerification(params: {
  userId: string;
  name: string;
  email: string;
  phone?: string | null;
  method: VerificationMethod;
  invitedToTeam?: boolean;
  invitedByCommercial?: boolean;
}) {
  return issueAndSendOtp(params);
}

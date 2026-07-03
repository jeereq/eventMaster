"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyOtp = verifyOtp;
exports.resendOtp = resendOtp;
exports.login = login;
exports.verifyEmail = verifyEmail;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.setupUserOtpVerification = setupUserOtpVerification;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const tenantAccess_1 = require("../utils/tenantAccess");
const legalService_1 = require("../services/legalService");
const permissionsService_1 = require("../services/permissionsService");
const commercialService_1 = require("../services/commercialService");
const otpService_1 = require("../services/otpService");
const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';
async function issueAndSendOtp(params) {
    const code = (0, otpService_1.generateOtpCode)();
    const otpHash = await (0, otpService_1.hashOtpCode)(code);
    const otpExpiresAt = (0, otpService_1.getOtpExpiryDate)();
    await db_1.prisma.user.update({
        where: { id: params.userId },
        data: {
            otpHash,
            otpExpiresAt,
            verificationMethod: params.method,
            verificationToken: null,
            isEmailVerified: false,
        },
    });
    const { sentVia } = await (0, otpService_1.sendRegistrationOtp)({
        name: params.name,
        email: params.email,
        phone: params.phone,
        code,
        method: params.method,
    });
    return sentVia;
}
function buildAuthToken(user) {
    return jsonwebtoken_1.default.sign({ userId: user.id, tenantId: user.tenantId, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}
async function register(req, res) {
    try {
        const { email, password, name, tenantName, phone, verificationMethod = 'EMAIL', acceptTerms, acceptPrivacy, referralCode } = req.body;
        if (!email || !password || !name || !tenantName) {
            return res.status(400).json({ error: 'Tous les champs sont obligatoires (email, password, name, tenantName)' });
        }
        if (!acceptTerms || !acceptPrivacy) {
            return res.status(400).json({ error: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité.' });
        }
        const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        if (method === 'WHATSAPP' && !phone) {
            return res.status(400).json({ error: 'Le numéro de téléphone est obligatoire pour la validation par WhatsApp.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        let referredByCommercialId = null;
        let referredByOrgUserId = null;
        if (referralCode) {
            const commercial = await (0, commercialService_1.resolveCommercialByReferralCode)(String(referralCode));
            if (!commercial) {
                return res.status(400).json({ error: 'Code parrainage commercial invalide.' });
            }
            if (commercial.type === 'platform') {
                referredByCommercialId = commercial.id;
            }
            else {
                referredByOrgUserId = commercial.id;
            }
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    plan: 'FREE',
                    referredByCommercialId,
                    referredByOrgUserId,
                },
            });
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    phone: phone || null,
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
        await (0, legalService_1.recordUserLegalAcceptance)({
            userId: result.user.id,
            acceptTerms: true,
            acceptPrivacy: true,
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null,
            userAgent: req.headers['user-agent'] || null,
        });
        const sentVia = await issueAndSendOtp({
            userId: result.user.id,
            name,
            email,
            phone,
            method,
        });
        const destination = sentVia === 'WHATSAPP' && phone ? (0, otpService_1.maskPhone)(phone) : (0, otpService_1.maskEmail)(email);
        return res.status(201).json({
            message: sentVia === 'WHATSAPP'
                ? `Compte créé ! Un code OTP a été envoyé sur WhatsApp (${destination}). Saisissez-le pour activer votre compte.`
                : `Compte créé ! Un code OTP a été envoyé par e-mail (${destination}). Saisissez-le pour activer votre compte.`,
            requiresVerification: true,
            verificationMethod: sentVia,
            email: result.user.email,
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                phone: result.user.phone,
                role: result.user.role,
            },
            tenant: (0, tenantAccess_1.formatTenantResponse)(result.tenant),
        });
    }
    catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de l\'inscription' });
    }
}
async function verifyOtp(req, res) {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ error: 'L\'e-mail et le code OTP sont requis.' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(400).json({ error: 'Code invalide ou compte introuvable.' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Ce compte est déjà validé. Vous pouvez vous connecter.' });
        }
        if ((0, otpService_1.isOtpExpired)(user.otpExpiresAt)) {
            return res.status(400).json({ error: 'Le code OTP a expiré. Demandez un nouveau code.', expired: true });
        }
        const valid = await (0, otpService_1.verifyOtpCode)(String(otp).trim(), user.otpHash);
        if (!valid) {
            return res.status(400).json({ error: 'Code OTP incorrect.' });
        }
        const updatedUser = await db_1.prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                otpHash: null,
                otpExpiresAt: null,
                verificationToken: null,
            },
        });
        const token = buildAuthToken(updatedUser);
        const access = updatedUser.tenantId && updatedUser.role === 'USER'
            ? await (0, permissionsService_1.resolveOrgAccess)(updatedUser.id, updatedUser.tenantId)
            : null;
        return res.json({
            message: 'Compte validé avec succès ! Connexion en cours...',
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
                orgRole: updatedUser.orgRole,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
            access,
        });
    }
    catch (error) {
        console.error('Erreur verifyOtp:', error);
        return res.status(500).json({ error: 'Erreur lors de la validation du code OTP.' });
    }
}
async function resendOtp(req, res) {
    try {
        const { email, verificationMethod } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'L\'adresse e-mail est requise.' });
        }
        const user = await db_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.json({ message: 'Si le compte existe, un nouveau code OTP a été envoyé.' });
        }
        if (user.isEmailVerified) {
            return res.status(400).json({ error: 'Ce compte est déjà validé.' });
        }
        if (!(0, otpService_1.canResendOtp)(user.updatedAt, user.otpExpiresAt)) {
            return res.status(429).json({ error: 'Veuillez patienter une minute avant de redemander un code.' });
        }
        const method = (verificationMethod || user.verificationMethod || 'EMAIL');
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
        const destination = sentVia === 'WHATSAPP' && user.phone ? (0, otpService_1.maskPhone)(user.phone) : (0, otpService_1.maskEmail)(user.email);
        return res.json({
            message: sentVia === 'WHATSAPP'
                ? `Un nouveau code OTP a été envoyé sur WhatsApp (${destination}).`
                : `Un nouveau code OTP a été envoyé par e-mail (${destination}).`,
            verificationMethod: sentVia,
        });
    }
    catch (error) {
        console.error('Erreur resendOtp:', error);
        return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
    }
}
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Veuillez saisir votre email (ou téléphone) et mot de passe' });
        }
        const user = await db_1.prisma.user.findFirst({
            where: {
                OR: [{ email: email }, { phone: email }],
            },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }
        if (!user.isEmailVerified && user.role !== 'SUPER_ADMIN' && user.role !== 'COMMERCIAL') {
            return res.status(403).json({
                error: 'Votre compte n\'est pas encore validé. Saisissez le code OTP reçu par e-mail ou WhatsApp.',
                notVerified: true,
                email: user.email,
                verificationMethod: user.verificationMethod || 'EMAIL',
            });
        }
        const token = buildAuthToken(user);
        const access = user.tenantId && user.role === 'USER'
            ? await (0, permissionsService_1.resolveOrgAccess)(user.id, user.tenantId)
            : null;
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                orgRole: user.orgRole,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
            access,
        });
    }
    catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
    }
}
/** @deprecated Conservé pour les anciens liens e-mail — préférer verifyOtp */
async function verifyEmail(req, res) {
    try {
        const { token } = req.query;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Jeton de vérification manquant ou invalide' });
        }
        const user = await db_1.prisma.user.findFirst({
            where: { verificationToken: token },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(400).json({ error: 'Le jeton de vérification est invalide ou a expiré' });
        }
        const updatedUser = await db_1.prisma.user.update({
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
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
        });
    }
    catch (error) {
        console.error('Erreur lors de la vérification du compte:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la vérification du compte' });
    }
}
async function getProfile(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: { tenant: true },
        });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        const access = user.tenantId
            ? await (0, permissionsService_1.resolveOrgAccess)(user.id, user.tenantId)
            : null;
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
                orgRole: user.orgRole,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
            access,
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        return res.status(500).json({ error: 'Erreur interne lors de la récupération du profil.' });
    }
}
async function updateProfile(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const { name, email, phone, password, tenantName } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Le nom et l\'adresse e-mail sont obligatoires.' });
        }
        const existingUser = await db_1.prisma.user.findFirst({
            where: {
                email,
                id: { not: req.user.id },
            },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Cette adresse e-mail est déjà utilisée par un autre compte.' });
        }
        const updateData = {
            name,
            email,
            phone: phone || null,
        };
        if (password && password.trim() !== '') {
            updateData.passwordHash = await bcryptjs_1.default.hash(password, 10);
        }
        const result = await db_1.prisma.$transaction(async (tx) => {
            const updatedUser = await tx.user.update({
                where: { id: req.user.id },
                data: updateData,
            });
            let updatedTenant = null;
            if (tenantName && req.user.tenantId) {
                updatedTenant = await tx.tenant.update({
                    where: { id: req.user.tenantId },
                    data: { name: tenantName },
                });
            }
            else if (req.user.tenantId) {
                updatedTenant = await tx.tenant.findUnique({
                    where: { id: req.user.tenantId },
                });
            }
            return { user: updatedUser, tenant: updatedTenant };
        });
        return res.json({
            message: 'Profil mis à jour avec succès !',
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
                phone: result.user.phone,
                role: result.user.role,
            },
            tenant: result.tenant ? (0, tenantAccess_1.formatTenantResponse)(result.tenant) : null,
        });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return res.status(500).json({ error: 'Erreur interne lors de la mise à jour du profil.' });
    }
}
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
async function forgotPassword(req, res) {
    try {
        const { email, method = 'EMAIL' } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Veuillez saisir votre adresse e-mail ou numéro de téléphone' });
        }
        const user = await db_1.prisma.user.findFirst({
            where: {
                OR: [{ email: email }, { phone: email }],
            },
        });
        if (!user) {
            return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
        }
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
        if (method === 'WHATSAPP' && user.phone) {
            const { sendRealWhatsApp } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
            const whatsappBody = `Bonjour *${user.name || 'Utilisateur'}*,\n\nVous avez demandé la réinitialisation de votre mot de passe sur *EventMaster*.\n\nVeuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n👉 ${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\nL'équipe EventMaster ✨`;
            await sendRealWhatsApp(user.phone, whatsappBody);
        }
        else {
            const { sendRealEmail } = await Promise.resolve().then(() => __importStar(require('../services/notificationService')));
            const emailSubject = 'Réinitialisation de votre mot de passe - EventMaster';
            const emailText = `Bonjour ${user.name || 'Utilisateur'},\n\nVous avez demandé la réinitialisation de votre mot de passe sur EventMaster. Veuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n${resetLink}\n\nSi vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe EventMaster`;
            const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Réinitialisation de mot de passe</h2>
          <p>Bonjour <strong>${user.name || 'Utilisateur'}</strong>,</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte EventMaster.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
          </div>
          <p style="font-size: 0.875rem; color: #6b7280;">Lien valable 1 heure.</p>
        </div>
      `;
            await sendRealEmail(user.email, emailSubject, emailText, emailHtml);
        }
        return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
    }
    catch (error) {
        console.error('Erreur forgotPassword:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la demande de réinitialisation' });
    }
}
async function resetPassword(req, res) {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Le jeton et le mot de passe sont obligatoires.' });
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch {
            return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide ou a expiré.' });
        }
        if (!decoded || decoded.purpose !== 'password-reset' || !decoded.userId) {
            return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide.' });
        }
        const user = await db_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await db_1.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
        return res.json({ message: 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.' });
    }
    catch (error) {
        console.error('Erreur resetPassword:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la réinitialisation du mot de passe' });
    }
}
/** Utilitaire partagé pour création d'utilisateur avec OTP (équipe, admin) */
async function setupUserOtpVerification(params) {
    return issueAndSendOtp(params);
}

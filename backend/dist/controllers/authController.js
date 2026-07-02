"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.verifyEmail = verifyEmail;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../db");
const notificationService_1 = require("../services/notificationService");
const tenantAccess_1 = require("../utils/tenantAccess");
const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
async function register(req, res) {
    try {
        const { email, password, name, tenantName, phone, verificationMethod = 'EMAIL' } = req.body;
        if (!email || !password || !name || !tenantName) {
            return res.status(400).json({ error: 'Tous les champs sont obligatoires (email, password, name, tenantName)' });
        }
        if (verificationMethod === 'WHATSAPP' && !phone) {
            return res.status(400).json({ error: 'Le numéro de téléphone est obligatoire pour la confirmation par WhatsApp.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const verificationToken = crypto_1.default.randomBytes(32).toString('hex');
        // Create Tenant and User in a transaction to ensure atomic registration
        const result = await db_1.prisma.$transaction(async (tx) => {
            // 1. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: tenantName,
                    plan: 'FREE',
                },
            });
            // 2. Create User linked to Tenant
            const user = await tx.user.create({
                data: {
                    email,
                    passwordHash,
                    name,
                    phone: phone || null,
                    role: 'USER',
                    tenantId: tenant.id,
                    isEmailVerified: false,
                    verificationToken,
                },
            });
            // 3. Set User as the manager of the Tenant
            await tx.tenant.update({
                where: { id: tenant.id },
                data: { managerId: user.id },
            });
            return { user, tenant };
        });
        // Send confirmation link
        const verificationLink = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
        let sentMethod = 'EMAIL';
        if (verificationMethod === 'WHATSAPP' && phone) {
            const whatsappBody = `Bonjour *${name}*,\n\nMerci de vous être inscrit sur *EventMaster* ! 🚀\n\nPour activer votre compte et commencer à organiser vos événements, veuillez confirmer votre compte en cliquant sur le lien suivant :\n👉 ${verificationLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\nL'équipe EventMaster ✨`;
            console.log(`[Auth Controller] Sending confirmation link via WhatsApp to ${phone}...`);
            await (0, notificationService_1.sendRealWhatsApp)(phone, whatsappBody);
            sentMethod = 'WHATSAPP';
        }
        else {
            const emailSubject = 'Confirmez votre adresse e-mail - EventMaster';
            const emailText = `Bonjour ${name},\n\nMerci de vous être inscrit sur EventMaster. Veuillez confirmer votre adresse e-mail en cliquant sur le lien suivant :\n${verificationLink}\n\nSi vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe EventMaster`;
            const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Bienvenue sur EventMaster !</h2>
          <p>Bonjour <strong>${name}</strong>,</p>
          <p>Merci de vous être inscrit sur EventMaster, votre plateforme de gestion d'événements et d'invitations.</p>
          <p>Pour activer votre compte et commencer à organiser vos événements, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Confirmer mon e-mail</a>
          </div>
          <p style="font-size: 0.875rem; color: #6b7280;">Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br><a href="${verificationLink}" style="color: #4f46e5;">${verificationLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 0.875rem; color: #9ca3af; text-align: center;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet e-mail.</p>
        </div>
      `;
            await (0, notificationService_1.sendRealEmail)(email, emailSubject, emailText, emailHtml);
        }
        return res.status(201).json({
            message: sentMethod === 'WHATSAPP'
                ? 'Compte créé avec succès ! Un lien de confirmation a été envoyé sur votre WhatsApp. Veuillez cliquer sur ce lien pour activer votre compte.'
                : 'Compte créé avec succès ! Un e-mail de confirmation a été envoyé. Veuillez confirmer votre adresse e-mail pour vous connecter.',
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
async function login(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Veuillez saisir votre email (ou téléphone) et mot de passe' });
        }
        // Search user by email OR phone number
        const user = await db_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { phone: email }
                ]
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
        // Check if email is verified
        if (!user.isEmailVerified && user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                error: 'Veuillez confirmer votre adresse e-mail avant de vous connecter. Un lien de confirmation vous a été envoyé par e-mail.',
                notVerified: true,
            });
        }
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
        });
    }
    catch (error) {
        console.error('Erreur lors de la connexion:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la connexion' });
    }
}
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
            },
        });
        // Generate JWT Token to automatically log the user in
        const jwtToken = jsonwebtoken_1.default.sign({
            userId: updatedUser.id,
            tenantId: updatedUser.tenantId,
            role: updatedUser.role,
        }, JWT_SECRET, { expiresIn: '24h' });
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
// GET /auth/profile
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
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                phone: user.phone,
                role: user.role,
            },
            tenant: user.tenant ? (0, tenantAccess_1.formatTenantResponse)(user.tenant) : null,
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        return res.status(500).json({ error: 'Erreur interne lors de la récupération du profil.' });
    }
}
// PUT /auth/profile
async function updateProfile(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const { name, email, phone, password, tenantName } = req.body;
        if (!name || !email) {
            return res.status(400).json({ error: 'Le nom et l\'adresse e-mail sont obligatoires.' });
        }
        // Check if email is already taken by another user
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
        // Update User and Tenant in a transaction if tenantName is provided
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
async function forgotPassword(req, res) {
    try {
        const { email, method = 'EMAIL' } = req.body; // method: 'EMAIL' or 'WHATSAPP'
        if (!email) {
            return res.status(400).json({ error: 'Veuillez saisir votre adresse e-mail ou numéro de téléphone' });
        }
        // Find user by email or phone
        const user = await db_1.prisma.user.findFirst({
            where: {
                OR: [
                    { email: email },
                    { phone: email }
                ]
            }
        });
        if (!user) {
            // For security reasons, don't reveal if the user exists or not, but return success
            return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
        }
        // Generate a reset token (JWT containing userId and purpose, expiring in 1h)
        const resetToken = jsonwebtoken_1.default.sign({ userId: user.id, purpose: 'password-reset' }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
        if (method === 'WHATSAPP' && user.phone) {
            const whatsappBody = `Bonjour *${user.name || 'Utilisateur'}*,\n\nVous avez demandé la réinitialisation de votre mot de passe sur *EventMaster*.\n\nVeuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n👉 ${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message.\n\nL'équipe EventMaster ✨`;
            console.log(`[Auth Controller] Sending password reset link via WhatsApp to ${user.phone}...`);
            await (0, notificationService_1.sendRealWhatsApp)(user.phone, whatsappBody);
        }
        else {
            const emailSubject = 'Réinitialisation de votre mot de passe - EventMaster';
            const emailText = `Bonjour ${user.name || 'Utilisateur'},\n\nVous avez demandé la réinitialisation de votre mot de passe sur EventMaster. Veuillez cliquer sur le lien suivant pour définir un nouveau mot de passe (valable 1 heure) :\n${resetLink}\n\nSi vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe EventMaster`;
            const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #4f46e5; text-align: center;">Réinitialisation de mot de passe</h2>
          <p>Bonjour <strong>${user.name || 'Utilisateur'}</strong>,</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte EventMaster.</p>
          <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous (ce lien est valable pendant 1 heure) :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Réinitialiser mon mot de passe</a>
          </div>
          <p style="font-size: 0.875rem; color: #6b7280;">Si le bouton ne fonctionne pas, vous pouvez copier et coller ce lien dans votre navigateur :<br><a href="${resetLink}" style="color: #4f46e5;">${resetLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
          <p style="font-size: 0.875rem; color: #9ca3af; text-align: center;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        </div>
      `;
            await (0, notificationService_1.sendRealEmail)(user.email, emailSubject, emailText, emailHtml);
        }
        return res.json({ message: 'Si le compte existe, un lien de réinitialisation a été envoyé.' });
    }
    catch (error) {
        console.error('Erreur lors de la demande de réinitialisation de mot de passe:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la demande de réinitialisation' });
    }
}
async function resetPassword(req, res) {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ error: 'Le jeton et le mot de passe sont obligatoires.' });
        }
        // Verify reset token
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch (err) {
            return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide ou a expiré.' });
        }
        if (!decoded || decoded.purpose !== 'password-reset' || !decoded.userId) {
            return res.status(400).json({ error: 'Le jeton de réinitialisation est invalide.' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { id: decoded.userId }
        });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        await db_1.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
        });
        return res.json({ message: 'Votre mot de passe a été réinitialisé avec succès ! Vous pouvez maintenant vous connecter.' });
    }
    catch (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la réinitialisation du mot de passe' });
    }
}

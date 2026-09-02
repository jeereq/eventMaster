"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordCommercialCommission = void 0;
exports.getCommercialDashboard = getCommercialDashboard;
exports.createCommercialOrganization = createCommercialOrganization;
exports.resendCommercialManagerVerification = resendCommercialManagerVerification;
exports.getCommercialReferralInfo = getCommercialReferralInfo;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const commercialService_1 = require("../services/commercialService");
Object.defineProperty(exports, "recordCommercialCommission", { enumerable: true, get: function () { return commercialService_1.recordCommercialCommission; } });
const authController_1 = require("./authController");
const phone_1 = require("../utils/phone");
async function getCommercialDashboard(req, res) {
    try {
        if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
        }
        const referralCode = await (0, commercialService_1.ensureCommercialReferralCode)(req.user.id);
        const commercialUser = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { commissionRate: true, renewalCommissionRate: true },
        });
        const rates = (0, commercialService_1.resolveCommissionRates)({
            first: commercialUser?.commissionRate,
            renewal: commercialUser?.renewalCommissionRate,
        });
        const commissionRate = rates.first;
        const renewalCommissionRate = rates.renewal;
        const [organizations, commissions] = await Promise.all([
            db_1.prisma.tenant.findMany({
                where: { referredByCommercialId: req.user.id },
                include: {
                    manager: { select: { id: true, name: true, email: true, isEmailVerified: true } },
                    _count: { select: { events: true, users: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            db_1.prisma.commercialCommission.findMany({
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
            renewalCommissionRate,
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
    }
    catch (error) {
        console.error('getCommercialDashboard:', error);
        return res.status(500).json({ error: 'Erreur lors du chargement du tableau commercial.' });
    }
}
async function createCommercialOrganization(req, res) {
    try {
        if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
        }
        const { organizationName, managerName, managerEmail, managerPassword, managerPhone, phoneCountryCode, nationalNumber, plan, verificationMethod = 'EMAIL' } = req.body;
        const phoneFields = (0, phone_1.resolvePhoneFields)({
            phone: managerPhone,
            phoneCountryCode,
            nationalNumber,
        });
        if (!organizationName || !managerName || !managerEmail || !managerPassword) {
            return res.status(400).json({
                error: 'Nom de l\'organisation, nom, e-mail et mot de passe du manager sont requis.',
            });
        }
        const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        if (method === 'WHATSAPP' && !phoneFields.phone) {
            return res.status(400).json({ error: 'Le téléphone est obligatoire pour la validation par WhatsApp.' });
        }
        if (managerPassword.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email: managerEmail } });
        if (existingUser) {
            return res.status(400).json({ error: 'Un compte existe déjà avec cet e-mail.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(managerPassword, 10);
        const referralCode = await (0, commercialService_1.ensureCommercialReferralCode)(req.user.id);
        const result = await db_1.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: organizationName.trim(),
                    plan: plan || 'FREE',
                    referredByCommercialId: req.user.id,
                },
            });
            const manager = await tx.user.create({
                data: {
                    name: managerName.trim(),
                    email: managerEmail.trim().toLowerCase(),
                    phone: phoneFields.phone,
                    phoneCountryCode: phoneFields.phoneCountryCode,
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
        await (0, authController_1.setupUserOtpVerification)({
            userId: result.manager.id,
            name: result.manager.name || managerName.trim(),
            email: result.manager.email,
            phone: phoneFields.phone,
            method,
            invitedByCommercial: true,
        });
        const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';
        return res.status(201).json({
            message: `Organisation créée. Un code OTP a été envoyé par ${channelLabel} à ${result.manager.email}. ` +
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
    }
    catch (error) {
        console.error('createCommercialOrganization:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation.' });
    }
}
async function resendCommercialManagerVerification(req, res) {
    try {
        if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
        }
        const managerId = req.params.managerId;
        const manager = await db_1.prisma.user.findFirst({
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
        const method = (manager.verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        if (method === 'WHATSAPP' && !manager.phone) {
            return res.status(400).json({ error: 'Aucun numéro WhatsApp associé à ce compte.' });
        }
        await (0, authController_1.setupUserOtpVerification)({
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
    }
    catch (error) {
        console.error('resendCommercialManagerVerification:', error);
        return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
    }
}
async function getCommercialReferralInfo(req, res) {
    try {
        if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
        }
        const referralCode = await (0, commercialService_1.ensureCommercialReferralCode)(req.user.id);
        const commercialUser = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { commissionRate: true, renewalCommissionRate: true },
        });
        const rates = (0, commercialService_1.resolveCommissionRates)({
            first: commercialUser?.commissionRate,
            renewal: commercialUser?.renewalCommissionRate,
        });
        return res.json({
            referralCode,
            commissionRate: rates.first,
            renewalCommissionRate: rates.renewal,
            description: `${Math.round(rates.first * 100)} % au premier paiement, puis ${Math.round(rates.renewal * 100)} % sur les factures suivantes.`,
        });
    }
    catch (error) {
        console.error('getCommercialReferralInfo:', error);
        return res.status(500).json({ error: 'Erreur interne.' });
    }
}

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeamMembers = getTeamMembers;
exports.createTeamMember = createTeamMember;
exports.updateTeamMember = updateTeamMember;
exports.updateMemberCommissionRate = updateMemberCommissionRate;
exports.updateOrgCommercialSettings = updateOrgCommercialSettings;
exports.resendTeamMemberVerification = resendTeamMemberVerification;
exports.deleteTeamMember = deleteTeamMember;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const planFeaturesService_1 = require("../services/planFeaturesService");
const commercialService_1 = require("../services/commercialService");
const authController_1 = require("./authController");
const phone_1 = require("../utils/phone");
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
async function getTeamMembers(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (req.user?.role !== 'USER') {
            return res.status(403).json({ error: 'Accès réservé aux membres d\'organisation.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        const members = await db_1.prisma.user.findMany({
            where: { tenantId, role: 'USER' },
            select: userSelect,
            orderBy: { createdAt: 'asc' },
        });
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                managerId: true,
                defaultOrgCommercialCommissionRate: true,
                defaultOrgCommercialRenewalCommissionRate: true,
            },
        });
        return res.json({
            members: members.map((m) => {
                const rates = (0, commercialService_1.resolveCommissionRates)({
                    first: m.commissionRate,
                    renewal: m.renewalCommissionRate,
                    firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
                    renewalFallback: tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
                });
                return {
                    ...m,
                    commissionRate: rates.first,
                    renewalCommissionRate: rates.renewal,
                    isOwner: tenant?.managerId === m.id,
                    orgRoleLabel: tenant?.managerId === m.id
                        ? 'OWNER'
                        : m.orgRole || 'MANAGER',
                };
            }),
            access,
            isManager: access.canManageTeam,
            orgCommercialSettings: {
                defaultCommissionRate: tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
                defaultRenewalCommissionRate: tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'équipe:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'équipe.' });
    }
}
async function createTeamMember(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent créer des utilisateurs.' });
        }
        const { name, email, password, phone, phoneCountryCode, nationalNumber, orgRole = 'MANAGER', verificationMethod = 'EMAIL', commissionRate, renewalCommissionRate } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Le nom, l\'e-mail et le mot de passe sont requis.' });
        }
        const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        const phoneFields = (0, phone_1.resolvePhoneFields)({ phone, phoneCountryCode, nationalNumber });
        if (method === 'WHATSAPP' && !phoneFields.phone) {
            return res.status(400).json({ error: 'Le téléphone est obligatoire pour la validation par WhatsApp.' });
        }
        if (!(0, permissionsService_1.isValidOrgRole)(orgRole)) {
            return res.status(400).json({ error: 'orgRole doit être MANAGER, PROTOCOL ou COMMERCIAL.' });
        }
        if (orgRole === 'COMMERCIAL') {
            try {
                await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'commercialNetwork');
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
        }
        if (orgRole === 'MANAGER') {
            try {
                await (0, planFeaturesService_1.assertOrgManagerQuota)(tenantId, true);
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Un utilisateur avec cette adresse e-mail existe déjà.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                defaultOrgCommercialCommissionRate: true,
                defaultOrgCommercialRenewalCommissionRate: true,
            },
        });
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const rates = orgRole === 'COMMERCIAL'
            ? (0, commercialService_1.resolveCommissionRates)({
                first: commissionRate,
                renewal: renewalCommissionRate,
                firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
                renewalFallback: tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
            })
            : null;
        const newUser = await db_1.prisma.user.create({
            data: {
                name,
                email,
                phone: phoneFields.phone,
                phoneCountryCode: phoneFields.phoneCountryCode,
                passwordHash,
                role: 'USER',
                orgRole,
                tenantId,
                commissionRate: rates?.first ?? null,
                renewalCommissionRate: rates?.renewal ?? null,
                isEmailVerified: false,
                verificationMethod: method,
            },
            select: userSelect,
        });
        if (orgRole === 'COMMERCIAL') {
            await (0, commercialService_1.ensureOrgCommercialReferralCode)(newUser.id, tenantId);
        }
        await (0, authController_1.setupUserOtpVerification)({
            userId: newUser.id,
            name,
            email,
            phone: phoneFields.phone,
            method,
            invitedToTeam: true,
        });
        const channelLabel = method === 'WHATSAPP' ? 'WhatsApp' : 'e-mail';
        const refreshed = await db_1.prisma.user.findUnique({
            where: { id: newUser.id },
            select: userSelect,
        });
        return res.status(201).json({
            message: `Utilisateur créé. Un code OTP a été envoyé par ${channelLabel} à ${email}. ` +
                `Le membre doit se connecter sur /login avec son mot de passe, saisir le code OTP, puis accéder au tableau de bord.`,
            member: {
                ...refreshed,
                isOwner: false,
                orgRoleLabel: orgRole,
                commissionRate: rates?.first ?? null,
                renewalCommissionRate: rates?.renewal ?? null,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur d\'équipe:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
    }
}
async function updateTeamMember(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const memberId = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.managerId === memberId) {
            return res.status(400).json({ error: 'Impossible de modifier le rôle du propriétaire.' });
        }
        const { orgRole } = req.body;
        if (!(0, permissionsService_1.isValidOrgRole)(orgRole)) {
            return res.status(400).json({ error: 'orgRole doit être MANAGER, PROTOCOL ou COMMERCIAL.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Utilisateur introuvable.' });
        }
        if (orgRole === 'COMMERCIAL' && member.orgRole !== 'COMMERCIAL') {
            try {
                await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'commercialNetwork');
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
        }
        if (orgRole === 'MANAGER' && member.orgRole !== 'MANAGER') {
            try {
                await (0, planFeaturesService_1.assertOrgManagerQuota)(tenantId, true);
            }
            catch (err) {
                if (err instanceof planFeaturesService_1.PlanFeatureError) {
                    return res.status(403).json({ error: err.message });
                }
                throw err;
            }
        }
        const updateData = { orgRole };
        if (orgRole === 'COMMERCIAL' && member.commissionRate == null) {
            updateData.commissionRate = tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE;
        }
        if (orgRole === 'COMMERCIAL' && member.renewalCommissionRate == null) {
            updateData.renewalCommissionRate =
                tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE;
        }
        if (orgRole !== 'COMMERCIAL') {
            updateData.commissionRate = null;
            updateData.renewalCommissionRate = null;
        }
        const updated = await db_1.prisma.user.update({
            where: { id: memberId },
            data: updateData,
            select: userSelect,
        });
        if (orgRole === 'COMMERCIAL') {
            await (0, commercialService_1.ensureOrgCommercialReferralCode)(updated.id, tenantId);
        }
        const finalUser = await db_1.prisma.user.findUnique({ where: { id: memberId }, select: userSelect });
        return res.json({
            message: 'Rôle mis à jour.',
            member: {
                ...finalUser,
                isOwner: false,
                orgRoleLabel: orgRole,
                ...(() => {
                    const rates = (0, commercialService_1.resolveCommissionRates)({
                        first: finalUser?.commissionRate,
                        renewal: finalUser?.renewalCommissionRate,
                        firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
                        renewalFallback: tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
                    });
                    return { commissionRate: rates.first, renewalCommissionRate: rates.renewal };
                })(),
            },
        });
    }
    catch (error) {
        console.error('Erreur updateTeamMember:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour l\'utilisateur.' });
    }
}
async function updateMemberCommissionRate(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const memberId = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent modifier les commissions.' });
        }
        const { commissionRate, renewalCommissionRate } = req.body;
        if (commissionRate === undefined && renewalCommissionRate === undefined) {
            return res.status(400).json({ error: 'commissionRate ou renewalCommissionRate est requis.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER', orgRole: 'COMMERCIAL' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Commercial organisation introuvable.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                defaultOrgCommercialCommissionRate: true,
                defaultOrgCommercialRenewalCommissionRate: true,
            },
        });
        const rates = (0, commercialService_1.resolveCommissionRates)({
            first: commissionRate ?? member.commissionRate,
            renewal: renewalCommissionRate ?? member.renewalCommissionRate,
            firstFallback: tenant?.defaultOrgCommercialCommissionRate ?? commercialService_1.DEFAULT_COMMISSION_RATE,
            renewalFallback: tenant?.defaultOrgCommercialRenewalCommissionRate ?? commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE,
        });
        const updated = await db_1.prisma.user.update({
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
    }
    catch (error) {
        console.error('Erreur updateMemberCommissionRate:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour la commission.' });
    }
}
async function updateOrgCommercialSettings(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent modifier les paramètres commerciaux.' });
        }
        try {
            await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'commercialNetwork');
        }
        catch (err) {
            if (err instanceof planFeaturesService_1.PlanFeatureError) {
                return res.status(403).json({ error: err.message });
            }
            throw err;
        }
        const { defaultCommissionRate, defaultRenewalCommissionRate } = req.body;
        if (defaultCommissionRate === undefined && defaultRenewalCommissionRate === undefined) {
            return res.status(400).json({ error: 'Un taux de commission est requis.' });
        }
        const data = {};
        if (defaultCommissionRate !== undefined) {
            data.defaultOrgCommercialCommissionRate = (0, commercialService_1.normalizeCommissionRate)(defaultCommissionRate);
        }
        if (defaultRenewalCommissionRate !== undefined) {
            data.defaultOrgCommercialRenewalCommissionRate = (0, commercialService_1.normalizeCommissionRate)(defaultRenewalCommissionRate, commercialService_1.DEFAULT_RENEWAL_COMMISSION_RATE);
        }
        const tenant = await db_1.prisma.tenant.update({
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
    }
    catch (error) {
        console.error('Erreur updateOrgCommercialSettings:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour les paramètres.' });
    }
}
async function resendTeamMemberVerification(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const memberId = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent renvoyer un code OTP.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
        }
        if (member.isEmailVerified) {
            return res.status(400).json({ error: 'Ce compte est déjà validé.' });
        }
        const method = (member.verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        if (method === 'WHATSAPP' && !member.phone) {
            return res.status(400).json({ error: 'Aucun numéro WhatsApp associé à ce compte.' });
        }
        await (0, authController_1.setupUserOtpVerification)({
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
    }
    catch (error) {
        console.error('Erreur resendTeamMemberVerification:', error);
        return res.status(500).json({ error: 'Impossible de renvoyer le code OTP.' });
    }
}
async function deleteTeamMember(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const memberId = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const access = await (0, permissionsService_1.resolveOrgAccess)(userId, tenantId);
        if (!access.canManageTeam) {
            return res.status(403).json({ error: 'Seuls le propriétaire et les managers peuvent supprimer des utilisateurs.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (tenant?.managerId === memberId) {
            return res.status(400).json({ error: 'Impossible de supprimer le propriétaire de l\'organisation.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Utilisateur introuvable dans votre organisation.' });
        }
        await db_1.prisma.user.delete({ where: { id: memberId } });
        return res.json({ message: 'Utilisateur supprimé de l\'organisation.' });
    }
    catch (error) {
        console.error('Erreur deleteTeamMember:', error);
        return res.status(500).json({ error: 'Impossible de supprimer l\'utilisateur.' });
    }
}

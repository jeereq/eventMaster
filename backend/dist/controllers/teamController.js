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
exports.deleteTeamMember = deleteTeamMember;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const planFeaturesService_1 = require("../services/planFeaturesService");
const commercialService_1 = require("../services/commercialService");
const authController_1 = require("./authController");
const userSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    orgRole: true,
    referralCode: true,
    commissionRate: true,
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
            select: { managerId: true, defaultOrgCommercialCommissionRate: true },
        });
        return res.json({
            members: members.map((m) => ({
                ...m,
                commissionRate: m.commissionRate ?? tenant?.defaultOrgCommercialCommissionRate ?? 0.2,
                isOwner: tenant?.managerId === m.id,
                orgRoleLabel: tenant?.managerId === m.id
                    ? 'OWNER'
                    : m.orgRole || 'MANAGER',
            })),
            access,
            isManager: access.canManageTeam,
            orgCommercialSettings: {
                defaultCommissionRate: tenant?.defaultOrgCommercialCommissionRate ?? 0.2,
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
        const { name, email, password, phone, orgRole = 'MANAGER', verificationMethod = 'EMAIL', commissionRate } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Le nom, l\'e-mail et le mot de passe sont requis.' });
        }
        const method = (verificationMethod === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL');
        if (method === 'WHATSAPP' && !phone) {
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
            select: { defaultOrgCommercialCommissionRate: true },
        });
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const resolvedCommissionRate = orgRole === 'COMMERCIAL'
            ? (0, commercialService_1.normalizeCommissionRate)(commissionRate, tenant?.defaultOrgCommercialCommissionRate ?? 0.2)
            : null;
        const newUser = await db_1.prisma.user.create({
            data: {
                name,
                email,
                phone: phone || null,
                passwordHash,
                role: 'USER',
                orgRole,
                tenantId,
                commissionRate: resolvedCommissionRate,
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
            phone,
            method,
        });
        const refreshed = await db_1.prisma.user.findUnique({
            where: { id: newUser.id },
            select: userSelect,
        });
        return res.status(201).json({
            message: method === 'WHATSAPP'
                ? 'Utilisateur créé. Un code OTP a été envoyé sur WhatsApp pour valider le compte.'
                : 'Utilisateur créé. Un code OTP a été envoyé par e-mail pour valider le compte.',
            member: {
                ...refreshed,
                isOwner: false,
                orgRoleLabel: orgRole,
                commissionRate: resolvedCommissionRate,
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
            updateData.commissionRate = tenant?.defaultOrgCommercialCommissionRate ?? 0.2;
        }
        if (orgRole !== 'COMMERCIAL') {
            updateData.commissionRate = null;
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
                commissionRate: finalUser?.commissionRate ?? tenant?.defaultOrgCommercialCommissionRate ?? 0.2,
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
        const { commissionRate } = req.body;
        if (commissionRate === undefined) {
            return res.status(400).json({ error: 'commissionRate est requis.' });
        }
        const member = await db_1.prisma.user.findFirst({
            where: { id: memberId, tenantId, role: 'USER', orgRole: 'COMMERCIAL' },
        });
        if (!member) {
            return res.status(404).json({ error: 'Commercial organisation introuvable.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { defaultOrgCommercialCommissionRate: true },
        });
        const rate = (0, commercialService_1.normalizeCommissionRate)(commissionRate, tenant?.defaultOrgCommercialCommissionRate ?? 0.2);
        const updated = await db_1.prisma.user.update({
            where: { id: memberId },
            data: { commissionRate: rate },
            select: userSelect,
        });
        return res.json({
            message: 'Taux de commission mis à jour.',
            member: { ...updated, commissionRate: rate },
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
        const { defaultCommissionRate } = req.body;
        if (defaultCommissionRate === undefined) {
            return res.status(400).json({ error: 'defaultCommissionRate est requis.' });
        }
        const rate = (0, commercialService_1.normalizeCommissionRate)(defaultCommissionRate);
        const tenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { defaultOrgCommercialCommissionRate: rate },
            select: { defaultOrgCommercialCommissionRate: true },
        });
        return res.json({
            message: 'Commission par défaut mise à jour.',
            defaultCommissionRate: tenant.defaultOrgCommercialCommissionRate,
        });
    }
    catch (error) {
        console.error('Erreur updateOrgCommercialSettings:', error);
        return res.status(500).json({ error: 'Impossible de mettre à jour les paramètres.' });
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

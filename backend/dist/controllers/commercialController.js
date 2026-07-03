"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordCommercialCommission = void 0;
exports.getCommercialDashboard = getCommercialDashboard;
exports.createCommercialOrganization = createCommercialOrganization;
exports.getCommercialReferralInfo = getCommercialReferralInfo;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../db");
const commercialService_1 = require("../services/commercialService");
Object.defineProperty(exports, "recordCommercialCommission", { enumerable: true, get: function () { return commercialService_1.recordCommercialCommission; } });
async function getCommercialDashboard(req, res) {
    try {
        if (req.user?.role !== 'COMMERCIAL' || req.user.tenantId) {
            return res.status(403).json({ error: 'Accès réservé aux commerciaux plateforme (sans organisation).' });
        }
        const referralCode = await (0, commercialService_1.ensureCommercialReferralCode)(req.user.id);
        const commercialUser = await db_1.prisma.user.findUnique({
            where: { id: req.user.id },
            select: { commissionRate: true },
        });
        const commissionRate = (0, commercialService_1.normalizeCommissionRate)(commercialUser?.commissionRate);
        const [organizations, commissions] = await Promise.all([
            db_1.prisma.tenant.findMany({
                where: { referredByCommercialId: req.user.id },
                include: {
                    manager: { select: { name: true, email: true } },
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
        const { organizationName, managerName, managerEmail, managerPassword, managerPhone, plan } = req.body;
        if (!organizationName || !managerName || !managerEmail || !managerPassword) {
            return res.status(400).json({
                error: 'Nom de l\'organisation, nom, e-mail et mot de passe du manager sont requis.',
            });
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
    }
    catch (error) {
        console.error('createCommercialOrganization:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation.' });
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
            select: { commissionRate: true },
        });
        return res.json({
            referralCode,
            commissionRate: (0, commercialService_1.normalizeCommissionRate)(commercialUser?.commissionRate),
            description: '20% de la facture mensuelle générée par chaque organisation parrainée.',
        });
    }
    catch (error) {
        console.error('getCommercialReferralInfo:', error);
        return res.status(500).json({ error: 'Erreur interne.' });
    }
}

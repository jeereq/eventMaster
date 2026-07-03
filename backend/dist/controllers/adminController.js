"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSystemStats = getSystemStats;
exports.getTenantSubscriptionHistory = getTenantSubscriptionHistory;
exports.getAdminInvoices = getAdminInvoices;
exports.createTenant = createTenant;
exports.updateTenantPlanOrLicense = updateTenantPlanOrLicense;
exports.deleteTenant = deleteTenant;
exports.getAllUsers = getAllUsers;
exports.createUser = createUser;
exports.updateUserRoleOrStatus = updateUserRoleOrStatus;
exports.deleteUser = deleteUser;
exports.getAllTemplates = getAllTemplates;
exports.createGlobalTemplate = createGlobalTemplate;
exports.toggleTemplateLanding = toggleTemplateLanding;
exports.deleteTemplate = deleteTemplate;
exports.getAllEvents = getAllEvents;
exports.createAdminEvent = createAdminEvent;
exports.updateAdminEvent = updateAdminEvent;
exports.deleteAdminEvent = deleteAdminEvent;
exports.getAllGuests = getAllGuests;
exports.createAdminGuest = createAdminGuest;
exports.updateAdminGuest = updateAdminGuest;
exports.deleteAdminGuest = deleteAdminGuest;
exports.getAdminSettings = getAdminSettings;
exports.updateAdminSettings = updateAdminSettings;
const db_1 = require("../db");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const plansConfig_1 = require("../config/plansConfig");
const commercialService_1 = require("../services/commercialService");
const platformAccess_1 = require("../middleware/platformAccess");
const platformCommercialScope_1 = require("../services/platformCommercialScope");
const invoiceService_1 = require("../services/invoiceService");
const tenantBillingService_1 = require("../services/tenantBillingService");
const plansConfig_2 = require("../config/plansConfig");
// Get global system statistics and list of all tenants (Super Admin only)
async function getSystemStats(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const commercialId = (0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) ? req.user?.id : undefined;
        const tenantWhere = commercialId ? (0, platformCommercialScope_1.commercialReferredTenantFilter)(commercialId) : {};
        const [tenantCount, userCount, eventCount, guestCount] = await Promise.all([
            db_1.prisma.tenant.count({ where: tenantWhere }),
            commercialId
                ? db_1.prisma.user.count({ where: { tenant: tenantWhere } })
                : db_1.prisma.user.count(),
            commercialId
                ? db_1.prisma.event.count({ where: { tenant: tenantWhere } })
                : db_1.prisma.event.count(),
            commercialId
                ? db_1.prisma.guest.count({ where: { event: { tenant: tenantWhere } } })
                : db_1.prisma.guest.count(),
        ]);
        const tenants = await db_1.prisma.tenant.findMany({
            where: tenantWhere,
            include: {
                manager: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        events: true,
                        users: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json({
            stats: {
                tenants: tenantCount,
                users: userCount,
                events: eventCount,
                guests: guestCount,
            },
            tenants: tenants.map(t => ({
                id: t.id,
                name: t.name,
                plan: t.plan,
                licenseActive: t.licenseActive,
                licenseExpiresAt: t.licenseExpiresAt,
                licenseKey: t.licenseKey,
                createdAt: t.createdAt,
                managerName: t.manager?.name || 'Aucun',
                managerEmail: t.manager?.email || 'Aucun',
                eventsCount: t._count.events,
                usersCount: t._count.users,
            })),
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des stats admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des statistiques globales' });
    }
}
const SUBSCRIPTION_REQUEST_STATUS_LABELS = {
    PENDING: 'En attente',
    APPROVED: 'Approuvée',
    REJECTED: 'Rejetée',
};
async function getTenantSubscriptionHistory(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const tenantId = req.params.id;
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                plan: true,
                licenseActive: true,
                licenseExpiresAt: true,
                createdAt: true,
            },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Organisation non trouvée.' });
        }
        if ((0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) && req.user?.id) {
            const owns = await (0, platformCommercialScope_1.assertCommercialOwnsTenant)(req.user.id, tenantId);
            if (!owns) {
                return res.status(403).json({ error: 'Accès réservé aux organisations que vous avez parrainées.' });
            }
        }
        const [requests, invoices] = await Promise.all([
            db_1.prisma.subscriptionRequest.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                include: {
                    platformInvoice: {
                        select: {
                            id: true,
                            invoiceNumber: true,
                            plan: true,
                            amount: true,
                            currency: true,
                            status: true,
                            type: true,
                            billingPeriod: true,
                            periodStart: true,
                            periodEnd: true,
                            durationDays: true,
                            sentAt: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            db_1.prisma.platformInvoice.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        const requestEntries = requests.map((r) => ({
            id: r.id,
            kind: 'REQUEST',
            date: r.createdAt,
            plan: r.requestedPlan,
            durationDays: r.durationDays,
            status: r.status,
            statusLabel: SUBSCRIPTION_REQUEST_STATUS_LABELS[r.status] || r.status,
            proofOfPayment: r.proofOfPayment,
            processedAt: r.status !== 'PENDING' ? r.updatedAt : null,
            invoice: r.platformInvoice
                ? (0, invoiceService_1.formatInvoiceForApi)({ ...r.platformInvoice, tenant: { name: tenant.name } })
                : null,
        }));
        const linkedInvoiceIds = new Set(requests.map((r) => r.platformInvoice?.id).filter(Boolean));
        const invoiceEntries = invoices
            .filter((inv) => !linkedInvoiceIds.has(inv.id))
            .map((inv) => ({
            id: inv.id,
            kind: 'INVOICE',
            date: inv.createdAt,
            plan: inv.plan,
            durationDays: inv.durationDays,
            invoice: (0, invoiceService_1.formatInvoiceForApi)({ ...inv, tenant: { name: tenant.name } }),
        }));
        const history = [...requestEntries, ...invoiceEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return res.json({
            tenant,
            history,
            requestsCount: requests.length,
            invoicesCount: invoices.length,
        });
    }
    catch (error) {
        console.error('Erreur getTenantSubscriptionHistory:', error);
        return res.status(500).json({ error: 'Impossible de charger l\'historique des abonnements.' });
    }
}
async function getAdminInvoices(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const { period, tenantId } = req.query;
        const commercialId = (0, platformCommercialScope_1.isPlatformCommercial)(req.user?.role) ? req.user?.id : undefined;
        if (commercialId && typeof tenantId === 'string' && tenantId.trim()) {
            const owns = await (0, platformCommercialScope_1.assertCommercialOwnsTenant)(commercialId, tenantId.trim());
            if (!owns) {
                return res.status(403).json({ error: 'Accès réservé aux organisations que vous avez parrainées.' });
            }
        }
        const where = {};
        if (typeof period === 'string' && period.trim()) {
            where.billingPeriod = period.trim();
        }
        if (typeof tenantId === 'string' && tenantId.trim()) {
            where.tenantId = tenantId.trim();
        }
        else if (commercialId) {
            where.tenant = (0, platformCommercialScope_1.commercialReferredTenantFilter)(commercialId);
        }
        const invoices = await db_1.prisma.platformInvoice.findMany({
            where,
            include: {
                tenant: { select: { name: true } },
                commercialCommissions: {
                    include: {
                        commercial: { select: { name: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
        return res.json({
            invoices: invoices.map(invoiceService_1.formatInvoiceForApi),
        });
    }
    catch (error) {
        console.error('Erreur getAdminInvoices:', error);
        return res.status(500).json({ error: 'Impossible de charger les factures.' });
    }
}
// Create a new tenant (SaaS organization)
async function createTenant(req, res) {
    try {
        if (!(0, platformAccess_1.isPlatformStaff)(req.user?.role)) {
            return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
        }
        const { name, plan, licenseActive, licenseExpiresAt, licenseKey } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Le nom de l\'organisation est requis.' });
        }
        const newTenant = await db_1.prisma.tenant.create({
            data: {
                name,
                plan: plan || 'FREE',
                licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : true,
                licenseExpiresAt: licenseExpiresAt ? new Date(licenseExpiresAt) : null,
                licenseKey: licenseKey || null,
                referredByCommercialId: req.user?.role === 'COMMERCIAL' ? req.user.id : null,
            },
        });
        return res.status(201).json({ message: 'Organisation créée avec succès', tenant: newTenant });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'organisation:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'organisation' });
    }
}
// Update tenant plan and license details
async function updateTenantPlanOrLicense(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { name, plan, licenseActive, licenseExpiresAt, licenseKey, billing, } = req.body;
        const existing = await db_1.prisma.tenant.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Organisation introuvable.' });
        }
        const newPlan = plan ?? existing.plan;
        let nextExpiry = licenseExpiresAt !== undefined
            ? licenseExpiresAt
                ? new Date(licenseExpiresAt)
                : null
            : existing.licenseExpiresAt;
        const billingPayload = billing;
        const durationDays = billingPayload?.durationDays ? parseInt(String(billingPayload.durationDays), 10) : 30;
        if (billingPayload?.extendLicense && newPlan !== 'FREE' && plansConfig_2.PAID_PLAN_KEYS.includes(newPlan)) {
            nextExpiry = (0, tenantBillingService_1.computeExtendedExpiry)(existing.licenseExpiresAt, durationDays);
        }
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                plan: newPlan,
                licenseActive: licenseActive !== undefined ? Boolean(licenseActive) : undefined,
                licenseExpiresAt: licenseExpiresAt !== undefined ? nextExpiry : undefined,
                licenseKey: licenseKey !== undefined ? licenseKey : undefined,
                licenseExpiryWarningFor: billingPayload?.extendLicense || billingPayload?.issueInvoice ? null : undefined,
            },
        });
        let billingResult = null;
        if (billingPayload?.issueInvoice &&
            newPlan !== 'FREE' &&
            plansConfig_2.PAID_PLAN_KEYS.includes(newPlan)) {
            const parsedDiscount = billingPayload.discountPercent !== undefined && billingPayload.discountPercent !== null
                ? parseFloat(String(billingPayload.discountPercent))
                : undefined;
            const parsedApproved = billingPayload.approvedAmount !== undefined && billingPayload.approvedAmount !== null
                ? parseFloat(String(billingPayload.approvedAmount))
                : undefined;
            if (parsedDiscount !== undefined && (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
                return res.status(400).json({ error: 'La réduction doit être entre 0 et 100 %.' });
            }
            const action = (0, tenantBillingService_1.resolveBillingAction)(existing.plan, newPlan, billingPayload.action);
            const periodStart = new Date();
            const periodEnd = nextExpiry ??
                (() => {
                    const d = new Date(periodStart);
                    d.setDate(d.getDate() + durationDays);
                    return d;
                })();
            billingResult = await (0, tenantBillingService_1.issueTenantPlanInvoice)({
                tenantId: id,
                tenantName: updatedTenant.name,
                plan: newPlan,
                billing: {
                    action,
                    durationDays,
                    discountPercent: parsedDiscount,
                    approvedAmount: parsedApproved,
                    periodStart,
                    periodEnd,
                },
            });
        }
        const discountNote = billingResult?.pricing.discountAmount && billingResult.pricing.discountAmount > 0
            ? ` Réduction ${billingResult.pricing.discountPercent} % appliquée.`
            : '';
        const invoiceNote = billingResult?.invoice
            ? ` Facture ${billingResult.invoice.invoiceNumber} envoyée.${discountNote}`
            : '';
        const commercialNote = billingResult?.commercialNotified.length
            ? ` Commerciaux informés : ${billingResult.commercialNotified.join(', ')}.`
            : '';
        return res.json({
            message: `Organisation mise à jour.${invoiceNote}${commercialNote}`,
            tenant: updatedTenant,
            billing: billingResult
                ? {
                    action: billingPayload?.action ?? (0, tenantBillingService_1.resolveBillingAction)(existing.plan, newPlan),
                    pricing: billingResult.pricing,
                    invoice: billingResult.invoice
                        ? {
                            id: billingResult.invoice.id,
                            invoiceNumber: billingResult.invoice.invoiceNumber,
                            amount: billingResult.invoice.amount,
                        }
                        : null,
                    commercialNotified: billingResult.commercialNotified,
                }
                : null,
        });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du tenant:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'organisation' });
    }
}
// Delete tenant and all associated data
async function deleteTenant(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.tenant.delete({
            where: { id },
        });
        return res.json({ message: 'Tenant supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du tenant:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'organisation' });
    }
}
// Get all users across the platform
async function getAllUsers(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const users = await db_1.prisma.user.findMany({
            include: {
                tenant: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(users.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            tenantId: u.tenantId,
            isEmailVerified: u.isEmailVerified,
            tenantName: u.tenant?.name || 'Aucun (Super Admin)',
            createdAt: u.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
}
// Create a new user (Super Admin only)
async function createUser(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { name, email, password, role, isEmailVerified, tenantId } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'L\'adresse email et le mot de passe sont requis.' });
        }
        const existingUser = await db_1.prisma.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Un utilisateur avec cette adresse email existe déjà.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const resolvedRole = role || 'USER';
        const resolvedTenantId = resolvedRole === 'COMMERCIAL' ? null : (tenantId || null);
        const newUser = await db_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: resolvedRole,
                isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : false,
                tenantId: resolvedTenantId,
                commissionRate: resolvedRole === 'COMMERCIAL' ? (0, commercialService_1.normalizeCommissionRate)(0.2) : null,
            },
        });
        if (newUser.role === 'COMMERCIAL') {
            await (0, commercialService_1.ensureCommercialReferralCode)(newUser.id);
        }
        // If this is the manager of the tenant and tenant managerId is not set, we can set it
        if (resolvedTenantId && resolvedRole === 'USER') {
            const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenant && !tenant.managerId) {
                await db_1.prisma.tenant.update({
                    where: { id: tenantId },
                    data: { managerId: newUser.id },
                });
            }
        }
        return res.status(201).json({ message: 'Utilisateur créé avec succès', user: newUser });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
    }
}
// Update user details (Super Admin only)
async function updateUserRoleOrStatus(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { name, email, password, role, isEmailVerified, tenantId } = req.body;
        const updateData = {
            name: name !== undefined ? name : undefined,
            email: email !== undefined ? email : undefined,
            role: role,
            isEmailVerified: isEmailVerified !== undefined ? Boolean(isEmailVerified) : undefined,
        };
        if (role === 'COMMERCIAL') {
            updateData.tenantId = null;
            if (updateData.commissionRate === undefined) {
                updateData.commissionRate = (0, commercialService_1.normalizeCommissionRate)(0.2);
            }
        }
        else if (tenantId !== undefined) {
            updateData.tenantId = tenantId || null;
        }
        if (password) {
            updateData.passwordHash = await bcryptjs_1.default.hash(password, 10);
        }
        const updatedUser = await db_1.prisma.user.update({
            where: { id },
            data: updateData,
        });
        if (updatedUser.role === 'COMMERCIAL') {
            await (0, commercialService_1.ensureCommercialReferralCode)(updatedUser.id);
        }
        return res.json({ message: 'Utilisateur mis à jour avec succès', user: updatedUser });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'utilisateur' });
    }
}
// Delete user
async function deleteUser(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.user.delete({
            where: { id },
        });
        return res.json({ message: 'Utilisateur supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'utilisateur:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur' });
    }
}
// Get all templates across the platform
async function getAllTemplates(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const templates = await db_1.prisma.template.findMany({
            include: {
                tenant: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(templates.map(t => ({
            id: t.id,
            name: t.name,
            content: t.content,
            isGlobal: t.tenantId === null,
            showOnLanding: t.showOnLanding,
            tenantName: t.tenant?.name || 'Global (Tous)',
            createdAt: t.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles' });
    }
}
// Create a global template
async function createGlobalTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { name, content, showOnLanding } = req.body;
        if (!name || !content) {
            return res.status(400).json({ error: 'Le nom et le contenu du modèle sont requis.' });
        }
        const template = await db_1.prisma.template.create({
            data: {
                name,
                content,
                showOnLanding: showOnLanding !== undefined ? Boolean(showOnLanding) : false,
                tenantId: null, // Null means it is a global template
            },
        });
        return res.status(201).json({ message: 'Modèle global créé avec succès', template });
    }
    catch (error) {
        console.error('Erreur lors de la création du modèle global:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du modèle global' });
    }
}
// Toggle showOnLanding flag for a template
async function toggleTemplateLanding(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { showOnLanding } = req.body;
        const updatedTemplate = await db_1.prisma.template.update({
            where: { id },
            data: {
                showOnLanding: Boolean(showOnLanding),
            },
        });
        return res.json({ message: 'Visibilité sur la landing page mise à jour', template: updatedTemplate });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de la visibilité du modèle:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de la visibilité du modèle' });
    }
}
// Delete template
async function deleteTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.template.delete({
            where: { id },
        });
        return res.json({ message: 'Modèle supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du modèle:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du modèle' });
    }
}
// Get all events across all tenants (Super Admin only)
async function getAllEvents(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const events = await db_1.prisma.event.findMany({
            include: {
                tenant: {
                    select: {
                        name: true,
                    },
                },
                _count: {
                    select: {
                        guests: true,
                        invitations: true,
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
        return res.json(events.map(e => ({
            id: e.id,
            title: e.title,
            description: e.description,
            date: e.date,
            location: e.location,
            reminderFrequency: e.reminderFrequency,
            latitude: e.latitude,
            longitude: e.longitude,
            tenantId: e.tenantId,
            tenantName: e.tenant?.name || 'Inconnu',
            guestCount: e._count.guests,
            invitationCount: e._count.invitations,
            createdAt: e.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération de tous les événements:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de tous les événements' });
    }
}
// Create an event for any tenant (Super Admin only)
async function createAdminEvent(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { title, description, date, location, reminderFrequency, latitude, longitude, tenantId } = req.body;
        if (!title || !date || !location || !tenantId) {
            return res.status(400).json({ error: 'Les champs title, date, location et tenantId sont requis.' });
        }
        const event = await db_1.prisma.event.create({
            data: {
                tenantId,
                title,
                description,
                date: new Date(date),
                location,
                reminderFrequency: reminderFrequency || 'NONE',
                latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
                longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
            },
        });
        return res.status(201).json({ message: 'Événement créé avec succès par l\'administrateur', event });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'événement par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
    }
}
// Update any event (Super Admin only)
async function updateAdminEvent(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { title, description, date, location, reminderFrequency, latitude, longitude, tenantId } = req.body;
        const existingEvent = await db_1.prisma.event.findUnique({
            where: { id },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Événement non trouvé' });
        }
        const updatedEvent = await db_1.prisma.event.update({
            where: { id },
            data: {
                title: title !== undefined ? title : existingEvent.title,
                description: description !== undefined ? description : existingEvent.description,
                date: date !== undefined ? new Date(date) : existingEvent.date,
                location: location !== undefined ? location : existingEvent.location,
                reminderFrequency: reminderFrequency !== undefined ? reminderFrequency : existingEvent.reminderFrequency,
                latitude: latitude !== undefined ? (latitude !== null ? parseFloat(latitude) : null) : existingEvent.latitude,
                longitude: longitude !== undefined ? (longitude !== null ? parseFloat(longitude) : null) : existingEvent.longitude,
                tenantId: tenantId !== undefined ? tenantId : existingEvent.tenantId,
            },
        });
        return res.json({ message: 'Événement modifié avec succès', event: updatedEvent });
    }
    catch (error) {
        console.error('Erreur lors de la modification de l\'événement par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
    }
}
// Delete any event (Super Admin only)
async function deleteAdminEvent(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.event.delete({
            where: { id },
        });
        return res.json({ message: 'Événement supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'événement par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
    }
}
// === GUESTS MANAGEMENT (Super Admin only) ===
// Get all guests across all events
async function getAllGuests(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const guests = await db_1.prisma.guest.findMany({
            include: {
                event: {
                    select: {
                        title: true,
                        tenant: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return res.json(guests.map((g) => ({
            id: g.id,
            eventId: g.eventId,
            eventTitle: g.event?.title || 'Événement inconnu',
            tenantName: g.event?.tenant?.name || 'Organisation inconnue',
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email,
            category: g.category || 'Général',
            rsvp: g.rsvp,
            preferences: g.preferences,
            createdAt: g.createdAt,
        })));
    }
    catch (error) {
        console.error('Erreur lors de la récupération de tous les invités:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de tous les invités' });
    }
}
// Create a guest for any event
async function createAdminGuest(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { eventId, firstName, lastName, email, category, rsvp, preferences } = req.body;
        if (!eventId || !firstName || !lastName || !email) {
            return res.status(400).json({ error: 'Les champs eventId, firstName, lastName et email sont requis' });
        }
        // Check if guest already exists for this event
        const existingGuest = await db_1.prisma.guest.findUnique({
            where: { eventId_email: { eventId, email } },
        });
        if (existingGuest) {
            return res.status(400).json({ error: 'Un invité avec cet email existe déjà pour cet événement' });
        }
        const guest = await db_1.prisma.guest.create({
            data: {
                eventId,
                firstName,
                lastName,
                email,
                category: category || 'Général',
                rsvp: rsvp || 'PENDING',
                preferences: preferences || {},
            },
            include: {
                event: {
                    select: {
                        title: true,
                        tenant: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        return res.status(201).json({
            message: 'Invité créé avec succès',
            guest: {
                id: guest.id,
                eventId: guest.eventId,
                eventTitle: guest.event?.title || 'Événement inconnu',
                tenantName: guest.event?.tenant?.name || 'Organisation inconnue',
                firstName: guest.firstName,
                lastName: guest.lastName,
                email: guest.email,
                category: guest.category,
                rsvp: guest.rsvp,
                preferences: guest.preferences,
                createdAt: guest.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'invité par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'invité' });
    }
}
// Update any guest
async function updateAdminGuest(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { eventId, firstName, lastName, email, category, rsvp, preferences } = req.body;
        const existingGuest = await db_1.prisma.guest.findUnique({
            where: { id },
        });
        if (!existingGuest) {
            return res.status(404).json({ error: 'Invité non trouvé' });
        }
        const updatedGuest = await db_1.prisma.guest.update({
            where: { id },
            data: {
                eventId: eventId !== undefined ? eventId : existingGuest.eventId,
                firstName: firstName !== undefined ? firstName : existingGuest.firstName,
                lastName: lastName !== undefined ? lastName : existingGuest.lastName,
                email: email !== undefined ? email : existingGuest.email,
                category: category !== undefined ? category : existingGuest.category,
                rsvp: rsvp !== undefined ? rsvp : existingGuest.rsvp,
                preferences: preferences !== undefined ? preferences : existingGuest.preferences,
            },
            include: {
                event: {
                    select: {
                        title: true,
                        tenant: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        return res.json({
            message: 'Invité modifié avec succès',
            guest: {
                id: updatedGuest.id,
                eventId: updatedGuest.eventId,
                eventTitle: updatedGuest.event?.title || 'Événement inconnu',
                tenantName: updatedGuest.event?.tenant?.name || 'Organisation inconnue',
                firstName: updatedGuest.firstName,
                lastName: updatedGuest.lastName,
                email: updatedGuest.email,
                category: updatedGuest.category,
                rsvp: updatedGuest.rsvp,
                preferences: updatedGuest.preferences,
                createdAt: updatedGuest.createdAt,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la modification de l\'invité par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'invité' });
    }
}
// Delete any guest
async function deleteAdminGuest(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        await db_1.prisma.guest.delete({
            where: { id },
        });
        return res.json({ message: 'Invité supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'invité par l\'admin:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invité' });
    }
}
// === CONFIGURATION & SETTINGS (Super Admin only) ===
const settingsFilePath = path_1.default.join(__dirname, '..', 'config', 'settings.json');
// Ensure the directory exists
function ensureSettingsDir() {
    const dir = path_1.default.dirname(settingsFilePath);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
const defaultSettings = {
    platformName: "EventMaster",
    supportEmail: "mingandajeereq@gmail.com",
    maintenanceMode: false,
    allowRegistration: true,
    ultramsgInstanceId: process.env.ULTRAMSG_INSTANCE_ID || "",
    ultramsgToken: process.env.ULTRAMSG_TOKEN || "",
    sendgridApiKey: process.env.SENDGRID_API_KEY || "",
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
    twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
    plans: (0, plansConfig_1.getDefaultPlans)(),
};
async function getAdminSettings(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        ensureSettingsDir();
        if (fs_1.default.existsSync(settingsFilePath)) {
            const data = fs_1.default.readFileSync(settingsFilePath, 'utf-8');
            const settings = JSON.parse(data);
            return res.json({
                ...defaultSettings,
                ...settings,
                plans: (0, plansConfig_1.getPlansConfiguration)(),
            });
        }
        return res.json({ ...defaultSettings, plans: (0, plansConfig_1.getPlansConfiguration)() });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des paramètres' });
    }
}
async function updateAdminSettings(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const newSettings = req.body;
        ensureSettingsDir();
        let currentSettings = { ...defaultSettings };
        if (fs_1.default.existsSync(settingsFilePath)) {
            const data = fs_1.default.readFileSync(settingsFilePath, 'utf-8');
            currentSettings = { ...currentSettings, ...JSON.parse(data) };
        }
        const updatedSettings = {
            ...currentSettings,
            ...newSettings,
        };
        if (newSettings.plans) {
            updatedSettings.plans = (0, plansConfig_1.mergePlansForSave)(newSettings.plans);
        }
        fs_1.default.writeFileSync(settingsFilePath, JSON.stringify(updatedSettings, null, 2), 'utf-8');
        return res.json({ message: 'Paramètres mis à jour avec succès', settings: updatedSettings });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
    }
}

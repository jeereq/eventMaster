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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingStatus = getBillingStatus;
exports.getPlanFeatures = getPlanFeatures;
exports.getTenantInvoices = getTenantInvoices;
exports.createCheckoutSession = createCheckoutSession;
exports.handleStripeWebhook = handleStripeWebhook;
exports.mockUpgrade = mockUpgrade;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const permissionsService_1 = require("../services/permissionsService");
const commercialService_1 = require("../services/commercialService");
const invoiceService_1 = require("../services/invoiceService");
const planFeaturesService_1 = require("../services/planFeaturesService");
function getPlansFromSettings() {
    return (0, plansConfig_1.getPlansConfiguration)();
}
// Get current tenant billing plan, usage and quotas
async function getBillingStatus(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.assertCanViewBilling)(userId, tenantId))) {
            return res.status(403).json({ error: 'Seul le propriétaire peut consulter la facturation.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                _count: {
                    select: {
                        events: true,
                        templates: true,
                    },
                },
            },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant non trouvé' });
        }
        // Retrieve total guests count under this tenant
        const guestCount = await db_1.prisma.guest.count({
            where: {
                event: { tenantId },
            },
        });
        const roomCount = await db_1.prisma.organizationRoom.count({ where: { tenantId } });
        const orgManagerCount = await db_1.prisma.user.count({
            where: { tenantId, role: 'USER', orgRole: 'MANAGER' },
        });
        const limits = getPlansFromSettings();
        const currentLimits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
        const snapshot = await (0, planFeaturesService_1.getTenantPlanSnapshot)(tenantId);
        const planDetails = snapshot ? (0, planFeaturesService_1.formatPlanFeaturesResponse)(snapshot) : null;
        return res.json({
            plan: tenant.plan,
            usage: {
                events: tenant._count.events,
                guests: guestCount,
                templates: tenant._count.templates,
                rooms: roomCount,
                services: snapshot?.usage.services ?? 0,
                orgManagers: orgManagerCount + (tenant.managerId ? 1 : 0),
            },
            limits: {
                maxEvents: currentLimits.maxEvents,
                maxGuests: currentLimits.maxGuests,
                maxTemplates: currentLimits.maxTemplates,
                maxRooms: currentLimits.maxRooms,
                maxServices: currentLimits.maxServices,
                maxOrgManagers: currentLimits.maxOrgManagers,
                customTemplates: currentLimits.customTemplates,
            },
            capabilities: planDetails?.capabilities ?? {
                protocolQr: currentLimits.protocolQr,
                seatNotifications: currentLimits.seatNotifications,
                customTemplates: currentLimits.customTemplates,
                customRsvpFields: currentLimits.customRsvpFields,
                mockupOcr: currentLimits.mockupOcr,
                roomThemesFixtures: currentLimits.roomThemesFixtures,
                commercialNetwork: currentLimits.commercialNetwork,
                adminReports: currentLimits.adminReports,
                roomEditorLevel: currentLimits.roomEditorLevel,
                supportLevel: currentLimits.supportLevel,
                audience: currentLimits.audience,
            },
            planDetails,
            plans: limits,
            billingCycle: tenant.billingCycle === 'ANNUAL' ? 'annual' : 'monthly',
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du statut de facturation:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des infos de facturation' });
    }
}
async function getPlanFeatures(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const snapshot = await (0, planFeaturesService_1.getTenantPlanSnapshot)(tenantId);
        if (!snapshot) {
            return res.status(404).json({ error: 'Organisation introuvable.' });
        }
        return res.json((0, planFeaturesService_1.formatPlanFeaturesResponse)(snapshot));
    }
    catch (error) {
        console.error('Erreur getPlanFeatures:', error);
        return res.status(500).json({ error: 'Impossible de charger les fonctionnalités du forfait.' });
    }
}
async function getTenantInvoices(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        if (!(await (0, permissionsService_1.assertCanViewInvoices)(userId, tenantId))) {
            return res.status(403).json({ error: 'Accès réservé au propriétaire et aux managers.' });
        }
        const invoices = await db_1.prisma.platformInvoice.findMany({
            where: { tenantId },
            include: {
                commercialCommissions: {
                    include: {
                        commercial: { select: { name: true, email: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            invoices: invoices.map(invoiceService_1.formatInvoiceForApi),
        });
    }
    catch (error) {
        console.error('Erreur getTenantInvoices:', error);
        return res.status(500).json({ error: 'Impossible de charger les factures.' });
    }
}
async function createCheckoutSession(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const { planType } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.assertCanViewBilling)(userId, tenantId))) {
            return res.status(403).json({ error: 'Seul le propriétaire peut gérer la facturation.' });
        }
        if (!planType || !plansConfig_1.PAID_PLAN_KEYS.includes(planType)) {
            return res.status(400).json({ error: 'Type de forfait invalide' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant non trouvé' });
        }
        if (!(0, plansConfig_1.isPlanAllowedForAccountKind)(planType, tenant.accountKind)) {
            return res.status(403).json({ error: (0, plansConfig_1.planAudienceMismatchMessage)(planType, tenant.accountKind) });
        }
        // Mock upgrade local (dev) — forfaits réels : demande manuelle ou FlexPay.
        if (req.body.mock === true) {
            // Direct mock upgrade for local dev convenience - also activate and extend license
            const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(planType);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + durationDays);
            const updatedTenant = await db_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    plan: planType,
                    licenseActive: true,
                    licenseExpiresAt: expiryDate,
                    licenseExpiryWarningFor: null,
                },
            });
            const periodStart = new Date();
            const invoice = await (0, invoiceService_1.createAndSendInvoice)({
                tenantId,
                plan: planType,
                type: 'PAYMENT',
                periodStart,
                periodEnd: expiryDate,
                durationDays,
                includeManagers: true,
                status: 'PAID',
            });
            await (0, commercialService_1.recordCommercialCommission)({
                tenantId,
                plan: planType,
                source: 'MOCK_CHECKOUT',
                invoiceAmount: invoice?.amount,
                platformInvoiceId: invoice?.id,
            });
            return res.json({
                message: 'Mise à niveau fictive réussie (Mode Développement)',
                tenant: {
                    id: updatedTenant.id,
                    name: updatedTenant.name,
                    plan: updatedTenant.plan,
                    licenseActive: updatedTenant.licenseActive,
                    licenseExpiresAt: updatedTenant.licenseExpiresAt,
                },
                mock: true,
            });
        }
        // Stripe n’est plus utilisé pour les forfaits : demande manuelle ou FlexPay.
        const { getSaasPaymentMode } = await Promise.resolve().then(() => __importStar(require('../services/platformSettingsService')));
        const mode = getSaasPaymentMode();
        return res.status(400).json({
            error: mode === 'flexpay'
                ? 'Utilisez POST /api/subscriptions/checkout pour payer le forfait via FlexPay (Visa ou Mobile Money).'
                : 'Utilisez POST /api/subscriptions/request pour soumettre une demande d’abonnement manuelle.',
            saasPaymentMode: mode,
        });
    }
    catch (error) {
        console.error('Erreur checkout billing:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
    }
}
// Ancien webhook Stripe — désactivé (paiements via FlexPay uniquement)
async function handleStripeWebhook(req, res) {
    console.warn('[Billing] Webhook Stripe reçu mais ignoré (FlexPay uniquement).');
    return res.json({ received: true, ignored: true, reason: 'stripe_disabled' });
}
// Simple direct mock upgrade for development (used by the frontend)
async function mockUpgrade(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const { plan } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.assertCanViewBilling)(userId, tenantId))) {
            return res.status(403).json({ error: 'Seul le propriétaire peut modifier le forfait.' });
        }
        if (!plan || !plansConfig_1.PLAN_KEYS.includes(plan)) {
            return res.status(400).json({ error: 'Plan invalide' });
        }
        const currentTenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { accountKind: true },
        });
        if (plan !== 'FREE' && currentTenant && !(0, plansConfig_1.isPlanAllowedForAccountKind)(plan, currentTenant.accountKind)) {
            return res.status(403).json({ error: (0, plansConfig_1.planAudienceMismatchMessage)(plan, currentTenant.accountKind) });
        }
        const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(plan);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + durationDays);
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan,
                licenseActive: true,
                licenseExpiresAt: plan === 'FREE' ? null : expiryDate,
                licenseExpiryWarningFor: null,
            },
        });
        if (plan !== 'FREE') {
            const periodStart = new Date();
            const invoice = await (0, invoiceService_1.createAndSendInvoice)({
                tenantId,
                plan,
                type: 'PAYMENT',
                periodStart,
                periodEnd: expiryDate,
                durationDays,
                includeManagers: true,
                status: 'PAID',
            });
            await (0, commercialService_1.recordCommercialCommission)({
                tenantId,
                plan,
                source: 'MOCK_UPGRADE',
                invoiceAmount: invoice?.amount,
                platformInvoiceId: invoice?.id,
            });
        }
        return res.json({
            message: `Forfait modifié en ${plan} (Mode de simulation de paiement)`,
            tenant: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                plan: updatedTenant.plan,
                licenseActive: updatedTenant.licenseActive,
                licenseExpiresAt: updatedTenant.licenseExpiresAt,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la modification du forfait:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification du forfait' });
    }
}

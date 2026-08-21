"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingStatus = getBillingStatus;
exports.getPlanFeatures = getPlanFeatures;
exports.getTenantInvoices = getTenantInvoices;
exports.createCheckoutSession = createCheckoutSession;
exports.handleStripeWebhook = handleStripeWebhook;
exports.mockUpgrade = mockUpgrade;
const db_1 = require("../db");
const stripe_1 = __importDefault(require("stripe"));
const plansConfig_1 = require("../config/plansConfig");
const permissionsService_1 = require("../services/permissionsService");
const commercialService_1 = require("../services/commercialService");
const invoiceService_1 = require("../services/invoiceService");
const planFeaturesService_1 = require("../services/planFeaturesService");
const ticketOrderService_1 = require("../services/ticketOrderService");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-13', // standard latest api version
});
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
        // If Stripe is mock mode or we want to support easy upgrades:
        if (STRIPE_SECRET_KEY === 'sk_test_mock' || req.body.mock === true) {
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
        // Real Stripe Integration
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
        // Define Stripe prices (mock IDs or from config)
        const priceId = planType.startsWith('ENTERPRISE') ? 'price_enterprise_id' : 'price_premium_id';
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${FRONTEND_URL}/dashboard/billing?success=true`,
            cancel_url: `${FRONTEND_URL}/dashboard/billing?canceled=true`,
            client_reference_id: tenantId,
            customer_email: req.user?.id ? (await db_1.prisma.user.findUnique({ where: { id: req.user.id } }))?.email : undefined,
        });
        return res.json({ id: session.id, url: session.url });
    }
    catch (error) {
        console.error('Erreur Stripe Checkout:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement Stripe' });
    }
}
// Stripe Webhook handler to sync subscriptions status
async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
    let event;
    try {
        if (!sig) {
            return res.status(400).send('Signature Stripe manquante');
        }
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    }
    catch (err) {
        console.error('Erreur signature webhook Stripe:', err.message);
        return res.status(400).send(`Erreur de webhook: ${err.message}`);
    }
    try {
        // Handle events
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.metadata?.purpose === 'event_ticket' && session.metadata.orderId) {
                    await (0, ticketOrderService_1.fulfillTicketOrder)(session.metadata.orderId, {
                        id: session.id,
                        payment_intent: typeof session.payment_intent === 'string'
                            ? session.payment_intent
                            : session.payment_intent?.id,
                    });
                    console.log(`[Stripe Webhook] Billet payé commande ${session.metadata.orderId}`);
                    break;
                }
                const tenantId = session.client_reference_id;
                if (tenantId) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days of active license
                    // Check what item they subscribed to, or default to PREMIUM_2 for simplicity
                    await db_1.prisma.tenant.update({
                        where: { id: tenantId },
                        data: {
                            plan: 'PREMIUM_2',
                            stripeCustId: session.customer,
                            licenseActive: true,
                            licenseExpiresAt: expiryDate,
                            licenseExpiryWarningFor: null,
                        },
                    });
                    const periodStart = new Date();
                    const invoice = await (0, invoiceService_1.createAndSendInvoice)({
                        tenantId,
                        plan: 'PREMIUM_2',
                        type: 'PAYMENT',
                        periodStart,
                        periodEnd: expiryDate,
                        durationDays: 30,
                        includeManagers: true,
                        status: 'PAID',
                    });
                    const commissionRecords = await (0, commercialService_1.recordCommercialCommission)({
                        tenantId,
                        plan: 'PREMIUM_2',
                        source: 'STRIPE_WEBHOOK',
                        invoiceAmount: invoice?.amount,
                        platformInvoiceId: invoice?.id,
                    });
                    const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
                    if (tenant && invoice) {
                        await (0, commercialService_1.notifyCommercialsOnSubscriptionApproval)({
                            tenantId,
                            tenantName: tenant.name,
                            plan: 'PREMIUM_2',
                            durationDays: 30,
                            baseAmount: invoice.amount,
                            finalAmount: invoice.amount,
                            discountPercent: 0,
                            discountAmount: 0,
                            invoiceNumber: invoice.invoiceNumber,
                            event: 'ADMIN_ACTIVATION',
                            commissionsByUserId: Object.fromEntries(commissionRecords.map((r) => [r.commercialId, r.commissionAmount])),
                        });
                    }
                    console.log(`[Stripe Webhook] Tenant ${tenantId} upgraded to PREMIUM_2 and license extended`);
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const tenant = await db_1.prisma.tenant.findFirst({
                    where: { stripeCustId: subscription.customer },
                });
                if (tenant) {
                    await db_1.prisma.tenant.update({
                        where: { id: tenant.id },
                        data: {
                            plan: 'FREE',
                            licenseActive: false, // Deactivate license upon subscription cancelation
                        },
                    });
                    console.log(`[Stripe Webhook] Tenant ${tenant.id} downgraded to FREE and license deactivated due to cancelation`);
                }
                break;
            }
            default:
                console.log(`[Stripe Webhook] Event non traité: ${event.type}`);
        }
        return res.json({ received: true });
    }
    catch (error) {
        console.error('Erreur lors du traitement du webhook Stripe:', error);
        return res.status(500).json({ error: 'Erreur interne du webhook' });
    }
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

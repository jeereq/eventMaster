"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBillingStatus = getBillingStatus;
exports.createCheckoutSession = createCheckoutSession;
exports.handleStripeWebhook = handleStripeWebhook;
exports.mockUpgrade = mockUpgrade;
const db_1 = require("../db");
const stripe_1 = __importDefault(require("stripe"));
const plansConfig_1 = require("../config/plansConfig");
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
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
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
        const limits = getPlansFromSettings();
        const currentLimits = (0, plansConfig_1.getPlanLimits)(tenant.plan);
        return res.json({
            plan: tenant.plan,
            usage: {
                events: tenant._count.events,
                guests: guestCount,
                templates: tenant._count.templates,
            },
            limits: {
                maxEvents: currentLimits.maxEvents,
                maxGuests: currentLimits.maxGuests,
                maxTemplates: currentLimits.maxTemplates,
                customTemplates: currentLimits.customTemplates,
            },
            plans: limits,
        });
    }
    catch (error) {
        console.error('Erreur lors de la récupération du statut de facturation:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des infos de facturation' });
    }
}
// Create a Stripe Checkout Session for subscription
async function createCheckoutSession(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const { planType } = req.body; // Expects 'PREMIUM' or 'ENTERPRISE'
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!planType || !['STANDARD', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
            return res.status(400).json({ error: 'Type de forfait invalide' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
        });
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant non trouvé' });
        }
        // If Stripe is mock mode or we want to support easy upgrades:
        if (STRIPE_SECRET_KEY === 'sk_test_mock' || req.body.mock === true) {
            // Direct mock upgrade for local dev convenience - also activate and extend license
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30); // Extend by 30 days
            const updatedTenant = await db_1.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    plan: planType,
                    licenseActive: true,
                    licenseExpiresAt: expiryDate,
                },
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
        const priceId = planType === 'PREMIUM' ? 'price_premium_id' : 'price_enterprise_id';
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
                const tenantId = session.client_reference_id;
                if (tenantId) {
                    const expiryDate = new Date();
                    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days of active license
                    // Check what item they subscribed to, or default to PREMIUM for simplicity
                    await db_1.prisma.tenant.update({
                        where: { id: tenantId },
                        data: {
                            plan: 'PREMIUM',
                            stripeCustId: session.customer,
                            licenseActive: true,
                            licenseExpiresAt: expiryDate,
                        },
                    });
                    console.log(`[Stripe Webhook] Tenant ${tenantId} upgraded to PREMIUM and license extended`);
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
        const { plan } = req.body; // FREE, PREMIUM, ENTERPRISE
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!plan || !['FREE', 'STANDARD', 'PREMIUM', 'ENTERPRISE'].includes(plan)) {
            return res.status(400).json({ error: 'Plan invalide' });
        }
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30); // 30 days extension
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan,
                licenseActive: true,
                licenseExpiresAt: plan === 'FREE' ? null : expiryDate, // Free plan has no expiry by default
            },
        });
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

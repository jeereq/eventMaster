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
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new stripe_1.default(STRIPE_SECRET_KEY, {
    apiVersion: '2025-11-13', // standard latest api version
});
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
        // Plan limits definition
        const limits = {
            FREE: {
                maxEvents: 3,
                maxGuests: 50,
                maxTemplates: 2,
                customTemplates: false,
            },
            STANDARD: {
                maxEvents: 8,
                maxGuests: 150,
                maxTemplates: 5,
                customTemplates: false,
            },
            PREMIUM: {
                maxEvents: 20,
                maxGuests: 500,
                maxTemplates: 10,
                customTemplates: true,
            },
            ENTERPRISE: {
                maxEvents: 9999,
                maxGuests: 99999,
                maxTemplates: 9999,
                customTemplates: true,
            },
        };
        const currentLimits = limits[tenant.plan] || limits.FREE;
        return res.json({
            plan: tenant.plan,
            usage: {
                events: tenant._count.events,
                guests: guestCount,
                templates: tenant._count.templates,
            },
            limits: currentLimits,
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
            // Direct mock upgrade for local dev convenience
            const updatedTenant = await db_1.prisma.tenant.update({
                where: { id: tenantId },
                data: { plan: planType },
            });
            return res.json({
                message: 'Mise à niveau fictive réussie (Mode Développement)',
                tenant: {
                    id: updatedTenant.id,
                    name: updatedTenant.name,
                    plan: updatedTenant.plan,
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
                    // Check what item they subscribed to, or default to PREMIUM for simplicity
                    await db_1.prisma.tenant.update({
                        where: { id: tenantId },
                        data: {
                            plan: 'PREMIUM',
                            stripeCustId: session.customer,
                        },
                    });
                    console.log(`[Stripe Webhook] Tenant ${tenantId} upgraded to PREMIUM`);
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
                        data: { plan: 'FREE' },
                    });
                    console.log(`[Stripe Webhook] Tenant ${tenant.id} downgraded to FREE due to cancelation`);
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
        const updatedTenant = await db_1.prisma.tenant.update({
            where: { id: tenantId },
            data: { plan },
        });
        return res.json({
            message: `Forfait modifié en ${plan} (Mode de simulation de paiement)`,
            tenant: {
                id: updatedTenant.id,
                name: updatedTenant.name,
                plan: updatedTenant.plan,
            },
        });
    }
    catch (error) {
        console.error('Erreur lors de la modification du forfait:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification du forfait' });
    }
}

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-13' as any, // standard latest api version
});

// Get current tenant billing plan, usage and quotas
export async function getBillingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const tenant = await prisma.tenant.findUnique({
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
    const guestCount = await prisma.guest.count({
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

    const currentLimits = limits[tenant.plan as keyof typeof limits] || limits.FREE;

    return res.json({
      plan: tenant.plan,
      usage: {
        events: tenant._count.events,
        guests: guestCount,
        templates: tenant._count.templates,
      },
      limits: currentLimits,
    });
  } catch (error: any) {
    console.error('Erreur lors de la récupération du statut de facturation:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des infos de facturation' });
  }
}

// Create a Stripe Checkout Session for subscription
export async function createCheckoutSession(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const { planType } = req.body; // Expects 'PREMIUM' or 'ENTERPRISE'

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!planType || !['STANDARD', 'PREMIUM', 'ENTERPRISE'].includes(planType)) {
      return res.status(400).json({ error: 'Type de forfait invalide' });
    }

    const tenant = await prisma.tenant.findUnique({
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

      const updatedTenant = await prisma.tenant.update({
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
      customer_email: req.user?.id ? (await prisma.user.findUnique({ where: { id: req.user.id } }))?.email : undefined,
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Erreur Stripe Checkout:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement Stripe' });
  }
}

// Stripe Webhook handler to sync subscriptions status
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

  let event: Stripe.Event;

  try {
    if (!sig) {
      return res.status(400).send('Signature Stripe manquante');
    }
    
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Erreur signature webhook Stripe:', err.message);
    return res.status(400).send(`Erreur de webhook: ${err.message}`);
  }

  try {
    // Handle events
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.client_reference_id;
        
        if (tenantId) {
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + 30); // 30 days of active license

          // Check what item they subscribed to, or default to PREMIUM for simplicity
          await prisma.tenant.update({
            where: { id: tenantId },
            data: {
              plan: 'PREMIUM',
              stripeCustId: session.customer as string,
              licenseActive: true,
              licenseExpiresAt: expiryDate,
            },
          });
          console.log(`[Stripe Webhook] Tenant ${tenantId} upgraded to PREMIUM and license extended`);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await prisma.tenant.findFirst({
          where: { stripeCustId: subscription.customer as string },
        });

        if (tenant) {
          await prisma.tenant.update({
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
  } catch (error: any) {
    console.error('Erreur lors du traitement du webhook Stripe:', error);
    return res.status(500).json({ error: 'Erreur interne du webhook' });
  }
}

// Simple direct mock upgrade for development (used by the frontend)
export async function mockUpgrade(req: AuthenticatedRequest, res: Response) {
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

    const updatedTenant = await prisma.tenant.update({
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
  } catch (error: any) {
    console.error('Erreur lors de la modification du forfait:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du forfait' });
  }
}

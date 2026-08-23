import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimitsForTenant, getPlansConfiguration, PAID_PLAN_KEYS, PLAN_KEYS, isPlanAllowedForAccountKind, planAudienceMismatchMessage, resolveDurationDaysForPlan } from '../config/plansConfig';
import { assertCanViewBilling, assertCanViewInvoices } from '../services/permissionsService';
import { notifyCommercialsOnSubscriptionApproval, recordCommercialCommission } from '../services/commercialService';
import { createAndSendInvoice, formatInvoiceForApi } from '../services/invoiceService';
import {
  formatPlanFeaturesResponse,
  getTenantPlanSnapshot,
} from '../services/planFeaturesService';
import { isOnlinePaymentsEnabled } from '../services/platformSettingsService';

function getPlansFromSettings() {
  return getPlansConfiguration();
}

// Get current tenant billing plan, usage and quotas
export async function getBillingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await assertCanViewBilling(userId, tenantId))) {
      return res.status(403).json({ error: 'Seul le propriétaire peut consulter la facturation.' });
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

    const roomCount = await prisma.organizationRoom.count({ where: { tenantId } });
    const orgManagerCount = await prisma.user.count({
      where: { tenantId, role: 'USER', orgRole: 'MANAGER' },
    });

    const limits = getPlansFromSettings();
    const currentLimits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
    const snapshot = await getTenantPlanSnapshot(tenantId);
    const planDetails = snapshot ? formatPlanFeaturesResponse(snapshot) : null;

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
  } catch (error: any) {
    console.error('Erreur lors de la récupération du statut de facturation:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des infos de facturation' });
  }
}

export async function getPlanFeatures(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const snapshot = await getTenantPlanSnapshot(tenantId);
    if (!snapshot) {
      return res.status(404).json({ error: 'Organisation introuvable.' });
    }

    return res.json(formatPlanFeaturesResponse(snapshot));
  } catch (error: any) {
    console.error('Erreur getPlanFeatures:', error);
    return res.status(500).json({ error: 'Impossible de charger les fonctionnalités du forfait.' });
  }
}

export async function getTenantInvoices(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    if (!(await assertCanViewInvoices(userId, tenantId))) {
      return res.status(403).json({ error: 'Accès réservé au propriétaire et aux managers.' });
    }

    const invoices = await prisma.platformInvoice.findMany({
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
      invoices: invoices.map(formatInvoiceForApi),
    });
  } catch (error: any) {
    console.error('Erreur getTenantInvoices:', error);
    return res.status(500).json({ error: 'Impossible de charger les factures.' });
  }
}

export async function createCheckoutSession(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { planType } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await assertCanViewBilling(userId, tenantId))) {
      return res.status(403).json({ error: 'Seul le propriétaire peut gérer la facturation.' });
    }

    if (!planType || !PAID_PLAN_KEYS.includes(planType)) {
      return res.status(400).json({ error: 'Type de forfait invalide' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant non trouvé' });
    }

    if (!isPlanAllowedForAccountKind(planType, tenant.accountKind)) {
      return res.status(403).json({ error: planAudienceMismatchMessage(planType, tenant.accountKind) });
    }

    // Mock upgrade local (dev) — forfaits réels : demande manuelle ou FlexPay.
    if (req.body.mock === true) {
      // Direct mock upgrade for local dev convenience - also activate and extend license
      const durationDays = resolveDurationDaysForPlan(planType);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      const updatedTenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { 
          plan: planType,
          licenseActive: true,
          licenseExpiresAt: expiryDate,
          licenseExpiryWarningFor: null,
        },
      });

      const periodStart = new Date();
      const invoice = await createAndSendInvoice({
        tenantId,
        plan: planType,
        type: 'PAYMENT',
        periodStart,
        periodEnd: expiryDate,
        durationDays,
        includeManagers: true,
        status: 'PAID',
      });

      await recordCommercialCommission({
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
    const { getSaasPaymentMode } = await import('../services/platformSettingsService');
    const mode = getSaasPaymentMode();
    return res.status(400).json({
      error:
        mode === 'flexpay'
          ? 'Utilisez POST /api/subscriptions/checkout pour payer le forfait via FlexPay (Visa ou Mobile Money).'
          : 'Utilisez POST /api/subscriptions/request pour soumettre une demande d’abonnement manuelle.',
      saasPaymentMode: mode,
    });
  } catch (error: any) {
    console.error('Erreur checkout billing:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de la session de paiement' });
  }
}

// Ancien webhook Stripe — désactivé (paiements via FlexPay uniquement)
export async function handleStripeWebhook(req: Request, res: Response) {
  console.warn('[Billing] Webhook Stripe reçu mais ignoré (FlexPay uniquement).');
  return res.json({ received: true, ignored: true, reason: 'stripe_disabled' });
}

// Simple direct mock upgrade for development (used by the frontend)
export async function mockUpgrade(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { plan } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await assertCanViewBilling(userId, tenantId))) {
      return res.status(403).json({ error: 'Seul le propriétaire peut modifier le forfait.' });
    }

    if (!plan || !PLAN_KEYS.includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide' });
    }

    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountKind: true },
    });
    if (plan !== 'FREE' && currentTenant && !isPlanAllowedForAccountKind(plan, currentTenant.accountKind)) {
      return res.status(403).json({ error: planAudienceMismatchMessage(plan, currentTenant.accountKind) });
    }

    const durationDays = resolveDurationDaysForPlan(plan);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const updatedTenant = await prisma.tenant.update({
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
      const invoice = await createAndSendInvoice({
        tenantId,
        plan,
        type: 'PAYMENT',
        periodStart,
        periodEnd: expiryDate,
        durationDays,
        includeManagers: true,
        status: 'PAID',
      });

      await recordCommercialCommission({
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
  } catch (error: any) {
    console.error('Erreur lors de la modification du forfait:', error);
    return res.status(500).json({ error: 'Erreur lors de la modification du forfait' });
  }
}

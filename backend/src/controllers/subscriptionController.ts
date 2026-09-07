import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { PlanType } from '@prisma/client';
import { isPlatformStaff } from '../middleware/platformAccess';
import {
  assertCommercialOwnsTenant,
  commercialReferredTenantFilter,
  isPlatformCommercial,
} from '../services/platformCommercialScope';
import { getPlansConfiguration, PAID_PLAN_KEYS, isPlanAllowedForAccountKind, planAudienceMismatchMessage, resolveDurationDaysForPlan, resolveDefaultSubscriptionDiscountOptions, billingCycleFromDurationDays } from '../config/plansConfig';
import { issueTenantPlanInvoice, computeExtendedExpiry } from '../services/tenantBillingService';
import { computeApprovedAmount, getPlanAmount } from '../services/invoiceService';
import { auditReq } from '../services/adminAuditService';
import { notifyPlatformStaff } from '../services/platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import {
  getSaasPaymentMode,
  getSubscriptionDiscountAccess,
  isOnlinePaymentsEnabled,
} from '../services/platformSettingsService';
import { resolveSubscriptionDiscountAccess } from '../services/subscriptionDiscountAccess';
import {
  activateSubscriptionRequest,
  computeSubscriptionCheckoutAmount,
} from '../services/subscriptionActivationService';
import { initiateFlexPaySessionForRequest } from '../services/subscriptionFlexPayCheckoutService';
import {
  approveDiscountQuote,
  computeCatalogBaseAmount,
  notifyDiscountRequestSubmitted,
  statusAfterFailedQuotedPayment,
} from '../services/subscriptionDiscountQuoteService';
import {
  checkFlexPayCardOrder,
  buildFlexPayMetadataUpdate,
  isFlexPayCardConfigured,
} from '../services/flexPayCardService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// 1. Submit a subscription request (Tenant)
export async function submitSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const { requestedPlan, durationDays, proofOfPayment } = req.body;

    if (!requestedPlan || !PAID_PLAN_KEYS.includes(requestedPlan)) {
      return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountKind: true },
    });
    if (!tenant || !isPlanAllowedForAccountKind(requestedPlan, tenant.accountKind)) {
      return res.status(403).json({
        error: planAudienceMismatchMessage(requestedPlan, tenant?.accountKind),
      });
    }

    const days = resolveDurationDaysForPlan(
      requestedPlan,
      durationDays != null ? parseInt(String(durationDays), 10) : null,
    );
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'La durée demandée est invalide.' });
    }

    // Create subscription request
    const request = await prisma.subscriptionRequest.create({
      data: {
        tenantId,
        requestedPlan: requestedPlan as PlanType,
        durationDays: days,
        proofOfPayment: proofOfPayment || null,
        status: 'PENDING',
      },
    });

    const org = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    void notifyPlatformStaff({
      type: PLATFORM_NOTIFICATION_TYPE.SUBSCRIPTION_REQUEST_PENDING,
      title: `Demande d’abonnement — ${org?.name || 'Organisation'}`,
      message: `Forfait ${requestedPlan} · ${days} jours. À traiter dans Demandes d’abonnement.`,
      metadata: {
        tenantId,
        requestedPlan,
        requestId: request.id,
        href: `${FRONTEND_URL}/dashboard?tab=subscription-requests`,
      },
      includeCommercials: true,
    });

    return res.status(201).json({
      message: 'Votre demande d\'abonnement a été soumise avec succès au Super Admin !',
      request,
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission de la demande d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la soumission de la demande.' });
  }
}

export async function submitDiscountRequest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const discountGate = resolveSubscriptionDiscountAccess(tenantId, getSubscriptionDiscountAccess());
    if (!discountGate.allowed) {
      return res.status(403).json({ error: discountGate.reason });
    }

    const { requestedPlan, durationDays, requestedDiscountPercent, requestedAmount, note } = req.body || {};
    if (!requestedPlan || !PAID_PLAN_KEYS.includes(requestedPlan)) {
      return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountKind: true, name: true },
    });
    if (!tenant || !isPlanAllowedForAccountKind(requestedPlan, tenant.accountKind)) {
      return res.status(403).json({
        error: planAudienceMismatchMessage(requestedPlan, tenant?.accountKind),
      });
    }

    const days = resolveDurationDaysForPlan(
      requestedPlan,
      durationDays != null ? parseInt(String(durationDays), 10) : null,
    );
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'La durée demandée est invalide.' });
    }

    const parsedPercent =
      requestedDiscountPercent !== undefined && requestedDiscountPercent !== null && requestedDiscountPercent !== ''
        ? parseFloat(String(requestedDiscountPercent))
        : undefined;
    const parsedAmount =
      requestedAmount !== undefined && requestedAmount !== null && requestedAmount !== ''
        ? parseFloat(String(requestedAmount))
        : undefined;

    if (parsedPercent !== undefined && (isNaN(parsedPercent) || parsedPercent < 1 || parsedPercent > 80)) {
      return res.status(400).json({ error: 'Le rabais demandé doit être compris entre 1 et 80 %.' });
    }
    if (parsedAmount !== undefined && (isNaN(parsedAmount) || parsedAmount < 0)) {
      return res.status(400).json({ error: 'Le montant souhaité est invalide.' });
    }
    if (parsedPercent === undefined && parsedAmount === undefined) {
      return res.status(400).json({ error: 'Indiquez un pourcentage de rabais ou un montant souhaité.' });
    }

    const noteText = String(note || '').trim();
    if (noteText.length < 8) {
      return res.status(400).json({ error: 'Expliquez brièvement le motif de votre demande de rabais (8 caractères min.).' });
    }

    const existing = await prisma.subscriptionRequest.findFirst({
      where: { tenantId, requestKind: 'discount', status: { in: ['PENDING', 'QUOTED'] } },
      select: { id: true, status: true },
    });
    if (existing) {
      return res.status(409).json({
        error:
          existing.status === 'QUOTED'
            ? 'Un devis de rabais est déjà en attente de paiement. Ouvrez votre historique pour payer.'
            : 'Une demande de rabais est déjà en cours d’examen.',
        requestId: existing.id,
      });
    }

    const baseAmount = computeCatalogBaseAmount(requestedPlan, days);
    const request = await prisma.subscriptionRequest.create({
      data: {
        tenantId,
        requestedPlan: requestedPlan as PlanType,
        durationDays: days,
        status: 'PENDING',
        requestKind: 'discount',
        discountRequestNote: noteText.slice(0, 800),
        requestedDiscountPercent: parsedPercent ?? null,
        requestedAmount: parsedAmount ?? null,
        baseAmount,
      },
    });

    void notifyDiscountRequestSubmitted({
      tenantId,
      tenantName: tenant.name,
      requestId: request.id,
      requestedPlan,
      durationDays: days,
      requestedDiscountPercent: parsedPercent ?? null,
      requestedAmount: parsedAmount ?? null,
    });

    return res.status(201).json({
      message: 'Votre demande de rabais a été envoyée. Le Superadmin ou le commercial global la validera, puis vous recevrez un lien de paiement.',
      request,
    });
  } catch (error: any) {
    console.error('Erreur demande de rabais:', error);
    return res.status(500).json({ error: 'Impossible de soumettre la demande de rabais.' });
  }
}

export async function quoteSubscriptionDiscount(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const requestId = req.params.id as string;
    const { discountPercent, approvedAmount } = req.body ?? {};
    const parsedDiscount =
      discountPercent !== undefined && discountPercent !== null && discountPercent !== ''
        ? parseFloat(String(discountPercent))
        : undefined;
    const parsedApproved =
      approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
        ? parseFloat(String(approvedAmount))
        : undefined;

    if (parsedDiscount !== undefined && (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
      return res.status(400).json({ error: 'La réduction doit être entre 0 et 100 %.' });
    }
    if (parsedApproved !== undefined && (isNaN(parsedApproved) || parsedApproved < 0)) {
      return res.status(400).json({ error: 'Le montant approuvé est invalide.' });
    }

    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      select: { tenantId: true },
    });
    if (!request) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
    }
    if (isPlatformCommercial(req.user?.role) && req.user?.id) {
      const owns = await assertCommercialOwnsTenant(req.user.id, request.tenantId);
      if (!owns) {
        return res.status(403).json({ error: 'Vous ne pouvez valider que les demandes des organisations que vous avez parrainées.' });
      }
    }

    const result = await approveDiscountQuote({
      requestId,
      reviewerId: req.user!.id,
      discountPercent: parsedDiscount,
      approvedAmount: parsedApproved,
    });

    await auditReq(req, {
      action: 'SUBSCRIPTION_DISCOUNT_QUOTED',
      targetType: 'SubscriptionRequest',
      targetId: requestId,
      tenantId: request.tenantId,
      summary: `Rabais validé · ${Math.round(result.pricing.finalAmount)} FC`,
      metadata: { approvedAmount: result.pricing.finalAmount, payHref: result.payHref },
    });

    return res.json({
      message: `Rabais validé (${Math.round(result.pricing.finalAmount).toLocaleString('fr-FR')} FC). Un lien de paiement a été envoyé à l’organisation.`,
      request: result.request,
      payHref: result.payHref,
      canPayOnline: result.canPayOnline,
      quoteExpiresAt: result.quoteExpiresAt,
    });
  } catch (error: any) {
    console.error('Erreur validation rabais:', error);
    return res.status(400).json({ error: error?.message || 'Impossible de valider le rabais.' });
  }
}

// 2. Get my subscription requests (Tenant)
export async function getMySubscriptionRequests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    const requests = await prisma.subscriptionRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des demandes d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération de vos demandes.' });
  }
}

const tenantCommercialSelect = {
  id: true,
  name: true,
  plan: true,
  licenseActive: true,
  licenseExpiresAt: true,
  referredByCommercial: {
    select: { id: true, name: true, email: true, referralCode: true },
  },
  referredByOrgUser: {
    select: { id: true, name: true, email: true, referralCode: true, orgRole: true },
  },
} as const;

// 3. Get all subscription requests (Super Admin)
export async function getAdminSubscriptionRequests(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const commercialId = isPlatformCommercial(req.user?.role) ? req.user?.id : undefined;

    const requests = await prisma.subscriptionRequest.findMany({
      where: commercialId
        ? { tenant: commercialReferredTenantFilter(commercialId) }
        : undefined,
      include: {
        tenant: {
          select: tenantCommercialSelect,
        },
        platformInvoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(requests);
  } catch (error: any) {
    console.error('Erreur lors de la récupération globale des demandes d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des demandes.' });
  }
}

// 4. Approve a subscription request (Super Admin)
export async function approveSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const requestId = req.params.id as string;
    const { discountPercent, approvedAmount } = req.body ?? {};

    const parsedDiscount =
      discountPercent !== undefined && discountPercent !== null && discountPercent !== ''
        ? parseFloat(String(discountPercent))
        : undefined;
    const parsedApproved =
      approvedAmount !== undefined && approvedAmount !== null && approvedAmount !== ''
        ? parseFloat(String(approvedAmount))
        : undefined;

    if (parsedDiscount !== undefined && (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100)) {
      return res.status(400).json({ error: 'La réduction doit être entre 0 et 100 %.' });
    }
    if (parsedApproved !== undefined && (isNaN(parsedApproved) || parsedApproved < 0)) {
      return res.status(400).json({ error: 'Le montant approuvé est invalide.' });
    }

    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: {
          select: {
            name: true,
            plan: true,
            licenseActive: true,
            licenseExpiresAt: true,
            accountKind: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
    }

    if (request.status !== 'PENDING' && request.status !== 'QUOTED') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
    }

    if (request.requestKind === 'discount' && request.status === 'PENDING') {
      return res.status(400).json({
        error: 'Validez d’abord le rabais pour envoyer le lien de paiement. L’activation n’est possible qu’après paiement, ou manuellement une fois le devis envoyé.',
      });
    }

    if (!isPlanAllowedForAccountKind(request.requestedPlan, request.tenant.accountKind)) {
      return res.status(403).json({
        error: planAudienceMismatchMessage(request.requestedPlan, request.tenant.accountKind),
      });
    }

    if (isPlatformCommercial(req.user?.role) && req.user?.id) {
      const owns = await assertCommercialOwnsTenant(req.user.id, request.tenantId);
      if (!owns) {
        return res.status(403).json({ error: 'Vous ne pouvez approuver que les demandes des organisations que vous avez parrainées.' });
      }
    }

    const durationDays = resolveDurationDaysForPlan(request.requestedPlan, request.durationDays);
    const baseAmount = getPlanAmount(request.requestedPlan, durationDays);
    let resolvedApproved = parsedApproved;
    let resolvedDiscount = parsedDiscount;

    const hasExplicitDiscount =
      resolvedDiscount !== undefined || resolvedApproved !== undefined;

    if (!hasExplicitDiscount) {
      const defaults = resolveDefaultSubscriptionDiscountOptions(request.requestedPlan, durationDays);
      if (defaults.approvedAmount !== undefined) resolvedApproved = defaults.approvedAmount;
      if (defaults.discountPercent !== undefined) resolvedDiscount = defaults.discountPercent;
    }

    const pricing = computeApprovedAmount(baseAmount, {
      discountPercent: resolvedDiscount,
      approvedAmount: resolvedApproved,
    });

    // Expiration : prolongation si même forfait actif, sinon nouvelle période (changement de plan)
    const tenantBefore = request.tenant;
    const isSamePlanRenewal =
      tenantBefore.licenseActive &&
      tenantBefore.licenseExpiresAt &&
      tenantBefore.plan === request.requestedPlan;

    const expiryDate = isSamePlanRenewal
      ? computeExtendedExpiry(tenantBefore.licenseExpiresAt, durationDays)
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + durationDays);
          return d;
        })();

    const billingAction =
      tenantBefore.plan === 'FREE' || !tenantBefore.licenseActive
        ? 'ACTIVATION'
        : tenantBefore.plan === request.requestedPlan
          ? 'RENEWAL'
          : 'PLAN_CHANGE';

    // Generate a unique license key EM-XXXX-XXXX-XXXX
    const generateLicenseKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
      return `EM-${segment()}-${segment()}-${segment()}`;
    };
    const newLicenseKey = generateLicenseKey();

    const periodStart = new Date();
    const periodEnd = expiryDate;

    // Update Tenant and Request in a transaction
    const [updatedRequest, updatedTenant] = await prisma.$transaction([
      prisma.subscriptionRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          specialDiscountPercent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
          baseAmount: pricing.baseAmount,
          approvedAmount: pricing.finalAmount,
        },
      }),
      prisma.tenant.update({
        where: { id: request.tenantId },
        data: {
          plan: request.requestedPlan,
          licenseActive: true,
          licenseExpiresAt: expiryDate,
          licenseKey: newLicenseKey,
          licenseExpiryWarningFor: null,
          billingCycle: billingCycleFromDurationDays(durationDays),
        },
      }),
    ]);

    const successMessage =
      billingAction === 'PLAN_CHANGE'
        ? `Forfait changé (${tenantBefore.plan} → ${request.requestedPlan}). Licence active jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`
        : billingAction === 'RENEWAL'
          ? `Abonnement renouvelé jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`
          : `La demande d'abonnement a été approuvée. Licence active jusqu'au ${expiryDate.toLocaleDateString('fr-FR')}.`;

    // Facturation et notifications en arrière-plan (réponse immédiate à l'interface)
    void (async () => {
      try {
        const invoiceResult = await issueTenantPlanInvoice({
          tenantId: request.tenantId,
          tenantName: tenantBefore?.name ?? 'Organisation',
          plan: request.requestedPlan,
          billing: {
            action: billingAction,
            durationDays,
            discountPercent: resolvedDiscount,
            approvedAmount: resolvedApproved,
            periodStart,
            periodEnd,
          },
          subscriptionRequestId: requestId,
        });
        if (invoiceResult.invoice) {
          console.log(
            `[Subscription] Facture ${invoiceResult.invoice.invoiceNumber} générée pour la demande ${requestId}`,
          );
        }
      } catch (billingError: unknown) {
        console.error('Erreur facturation après approbation abonnement:', billingError);
      }
    })();

    await auditReq(req, {
      action: 'SUBSCRIPTION_APPROVE',
      targetType: 'subscriptionRequest',
      targetId: requestId,
      tenantId: request.tenantId,
      summary: `Demande d’abonnement approuvée pour « ${tenantBefore.name} » (${request.requestedPlan})`,
      metadata: {
        requestedPlan: request.requestedPlan,
        billingAction,
        approvedAmount: pricing.finalAmount,
      },
    });

    return res.json({
      message: successMessage,
      request: updatedRequest,
      pricing,
      commercialNotified: [],
      invoice: null,
      billingWarning: null,
      billingAction,
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        plan: updatedTenant.plan,
        licenseActive: updatedTenant.licenseActive,
        licenseExpiresAt: updatedTenant.licenseExpiresAt,
        licenseKey: updatedTenant.licenseKey,
        previousPlan: tenantBefore.plan,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Erreur lors de l\'approbation de la demande d\'abonnement:', error);
    return res.status(500).json({
      error: 'Erreur lors de l\'approbation de la demande.',
      details: process.env.NODE_ENV !== 'production' ? message : undefined,
    });
  }
}

// 5. Reject a subscription request (Super Admin)
export async function rejectSubscriptionRequest(req: AuthenticatedRequest, res: Response) {
  try {
    if (!isPlatformStaff(req.user?.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges plateforme requis.' });
    }

    const requestId = req.params.id as string;

    const request = await prisma.subscriptionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({ error: 'Demande d\'abonnement non trouvée.' });
    }

    if (request.status !== 'PENDING' && request.status !== 'QUOTED') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
    }

    if (isPlatformCommercial(req.user?.role) && req.user?.id) {
      const owns = await assertCommercialOwnsTenant(req.user.id, request.tenantId);
      if (!owns) {
        return res.status(403).json({ error: 'Vous ne pouvez rejeter que les demandes des organisations que vous avez parrainées.' });
      }
    }

    const updatedRequest = await prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    await auditReq(req, {
      action: 'SUBSCRIPTION_REJECT',
      targetType: 'subscriptionRequest',
      targetId: requestId,
      tenantId: request.tenantId,
      summary: `Demande d’abonnement rejetée (${request.requestedPlan})`,
      metadata: { requestedPlan: request.requestedPlan },
    });

    return res.json({
      message: 'La demande d\'abonnement a été rejetée.',
      request: updatedRequest,
    });
  } catch (error: any) {
    console.error('Erreur lors du rejet de la demande d\'abonnement:', error);
    return res.status(500).json({ error: 'Erreur lors du rejet de la demande.' });
  }
}

// 6. Get public/authenticated subscription plans from settings
export async function getSubscriptionPlans(req: AuthenticatedRequest, res: Response) {
  const access = getSubscriptionDiscountAccess();
  const gate = resolveSubscriptionDiscountAccess(req.user?.tenantId, access);
  return res.json({
    ...getPlansConfiguration(),
    saasPaymentMode: getSaasPaymentMode(),
    onlinePaymentsEnabled: isOnlinePaymentsEnabled(),
    discountRequestsAllowed: gate.allowed,
    discountCampaign: {
      enabled: access.enabled,
      periodStart: access.periodStart,
      periodEnd: access.periodEnd,
      periodActive: gate.periodActive,
    },
  });
}

/**
 * Checkout forfait SaaS via FlexPay (Visa ou Mobile Money).
 * POST /api/subscriptions/checkout
 * body: { requestedPlan, durationDays?, paymentMethod: 'card'|'mobile', phone? }
 */
export async function checkoutSubscriptionFlexPay(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (getSaasPaymentMode() !== 'flexpay') {
      return res.status(400).json({
        error: 'Le paiement FlexPay des forfaits est désactivé. Soumettez une demande manuelle.',
        saasPaymentMode: 'manual',
      });
    }

    if (!isOnlinePaymentsEnabled()) {
      return res.status(503).json({
        error: 'Les paiements en ligne sont temporairement désactivés.',
      });
    }

    if (!isFlexPayCardConfigured()) {
      return res.status(503).json({
        error: 'Paiements FlexPay non configurés. Contactez le support.',
      });
    }

    const { requestedPlan, durationDays, paymentMethod, phone, operator, currency } = req.body || {};
    const method = paymentMethod === 'mobile' ? 'mobile' : 'card';

    if (!requestedPlan || !PAID_PLAN_KEYS.includes(requestedPlan)) {
      return res.status(400).json({ error: 'Le forfait demandé est invalide.' });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { accountKind: true, name: true },
    });
    if (!tenant || !isPlanAllowedForAccountKind(requestedPlan, tenant.accountKind)) {
      return res.status(403).json({
        error: planAudienceMismatchMessage(requestedPlan, tenant?.accountKind),
      });
    }

    const days = resolveDurationDaysForPlan(
      requestedPlan,
      durationDays != null ? parseInt(String(durationDays), 10) : null,
    );
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'La durée demandée est invalide.' });
    }

    const { baseAmount, amountFc } = computeSubscriptionCheckoutAmount(
      requestedPlan as PlanType,
      days,
    );
    if (amountFc <= 0) {
      return res.status(400).json({ error: 'Montant de forfait invalide.' });
    }

    if (method === 'mobile' && !phone) {
      return res.status(400).json({ error: 'Numéro Mobile Money requis (243…).' });
    }

    const request = await prisma.subscriptionRequest.create({
      data: {
        tenantId,
        requestedPlan: requestedPlan as PlanType,
        durationDays: days,
        status: 'PENDING',
        baseAmount,
        approvedAmount: amountFc,
        paymentProvider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
        flexPayReference: null,
        flexPayChannel: method === 'mobile' && operator ? String(operator).trim().toLowerCase() : null,
      },
    });

    try {
      const result = await initiateFlexPaySessionForRequest({
        request,
        tenantName: tenant.name,
        method,
        phone,
        currency,
      });
      return res.status(201).json(result);
    } catch (err: any) {
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { status: 'REJECTED' },
      });
      return res.status(502).json({
        error: err?.message || 'Impossible d’ouvrir le paiement FlexPay.',
      });
    }
  } catch (error: any) {
    console.error('[Subscription] checkout FlexPay', error);
    return res.status(500).json({ error: error?.message || 'Checkout forfait impossible.' });
  }
}

/**
 * Relance un paiement FlexPay sur une demande PENDING ou REJECTED.
 * POST /api/subscriptions/requests/:id/retry-payment
 * body: { paymentMethod?: 'card'|'mobile', phone? }
 */
export async function retrySubscriptionFlexPay(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const requestId = String(req.params.id || '');
    if (!tenantId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const request = await prisma.subscriptionRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { tenant: { select: { name: true } } },
    });
    if (!request) return res.status(404).json({ error: 'Demande introuvable.' });
    if (request.status === 'APPROVED') {
      return res.status(400).json({ error: 'Cette demande est déjà payée et approuvée.' });
    }

    const isQuotedPay = request.status === 'QUOTED';
    if (!isQuotedPay && getSaasPaymentMode() !== 'flexpay') {
      return res.status(400).json({
        error: 'Le paiement FlexPay des forfaits est désactivé.',
        saasPaymentMode: 'manual',
      });
    }
    if (!isOnlinePaymentsEnabled()) {
      return res.status(503).json({ error: 'Les paiements en ligne sont temporairement désactivés.' });
    }

    if (request.status !== 'PENDING' && request.status !== 'REJECTED' && request.status !== 'QUOTED') {
      return res.status(400).json({ error: 'Cette demande ne peut pas être relancée.' });
    }
    if (isQuotedPay && request.quoteExpiresAt && request.quoteExpiresAt < new Date()) {
      return res.status(410).json({ error: 'Ce devis a expiré. Déposez une nouvelle demande de rabais.' });
    }

    const rawMethod = String(req.body?.paymentMethod || '').toLowerCase();
    const fallback =
      request.paymentProvider === 'flexpay_mobile' ? 'mobile' : 'card';
    const method = rawMethod === 'mobile' || rawMethod === 'card' ? rawMethod : fallback;
    const phone = req.body?.phone ?? null;
    const operator = typeof req.body?.operator === 'string' ? req.body.operator.trim().toLowerCase() : '';
    if (method === 'mobile' && operator) {
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { flexPayChannel: operator },
      });
    }

    try {
      const result = await initiateFlexPaySessionForRequest({
        request,
        tenantName: request.tenant.name,
        method: method as 'card' | 'mobile',
        phone,
        currency: req.body?.currency,
      });
      return res.json({
        ...result,
        retried: true,
        message: result.message || 'Nouvelle tentative de paiement initiée.',
      });
    } catch (err: any) {
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { status: statusAfterFailedQuotedPayment(request.status) },
      });
      return res.status(502).json({
        error: err?.message || 'Impossible de relancer le paiement FlexPay.',
      });
    }
  } catch (error: any) {
    console.error('[Subscription] retry FlexPay', error);
    return res.status(500).json({ error: error?.message || 'Relance impossible.' });
  }
}

/** Vérifie / finalise un paiement forfait FlexPay. */
export async function verifySubscriptionFlexPay(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const requestId = String(req.params.id || '');
    if (!tenantId) return res.status(403).json({ error: 'Tenant non identifié.' });

    const request = await prisma.subscriptionRequest.findFirst({
      where: { id: requestId, tenantId },
    });
    if (!request) return res.status(404).json({ error: 'Demande introuvable.' });

    if (request.status === 'APPROVED') {
      return res.json({
        paid: true,
        requestId: request.id,
        status: request.status,
        channel: request.flexPayChannel,
      });
    }

    if (request.status === 'REJECTED') {
      return res.json({
        paid: false,
        status: 'failed',
        requestId: request.id,
        message: 'Paiement refusé ou annulé. Vous pouvez relancer une tentative.',
        canRetry: true,
        channel: request.flexPayChannel,
      });
    }

    if (!request.flexPayOrderNumber) {
      return res.json({
        paid: false,
        status: 'pending',
        requestId: request.id,
        message: 'Aucun paiement FlexPay associé. Relancez une tentative.',
        canRetry: true,
      });
    }

    if (!isFlexPayCardConfigured()) {
      return res.status(503).json({
        error: 'Paiements FlexPay non configurés.',
        canRetry: true,
      });
    }

    const checked = await checkFlexPayCardOrder(request.flexPayOrderNumber);
    const meta = buildFlexPayMetadataUpdate({
      channel: checked.channel,
      amountCustomer: checked.amountCustomer,
      providerReference: checked.providerReference,
    });

    if (checked.status === 'failed') {
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { status: statusAfterFailedQuotedPayment(request.status), ...meta },
      });
      return res.json({
        paid: false,
        status: 'failed',
        requestId: request.id,
        message: 'Le paiement a échoué. Vous pouvez relancer une tentative.',
        canRetry: true,
        channel: checked.channel || request.flexPayChannel,
      });
    }
    if (checked.status !== 'success') {
      if (Object.keys(meta).length) {
        await prisma.subscriptionRequest.update({ where: { id: request.id }, data: meta });
      }
      return res.json({
        paid: false,
        status: checked.status === 'pending' ? 'pending' : checked.status,
        requestId: request.id,
        canRetry: checked.status === 'unknown',
        channel: checked.channel || request.flexPayChannel,
      });
    }

    if (Object.keys(meta).length) {
      await prisma.subscriptionRequest.update({ where: { id: request.id }, data: meta });
    }

    const activated = await activateSubscriptionRequest(request.id, {
      approvedAmount: request.approvedAmount ?? undefined,
      markPaid: true,
    });

    return res.json({
      paid: true,
      requestId: request.id,
      status: 'APPROVED',
      tenant: activated.alreadyProcessed ? undefined : activated.tenant,
      channel: checked.channel || request.flexPayChannel,
    });
  } catch (error: any) {
    console.error('[Subscription] verify FlexPay', error);
    return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
  }
}

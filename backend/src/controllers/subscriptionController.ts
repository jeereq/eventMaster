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
  isOnlinePaymentsEnabled,
} from '../services/platformSettingsService';
import {
  activateSubscriptionRequest,
  computeSubscriptionCheckoutAmount,
} from '../services/subscriptionActivationService';
import {
  createFlexPayCardCheckout,
  createFlexPayMobileCheckout,
  getPublicApiBaseUrl,
  isFlexPayCardMock,
  checkFlexPayCardOrder,
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

    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: 'Cette demande a déjà été traitée.' });
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

    if (request.status !== 'PENDING') {
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
  return res.json({
    ...getPlansConfiguration(),
    saasPaymentMode: getSaasPaymentMode(),
    onlinePaymentsEnabled: isOnlinePaymentsEnabled(),
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

    const { requestedPlan, durationDays, paymentMethod, phone } = req.body || {};
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
      },
    });

    // Référence marchand = id demande (callback / verify)
    await prisma.subscriptionRequest.update({
      where: { id: request.id },
      data: { flexPayReference: request.id },
    });

    if (isFlexPayCardMock()) {
      const activated = await activateSubscriptionRequest(request.id, {
        approvedAmount: amountFc,
        markPaid: true,
      });
      return res.status(201).json({
        paid: true,
        mock: true,
        provider: method === 'mobile' ? 'flexpay_mobile' : 'flexpay_card',
        requestId: request.id,
        message: 'Paiement FlexPay simulé (credentials absents). Forfait activé.',
        tenant: activated.alreadyProcessed ? undefined : activated.tenant,
      });
    }

    const apiBase = getPublicApiBaseUrl();
    const callbackUrl = `${apiBase}/api/public/payments/flexpay/callback`;
    const description = `Forfait ${requestedPlan} — ${days} jours — ${tenant.name}`;

    try {
      if (method === 'mobile') {
        const flex = await createFlexPayMobileCheckout({
          reference: request.id,
          amount: amountFc,
          currency: 'CDF',
          phone: String(phone),
          callbackUrl,
        });
        await prisma.subscriptionRequest.update({
          where: { id: request.id },
          data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: request.id },
        });
        return res.status(201).json({
          paid: false,
          mock: false,
          provider: 'flexpay_mobile',
          requestId: request.id,
          orderNumber: flex.orderNumber,
          message:
            'Demande de paiement envoyée sur votre téléphone. Confirmez sur Mobile Money, puis revenez vérifier le statut.',
        });
      }

      const flex = await createFlexPayCardCheckout({
        reference: request.id,
        amount: amountFc,
        currency: 'CDF',
        description,
        callbackUrl,
        approveUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=approve`,
        cancelUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=cancel`,
        declineUrl: `${apiBase}/api/public/payments/flexpay/return?kind=subscription&requestId=${request.id}&result=decline`,
        language: 'fr',
      });
      await prisma.subscriptionRequest.update({
        where: { id: request.id },
        data: { flexPayOrderNumber: flex.orderNumber, flexPayReference: request.id },
      });
      return res.status(201).json({
        paid: false,
        mock: false,
        provider: 'flexpay_card',
        requestId: request.id,
        checkoutUrl: flex.redirectUrl,
      });
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
      return res.json({ paid: true, requestId: request.id, status: request.status });
    }

    if (!request.flexPayOrderNumber) {
      return res.status(400).json({ error: 'Aucun paiement FlexPay associé.' });
    }

    const { checkFlexPayCardOrder } = await import('../services/flexPayCardService');
    const checked = await checkFlexPayCardOrder(request.flexPayOrderNumber);
    if (checked.status !== 'success') {
      return res.json({ paid: false, status: checked.status, requestId: request.id });
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
    });
  } catch (error: any) {
    console.error('[Subscription] verify FlexPay', error);
    return res.status(500).json({ error: error?.message || 'Vérification impossible.' });
  }
}

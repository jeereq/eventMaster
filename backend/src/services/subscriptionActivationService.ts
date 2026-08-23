import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import {
  getPlanLimits,
  isPlanAllowedForAccountKind,
  resolveDurationDaysForPlan,
  resolveDefaultPromoApprovedAmount,
  billingCycleFromDurationDays,
} from '../config/plansConfig';
import {
  issueTenantPlanInvoice,
  computeExtendedExpiry,
  type TenantBillingAction,
} from './tenantBillingService';
import { computeApprovedAmount, getPlanAmount } from './invoiceService';

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EM-${segment()}-${segment()}-${segment()}`;
}

/**
 * Active une demande d’abonnement PENDING (approbation admin ou paiement FlexPay réussi).
 */
export async function activateSubscriptionRequest(
  requestId: string,
  opts?: { discountPercent?: number; approvedAmount?: number; markPaid?: boolean },
) {
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

  if (!request) throw new Error('Demande d’abonnement introuvable.');
  if (request.status !== 'PENDING') {
    return { alreadyProcessed: true as const, request };
  }

  if (!isPlanAllowedForAccountKind(request.requestedPlan, request.tenant.accountKind)) {
    throw new Error('Ce forfait ne correspond pas au type de compte.');
  }

  const durationDays = resolveDurationDaysForPlan(request.requestedPlan, request.durationDays);
  const baseAmount = getPlanAmount(request.requestedPlan, durationDays);
  const planDef = getPlanLimits(request.requestedPlan);

  let resolvedApproved = opts?.approvedAmount;
  let resolvedDiscount = opts?.discountPercent;

  const hasExplicitDiscount =
    (resolvedDiscount !== undefined && resolvedDiscount > 0) || resolvedApproved !== undefined;

  if (!hasExplicitDiscount && planDef.promoActive && planDef.promoMonthlyPriceFc != null) {
    resolvedApproved = resolveDefaultPromoApprovedAmount(
      request.requestedPlan,
      durationDays,
      planDef.promoMonthlyPriceFc,
    );
  }

  if (resolvedApproved == null && request.approvedAmount != null) {
    resolvedApproved = request.approvedAmount;
  }

  const pricing = computeApprovedAmount(baseAmount, {
    discountPercent: resolvedDiscount,
    approvedAmount: resolvedApproved,
  });

  const tenantBefore = request.tenant;
  const isSamePlanRenewal =
    Boolean(tenantBefore.licenseActive) &&
    Boolean(tenantBefore.licenseExpiresAt) &&
    tenantBefore.plan === request.requestedPlan;

  const expiryDate = isSamePlanRenewal
    ? computeExtendedExpiry(tenantBefore.licenseExpiresAt, durationDays)
    : (() => {
        const d = new Date();
        d.setDate(d.getDate() + durationDays);
        return d;
      })();

  const billingAction: TenantBillingAction =
    tenantBefore.plan === 'FREE' || !tenantBefore.licenseActive
      ? 'ACTIVATION'
      : tenantBefore.plan === request.requestedPlan
        ? 'RENEWAL'
        : 'PLAN_CHANGE';

  const newLicenseKey = generateLicenseKey();
  const periodStart = new Date();
  const periodEnd = expiryDate;

  const [updatedRequest, updatedTenant] = await prisma.$transaction([
    prisma.subscriptionRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        specialDiscountPercent: pricing.discountPercent > 0 ? pricing.discountPercent : null,
        baseAmount: pricing.baseAmount,
        approvedAmount: pricing.finalAmount,
        ...(opts?.markPaid
          ? { paidAt: new Date(), proofOfPayment: request.proofOfPayment || 'flexpay' }
          : {}),
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

  void (async () => {
    try {
      await issueTenantPlanInvoice({
        tenantId: request.tenantId,
        tenantName: tenantBefore.name ?? 'Organisation',
        plan: request.requestedPlan,
        billing: {
          action: billingAction,
          durationDays,
          discountPercent: resolvedDiscount,
          approvedAmount: pricing.finalAmount,
          periodStart,
          periodEnd,
        },
        subscriptionRequestId: requestId,
      });
    } catch (err) {
      console.error('[Subscription] facturation post-activation:', err);
    }
  })();

  return {
    alreadyProcessed: false as const,
    request: updatedRequest,
    tenant: updatedTenant,
    pricing,
    billingAction,
    expiryDate,
  };
}

export function computeSubscriptionCheckoutAmount(
  plan: PlanType,
  durationDays: number,
): { baseAmount: number; amountFc: number } {
  const baseAmount = getPlanAmount(plan, durationDays);
  const planDef = getPlanLimits(plan);
  let approved: number | undefined;
  if (planDef.promoActive && planDef.promoMonthlyPriceFc != null) {
    approved = resolveDefaultPromoApprovedAmount(plan, durationDays, planDef.promoMonthlyPriceFc);
  }
  const pricing = computeApprovedAmount(baseAmount, { approvedAmount: approved });
  return { baseAmount: pricing.baseAmount, amountFc: pricing.finalAmount };
}

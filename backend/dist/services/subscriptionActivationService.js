"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateSubscriptionRequest = activateSubscriptionRequest;
exports.computeSubscriptionCheckoutAmount = computeSubscriptionCheckoutAmount;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const tenantBillingService_1 = require("./tenantBillingService");
const invoiceService_1 = require("./invoiceService");
function generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segment = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `EM-${segment()}-${segment()}-${segment()}`;
}
/**
 * Active une demande d’abonnement PENDING (approbation admin ou paiement FlexPay réussi).
 */
async function activateSubscriptionRequest(requestId, opts) {
    const request = await db_1.prisma.subscriptionRequest.findUnique({
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
    if (!request)
        throw new Error('Demande d’abonnement introuvable.');
    if (request.status !== 'PENDING') {
        return { alreadyProcessed: true, request };
    }
    if (!(0, plansConfig_1.isPlanAllowedForAccountKind)(request.requestedPlan, request.tenant.accountKind)) {
        throw new Error('Ce forfait ne correspond pas au type de compte.');
    }
    const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(request.requestedPlan, request.durationDays);
    const baseAmount = (0, invoiceService_1.getPlanAmount)(request.requestedPlan, durationDays);
    let resolvedApproved = opts?.approvedAmount;
    let resolvedDiscount = opts?.discountPercent;
    const hasExplicitDiscount = resolvedDiscount !== undefined || resolvedApproved !== undefined;
    // Montant déjà figé sur la demande (ex. checkout FlexPay) = source de vérité du débit.
    if (resolvedApproved == null && request.approvedAmount != null) {
        resolvedApproved = request.approvedAmount;
    }
    if (!hasExplicitDiscount && resolvedApproved == null) {
        const defaults = (0, plansConfig_1.resolveDefaultSubscriptionDiscountOptions)(request.requestedPlan, durationDays);
        if (defaults.approvedAmount !== undefined)
            resolvedApproved = defaults.approvedAmount;
        if (defaults.discountPercent !== undefined)
            resolvedDiscount = defaults.discountPercent;
    }
    const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, {
        discountPercent: resolvedDiscount,
        approvedAmount: resolvedApproved,
    });
    const tenantBefore = request.tenant;
    const isSamePlanRenewal = Boolean(tenantBefore.licenseActive) &&
        Boolean(tenantBefore.licenseExpiresAt) &&
        tenantBefore.plan === request.requestedPlan;
    const expiryDate = isSamePlanRenewal
        ? (0, tenantBillingService_1.computeExtendedExpiry)(tenantBefore.licenseExpiresAt, durationDays)
        : (() => {
            const d = new Date();
            d.setDate(d.getDate() + durationDays);
            return d;
        })();
    const billingAction = tenantBefore.plan === 'FREE' || !tenantBefore.licenseActive
        ? 'ACTIVATION'
        : tenantBefore.plan === request.requestedPlan
            ? 'RENEWAL'
            : 'PLAN_CHANGE';
    const newLicenseKey = generateLicenseKey();
    const periodStart = new Date();
    const periodEnd = expiryDate;
    const [updatedRequest, updatedTenant] = await db_1.prisma.$transaction([
        db_1.prisma.subscriptionRequest.update({
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
        db_1.prisma.tenant.update({
            where: { id: request.tenantId },
            data: {
                plan: request.requestedPlan,
                licenseActive: true,
                licenseExpiresAt: expiryDate,
                licenseKey: newLicenseKey,
                licenseExpiryWarningFor: null,
                billingCycle: (0, plansConfig_1.billingCycleFromDurationDays)(durationDays),
            },
        }),
    ]);
    void (async () => {
        try {
            await (0, tenantBillingService_1.issueTenantPlanInvoice)({
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
        }
        catch (err) {
            console.error('[Subscription] facturation post-activation:', err);
        }
    })();
    return {
        alreadyProcessed: false,
        request: updatedRequest,
        tenant: updatedTenant,
        pricing,
        billingAction,
        expiryDate,
    };
}
function computeSubscriptionCheckoutAmount(plan, durationDays) {
    const baseAmount = (0, invoiceService_1.getPlanAmount)(plan, durationDays);
    const defaults = (0, plansConfig_1.resolveDefaultSubscriptionDiscountOptions)(plan, durationDays);
    const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, defaults);
    return { baseAmount: pricing.baseAmount, amountFc: pricing.finalAmount };
}

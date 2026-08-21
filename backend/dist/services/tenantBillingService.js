"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBillingAction = resolveBillingAction;
exports.invoiceTypeForAction = invoiceTypeForAction;
exports.sourceForAction = sourceForAction;
exports.notificationEventForBilling = notificationEventForBilling;
exports.issueTenantPlanInvoice = issueTenantPlanInvoice;
exports.resolveRenewalTerms = resolveRenewalTerms;
exports.computeExtendedExpiry = computeExtendedExpiry;
const invoiceService_1 = require("./invoiceService");
const plansConfig_1 = require("../config/plansConfig");
const commercialService_1 = require("./commercialService");
function resolveBillingAction(previousPlan, newPlan, explicit) {
    if (explicit)
        return explicit;
    if (previousPlan === 'FREE' && newPlan !== 'FREE')
        return 'ACTIVATION';
    if (previousPlan !== newPlan)
        return 'PLAN_CHANGE';
    return 'RENEWAL';
}
function invoiceTypeForAction(action) {
    if (action === 'RENEWAL')
        return 'RENEWAL';
    if (action === 'ACTIVATION')
        return 'SUBSCRIPTION_APPROVAL';
    return 'PAYMENT';
}
function sourceForAction(action) {
    if (action === 'RENEWAL')
        return 'ADMIN_RENEWAL';
    if (action === 'ACTIVATION')
        return 'ADMIN_ACTIVATION';
    return 'ADMIN_PLAN_CHANGE';
}
function notificationEventForBilling(action, subscriptionRequestId) {
    if (subscriptionRequestId && action === 'ACTIVATION')
        return 'SUBSCRIPTION_APPROVAL';
    if (action === 'RENEWAL')
        return 'ADMIN_RENEWAL';
    if (action === 'PLAN_CHANGE')
        return 'ADMIN_PLAN_CHANGE';
    return 'ADMIN_ACTIVATION';
}
async function issueTenantPlanInvoice(params) {
    const durationDays = (0, plansConfig_1.resolveDurationDaysForPlan)(params.plan, params.billing.durationDays);
    const periodStart = params.billing.periodStart ?? new Date();
    const periodEnd = params.billing.periodEnd ??
        (() => {
            const d = new Date(periodStart);
            d.setDate(d.getDate() + durationDays);
            return d;
        })();
    const baseAmount = (0, invoiceService_1.getPlanAmount)(params.plan, durationDays);
    const planDef = (0, plansConfig_1.getPlanLimits)(params.plan);
    let approvedAmount = params.billing.approvedAmount;
    let discountPercent = params.billing.discountPercent;
    const hasExplicitDiscount = (discountPercent !== undefined && discountPercent > 0) ||
        approvedAmount !== undefined;
    if (!hasExplicitDiscount && planDef.promoActive && planDef.promoMonthlyPriceFc != null) {
        approvedAmount = (0, plansConfig_1.resolveDefaultPromoApprovedAmount)(params.plan, durationDays, planDef.promoMonthlyPriceFc);
    }
    const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, {
        discountPercent,
        approvedAmount,
    });
    const invoiceType = invoiceTypeForAction(params.billing.action);
    const invoice = await (0, invoiceService_1.createAndSendInvoice)({
        tenantId: params.tenantId,
        plan: params.plan,
        type: invoiceType,
        amount: pricing.finalAmount,
        baseAmount: pricing.baseAmount,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        durationDays,
        periodStart,
        periodEnd,
        includeManagers: true,
        subscriptionRequestId: params.subscriptionRequestId,
        status: 'PAID',
    });
    const commissionRecords = await (0, commercialService_1.recordCommercialCommission)({
        tenantId: params.tenantId,
        plan: params.plan,
        source: sourceForAction(params.billing.action),
        invoiceAmount: pricing.finalAmount,
        platformInvoiceId: invoice?.id,
    });
    const commissionsByUserId = Object.fromEntries(commissionRecords.map((r) => [r.commercialId, r.commissionAmount]));
    const notificationEvent = notificationEventForBilling(params.billing.action, params.subscriptionRequestId);
    const commercialNotification = await (0, commercialService_1.notifyCommercialsOnSubscriptionApproval)({
        tenantId: params.tenantId,
        tenantName: params.tenantName,
        plan: params.plan,
        durationDays,
        baseAmount: pricing.baseAmount,
        finalAmount: pricing.finalAmount,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        invoiceNumber: invoice?.invoiceNumber,
        event: notificationEvent,
        commissionsByUserId,
    });
    return {
        pricing,
        invoice,
        commercialNotified: commercialNotification.notified,
    };
}
function resolveRenewalTerms(plan, billingCycle) {
    const durationDays = billingCycle === 'ANNUAL' ? plansConfig_1.YEAR_DURATION_DAYS : (0, plansConfig_1.resolveDurationDaysForPlan)(plan);
    const discountPercent = billingCycle === 'ANNUAL' ? plansConfig_1.ANNUAL_DISCOUNT_PERCENT : 0;
    const baseAmount = (0, invoiceService_1.getPlanAmount)(plan, durationDays);
    const pricing = (0, invoiceService_1.computeApprovedAmount)(baseAmount, { discountPercent });
    return { durationDays, ...pricing };
}
function computeExtendedExpiry(currentExpiry, durationDays, fromDate = new Date()) {
    const base = currentExpiry && new Date(currentExpiry) > fromDate ? new Date(currentExpiry) : new Date(fromDate);
    const next = new Date(base);
    next.setDate(next.getDate() + durationDays);
    return next;
}

import { InvoiceType, PlanType } from '@prisma/client';
import {
  computeApprovedAmount,
  createAndSendInvoice,
  getPlanAmount,
} from './invoiceService';
import { notifyCommercialsOnSubscriptionApproval, recordCommercialCommission } from './commercialService';

export type TenantBillingAction = 'ACTIVATION' | 'PLAN_CHANGE' | 'RENEWAL';

export interface TenantBillingOptions {
  action: TenantBillingAction;
  durationDays?: number;
  discountPercent?: number;
  approvedAmount?: number;
  periodStart?: Date;
  periodEnd?: Date;
}

export interface TenantBillingResult {
  pricing: ReturnType<typeof computeApprovedAmount>;
  invoice: Awaited<ReturnType<typeof createAndSendInvoice>>;
  commercialNotified: string[];
}

export function resolveBillingAction(
  previousPlan: PlanType,
  newPlan: PlanType,
  explicit?: TenantBillingAction,
): TenantBillingAction {
  if (explicit) return explicit;
  if (previousPlan === 'FREE' && newPlan !== 'FREE') return 'ACTIVATION';
  if (previousPlan !== newPlan) return 'PLAN_CHANGE';
  return 'RENEWAL';
}

export function invoiceTypeForAction(action: TenantBillingAction): InvoiceType {
  if (action === 'RENEWAL') return 'RENEWAL';
  if (action === 'ACTIVATION') return 'SUBSCRIPTION_APPROVAL';
  return 'PAYMENT';
}

export function sourceForAction(action: TenantBillingAction): string {
  if (action === 'RENEWAL') return 'ADMIN_RENEWAL';
  if (action === 'ACTIVATION') return 'ADMIN_ACTIVATION';
  return 'ADMIN_PLAN_CHANGE';
}

export async function issueTenantPlanInvoice(params: {
  tenantId: string;
  tenantName: string;
  plan: PlanType;
  billing: TenantBillingOptions;
  subscriptionRequestId?: string;
}): Promise<TenantBillingResult> {
  const durationDays = params.billing.durationDays ?? 30;
  const periodStart = params.billing.periodStart ?? new Date();
  const periodEnd =
    params.billing.periodEnd ??
    (() => {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + durationDays);
      return d;
    })();

  const baseAmount = getPlanAmount(params.plan);
  const pricing = computeApprovedAmount(baseAmount, {
    discountPercent: params.billing.discountPercent,
    approvedAmount: params.billing.approvedAmount,
  });

  const invoiceType = invoiceTypeForAction(params.billing.action);

  const invoice = await createAndSendInvoice({
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
  });

  await recordCommercialCommission({
    tenantId: params.tenantId,
    plan: params.plan,
    source: sourceForAction(params.billing.action),
    invoiceAmount: pricing.finalAmount,
    platformInvoiceId: invoice?.id,
  });

  const commercialNotification = await notifyCommercialsOnSubscriptionApproval({
    tenantId: params.tenantId,
    tenantName: params.tenantName,
    plan: params.plan,
    durationDays,
    baseAmount: pricing.baseAmount,
    finalAmount: pricing.finalAmount,
    discountPercent: pricing.discountPercent,
    discountAmount: pricing.discountAmount,
    invoiceNumber: invoice?.invoiceNumber,
  });

  return {
    pricing,
    invoice,
    commercialNotified: commercialNotification.notified,
  };
}

export function computeExtendedExpiry(
  currentExpiry: Date | null | undefined,
  durationDays: number,
  fromDate = new Date(),
): Date {
  const base =
    currentExpiry && new Date(currentExpiry) > fromDate ? new Date(currentExpiry) : new Date(fromDate);
  const next = new Date(base);
  next.setDate(next.getDate() + durationDays);
  return next;
}

import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import {
  createCommercialBillingNotification,
  type CommercialBillingEvent,
} from './platformNotificationService';
import { loadPlatformSettings } from './platformSettingsService';
import { parseRateInput } from '../utils/ratePercent';

function formatAmountFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export { formatAmountFc };

export const DEFAULT_COMMISSION_RATE = 0.3;
export const DEFAULT_RENEWAL_COMMISSION_RATE = 0.2;

export function defaultFirstCommissionRate(): number {
  try {
    return parseRateInput(loadPlatformSettings().commercialFirstCommissionRate, DEFAULT_COMMISSION_RATE, 0, 1);
  } catch {
    return DEFAULT_COMMISSION_RATE;
  }
}

export function defaultRenewalCommissionRate(): number {
  try {
    return parseRateInput(
      loadPlatformSettings().commercialRenewalCommissionRate,
      DEFAULT_RENEWAL_COMMISSION_RATE,
      0,
      1,
    );
  } catch {
    return DEFAULT_RENEWAL_COMMISSION_RATE;
  }
}

export function generateReferralCode(name?: string | null, prefix = 'EM'): string {
  const rolePrefix = prefix === 'ORG' ? 'ORG' : 'EM';
  const namePart = (name || 'COM')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${rolePrefix}-${namePart}-${suffix}`;
}

export function parsePlanPrice(priceLabel: string): number {
  const digits = priceLabel.replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

export function getBillingPeriod(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function normalizeCommissionRate(rate: unknown, fallback = DEFAULT_COMMISSION_RATE): number {
  const value = typeof rate === 'number' ? rate : parseFloat(String(rate));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function resolveCommissionRates(params: {
  first?: unknown;
  renewal?: unknown;
  firstFallback?: number;
  renewalFallback?: number;
}): { first: number; renewal: number } {
  return {
    first: normalizeCommissionRate(params.first, params.firstFallback ?? defaultFirstCommissionRate()),
    renewal: normalizeCommissionRate(
      params.renewal,
      params.renewalFallback ?? defaultRenewalCommissionRate(),
    ),
  };
}

function isRenewalCommissionSource(source: string): boolean {
  return /RENEWAL/i.test(source);
}

async function assignUniqueReferralCode(userId: string, name?: string | null, prefix = 'EM'): Promise<string> {
  let code = generateReferralCode(name, prefix);
  for (let attempt = 0; attempt < 8; attempt++) {
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) break;
    code = generateReferralCode(name, prefix);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
    select: { referralCode: true },
  });

  return updated.referralCode!;
}

export async function ensureCommercialReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, referralCode: true, name: true, tenantId: true },
  });

  if (!user || user.role !== 'COMMERCIAL' || user.tenantId) {
    throw new Error('Utilisateur commercial plateforme introuvable.');
  }

  if (user.referralCode) return user.referralCode;
  return assignUniqueReferralCode(userId, user.name, 'EM');
}

export async function ensureOrgCommercialReferralCode(userId: string, tenantId: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenantId, role: 'USER', orgRole: 'COMMERCIAL' },
    select: { id: true, referralCode: true, name: true },
  });

  if (!user) {
    throw new Error('Commercial organisation introuvable.');
  }

  if (user.referralCode) return user.referralCode;
  return assignUniqueReferralCode(userId, user.name, 'ORG');
}

export type ResolvedReferral =
  | {
      type: 'platform';
      id: string;
      name: string | null;
      referralCode: string;
      commissionRate: number;
      renewalCommissionRate: number;
    }
  | {
      type: 'org';
      id: string;
      name: string | null;
      referralCode: string;
      commissionRate: number;
      renewalCommissionRate: number;
      parentTenantId: string;
    };

export async function resolveCommercialByReferralCode(referralCode: string): Promise<ResolvedReferral | null> {
  const code = referralCode.trim().toUpperCase();

  const platformCommercial = await prisma.user.findFirst({
    where: { referralCode: code, role: 'COMMERCIAL', tenantId: null },
    select: { id: true, name: true, referralCode: true, commissionRate: true, renewalCommissionRate: true },
  });

  if (platformCommercial?.referralCode) {
    const rates = resolveCommissionRates({
      first: platformCommercial.commissionRate,
      renewal: platformCommercial.renewalCommissionRate,
    });
    return {
      type: 'platform',
      id: platformCommercial.id,
      name: platformCommercial.name,
      referralCode: platformCommercial.referralCode,
      commissionRate: rates.first,
      renewalCommissionRate: rates.renewal,
    };
  }

  const orgCommercial = await prisma.user.findFirst({
    where: { referralCode: code, role: 'USER', orgRole: 'COMMERCIAL' },
    select: {
      id: true,
      name: true,
      referralCode: true,
      commissionRate: true,
      renewalCommissionRate: true,
      tenantId: true,
      tenant: {
        select: {
          defaultOrgCommercialCommissionRate: true,
          defaultOrgCommercialRenewalCommissionRate: true,
        },
      },
    },
  });

  if (orgCommercial?.referralCode && orgCommercial.tenantId) {
    const rates = resolveCommissionRates({
      first: orgCommercial.commissionRate,
      renewal: orgCommercial.renewalCommissionRate,
      firstFallback: orgCommercial.tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
      renewalFallback:
        orgCommercial.tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
    });
    return {
      type: 'org',
      id: orgCommercial.id,
      name: orgCommercial.name,
      referralCode: orgCommercial.referralCode,
      commissionRate: rates.first,
      renewalCommissionRate: rates.renewal,
      parentTenantId: orgCommercial.tenantId,
    };
  }

  return null;
}

export type CommercialCommissionRecord = {
  commercialId: string;
  commissionAmount: number;
};

export async function recordCommercialCommission(params: {
  tenantId: string;
  plan: PlanType;
  source: string;
  invoiceAmount?: number;
  platformInvoiceId?: string;
}): Promise<CommercialCommissionRecord[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      id: true,
      referredByCommercialId: true,
      referredByOrgUserId: true,
    },
  });

  if (!tenant) return [];

  const invoiceAmount =
    params.invoiceAmount ?? parsePlanPrice(getPlanLimits(params.plan).price);

  if (invoiceAmount <= 0) return [];

  const billingPeriod = getBillingPeriod();
  const results: CommercialCommissionRecord[] = [];
  const forceRenewal = isRenewalCommissionSource(params.source);

  const upsertCommission = async (opts: {
    commercialId: string;
    rates: { first: number; renewal: number };
    source: string;
  }) => {
    const previousCount = await prisma.commercialCommission.count({
      where: {
        commercialId: opts.commercialId,
        tenantId: tenant.id,
        NOT: { billingPeriod },
      },
    });
    const isFirst = previousCount === 0 && !forceRenewal;
    const rate = isFirst ? opts.rates.first : opts.rates.renewal;
    const commissionAmount = Math.round(invoiceAmount * rate);
    await prisma.commercialCommission.upsert({
      where: {
        commercialId_tenantId_billingPeriod: {
          commercialId: opts.commercialId,
          tenantId: tenant.id,
          billingPeriod,
        },
      },
      create: {
        commercialId: opts.commercialId,
        tenantId: tenant.id,
        plan: params.plan,
        invoiceAmount,
        commissionRate: rate,
        commissionAmount,
        billingPeriod,
        source: opts.source,
        platformInvoiceId: params.platformInvoiceId ?? null,
      },
      update: {
        plan: params.plan,
        invoiceAmount,
        commissionRate: rate,
        commissionAmount,
        source: opts.source,
        platformInvoiceId: params.platformInvoiceId ?? undefined,
      },
    });
    results.push({ commercialId: opts.commercialId, commissionAmount });
  };

  if (tenant.referredByCommercialId) {
    const commercial = await prisma.user.findUnique({
      where: { id: tenant.referredByCommercialId },
      select: { id: true, commissionRate: true, renewalCommissionRate: true, role: true },
    });

    if (commercial?.role === 'COMMERCIAL') {
      await upsertCommission({
        commercialId: commercial.id,
        rates: resolveCommissionRates({
          first: commercial.commissionRate,
          renewal: commercial.renewalCommissionRate,
        }),
        source: params.source,
      });
    }
  }

  if (tenant.referredByOrgUserId) {
    const orgCommercial = await prisma.user.findFirst({
      where: { id: tenant.referredByOrgUserId, role: 'USER', orgRole: 'COMMERCIAL' },
      select: {
        id: true,
        commissionRate: true,
        renewalCommissionRate: true,
        tenant: {
          select: {
            defaultOrgCommercialCommissionRate: true,
            defaultOrgCommercialRenewalCommissionRate: true,
          },
        },
      },
    });

    if (orgCommercial) {
      await upsertCommission({
        commercialId: orgCommercial.id,
        rates: resolveCommissionRates({
          first: orgCommercial.commissionRate,
          renewal: orgCommercial.renewalCommissionRate,
          firstFallback: orgCommercial.tenant?.defaultOrgCommercialCommissionRate ?? DEFAULT_COMMISSION_RATE,
          renewalFallback:
            orgCommercial.tenant?.defaultOrgCommercialRenewalCommissionRate ?? DEFAULT_RENEWAL_COMMISSION_RATE,
        }),
        source: `${params.source}_ORG`,
      });
    }
  }

  return results;
}

type CommercialContact = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  kind: 'platform' | 'org';
};

async function getTenantCommercialContacts(tenantId: string): Promise<CommercialContact[]> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      referredByCommercial: {
        select: { id: true, name: true, email: true, phone: true, role: true },
      },
      referredByOrgUser: {
        select: { id: true, name: true, email: true, phone: true, orgRole: true },
      },
    },
  });

  const contacts: CommercialContact[] = [];
  const seen = new Set<string>();

  if (tenant?.referredByCommercial?.role === 'COMMERCIAL') {
    seen.add(tenant.referredByCommercial.id);
    contacts.push({
      id: tenant.referredByCommercial.id,
      name: tenant.referredByCommercial.name,
      email: tenant.referredByCommercial.email,
      phone: tenant.referredByCommercial.phone,
      kind: 'platform',
    });
  }

  if (tenant?.referredByOrgUser?.orgRole === 'COMMERCIAL' && !seen.has(tenant.referredByOrgUser.id)) {
    contacts.push({
      id: tenant.referredByOrgUser.id,
      name: tenant.referredByOrgUser.name,
      email: tenant.referredByOrgUser.email,
      phone: tenant.referredByOrgUser.phone,
      kind: 'org',
    });
  }

  return contacts;
}

export async function notifyCommercialsOnSubscriptionApproval(params: {
  tenantId: string;
  tenantName: string;
  plan: PlanType;
  durationDays: number;
  baseAmount: number;
  finalAmount: number;
  discountPercent: number;
  discountAmount: number;
  invoiceNumber?: string;
  event?: CommercialBillingEvent;
  commissionsByUserId?: Record<string, number>;
}): Promise<{ notified: string[] }> {
  const contacts = await getTenantCommercialContacts(params.tenantId);
  if (contacts.length === 0) {
    return { notified: [] };
  }

  const event = params.event ?? 'SUBSCRIPTION_APPROVAL';
  const notified: string[] = [];

  for (const contact of contacts) {
    try {
      await createCommercialBillingNotification({
        userId: contact.id,
        tenantId: params.tenantId,
        tenantName: params.tenantName,
        plan: params.plan,
        event,
        durationDays: params.durationDays,
        baseAmount: params.baseAmount,
        finalAmount: params.finalAmount,
        discountPercent: params.discountPercent,
        discountAmount: params.discountAmount,
        invoiceNumber: params.invoiceNumber,
        commissionAmount: params.commissionsByUserId?.[contact.id],
      });
      notified.push(contact.email);
    } catch (err) {
      console.error('[notifyCommercialsOnSubscriptionApproval] notification:', err);
    }
  }

  return { notified };
}

export function findGuestSeatInTablePlan(
  tablePlan: unknown,
  guestId: string,
): { tableId: string; tableName: string; seatIndex: number } | null {
  if (!tablePlan || typeof tablePlan !== 'object') return null;
  const plan = tablePlan as { tables?: Array<{ id: string; name?: string; seats?: Record<string, string | null> }> };
  if (!Array.isArray(plan.tables)) return null;

  for (const table of plan.tables) {
    const seats = table.seats || {};
    for (const [seatKey, assignedGuestId] of Object.entries(seats)) {
      if (assignedGuestId === guestId) {
        return {
          tableId: table.id,
          tableName: table.name || `Table ${table.id.slice(0, 6)}`,
          seatIndex: parseInt(seatKey, 10),
        };
      }
    }
  }
  return null;
}

export function extractGuestIdFromScanPayload(payload: string): string | null {
  const trimmed = payload.trim();
  if (/^[0-9a-f-]{36}$/i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const rsvpIdx = parts.indexOf('rsvp');
    if (rsvpIdx >= 0 && parts[rsvpIdx + 1]) return parts[rsvpIdx + 1];
  } catch {
    // not a URL
  }

  const match = trimmed.match(/rsvp\/([0-9a-f-]{36})/i);
  return match?.[1] ?? null;
}

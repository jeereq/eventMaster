import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';

const DEFAULT_COMMISSION_RATE = 0.2;

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
  | { type: 'platform'; id: string; name: string | null; referralCode: string; commissionRate: number }
  | { type: 'org'; id: string; name: string | null; referralCode: string; commissionRate: number; parentTenantId: string };

export async function resolveCommercialByReferralCode(referralCode: string): Promise<ResolvedReferral | null> {
  const code = referralCode.trim().toUpperCase();

  const platformCommercial = await prisma.user.findFirst({
    where: { referralCode: code, role: 'COMMERCIAL', tenantId: null },
    select: { id: true, name: true, referralCode: true, commissionRate: true },
  });

  if (platformCommercial?.referralCode) {
    return {
      type: 'platform',
      id: platformCommercial.id,
      name: platformCommercial.name,
      referralCode: platformCommercial.referralCode,
      commissionRate: normalizeCommissionRate(platformCommercial.commissionRate),
    };
  }

  const orgCommercial = await prisma.user.findFirst({
    where: { referralCode: code, role: 'USER', orgRole: 'COMMERCIAL' },
    select: { id: true, name: true, referralCode: true, commissionRate: true, tenantId: true },
  });

  if (orgCommercial?.referralCode && orgCommercial.tenantId) {
    return {
      type: 'org',
      id: orgCommercial.id,
      name: orgCommercial.name,
      referralCode: orgCommercial.referralCode,
      commissionRate: normalizeCommissionRate(orgCommercial.commissionRate),
      parentTenantId: orgCommercial.tenantId,
    };
  }

  return null;
}

export async function recordCommercialCommission(params: {
  tenantId: string;
  plan: PlanType;
  source: string;
  invoiceAmount?: number;
  platformInvoiceId?: string;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: {
      id: true,
      referredByCommercialId: true,
      referredByOrgUserId: true,
    },
  });

  if (!tenant) return null;

  const invoiceAmount =
    params.invoiceAmount ?? parsePlanPrice(getPlanLimits(params.plan).price);

  if (invoiceAmount <= 0) return null;

  const billingPeriod = getBillingPeriod();
  const results = [];

  if (tenant.referredByCommercialId) {
    const commercial = await prisma.user.findUnique({
      where: { id: tenant.referredByCommercialId },
      select: { id: true, commissionRate: true, role: true },
    });

    if (commercial?.role === 'COMMERCIAL') {
      const rate = normalizeCommissionRate(commercial.commissionRate);
      const commissionAmount = Math.round(invoiceAmount * rate);
      results.push(
        await prisma.commercialCommission.upsert({
          where: {
            commercialId_tenantId_billingPeriod: {
              commercialId: commercial.id,
              tenantId: tenant.id,
              billingPeriod,
            },
          },
          create: {
            commercialId: commercial.id,
            tenantId: tenant.id,
            plan: params.plan,
            invoiceAmount,
            commissionRate: rate,
            commissionAmount,
            billingPeriod,
            source: params.source,
            platformInvoiceId: params.platformInvoiceId ?? null,
          },
          update: {
            plan: params.plan,
            invoiceAmount,
            commissionRate: rate,
            commissionAmount,
            source: params.source,
            platformInvoiceId: params.platformInvoiceId ?? undefined,
          },
        }),
      );
    }
  }

  if (tenant.referredByOrgUserId) {
    const orgCommercial = await prisma.user.findFirst({
      where: { id: tenant.referredByOrgUserId, role: 'USER', orgRole: 'COMMERCIAL' },
      select: { id: true, commissionRate: true },
    });

    if (orgCommercial) {
      const rate = normalizeCommissionRate(orgCommercial.commissionRate);
      const commissionAmount = Math.round(invoiceAmount * rate);
      results.push(
        await prisma.commercialCommission.upsert({
          where: {
            commercialId_tenantId_billingPeriod: {
              commercialId: orgCommercial.id,
              tenantId: tenant.id,
              billingPeriod,
            },
          },
          create: {
            commercialId: orgCommercial.id,
            tenantId: tenant.id,
            plan: params.plan,
            invoiceAmount,
            commissionRate: rate,
            commissionAmount,
            billingPeriod,
            source: `${params.source}_ORG`,
            platformInvoiceId: params.platformInvoiceId ?? null,
          },
          update: {
            plan: params.plan,
            invoiceAmount,
            commissionRate: rate,
            commissionAmount,
            source: `${params.source}_ORG`,
            platformInvoiceId: params.platformInvoiceId ?? undefined,
          },
        }),
      );
    }
  }

  return results[0] ?? null;
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

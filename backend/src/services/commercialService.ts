import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';

const COMMISSION_RATE = 0.2;

export function generateReferralCode(name?: string | null): string {
  const prefix = (name || 'COM')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `EM-${prefix}-${suffix}`;
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

export async function ensureCommercialReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, referralCode: true, name: true },
  });

  if (!user || user.role !== 'COMMERCIAL') {
    throw new Error('Utilisateur commercial introuvable.');
  }

  if (user.referralCode) return user.referralCode;

  let code = generateReferralCode(user.name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.user.findUnique({ where: { referralCode: code } });
    if (!existing) break;
    code = generateReferralCode(user.name);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
    select: { referralCode: true },
  });

  return updated.referralCode!;
}

export async function resolveCommercialByReferralCode(referralCode: string) {
  return prisma.user.findFirst({
    where: { referralCode: referralCode.trim().toUpperCase(), role: 'COMMERCIAL' },
    select: { id: true, name: true, referralCode: true },
  });
}

export async function recordCommercialCommission(params: {
  tenantId: string;
  plan: PlanType;
  source: string;
  invoiceAmount?: number;
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { id: true, referredByCommercialId: true },
  });

  if (!tenant?.referredByCommercialId) return null;

  const invoiceAmount =
    params.invoiceAmount ?? parsePlanPrice(getPlanLimits(params.plan).price);

  if (invoiceAmount <= 0) return null;

  const billingPeriod = getBillingPeriod();
  const commissionAmount = Math.round(invoiceAmount * COMMISSION_RATE);

  return prisma.commercialCommission.upsert({
    where: {
      commercialId_tenantId_billingPeriod: {
        commercialId: tenant.referredByCommercialId,
        tenantId: tenant.id,
        billingPeriod,
      },
    },
    create: {
      commercialId: tenant.referredByCommercialId,
      tenantId: tenant.id,
      plan: params.plan,
      invoiceAmount,
      commissionRate: COMMISSION_RATE,
      commissionAmount,
      billingPeriod,
      source: params.source,
    },
    update: {
      plan: params.plan,
      invoiceAmount,
      commissionAmount,
      source: params.source,
    },
  });
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

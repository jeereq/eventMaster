import { PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import {
  createCommercialBillingNotification,
  type CommercialBillingEvent,
} from './platformNotificationService';

function formatAmountFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export { formatAmountFc };

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

  if (tenant.referredByCommercialId) {
    const commercial = await prisma.user.findUnique({
      where: { id: tenant.referredByCommercialId },
      select: { id: true, commissionRate: true, role: true },
    });

    if (commercial?.role === 'COMMERCIAL') {
      const rate = normalizeCommissionRate(commercial.commissionRate);
      const commissionAmount = Math.round(invoiceAmount * rate);
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
        });
      results.push({ commercialId: commercial.id, commissionAmount });
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
        });
      results.push({ commercialId: orgCommercial.id, commissionAmount });
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

  const planName = getPlanLimits(params.plan).name;
  const discountLine =
    params.discountAmount > 0
      ? `\nRéduction accordée : − ${formatAmountFc(params.discountAmount)} (${params.discountPercent} %)\nMontant facturé : ${formatAmountFc(params.finalAmount)}`
      : `\nMontant facturé : ${formatAmountFc(params.finalAmount)}`;

  const event = params.event ?? 'SUBSCRIPTION_APPROVAL';
  const notified: string[] = [];

  for (const contact of contacts) {
    const roleLabel = contact.kind === 'platform' ? 'commercial plateforme' : 'commercial organisation';
    const subject = `EventMaster — Abonnement approuvé pour ${params.tenantName}`;
    const text = [
      `Bonjour${contact.name ? ` ${contact.name}` : ''},`,
      '',
      `L'abonnement de l'organisation « ${params.tenantName} » vient d'être approuvé.`,
      '',
      `Forfait : ${planName} (${params.plan})`,
      `Durée : ${params.durationDays} jours`,
      `Prix catalogue : ${formatAmountFc(params.baseAmount)}`,
      discountLine.trim(),
      params.invoiceNumber ? `Facture : ${params.invoiceNumber}` : '',
      '',
      `Votre commission sera calculée sur le montant facturé (${formatAmountFc(params.finalAmount)}).`,
      '',
      '— EventMaster',
    ]
      .filter(Boolean)
      .join('\n');

    const html = `
      <p>Bonjour${contact.name ? ` ${contact.name}` : ''},</p>
      <p>L'abonnement de l'organisation <strong>${params.tenantName}</strong> vient d'être approuvé.</p>
      <ul>
        <li>Forfait : <strong>${planName}</strong> (${params.plan})</li>
        <li>Durée : ${params.durationDays} jours</li>
        <li>Prix catalogue : ${formatAmountFc(params.baseAmount)}</li>
        ${params.discountAmount > 0 ? `<li>Réduction accordée : <strong style="color:#059669">− ${formatAmountFc(params.discountAmount)} (${params.discountPercent} %)</strong></li>` : ''}
        <li>Montant facturé : <strong>${formatAmountFc(params.finalAmount)}</strong></li>
        ${params.invoiceNumber ? `<li>Facture : ${params.invoiceNumber}</li>` : ''}
      </ul>
      <p style="color:#64748b;font-size:13px;">En tant que ${roleLabel}, votre commission sera calculée sur le montant facturé.</p>
    `;

    const emailResult = await sendRealEmail(contact.email, subject, text, html);
    if (emailResult.success) {
      notified.push(contact.email);
    }

    if (contact.phone) {
      const waBody = `EventMaster — Abonnement approuvé pour ${params.tenantName} (${planName}). Montant facturé : ${formatAmountFc(params.finalAmount)}.${params.discountAmount > 0 ? ` Réduction : ${params.discountPercent}%.` : ''} Votre commission sera mise à jour.`;
      await sendRealWhatsApp(contact.phone, waBody);
    }

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
    } catch (err) {
      console.error('[notifyCommercialsOnSubscriptionApproval] notification in-app:', err);
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

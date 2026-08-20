import { InvoiceType, PlanType } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { prisma } from '../db';
import { getPlanLimits, getEffectiveMonthlyPriceFc, getPlanBaseAmount, periodAmountToInvoiceBase, ANNUAL_DISCOUNT_PERCENT, isAnnualDurationDays } from '../config/plansConfig';
import { parsePlanPrice, getBillingPeriod } from './commercialService';
import { sendRealEmail } from './notificationService';
import { notifyTenantOperators, notifyPlatformStaff } from './platformNotificationService';
import { PLATFORM_NOTIFICATION_TYPE } from '../config/platformNotificationTypes';
import {
  escapeHtml,
  formatAmountFc,
  formatFrenchDate,
  formatFrenchDateRange,
  formatFrenchDateShort,
  normalizeInvoiceText,
} from '../utils/invoiceText';

export { formatAmountFc };

export function getPlanAmount(plan: PlanType, durationDays?: number | null): number {
  if (plan === 'FREE') return 0;
  return getPlanBaseAmount(plan, durationDays);
}

export function getEffectivePlanAmount(plan: PlanType, durationDays?: number | null): number {
  if (plan === 'FREE') return 0;
  return periodAmountToInvoiceBase(getEffectiveMonthlyPriceFc(plan), plan, durationDays);
}

export function computeApprovedAmount(
  baseAmount: number,
  options?: { discountPercent?: number; approvedAmount?: number },
): {
  baseAmount: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
} {
  const base = Math.max(0, Math.round(baseAmount));

  if (options?.approvedAmount !== undefined && options.approvedAmount !== null) {
    const finalAmount = Math.max(0, Math.round(options.approvedAmount));
    const discountAmount = Math.max(0, base - finalAmount);
    const discountPercent = base > 0 ? Math.round((discountAmount / base) * 1000) / 10 : 0;
    return { baseAmount: base, discountPercent, discountAmount, finalAmount };
  }

  const pct = Math.min(100, Math.max(0, options?.discountPercent ?? 0));
  const discountAmount = Math.round(base * (pct / 100));
  const finalAmount = Math.max(0, base - discountAmount);
  return { baseAmount: base, discountPercent: pct, discountAmount, finalAmount };
}

async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const prefix = `EM-INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.platformInvoice.count({
    where: {
      invoiceNumber: { startsWith: prefix },
    },
  });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function getTenantOwner(
  tenantId: string,
): Promise<{ email: string; name: string | null; phone: string | null } | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      manager: { select: { email: true, name: true, phone: true } },
    },
  });
  if (!tenant?.manager?.email) return null;
  return {
    email: tenant.manager.email,
    name: tenant.manager.name,
    phone: tenant.manager.phone,
  };
}

export async function getTenantOwnerEmail(tenantId: string): Promise<{ email: string; name: string | null } | null> {
  const owner = await getTenantOwner(tenantId);
  if (!owner) return null;
  return { email: owner.email, name: owner.name };
}

export async function getTenantBillingRecipients(
  tenantId: string,
  includeManagers = true,
): Promise<Array<{ email: string; name: string | null; role: 'OWNER' | 'MANAGER' }>> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      manager: { select: { email: true, name: true } },
      users: includeManagers
        ? {
            where: { orgRole: 'MANAGER' },
            select: { email: true, name: true },
          }
        : undefined,
    },
  });

  const recipients: Array<{ email: string; name: string | null; role: 'OWNER' | 'MANAGER' }> = [];
  const seen = new Set<string>();

  if (tenant?.manager?.email) {
    const email = tenant.manager.email.toLowerCase();
    seen.add(email);
    recipients.push({ email: tenant.manager.email, name: tenant.manager.name, role: 'OWNER' });
  }

  if (includeManagers && tenant?.users) {
    for (const user of tenant.users) {
      const email = user.email.toLowerCase();
      if (!seen.has(email)) {
        seen.add(email);
        recipients.push({ email: user.email, name: user.name, role: 'MANAGER' });
      }
    }
  }

  return recipients;
}

function renderInvoiceHtml(params: {
  invoiceNumber: string;
  tenantName: string;
  planName: string;
  amount: number;
  currency: string;
  type: InvoiceType;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  durationDays?: number | null;
  recipientName?: string | null;
  baseAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  commissions?: Array<{
    commercialName: string | null;
    commercialEmail: string | null;
    commissionRatePercent: number;
    commissionAmountFormatted: string;
    source: string;
  }>;
}): string {
  const safeTenant = escapeHtml(normalizeInvoiceText(params.tenantName));
  const safePlan = escapeHtml(normalizeInvoiceText(params.planName));
  const safeRecipient = params.recipientName
    ? escapeHtml(normalizeInvoiceText(params.recipientName))
    : '';
  const safeInvoiceNumber = escapeHtml(params.invoiceNumber);

  const discountRows =
    params.discountAmount && params.discountAmount > 0
      ? `<tr><td style="padding:8px 0;color:#64748b;">Prix catalogue</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(formatAmountFc(params.baseAmount ?? params.amount + params.discountAmount))}</td></tr>
         <tr><td style="padding:8px 0;color:#64748b;">Réduction spéciale</td><td style="padding:8px 0;font-weight:600;color:#059669;">- ${escapeHtml(formatAmountFc(params.discountAmount))}${params.discountPercent ? ` (${params.discountPercent} %)` : ''}</td></tr>`
      : '';
  const periodLine =
    params.periodStart && params.periodEnd
      ? `<tr><td style="padding:8px 0;color:#64748b;">Période</td><td style="padding:8px 0;font-weight:600;">${escapeHtml(formatFrenchDateRange(params.periodStart, params.periodEnd))}</td></tr>`
      : params.durationDays
        ? `<tr><td style="padding:8px 0;color:#64748b;">Durée</td><td style="padding:8px 0;font-weight:600;">${params.durationDays} jours</td></tr>`
        : '';

  const commissionRows =
    params.commissions && params.commissions.length > 0
      ? `<tr><td colspan="2" style="padding:12px 0 4px;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;">Commissions commerciales</td></tr>
         ${params.commissions
           .map(
             (c) =>
               `<tr><td style="padding:6px 0;color:#64748b;">${escapeHtml(normalizeInvoiceText(c.commercialName || c.commercialEmail || 'Commercial'))} (${c.commissionRatePercent} %)</td><td style="padding:6px 0;font-weight:600;color:#b45309;">${escapeHtml(c.commissionAmountFormatted)}</td></tr>`,
           )
           .join('')}`
      : '';

  const typeLabel =
    params.type === 'SUBSCRIPTION_APPROVAL'
      ? 'Activation abonnement'
      : params.type === 'RENEWAL'
        ? 'Renouvellement abonnement'
        : 'Paiement abonnement';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Facture ${safeInvoiceNumber}</title>
</head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#4f46e5;color:#fff;padding:24px;">
      <h1 style="margin:0;font-size:20px;">EventMaster - Facture</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${safeInvoiceNumber}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Bonjour${safeRecipient ? ` ${safeRecipient}` : ''},</p>
      <p style="margin:0 0 20px;color:#334155;">Veuillez trouver ci-dessous les détails de votre facture EventMaster.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">Organisation</td><td style="padding:8px 0;font-weight:600;">${safeTenant}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;font-weight:600;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Forfait</td><td style="padding:8px 0;font-weight:600;">${safePlan}</td></tr>
        ${periodLine}
        ${discountRows}
        ${commissionRows}
        <tr><td style="padding:12px 0;color:#64748b;border-top:1px solid #e2e8f0;">Montant TTC</td><td style="padding:12px 0;font-weight:800;font-size:18px;color:#4f46e5;border-top:1px solid #e2e8f0;">${escapeHtml(formatAmountFc(params.amount))}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Pour renouveler ou mettre à jour votre abonnement, connectez-vous à votre espace EventMaster, section Facturation.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderInvoiceText(params: {
  invoiceNumber: string;
  tenantName: string;
  planName: string;
  amount: number;
  periodStart?: Date | null;
  periodEnd?: Date | null;
  durationDays?: number | null;
  baseAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  commissions?: Array<{
    commercialName: string | null;
    commercialEmail: string | null;
    commissionRatePercent: number;
    commissionAmountFormatted: string;
  }>;
}): string {
  const lines = [
    `Facture EventMaster - ${normalizeInvoiceText(params.invoiceNumber)}`,
    `Organisation : ${normalizeInvoiceText(params.tenantName)}`,
    `Forfait : ${normalizeInvoiceText(params.planName)}`,
  ];
  if (params.discountAmount && params.discountAmount > 0) {
    lines.push(`Prix catalogue : ${formatAmountFc(params.baseAmount ?? params.amount + params.discountAmount)}`);
    lines.push(
      `Réduction spéciale : - ${formatAmountFc(params.discountAmount)}${params.discountPercent ? ` (${params.discountPercent} %)` : ''}`,
    );
  }
  if (params.commissions?.length) {
    lines.push('Commissions commerciales :');
    for (const c of params.commissions) {
      lines.push(
        `  - ${normalizeInvoiceText(c.commercialName || c.commercialEmail || 'Commercial')} (${c.commissionRatePercent} %) : ${c.commissionAmountFormatted}`,
      );
    }
  }
  lines.push(`Montant : ${formatAmountFc(params.amount)}`);
  if (params.periodStart && params.periodEnd) {
    lines.push(`Période : ${formatFrenchDateRange(params.periodStart, params.periodEnd)}`);
  } else if (params.durationDays) {
    lines.push(`Durée : ${params.durationDays} jours`);
  }
  return lines.join('\n');
}

export async function createAndSendInvoice(params: {
  tenantId: string;
  plan: PlanType;
  type: InvoiceType;
  amount?: number;
  baseAmount?: number;
  discountPercent?: number;
  discountAmount?: number;
  durationDays?: number;
  periodStart?: Date;
  periodEnd?: Date;
  subscriptionRequestId?: string;
  includeManagers?: boolean;
  status?: 'SENT' | 'PAID' | 'PENDING';
}) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: params.tenantId },
    select: { id: true, name: true, plan: true },
  });

  if (!tenant) {
    throw new Error('Organisation introuvable.');
  }

  const amount = params.amount ?? getPlanAmount(params.plan, params.durationDays);
  if (amount <= 0 && params.plan !== 'FREE') {
    console.warn(`[Invoice Service] Montant nul pour le plan ${params.plan}, facture ignorée.`);
  }

  const includeManagers = params.includeManagers ?? params.type === 'SUBSCRIPTION_APPROVAL';
  const recipients = await getTenantBillingRecipients(params.tenantId, includeManagers);

  if (recipients.length === 0) {
    console.warn(`[Invoice Service] Aucun destinataire pour le tenant ${params.tenantId}.`);
    return null;
  }

  const invoiceNumber = await generateInvoiceNumber();
  const planDef = getPlanLimits(params.plan);
  const billingPeriod = getBillingPeriod(params.periodStart ?? new Date());
  const now = new Date();

  const invoice = await prisma.platformInvoice.create({
    data: {
      invoiceNumber,
      tenantId: params.tenantId,
      plan: params.plan,
      amount,
      type: params.type,
      status: params.status ?? 'SENT',
      durationDays: params.durationDays ?? null,
      periodStart: params.periodStart ?? null,
      periodEnd: params.periodEnd ?? null,
      billingPeriod,
      subscriptionRequestId: params.subscriptionRequestId ?? null,
      recipientEmails: recipients.map((r) => r.email),
      details: {
        planName: planDef.name,
        planPriceLabel: planDef.price,
        tenantName: tenant.name,
        baseAmount: params.baseAmount ?? amount,
        discountPercent: params.discountPercent ?? 0,
        discountAmount: params.discountAmount ?? 0,
      },
      sentAt: now,
    },
  });

  const subject =
    params.type === 'RENEWAL'
      ? `EventMaster - Facture de renouvellement ${invoiceNumber}`
      : `EventMaster - Facture abonnement ${invoiceNumber}`;

  for (const recipient of recipients) {
    const html = renderInvoiceHtml({
      invoiceNumber,
      tenantName: tenant.name,
      planName: planDef.name,
      amount,
      currency: 'FC',
      type: params.type,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      durationDays: params.durationDays,
      recipientName: recipient.name,
      baseAmount: params.baseAmount,
      discountPercent: params.discountPercent,
      discountAmount: params.discountAmount,
    });
    const text = renderInvoiceText({
      invoiceNumber,
      tenantName: tenant.name,
      planName: planDef.name,
      amount,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      durationDays: params.durationDays,
      baseAmount: params.baseAmount,
      discountPercent: params.discountPercent,
      discountAmount: params.discountAmount,
    });

    const result = await sendRealEmail(recipient.email, subject, text, html);
    if (result.success) {
      console.log(`[Invoice Service] Facture ${invoiceNumber} envoyée à ${recipient.email} via SendGrid`);
    } else {
      console.error(`[Invoice Service] Échec envoi facture ${invoiceNumber} à ${recipient.email}: ${result.error}`);
    }
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  void notifyTenantOperators(params.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.INVOICE_ISSUED,
    title: `Facture ${invoiceNumber}`,
    message: `${planDef.name} — ${formatAmountFc(amount)}. Consultez Factures pour le PDF.`,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber,
      href: `${frontendUrl}/dashboard/invoices`,
    },
    channels: ['IN_APP', 'PUSH', 'WHATSAPP'],
  });

  return invoice;
}

export async function sendLicenseExpiryWarning(params: {
  tenantId: string;
  tenantName: string;
  plan: PlanType;
  expiresAt: Date;
  ownerEmail: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  durationDays?: number | null;
}) {
  const planDef = getPlanLimits(params.plan);
  const durationDays = params.durationDays ?? undefined;
  const amount = getPlanAmount(params.plan, durationDays);
  const discountPercent = isAnnualDurationDays(durationDays) ? ANNUAL_DISCOUNT_PERCENT : 0;
  const payable =
    discountPercent > 0
      ? computeApprovedAmount(amount, { discountPercent }).finalAmount
      : amount;
  const expiryStr = formatFrenchDate(params.expiresAt);

  const subject = 'EventMaster - Votre abonnement expire dans 7 jours';
  const safeTenant = escapeHtml(normalizeInvoiceText(params.tenantName));
  const safePlan = escapeHtml(normalizeInvoiceText(planDef.name));
  const operatorMessage = `« ${params.tenantName} » (${planDef.name}) expire le ${expiryStr}. Renouvelez depuis Facturation.`;

  const text = [
    `L'abonnement de l'organisation « ${normalizeInvoiceText(params.tenantName)} » (forfait ${normalizeInvoiceText(planDef.name)}) expire le ${expiryStr}.`,
    `Montant du renouvellement : ${formatAmountFc(payable)}.`,
    '',
    'Connectez-vous a EventMaster pour soumettre une demande de renouvellement ou mettre a jour votre paiement.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
    <h2 style="margin:0 0 16px;color:#b45309;">Rappel - expiration dans 7 jours</h2>
    <p>L'abonnement de <strong>${safeTenant}</strong> (forfait <strong>${safePlan}</strong>) expire le <strong>${escapeHtml(expiryStr)}</strong>.</p>
    <p>Montant estime du renouvellement : <strong style="color:#4f46e5;">${escapeHtml(formatAmountFc(payable))}</strong>.</p>
    <p style="color:#64748b;font-size:14px;">Connectez-vous a EventMaster, section Facturation, pour renouveler avant la date limite.</p>
  </div>
</body>
</html>`;

  const waBody = [
    'EventMaster - Rappel abonnement',
    '',
    `L'organisation « ${normalizeInvoiceText(params.tenantName)} » (${normalizeInvoiceText(planDef.name)}) expire le ${expiryStr}.`,
    `Renouvellement estime : ${formatAmountFc(payable)}.`,
    'Connectez-vous a EventMaster, section Facturation, pour renouveler.',
  ].join('\n');

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const expiryIso = params.expiresAt.toISOString().slice(0, 10);
  void notifyTenantOperators(params.tenantId, {
    type: PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
    title: 'Licence : expiration dans 7 jours',
    message: operatorMessage,
    metadata: {
      tenantId: params.tenantId,
      expiresAt: expiryIso,
      href: `${frontendUrl}/dashboard/billing`,
    },
    email: { subject, text, html },
    whatsapp: waBody,
  });
  void notifyPlatformStaff({
    type: PLATFORM_NOTIFICATION_TYPE.LICENSE_EXPIRING,
    title: `Licence J-7 — ${params.tenantName}`,
    message: `Le forfait ${planDef.name} expire le ${expiryStr}.`,
    metadata: {
      tenantId: params.tenantId,
      expiresAt: expiryIso,
      href: `${frontendUrl}/dashboard?tab=tenants`,
    },
  });
}

const INVOICE_TYPE_LABELS: Record<string, string> = {
  SUBSCRIPTION_APPROVAL: 'Approbation abonnement',
  RENEWAL: 'Renouvellement',
  PAYMENT: 'Paiement',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  SENT: 'Envoyée',
  PAID: 'Payée',
  PENDING: 'En attente',
};

type InvoiceCommissionRecord = {
  id: string;
  commissionRate: number;
  commissionAmount: number;
  source: string;
  commercial?: { name: string | null; email: string } | null;
};

function formatInvoiceCommissions(commissions?: InvoiceCommissionRecord[]) {
  if (!commissions?.length) return [];
  return commissions.map((c) => ({
    id: c.id,
    commercialName: c.commercial?.name ?? null,
    commercialEmail: c.commercial?.email ?? null,
    commissionRate: c.commissionRate,
    commissionRatePercent: Math.round(c.commissionRate * 1000) / 10,
    commissionAmount: c.commissionAmount,
    commissionAmountFormatted: formatAmountFc(c.commissionAmount),
    source: c.source,
  }));
}

export function formatInvoiceForApi(invoice: {
  id: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  billingPeriod: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  durationDays: number | null;
  sentAt: Date | null;
  createdAt: Date;
  tenant?: { name: string } | null;
  commercialCommissions?: InvoiceCommissionRecord[];
}) {
  const commissions = formatInvoiceCommissions(invoice.commercialCommissions);
  const totalCommission = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    plan: invoice.plan,
    amount: invoice.amount,
    amountFormatted: formatAmountFc(invoice.amount),
    currency: invoice.currency,
    type: invoice.type,
    typeLabel: INVOICE_TYPE_LABELS[invoice.type] || invoice.type,
    status: invoice.status,
    statusLabel: INVOICE_STATUS_LABELS[invoice.status] || invoice.status,
    billingPeriod: invoice.billingPeriod,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    durationDays: invoice.durationDays,
    sentAt: invoice.sentAt,
    createdAt: invoice.createdAt,
    tenantName: invoice.tenant?.name ?? null,
    commissions,
    totalCommission: totalCommission > 0 ? totalCommission : null,
    totalCommissionFormatted: totalCommission > 0 ? formatAmountFc(totalCommission) : null,
    hasCommission: commissions.length > 0,
  };
}

type InvoiceWithTenant = {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  plan: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  billingPeriod: string;
  periodStart: Date | null;
  periodEnd: Date | null;
  durationDays: number | null;
  sentAt: Date | null;
  createdAt: Date;
  recipientEmails: unknown;
  details: unknown;
  tenant?: { name: string } | null;
  commercialCommissions?: InvoiceCommissionRecord[];
};

export function formatInvoiceDetailForApi(invoice: InvoiceWithTenant) {
  const base = formatInvoiceForApi(invoice);
  const details = invoice.details as { planName?: string; tenantName?: string; planPriceLabel?: string } | null;
  const recipientEmails = Array.isArray(invoice.recipientEmails)
    ? (invoice.recipientEmails as string[])
    : [];

  return {
    ...base,
    tenantId: invoice.tenantId,
    tenantName: invoice.tenant?.name ?? details?.tenantName ?? null,
    planName: details?.planName ?? invoice.plan,
    planPriceLabel: details?.planPriceLabel ?? null,
    recipientEmails,
  };
}

export async function findInvoiceById(invoiceId: string) {
  return prisma.platformInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      tenant: { select: { name: true } },
      commercialCommissions: {
        include: {
          commercial: { select: { name: true, email: true } },
        },
      },
    },
  });
}

export async function markInvoicePaid(params: {
  invoiceId: string;
  paidByUserId: string;
  reason: string;
}) {
  const invoice = await findInvoiceById(params.invoiceId);
  if (!invoice) return { error: 'NOT_FOUND' as const };
  if (invoice.status === 'PAID') return { error: 'ALREADY_PAID' as const };

  const details =
    invoice.details && typeof invoice.details === 'object' && !Array.isArray(invoice.details)
      ? (invoice.details as Record<string, unknown>)
      : {};

  const updated = await prisma.platformInvoice.update({
    where: { id: invoice.id },
    data: {
      status: 'PAID',
      details: {
        ...details,
        paidAt: new Date().toISOString(),
        paidByUserId: params.paidByUserId,
        paidReason: params.reason.slice(0, 500),
      },
    },
    include: {
      tenant: { select: { name: true } },
      commercialCommissions: {
        include: {
          commercial: { select: { name: true, email: true } },
        },
      },
    },
  });

  return { invoice: updated };
}

function getInvoicePlanName(invoice: InvoiceWithTenant): string {
  const details = invoice.details as { planName?: string } | null;
  return details?.planName ?? getPlanLimits(invoice.plan as PlanType).name;
}

export function buildInvoicePdf(invoice: InvoiceWithTenant): Promise<Buffer> {
  const planName = normalizeInvoiceText(getInvoicePlanName(invoice));
  const tenantName = normalizeInvoiceText(invoice.tenant?.name ?? 'Organisation');
  const typeLabel = normalizeInvoiceText(INVOICE_TYPE_LABELS[invoice.type] || invoice.type);
  const statusLabel = normalizeInvoiceText(INVOICE_STATUS_LABELS[invoice.status] || invoice.status);
  const commissions = formatInvoiceCommissions(invoice.commercialCommissions);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#4f46e5').text('EventMaster', { align: 'left' });
    doc.fontSize(10).font('Helvetica').fillColor('#64748b').text("Facture d'abonnement", { align: 'left' });
    doc.moveDown(1);

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#0f172a').text(normalizeInvoiceText(invoice.invoiceNumber));
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#64748b');
    doc.text(`Émise le ${formatFrenchDate(invoice.createdAt)}`);
    if (invoice.sentAt) {
      doc.text(`Envoyée le ${formatFrenchDate(invoice.sentAt)}`);
    }
    doc.moveDown(1.5);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Organisation');
    doc.fontSize(11).font('Helvetica').fillColor('#334155').text(tenantName);
    doc.moveDown(1);

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Détails');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica').fillColor('#334155');
    doc.text(`Type : ${typeLabel}`);
    doc.text(`Forfait : ${planName} (${invoice.plan})`);
    doc.text(`Statut : ${statusLabel}`);
    doc.text(`Période de facturation : ${normalizeInvoiceText(invoice.billingPeriod)}`);

    if (invoice.periodStart && invoice.periodEnd) {
      doc.text(`Couverture : ${formatFrenchDateRange(invoice.periodStart, invoice.periodEnd)}`);
    } else if (invoice.durationDays) {
      doc.text(`Durée : ${invoice.durationDays} jours`);
    }

    const details = invoice.details as {
      baseAmount?: number;
      discountPercent?: number;
      discountAmount?: number;
    } | null;
    if (details?.discountAmount && details.discountAmount > 0) {
      doc.fontSize(11).font('Helvetica').fillColor('#334155');
      doc.text(`Prix catalogue : ${formatAmountFc(details.baseAmount ?? invoice.amount + details.discountAmount)}`);
      doc.text(
        `Réduction spéciale : - ${formatAmountFc(details.discountAmount)}${details.discountPercent ? ` (${details.discountPercent} %)` : ''}`,
      );
      doc.moveDown(0.5);
    }

    if (commissions.length > 0) {
      doc.moveDown(0.5);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0f172a').text('Commissions commerciales');
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      for (const c of commissions) {
        const label = normalizeInvoiceText(c.commercialName || c.commercialEmail || 'Commercial');
        doc.text(`  ${label} (${c.commissionRatePercent} %) : ${c.commissionAmountFormatted}`);
      }
      doc.moveDown(0.5);
    }

    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#4f46e5');
    doc.text(`Montant TTC : ${formatAmountFc(invoice.amount)}`, { align: 'right' });
    doc.moveDown(2);

    const recipients = Array.isArray(invoice.recipientEmails)
      ? (invoice.recipientEmails as string[])
      : [];
    if (recipients.length > 0) {
      doc.fontSize(10).font('Helvetica').fillColor('#64748b');
      doc.text(`Destinataires : ${recipients.map((e) => normalizeInvoiceText(e)).join(', ')}`);
    }

    doc.moveDown(2);
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8');
    doc.text(
      'Document généré par EventMaster. Pour renouveler votre abonnement, connectez-vous à votre espace Facturation.',
      { align: 'center' },
    );

    doc.end();
  });
}

export async function resendInvoiceByEmail(invoiceId: string, targetEmail?: string) {
  const invoice = await findInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error('Facture introuvable.');
  }

  const planName = getInvoicePlanName(invoice);
  const tenantName = invoice.tenant?.name ?? 'Organisation';
  const emails = targetEmail
    ? [targetEmail.trim()]
    : (Array.isArray(invoice.recipientEmails) ? (invoice.recipientEmails as string[]) : []);

  if (emails.length === 0) {
    throw new Error('Aucun destinataire e-mail disponible.');
  }

  const subject =
    invoice.type === 'RENEWAL'
      ? `EventMaster - Facture de renouvellement ${invoice.invoiceNumber}`
      : `EventMaster - Facture abonnement ${invoice.invoiceNumber}`;

  const results: Array<{ email: string; success: boolean; error?: string }> = [];

  const details = invoice.details as {
    baseAmount?: number;
    discountPercent?: number;
    discountAmount?: number;
  } | null;

  const commissions = formatInvoiceCommissions(invoice.commercialCommissions);

  for (const email of emails) {
    const html = renderInvoiceHtml({
      invoiceNumber: invoice.invoiceNumber,
      tenantName,
      planName,
      amount: invoice.amount,
      currency: invoice.currency,
      type: invoice.type as InvoiceType,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      durationDays: invoice.durationDays,
      baseAmount: details?.baseAmount,
      discountPercent: details?.discountPercent,
      discountAmount: details?.discountAmount,
      commissions,
    });
    const text = renderInvoiceText({
      invoiceNumber: invoice.invoiceNumber,
      tenantName,
      planName,
      amount: invoice.amount,
      periodStart: invoice.periodStart,
      periodEnd: invoice.periodEnd,
      durationDays: invoice.durationDays,
      baseAmount: details?.baseAmount,
      discountPercent: details?.discountPercent,
      discountAmount: details?.discountAmount,
      commissions,
    });

    const result = await sendRealEmail(email, subject, text, html);
    results.push({ email, success: result.success, error: result.error });
  }

  const sent = results.filter((r) => r.success).map((r) => r.email);
  if (sent.length === 0) {
    throw new Error(results[0]?.error || 'Échec de l\'envoi par e-mail.');
  }

  return { sentTo: sent, results };
}

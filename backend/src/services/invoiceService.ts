import { InvoiceType, PlanType } from '@prisma/client';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { parsePlanPrice, getBillingPeriod } from './commercialService';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';

export function formatAmountFc(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FC`;
}

export function getPlanAmount(plan: PlanType): number {
  if (plan === 'FREE') return 0;
  return parsePlanPrice(getPlanLimits(plan).price);
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
}): string {
  const periodLine =
    params.periodStart && params.periodEnd
      ? `<tr><td style="padding:8px 0;color:#64748b;">Période</td><td style="padding:8px 0;font-weight:600;">${params.periodStart.toLocaleDateString('fr-FR')} → ${params.periodEnd.toLocaleDateString('fr-FR')}</td></tr>`
      : params.durationDays
        ? `<tr><td style="padding:8px 0;color:#64748b;">Durée</td><td style="padding:8px 0;font-weight:600;">${params.durationDays} jours</td></tr>`
        : '';

  const typeLabel =
    params.type === 'SUBSCRIPTION_APPROVAL'
      ? 'Activation abonnement'
      : params.type === 'RENEWAL'
        ? 'Renouvellement abonnement'
        : 'Paiement abonnement';

  return `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
    <div style="background:#4f46e5;color:#fff;padding:24px;">
      <h1 style="margin:0;font-size:20px;">EventMaster — Facture</h1>
      <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">${params.invoiceNumber}</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px;">Bonjour${params.recipientName ? ` ${params.recipientName}` : ''},</p>
      <p style="margin:0 0 20px;color:#334155;">Veuillez trouver ci-dessous les détails de votre facture EventMaster.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#64748b;">Organisation</td><td style="padding:8px 0;font-weight:600;">${params.tenantName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;font-weight:600;">${typeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Forfait</td><td style="padding:8px 0;font-weight:600;">${params.planName}</td></tr>
        ${periodLine}
        <tr><td style="padding:12px 0;color:#64748b;border-top:1px solid #e2e8f0;">Montant TTC</td><td style="padding:12px 0;font-weight:800;font-size:18px;color:#4f46e5;border-top:1px solid #e2e8f0;">${formatAmountFc(params.amount)}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Pour renouveler ou mettre à jour votre abonnement, connectez-vous à votre espace EventMaster → Facturation.</p>
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
}): string {
  const lines = [
    `Facture EventMaster — ${params.invoiceNumber}`,
    `Organisation : ${params.tenantName}`,
    `Forfait : ${params.planName}`,
    `Montant : ${formatAmountFc(params.amount)}`,
  ];
  if (params.periodStart && params.periodEnd) {
    lines.push(`Période : ${params.periodStart.toLocaleDateString('fr-FR')} → ${params.periodEnd.toLocaleDateString('fr-FR')}`);
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

  const amount = params.amount ?? getPlanAmount(params.plan);
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
      },
      sentAt: now,
    },
  });

  const subject =
    params.type === 'RENEWAL'
      ? `EventMaster — Facture de renouvellement ${invoiceNumber}`
      : `EventMaster — Facture abonnement ${invoiceNumber}`;

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
    });
    const text = renderInvoiceText({
      invoiceNumber,
      tenantName: tenant.name,
      planName: planDef.name,
      amount,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
      durationDays: params.durationDays,
    });

    const result = await sendRealEmail(recipient.email, subject, text, html);
    if (result.success) {
      console.log(`[Invoice Service] Facture ${invoiceNumber} envoyée à ${recipient.email} via SendGrid`);
    } else {
      console.error(`[Invoice Service] Échec envoi facture ${invoiceNumber} à ${recipient.email}: ${result.error}`);
    }
  }

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
}) {
  const planDef = getPlanLimits(params.plan);
  const amount = getPlanAmount(params.plan);
  const expiryStr = params.expiresAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const subject = `EventMaster — Votre abonnement expire dans 7 jours`;
  const text = [
    `Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},`,
    '',
    `L'abonnement de l'organisation « ${params.tenantName} » (forfait ${planDef.name}) expire le ${expiryStr}.`,
    `Montant du renouvellement : ${formatAmountFc(amount)}.`,
    '',
    'Connectez-vous à EventMaster pour soumettre une demande de renouvellement ou mettre à jour votre paiement.',
  ].join('\n');

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Segoe UI,Arial,sans-serif;background:#f8fafc;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;">
    <h2 style="margin:0 0 16px;color:#b45309;">Rappel — expiration dans 7 jours</h2>
    <p>Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},</p>
    <p>L'abonnement de <strong>${params.tenantName}</strong> (forfait <strong>${planDef.name}</strong>) expire le <strong>${expiryStr}</strong>.</p>
    <p>Montant estimé du renouvellement : <strong style="color:#4f46e5;">${formatAmountFc(amount)}</strong>.</p>
    <p style="color:#64748b;font-size:14px;">Connectez-vous à EventMaster → Facturation pour renouveler avant la date limite.</p>
  </div>
</body>
</html>`;

  const emailResult = await sendRealEmail(params.ownerEmail, subject, text, html);
  if (!emailResult.success) {
    console.error(`[Invoice Service] Échec e-mail rappel J-7 à ${params.ownerEmail}: ${emailResult.error}`);
  }

  if (params.ownerPhone?.trim()) {
    const waBody = [
      `EventMaster — Rappel abonnement`,
      '',
      `Bonjour${params.ownerName ? ` ${params.ownerName}` : ''},`,
      `L'organisation « ${params.tenantName} » (${planDef.name}) expire le ${expiryStr}.`,
      `Renouvellement estimé : ${formatAmountFc(amount)}.`,
      'Connectez-vous à EventMaster → Facturation pour renouveler.',
    ].join('\n');

    const waResult = await sendRealWhatsApp(params.ownerPhone, waBody);
    if (waResult.success && !waResult.simulated) {
      console.log(`[Invoice Service] Rappel J-7 WhatsApp envoyé à ${params.ownerPhone}`);
    } else if (!waResult.success) {
      console.error(`[Invoice Service] Échec WhatsApp rappel J-7: ${waResult.error}`);
    }
  }
}

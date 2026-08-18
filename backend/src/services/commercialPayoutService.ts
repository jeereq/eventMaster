import { prisma } from '../db';
import { getBillingPeriod, formatAmountFc } from './commercialService';
import { sendRealEmail, sendRealWhatsApp } from './notificationService';
import {
  createPlatformNotification,
  hasNotificationForPeriod,
} from './platformNotificationService';

export const MONTHLY_PAYOUT_TYPE = 'MONTHLY_COMMISSION_DUE';
export const MONTHLY_PAYOUT_PAID_TYPE = 'MONTHLY_COMMISSION_PAID';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export function previousBillingPeriod(from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() - 1, 1);
  return getBillingPeriod(d);
}

export function formatBillingPeriodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  if (!year || !month) return period;
  const label = new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type MonthlyPayoutRow = {
  commercialId: string;
  name: string | null;
  email: string;
  phone: string | null;
  referralCode: string | null;
  kind: 'platform' | 'org';
  totalCommission: number;
  unpaidCommission: number;
  paidCommission: number;
  orgCount: number;
};

export async function listMonthlyPayouts(period: string): Promise<MonthlyPayoutRow[]> {
  const commissions = await prisma.commercialCommission.findMany({
    where: { billingPeriod: period },
    include: {
      commercial: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          referralCode: true,
          role: true,
          tenantId: true,
          orgRole: true,
        },
      },
    },
  });

  const map = new Map<string, MonthlyPayoutRow>();
  for (const row of commissions) {
    const kind: 'platform' | 'org' =
      row.commercial.role === 'COMMERCIAL' && !row.commercial.tenantId ? 'platform' : 'org';
    const current = map.get(row.commercialId) || {
      commercialId: row.commercialId,
      name: row.commercial.name,
      email: row.commercial.email,
      phone: row.commercial.phone,
      referralCode: row.commercial.referralCode,
      kind,
      totalCommission: 0,
      unpaidCommission: 0,
      paidCommission: 0,
      orgCount: 0,
    };
    current.totalCommission += row.commissionAmount;
    current.orgCount += 1;
    if (row.paidAt) current.paidCommission += row.commissionAmount;
    else current.unpaidCommission += row.commissionAmount;
    map.set(row.commercialId, current);
  }

  return Array.from(map.values()).sort((a, b) => b.unpaidCommission - a.unpaidCommission || b.totalCommission - a.totalCommission);
}

async function notifyOneCommercial(row: MonthlyPayoutRow, period: string, force: boolean) {
  if (row.unpaidCommission <= 0 && !force) return { emailed: false, skipped: true };

  const already = force
    ? false
    : await hasNotificationForPeriod({ userId: row.commercialId, type: MONTHLY_PAYOUT_TYPE, period });
  if (already) return { emailed: false, skipped: true };

  const periodLabel = formatBillingPeriodLabel(period);
  const amount = formatAmountFc(row.unpaidCommission || row.totalCommission);
  const href = row.kind === 'platform' ? `${FRONTEND_URL}/dashboard/commercial` : `${FRONTEND_URL}/dashboard/org-commercial`;
  const payer = row.kind === 'platform' ? 'EventMaster (Super Admin)' : 'votre organisation parrainante';

  const subject = `EventMaster — Commission ${periodLabel} : ${amount}`;
  const text = [
    `Bonjour${row.name ? ` ${row.name}` : ''},`,
    '',
    `Récapitulatif de vos commissions pour ${periodLabel}.`,
    `Montant à verser : ${amount}`,
    `Organisations facturées : ${row.orgCount}`,
    '',
    `Le versement est hors plateforme, effectué par ${payer}.`,
    '',
    `Suivi : ${href}`,
    '',
    '— EventMaster',
  ].join('\n');

  const html = `
    <p>Bonjour${row.name ? ` ${row.name}` : ''},</p>
    <p>Récapitulatif de vos commissions pour <strong>${periodLabel}</strong>.</p>
    <ul>
      <li>Montant à verser : <strong>${amount}</strong></li>
      <li>Organisations facturées : ${row.orgCount}</li>
    </ul>
    <p style="color:#64748b;font-size:13px;">Le versement est hors plateforme, effectué par ${payer}.</p>
    <p><a href="${href}">Ouvrir le suivi des commissions</a></p>
  `;

  const emailResult = await sendRealEmail(row.email, subject, text, html);
  if (row.phone) {
    await sendRealWhatsApp(
      row.phone,
      `EventMaster — Commission ${periodLabel} : ${amount} à verser par ${payer}. ${row.orgCount} org. facturée(s).`,
    );
  }

  await createPlatformNotification({
    userId: row.commercialId,
    type: MONTHLY_PAYOUT_TYPE,
    title: `Commission ${periodLabel}`,
    message: `${amount} à verser (${row.orgCount} organisation${row.orgCount > 1 ? 's' : ''}). Paiement hors plateforme par ${payer}.`,
    metadata: {
      period,
      amount: row.unpaidCommission || row.totalCommission,
      orgCount: row.orgCount,
      href,
    },
  });

  return { emailed: emailResult.success, skipped: false };
}

async function notifySuperAdmins(rows: MonthlyPayoutRow[], period: string, force: boolean) {
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (admins.length === 0) return { notified: [] as string[] };

  const unpaid = rows.reduce((sum, row) => sum + row.unpaidCommission, 0);
  const total = rows.reduce((sum, row) => sum + row.totalCommission, 0);
  const dueRows = rows.filter((row) => row.unpaidCommission > 0);
  if (unpaid <= 0 && !force) return { notified: [] as string[] };

  const periodLabel = formatBillingPeriodLabel(period);
  const href = `${FRONTEND_URL}/dashboard?tab=analytics&section=revenus`;
  const lines = dueRows
    .slice(0, 12)
    .map((row) => `  - ${row.name || row.email} (${row.kind === 'platform' ? 'plateforme' : 'org'}) : ${formatAmountFc(row.unpaidCommission)}`)
    .join('\n');

  const notified: string[] = [];
  for (const admin of admins) {
    const already = force
      ? false
      : await hasNotificationForPeriod({ userId: admin.id, type: MONTHLY_PAYOUT_TYPE, period });
    if (already) continue;

    const subject = `EventMaster — Versements commerciaux ${periodLabel} : ${formatAmountFc(unpaid)}`;
    const text = [
      `Bonjour${admin.name ? ` ${admin.name}` : ''},`,
      '',
      `Commissions commerciales dues pour ${periodLabel} : ${formatAmountFc(unpaid)} (total du mois ${formatAmountFc(total)}).`,
      `${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} à régler hors plateforme.`,
      '',
      lines,
      '',
      `Ouvrir le rapport : ${href}`,
      '',
      '— EventMaster',
    ].join('\n');

    const html = `
      <p>Bonjour${admin.name ? ` ${admin.name}` : ''},</p>
      <p>Commissions commerciales <strong>dues</strong> pour <strong>${periodLabel}</strong> :
        <strong>${formatAmountFc(unpaid)}</strong> (total du mois ${formatAmountFc(total)}).</p>
      <p>${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} à régler hors plateforme.</p>
      <ul>
        ${dueRows
          .slice(0, 12)
          .map(
            (row) =>
              `<li>${row.name || row.email} (${row.kind === 'platform' ? 'plateforme' : 'org'}) — <strong>${formatAmountFc(row.unpaidCommission)}</strong></li>`,
          )
          .join('')}
      </ul>
      <p><a href="${href}">Ouvrir Revenus &amp; commissions</a></p>
    `;

    const emailResult = await sendRealEmail(admin.email, subject, text, html);
    if (emailResult.success) notified.push(admin.email);
    if (admin.phone) {
      await sendRealWhatsApp(
        admin.phone,
        `EventMaster — Versements commerciaux ${periodLabel} : ${formatAmountFc(unpaid)} dus (${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''}). ${href}`,
      );
    }

    await createPlatformNotification({
      userId: admin.id,
      type: MONTHLY_PAYOUT_TYPE,
      title: `Versements dus — ${periodLabel}`,
      message: `${formatAmountFc(unpaid)} à verser à ${dueRows.length} commercial${dueRows.length > 1 ? 'aux' : ''} (hors plateforme).`,
      metadata: {
        period,
        unpaidCommission: unpaid,
        totalCommission: total,
        commercialCount: dueRows.length,
        href,
      },
    });
  }

  return { notified };
}

export async function notifyMonthlyCommissionPayouts(options?: {
  period?: string;
  force?: boolean;
}) {
  const period = options?.period || previousBillingPeriod();
  const force = Boolean(options?.force);
  const rows = await listMonthlyPayouts(period);

  const commercials: Array<{ email: string; skipped: boolean }> = [];
  for (const row of rows) {
    const result = await notifyOneCommercial(row, period, force);
    commercials.push({ email: row.email, skipped: result.skipped });
  }

  const admins = await notifySuperAdmins(rows, period, force);
  const unpaid = rows.reduce((sum, row) => sum + row.unpaidCommission, 0);

  return {
    period,
    periodLabel: formatBillingPeriodLabel(period),
    unpaidCommission: unpaid,
    commercialCount: rows.filter((row) => row.unpaidCommission > 0).length,
    commercialsNotified: commercials.filter((c) => !c.skipped).length,
    adminsNotified: admins.notified,
  };
}

export async function markCommercialPeriodPaid(params: {
  commercialId: string;
  period: string;
  paidByUserId: string;
}) {
  const now = new Date();
  const result = await prisma.commercialCommission.updateMany({
    where: {
      commercialId: params.commercialId,
      billingPeriod: params.period,
      paidAt: null,
    },
    data: {
      paidAt: now,
      paidByUserId: params.paidByUserId,
    },
  });

  if (result.count === 0) {
    return { updated: 0 };
  }

  const commercial = await prisma.user.findUnique({
    where: { id: params.commercialId },
    select: { id: true, name: true, email: true, phone: true, role: true, tenantId: true },
  });
  if (commercial) {
    const rows = await listMonthlyPayouts(params.period);
    const row = rows.find((item) => item.commercialId === params.commercialId);
    const amount = formatAmountFc(row?.paidCommission || 0);
    const periodLabel = formatBillingPeriodLabel(params.period);
    const href =
      commercial.role === 'COMMERCIAL' && !commercial.tenantId
        ? `${FRONTEND_URL}/dashboard/commercial`
        : `${FRONTEND_URL}/dashboard/org-commercial`;

    await createPlatformNotification({
      userId: commercial.id,
      type: MONTHLY_PAYOUT_PAID_TYPE,
      title: `Versement effectué — ${periodLabel}`,
      message: `${amount} marqué comme versé par EventMaster.`,
      metadata: { period: params.period, href },
    });

    const text = `Bonjour${commercial.name ? ` ${commercial.name}` : ''},\n\nVotre commission ${periodLabel} (${amount}) a été marquée comme versée.\n\n— EventMaster`;
    await sendRealEmail(commercial.email, `EventMaster — Versement ${periodLabel} effectué`, text);
    if (commercial.phone) {
      await sendRealWhatsApp(
        commercial.phone,
        `EventMaster — Versement ${periodLabel} effectué : ${amount}.`,
      );
    }
  }

  return { updated: result.count };
}

export function shouldAutoNotifyMonthlyPayouts(now = new Date()) {
  return now.getDate() <= 3;
}

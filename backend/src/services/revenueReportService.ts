import PDFDocument from 'pdfkit';
import { prisma } from '../db';
import { getBillingPeriod } from './commercialService';
import { formatAmountFc } from './invoiceService';

export function parseBillingPeriod(input?: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return getBillingPeriod();
}

export async function buildRevenueReport(period: string) {
  const invoices = await prisma.platformInvoice.findMany({
    where: { billingPeriod: period },
    include: {
      tenant: { select: { id: true, name: true, plan: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const byPlan: Record<string, { count: number; amount: number }> = {};
  for (const inv of invoices) {
    if (!byPlan[inv.plan]) byPlan[inv.plan] = { count: 0, amount: 0 };
    byPlan[inv.plan].count += 1;
    byPlan[inv.plan].amount += inv.amount;
  }

  const commissions = await prisma.commercialCommission.findMany({
    where: { billingPeriod: period },
    include: {
      commercial: { select: { id: true, name: true, email: true, phone: true, referralCode: true, role: true, tenantId: true } },
      tenant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const commercialMap = new Map<
    string,
    {
      commercialId: string;
      name: string | null;
      email: string;
      referralCode: string | null;
      totalInvoiceAmount: number;
      totalCommission: number;
      unpaidCommission: number;
      paidCommission: number;
      kind: 'platform' | 'org';
      entries: Array<{
        tenantId: string;
        tenantName: string;
        plan: string;
        invoiceAmount: number;
        commissionAmount: number;
        source: string;
        paidAt: Date | null;
      }>;
    }
  >();

  for (const c of commissions) {
    const key = c.commercialId;
    if (!commercialMap.has(key)) {
      commercialMap.set(key, {
        commercialId: c.commercialId,
        name: c.commercial.name,
        email: c.commercial.email,
        referralCode: c.commercial.referralCode,
        totalInvoiceAmount: 0,
        totalCommission: 0,
        unpaidCommission: 0,
        paidCommission: 0,
        kind: c.commercial.role === 'COMMERCIAL' && !c.commercial.tenantId ? 'platform' : 'org',
        entries: [],
      });
    }
    const row = commercialMap.get(key)!;
    row.totalInvoiceAmount += c.invoiceAmount;
    row.totalCommission += c.commissionAmount;
    if (c.paidAt) row.paidCommission += c.commissionAmount;
    else row.unpaidCommission += c.commissionAmount;
    row.entries.push({
      tenantId: c.tenantId,
      tenantName: c.tenant.name,
      plan: c.plan,
      invoiceAmount: c.invoiceAmount,
      commissionAmount: c.commissionAmount,
      source: c.source,
      paidAt: c.paidAt,
    });
  }

  const commercialCommissions = Array.from(commercialMap.values()).sort(
    (a, b) => b.totalCommission - a.totalCommission,
  );

  const totalCommissions = commercialCommissions.reduce((s, c) => s + c.totalCommission, 0);
  const unpaidCommissions = commercialCommissions.reduce((s, c) => s + c.unpaidCommission, 0);
  const paidCommissions = commercialCommissions.reduce((s, c) => s + c.paidCommission, 0);

  const trendMonths: string[] = [];
  const base = new Date();
  base.setDate(1);
  for (let i = 5; i >= 0; i--) {
    const d = new Date(base);
    d.setMonth(d.getMonth() - i);
    trendMonths.push(getBillingPeriod(d));
  }

  const trendInvoices = await prisma.platformInvoice.groupBy({
    by: ['billingPeriod'],
    where: { billingPeriod: { in: trendMonths } },
    _sum: { amount: true },
    _count: { id: true },
  });

  const monthlyTrend = trendMonths.map((m) => {
    const row = trendInvoices.find((t) => t.billingPeriod === m);
    return {
      period: m,
      revenue: row?._sum.amount ?? 0,
      revenueFormatted: formatAmountFc(row?._sum.amount ?? 0),
      invoiceCount: row?._count.id ?? 0,
    };
  });

  return {
    period,
    summary: {
      totalRevenue,
      totalRevenueFormatted: formatAmountFc(totalRevenue),
      invoiceCount: invoices.length,
      totalCommissions,
      totalCommissionsFormatted: formatAmountFc(totalCommissions),
      unpaidCommissions,
      unpaidCommissionsFormatted: formatAmountFc(unpaidCommissions),
      paidCommissions,
      paidCommissionsFormatted: formatAmountFc(paidCommissions),
      netRevenue: totalRevenue - totalCommissions,
      netRevenueFormatted: formatAmountFc(totalRevenue - totalCommissions),
    },
    byPlan,
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      tenantId: inv.tenantId,
      tenantName: inv.tenant.name,
      plan: inv.plan,
      amount: inv.amount,
      amountFormatted: formatAmountFc(inv.amount),
      type: inv.type,
      status: inv.status,
      sentAt: inv.sentAt,
      createdAt: inv.createdAt,
    })),
    commercialCommissions,
    monthlyTrend,
  };
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildRevenueReportCsv(report: Awaited<ReturnType<typeof buildRevenueReport>>): string {
  const lines: string[] = [
    `Rapport EventMaster — Période ${report.period}`,
    '',
    'Résumé',
    `Revenus bruts,${report.summary.totalRevenue}`,
    `Commissions,${report.summary.totalCommissions}`,
    `Commissions dues,${report.summary.unpaidCommissions}`,
    `Commissions versées,${report.summary.paidCommissions}`,
    `Revenu net,${report.summary.netRevenue}`,
    `Nombre de factures,${report.summary.invoiceCount}`,
    '',
    'Factures',
    'N° facture,Organisation,Forfait,Montant (FC),Type,Statut,Date',
  ];

  for (const inv of report.invoices) {
    lines.push(
      [
        csvEscape(inv.invoiceNumber),
        csvEscape(inv.tenantName),
        csvEscape(inv.plan),
        inv.amount,
        csvEscape(inv.type),
        csvEscape(inv.status),
        csvEscape(new Date(inv.createdAt).toLocaleDateString('fr-FR')),
      ].join(','),
    );
  }

  lines.push('', 'Commissions commerciales', 'Commercial,Email,Code parrainage,Type,CA parrainé (FC),Commission (FC),Dû (FC),Versé (FC),Nb org.');

  for (const c of report.commercialCommissions) {
    lines.push(
      [
        csvEscape(c.name || ''),
        csvEscape(c.email),
        csvEscape(c.referralCode || ''),
        csvEscape(c.kind),
        c.totalInvoiceAmount,
        c.totalCommission,
        c.unpaidCommission,
        c.paidCommission,
        c.entries.length,
      ].join(','),
    );
  }

  lines.push('', 'Tendance 6 mois', 'Période,Revenus (FC),Factures');
  for (const m of report.monthlyTrend) {
    lines.push([m.period, m.revenue, m.invoiceCount].join(','));
  }

  return lines.join('\n');
}

export function buildRevenueReportPdf(report: Awaited<ReturnType<typeof buildRevenueReport>>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).font('Helvetica-Bold').text('EventMaster — Rapport de revenus', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(`Période : ${report.period}`, { align: 'center' });
    doc.moveDown(1.5);

    doc.fontSize(14).font('Helvetica-Bold').text('Résumé');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Revenus bruts : ${report.summary.totalRevenueFormatted}`);
    doc.text(`Commissions (30 %) : ${report.summary.totalCommissionsFormatted}`);
    doc.text(`Dont dues (non versées) : ${report.summary.unpaidCommissionsFormatted}`);
    doc.text(`Revenu net plateforme : ${report.summary.netRevenueFormatted}`);
    doc.text(`Nombre de factures : ${report.summary.invoiceCount}`);
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Tendance (6 mois)');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    for (const m of report.monthlyTrend) {
      doc.text(`${m.period} — ${m.revenueFormatted} (${m.invoiceCount} facture(s))`);
    }
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Commissions par commercial');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    if (report.commercialCommissions.length === 0) {
      doc.text('Aucune commission ce mois-ci.');
    } else {
      for (const c of report.commercialCommissions) {
        doc.text(
          `${c.name || c.email} — Commission : ${formatAmountFc(c.totalCommission)} (dû ${formatAmountFc(c.unpaidCommission)}) | CA : ${formatAmountFc(c.totalInvoiceAmount)} | ${c.entries.length} org.`,
        );
      }
    }
    doc.moveDown(1);

    doc.fontSize(14).font('Helvetica-Bold').text('Factures du mois');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    if (report.invoices.length === 0) {
      doc.text('Aucune facture.');
    } else {
      for (const inv of report.invoices) {
        doc.text(
          `${inv.invoiceNumber} | ${inv.tenantName} | ${inv.plan} | ${inv.amountFormatted} | ${inv.type}`,
        );
      }
    }

    doc.end();
  });
}

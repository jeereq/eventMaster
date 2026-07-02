import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getBillingPeriod } from '../services/commercialService';
import { formatAmountFc } from '../services/invoiceService';

function parseBillingPeriod(input?: string): string {
  if (input && /^\d{4}-\d{2}$/.test(input)) return input;
  return getBillingPeriod();
}

export async function getRevenueReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé.' });
    }

    const period = parseBillingPeriod(req.query.period as string | undefined);

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
        commercial: { select: { id: true, name: true, email: true, referralCode: true } },
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
        entries: Array<{
          tenantId: string;
          tenantName: string;
          plan: string;
          invoiceAmount: number;
          commissionAmount: number;
          source: string;
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
          entries: [],
        });
      }
      const row = commercialMap.get(key)!;
      row.totalInvoiceAmount += c.invoiceAmount;
      row.totalCommission += c.commissionAmount;
      row.entries.push({
        tenantId: c.tenantId,
        tenantName: c.tenant.name,
        plan: c.plan,
        invoiceAmount: c.invoiceAmount,
        commissionAmount: c.commissionAmount,
        source: c.source,
      });
    }

    const commercialCommissions = Array.from(commercialMap.values()).sort(
      (a, b) => b.totalCommission - a.totalCommission,
    );

    const totalCommissions = commercialCommissions.reduce((s, c) => s + c.totalCommission, 0);

    // Tendance sur les 6 derniers mois
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

    return res.json({
      period,
      summary: {
        totalRevenue,
        totalRevenueFormatted: formatAmountFc(totalRevenue),
        invoiceCount: invoices.length,
        totalCommissions,
        totalCommissionsFormatted: formatAmountFc(totalCommissions),
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
    });
  } catch (error: any) {
    console.error('[Revenue Report] Erreur:', error);
    return res.status(500).json({ error: 'Erreur lors de la génération du rapport.' });
  }
}

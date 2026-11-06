import { prisma } from '../db';
import { loadPlatformSettings } from './platformSettingsService';
import { auditReq } from './adminAuditService';
import { computeEventPayoutAmounts } from './eventPayoutAmounts';
import { extractEventPayoutAccount } from './eventPayoutAccount';

export { computeEventPayoutAmounts };

export interface EventPayoutSummary {
  eventId: string;
  eventTitle: string;
  eventSlug: string | null;
  eventDate: string;
  tenantId: string;
  tenantName: string;
  managerName: string | null;
  managerEmail: string | null;
  managerPhone: string | null;

  // Billetterie
  ticketingOrdersCount: number;
  ticketingGrossFc: number;
  ticketingRetentionRatePercent: number;
  ticketingRetentionFc: number;
  ticketingNetFc: number;

  // Dons solidaires
  donationsOrdersCount: number;
  donationsGrossFc: number;
  donationsRetentionRatePercent: number;
  donationsRetentionFc: number;
  donationsNetFc: number;

  // Consolidé
  totalGrossFc: number;
  totalRetentionFc: number;
  totalNetPayoutFc: number;

  // Statut versement
  payoutStatus: 'DUE' | 'PAID' | 'PARTIAL' | 'NONE';
  settledAt: string | null;
  settledBy: string | null;
  settledAmountFc: number | null;
  proofUrl: string | null;
  notes: string | null;
  paymentMethod: string | null;

  /** Net encore à reverser (net − déjà versé). */
  remainingFc: number;
  /** Montant déjà versé (FlexPay + manuel). */
  alreadySettledFc: number;
  /** Versé en trop après annulation de paiements (déduit des prochains encaissements). */
  overpaidFc: number;
  /** Numéro Mobile Money de reversement renseigné par l'organisateur. */
  payoutPhone: string | null;
  payoutHolderName: string | null;
  /** L'événement est passé (éligible au reversement automatique « après l'événement »). */
  eventEnded: boolean;
  /** Versement FlexPay Pay Out en cours, s'il y en a un. */
  pendingTransfer: {
    id: string;
    amountFc: number;
    phone: string;
    orderNumber: string | null;
    createdAt: string;
    lastMessage: string | null;
  } | null;
  /** Dernier versement FlexPay échoué (message affiché à l'admin). */
  lastFailedTransfer: { id: string; amountFc: number; lastMessage: string | null; createdAt: string } | null;
}

export interface AdminEventPayoutsReport {
  generatedAt: string;
  kpis: {
    totalEventsWithRevenue: number;
    totalGrossCollectedFc: number;
    totalPlatformRetentionFc: number;
    totalNetPayoutDueFc: number;
    totalNetPayoutPaidFc: number;
    eventsDueCount: number;
    eventsPaidCount: number;
  };
  events: EventPayoutSummary[];
}

/** Un événement est terminé quand sa fin (ou, à défaut, son début) est passée. */
export function isEventEnded(ev: { date: Date; endsAt?: Date | null }, now: Date): boolean {
  const end = ev.endsAt && ev.endsAt.getTime() >= ev.date.getTime() ? ev.endsAt : ev.date;
  return end.getTime() <= now.getTime();
}

export function eventPayoutRates() {
  const settings = loadPlatformSettings();
  return {
    ticketRate: settings.eventTicketingRetentionRate || 0.05,
    donationRate: settings.eventDonationsRetentionRate || 0.04,
  };
}

export async function buildAdminEventPayoutsReport(filters?: {
  tenantId?: string;
  status?: string;
  q?: string;
}): Promise<AdminEventPayoutsReport> {
  const { ticketRate, donationRate } = eventPayoutRates();
  const ticketPct = Math.round(ticketRate * 100);
  const donationPct = Math.round(donationRate * 100);

  const whereEvent: Record<string, unknown> = {};
  if (filters?.tenantId && filters.tenantId !== 'all') {
    whereEvent.tenantId = filters.tenantId;
  }
  if (filters?.q && filters.q.trim()) {
    const query = filters.q.trim();
    whereEvent.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { tenant: { name: { contains: query, mode: 'insensitive' } } },
    ];
  }

  // Événements ayant des commandes payées, ou déjà reversés (pour voir un trop-versé
  // même si toutes les commandes ont été annulées depuis).
  const settledEventIds = (
    await prisma.eventPayoutTransfer.findMany({
      where: { status: 'SUCCESS' },
      select: { eventId: true },
      distinct: ['eventId'],
    })
  ).map((t) => t.eventId);
  const events = await prisma.event.findMany({
    where: {
      ...whereEvent,
      AND: [
        {
          OR: [
            { ticketOrders: { some: { status: 'PAID' } } },
            ...(settledEventIds.length ? [{ id: { in: settledEventIds } }] : []),
          ],
        },
      ],
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          manager: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
      ticketOrders: {
        where: { status: 'PAID' },
        select: {
          id: true,
          amountFc: true,
          pricingZoneId: true,
          status: true,
          paidAt: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  let totalGross = 0;
  let totalRetention = 0;
  let totalNetDue = 0;
  let totalNetPaid = 0;
  let dueCount = 0;
  let paidCount = 0;

  const summaries: EventPayoutSummary[] = [];

  const pendingTransfers = events.length
    ? await prisma.eventPayoutTransfer.findMany({
        where: { eventId: { in: events.map((e) => e.id) }, status: { in: ['PENDING', 'FAILED'] } },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  for (const ev of events) {
    const amounts = computeEventPayoutAmounts({
      orders: ev.ticketOrders,
      eventPrep: ev.eventPrep,
      ticketRate,
      donationRate,
    });
    const {
      tGross, tCount, tRetention, tNet,
      dGross, dCount, dRetention, dNet,
      payoutMeta,
    } = amounts;
    const evGross = amounts.gross;
    const evRetention = amounts.retention;
    const evNet = amounts.net;

    const payoutStatus: EventPayoutSummary['payoutStatus'] = amounts.payoutStatus;
    const payoutAccount = extractEventPayoutAccount(ev.eventPrep);

    const pending = pendingTransfers.find((t) => t.eventId === ev.id && t.status === 'PENDING');
    const lastTransfer = pendingTransfers.find((t) => t.eventId === ev.id);
    const lastFailed = lastTransfer && lastTransfer.status === 'FAILED' ? lastTransfer : null;

    // Filtre sur le statut si demandé
    if (filters?.status && filters.status !== 'all' && filters.status.toUpperCase() !== payoutStatus) {
      continue;
    }

    totalGross += evGross;
    totalRetention += evRetention;

    totalNetPaid += Math.min(amounts.alreadySettledFc, evNet);
    totalNetDue += amounts.remainingFc;
    if (payoutStatus === 'PAID') {
      paidCount += 1;
    } else {
      dueCount += 1;
    }

    summaries.push({
      eventId: ev.id,
      eventTitle: ev.title,
      eventSlug: ev.slug,
      eventDate: ev.date.toISOString(),
      tenantId: ev.tenantId,
      tenantName: ev.tenant?.name || 'Organisation',
      managerName: ev.tenant?.manager?.name || null,
      managerEmail: ev.tenant?.manager?.email || null,
      managerPhone: ev.tenant?.manager?.phone || null,

      ticketingOrdersCount: tCount,
      ticketingGrossFc: tGross,
      ticketingRetentionRatePercent: ticketPct,
      ticketingRetentionFc: tRetention,
      ticketingNetFc: tNet,

      donationsOrdersCount: dCount,
      donationsGrossFc: dGross,
      donationsRetentionRatePercent: donationPct,
      donationsRetentionFc: dRetention,
      donationsNetFc: dNet,

      totalGrossFc: evGross,
      totalRetentionFc: evRetention,
      totalNetPayoutFc: evNet,

      payoutStatus,
      settledAt: typeof payoutMeta?.settledAt === 'string' ? payoutMeta.settledAt : null,
      settledBy: typeof payoutMeta?.settledBy === 'string' ? payoutMeta.settledBy : null,
      settledAmountFc: typeof payoutMeta?.settledAmountFc === 'number' ? payoutMeta.settledAmountFc : null,
      proofUrl: typeof payoutMeta?.proofUrl === 'string' ? payoutMeta.proofUrl : null,
      notes: typeof payoutMeta?.notes === 'string' ? payoutMeta.notes : null,
      paymentMethod: typeof payoutMeta?.paymentMethod === 'string' ? payoutMeta.paymentMethod : null,

      remainingFc: amounts.remainingFc,
      alreadySettledFc: amounts.alreadySettledFc,
      overpaidFc: amounts.overpaidFc,
      payoutPhone: payoutAccount?.phone ?? null,
      payoutHolderName: payoutAccount?.holderName ?? null,
      eventEnded: isEventEnded(ev, new Date()),
      pendingTransfer: pending
        ? {
            id: pending.id,
            amountFc: pending.amountFc,
            phone: pending.phone,
            orderNumber: pending.flexPayOrderNumber,
            createdAt: pending.createdAt.toISOString(),
            lastMessage: pending.lastMessage,
          }
        : null,
      lastFailedTransfer: lastFailed
        ? {
            id: lastFailed.id,
            amountFc: lastFailed.amountFc,
            lastMessage: lastFailed.lastMessage,
            createdAt: lastFailed.createdAt.toISOString(),
          }
        : null,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalEventsWithRevenue: summaries.length,
      totalGrossCollectedFc: totalGross,
      totalPlatformRetentionFc: totalRetention,
      totalNetPayoutDueFc: totalNetDue,
      totalNetPayoutPaidFc: totalNetPaid,
      eventsDueCount: dueCount,
      eventsPaidCount: paidCount,
    },
    events: summaries,
  };
}

export function buildEventPayoutsCsv(report: AdminEventPayoutsReport): string {
  function csvEscape(val: unknown): string {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
    return `"${s}"`;
  }

  const header = [
    'ID Événement',
    'Titre Événement',
    'Date Événement',
    'Organisation',
    'Responsable',
    'Email',
    'Téléphone',
    'Billetterie Brut (FC)',
    'Retenue Billetterie (FC)',
    'Billetterie Net (FC)',
    'Dons Brut (FC)',
    'Retenue Dons (FC)',
    'Dons Net (FC)',
    'Total Brut Encaissé (FC)',
    'Total Retenue Plateforme (FC)',
    'Total Net à Reverser (FC)',
    'Déjà Versé (FC)',
    'Reste à Verser (FC)',
    'Trop-versé (FC)',
    'Numéro de Reversement',
    'Statut Reversement',
    'Date Versement',
    'Méthode',
    'Preuve',
    'Notes',
  ].map(csvEscape).join(',');

  const rows = report.events.map((e) => [
    csvEscape(e.eventId),
    csvEscape(e.eventTitle),
    csvEscape(e.eventDate.slice(0, 10)),
    csvEscape(e.tenantName),
    csvEscape(e.managerName || ''),
    csvEscape(e.managerEmail || ''),
    csvEscape(e.managerPhone || ''),
    e.ticketingGrossFc,
    e.ticketingRetentionFc,
    e.ticketingNetFc,
    e.donationsGrossFc,
    e.donationsRetentionFc,
    e.donationsNetFc,
    e.totalGrossFc,
    e.totalRetentionFc,
    e.totalNetPayoutFc,
    e.alreadySettledFc,
    e.remainingFc,
    e.overpaidFc,
    csvEscape(e.payoutPhone || ''),
    csvEscape(e.payoutStatus),
    csvEscape(e.settledAt ? e.settledAt.slice(0, 10) : ''),
    csvEscape(e.paymentMethod || ''),
    csvEscape(e.proofUrl || ''),
    csvEscape(e.notes || ''),
  ].join(','));

  return `\uFEFF${header}\n${rows.join('\n')}`;
}

export async function settleEventPayoutRecord(params: {
  eventId: string;
  status: 'PAID' | 'DUE' | 'PARTIAL';
  settledAmountFc?: number;
  proofUrl?: string;
  notes?: string;
  paymentMethod?: string;
  actorId: string;
}) {
  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { id: true, title: true, tenantId: true, eventPrep: true },
  });

  if (!event) throw new Error('Événement introuvable.');

  const currentPrep =
    event.eventPrep && typeof event.eventPrep === 'object'
      ? (event.eventPrep as Record<string, unknown>)
      : {};

  const now = new Date();
  const nextPayout = {
    status: params.status,
    settledAt: params.status === 'PAID' ? now.toISOString() : null,
    settledBy: params.actorId,
    settledAmountFc: params.settledAmountFc,
    proofUrl: params.proofUrl || null,
    notes: params.notes || null,
    paymentMethod: params.paymentMethod || 'Virement bancaire / Mobile Money',
    updatedAt: now.toISOString(),
  };

  const updatedEvent = await prisma.event.update({
    where: { id: params.eventId },
    data: {
      eventPrep: {
        ...currentPrep,
        payout: nextPayout,
      },
    },
  });

  return {
    success: true,
    eventId: event.id,
    eventTitle: event.title,
    tenantId: event.tenantId,
    payout: nextPayout,
  };
}

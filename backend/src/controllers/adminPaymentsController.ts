import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

export type PaymentAttemptKind = 'ticket' | 'subscription' | 'ai_tokens';
export type PaymentAttemptStatus = 'paid' | 'pending' | 'failed';

const KIND_LABEL: Record<PaymentAttemptKind, string> = {
  ticket: 'Billets',
  subscription: 'Abonnements',
  ai_tokens: 'Jetons IA',
};

function pager(req: AuthenticatedRequest) {
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '30'), 10) || 30, 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function searchQ(req: AuthenticatedRequest) {
  return typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim().toLowerCase() : '';
}

function parseKind(value: unknown): PaymentAttemptKind | 'all' {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'ticket' || raw === 'subscription' || raw === 'ai_tokens') return raw;
  return 'all';
}

function parseStatus(value: unknown): PaymentAttemptStatus | 'all' {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'paid' || raw === 'pending' || raw === 'failed') return raw;
  return 'all';
}

function parseChannel(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseDateField(value: unknown): 'created' | 'paid' {
  return String(value || '').trim().toLowerCase() === 'paid' ? 'paid' : 'created';
}

function parseProvider(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseAmountBound(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function dateRange(req: AuthenticatedRequest): { gte?: Date; lte?: Date } | undefined {
  const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
  const range: { gte?: Date; lte?: Date } = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.lte = d;
    }
  }
  return range.gte || range.lte ? range : undefined;
}

function normalizeChannel(input: {
  flexPayChannel?: string | null;
  paymentProvider?: string | null;
  paymentMethod?: string | null;
  proofOfPayment?: string | null;
}): string {
  const ch = String(input.flexPayChannel || '').trim().toLowerCase();
  if (ch) return ch;
  const provider = String(input.paymentProvider || '').trim().toLowerCase();
  if (provider === 'flexpay_card' || provider.includes('card')) return 'card';
  if (provider === 'flexpay_mobile' || provider.includes('mobile')) return 'mobile';
  if (provider === 'manual' || input.proofOfPayment) return 'manual';
  const method = String(input.paymentMethod || '').trim().toLowerCase();
  if (method === 'card' || method === 'mobile') return method;
  return 'unknown';
}

function channelLabel(channel: string): string {
  const map: Record<string, string> = {
    card: 'Carte bancaire',
    mastercard: 'Mastercard',
    visa: 'Visa',
    mobile: 'Mobile Money',
    mpesa: 'M-Pesa',
    orange: 'Orange Money',
    airtel: 'Airtel Money',
    afrimoney: 'Afrimoney',
    manual: 'Manuel / preuve',
    unknown: 'Non précisé',
  };
  return map[channel] || channel;
}

function ticketStatus(status: string): PaymentAttemptStatus {
  const s = status.toUpperCase();
  if (s === 'PAID') return 'paid';
  if (s === 'CANCELLED' || s === 'FAILED') return 'failed';
  return 'pending';
}

function aiStatus(status: string): PaymentAttemptStatus {
  const s = status.toUpperCase();
  if (s === 'PAID') return 'paid';
  if (s === 'FAILED' || s === 'CANCELLED') return 'failed';
  return 'pending';
}

function subscriptionStatus(row: {
  status: string;
  paidAt: Date | null;
  flexPayReference: string | null;
  proofOfPayment: string | null;
}): PaymentAttemptStatus {
  if (row.paidAt || row.status === 'APPROVED') return 'paid';
  if (row.status === 'REJECTED') return 'failed';
  return 'pending';
}

export type PaymentAttemptRow = {
  id: string;
  kind: PaymentAttemptKind;
  kindLabel: string;
  status: PaymentAttemptStatus;
  statusLabel: string;
  amountFc: number;
  currency: string;
  channel: string;
  channelLabel: string;
  paymentProvider: string | null;
  payerName: string | null;
  payerEmail: string | null;
  payerPhone: string | null;
  reference: string | null;
  flexPayOrderNumber: string | null;
  flexPayProviderReference: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string | null;
  paidAt: string | null;
  entityId?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  quantity?: number | null;
  tokensCount?: number | null;
  requestedPlan?: string | null;
  tenantName?: string | null;
  proofOfPayment?: string | null;
  rawStatus?: string | null;
};

const STATUS_LABEL: Record<PaymentAttemptStatus, string> = {
  paid: 'Abouti',
  pending: 'En cours',
  failed: 'Échoué / annulé',
};

function emptyBucket() {
  return {
    count: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    amountAttemptedFc: 0,
    amountPaidFc: 0,
  };
}

type SourceBucket = ReturnType<typeof emptyBucket> & {
  kind: PaymentAttemptKind;
  kindLabel: string;
  channel: string;
  channelLabel: string;
};

function bump(bucket: ReturnType<typeof emptyBucket>, status: PaymentAttemptStatus, amount: number) {
  bucket.count += 1;
  bucket.amountAttemptedFc += amount;
  if (status === 'paid') {
    bucket.paidCount += 1;
    bucket.amountPaidFc += amount;
  } else if (status === 'pending') {
    bucket.pendingCount += 1;
  } else {
    bucket.failedCount += 1;
  }
}

function matchesQ(row: PaymentAttemptRow, q: string) {
  if (!q) return true;
  return [
    row.summary,
    row.payerName,
    row.payerEmail,
    row.payerPhone,
    row.reference,
    row.flexPayOrderNumber,
    row.flexPayProviderReference,
    row.channel,
    row.kindLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(q);
}

async function collectAttempts(opts: {
  kind: PaymentAttemptKind | 'all';
  dateRange?: { gte?: Date; lte?: Date };
  dateField?: 'created' | 'paid';
  takePerSource?: number;
}): Promise<PaymentAttemptRow[]> {
  const take = opts.takePerSource ?? 400;
  const dateField = opts.dateField === 'paid' ? 'paidAt' : 'createdAt';
  const whereDate = opts.dateRange ? { [dateField]: opts.dateRange } : {};

  const [tickets, aiOrders, subscriptions] = await Promise.all([
    opts.kind === 'all' || opts.kind === 'ticket'
      ? prisma.ticketOrder.findMany({
          where: whereDate,
          include: { event: { select: { title: true, slug: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    opts.kind === 'all' || opts.kind === 'ai_tokens'
      ? prisma.aiTokenOrder.findMany({
          where: whereDate,
          include: { user: { select: { name: true, email: true, phone: true } } },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
    opts.kind === 'all' || opts.kind === 'subscription'
      ? prisma.subscriptionRequest.findMany({
          where: whereDate,
          include: {
            tenant: {
              select: {
                name: true,
                manager: { select: { name: true, email: true, phone: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take,
        })
      : Promise.resolve([]),
  ]);

  const rows: PaymentAttemptRow[] = [];

  for (const row of tickets) {
    const status = ticketStatus(row.status);
    const channel = normalizeChannel({
      flexPayChannel: row.flexPayChannel,
      paymentProvider: row.paymentProvider,
    });
    rows.push({
      id: `ticket:${row.id}`,
      kind: 'ticket',
      kindLabel: KIND_LABEL.ticket,
      status,
      statusLabel: STATUS_LABEL[status],
      amountFc: Number(row.flexPayAmountCustomer || row.amountFc) || 0,
      currency: 'CDF',
      channel,
      channelLabel: channelLabel(channel),
      paymentProvider: row.paymentProvider,
      payerName: row.buyerName,
      payerEmail: row.buyerEmail,
      payerPhone: row.buyerPhone,
      reference: row.flexPayReference || row.id,
      flexPayOrderNumber: row.flexPayOrderNumber,
      flexPayProviderReference: row.flexPayProviderReference,
      summary: `Billet${row.quantity > 1 ? 's' : ''} « ${row.event?.title || 'événement'} » × ${row.quantity}`,
      createdAt: row.createdAt.toISOString(),
      updatedAt: null,
      paidAt: row.paidAt?.toISOString() || null,
      entityId: row.id,
      eventTitle: row.event?.title || null,
      eventSlug: row.event?.slug || null,
      quantity: row.quantity,
      rawStatus: row.status,
    });
  }

  for (const row of aiOrders) {
    const status = aiStatus(row.status);
    const channel = normalizeChannel({
      flexPayChannel: row.flexPayChannel,
      paymentMethod: row.paymentMethod,
    });
    rows.push({
      id: `ai_tokens:${row.id}`,
      kind: 'ai_tokens',
      kindLabel: KIND_LABEL.ai_tokens,
      status,
      statusLabel: STATUS_LABEL[status],
      amountFc: Number(row.flexPayAmountCustomer || row.amountFc) || 0,
      currency: row.currency || 'CDF',
      channel,
      channelLabel: channelLabel(channel),
      paymentProvider: row.paymentMethod === 'card' ? 'flexpay_card' : row.paymentMethod === 'mobile' ? 'flexpay_mobile' : row.paymentMethod,
      payerName: row.user?.name || null,
      payerEmail: row.user?.email || null,
      payerPhone: row.phone || row.user?.phone || null,
      reference: row.flexPayReference || row.id,
      flexPayOrderNumber: row.flexPayOrderNumber,
      flexPayProviderReference: row.flexPayProviderReference,
      summary: `Recharge ${row.tokensCount} simulations IA`,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      paidAt: row.paidAt?.toISOString() || null,
      entityId: row.id,
      tokensCount: row.tokensCount,
      rawStatus: row.status,
    });
  }

  for (const row of subscriptions) {
    const status = subscriptionStatus(row);
    const channel = normalizeChannel({
      flexPayChannel: row.flexPayChannel,
      paymentProvider: row.paymentProvider,
      proofOfPayment: row.proofOfPayment,
    });
    const manager = row.tenant?.manager;
    rows.push({
      id: `subscription:${row.id}`,
      kind: 'subscription',
      kindLabel: KIND_LABEL.subscription,
      status,
      statusLabel: STATUS_LABEL[status],
      amountFc: Number(row.flexPayAmountCustomer || row.approvedAmount || row.baseAmount) || 0,
      currency: 'CDF',
      channel,
      channelLabel: channelLabel(channel),
      paymentProvider: row.paymentProvider,
      payerName: manager?.name || row.tenant?.name || null,
      payerEmail: manager?.email || null,
      payerPhone: manager?.phone || null,
      reference: row.flexPayReference || row.id,
      flexPayOrderNumber: row.flexPayOrderNumber,
      flexPayProviderReference: row.flexPayProviderReference,
      summary: `Abonnement ${row.requestedPlan} — ${row.tenant?.name || 'Organisation'}`,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      paidAt: row.paidAt?.toISOString() || null,
      entityId: row.id,
      requestedPlan: row.requestedPlan,
      tenantName: row.tenant?.name || null,
      proofOfPayment: row.proofOfPayment,
      rawStatus: row.status,
    });
  }

  return rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAdminPaymentsOverview(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const kind = parseKind(req.query.kind);
    const status = parseStatus(req.query.status);
    const channel = parseChannel(req.query.channel);
    const provider = parseProvider(req.query.provider);
    const range = dateRange(req);
    const dateField = parseDateField(req.query.dateField);
    const minFc = parseAmountBound(req.query.minFc);
    const maxFc = parseAmountBound(req.query.maxFc);
    let rows = await collectAttempts({ kind, dateRange: range, dateField, takePerSource: 2000 });
    if (status !== 'all') rows = rows.filter((row) => row.status === status);
    if (channel) rows = rows.filter((row) => row.channel === channel);
    if (provider) rows = rows.filter((row) => String(row.paymentProvider || '').toLowerCase() === provider);
    if (minFc !== undefined) rows = rows.filter((row) => row.amountFc >= minFc);
    if (maxFc !== undefined) rows = rows.filter((row) => row.amountFc <= maxFc);

    const bySourceMap = new Map<string, SourceBucket>();
    const byKindMap = new Map<PaymentAttemptKind, ReturnType<typeof emptyBucket> & { kind: PaymentAttemptKind; kindLabel: string }>();
    const totals = emptyBucket();

    for (const row of rows) {
      bump(totals, row.status, row.amountFc);

      const sourceKey = `${row.kind}::${row.channel}`;
      let source = bySourceMap.get(sourceKey);
      if (!source) {
        source = {
          ...emptyBucket(),
          kind: row.kind,
          kindLabel: row.kindLabel,
          channel: row.channel,
          channelLabel: row.channelLabel,
        };
        bySourceMap.set(sourceKey, source);
      }
      bump(source, row.status, row.amountFc);

      let kindBucket = byKindMap.get(row.kind);
      if (!kindBucket) {
        kindBucket = { ...emptyBucket(), kind: row.kind, kindLabel: row.kindLabel };
        byKindMap.set(row.kind, kindBucket);
      }
      bump(kindBucket, row.status, row.amountFc);
    }

    const bySource = Array.from(bySourceMap.values()).sort((a, b) => b.amountAttemptedFc - a.amountAttemptedFc);
    const byKind = Array.from(byKindMap.values()).sort((a, b) => b.amountAttemptedFc - a.amountAttemptedFc);

    return res.json({
      totals,
      bySource,
      byKind,
      scanned: rows.length,
    });
  } catch (error) {
    console.error('getAdminPaymentsOverview:', error);
    return res.status(500).json({ error: 'Impossible de charger le récapitulatif des paiements.' });
  }
}

export async function listAdminPaymentAttempts(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { page, pageSize, skip } = pager(req);
    const kind = parseKind(req.query.kind);
    const status = parseStatus(req.query.status);
    const channel = parseChannel(req.query.channel);
    const provider = parseProvider(req.query.provider);
    const q = searchQ(req);
    const range = dateRange(req);
    const dateField = parseDateField(req.query.dateField);
    const minFc = parseAmountBound(req.query.minFc);
    const maxFc = parseAmountBound(req.query.maxFc);

    let rows = await collectAttempts({ kind, dateRange: range, dateField, takePerSource: 800 });
    if (status !== 'all') rows = rows.filter((row) => row.status === status);
    if (channel) rows = rows.filter((row) => row.channel === channel);
    if (provider) rows = rows.filter((row) => String(row.paymentProvider || '').toLowerCase() === provider);
    if (minFc !== undefined) rows = rows.filter((row) => row.amountFc >= minFc);
    if (maxFc !== undefined) rows = rows.filter((row) => row.amountFc <= maxFc);
    if (q) rows = rows.filter((row) => matchesQ(row, q));

    const total = rows.length;
    const items = rows.slice(skip, skip + pageSize);

    return res.json({
      items,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  } catch (error) {
    console.error('listAdminPaymentAttempts:', error);
    return res.status(500).json({ error: 'Impossible de charger les tentatives de paiement.' });
  }
}

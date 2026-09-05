import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { AI_FREE_TRIALS_MAX } from '../services/aiSimulationWalletService';
import {
  bucketLedgerByUtcDay,
  parseUtcDayEnd,
  parseUtcDayStart,
} from '../services/aiTokenUsageQuery';

export type AiTokenActionFilter = 'budget_simulation' | 'invitation_compose' | 'room_plan_from_photo' | 'recharge';

const ACTION_IDS: AiTokenActionFilter[] = [
  'budget_simulation',
  'invitation_compose',
  'room_plan_from_photo',
  'recharge',
];

const ACTION_LABEL: Record<AiTokenActionFilter, string> = {
  budget_simulation: 'Simulation budget',
  invitation_compose: 'Invitation IA',
  room_plan_from_photo: 'Plan de salle IA',
  recharge: 'Recharge',
};

const SOURCE_LABEL: Record<string, string> = {
  landing: 'Landing',
  dashboard: 'Tableau de bord',
  studio: 'Studio',
  flexpay: 'FlexPay',
  unknown: 'Non précisé',
};

const POOL_LABEL: Record<string, string> = {
  free: 'Essai gratuit',
  bonus: 'Jetons payés',
  mixed: 'Mixte',
  paid: 'Achat',
};

function parseAction(value: unknown): AiTokenActionFilter | 'all' {
  const raw = String(value || '').trim();
  if (ACTION_IDS.includes(raw as AiTokenActionFilter)) return raw as AiTokenActionFilter;
  return 'all';
}

function dateRange(req: AuthenticatedRequest): { gte?: Date; lte?: Date } | undefined {
  const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
  const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
  const range: { gte?: Date; lte?: Date } = {};
  const start = from ? parseUtcDayStart(from) : undefined;
  const end = to ? parseUtcDayEnd(to) : undefined;
  if (start) range.gte = start;
  if (end) range.lte = end;
  return range.gte || range.lte ? range : undefined;
}

function buildWhere(req: AuthenticatedRequest): Prisma.AiTokenLedgerWhereInput {
  const action = parseAction(req.query.action);
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const createdAt = dateRange(req);
  const where: Prisma.AiTokenLedgerWhereInput = {};
  if (action !== 'all') where.action = action;
  if (createdAt) where.createdAt = createdAt;
  if (q) {
    where.OR = [
      { deviceId: { contains: q, mode: 'insensitive' } },
      { relatedId: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
      { user: { name: { contains: q, mode: 'insensitive' } } },
      { user: { tenant: { name: { contains: q, mode: 'insensitive' } } } },
    ];
  }
  return where;
}

function serializeRow(row: {
  id: string;
  userId: string | null;
  deviceId: string | null;
  action: string;
  source: string;
  tokensDelta: number;
  tokensFromFree: number;
  tokensFromBonus: number;
  pool: string;
  relatedId: string | null;
  createdAt: Date;
  user: {
    email: string;
    name: string | null;
    tenant: { id: string; name: string } | null;
  } | null;
}) {
  const action = (ACTION_IDS.includes(row.action as AiTokenActionFilter)
    ? row.action
    : 'budget_simulation') as AiTokenActionFilter;
  return {
    id: row.id,
    action,
    actionLabel: ACTION_LABEL[action],
    source: row.source,
    sourceLabel: SOURCE_LABEL[row.source] || row.source,
    tokensDelta: row.tokensDelta,
    tokensFromFree: row.tokensFromFree,
    tokensFromBonus: row.tokensFromBonus,
    pool: row.pool,
    poolLabel: POOL_LABEL[row.pool] || row.pool,
    relatedId: row.relatedId,
    deviceId: row.deviceId,
    userId: row.userId,
    userName: row.user?.name || null,
    userEmail: row.user?.email || null,
    tenantId: row.user?.tenant?.id || null,
    tenantName: row.user?.tenant?.name || null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function platformStock() {
  const [bonusAgg, freeRows] = await Promise.all([
    prisma.aiSimulationWallet.aggregate({
      _sum: { bonusTokens: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ remaining_free: bigint | number }>>`
      SELECT COALESCE(SUM(GREATEST(0, ${AI_FREE_TRIALS_MAX} - "freeTrialsUsed")), 0) AS remaining_free
      FROM "AiSimulationWallet"
    `,
  ]);
  const remainingBonus = Math.max(0, bonusAgg._sum.bonusTokens || 0);
  const remainingFree = Math.max(0, Number(freeRows[0]?.remaining_free || 0));
  return {
    remaining: remainingFree + remainingBonus,
    remainingFree,
    remainingBonus,
    wallets: bonusAgg._count._all,
  };
}

export async function getAdminAiTokenUsage(req: AuthenticatedRequest, res: Response) {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const where = buildWhere(req);

    const [total, items, grouped, stock, daySource] = await Promise.all([
      prisma.aiTokenLedger.count({ where }),
      prisma.aiTokenLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { email: true, name: true, tenant: { select: { id: true, name: true } } } },
        },
      }),
      prisma.aiTokenLedger.groupBy({
        by: ['action'],
        where,
        _count: { _all: true },
        _sum: { tokensDelta: true, tokensFromFree: true, tokensFromBonus: true },
      }),
      platformStock(),
      prisma.aiTokenLedger.findMany({
        where,
        select: { createdAt: true, tokensDelta: true },
      }),
    ]);

    let consumed = 0;
    let credited = 0;
    const byAction = grouped.map((row) => {
      const action = (ACTION_IDS.includes(row.action as AiTokenActionFilter)
        ? row.action
        : 'budget_simulation') as AiTokenActionFilter;
      const delta = row._sum.tokensDelta || 0;
      if (delta < 0) consumed += -delta;
      if (delta > 0) credited += delta;
      return {
        action,
        actionLabel: ACTION_LABEL[action],
        count: row._count._all,
        tokensConsumed: delta < 0 ? -delta : 0,
        tokensCredited: delta > 0 ? delta : 0,
      };
    });

    return res.json({
      totals: {
        moves: total,
        consumed,
        credited,
      },
      stock,
      byAction,
      byDay: bucketLedgerByUtcDay(daySource),
      items: items.map(serializeRow),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('getAdminAiTokenUsage:', error);
    return res.status(500).json({ error: 'Impossible de charger l’usage des jetons IA.' });
  }
}

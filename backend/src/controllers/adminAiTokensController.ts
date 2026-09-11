import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { AI_FREE_TRIALS_MAX, grantAiTokensToUser } from '../services/aiSimulationWalletService';
import {
  bucketLedgerByUtcDay,
  estimateComposeCostAndMargin,
  parseUtcDayEnd,
  parseUtcDayStart,
  type ComposeGenerationDetails,
  type GenerationEconomyReport,
} from '../services/aiTokenUsageQuery';
import { auditReq } from '../services/adminAuditService';

export type AiTokenActionFilter =
  | 'budget_simulation'
  | 'invitation_compose'
  | 'room_plan_from_photo'
  | 'recharge'
  | 'grant';

const ACTION_IDS: AiTokenActionFilter[] = [
  'budget_simulation',
  'invitation_compose',
  'room_plan_from_photo',
  'recharge',
  'grant',
];

const ACTION_LABEL: Record<AiTokenActionFilter, string> = {
  budget_simulation: 'Simulation budget',
  invitation_compose: 'Invitation IA',
  room_plan_from_photo: 'Plan de salle IA',
  recharge: 'Recharge payante',
  grant: 'Attribution Super Admin',
};

const SOURCE_LABEL: Record<string, string> = {
  landing: 'Landing',
  simulateur: 'Simulateur dédié',
  dashboard: 'Tableau de bord',
  studio: 'Studio',
  flexpay: 'FlexPay',
  admin: 'Super Admin',
  support: 'Session support',
  unknown: 'Non précisé',
};

const POOL_LABEL: Record<string, string> = {
  free: 'Essai gratuit — sans revenu',
  bonus: 'Jetons payés',
  mixed: 'Mixte',
  paid: 'Achat FlexPay — revenu',
  granted: 'Offert Super Admin — sans revenu',
  comp: 'Illimité (admin / support) — sans revenu',
};

function moneyKind(pool: string, action: string): 'revenue' | 'non_revenue' | 'mixed' {
  if (pool === 'paid' || action === 'recharge') return 'revenue';
  if (pool === 'bonus') return 'revenue';
  if (pool === 'mixed') return 'mixed';
  return 'non_revenue';
}

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

function extractComposeDetailsFromRun(
  run: {
    prompt: string | null;
    previewImageUrl: string | null;
    content: Prisma.JsonValue;
    stage: Prisma.JsonValue | null;
  },
  tokensDelta: number,
): ComposeGenerationDetails {
  const content = run.content && typeof run.content === 'object' ? (run.content as Record<string, unknown>) : {};
  const global = content.global && typeof content.global === 'object' ? (content.global as Record<string, unknown>) : {};

  const speedMode: 'fast' | 'quality' = global.speedMode === 'fast' ? 'fast' : 'quality';
  const variants = Array.isArray(global.variants) ? (global.variants as string[]) : [];
  const variantsCount = variants.length > 0 ? variants.length : 1;
  const safetyFallbackTriggered = global.safetyFallbackTriggered === true;
  const previewImageUrl = run.previewImageUrl || (typeof global.bgImageUrl === 'string' ? global.bgImageUrl : null);
  const prompt = run.prompt || (typeof global.prompt === 'string' ? global.prompt : null);

  const metrics = estimateComposeCostAndMargin({
    speedMode,
    variantsCount,
    safetyFallbackTriggered,
    tokensConsumed: Math.abs(tokensDelta),
  });

  return {
    ...metrics,
    previewImageUrl,
    prompt,
  };
}

async function computeGenerationReport(createdAt?: { gte?: Date; lte?: Date }): Promise<GenerationEconomyReport> {
  const runs = await prisma.aiTemplateComposeRun.findMany({
    where: {
      ...(createdAt ? { createdAt } : {}),
    },
    select: {
      id: true,
      content: true,
      stage: true,
      previewImageUrl: true,
      prompt: true,
    },
    take: 5000,
  });

  let fastGenerations = 0;
  let qualityGenerations = 0;
  let multiVariantsGenerations = 0;
  let safetyFallbackGenerations = 0;
  let estimatedCostUsd = 0;
  let estimatedCostFc = 0;
  let estimatedRevenueUsd = 0;
  let estimatedRevenueFc = 0;

  for (const run of runs) {
    const details = extractComposeDetailsFromRun(run, 2);
    if (details.speedMode === 'fast') {
      fastGenerations += 1;
    } else {
      qualityGenerations += 1;
    }
    if (details.variantsCount > 1) {
      multiVariantsGenerations += 1;
    }
    if (details.safetyFallbackTriggered) {
      safetyFallbackGenerations += 1;
    }
    estimatedCostUsd += details.estimatedCostUsd;
    estimatedCostFc += details.estimatedCostFc;
    estimatedRevenueUsd += details.estimatedRevenueUsd;
    estimatedRevenueFc += details.estimatedRevenueFc;
  }

  const estimatedMarginUsd = Math.round((estimatedRevenueUsd - estimatedCostUsd) * 1000) / 1000;
  const estimatedMarginPct =
    estimatedRevenueUsd > 0
      ? Math.round((estimatedMarginUsd / estimatedRevenueUsd) * 100)
      : 0;

  return {
    totalGenerations: runs.length,
    fastGenerations,
    qualityGenerations,
    multiVariantsGenerations,
    safetyFallbackGenerations,
    estimatedCostUsd: Math.round(estimatedCostUsd * 1000) / 1000,
    estimatedCostFc: Math.round(estimatedCostFc),
    estimatedRevenueUsd: Math.round(estimatedRevenueUsd * 1000) / 1000,
    estimatedRevenueFc: Math.round(estimatedRevenueFc),
    estimatedMarginUsd,
    estimatedMarginPct,
  };
}

function serializeRow(
  row: {
    id: string;
    userId: string | null;
    deviceId: string | null;
    action: string;
    source: string;
    tokensDelta: number;
    tokensFromFree: number;
    tokensFromBonus: number;
    tokensFromGranted?: number;
    pool: string;
    relatedId: string | null;
    createdAt: Date;
    user: {
      email: string;
      name: string | null;
      tenant: { id: string; name: string } | null;
    } | null;
  },
  composeDetails?: ComposeGenerationDetails | null,
) {
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
    tokensFromGranted: row.tokensFromGranted || 0,
    pool: row.pool,
    poolLabel: POOL_LABEL[row.pool] || row.pool,
    moneyKind: moneyKind(row.pool, row.action),
    relatedId: row.relatedId,
    deviceId: row.deviceId,
    userId: row.userId,
    userName: row.user?.name || null,
    userEmail: row.user?.email || null,
    tenantId: row.user?.tenant?.id || null,
    tenantName: row.user?.tenant?.name || null,
    createdAt: row.createdAt.toISOString(),
    composeDetails: composeDetails || null,
  };
}

async function platformStock() {
  const [bonusAgg, freeRows] = await Promise.all([
    prisma.aiSimulationWallet.aggregate({
      _sum: { bonusTokens: true, grantedTokens: true },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ remaining_free: bigint | number }>>`
      SELECT COALESCE(SUM(GREATEST(0, ${AI_FREE_TRIALS_MAX} - "freeTrialsUsed")), 0) AS remaining_free
      FROM "AiSimulationWallet"
    `,
  ]);
  const remainingBonus = Math.max(0, bonusAgg._sum.bonusTokens || 0);
  const remainingGranted = Math.max(0, bonusAgg._sum.grantedTokens || 0);
  const remainingFree = Math.max(0, Number(freeRows[0]?.remaining_free || 0));
  return {
    remaining: remainingFree + remainingBonus + remainingGranted,
    remainingFree,
    remainingBonus,
    remainingGranted,
    wallets: bonusAgg._count._all,
  };
}

export async function getAdminAiTokenUsage(req: AuthenticatedRequest, res: Response) {
  try {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
    const where = buildWhere(req);

    const createdAt = dateRange(req);
    const [total, items, grouped, byPool, stock, daySource, paidOrders, generationReport] = await Promise.all([
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
        _sum: { tokensDelta: true, tokensFromFree: true, tokensFromBonus: true, tokensFromGranted: true },
      }),
      prisma.aiTokenLedger.groupBy({
        by: ['pool'],
        where,
        _sum: { tokensDelta: true, tokensFromFree: true, tokensFromBonus: true, tokensFromGranted: true },
      }),
      platformStock(),
      prisma.aiTokenLedger.findMany({
        where,
        select: { createdAt: true, tokensDelta: true },
      }),
      prisma.aiTokenOrder.aggregate({
        where: {
          status: 'PAID',
          ...(createdAt ? { paidAt: createdAt } : {}),
        },
        _sum: { amountFc: true, tokensCount: true },
        _count: { _all: true },
      }),
      computeGenerationReport(createdAt),
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
        generatesRevenue: action === 'recharge',
      };
    });

    const poolSum = (pool: string, key: 'tokensDelta' | 'tokensFromFree' | 'tokensFromBonus' | 'tokensFromGranted') =>
      byPool.filter((row) => row.pool === pool).reduce((sum, row) => sum + (row._sum[key] || 0), 0);

    const paidTokensCredited = Math.max(0, poolSum('paid', 'tokensDelta'));
    const grantedCredits = Math.max(0, poolSum('granted', 'tokensDelta'));
    const freeConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromFree || 0), 0);
    const paidConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromBonus || 0), 0);
    const grantedConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromGranted || 0), 0);
    const unlimitedConsumed = Math.max(0, -poolSum('comp', 'tokensDelta'));

    const relatedComposeIds = items
      .filter((row) => row.action === 'invitation_compose' && row.relatedId)
      .map((row) => row.relatedId as string);

    const composeRuns = relatedComposeIds.length > 0
      ? await prisma.aiTemplateComposeRun.findMany({
          where: { id: { in: relatedComposeIds } },
          select: {
            id: true,
            content: true,
            stage: true,
            previewImageUrl: true,
            prompt: true,
          },
        })
      : [];

    const composeMap = new Map(composeRuns.map((r) => [r.id, r]));

    const serializedItems = items.map((row) => {
      let details: ComposeGenerationDetails | null = null;
      if (row.action === 'invitation_compose' && row.relatedId && composeMap.has(row.relatedId)) {
        details = extractComposeDetailsFromRun(composeMap.get(row.relatedId)!, row.tokensDelta);
      }
      return serializeRow(row, details);
    });

    return res.json({
      totals: {
        moves: total,
        consumed,
        credited,
      },
      money: {
        paidAmountFc: Math.max(0, paidOrders._sum.amountFc || 0),
        paidOrders: paidOrders._count._all,
        paidTokensCredited,
        paidTokensConsumed: paidConsumed,
      },
      nonRevenue: {
        freeConsumed,
        grantedCredits,
        grantedConsumed,
        unlimitedConsumed,
        total: freeConsumed + grantedCredits + grantedConsumed + unlimitedConsumed,
      },
      stock,
      generationReport,
      byAction,
      byDay: bucketLedgerByUtcDay(daySource),
      items: serializedItems,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('getAdminAiTokenUsage:', error);
    return res.status(500).json({ error: 'Impossible de charger l’usage des jetons IA.' });
  }
}

export async function exportAdminAiTokenUsage(req: AuthenticatedRequest, res: Response) {
  try {
    const where = buildWhere(req);
    const createdAt = dateRange(req);

    const [items, report] = await Promise.all([
      prisma.aiTokenLedger.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5000,
        include: {
          user: { select: { email: true, name: true, tenant: { select: { id: true, name: true } } } },
        },
      }),
      computeGenerationReport(createdAt),
    ]);

    const relatedComposeIds = items
      .filter((row) => row.action === 'invitation_compose' && row.relatedId)
      .map((row) => row.relatedId as string);

    const composeRuns = relatedComposeIds.length > 0
      ? await prisma.aiTemplateComposeRun.findMany({
          where: { id: { in: relatedComposeIds } },
          select: {
            id: true,
            content: true,
            stage: true,
            previewImageUrl: true,
            prompt: true,
          },
        })
      : [];

    const composeMap = new Map(composeRuns.map((r) => [r.id, r]));

    const escapeCsv = (str: string | number | null | undefined): string => {
      if (str == null) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [
      `# RAPPORT ÉCONOMIQUE & USAGE JETONS IA — EVENTMASTER`,
      `# Date d'extraction : ${new Date().toISOString()}`,
      `# Mode Rapide (Flash) : ${report.fastGenerations} générations`,
      `# Mode Qualité (Pro 2K) : ${report.qualityGenerations} générations`,
      `# Variantes A/B (2 visuels) : ${report.multiVariantsGenerations} requêtes`,
      `# Replis Sécurité (sans visage) : ${report.safetyFallbackGenerations} générations`,
      `# Coût API Total Estimé : ${report.estimatedCostUsd} $ USD (${report.estimatedCostFc} FC)`,
      `# Recette Estimée : ${report.estimatedRevenueUsd} $ USD (${report.estimatedRevenueFc} FC)`,
      `# Marge Brute Globale : +${report.estimatedMarginPct}% (+${report.estimatedMarginUsd} $ USD)`,
      `#`,
      [
        'ID Mouvement',
        'Date (UTC)',
        'Action',
        'Source',
        'Jetons Delta',
        'Pool',
        'Type Financier',
        'Utilisateur / Nom',
        'Email',
        'Organisation',
        'Appareil',
        'Mode IA (Vitesse)',
        'Échantillons Visuels',
        'Repli Sécurité',
        'Coût API Estimé ($ USD)',
        'Coût API Estimé (FC)',
        'Recette Estimée (FC)',
        'Marge Brute ($ USD)',
        'Marge Brute (%)',
        'Prompt / Brief',
      ].map(escapeCsv).join(','),
    ];

    for (const row of items) {
      let details: ComposeGenerationDetails | null = null;
      if (row.action === 'invitation_compose' && row.relatedId && composeMap.has(row.relatedId)) {
        details = extractComposeDetailsFromRun(composeMap.get(row.relatedId)!, row.tokensDelta);
      }
      const s = serializeRow(row, details);
      lines.push(
        [
          s.id,
          s.createdAt,
          s.actionLabel,
          s.sourceLabel,
          s.tokensDelta,
          s.poolLabel,
          s.moneyKind,
          s.userName || '',
          s.userEmail || '',
          s.tenantName || '',
          s.deviceId || '',
          details ? details.speedModeLabel : '—',
          details ? (details.variantsCount > 1 ? '2 propositions (Variations A/B)' : '1 proposition') : '—',
          details ? (details.safetyFallbackTriggered ? 'Oui (Décor thématique)' : 'Non') : '—',
          details ? details.estimatedCostUsd : '',
          details ? details.estimatedCostFc : '',
          details ? details.estimatedRevenueFc : '',
          details ? details.estimatedMarginUsd : '',
          details ? `${details.estimatedMarginPct}%` : '',
          details?.prompt || '',
        ].map(escapeCsv).join(','),
      );
    }

    const csvContent = '\uFEFF' + lines.join('\r\n');
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="eventmaster-ai-tokens-report-${timestamp}.csv"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('exportAdminAiTokenUsage:', error);
    return res.status(500).json({ error: 'Impossible d’exporter le rapport des jetons IA.' });
  }
}

export async function grantAdminAiTokens(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN' || req.user.impersonatedBy) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const tokensCount = Number(req.body?.tokensCount);
    if (!userId) {
      return res.status(400).json({ error: 'Choisissez un utilisateur.' });
    }
    if (!Number.isFinite(tokensCount) || tokensCount < 1 || tokensCount > 10_000) {
      return res.status(400).json({ error: 'Indiquez un nombre de jetons entre 1 et 10 000.' });
    }
    const result = await grantAiTokensToUser({
      userId,
      tokensCount,
      adminUserId: req.user.id,
    });

    await auditReq(req, {
      action: 'AI_TOKENS_GRANT',
      targetType: 'user',
      targetId: result.user.id,
      tenantId: null,
      summary: `${result.tokensCount} jetons IA attribués à ${result.user.name || result.user.email}`,
      metadata: { tokensCount: result.tokensCount, userEmail: result.user.email },
    });

    return res.json({
      ok: true,
      tokensCount: result.tokensCount,
      user: result.user,
      allowance: result.allowance,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err?.status) {
      return res.status(err.status).json({ error: err.message || 'Impossible d’attribuer les jetons.' });
    }
    console.error('grantAdminAiTokens:', error);
    return res.status(500).json({ error: 'Impossible d’attribuer les jetons.' });
  }
}

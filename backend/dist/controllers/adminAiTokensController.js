"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAiTokenUsage = getAdminAiTokenUsage;
exports.grantAdminAiTokens = grantAdminAiTokens;
const db_1 = require("../db");
const aiSimulationWalletService_1 = require("../services/aiSimulationWalletService");
const aiTokenUsageQuery_1 = require("../services/aiTokenUsageQuery");
const adminAuditService_1 = require("../services/adminAuditService");
const ACTION_IDS = [
    'budget_simulation',
    'invitation_compose',
    'room_plan_from_photo',
    'recharge',
    'grant',
];
const ACTION_LABEL = {
    budget_simulation: 'Simulation budget',
    invitation_compose: 'Invitation IA',
    room_plan_from_photo: 'Plan de salle IA',
    recharge: 'Recharge payante',
    grant: 'Attribution Super Admin',
};
const SOURCE_LABEL = {
    landing: 'Landing',
    simulateur: 'Simulateur dédié',
    dashboard: 'Tableau de bord',
    studio: 'Studio',
    flexpay: 'FlexPay',
    admin: 'Super Admin',
    support: 'Session support',
    unknown: 'Non précisé',
};
const POOL_LABEL = {
    free: 'Essai gratuit — sans revenu',
    bonus: 'Jetons payés',
    mixed: 'Mixte',
    paid: 'Achat FlexPay — revenu',
    granted: 'Offert Super Admin — sans revenu',
    comp: 'Illimité (admin / support) — sans revenu',
};
function moneyKind(pool, action) {
    if (pool === 'paid' || action === 'recharge')
        return 'revenue';
    if (pool === 'bonus')
        return 'revenue';
    if (pool === 'mixed')
        return 'mixed';
    return 'non_revenue';
}
function parseAction(value) {
    const raw = String(value || '').trim();
    if (ACTION_IDS.includes(raw))
        return raw;
    return 'all';
}
function dateRange(req) {
    const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
    const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
    const range = {};
    const start = from ? (0, aiTokenUsageQuery_1.parseUtcDayStart)(from) : undefined;
    const end = to ? (0, aiTokenUsageQuery_1.parseUtcDayEnd)(to) : undefined;
    if (start)
        range.gte = start;
    if (end)
        range.lte = end;
    return range.gte || range.lte ? range : undefined;
}
function buildWhere(req) {
    const action = parseAction(req.query.action);
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const createdAt = dateRange(req);
    const where = {};
    if (action !== 'all')
        where.action = action;
    if (createdAt)
        where.createdAt = createdAt;
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
function serializeRow(row) {
    const action = (ACTION_IDS.includes(row.action)
        ? row.action
        : 'budget_simulation');
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
    };
}
async function platformStock() {
    const [bonusAgg, freeRows] = await Promise.all([
        db_1.prisma.aiSimulationWallet.aggregate({
            _sum: { bonusTokens: true, grantedTokens: true },
            _count: { _all: true },
        }),
        db_1.prisma.$queryRaw `
      SELECT COALESCE(SUM(GREATEST(0, ${aiSimulationWalletService_1.AI_FREE_TRIALS_MAX} - "freeTrialsUsed")), 0) AS remaining_free
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
async function getAdminAiTokenUsage(req, res) {
    try {
        const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(String(req.query.limit || '20'), 10) || 20, 1), 100);
        const where = buildWhere(req);
        const createdAt = dateRange(req);
        const [total, items, grouped, byPool, stock, daySource, paidOrders] = await Promise.all([
            db_1.prisma.aiTokenLedger.count({ where }),
            db_1.prisma.aiTokenLedger.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    user: { select: { email: true, name: true, tenant: { select: { id: true, name: true } } } },
                },
            }),
            db_1.prisma.aiTokenLedger.groupBy({
                by: ['action'],
                where,
                _count: { _all: true },
                _sum: { tokensDelta: true, tokensFromFree: true, tokensFromBonus: true, tokensFromGranted: true },
            }),
            db_1.prisma.aiTokenLedger.groupBy({
                by: ['pool'],
                where,
                _sum: { tokensDelta: true, tokensFromFree: true, tokensFromBonus: true, tokensFromGranted: true },
            }),
            platformStock(),
            db_1.prisma.aiTokenLedger.findMany({
                where,
                select: { createdAt: true, tokensDelta: true },
            }),
            db_1.prisma.aiTokenOrder.aggregate({
                where: {
                    status: 'PAID',
                    ...(createdAt ? { paidAt: createdAt } : {}),
                },
                _sum: { amountFc: true, tokensCount: true },
                _count: { _all: true },
            }),
        ]);
        let consumed = 0;
        let credited = 0;
        const byAction = grouped.map((row) => {
            const action = (ACTION_IDS.includes(row.action)
                ? row.action
                : 'budget_simulation');
            const delta = row._sum.tokensDelta || 0;
            if (delta < 0)
                consumed += -delta;
            if (delta > 0)
                credited += delta;
            return {
                action,
                actionLabel: ACTION_LABEL[action],
                count: row._count._all,
                tokensConsumed: delta < 0 ? -delta : 0,
                tokensCredited: delta > 0 ? delta : 0,
                generatesRevenue: action === 'recharge',
            };
        });
        const poolSum = (pool, key) => byPool.filter((row) => row.pool === pool).reduce((sum, row) => sum + (row._sum[key] || 0), 0);
        const paidTokensCredited = Math.max(0, poolSum('paid', 'tokensDelta'));
        const grantedCredits = Math.max(0, poolSum('granted', 'tokensDelta'));
        const freeConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromFree || 0), 0);
        const paidConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromBonus || 0), 0);
        const grantedConsumed = byPool.reduce((sum, row) => sum + Math.max(0, row._sum.tokensFromGranted || 0), 0);
        const unlimitedConsumed = Math.max(0, -poolSum('comp', 'tokensDelta'));
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
            byAction,
            byDay: (0, aiTokenUsageQuery_1.bucketLedgerByUtcDay)(daySource),
            items: items.map(serializeRow),
            total,
            page,
            pageSize,
        });
    }
    catch (error) {
        console.error('getAdminAiTokenUsage:', error);
        return res.status(500).json({ error: 'Impossible de charger l’usage des jetons IA.' });
    }
}
async function grantAdminAiTokens(req, res) {
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
        const result = await (0, aiSimulationWalletService_1.grantAiTokensToUser)({
            userId,
            tokensCount,
            adminUserId: req.user.id,
        });
        await (0, adminAuditService_1.auditReq)(req, {
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
    }
    catch (error) {
        const err = error;
        if (err?.status) {
            return res.status(err.status).json({ error: err.message || 'Impossible d’attribuer les jetons.' });
        }
        console.error('grantAdminAiTokens:', error);
        return res.status(500).json({ error: 'Impossible d’attribuer les jetons.' });
    }
}

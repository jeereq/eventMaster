"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminAiTokenUsage = getAdminAiTokenUsage;
exports.exportAdminAiTokenUsage = exportAdminAiTokenUsage;
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
function extractComposeDetailsFromRun(run, tokensDelta) {
    const content = run.content && typeof run.content === 'object' ? run.content : {};
    const global = content.global && typeof content.global === 'object' ? content.global : {};
    const speedMode = global.speedMode === 'fast' ? 'fast' : 'quality';
    const variants = Array.isArray(global.variants) ? global.variants : [];
    const variantsCount = variants.length > 0 ? variants.length : 1;
    const safetyFallbackTriggered = global.safetyFallbackTriggered === true;
    const previewImageUrl = run.previewImageUrl || (typeof global.bgImageUrl === 'string' ? global.bgImageUrl : null);
    const prompt = run.prompt || (typeof global.prompt === 'string' ? global.prompt : null);
    const metrics = (0, aiTokenUsageQuery_1.estimateComposeCostAndMargin)({
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
async function computeGenerationReport(createdAt) {
    const runs = await db_1.prisma.aiTemplateComposeRun.findMany({
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
        }
        else {
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
    const estimatedMarginPct = estimatedRevenueUsd > 0
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
function serializeRow(row, composeDetails) {
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
        composeDetails: composeDetails || null,
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
        const [total, items, grouped, byPool, stock, daySource, paidOrders, generationReport] = await Promise.all([
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
            computeGenerationReport(createdAt),
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
        const relatedComposeIds = items
            .filter((row) => row.action === 'invitation_compose' && row.relatedId)
            .map((row) => row.relatedId);
        const composeRuns = relatedComposeIds.length > 0
            ? await db_1.prisma.aiTemplateComposeRun.findMany({
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
            let details = null;
            if (row.action === 'invitation_compose' && row.relatedId && composeMap.has(row.relatedId)) {
                details = extractComposeDetailsFromRun(composeMap.get(row.relatedId), row.tokensDelta);
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
            byDay: (0, aiTokenUsageQuery_1.bucketLedgerByUtcDay)(daySource),
            items: serializedItems,
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
async function exportAdminAiTokenUsage(req, res) {
    try {
        const where = buildWhere(req);
        const createdAt = dateRange(req);
        const [items, report] = await Promise.all([
            db_1.prisma.aiTokenLedger.findMany({
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
            .map((row) => row.relatedId);
        const composeRuns = relatedComposeIds.length > 0
            ? await db_1.prisma.aiTemplateComposeRun.findMany({
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
        const escapeCsv = (str) => {
            if (str == null)
                return '""';
            const s = String(str).replace(/"/g, '""');
            return `"${s}"`;
        };
        const lines = [
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
            let details = null;
            if (row.action === 'invitation_compose' && row.relatedId && composeMap.has(row.relatedId)) {
                details = extractComposeDetailsFromRun(composeMap.get(row.relatedId), row.tokensDelta);
            }
            const s = serializeRow(row, details);
            lines.push([
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
            ].map(escapeCsv).join(','));
        }
        const csvContent = '\uFEFF' + lines.join('\r\n');
        const timestamp = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="eventmaster-ai-tokens-report-${timestamp}.csv"`);
        return res.send(csvContent);
    }
    catch (error) {
        console.error('exportAdminAiTokenUsage:', error);
        return res.status(500).json({ error: 'Impossible d’exporter le rapport des jetons IA.' });
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

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_PRICE_CDF = exports.USD_TO_CDF_RATE = void 0;
exports.resolveLedgerAction = resolveLedgerAction;
exports.parseUtcDayStart = parseUtcDayStart;
exports.parseUtcDayEnd = parseUtcDayEnd;
exports.utcDayKey = utcDayKey;
exports.bucketLedgerByUtcDay = bucketLedgerByUtcDay;
exports.estimateComposeCostAndMargin = estimateComposeCostAndMargin;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function resolveLedgerAction(action) {
    return action || 'budget_simulation';
}
function parseUtcDayStart(value) {
    const raw = value.trim();
    if (!raw)
        return undefined;
    const d = ISO_DAY.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function parseUtcDayEnd(value) {
    const raw = value.trim();
    if (!raw)
        return undefined;
    const d = ISO_DAY.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d;
}
function utcDayKey(value) {
    return value.toISOString().slice(0, 10);
}
function bucketLedgerByUtcDay(rows) {
    const map = new Map();
    for (const row of rows) {
        const day = utcDayKey(row.createdAt);
        const current = map.get(day) || { consumed: 0, credited: 0, moves: 0 };
        current.moves += 1;
        if (row.tokensDelta < 0)
            current.consumed += -row.tokensDelta;
        if (row.tokensDelta > 0)
            current.credited += row.tokensDelta;
        map.set(day, current);
    }
    return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, values]) => ({ day, ...values }));
}
exports.USD_TO_CDF_RATE = 2800;
exports.TOKEN_PRICE_CDF = 416; // 2 jetons = 832 FC ≈ 0,30 $ USD
function estimateComposeCostAndMargin(params) {
    const rate = params.rateCdf || exports.USD_TO_CDF_RATE;
    const isFast = params.speedMode === 'fast';
    const speedMode = isFast ? 'fast' : 'quality';
    const speedModeLabel = isFast ? '⚡ Rapide (Flash)' : '✨ Qualité (Pro 2K)';
    const variantsCount = Math.max(1, params.variantsCount ?? 1);
    const safetyFallbackTriggered = Boolean(params.safetyFallbackTriggered);
    // Coût API unitaire estimé (USD) par image
    const unitImageCost = isFast ? 0.030 : 0.065;
    const overheadVisionCost = 0.002; // reformulation & analyse vision OCR
    // Si repli de sécurité, une tentative initiale a été exécutée puis un décor de secours a été généré
    const totalCalls = variantsCount + (safetyFallbackTriggered ? 1 : 0);
    const rawCostUsd = totalCalls * unitImageCost + overheadVisionCost;
    const estimatedCostUsd = Math.round(rawCostUsd * 1000) / 1000;
    const estimatedCostFc = Math.round(estimatedCostUsd * rate);
    // Recette facturée (2 jetons par génération = 832 FC par défaut)
    const tokens = Math.abs(params.tokensConsumed ?? 2) || 2;
    const estimatedRevenueFc = tokens * exports.TOKEN_PRICE_CDF;
    const estimatedRevenueUsd = Math.round((estimatedRevenueFc / rate) * 1000) / 1000;
    const estimatedMarginUsd = Math.round((estimatedRevenueUsd - estimatedCostUsd) * 1000) / 1000;
    const estimatedMarginPct = estimatedRevenueUsd > 0
        ? Math.round((estimatedMarginUsd / estimatedRevenueUsd) * 100)
        : 0;
    return {
        speedMode,
        speedModeLabel,
        variantsCount,
        safetyFallbackTriggered,
        estimatedCostUsd,
        estimatedCostFc,
        estimatedRevenueUsd,
        estimatedRevenueFc,
        estimatedMarginUsd,
        estimatedMarginPct,
    };
}

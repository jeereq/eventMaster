"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF = exports.DEFAULT_AI_TOKEN_PRICE_CDF = void 0;
exports.sanitizeAiTokenPriceCdf = sanitizeAiTokenPriceCdf;
exports.sanitizeAiTokenMinPurchaseCdf = sanitizeAiTokenMinPurchaseCdf;
exports.resolveAiTokenPricing = resolveAiTokenPricing;
exports.calculateTokensForAmount = calculateTokensForAmount;
exports.calculateAmountForTokens = calculateAmountForTokens;
exports.DEFAULT_AI_TOKEN_PRICE_CDF = 416;
exports.DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF = 2500;
function sanitizeAiTokenPriceCdf(value) {
    const parsed = Math.round(Number(value));
    if (!Number.isFinite(parsed) || parsed < 1)
        return exports.DEFAULT_AI_TOKEN_PRICE_CDF;
    return Math.min(1_000_000, parsed);
}
function sanitizeAiTokenMinPurchaseCdf(value, priceCdf = exports.DEFAULT_AI_TOKEN_PRICE_CDF) {
    const parsed = Math.round(Number(value));
    const floor = Math.max(1, priceCdf);
    if (!Number.isFinite(parsed) || parsed < floor) {
        return Math.max(exports.DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF, floor);
    }
    return Math.min(100_000_000, parsed);
}
function resolveAiTokenPricing(input) {
    const priceCdf = sanitizeAiTokenPriceCdf(input?.aiTokenPriceCdf);
    const minAmountCdf = sanitizeAiTokenMinPurchaseCdf(input?.aiTokenMinPurchaseCdf, priceCdf);
    return {
        priceCdf,
        minAmountCdf,
        minCount: Math.max(1, Math.floor(minAmountCdf / priceCdf)),
    };
}
function calculateTokensForAmount(amountFc, pricing) {
    if (!Number.isFinite(amountFc) || amountFc < pricing.minAmountCdf) {
        return pricing.minCount;
    }
    return Math.max(pricing.minCount, Math.floor(amountFc / pricing.priceCdf));
}
function calculateAmountForTokens(tokensCount, pricing) {
    const count = Math.max(pricing.minCount, Math.round(tokensCount || pricing.minCount));
    return Math.max(pricing.minAmountCdf, count * pricing.priceCdf);
}

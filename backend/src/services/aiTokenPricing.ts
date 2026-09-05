export const DEFAULT_AI_TOKEN_PRICE_CDF = 416;
export const DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF = 2500;

export type AiTokenPricing = {
  priceCdf: number;
  minAmountCdf: number;
  minCount: number;
};

export function sanitizeAiTokenPriceCdf(value: unknown): number {
  const parsed = Math.round(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_AI_TOKEN_PRICE_CDF;
  return Math.min(1_000_000, parsed);
}

export function sanitizeAiTokenMinPurchaseCdf(value: unknown, priceCdf = DEFAULT_AI_TOKEN_PRICE_CDF): number {
  const parsed = Math.round(Number(value));
  const floor = Math.max(1, priceCdf);
  if (!Number.isFinite(parsed) || parsed < floor) {
    return Math.max(DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF, floor);
  }
  return Math.min(100_000_000, parsed);
}

export function resolveAiTokenPricing(input?: {
  aiTokenPriceCdf?: unknown;
  aiTokenMinPurchaseCdf?: unknown;
}): AiTokenPricing {
  const priceCdf = sanitizeAiTokenPriceCdf(input?.aiTokenPriceCdf);
  const minAmountCdf = sanitizeAiTokenMinPurchaseCdf(input?.aiTokenMinPurchaseCdf, priceCdf);
  return {
    priceCdf,
    minAmountCdf,
    minCount: Math.max(1, Math.floor(minAmountCdf / priceCdf)),
  };
}

export function calculateTokensForAmount(amountFc: number, pricing: AiTokenPricing): number {
  if (!Number.isFinite(amountFc) || amountFc < pricing.minAmountCdf) {
    return pricing.minCount;
  }
  return Math.max(pricing.minCount, Math.floor(amountFc / pricing.priceCdf));
}

export function calculateAmountForTokens(tokensCount: number, pricing: AiTokenPricing): number {
  const count = Math.max(pricing.minCount, Math.round(tokensCount || pricing.minCount));
  return Math.max(pricing.minAmountCdf, count * pricing.priceCdf);
}

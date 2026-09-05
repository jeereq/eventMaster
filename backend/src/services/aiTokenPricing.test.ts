import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAmountForTokens,
  calculateTokensForAmount,
  DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF,
  DEFAULT_AI_TOKEN_PRICE_CDF,
  resolveAiTokenPricing,
} from './aiTokenPricing.ts';

describe('resolveAiTokenPricing', () => {
  it('garde 2 500 FC → 6 jetons avec les défauts', () => {
    const pricing = resolveAiTokenPricing({
      aiTokenPriceCdf: DEFAULT_AI_TOKEN_PRICE_CDF,
      aiTokenMinPurchaseCdf: DEFAULT_AI_TOKEN_MIN_PURCHASE_CDF,
    });
    assert.equal(pricing.priceCdf, 416);
    assert.equal(pricing.minAmountCdf, 2500);
    assert.equal(pricing.minCount, 6);
    assert.equal(calculateTokensForAmount(2500, pricing), 6);
  });

  it('accepte un prix et un seuil personnalisés', () => {
    const pricing = resolveAiTokenPricing({
      aiTokenPriceCdf: 500,
      aiTokenMinPurchaseCdf: 2000,
    });
    assert.equal(pricing.minCount, 4);
    assert.equal(calculateTokensForAmount(2000, pricing), 4);
    assert.equal(calculateTokensForAmount(3500, pricing), 7);
    assert.equal(calculateAmountForTokens(4, pricing), 2000);
  });

  it('rejette un prix invalide', () => {
    const pricing = resolveAiTokenPricing({
      aiTokenPriceCdf: 0,
      aiTokenMinPurchaseCdf: 100,
    });
    assert.equal(pricing.priceCdf, DEFAULT_AI_TOKEN_PRICE_CDF);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDonationCurrency,
  readDonationCurrency,
  resolveDonationAmount,
  sanitizeSuggestedDonationsUsd,
  summarizeDonationCurrencies,
} from './donationCurrency.ts';
import { sanitizeEventDonationsConfig, DEFAULT_DONATIONS_ACCESS } from './donationsAccess.ts';

describe('dons en FC et en dollars', () => {
  it('lit la devise choisie (FC par défaut)', () => {
    assert.equal(parseDonationCurrency('USD'), 'USD');
    assert.equal(parseDonationCurrency('$'), 'USD');
    assert.equal(parseDonationCurrency('cdf'), 'CDF');
    assert.equal(parseDonationCurrency(undefined), 'CDF');
  });

  it('garde l’ancien format en FC', () => {
    const r = resolveDonationAmount({
      body: { donationAmountFc: 5000 },
      minAmountFc: 1000,
      minAmountUsd: 1,
      usdExchangeRateCdf: 2800,
    });
    assert.deepEqual(r, { ok: true, currency: 'CDF', amount: 5000, amountFc: 5000, rate: 2800 });
  });

  it('prend un don en dollars et calcule sa contre-valeur en FC', () => {
    const r = resolveDonationAmount({
      body: { currency: 'USD', amount: 10.5 },
      minAmountFc: 1000,
      minAmountUsd: 1,
      usdExchangeRateCdf: 2800,
    });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.currency, 'USD');
      assert.equal(r.amount, 10.5);
      assert.equal(r.amountFc, 29400);
    }
  });

  it('applique le minimum de chaque devise', () => {
    const usd = resolveDonationAmount({ body: { currency: 'USD', amount: 0.5 }, minAmountFc: 1000, minAmountUsd: 1, usdExchangeRateCdf: 2800 });
    assert.equal(usd.ok, false);
    const fc = resolveDonationAmount({ body: { currency: 'CDF', amount: 500 }, minAmountFc: 1000, minAmountUsd: 1, usdExchangeRateCdf: 2800 });
    assert.equal(fc.ok, false);
  });

  it('additionne les dons par devise', () => {
    const totals = summarizeDonationCurrencies([
      { amountFc: 5000, selectedSeats: { kind: 'DONATION' } },
      { amountFc: 28000, selectedSeats: { donationCurrency: 'USD', donationAmount: 10 } },
      { amountFc: 14000, selectedSeats: { donationCurrency: 'USD', donationAmount: 5 } },
      { amountFc: 2500, selectedSeats: null },
    ]);
    assert.deepEqual(totals.CDF, { amount: 7500, amountFc: 7500, count: 2 });
    assert.deepEqual(totals.USD, { amount: 15, amountFc: 42000, count: 2 });
    assert.deepEqual(readDonationCurrency({}, 3000), { currency: 'CDF', amount: 3000 });
  });

  it('nettoie les montants suggérés en dollars', () => {
    assert.deepEqual(sanitizeSuggestedDonationsUsd([20, 5, 5, 0.2, 'x'], 1), [5, 20]);
    assert.deepEqual(sanitizeSuggestedDonationsUsd([], 1), [5, 10, 20, 50, 100]);
    const conf = sanitizeEventDonationsConfig({ enabled: true, minAmountUsd: 2, suggestedAmountsUsd: [1, 3, 15] }, DEFAULT_DONATIONS_ACCESS);
    assert.equal(conf.minAmountUsd, 2);
    assert.deepEqual(conf.suggestedAmountsUsd, [3, 15]);
  });
});

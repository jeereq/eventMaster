import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addMonthsUtc,
  buildSmsCreditPacks,
  DEFAULT_SMS_CREDIT_SETTINGS,
  getSmsCreditPack,
  sanitizeSmsCreditSettings,
  smsIncludedForPlan,
  smsPackMargin,
  smsPeriodKey,
} from './smsCreditsConfig.ts';

describe('packs de crédits SMS', () => {
  it('calcule les prix par défaut à 0,03 $ le SMS et 2 270 FC pour 1 USD', () => {
    const prices = buildSmsCreditPacks().map((p) => [p.smsCount, p.priceFc]);
    assert.deepEqual(prices, [[50, 4000], [100, 8000], [250, 19500], [500, 38500], [1000, 75000]]);
  });

  it('garde une marge légère (4 à 15 % du coût) aux réglages par défaut', () => {
    for (const pack of buildSmsCreditPacks()) {
      const { marginRate } = smsPackMargin(pack);
      assert.ok(marginRate >= 0.04 && marginRate <= 0.15, `${pack.id}: ${marginRate}`);
    }
  });

  it('suit le coût du SMS réglé par l\'administrateur', () => {
    const settings = sanitizeSmsCreditSettings({ ...DEFAULT_SMS_CREDIT_SETTINGS, unitCostUsd: 0.08 });
    const pack = getSmsCreditPack('sms_100', settings);
    assert.ok(pack);
    assert.ok(pack.priceFc > 20000);
    assert.ok(smsPackMargin(pack, settings).marginRate > 0.04);
  });

  it('retrouve un pack par identifiant et refuse un identifiant inconnu', () => {
    assert.equal(getSmsCreditPack('sms_100')?.priceFc, 8000);
    assert.equal(getSmsCreditPack('sms_7'), null);
    assert.equal(getSmsCreditPack(undefined), null);
  });
});

describe('réglages SMS', () => {
  it('borne les valeurs et retombe sur les défauts', () => {
    const s = sanitizeSmsCreditSettings({ unitCostUsd: -1, fxRateCdf: 'abc', paymentFeeRate: 9, validityMonths: 500, lowThreshold: 0, packs: [] });
    assert.equal(s.unitCostUsd, 0.001);
    assert.equal(s.fxRateCdf, DEFAULT_SMS_CREDIT_SETTINGS.fxRateCdf);
    assert.equal(s.paymentFeeRate, 0.2);
    assert.equal(s.validityMonths, 60);
    assert.equal(s.lowThreshold, 0.1);
    assert.equal(s.packs.length, DEFAULT_SMS_CREDIT_SETTINGS.packs.length);
  });

  it('trie les packs, retire les doublons et les packs trop petits', () => {
    const s = sanitizeSmsCreditSettings({
      packs: [{ smsCount: 300, coefficient: 1.1 }, { smsCount: 100, coefficient: 1.2 }, { smsCount: 100, coefficient: 1.5 }, { smsCount: 5, coefficient: 1.2 }],
    });
    assert.deepEqual(s.packs.map((p) => p.smsCount), [100, 300]);
    assert.equal(s.packs[0].coefficient, 1.2);
  });

  it('refuse un coefficient inférieur à 1 (vente à perte)', () => {
    const s = sanitizeSmsCreditSettings({ packs: [{ smsCount: 100, coefficient: 0.5 }] });
    assert.equal(s.packs[0].coefficient, 1);
  });

  it('accepte des quotas inclus modifiés par forfait', () => {
    const s = sanitizeSmsCreditSettings({ included: { STANDARD: 250, PREMIUM_1: -5 } });
    assert.equal(smsIncludedForPlan('STANDARD', s), 250);
    assert.equal(smsIncludedForPlan('PREMIUM_1', s), 0);
    assert.equal(smsIncludedForPlan('PREMIUM_2', s), 250);
  });
});

describe('SMS inclus par forfait', () => {
  it('suit la grille par défaut', () => {
    assert.equal(smsIncludedForPlan('FREE'), 0);
    assert.equal(smsIncludedForPlan('STANDARD'), 100);
    assert.equal(smsIncludedForPlan('PREMIUM_2'), 250);
    assert.equal(smsIncludedForPlan('ENTERPRISE_3'), 900);
    assert.equal(smsIncludedForPlan('PERSONAL_PLUS'), 810);
    assert.equal(smsIncludedForPlan(null), 0);
  });

  it('compte par mois pour le B2B et par trimestre pour les Particuliers', () => {
    const march = new Date(Date.UTC(2026, 2, 15));
    assert.equal(smsPeriodKey('STANDARD', march), '2026-03');
    assert.equal(smsPeriodKey('PERSONAL_100', march), '2026-Q1');
    assert.equal(smsPeriodKey('PERSONAL_100', new Date(Date.UTC(2026, 3, 1))), '2026-Q2');
  });
});

describe('validité des crédits', () => {
  it('ajoute 12 mois en gardant un jour valide', () => {
    assert.equal(addMonthsUtc(new Date(Date.UTC(2026, 10, 22)), 12).toISOString().slice(0, 10), '2027-11-22');
    assert.equal(addMonthsUtc(new Date(Date.UTC(2027, 1, 28)), 12).toISOString().slice(0, 10), '2028-02-28');
    assert.equal(addMonthsUtc(new Date(Date.UTC(2028, 1, 29)), 12).toISOString().slice(0, 10), '2029-02-28');
  });
});

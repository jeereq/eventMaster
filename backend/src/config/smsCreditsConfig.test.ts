import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addMonthsUtc,
  getSmsCreditPack,
  SMS_CREDIT_PACKS,
  smsIncludedForPlan,
  smsPackMargin,
  smsPeriodKey,
} from './smsCreditsConfig.ts';

describe('packs de crédits SMS', () => {
  it('garde une marge légère (4 à 15 % du coût) au coût réel de 0,03 $', () => {
    for (const pack of SMS_CREDIT_PACKS) {
      const { marginRate } = smsPackMargin(pack);
      assert.ok(marginRate >= 0.04 && marginRate <= 0.15, `${pack.id}: ${marginRate}`);
    }
  });

  it('le prix par SMS baisse avec le volume sans passer sous le coût', () => {
    const unit = SMS_CREDIT_PACKS.map((p) => p.priceFc / p.smsCount);
    for (let i = 1; i < unit.length; i += 1) assert.ok(unit[i] <= unit[i - 1]);
    for (const pack of SMS_CREDIT_PACKS) assert.ok(smsPackMargin(pack).gainFc > 0);
  });

  it('retrouve un pack par identifiant et refuse un identifiant inconnu', () => {
    assert.equal(getSmsCreditPack('sms_100')?.priceFc, 8000);
    assert.equal(getSmsCreditPack('sms_7'), null);
    assert.equal(getSmsCreditPack(undefined), null);
  });
});

describe('SMS inclus par forfait', () => {
  it('suit la grille proposée', () => {
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

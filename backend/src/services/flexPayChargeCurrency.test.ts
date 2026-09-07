import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  convertFcToUsd,
  formatFlexPayApiAmount,
  parseFlexPayChargeCurrency,
  resolveFlexPayCharge,
} from './flexPayChargeCurrency.ts';

describe('flexPayChargeCurrency', () => {
  it('n’accepte le dollar que pour le Mobile Money', () => {
    assert.equal(parseFlexPayChargeCurrency('USD', 'mobile'), 'USD');
    assert.equal(parseFlexPayChargeCurrency('dollar', 'mobile'), 'USD');
    assert.equal(parseFlexPayChargeCurrency('USD', 'card'), 'CDF');
    assert.equal(parseFlexPayChargeCurrency('CDF', 'mobile'), 'CDF');
  });

  it('convertit les francs au taux Superadmin', () => {
    assert.equal(convertFcToUsd(28000, 2800), 10);
    assert.equal(convertFcToUsd(2500, 2800), 0.89);
  });

  it('envoie des dollars à deux décimales', () => {
    const charge = resolveFlexPayCharge(2500, 'USD', 2800);
    assert.equal(charge.currency, 'USD');
    assert.equal(charge.amount, 0.89);
    assert.equal(formatFlexPayApiAmount(charge.amount, 'USD'), '0.89');
  });

  it('refuse un montant dollar trop faible', () => {
    assert.throws(() => resolveFlexPayCharge(10, 'USD', 2800), /trop faible/);
  });
});

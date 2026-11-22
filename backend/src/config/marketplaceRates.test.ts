import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMarketplaceAmountsWith as computeMarketplaceAmounts,
  ratesWithVendorDeposit,
  resolveMarketplaceRates as getMarketplaceBillingRates,
} from './marketplaceRates.ts';

test('aucune commission marketplace par défaut, acompte de 30 %', () => {
  const rates = getMarketplaceBillingRates({ marketplaceCommissionRate: 0, marketplaceDepositRate: 0.3 });
  assert.equal(rates.commissionRate, 0);
  assert.equal(rates.depositRate, 0.3);
  const amounts = computeMarketplaceAmounts(100_000, rates);
  assert.equal(amounts.commissionFc, 0);
  assert.equal(amounts.depositFc, 30_000);
});

test('la commission peut être fixée à 0 par l’admin (plus de minimum à 1 %)', () => {
  const rates = getMarketplaceBillingRates({ marketplaceCommissionRate: 0, marketplaceDepositRate: 0.3 });
  assert.equal(rates.commissionRate, 0);
  const withCommission = getMarketplaceBillingRates({ marketplaceCommissionRate: 0.05, marketplaceDepositRate: 0.3 });
  assert.equal(withCommission.commissionRate, 0.05);
});

test('un prestataire peut fixer son propre taux d’acompte', () => {
  const base = getMarketplaceBillingRates({ marketplaceCommissionRate: 0, marketplaceDepositRate: 0.3 });
  assert.equal(ratesWithVendorDeposit(0.5, base).depositRate, 0.5);
  assert.equal(computeMarketplaceAmounts(200_000, ratesWithVendorDeposit(0.5, base)).depositFc, 100_000);
});

test('sans taux propre, le taux de la plateforme s’applique', () => {
  const base = getMarketplaceBillingRates({ marketplaceCommissionRate: 0, marketplaceDepositRate: 0.3 });
  assert.equal(ratesWithVendorDeposit(null, base).depositRate, 0.3);
  assert.equal(ratesWithVendorDeposit(undefined, base).depositRate, 0.3);
});

test('le taux propre reste borné entre 5 % et 90 %', () => {
  const base = getMarketplaceBillingRates({ marketplaceCommissionRate: 0, marketplaceDepositRate: 0.3 });
  assert.equal(ratesWithVendorDeposit(0.01, base).depositRate, 0.05);
  assert.equal(ratesWithVendorDeposit(0.99, base).depositRate, 0.9);
});

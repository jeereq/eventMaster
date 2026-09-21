import assert from 'node:assert/strict';
import test from 'node:test';
import { beverageBudgetAmount, parseBudgetSimulationScope, parseWantedBrandIds, parseWantedSaleUnits, rentalBudgetAmount } from './eventBudgetCost.ts';

test('le périmètre de simulation inconnu reste la simulation complète', () => {
  assert.deepEqual(parseWantedBrandIds([' a ', 'a', '', 3, 'b']), ['a', 'b']);
  assert.deepEqual(parseWantedSaleUnits(['CRATE', 'CRATE', 'nope', 'BOTTLE']), ['BOTTLE', 'CRATE']);
  assert.equal(parseBudgetSimulationScope('drinks'), 'drinks');
  assert.equal(parseBudgetSimulationScope('rentals'), 'rentals');
  assert.equal(parseBudgetSimulationScope('services'), 'services');
  assert.equal(parseBudgetSimulationScope('autre'), 'complete');
});

test('les chaises se comptent à la pièce, et la livraison en supplément une seule fois', () => {
  const chairs = rentalBudgetAmount({
    category: 'RENTAL_CHAIRS',
    priceUnit: 'EVENT',
    priceFromFc: 2500,
    guestCount: 80,
    dayCount: 3,
    deliveryMode: 'extra_fee',
    deliveryPriceFc: 15000,
  });
  assert.equal(chairs?.amountFc, 80 * 2500 + 15000);
  assert.match(chairs?.note || '', /80 pièces/);
  assert.match(chairs?.note || '', /livraison/);
});

test('une chaise à la journée multiplie les invités et les jours, pas la livraison incluse', () => {
  const chairs = rentalBudgetAmount({
    category: 'RENTAL_CHAIRS',
    priceUnit: 'DAY',
    priceFromFc: 1000,
    promoPriceFc: 800,
    guestCount: 10,
    dayCount: 2,
    deliveryMode: 'included',
    deliveryPriceFc: 5000,
  });
  assert.equal(chairs?.amountFc, 10 * 800 * 2);
  assert.match(chairs?.note || '', /livraison incluse/);
});

test('une tente reste un lot par jour, sans multiplier par les invités', () => {
  const tent = rentalBudgetAmount({
    category: 'RENTAL_TENT',
    priceUnit: 'DAY',
    priceFromFc: 40000,
    guestCount: 100,
    dayCount: 2,
    deliveryMode: 'pickup',
  });
  assert.equal(tent?.amountFc, 80000);
  assert.match(tent?.note || '', /retrait sur place/);
});

test('une prestation forfaitaire indique une quantité, un lot aussi', () => {
  const catering = rentalBudgetAmount({
    category: 'CATERING',
    priceUnit: 'EVENT',
    priceFromFc: 150000,
    guestCount: 80,
  });
  assert.equal(catering?.amountFc, 150000);
  assert.match(catering?.note || '', /1 prestation/);
  const decor = rentalBudgetAmount({
    category: 'RENTAL_DECOR',
    priceUnit: 'EVENT',
    priceFromFc: 40000,
    guestCount: 80,
  });
  assert.match(decor?.note || '', /1 lot/);
});

test('les boissons prennent le conditionnement le moins cher et ignorent l’alcool pour un office religieux', () => {
  const offers = [
    { kind: 'BEER', brandName: 'Primus', quantity: 1, unitLabel: 'bouteille', priceFc: 2500 },
    { kind: 'BEER', brandName: 'Primus', quantity: 12, unitLabel: 'casier', priceFc: 24000 },
    { kind: 'DRINK', brandName: 'Coca', quantity: 1, unitLabel: 'bouteille', priceFc: 1500 },
  ];
  const wedding = beverageBudgetAmount(offers, 10, 'wedding', 'cheap');
  assert.equal(wedding?.amountFc, 24000 + 10 * 1500);
  assert.match(wedding?.note || '', /casier/);
  const beer = wedding?.lines.find((line) => line.kind === 'BEER');
  const soft = wedding?.lines.find((line) => line.kind === 'DRINK');
  assert.equal(beer?.brandName, 'Primus');
  assert.equal(beer?.quantityLabel, '1 × casier');
  assert.equal(beer?.unitPriceFc, 24000);
  assert.equal(soft?.brandName, 'Coca');
  assert.equal(soft?.quantityLabel, '10 × bouteille');
  assert.equal(soft?.unitPriceFc, 1500);
  const office = beverageBudgetAmount(offers, 10, 'religious', 'comfort');
  assert.equal(office?.amountFc, 20 * 1500);
  assert.doesNotMatch(office?.note || '', /Bière/);
});

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

test('chaque marque choisie a sa quantité, même hors du menu par défaut', () => {
  const offers = [
    { kind: 'BEER', brandId: 'primus', brandName: 'Primus', quantity: 12, unitLabel: 'casier', priceFc: 24000 },
    { kind: 'BEER', brandId: 'turbo', brandName: 'Turbo', quantity: 1, unitLabel: 'bouteille', priceFc: 2000 },
    { kind: 'DRINK', brandId: 'coca', brandName: 'Coca', quantity: 1, unitLabel: 'bouteille', priceFc: 1500 },
    { kind: 'CHAMPAGNE', brandId: 'dom', brandName: 'Dom', quantity: 1, unitLabel: 'bouteille', priceFc: 80000 },
  ];
  const focused = beverageBudgetAmount(offers, 10, 'wedding', 'cheap', [
    { id: 'turbo', name: 'Turbo', kind: 'BEER' },
    { id: 'dom', name: 'Dom', kind: 'CHAMPAGNE' },
  ]);
  assert.equal(focused?.lines.length, 2);
  assert.equal(focused?.lines.some((line) => line.brandName === 'Coca'), false);
  const turbo = focused?.lines.find((line) => line.brandName === 'Turbo');
  const champagne = focused?.lines.find((line) => line.brandName === 'Dom');
  assert.equal(turbo?.quantityLabel, '10 × bouteille');
  assert.equal(turbo?.amountFc, 20000);
  assert.equal(champagne?.quantityLabel, '2 × bouteille');
  assert.equal(champagne?.amountFc, 160000);
  assert.equal(focused?.amountFc, 180000);

  const crates = beverageBudgetAmount(
    [{ kind: 'BEER', brandId: 'primus', brandName: 'Primus', quantity: 12, unitLabel: 'casier', priceFc: 24000 }],
    10,
    'wedding',
    'cheap',
    [{ id: 'primus', name: 'Primus', kind: 'BEER' }],
  );
  assert.equal(crates?.lines[0]?.quantityLabel, '1 × casier');
  assert.equal(crates?.amountFc, 24000);

  const ceremony = beverageBudgetAmount(
    [{ kind: 'BEER', brandId: 'primus', brandName: 'Primus', quantity: 1, unitLabel: 'bouteille', priceFc: 2500 }],
    10,
    'religious',
    'comfort',
    [{ id: 'primus', name: 'Primus', kind: 'BEER' }],
  );
  assert.equal(ceremony?.amountFc, 0);
  assert.match(ceremony?.lines[0]?.detail || '', /alcool non inclus/);
});

test('une commande précise compte les casiers demandés, pas une estimation par invité', () => {
  const offers = [
    { kind: 'BEER', brandId: 'tembo', brandName: 'Tembo', unitKind: 'CRATE', quantity: 12, unitLabel: 'casier', priceFc: 24000 },
    { kind: 'DRINK', brandId: 'coca', brandName: 'Coca', unitKind: 'CRATE', quantity: 24, unitLabel: 'casier', priceFc: 18000 },
    { kind: 'DRINK', brandId: 'coca', brandName: 'Coca', unitKind: 'BOTTLE', quantity: 1, unitLabel: 'bouteille', priceFc: 1500 },
  ];
  const order = beverageBudgetAmount(offers, 0, 'wedding', 'cheap', [
    { id: 'tembo', name: 'Tembo', kind: 'BEER' },
    { id: 'coca', name: 'Coca', kind: 'DRINK' },
  ], [
    { brandId: 'tembo', unitKind: 'CRATE', packs: 10 },
    { brandId: 'coca', unitKind: 'CRATE', packs: 5 },
  ]);
  assert.equal(order?.lines.length, 2);
  assert.equal(order?.lines[0]?.quantityLabel, '10 × casier');
  assert.equal(order?.lines[0]?.amountFc, 240000);
  assert.equal(order?.lines[1]?.quantityLabel, '5 × casier');
  assert.equal(order?.lines[1]?.amountFc, 90000);
  assert.equal(order?.amountFc, 330000);
});

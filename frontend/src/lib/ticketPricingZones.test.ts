import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pricingZoneAvailability, pricingZoneRect } from './ticketPricing.ts';

test('pricingZoneRect garde l’emprise enregistrée', () => {
  assert.deepEqual(pricingZoneRect({ id: 'a', x: 10, y: 20, w: 30, h: 40 }, []), { x: 10, y: 20, w: 30, h: 40 });
});

test('pricingZoneRect englobe les tables de la zone avec une marge', () => {
  const rect = pricingZoneRect({ id: 'vip' }, [
    { x: 30, y: 30, pricingZoneId: 'vip' },
    { x: 70, y: 30, pricingZoneId: 'vip' },
    { x: 50, y: 80, pricingZoneId: 'std' },
  ]);
  assert.deepEqual(rect, { x: 22, y: 23, w: 56, h: 14 });
});

test('pricingZoneRect : zone sans table ni emprise', () => {
  assert.equal(pricingZoneRect({ id: 'vide' }, [{ x: 50, y: 50, pricingZoneId: 'autre' }]), null);
});

test('pricingZoneAvailability compte les places libres par zone', () => {
  const zones = [
    { id: 'vip', name: 'VIP', priceFc: 100 },
    { id: 'std', name: 'Standard', priceFc: 10 },
  ];
  const stats = pricingZoneAvailability(zones, [
    { pricingZoneId: 'vip', available: true },
    { pricingZoneId: 'vip', available: false },
    { pricingZoneId: 'std', available: true },
    { pricingZoneId: null, available: true },
  ]);
  assert.deepEqual(stats.map((s) => [s.zone.id, s.available, s.total]), [['vip', 1, 2], ['std', 1, 1]]);
});

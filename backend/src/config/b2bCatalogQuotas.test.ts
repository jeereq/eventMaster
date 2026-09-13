import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getDefaultPlans,
  getPlanLimits,
  getPlanLimitsForTenant,
  B2B_PLAN_KEYS,
  B2C_PLAN_KEYS,
} from './plansConfig.ts';

const B2B_PAID_KEYS = B2B_PLAN_KEYS.filter((k) => k !== 'FREE');

describe('B2B catalogue salle + prestations', () => {
  it('donne des prestations illimitées aux forfaits B2B payants', () => {
    for (const key of B2B_PAID_KEYS) {
      const plan = getPlanLimits(key);
      assert.equal(plan.audience, 'B2B', key);
      assert.equal(plan.maxServices, 9999, `${key}.maxServices`);
      assert.ok(plan.maxEvents > 0, `${key} conserve les événements`);
      assert.ok(plan.maxRooms > 0, `${key} conserve des salles`);
    }
  });

  it('laisse l’essai FREE à 1 salle et 1 prestation', () => {
    const free = getPlanLimits('FREE');
    assert.equal(free.maxRooms, 1);
    assert.equal(free.maxServices, 1);
    assert.equal(free.maxEvents, 3);
  });

  it('garde les Particulier (B2C) hors prestations marketplace', () => {
    for (const key of B2C_PLAN_KEYS) {
      const plan = getPlanLimits(key);
      assert.equal(plan.audience, 'B2C', key);
      assert.equal(plan.maxServices, 0, `${key}.maxServices`);
    }
  });

  it('ne change pas les quotas vendeur purs', () => {
    assert.equal(getPlanLimits('VENUE').maxServices, 0);
    assert.equal(getPlanLimits('VENUE').maxEvents, 0);
    assert.equal(getPlanLimits('SERVICE').maxRooms, 0);
    assert.equal(getPlanLimits('SERVICE').maxServices, 9999);
    assert.equal(getPlanLimits('CATALOG').maxServices, 9999);
    assert.equal(getPlanLimits('CATALOG').maxEvents, 0);
  });

  it('laisse un ORGANIZER Business avec événements et marketplace', () => {
    const limits = getPlanLimitsForTenant('STANDARD', 'ORGANIZER');
    assert.equal(limits.maxServices, 9999);
    assert.equal(limits.maxEvents, 8);
    assert.equal(limits.maxRooms, 3);
  });

  it('ne zéroifie pas les prestations pour BOTH sur un forfait B2B', () => {
    const limits = getPlanLimitsForTenant('PREMIUM_1', 'BOTH');
    assert.equal(limits.maxServices, 9999);
    assert.equal(limits.maxEvents, 12);
  });

  it('aligne getDefaultPlans avec getPlanLimits pour Business', () => {
    assert.equal(getDefaultPlans().STANDARD.maxServices, getPlanLimits('STANDARD').maxServices);
  });
});

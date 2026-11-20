import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auditRoomNorms,
  exitUnits,
  exitWidthForUnits,
  longestRowRun,
  requiredExits,
  requiredPmrPlaces,
} from './roomSafetyNorms.ts';

describe('normes ERP', () => {
  it('unités de passage selon la largeur de porte', () => {
    assert.equal(exitUnits(0.8), 0);
    assert.equal(exitUnits(0.9), 1);
    assert.equal(exitUnits(1.1), 1);
    assert.equal(exitUnits(1.4), 2);
    assert.equal(exitUnits(1.6), 2);
    assert.equal(exitUnits(1.8), 3);
    assert.equal(exitWidthForUnits(1), 0.9);
    assert.equal(exitWidthForUnits(2), 1.4);
    assert.equal(exitWidthForUnits(4), 2.4);
  });

  it('issues exigées selon l’effectif', () => {
    assert.deepEqual(requiredExits(0), { exits: 0, units: 0 });
    assert.deepEqual(requiredExits(15), { exits: 1, units: 1 });
    assert.deepEqual(requiredExits(40), { exits: 1, units: 2 });
    assert.deepEqual(requiredExits(80), { exits: 2, units: 2 });
    assert.deepEqual(requiredExits(220), { exits: 2, units: 3 });
    assert.deepEqual(requiredExits(800), { exits: 3, units: 8 });
  });

  it('places pour fauteuil roulant', () => {
    assert.equal(requiredPmrPlaces(30), 2);
    assert.equal(requiredPmrPlaces(50), 2);
    assert.equal(requiredPmrPlaces(84), 3);
    assert.equal(requiredPmrPlaces(220), 6);
  });

  it('une allée centrale coupe la rangée en deux', () => {
    assert.equal(longestRowRun({ seatCount: 20 }), 20);
    assert.equal(longestRowRun({ seatCount: 20, aisleSplit: true }), 10);
  });

  it('signale une salle de 80 places avec une seule porte', () => {
    const checks = auditRoomNorms({
      canvas: { widthM: 24, heightM: 18 },
      walls: [{ openings: [{ kind: 'door', widthM: 1.6 }] }],
      furniture: Array.from({ length: 10 }, () => ({ kind: 'table' as const, capacity: 8 })),
    });
    const exits = checks.find((c) => c.id === 'exits');
    assert.equal(exits?.ok, false);
    assert.equal(checks.find((c) => c.id === 'exitWidth')?.ok, true);
  });

  it('une réception à ciel ouvert n’a pas d’issues à vérifier', () => {
    const checks = auditRoomNorms({
      canvas: { widthM: 24, heightM: 18 },
      furniture: [{ kind: 'table', capacity: 8 }],
      metadata: { showWalls: false },
    });
    assert.equal(checks.some((c) => c.id === 'exits'), false);
  });
});

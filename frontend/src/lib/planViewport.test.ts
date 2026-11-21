import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clampPlanZoom,
  planFitZoom,
  planFrameHeight,
  planLogicalSize,
  planMarkerBoost,
  planStageOffset,
} from './planViewport.ts';

const limits = { min: 0.12, max: 2.4 };

test('la salle entière tient dans un cadre de téléphone', () => {
  const z = planFitZoom(366, 420, 1000, 800, 12, limits);
  assert.ok(1000 * z <= 366 - 24 + 1e-9);
  assert.ok(800 * z <= 420 - 24 + 1e-9);
  assert.equal(z, (366 - 24) / 1000);
});

test('le zoom ajusté ne grossit jamais une petite salle au-delà de 100 %', () => {
  assert.equal(planFitZoom(2400, 2000, 1000, 800, 12, limits), 1);
});

test('cadre non mesuré ou zoom invalide : valeurs sûres', () => {
  assert.equal(planFitZoom(0, 0, 1000, 800, 12, limits), 1);
  assert.equal(clampPlanZoom(Number.NaN, limits), 0.12);
  assert.equal(clampPlanZoom(9, limits), 2.4);
});

test('le plan est centré quand il est plus petit que le cadre', () => {
  assert.deepEqual(planStageOffset(400, 600, 300, 240, 12), { x: 50, y: 180 });
  assert.deepEqual(planStageOffset(400, 600, 900, 800, 12), { x: 12, y: 12 });
});

test('la hauteur du cadre suit la forme de la salle', () => {
  assert.equal(planFrameHeight(366, 1000, 720, { min: 260, max: 480, padding: 12 }), 270);
  assert.equal(planFrameHeight(366, 1000, 2000, { min: 260, max: 480, padding: 12 }), 480);
  assert.equal(planFrameHeight(100, 1000, 300, { min: 260, max: 480, padding: 12 }), 260);
});

test('les tables grossissent de loin sans se chevaucher', () => {
  const spread = [{ x: 0, y: 0 }, { x: 400, y: 0 }];
  assert.equal(planMarkerBoost(0.35, spread, 100), 1.7142857142857144);
  const tight = [{ x: 0, y: 0 }, { x: 120, y: 0 }];
  assert.equal(planMarkerBoost(0.35, tight, 100), 1.2);
  assert.equal(planMarkerBoost(1, spread, 100), 1);
  assert.equal(planMarkerBoost(0.1, [{ x: 0, y: 0 }], 100), 1.8);
});

test('taille logique selon les dimensions réelles', () => {
  assert.deepEqual(planLogicalSize(20, 16), { w: 1000, h: 800 });
  assert.deepEqual(planLogicalSize(undefined, undefined), { w: 1000, h: 800 });
  assert.deepEqual(planLogicalSize(100, 10), { w: 1000, h: 350 });
});

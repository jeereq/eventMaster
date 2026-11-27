import { test } from 'node:test';
import assert from 'node:assert/strict';
import { screenThrowM } from './roomScreenThrow.ts';

const outline = { x: 5, y: 5, w: 90, h: 90 };

test('écran contre le mur nord : projection jusqu’au mur sud', () => {
  const t = screenThrowM({ cxPct: 50, cyPct: 7, rotationDeg: 0, outline, widthM: 17, depthM: 21 });
  assert.ok(t !== null);
  // Mur sud à 95 % de 21 m ; écran à 7 %.
  assert.ok(Math.abs((t as number) - 0.88 * 21) < 1e-6);
});

test('écran tourné vers l’est : projection jusqu’au mur est', () => {
  const t = screenThrowM({ cxPct: 7, cyPct: 50, rotationDeg: 90, outline, widthM: 20, depthM: 10 });
  assert.ok(Math.abs((t as number) - 0.88 * 20) < 1e-6);
});

test('écran hors de la salle : pas de cabine', () => {
  assert.equal(screenThrowM({ cxPct: 1, cyPct: 50, rotationDeg: 0, outline, widthM: 20, depthM: 10 }), null);
});

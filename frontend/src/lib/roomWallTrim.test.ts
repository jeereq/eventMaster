import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chairRailHeight, freeRuns, normalizeWallTrim, wallTrimHasBaseAndCornice, wallTrimLayout } from './roomWallTrim.ts';

const door = { kind: 'door' as const, t: 0.5, widthM: 1.2, heightM: 2.2, sillM: 0 };
const highWindow = { kind: 'window' as const, t: 0.25, widthM: 1, heightM: 1, sillM: 1.6 };

test('freeRuns contourne une porte sur toute sa hauteur', () => {
  const runs = freeRuns([door], 10, 0, 1, 0.1);
  assert.equal(runs.length, 2);
  assert.ok(Math.abs(runs[0][1] - -0.7) < 1e-9);
  assert.ok(Math.abs(runs[1][0] - 0.7) < 1e-9);
});

test('freeRuns ignore une fenêtre haute sous son appui', () => {
  assert.equal(freeRuns([highWindow], 10, 0, 1.2, 0.1).length, 1);
  assert.equal(freeRuns([highWindow], 10, 1.5, 2.8, 0.1).length, 2);
});

test('plinthe et corniche seulement retirées pour un mur nu', () => {
  assert.equal(wallTrimHasBaseAndCornice(undefined), true);
  assert.equal(wallTrimHasBaseAndCornice('wainscot'), true);
  assert.equal(wallTrimHasBaseAndCornice('none'), false);
  assert.equal(normalizeWallTrim('bidon'), 'standard');
  assert.equal(normalizeWallTrim('frames'), 'frames');
});

test('le style standard n’ajoute aucune pièce', () => {
  const l = wallTrimLayout('standard', 10, 3, []);
  assert.equal(l.boxes.length + l.rails.length, 0);
});

test('aucune pièce de boiserie ne chevauche la porte', () => {
  for (const style of ['chairRail', 'wainscot', 'frames', 'pilasters'] as const) {
    const { boxes, rails } = wallTrimLayout(style, 10, 3, [door]);
    assert.ok(boxes.length + rails.length > 0, style);
    for (const b of boxes) {
      const overlaps = b.x + b.w / 2 > -0.6 && b.x - b.w / 2 < 0.6 && b.y - b.h / 2 < 2.2;
      assert.ok(!overlaps, `${style} chevauche la porte`);
    }
    for (const r of rails) assert.ok(r.x1 <= -0.6 || r.x0 >= 0.6, `${style} : cimaise sur la porte`);
  }
});

test('cimaise à 90 cm, abaissée dans un mur bas', () => {
  assert.equal(chairRailHeight(3), 0.9);
  assert.ok(chairRailHeight(1.8) < 0.9);
  const { rails } = wallTrimLayout('chairRail', 6, 3, []);
  assert.equal(rails.length, 1);
  assert.equal(rails[0].y, 0.9);
});

test('pilastres régulièrement espacés sur un long mur', () => {
  const { boxes } = wallTrimLayout('pilasters', 12, 3.5, []);
  // 4 pièces par pilastre (base, fût, astragale, chapiteau).
  assert.equal(boxes.length % 4, 0);
  assert.ok(boxes.length / 4 >= 4);
});

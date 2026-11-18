import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bulbColor, bulbsAlongSpan, spanSag, stringLightPlan } from './roomStringLights.ts';

test('canopée : 4 poteaux, 6 portées (côtés et diagonales)', () => {
  const p = stringLightPlan('canopy', 10, 8);
  assert.equal(p.poles.length, 4);
  assert.equal(p.spans.length, 6);
  assert.equal(p.mast, null);
});

test('lignes parallèles : autant de lignes que de paires de poteaux, à travers le petit côté', () => {
  const p = stringLightPlan('parallel', 12, 6);
  assert.equal(p.spans.length * 2, p.poles.length);
  for (const s of p.spans) assert.equal(s.a[0], s.b[0]);
});

test('zigzag : portées enchaînées, étoile : toutes partent du mât', () => {
  const z = stringLightPlan('zigzag', 12, 6);
  for (let i = 0; i < z.spans.length - 2; i += 1) assert.deepEqual(z.spans[i].b, z.spans[i + 1].a);
  const s = stringLightPlan('star', 10, 10);
  assert.ok(s.mast);
  assert.ok(s.spans.every((sp) => sp.fromMast && sp.a[0] === 0 && sp.a[1] === 0));
});

test('les ampoules suivent une chaînette : plus basses au milieu', () => {
  const pts = bulbsAlongSpan({ a: [-4, 0], b: [4, 0] }, 3, 0, 'edison');
  const mid = pts[Math.floor(pts.length / 2)];
  assert.ok(mid[1] < pts[0][1]);
  assert.ok(3 - mid[1] <= spanSag(8) + 1e-9);
  assert.ok(pts.length >= 15);
});

test('guinguette multicolore, Edison ambré', () => {
  assert.notEqual(bulbColor('guinguette', 0), bulbColor('guinguette', 1));
  assert.equal(bulbColor('edison', 0), bulbColor('edison', 5));
});

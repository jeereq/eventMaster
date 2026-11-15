import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_GARDEN, gardenLayout, resolveGardenOptions } from './roomGardenLayout.ts';

describe('resolveGardenOptions', () => {
  it('complète et borne les réglages', () => {
    assert.deepEqual(resolveGardenOptions(undefined), DEFAULT_GARDEN);
    const r = resolveGardenOptions({ lawn: 'jungle' as never, flowerDensity: 4, shrubs: -3, trees: 2.6, flowerColors: ['#ff0000', 'rouge'] });
    assert.equal(r.lawn, 'english');
    assert.equal(r.flowerDensity, 1);
    assert.equal(r.shrubs, 0);
    assert.equal(r.trees, 3);
    assert.deepEqual(r.flowerColors, ['#ff0000']);
  });
});

describe('gardenLayout', () => {
  const opts = resolveGardenOptions({ path: 'stones', border: 'stone', trees: 2, shrubs: 5, flowerDensity: 0.4 });

  it('est stable pour un même élément', () => {
    assert.deepEqual(gardenLayout(8, 5, opts, 9), gardenLayout(8, 5, opts, 9));
  });

  it('pose le chemin sur le grand côté et garde les plantes hors du chemin', () => {
    const g = gardenLayout(8, 5, opts, 3);
    assert.equal(g.pathAlongX, true);
    assert.ok(g.stones.length >= 10);
    for (const s of g.stones) assert.ok(Math.abs(s.z) < g.pathWidth / 2);
    for (const p of [...g.flowers, ...g.shrubs, ...g.trees]) assert.ok(Math.abs(p.z) > g.pathWidth / 2);
    for (const p of g.flowers) assert.ok(Math.abs(p.x) <= 4 && Math.abs(p.z) <= 2.5);
  });

  it('la densité de fleurs et les nombres d’arbustes suivent les réglages', () => {
    const none = gardenLayout(8, 5, { ...opts, flowerDensity: 0 }, 3);
    const lots = gardenLayout(8, 5, { ...opts, flowerDensity: 1 }, 3);
    assert.equal(none.flowers.length, 0);
    assert.ok(lots.flowers.length > 500);
    assert.equal(lots.shrubs.length, 5);
    assert.equal(lots.trees.length, 2);
  });

  it('une plate-bande fleurie ajoute des fleurs le long des bords', () => {
    const g = gardenLayout(6, 4, { ...opts, border: 'flowers', flowerDensity: 0 }, 1);
    assert.ok(g.flowers.length > 100);
    for (const f of g.flowers) assert.ok(Math.abs(f.x) > 2.3 || Math.abs(f.z) > 1.3);
  });

  it('le gazon synthétique n’a pas de brins en relief', () => {
    assert.equal(gardenLayout(6, 4, { ...opts, lawn: 'synthetic' }, 1).tufts.length, 0);
    assert.ok(gardenLayout(6, 4, { ...opts, lawn: 'meadow' }, 1).tufts.length > 100);
  });
});

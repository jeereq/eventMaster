import { test } from 'node:test';
import assert from 'node:assert/strict';
import { danceTileColor, danceTileGrid, sanitizeMonogram, starlitPoints } from './roomDanceFloor.ts';

test('dalles LED : grille qui couvre la piste, dalles de ~60 cm', () => {
  const g = danceTileGrid(6, 4.8, 0.6);
  assert.equal(g.nx, 10);
  assert.equal(g.nz, 8);
  assert.equal(g.tiles.length, 80);
  for (const t of g.tiles) assert.ok(Math.abs(t.x) < 3 && Math.abs(t.z) < 2.4);
});

test('motifs LED : couleurs bornées, arc-en-ciel varié, disco qui change dans le temps', () => {
  for (const p of ['rainbow', 'disco', 'wave', 'checker', 'ripple'] as const) {
    for (let t = 0; t < 4; t += 0.7) {
      for (const ch of danceTileColor(p, t, { i: 2, j: 3 }, 10, 8, '#ff00aa')) assert.ok(ch >= 0 && ch <= 1, `${p} ${t}`);
    }
  }
  assert.notDeepEqual(danceTileColor('rainbow', 0, { i: 0, j: 0 }, 10, 8), danceTileColor('rainbow', 0, { i: 5, j: 4 }, 10, 8));
  const seq = [0, 0.5, 1, 1.5, 2].map((t) => danceTileColor('disco', t, { i: 1, j: 1 }, 10, 8).join());
  assert.ok(new Set(seq).size > 1);
});

test('ciel étoilé : points dans la piste, nombre proportionnel à la surface', () => {
  const pts = starlitPoints(5, 4);
  assert.equal(pts.length, 180);
  for (const p of pts) assert.ok(Math.abs(p.x) <= 2.5 && Math.abs(p.z) <= 2);
  assert.deepEqual(starlitPoints(5, 4)[7], pts[7]);
});

test('monogramme : caractères sûrs, 12 au plus', () => {
  assert.equal(sanitizeMonogram('  A & J <script> '), 'A & J script');
  assert.equal(sanitizeMonogram('Anne-Sophie & Jean'), 'Anne-Sophie');
  assert.equal(sanitizeMonogram(undefined), '');
});

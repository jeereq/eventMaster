import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cofferedGrid, rooftopUnits, type RoofPoint } from './roomRoofGeometry.ts';

const rect = (w: number, d: number): RoofPoint[] => [
  { x: -w / 2, z: -d / 2 },
  { x: w / 2, z: -d / 2 },
  { x: w / 2, z: d / 2 },
  { x: -w / 2, z: d / 2 },
];

test('caissons : grille complète sur un rectangle, poutres partagées comptées une fois', () => {
  const g = cofferedGrid(rect(12, 7.2), [], 2.4);
  assert.equal(g.cells.length, 5 * 3);
  // (nx+1)·nz poutres verticales + nx·(nz+1) horizontales
  assert.equal(g.beams.length, 6 * 3 + 5 * 4);
});

test('caissons : une trémie retire les caissons qu’elle touche, un L ne déborde pas', () => {
  const full = cofferedGrid(rect(12, 12), [], 2.4).cells.length;
  const holed = cofferedGrid(rect(12, 12), [{ minX: -1, maxX: 1, minZ: -1, maxZ: 1 }], 2.4).cells.length;
  assert.ok(holed < full);
  const L: RoofPoint[] = [{ x: 0, z: 0 }, { x: 10, z: 0 }, { x: 10, z: 4 }, { x: 4, z: 4 }, { x: 4, z: 10 }, { x: 0, z: 10 }];
  for (const c of cofferedGrid(L, [], 2).cells) assert.ok(!(c.cx > 4 && c.cz > 4));
});

test('équipements de toiture : dans le contour, hors trémie, rien sur un petit toit', () => {
  const units = rooftopUnits(rect(24, 14), [{ minX: -2, maxX: 2, minZ: -2, maxZ: 2 }]);
  assert.ok(units.some((u) => u.kind === 'hvac'));
  for (const u of units) assert.ok(Math.abs(u.x) < 12 && Math.abs(u.z) < 7);
  assert.equal(rooftopUnits(rect(3, 3)).length, 0);
});

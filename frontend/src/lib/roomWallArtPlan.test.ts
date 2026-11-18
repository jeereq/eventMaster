import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wallArtPlanStrips, wallInnerSide } from './roomWallArtPlan.ts';
import type { RoomWallSegment } from './roomLayoutUtils.ts';

const wall = (art: RoomWallSegment['art']): RoomWallSegment => ({
  id: 'w',
  // Mur du haut, parcouru de gauche à droite : la salle est en dessous (y plus grand).
  start: { x: 10, y: 10 },
  end: { x: 90, y: 10 },
  heightM: 3,
  thicknessM: 0.2,
  texture: 'plaster',
  art,
});

test('le côté salle d’un mur suit la même règle que la 3D', () => {
  assert.equal(wallInnerSide(wall([]), 20, 10), 1);
  assert.equal(wallInnerSide({ start: { x: 90, y: 10 }, end: { x: 10, y: 10 } }, 20, 10), -1);
});

test('un graffiti côté salle est dessiné à l’intérieur, côté extérieur à l’extérieur', () => {
  const strips = wallArtPlanStrips([
    wall([
      { id: 'in', kind: 'graffiti', t: 0.5, yM: 1.5, widthM: 2, aspect: 3, fillColor: '#ff0000' },
      { id: 'out', kind: 'image', t: 0.25, yM: 1.5, widthM: 1, aspect: 1, face: 'outside' },
    ]),
  ], 20, 10);
  const inside = strips.find((s) => s.id === 'in')!;
  const outside = strips.find((s) => s.id === 'out')!;
  const wallY = 1; // 10 % de 10 m
  assert.ok(inside.y1 > wallY, 'côté salle = sous le mur du haut');
  assert.ok(outside.y1 < wallY, 'côté extérieur = au-dessus');
  assert.equal(inside.color, '#ff0000');
  // Largeur respectée et centrée sur t.
  assert.ok(Math.abs(Math.hypot(inside.x2 - inside.x1, inside.y2 - inside.y1) - 2) < 1e-9);
  assert.ok(Math.abs((inside.x1 + inside.x2) / 2 - 10) < 1e-9);
});

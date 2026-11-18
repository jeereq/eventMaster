import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  arcTablePath,
  floorTileSizePct,
  rotateY,
  rotYToSvgDeg,
  rowFocusPct,
  topViewFreeChair,
  topViewRow,
  topViewTable,
} from './roomPlanTopViewGeom.ts';
import { tablePlateSizeMeters } from './tablePlanUtils.ts';

const W = 20;
const H = 10;

const table = (over: Record<string, unknown> = {}) => ({
  id: 't1',
  kind: 'table' as const,
  name: 'Table 1',
  shape: 'round' as const,
  capacity: 8,
  chairType: 'BANQUET' as const,
  x: 50,
  y: 50,
  ...over,
}) as Parameters<typeof topViewTable>[0];

const row = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  kind: 'row' as const,
  label: 'Rang A',
  seatCount: 6,
  chairType: 'THEATER' as const,
  tier: 0,
  x: 50,
  y: 60,
  ...over,
}) as Parameters<typeof topViewRow>[0];

describe('rotations', () => {
  it('une rotation Three.js de +90° vaut -90° (270°) à l’écran', () => {
    assert.equal(rotYToSvgDeg(Math.PI / 2), 270);
    assert.equal(rotYToSvgDeg(0), 0);
    assert.equal(rotYToSvgDeg(Math.PI), 180);
  });

  it('rotateY suit la convention Three.js (x vers -z pour +90°)', () => {
    const [x, z] = rotateY(1, 0, Math.PI / 2);
    assert.ok(Math.abs(x) < 1e-9);
    assert.ok(Math.abs(z + 1) < 1e-9);
  });
});

describe('topViewTable', () => {
  it('place la table au centre en mètres avec le plateau de la 3D', () => {
    const t = topViewTable(table(), W, H);
    assert.equal(t.cx, 10);
    assert.equal(t.cy, 5);
    assert.deepEqual(t.size, tablePlateSizeMeters('round', 8));
    assert.equal(t.seats.length, 8);
  });

  it('les chaises d’une ronde sont à égale distance et regardent le centre', () => {
    const t = topViewTable(table(), W, H);
    const radius = t.size[0] / 2 + 0.48;
    for (const s of t.seats) {
      const d = Math.hypot(s.x - t.cx, s.y - t.cy);
      assert.ok(Math.abs(d - radius) < 0.01, `distance ${d}`);
      // À 0°, le convive regarde vers +y ; après rotation il doit viser le centre.
      const a = (s.rotDeg * Math.PI) / 180;
      const look = [-Math.sin(a), Math.cos(a)];
      const toCenter = [(t.cx - s.x) / d, (t.cy - s.y) / d];
      assert.ok(look[0] * toCenter[0] + look[1] * toCenter[1] > 0.99);
    }
  });

  it('respecte la rotation de la table et les sièges masqués', () => {
    const t = topViewTable(table({ shape: 'rectangular', capacity: 6, rotation: 90, hiddenSeatIndices: [0] }), W, H);
    assert.equal(t.rotDeg, 270);
    assert.equal(t.seats.length, 5);
    assert.ok(!t.seats.some((s) => s.index === 0));
    // Table tournée de 90° : les chaises sont de part et d’autre en x, plus en y.
    for (const s of t.seats) {
      assert.ok(Math.abs(s.y - t.cy) < t.size[0] / 2);
      assert.ok(Math.abs(s.x - t.cx) > 0.4);
    }
  });

  it('pas de chaises pour les mange-debout ni les chaises détachées', () => {
    assert.equal(topViewTable(table({ shape: 'cocktail' }), W, H).seats.length, 0);
    assert.equal(topViewTable(table({ attachedChairs: false }), W, H).seats.length, 0);
  });
});

describe('topViewRow', () => {
  it('vise la scène quand aucun foyer n’est donné', () => {
    const fixtures = [{ kind: 'stage', x: 40, y: 0, w: 20, h: 10 }] as Parameters<typeof rowFocusPct>[1];
    assert.deepEqual(rowFocusPct(row(), fixtures), [50, 5]);
    assert.deepEqual(rowFocusPct(row(), []), [50, 35]);
  });

  it('espace les sièges de 55 cm, droits et tournés vers la scène (vers le haut)', () => {
    const r = topViewRow(row(), [], W, H);
    assert.equal(r.seats.length, 6);
    const gaps = r.seats.slice(1).map((s, i) => s.x - r.seats[i].x);
    for (const g of gaps) assert.ok(Math.abs(g - 0.55) < 1e-6);
    for (const s of r.seats) assert.ok(Math.abs(s.y - r.cy) < 1e-6);
    // Le siège central regarde vers -y (la scène est au-dessus) : rotation ≈ 180°.
    const mid = r.seats[2];
    assert.ok(Math.abs(mid.rotDeg - 180) < 10, `rot ${mid.rotDeg}`);
  });

  it('une rangée courbe avance ses extrémités vers la scène', () => {
    const r = topViewRow(row({ curve: 60 }), [], W, H);
    assert.ok(r.seats[0].y < r.seats[2].y);
    assert.ok(r.seats[5].y < r.seats[3].y);
  });
});

describe('divers', () => {
  it('chaise libre : position en mètres et rotation miroir', () => {
    const c = topViewFreeChair({ id: 'c', kind: 'chair', chairType: 'BANQUET', x: 25, y: 20, rotation: 90 } as Parameters<typeof topViewFreeChair>[0], W, H);
    assert.deepEqual([c.x, c.y, c.rotDeg], [5, 2, 270]);
  });

  it('table en arc : contour fermé', () => {
    const d = arcTablePath([3.6, 1.8], 4);
    assert.ok(d.startsWith('M '));
    assert.ok(d.endsWith(' Z'));
    assert.equal((d.match(/L/g) ?? []).length, 9);
  });

  it('tuile de sol en % du canevas', () => {
    assert.deepEqual(floorTileSizePct(2, 20, 10), [10, 20]);
    assert.deepEqual(floorTileSizePct(0, 20, 10), [100, 100]);
  });
});

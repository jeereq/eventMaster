import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { frameBays, offsetRing, polygonArea, ridgeFrame, ridgeRise, roofFootprint, type RoofPoint } from './roomRoofGeometry.ts';

const rect = (x0: number, z0: number, x1: number, z1: number): RoofPoint[] => [
  { x: x0, z: z0 }, { x: x1, z: z0 }, { x: x1, z: z1 }, { x: x0, z: z1 },
];

describe('roofFootprint', () => {
  it('garde un rectangle en un seul volume', () => {
    const fp = roofFootprint(rect(-10, -6, 10, 6));
    assert.equal(fp.kind, 'rects');
    if (fp.kind !== 'rects') return;
    assert.equal(fp.rects.length, 1);
    assert.deepEqual(fp.rects[0], { cx: 0, cz: 0, w: 20, d: 12 });
  });

  it('découpe un L en deux rectangles couvrant toute la surface', () => {
    const L: RoofPoint[] = [
      { x: 0, z: 0 }, { x: 13, z: 0 }, { x: 13, z: 7 }, { x: 20, z: 7 }, { x: 20, z: 20 }, { x: 0, z: 20 },
    ];
    const fp = roofFootprint(L);
    assert.equal(fp.kind, 'rects');
    if (fp.kind !== 'rects') return;
    assert.equal(fp.rects.length, 2);
    const area = fp.rects.reduce((s, r) => s + r.w * r.d, 0);
    assert.ok(Math.abs(area - Math.abs(polygonArea(L))) < 1e-6);
  });

  it('découpe un T en trois volumes et un U en trois volumes', () => {
    const T: RoofPoint[] = [
      { x: 0, z: 0 }, { x: 30, z: 0 }, { x: 30, z: 8 }, { x: 20, z: 8 }, { x: 20, z: 24 }, { x: 10, z: 24 }, { x: 10, z: 8 }, { x: 0, z: 8 },
    ];
    const fp = roofFootprint(T);
    assert.equal(fp.kind, 'rects');
    if (fp.kind === 'rects') assert.equal(fp.rects.length, 3);
    const U: RoofPoint[] = [
      { x: 0, z: 0 }, { x: 6, z: 0 }, { x: 6, z: 12 }, { x: 14, z: 12 }, { x: 14, z: 0 }, { x: 20, z: 0 }, { x: 20, z: 20 }, { x: 0, z: 20 },
    ];
    const fu = roofFootprint(U);
    assert.equal(fu.kind, 'rects');
    if (fu.kind === 'rects') {
      assert.equal(fu.rects.length, 3);
      assert.ok(Math.abs(fu.rects.reduce((s, r) => s + r.w * r.d, 0) - Math.abs(polygonArea(U))) < 1e-6);
    }
  });

  it('traite un octogone comme un chapiteau centré', () => {
    const oct: RoofPoint[] = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      return { x: 3 + Math.cos(a) * 8, z: -2 + Math.sin(a) * 8 };
    });
    const fp = roofFootprint(oct);
    assert.equal(fp.kind, 'radial');
    if (fp.kind !== 'radial') return;
    assert.ok(Math.abs(fp.center.x - 3) < 1e-6 && Math.abs(fp.center.z + 2) < 1e-6);
    assert.ok(polygonArea(fp.ring) > 0);
  });
});

describe('charpente', () => {
  it('oriente le faîtage sur le grand côté', () => {
    assert.deepEqual(ridgeFrame({ cx: 0, cz: 0, w: 8, d: 20 }), { length: 20, span: 8, rotationY: Math.PI / 2 });
    assert.equal(ridgeFrame({ cx: 0, cz: 0, w: 20, d: 8 }).rotationY, 0);
  });

  it('calcule la hauteur de faîtage et la trame de 5 m', () => {
    assert.ok(Math.abs(ridgeRise(12, 45) - 6) < 1e-9);
    assert.equal(frameBays(20), 4);
    assert.equal(frameBays(2), 1);
  });

  it('décale un contour vers l’intérieur quel que soit le sens de parcours', () => {
    const inner = offsetRing(rect(0, 0, 10, 10), 1);
    assert.deepEqual(inner.map((p) => [Math.round(p.x), Math.round(p.z)]), [[1, 1], [9, 1], [9, 9], [1, 9]]);
    const innerRev = offsetRing(rect(0, 0, 10, 10).reverse(), 1);
    assert.ok(innerRev.every((p) => p.x > 0.99 && p.x < 9.01 && p.z > 0.99 && p.z < 9.01));
  });
});

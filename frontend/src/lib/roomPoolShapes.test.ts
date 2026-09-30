import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { POOL_SHAPE_ORDER, isPoolShape, poolOutline, poolOutlineSvgPath } from './roomOutdoorUtils.ts';

function area(pts: Array<[number, number]>): number {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x1, z1] = pts[i];
    const [x2, z2] = pts[(i + 1) % pts.length];
    s += x1 * z2 - x2 * z1;
  }
  return s / 2;
}

describe('poolOutline', () => {
  it('reste dans l’emprise du bassin et tourne toujours dans le même sens', () => {
    for (const shape of POOL_SHAPE_ORDER) {
      const pts = poolOutline(shape, 10, 5);
      assert.ok(pts.length >= 4, shape);
      for (const [x, z] of pts) {
        assert.ok(Math.abs(x) <= 5.001 && Math.abs(z) <= 2.501, `${shape} ${x} ${z}`);
      }
      assert.ok(area(pts) > 0, `${shape} orientation`);
    }
  });

  it('donne des surfaces d’eau cohérentes', () => {
    const rect = area(poolOutline('rectangle', 10, 5));
    assert.equal(rect, 50);
    assert.ok(Math.abs(area(poolOutline('oval', 10, 5)) - Math.PI * 12.5) < 0.2);
    const lShape = area(poolOutline('lShape', 10, 5));
    assert.ok(Math.abs(lShape - (50 - 4.5 * 2.5)) < 1e-9);
    const kidney = area(poolOutline('kidney', 10, 5));
    assert.ok(kidney < rect * 0.85 && kidney > 25);
  });

  it('valide les formes et produit un tracé SVG fermé', () => {
    assert.ok(isPoolShape('kidney'));
    assert.ok(!isPoolShape('triangle'));
    const path = poolOutlineSvgPath('rounded', 5);
    assert.ok(path.startsWith('M') && path.endsWith('Z'));
  });
});

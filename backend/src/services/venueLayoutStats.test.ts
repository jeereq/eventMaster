import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeLayoutArea,
  computeLayoutCapacity,
  computeLayoutStats,
} from './venueLayoutStats.ts';

describe('capacité d’une disposition', () => {
  it('additionne tables, rangées et chaises libres en retirant les sièges masqués', () => {
    const capacity = computeLayoutCapacity({
      furniture: [
        { kind: 'table', capacity: 10, hiddenSeatIndices: [0, 1] },
        { kind: 'table', capacity: 8 },
        { kind: 'row', seatCount: 12 },
        { kind: 'chair' },
        { kind: 'zone' },
      ],
    });
    assert.equal(capacity, 8 + 8 + 12 + 1);
  });

  it('ne descend jamais sous zéro', () => {
    assert.equal(
      computeLayoutCapacity({ furniture: [{ kind: 'table', capacity: 2, hiddenSeatIndices: [0, 1, 2, 3] }] }),
      0,
    );
  });

  it('vaut zéro sans mobilier', () => {
    assert.equal(computeLayoutCapacity({}), 0);
  });
});

describe('surface d’une disposition', () => {
  it('utilise tout le canvas sans contour', () => {
    assert.equal(computeLayoutArea({ canvas: { widthM: 20, heightM: 15 } }), 300);
  });

  it('applique la part du contour et le facteur de forme', () => {
    const rectangle = computeLayoutArea({
      canvas: { widthM: 20, heightM: 10 },
      roomOutline: { shape: 'rectangle', w: 90, h: 90 },
    });
    assert.equal(rectangle, 162);

    const circle = computeLayoutArea({
      canvas: { widthM: 20, heightM: 10 },
      roomOutline: { shape: 'circle', w: 100, h: 100 },
    });
    assert.equal(circle, 118);
  });

  it('renvoie null quand les dimensions sont absentes ou invalides', () => {
    assert.equal(computeLayoutArea({}), null);
    assert.equal(computeLayoutArea({ canvas: { widthM: 0, heightM: 10 } }), null);
    assert.equal(computeLayoutArea({ canvas: { widthM: Number.NaN, heightM: 10 } }), null);
  });
});

describe('statistiques d’une disposition', () => {
  it('tolère une valeur qui n’est pas un plan', () => {
    assert.deepEqual(computeLayoutStats(null), { capacityMax: 0, areaM2: null });
    assert.deepEqual(computeLayoutStats('x'), { capacityMax: 0, areaM2: null });
  });

  it('combine capacité et surface', () => {
    assert.deepEqual(
      computeLayoutStats({ canvas: { widthM: 10, heightM: 10 }, furniture: [{ kind: 'row', seatCount: 30 }] }),
      { capacityMax: 30, areaM2: 100 },
    );
  });
});

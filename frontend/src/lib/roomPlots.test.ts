import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildPlotGrid, buildSinglePlot, findFreePlotSpot, isOpenSpace, nextPlotLabel, normalizePlotGrid, plotCode, plotGridFootprint } from './roomPlots.ts';

describe('emplacements sans murs', () => {
  it('numérote par rangée puis par rang', () => {
    assert.equal(plotCode(0, 0), 'A1');
    assert.equal(plotCode(1, 2), 'B3');
    assert.equal(plotCode(26, 0), 'AA1');
  });

  it('borne les réglages saisis', () => {
    const o = normalizePlotGrid({ count: 500, columns: 40, widthM: -2, depthM: 0, aisleM: -1 });
    assert.equal(o.count, 60);
    assert.equal(o.columns, 12);
    assert.equal(o.widthM, 0.5);
    assert.equal(o.depthM, 3);
    assert.equal(o.aisleM, 0);
  });

  it('calcule l’emprise avec les allées', () => {
    assert.deepEqual(plotGridFootprint(normalizePlotGrid({ count: 5, columns: 3, widthM: 3, depthM: 2, aisleM: 1 })), { widthM: 11, depthM: 5, rows: 2 });
  });

  it('pose une grille centrée, à la taille réelle, sans murs ni revêtement', () => {
    const { plots, fits } = buildPlotGrid({ widthM: 20, heightM: 10 }, { count: 4, columns: 2, widthM: 4, depthM: 3, aisleM: 2 });
    assert.equal(fits, true);
    assert.equal(plots.length, 4);
    assert.deepEqual(plots.map((p) => p.label), ['A1', 'A2', 'B1', 'B2']);
    for (const p of plots) {
      assert.equal(p.zoneKind, 'plot');
      assert.equal(p.material, undefined);
      assert.equal(p.w, 20);
      assert.equal(p.h, 30);
    }
    // Emprise 10 × 8 m centrée dans 20 × 10 m : départ à 5 m / 1 m.
    assert.equal(plots[0].x, 25);
    assert.equal(plots[0].y, 10);
    // Allée de 2 m entre A1 et A2.
    assert.equal(plots[1].x, 55);
    assert.equal(new Set(plots.map((p) => p.groupId)).size, 1);
  });

  it('signale une grille trop grande et la garde dans le plan', () => {
    const { plots, fits } = buildPlotGrid({ widthM: 10, heightM: 10 }, { count: 4, columns: 4, widthM: 4, depthM: 2, aisleM: 1 });
    assert.equal(fits, false);
    assert.equal(plots[0].x, 0);
  });

  it('emplacement isolé et numéro suivant', () => {
    const p = buildSinglePlot({ widthM: 10, heightM: 20 }, 'Emplacement 1', { widthM: 2, depthM: 4 });
    assert.equal(p.w, 20);
    assert.equal(p.h, 20);
    assert.equal(p.x, 40);
    assert.equal(nextPlotLabel({ furniture: [p] }), 'Emplacement 2');
  });

  it('espace ouvert = murs et toit masqués', () => {
    assert.equal(isOpenSpace({ totalSeats: 0, showWalls: false, showRoof: false }), true);
    assert.equal(isOpenSpace({ totalSeats: 0, showWalls: false }), false);
  });

  it('un nouvel emplacement ne chevauche pas les autres', () => {
    const taken = [{ x: 40, y: 40, w: 20, h: 20 }];
    const spot = findFreePlotSpot(taken, { x: 45, y: 45, w: 10, h: 10 });
    const r = taken[0];
    const clear = spot.x >= r.x + r.w + 2 || spot.x + 10 + 2 <= r.x || spot.y >= r.y + r.h + 2 || spot.y + 10 + 2 <= r.y;
    assert.equal(clear, true);
    assert.deepEqual(findFreePlotSpot([], { x: 10, y: 20, w: 5, h: 5 }), { x: 10, y: 20 });
  });
});

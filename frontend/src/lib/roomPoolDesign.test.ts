import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL_TYPE_META,
  POOL_TYPE_ORDER,
  poolFloorDepthAt,
  poolGroundHole,
  poolLaneLines,
  poolLocalToWorld,
  poolWaterOutline,
  resolvePoolDepth,
  resolvePoolOptions,
  resolvePoolShape,
} from './roomPoolDesign.ts';

describe('resolvePoolOptions', () => {
  it('part des défauts du type et ignore les valeurs inconnues', () => {
    const o = resolvePoolOptions({ type: 'natural', water: 'bleu', liner: 'plastique' as never, copingM: 9 });
    assert.equal(o.type, 'natural');
    assert.equal(o.liner, 'gravel');
    assert.equal(o.water, POOL_TYPE_META.natural.defaults.water);
    assert.equal(o.copingM, 1.5);
  });

  it('un ancien bassin sans réglage reste une piscine classique', () => {
    const o = resolvePoolOptions(undefined);
    assert.equal(o.type, 'classic');
    assert.equal(o.access, 'roman');
  });
});

describe('géométrie du bassin', () => {
  it('le contour de l’eau et le trou restent dans l’emprise, pour chaque type', () => {
    for (const type of POOL_TYPE_ORDER) {
      const o = resolvePoolOptions({ type });
      const { widthM: w, depthM: d } = POOL_TYPE_META[type];
      for (const [x, z] of poolWaterOutline(o, resolvePoolShape(type), w, d)) {
        assert.ok(Math.abs(x) <= w / 2 + 1e-6 && Math.abs(z) <= d / 2 + 1e-6, `${type} ${x} ${z}`);
      }
      const hole = poolGroundHole(o, resolvePoolShape(type), w, d);
      if (type === 'raised') assert.equal(hole, null);
      else assert.ok(hole && hole.length >= 4, type);
    }
  });

  it('le débordement va jusqu’au bord de l’emprise du côté choisi', () => {
    const o = resolvePoolOptions({ type: 'infinity', infinityEdge: 'south' });
    const hole = poolGroundHole(o, 'rectangle', 12, 5)!;
    assert.equal(Math.max(...hole.map((p) => p[1])), 2.5);
    assert.ok(Math.min(...hole.map((p) => p[1])) > -2.5);
  });

  it('une forme refusée par le type revient à sa forme par défaut', () => {
    assert.equal(resolvePoolShape('infinity', 'kidney'), 'rectangle');
    assert.equal(resolvePoolShape('lagoon', 'kidney'), 'kidney');
  });

  it('plage immergée : presque à fleur d’eau d’un côté, profondeur pleine de l’autre', () => {
    const o = resolvePoolOptions({ type: 'lagoon' });
    assert.ok(poolFloorDepthAt(o, 1.5, 12, 7, -6, 0) < 0.1);
    assert.ok(Math.abs(poolFloorDepthAt(o, 1.5, 12, 7, 6, 0) - 1.5) < 1e-9);
  });

  it('borne la profondeur selon le type', () => {
    assert.equal(resolvePoolDepth('spa', 3), 1.2);
    assert.equal(resolvePoolDepth('mirror', undefined), 0.08);
  });

  it('un couloir de nage de 3 m a une ligne d’eau au milieu', () => {
    const lines = poolLaneLines(resolvePoolOptions({ type: 'lap', copingM: 0.3 }), 18, 5);
    assert.equal(lines.length, 1);
    assert.ok(Math.abs(lines[0]) < 1e-9);
  });

  it('tourne les points comme le groupe 3D (rotation Y)', () => {
    const [x, z] = poolLocalToWorld(1, 0, 10, 5, 90);
    assert.ok(Math.abs(x - 10) < 1e-9 && Math.abs(z - 4) < 1e-9);
  });
});

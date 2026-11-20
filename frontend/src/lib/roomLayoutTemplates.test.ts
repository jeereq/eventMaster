/**
 * Non-régression des modèles de salle : chaque modèle de ROOM_LAYOUT_TEMPLATES,
 * appliqué tel quel, doit donner un plan lisible, sans mobilier hors de la
 * salle et sans conflit bloquant (chevauchement, élément encastré dans un mur).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_LAYOUT_TEMPLATES, applyRoomTemplate, applyTemplateTableSetting } from './roomLayoutUtils.ts';
import { detectLayoutClearanceConflicts } from './roomLayoutClearance.ts';

const EPS = 0.5;
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

describe('modèles de salle', () => {
  it('la liste des modèles n’est pas vide et chaque identifiant est unique', () => {
    assert.ok(ROOM_LAYOUT_TEMPLATES.length > 20);
    const ids = ROOM_LAYOUT_TEMPLATES.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  for (const tpl of ROOM_LAYOUT_TEMPLATES) {
    describe(tpl.id, () => {
      const bp = applyRoomTemplate(tpl.id);

      it('donne un plan à la structure valide', () => {
        assert.ok(bp, 'aucun plan généré');
        assert.ok(isFiniteNumber(bp.canvas.widthM) && bp.canvas.widthM > 0);
        assert.ok(isFiniteNumber(bp.canvas.heightM) && bp.canvas.heightM > 0);
        assert.ok(Array.isArray(bp.furniture));
        assert.ok(Array.isArray(bp.fixtures));
        const ids = bp.furniture.map((f) => f.id);
        assert.equal(new Set(ids).size, ids.length, 'identifiants de mobilier en double');
        for (const f of bp.furniture) {
          assert.ok(['table', 'row', 'chair', 'zone'].includes(f.kind), `${f.id} : type ${f.kind}`);
          assert.ok(isFiniteNumber(f.x) && isFiniteNumber(f.y), `${f.id} : position illisible`);
          if (f.kind === 'table') assert.ok(isFiniteNumber(f.capacity) && f.capacity >= 0, `${f.id} : capacité`);
          if (f.kind === 'row') assert.ok(isFiniteNumber(f.seatCount) && f.seatCount >= 0, `${f.id} : sièges`);
        }
        for (const fx of bp.fixtures) {
          for (const key of ['x', 'y', 'w', 'h'] as const) {
            assert.ok(isFiniteNumber(fx[key]), `${fx.id ?? fx.kind} : ${key} illisible`);
          }
        }
        assert.ok(isFiniteNumber(bp.metadata.totalSeats) && bp.metadata.totalSeats >= 0);
        assert.doesNotThrow(() => JSON.parse(JSON.stringify(bp)));
      });

      it('ne place rien hors de la salle', () => {
        assert.ok(bp);
        const outline = bp.roomOutline ?? { x: 0, y: 0, w: 100, h: 100 };
        for (const f of bp.furniture) {
          if (f.kind === 'zone') {
            assert.ok(f.x >= -EPS && f.y >= -EPS, `zone ${f.id} hors du canevas`);
            assert.ok(f.x + f.w <= 100 + EPS && f.y + f.h <= 100 + EPS, `zone ${f.id} déborde du canevas`);
            continue;
          }
          const inside = f.x >= outline.x - EPS && f.x <= outline.x + outline.w + EPS
            && f.y >= outline.y - EPS && f.y <= outline.y + outline.h + EPS;
          assert.ok(inside, `${f.kind} ${f.id} (${f.x}, ${f.y}) hors de la salle`);
        }
        for (const fx of bp.fixtures) {
          const rot = (((fx.rotation ?? 0) % 360) + 360) % 360;
          if (rot === 0) {
            assert.ok(fx.x >= -EPS && fx.y >= -EPS, `${fx.kind} ${fx.id} hors du canevas`);
            assert.ok(fx.x + fx.w <= 100 + EPS && fx.y + fx.h <= 100 + EPS, `${fx.kind} ${fx.id} déborde du canevas`);
          } else {
            const cx = fx.x + fx.w / 2;
            const cy = fx.y + fx.h / 2;
            assert.ok(cx >= 0 && cx <= 100 && cy >= 0 && cy <= 100, `${fx.kind} ${fx.id} : centre hors du canevas`);
          }
        }
      });

      it('n’a aucun conflit bloquant (chevauchement, mur traversé)', () => {
        assert.ok(bp);
        const errors = detectLayoutClearanceConflicts(bp).conflicts.filter((c) => c.severity === 'error');
        assert.deepEqual(errors.map((c) => c.message), []);
      });
    });
  }
});

describe('mise en place des modèles', () => {
  const tablesOf = (id: string) => {
    const bp = applyRoomTemplate(id);
    assert.ok(bp);
    return bp.furniture.filter((f) => f.kind === 'table');
  };

  for (const id of ['banquet-classic', 'banquet-oval', 'banquet-circle', 'banquet-honor', 'banquet-ushape', 'tent-garden', 'fountain-gala']) {
    it(`${id} : chaque table est dressée (service et centre de table)`, () => {
      for (const t of tablesOf(id)) {
        assert.ok(t.kind === 'table' && t.hasCouverts && t.couvertStyle, `${t.id} sans service`);
        assert.ok(t.kind === 'table' && t.hasCenterpiece !== false, `${t.id} sans centre`);
      }
    });
  }

  it('les centres de table alternent d’une table à l’autre', () => {
    const styles = new Set(tablesOf('banquet-classic').map((t) => (t.kind === 'table' ? t.centerpieceStyle : null)));
    assert.ok(styles.size >= 2);
  });

  it('la table d’honneur verrouillée garde son propre style', () => {
    const honor = tablesOf('banquet-honor').find((t) => t.kind === 'table' && t.locked);
    assert.ok(honor && honor.kind === 'table');
    assert.equal(honor.chairType, 'ARMCHAIR');
    assert.equal(honor.centerpieceStyle, 'greeneryRunner');
  });

  it('les bars du catalogue sont posés avec leur style', () => {
    const bp = applyRoomTemplate('cocktail');
    assert.ok(bp);
    const bar = bp.fixtures.find((f) => f.kind === 'bar');
    assert.equal(bar?.barStyle, 'gin');
    const pool = applyRoomTemplate('pool-party')?.fixtures.find((f) => f.kind === 'landscape' && f.landscapeStyle === 'pool');
    assert.equal(pool?.pool?.liner, 'mosaicWhite');
  });

  it('répartit les tables sur toute la zone demandée', () => {
    const bp = applyRoomTemplate('banquet-classic');
    assert.ok(bp);
    const spread = applyTemplateTableSetting(bp, { spread: { cols: 4, x: [20, 80], y: [40, 80] } });
    const xs = spread.furniture.filter((f) => f.kind === 'table').map((f) => f.x);
    const ys = spread.furniture.filter((f) => f.kind === 'table').map((f) => f.y);
    assert.equal(Math.min(...xs), 20);
    assert.equal(Math.max(...xs), 80);
    assert.equal(Math.min(...ys), 40);
    assert.equal(Math.max(...ys), 80);
  });
});

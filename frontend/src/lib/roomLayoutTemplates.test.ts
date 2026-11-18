/**
 * Non-régression des modèles de salle : chaque modèle de ROOM_LAYOUT_TEMPLATES,
 * appliqué tel quel, doit donner un plan lisible, sans mobilier hors de la
 * salle et sans conflit bloquant (chevauchement, élément encastré dans un mur).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ROOM_LAYOUT_TEMPLATES, applyRoomTemplate } from './roomLayoutUtils.ts';
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

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyRoomTemplate, generateAmphitheaterRows } from './roomLayoutUtils.ts';
import {
  orderRowsFrontToBack,
  relabelRowBlock,
  respaceRowBlock,
  rowBlockAutoNumbering,
  rowBlockFocus,
  rowBlockRows,
  rowBlockStats,
  rowForBlockEdge,
  rowLetter,
  rowLetterIndex,
  tidyRowsColumn,
  type BlockRow,
} from './roomRowBlock.ts';

const W = 20;
const H = 21;
const cinemaRows = () => generateAmphitheaterRows({ style: 'cinemaStadium', tierCount: 6, seatsPerRow: 16, depthM: H, focusY: 8 });

describe('bloc de rangées', () => {
  it('retrouve les rangées du même gradin, et celles d’un modèle sans groupe par leur point de visée', () => {
    const rows = cinemaRows();
    const other = { id: 'x', kind: 'row' as const, label: 'Banquette', seatCount: 4, x: 10, y: 90 };
    const block = rowBlockRows([...rows, other], rows[2].id);
    assert.equal(block.length, 6);
    assert.deepEqual(rowBlockRows([...rows, other], 'x').map((r) => r.id), ['x']);
    const bp = applyRoomTemplate('cinema-hall');
    assert.ok(bp);
    const tplRows = bp.furniture.filter((f) => f.kind === 'row');
    assert.equal(rowBlockRows(bp.furniture, tplRows[0].id).length, tplRows.length);
  });

  it('mesure le pas réel (1,15 m), la contremarche (45 cm) et le nombre de fauteuils du gradin de cinéma', () => {
    const rows = cinemaRows();
    const focus = rowBlockFocus(rows, []);
    const ordered = orderRowsFrontToBack(rows, focus, W, H);
    const stats = rowBlockStats(ordered, focus, W, H);
    assert.equal(stats.rows, 6);
    assert.equal(stats.seats, 96);
    assert.ok(Math.abs(stats.pitchM - 1.15) < 0.03, `pas ${stats.pitchM}`);
    assert.ok(Math.abs(stats.riseM - 0.45) < 0.011, `contremarche ${stats.riseM}`);
    assert.equal(stats.seatGrowth, 0);
    assert.ok(stats.uniformSeats);
  });

  it('règle l’écart entre rangs sans bouger le premier rang', () => {
    const rows = cinemaRows();
    const focus = rowBlockFocus(rows, []);
    const ordered = orderRowsFrontToBack(rows, focus, W, H);
    const next = respaceRowBlock(ordered, focus, W, H, 1.4);
    assert.ok(next);
    assert.deepEqual(next.get(ordered[0].id), { x: ordered[0].x, y: ordered[0].y });
    const moved = ordered.map((r) => ({ ...r, ...next.get(r.id) }));
    const stats = rowBlockStats(moved, focus, W, H);
    assert.ok(Math.abs(stats.pitchM - 1.4) < 0.05, `pas ${stats.pitchM}`);
    // Trop large pour la salle : refusé plutôt que de sortir du plan.
    assert.equal(respaceRowBlock(ordered, focus, W, 12, 2.5), null);
  });

  it('ajoute un rang derrière avec la même marche et la même contremarche, et un rang devant plus bas', () => {
    const rows = cinemaRows();
    const focus = rowBlockFocus(rows, []);
    const ordered = orderRowsFrontToBack(rows, focus, W, H);
    const last = ordered[ordered.length - 1];
    const back = rowForBlockEdge(ordered, 'back', focus, W, H);
    assert.ok(back);
    assert.ok(Math.abs(((back.y - last.y) / 100) * H - 1.15) < 0.05);
    assert.ok(Math.abs((back.elevationM ?? 0) - (last.elevationM ?? 0) - 0.45) < 0.011);
    assert.equal(back.seatCount, last.seatCount);
    assert.equal(back.groupId, last.groupId);
    const front = rowForBlockEdge(ordered, 'front', focus, W, H);
    assert.ok(front);
    assert.ok(front.y < ordered[0].y);
    assert.equal(front.elevationM, 0);
  });

  it('prolonge la progression des fauteuils d’un éventail', () => {
    const rows = generateAmphitheaterRows({ style: 'modernFan', tierCount: 4, seatsPerRow: 12, depthM: 18 });
    const focus = rowBlockFocus(rows, []);
    const ordered = orderRowsFrontToBack(rows, focus, 24, 18);
    assert.equal(rowBlockStats(ordered, focus, 24, 18).seatGrowth, 2);
    const back = rowForBlockEdge(ordered, 'back', focus, 24, 18);
    assert.ok(back);
    assert.equal(back.seatCount, ordered[ordered.length - 1].seatCount + 2);
  });

  it('nomme les rangs A, B, C… en sautant I et O, ou 1, 2, 3…', () => {
    assert.deepEqual([0, 7, 8, 12, 13, 23, 24].map((i) => rowLetter(i)), ['A', 'H', 'J', 'N', 'P', 'Z', 'AA']);
    assert.equal(rowLetter(8, false), 'I');
    assert.equal(rowLetterIndex('J'), 8);
    const rows: BlockRow[] = Array.from({ length: 3 }, (_, i) => ({ id: `r${i}`, kind: 'row', label: `x${i}`, seatCount: 10, x: 50, y: 20 + i * 6 }));
    const names = relabelRowBlock(rows, { start: 'H' });
    assert.deepEqual([...names.values()].map((n) => n.rowName), ['Rang H', 'Rang J', 'Rang K']);
    const nums = relabelRowBlock(rows, { numbering: 'numbers', start: '5' });
    assert.deepEqual([...nums.values()].map((n) => n.label), ['Rangée 5', 'Rangée 6', 'Rangée 7']);
  });

  it('reconnaît une numérotation automatique à prolonger', () => {
    const rows = cinemaRows();
    assert.deepEqual(rowBlockAutoNumbering(rows), { numbering: 'letters', start: 'A', skipIO: true });
    const custom = rows.map((r, i) => ({ ...r, rowName: i === 0 ? 'Loge VIP' : r.rowName }));
    assert.equal(rowBlockAutoNumbering(custom), null);
  });

  it('range des rangées en une colonne propre au lieu d’un quadrillage', () => {
    const rows: BlockRow[] = [
      { id: 'a', kind: 'row', label: 'A', seatCount: 10, x: 30, y: 20 },
      { id: 'b', kind: 'row', label: 'B', seatCount: 10, x: 70, y: 29 },
      { id: 'c', kind: 'row', label: 'C', seatCount: 10, x: 52, y: 40 },
    ];
    const next = tidyRowsColumn(rows);
    assert.deepEqual([...next.values()].map((p) => p.x), [52, 52, 52]);
    assert.deepEqual([...next.values()].map((p) => p.y), [20, 30, 40]);
  });
});

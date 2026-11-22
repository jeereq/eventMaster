import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyRoomTemplate, blueprintToTablePlan } from './roomLayoutUtils.ts';
import { topViewRow } from './roomPlanTopViewGeom.ts';
import { planRowLabelPoints, planRowSeatCode, planRowSeats, planRowShortLabel, isPlanRow } from './planRowSeats.ts';

for (const id of ['cinema-hall', 'amphitheater-slope', 'amphitheater-small']) {
  test(`${id} : les fauteuils du plan 2D sont ceux de la vue du dessus`, () => {
    const bp = applyRoomTemplate(id);
    assert.ok(bp);
    const { widthM: W, heightM: H } = bp.canvas;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = blueprintToTablePlan(bp) as any;
    const rows = bp.furniture.filter((f) => f.kind === 'row');
    assert.ok(rows.length > 0);
    for (const item of rows) {
      if (item.kind !== 'row') continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const table = plan.tables.find((t: any) => t.id === item.id);
      assert.ok(isPlanRow(table));
      const seats = planRowSeats(table, bp.fixtures, W, H);
      const ref = topViewRow(item, bp.fixtures, W, H);
      assert.equal(seats.length, ref.seats.length);
      seats.forEach((s, i) => {
        assert.ok(Math.abs((s.xPct / 100) * W - ref.seats[i].x) < 0.01);
        assert.ok(Math.abs((s.yPct / 100) * H - ref.seats[i].y) < 0.01);
        assert.ok(Math.abs(s.rotDeg - ref.seats[i].rotDeg) < 0.01);
      });
    }
  });
}

test('deux fauteuils voisins ne se chevauchent pas, deux rangs non plus', () => {
  const bp = applyRoomTemplate('cinema-hall')!;
  const { widthM: W, heightM: H } = bp.canvas;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = blueprintToTablePlan(bp) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = plan.tables.flatMap((t: any) => planRowSeats(t, bp.fixtures, W, H).map((s) => ({ ...s, id: t.id })));
  let min = Infinity;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(((all[i].xPct - all[j].xPct) / 100) * W, ((all[i].yPct - all[j].yPct) / 100) * H);
      min = Math.min(min, d);
    }
  }
  assert.ok(min >= 0.5, `écart minimal ${min} m`);
});

test('étiquettes de rang aux deux bouts, codes de fauteuil', () => {
  const seats = planRowSeats({ x: 50, y: 50, capacity: 10, rowMeta: { curve: 0 } }, [], 20, 20);
  const [left, right] = planRowLabelPoints(seats, 20, 20);
  assert.ok(left.xPct < seats[0].xPct && right.xPct > seats[9].xPct);
  assert.equal(planRowShortLabel('Rangée B'), 'B');
  assert.equal(planRowSeatCode('Rangée B', null, 4), 'B5');
  assert.equal(planRowSeatCode('Rangée B', { seatCodes: ['X1'] }, 0), 'X1');
  assert.equal(isPlanRow({ rowMeta: null }), false);
});

test('codes de fauteuil distincts d’un gradin à l’autre', async () => {
  const { rowSeatCode, rowLabelPrefix } = await import('./roomAmphitheaterGeom.ts');
  assert.equal(rowLabelPrefix('Rang A'), 'A');
  assert.equal(rowLabelPrefix('Rangée B'), 'B');
  assert.equal(rowLabelPrefix('Gradin 2 — Rangée 3'), 'G2R3');
  assert.equal(rowSeatCode('Gradin 2 — Rangée 3', 4), 'G2R3-5');
  assert.equal(rowSeatCode('Rang A', 0), 'A1');
  assert.equal(rowSeatCode('Rangée 12', 0), '12-1');
  assert.notEqual(rowSeatCode('Gradin 1 — Rangée 1', 0), rowSeatCode('Gradin 2 — Rangée 1', 0));
});

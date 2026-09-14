import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSeatCoordinates } from './tablePlanUtils.ts';
import { getRowSeatCoordinates2D } from './roomAmphitheaterGeom.ts';
import {
  checkoutPlanShape,
  formatCheckoutSeatLabel,
  isTheaterRowPlan,
  mapTicketSelectionsToWebGL,
  resolveTicketSeatPick,
  THEATER_ROW_PLAN_SHAPE,
  webglKindForPlanTable,
} from './seatSelectionLayout.ts';

describe('seatSelectionLayout — rangées vs tables', () => {
  it('reconnaît une rangée d’amphithéâtre par shape arc ou rowMeta', () => {
    assert.equal(isTheaterRowPlan('arc'), true);
    assert.equal(isTheaterRowPlan('rectangular', { tier: 0, curve: 42 }), true);
    assert.equal(isTheaterRowPlan('round'), false);
    assert.equal(isTheaterRowPlan('rectangular'), false);
    assert.equal(checkoutPlanShape('rectangular', { curve: 40 }), THEATER_ROW_PLAN_SHAPE);
    assert.equal(checkoutPlanShape('round'), 'round');
    assert.equal(webglKindForPlanTable('arc', { tier: 1 }), 'row');
    assert.equal(webglKindForPlanTable('oval'), 'table');
  });

  it('place les sièges d’une rangée sur un seul arc, pas des deux côtés d’une table', () => {
    const capacity = 10;
    const rowMeta = { tier: 0, curve: 42, aisleSplit: true, aisleWidthPct: 14 };
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < capacity; i++) {
      const seat = getRowSeatCoordinates2D(capacity, i, rowMeta);
      xs.push(seat.x);
      ys.push(seat.y);
    }

    const uniqueX = new Set(xs.map((x) => x.toFixed(3)));
    assert.equal(uniqueX.size, capacity, 'chaque siège de rangée a un X distinct');

    const left = getRowSeatCoordinates2D(capacity, 0, rowMeta);
    const right = getRowSeatCoordinates2D(capacity, capacity - 1, rowMeta);
    const midLeft = getRowSeatCoordinates2D(capacity, 4, rowMeta);
    const midRight = getRowSeatCoordinates2D(capacity, 5, rowMeta);
    assert.ok(left.x < 0 && right.x > 0);
    assert.ok(
      midRight.x - midLeft.x > 20,
      'l’allée centrale écarte les deux demis-rangées',
    );

    const banquet = getSeatCoordinates('rectangular', capacity, 0);
    const banquetOpposite = getSeatCoordinates('rectangular', capacity, 5);
    assert.ok(banquet.y * banquetOpposite.y < 0, 'une table rectangulaire a des sièges haut et bas');
    assert.ok(ys.every((y) => y >= -1), 'les sièges de rangée restent du côté scène / fond de courbure');
  });

  it('garde le placement banquet identique pour les tables rondes', () => {
    const banquet = getSeatCoordinates('round', 8, 2);
    assert.ok(Number.isFinite(banquet.x) && Number.isFinite(banquet.y));
    assert.equal(banquet.rotationDeg, 90);
  });

  it('mappe la sélection billetterie vers kind row pour le viewer 3D', () => {
    const furniture = [
      { id: 'row_a', kind: 'row' },
      { id: 'table_1', kind: 'table' },
    ];
    const mapped = mapTicketSelectionsToWebGL(
      [{ tableId: 'row_a', seatIndex: 3 }],
      'row_a',
      ['table_1'],
      furniture,
    );
    assert.deepEqual(
      mapped.filter((item) => item.seatIndex != null),
      [{ kind: 'row', id: 'row_a', seatIndex: 3 }],
    );
    assert.equal(mapped.find((item) => item.id === 'row_a' && item.seatIndex == null)?.kind, 'row');
    assert.equal(mapped.find((item) => item.id === 'table_1')?.kind, 'table');
  });

  it('accepte un clic 3D sur une rangée comme une place de billet', () => {
    const pick = resolveTicketSeatPick({ kind: 'row', id: 'gradin-1', seatIndex: 7 });
    assert.deepEqual(pick, { tableId: 'gradin-1', seatIndex: 7 });
    assert.equal(resolveTicketSeatPick({ kind: 'fixture', id: 'stage' }), null);
  });

  it('traite une chaise libre 3D comme le siège 0', () => {
    const pick = resolveTicketSeatPick({ kind: 'chair', id: 'honneur-g' });
    assert.deepEqual(pick, { tableId: 'honneur-g', seatIndex: 0 });
    const mapped = mapTicketSelectionsToWebGL(
      [{ tableId: 'honneur-g', seatIndex: 0 }],
      null,
      undefined,
      [{ id: 'honneur-g', kind: 'chair' }],
    );
    assert.deepEqual(mapped, [{ kind: 'chair', id: 'honneur-g', seatIndex: 0 }]);
  });
});

describe('seatSelectionLayout — libellés PMR et chaises', () => {
  it('formate les libellés de checkout', () => {
    assert.equal(
      formatCheckoutSeatLabel({ tableName: 'Rang A', seatIndex: 3, seatCode: 'A4' }),
      'Rang A · A4',
    );
    assert.equal(
      formatCheckoutSeatLabel({ tableName: 'Rang A', seatIndex: 0, seatCode: 'A1', isPmr: true }),
      'Rang A · A1 · PMR',
    );
    assert.equal(
      formatCheckoutSeatLabel({ tableName: 'Siège d’honneur', seatIndex: 0, standalone: true, isPmr: true }),
      'Siège d’honneur · PMR',
    );
  });
});

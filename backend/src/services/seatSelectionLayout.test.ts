import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  blueprintToTablePlan,
  generateRoomBlueprint,
  type RoomType,
} from './roomLayoutService.ts';
import {
  applyAutoZoneAssignment,
  resolveSeatPrice,
  resolveTablePricingZoneId,
  type PricingZone,
} from './ticketPricingService.ts';
import {
  buildSeatInventoryItems,
  holdKey,
  isSeatBookable,
  type PlanTable,
} from './seatSelectionPlan.ts';

const AMPHI_ZONES: PricingZone[] = [
  { id: 'tier-0', name: 'Orchestre', priceFc: 120_000, color: '#6bbd6e', x: 10, y: 18, w: 80, h: 32 },
  { id: 'tier-1', name: 'Balcon', priceFc: 75_000, color: '#9b6bcc', x: 12, y: 50, w: 76, h: 40 },
];

const BANQUET_ZONES: PricingZone[] = [
  { id: 'zone-vip', name: 'VIP', priceFc: 100_000, color: '#c4a35a' },
  { id: 'zone-standard', name: 'Standard', priceFc: 50_000, color: '#5b8def' },
];

function planTables(plan: ReturnType<typeof blueprintToTablePlan>): PlanTable[] {
  return (plan.tables ?? []) as PlanTable[];
}

function flattenSeats(tables: PlanTable[]) {
  return tables.flatMap((table) =>
    Array.from({ length: table.capacity }, (_, seatIndex) => ({
      tableId: table.id,
      seatIndex,
      shape: table.shape,
      x: table.x,
      y: table.y,
    })),
  );
}

describe('sélection de places — types d’emplacements', () => {
  it('convertit un amphithéâtre en rangées arc tarifées par gradin', () => {
    const blueprint = generateRoomBlueprint('AMPHITHEATER', {
      tierCount: 2,
      rowsPerTier: 2,
      seatsPerRow: 12,
    });
    const plan = blueprintToTablePlan(blueprint);
    const tables = planTables(plan);

    assert.ok(tables.length >= 4);
    assert.ok(tables.every((table) => table.shape === 'arc'));
    assert.ok(tables.every((table) => table.rowMeta != null));
    assert.equal(tables[0]?.rowMeta?.tier, 0);
    assert.ok((tables[0]?.y ?? 99) < (tables[tables.length - 1]?.y ?? 0));
    assert.ok(blueprint.fixtures.some((fixture) => fixture.kind === 'stage' && fixture.y < 20));

    const seats = flattenSeats(tables);
    const keys = new Set(seats.map((seat) => `${seat.tableId}:${seat.seatIndex}`));
    assert.equal(keys.size, seats.length, 'chaque place d’amphithéâtre est unique');

    const priced = applyAutoZoneAssignment(plan, AMPHI_ZONES) as {
      tables: Array<PlanTable & { pricingZoneId?: string }>;
    };
    const front = priced.tables.find((table) => table.rowMeta?.tier === 0);
    const back = priced.tables.find((table) => table.rowMeta?.tier === 1);
    assert.equal(resolveTablePricingZoneId(front!, AMPHI_ZONES), 'tier-0');
    assert.equal(resolveTablePricingZoneId(back!, AMPHI_ZONES), 'tier-1');

    const event = { ticketPricingMode: 'by_zone', ticketPriceFc: 40_000, tablePlan: priced };
    assert.equal(resolveSeatPrice(event, front!.id, 0).priceFc, 120_000);
    assert.equal(resolveSeatPrice(event, back!.id, 0).priceFc, 75_000);
    assert.equal(resolveSeatPrice(event, front!.id, 0).pricingZoneName, 'Orchestre');
  });

  it('convertit une conférence en rangées sélectionnables siège par siège', () => {
    const blueprint = generateRoomBlueprint('CONFERENCE', { rowCount: 4, seatsPerRow: 10 });
    const tables = planTables(blueprintToTablePlan(blueprint));
    assert.equal(tables.length, 4);
    assert.ok(tables.every((table) => table.shape === 'arc'));
    assert.equal(tables[0]?.capacity, 10);
    assert.ok(tables[0].y < tables[3].y);
    assert.equal(flattenSeats(tables).length, 40);
  });

  it('conserve les tables d’un banquet et d’une tente meublée', () => {
    const banquet = planTables(
      blueprintToTablePlan(generateRoomBlueprint('BANQUET', { tableCount: 6, seatsPerTable: 8 })),
    );
    assert.equal(banquet.length, 6);
    assert.ok(banquet.every((table) => table.shape === 'round'));
    assert.equal(flattenSeats(banquet).length, 48);

    const tent = planTables(
      blueprintToTablePlan(
        generateRoomBlueprint('TENT', { tableCount: 4, seatsPerTable: 8, tableShape: 'round' }),
      ),
    );
    assert.equal(tent.length, 4);
    assert.ok(tent.every((table) => table.shape === 'round'));
    assert.equal(flattenSeats(tent).length, 32);

    const banquetPriced = applyAutoZoneAssignment(
      { tables: banquet },
      BANQUET_ZONES,
    ) as { tables: Array<PlanTable & { pricingZoneId?: string }> };
    const closest = [...banquetPriced.tables].sort((a, b) => a.y - b.y)[0];
    const event = { ticketPricingMode: 'by_zone', ticketPriceFc: 20_000, tablePlan: banquetPriced };
    assert.ok(resolveSeatPrice(event, closest.id, 0).priceFc >= 0);
  });

  it('n’inventorie aucune place assignable pour SIMPLE, CUSTOM et tente vide', () => {
    const emptyTypes: RoomType[] = ['SIMPLE', 'CUSTOM'];
    for (const roomType of emptyTypes) {
      const tables = planTables(blueprintToTablePlan(generateRoomBlueprint(roomType)));
      assert.equal(tables.length, 0, `${roomType} ne doit pas inventer de tables`);
    }

    const openTent = planTables(blueprintToTablePlan(generateRoomBlueprint('TENT', { tableCount: 0 })));
    assert.equal(openTent.length, 0);
  });

  it('convertit les chaises seules d’une cérémonie ou grille en places vendables', () => {
    const blueprint = generateRoomBlueprint('CONFERENCE', { rowCount: 2, seatsPerRow: 4 });
    blueprint.furniture.push(
      {
        id: 'chair_honneur',
        kind: 'chair',
        chairType: 'ARMCHAIR',
        label: 'Siège d’honneur',
        x: 56,
        y: 10,
      },
      {
        id: 'chair_pmr',
        kind: 'chair',
        chairType: 'WHEELCHAIR',
        label: 'Place PMR',
        x: 20,
        y: 80,
      },
    );
    const tables = planTables(blueprintToTablePlan(blueprint));
    const honour = tables.find((table) => table.id === 'chair_honneur');
    const pmr = tables.find((table) => table.id === 'chair_pmr');
    assert.equal(honour?.capacity, 1);
    assert.equal(honour?.shape, 'round');
    assert.equal(pmr?.capacity, 1);
    assert.deepEqual(pmr?.pmrSeatIndices, [0]);

    const inventory = buildSeatInventoryItems(
      { ticketPricingMode: 'global', ticketPriceFc: 10_000, tablePlan: { tables } },
      tables,
    );
    assert.ok(inventory.some((seat) => seat.tableId === 'chair_honneur' && seat.available));
    assert.equal(inventory.find((seat) => seat.tableId === 'chair_pmr')?.isPmr, true);
  });

  it('masque les sièges détachés et bloque les places en hold', () => {
    const table: PlanTable = {
      id: 't1',
      name: 'Table 1',
      shape: 'round',
      capacity: 8,
      x: 40,
      y: 40,
      seats: { 1: 'guest-1' },
      hiddenSeatIndices: [3, 4],
      pmrSeatIndices: [0],
    };
    const holds = new Set([holdKey('t1', 2)]);
    const inventory = buildSeatInventoryItems(
      { ticketPricingMode: 'global', ticketPriceFc: 25_000 },
      [table],
      holds,
    );
    const indices = inventory.map((seat) => seat.seatIndex).sort((a, b) => a - b);
    assert.deepEqual(indices, [0, 1, 2, 5, 6, 7]);
    assert.equal(inventory.find((seat) => seat.seatIndex === 0)?.isPmr, true);
    assert.equal(inventory.find((seat) => seat.seatIndex === 1)?.available, false);
    assert.equal(inventory.find((seat) => seat.seatIndex === 2)?.available, false);
    assert.equal(isSeatBookable(table, 3).reason, 'hidden');
    assert.equal(isSeatBookable(table, 2, holds).reason, 'held');
  });

  it('refuse un index de siège hors capacité de rangée', () => {
    const plan = blueprintToTablePlan(
      generateRoomBlueprint('AMPHITHEATER', { tierCount: 1, rowsPerTier: 1, seatsPerRow: 8 }),
    );
    const table = planTables(plan)[0];
    const event = { ticketPricingMode: 'global', ticketPriceFc: 15_000, tablePlan: plan };
    assert.equal(resolveSeatPrice(event, table.id, 0).priceFc, 15_000);
    assert.equal(resolveSeatPrice(event, table.id, 99).pricingZoneId, null);
  });
});

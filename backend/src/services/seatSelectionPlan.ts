import { resolveSeatPrice, type ResolvedSeatPrice } from './ticketPricingService.ts';

export type SeatRowMeta = {
  tier?: number;
  curve?: number;
  elevationM?: number;
  aisleSplit?: boolean;
  aisleWidthPct?: number;
  focusX?: number;
  focusY?: number;
  rowName?: string;
  seatCodes?: string[];
};

export type SeatChairMeta = {
  standalone?: boolean;
  rotation?: number;
  isPmr?: boolean;
};

export type PlanTable = {
  id: string;
  name: string;
  shape?: string;
  capacity: number;
  x: number;
  y: number;
  seats?: Record<string | number, string | null>;
  rowMeta?: SeatRowMeta;
  chairMeta?: SeatChairMeta;
  chairType?: string;
  hiddenSeatIndices?: number[];
  pmrSeatIndices?: number[];
};

export type SeatInventoryItem = {
  tableId: string;
  tableName: string;
  seatIndex: number;
  x: number;
  y: number;
  shape: string;
  capacity: number;
  available: boolean;
  priceFc: number;
  pricingZoneId: string | null;
  pricingZoneName: string | null;
  rowMeta?: SeatRowMeta;
  chairMeta?: SeatChairMeta;
  isPmr?: boolean;
  seatCode?: string;
};

export function planTables(tablePlan: unknown): PlanTable[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const tables = (tablePlan as { tables?: PlanTable[] }).tables;
  return Array.isArray(tables) ? tables : [];
}

export function hiddenSeatIndexSet(table: PlanTable): Set<number> {
  return new Set((table.hiddenSeatIndices ?? []).filter((index) => Number.isFinite(index)));
}

export function isSeatHidden(table: PlanTable, seatIndex: number): boolean {
  return hiddenSeatIndexSet(table).has(seatIndex);
}

export function isSeatOccupiedOnPlan(table: PlanTable, seatIndex: number): boolean {
  return Boolean(table.seats?.[seatIndex] ?? table.seats?.[String(seatIndex)]);
}

export function isPmrSeat(table: PlanTable, seatIndex: number): boolean {
  if (table.chairMeta?.isPmr || table.chairType === 'WHEELCHAIR') return true;
  return Array.isArray(table.pmrSeatIndices) && table.pmrSeatIndices.includes(seatIndex);
}

export function holdKey(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`;
}

export function isSeatBookable(
  table: PlanTable,
  seatIndex: number,
  holdKeys: Set<string> = new Set(),
): { ok: boolean; reason?: 'missing' | 'hidden' | 'occupied' | 'held' | 'invalid' } {
  if (seatIndex < 0 || seatIndex >= table.capacity) return { ok: false, reason: 'invalid' };
  if (isSeatHidden(table, seatIndex)) return { ok: false, reason: 'hidden' };
  if (isSeatOccupiedOnPlan(table, seatIndex)) return { ok: false, reason: 'occupied' };
  if (holdKeys.has(holdKey(table.id, seatIndex))) return { ok: false, reason: 'held' };
  return { ok: true };
}

export function buildSeatInventoryItems(
  event: { ticketPricingMode?: string; ticketPriceFc: number; tablePlan?: unknown } | null,
  tables: PlanTable[],
  holdKeys: Set<string> = new Set(),
): SeatInventoryItem[] {
  const seats: SeatInventoryItem[] = [];
  for (const table of tables) {
    const cap = Math.max(0, Number(table.capacity) || 0);
    const hidden = hiddenSeatIndexSet(table);
    for (let i = 0; i < cap; i++) {
      if (hidden.has(i)) continue;
      const pricing: ResolvedSeatPrice = event
        ? resolveSeatPrice(event, table.id, i)
        : { priceFc: 0, pricingZoneId: null, pricingZoneName: null };
      const taken = !isSeatBookable(table, i, holdKeys).ok;
      seats.push({
        tableId: table.id,
        tableName: table.name,
        seatIndex: i,
        x: table.x,
        y: table.y,
        shape: table.shape || 'round',
        capacity: cap,
        available: !taken,
        priceFc: pricing.priceFc,
        pricingZoneId: pricing.pricingZoneId,
        pricingZoneName: pricing.pricingZoneName,
        ...(table.rowMeta ? { rowMeta: table.rowMeta } : {}),
        ...(table.chairMeta ? { chairMeta: table.chairMeta } : {}),
        isPmr: isPmrSeat(table, i),
        seatCode: table.rowMeta?.seatCodes?.[i],
      });
    }
  }
  return seats;
}

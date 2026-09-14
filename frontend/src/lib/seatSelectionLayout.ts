export const THEATER_ROW_PLAN_SHAPE = 'arc';

const CHECKOUT_TABLE_SHAPES = [
  'round',
  'rectangular',
  'square',
  'oval',
  'cocktail',
  'highTop',
  'arc',
] as const;

export type CheckoutPlanShape = (typeof CHECKOUT_TABLE_SHAPES)[number];

export type SeatRowMeta = {
  tier?: number;
  curve?: number;
  elevationM?: number;
  aisleSplit?: boolean;
  aisleWidthPct?: number;
  focusX?: number;
  focusY?: number;
  rowName?: string;
};

export function isTheaterRowPlan(shape?: string | null, rowMeta?: SeatRowMeta | null): boolean {
  if (shape === THEATER_ROW_PLAN_SHAPE) return true;
  if (!rowMeta || typeof rowMeta !== 'object') return false;
  return rowMeta.curve != null || rowMeta.tier != null || rowMeta.aisleSplit === true;
}

export function checkoutPlanShape(shape?: string | null, rowMeta?: SeatRowMeta | null): CheckoutPlanShape {
  if (isTheaterRowPlan(shape, rowMeta)) return THEATER_ROW_PLAN_SHAPE;
  if (shape && CHECKOUT_TABLE_SHAPES.includes(shape as CheckoutPlanShape)) {
    return shape as CheckoutPlanShape;
  }
  return 'round';
}

export function webglKindForPlanTable(shape?: string | null, rowMeta?: SeatRowMeta | null): 'row' | 'table' {
  return isTheaterRowPlan(shape, rowMeta) ? 'row' : 'table';
}

export function furnitureKindById(
  furniture: Array<{ id: string; kind: string }> | undefined,
  id: string,
): 'row' | 'table' {
  return furniture?.find((item) => item.id === id)?.kind === 'row' ? 'row' : 'table';
}

export type WebGLTicketSelection = {
  kind: 'table' | 'row';
  id: string;
  seatIndex?: number;
};

/** Convertit la sélection billetterie (tableId) vers le modèle WebGL table/rangée. */
export function mapTicketSelectionsToWebGL(
  selectedSeats: Array<{ tableId: string; seatIndex: number }>,
  selectedTableId: string | null | undefined,
  selectedTableIds: string[] | undefined,
  furniture: Array<{ id: string; kind: string }> | undefined,
): WebGLTicketSelection[] {
  const list: WebGLTicketSelection[] = [];
  for (const seat of selectedSeats) {
    list.push({
      kind: furnitureKindById(furniture, seat.tableId),
      id: seat.tableId,
      seatIndex: seat.seatIndex,
    });
  }
  if (selectedTableId) {
    list.push({ kind: furnitureKindById(furniture, selectedTableId), id: selectedTableId });
  }
  if (selectedTableIds?.length) {
    for (const id of selectedTableIds) {
      if (!list.some((item) => item.id === id && item.seatIndex == null)) {
        list.push({ kind: furnitureKindById(furniture, id), id });
      }
    }
  }
  return list;
}

export function resolveTicketSeatPick(sel: { kind: string; id: string; seatIndex?: number } | null): {
  tableId: string;
  seatIndex?: number;
} | null {
  if (!sel) return null;
  if (sel.kind !== 'table' && sel.kind !== 'row') return null;
  return { tableId: sel.id, seatIndex: sel.seatIndex };
}

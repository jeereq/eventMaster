/** Contour de salle, en pourcentage du canvas (même convention que l'éditeur). */
type OutlineLike = { shape?: string; w?: number; h?: number };

type FurnitureLike =
  | { kind: 'table'; capacity: number; hiddenSeatIndices?: number[] }
  | { kind: 'row'; seatCount: number }
  | { kind: 'chair' }
  | { kind: string };

export type BlueprintLike = {
  canvas?: { widthM?: number; heightM?: number };
  roomOutline?: OutlineLike;
  furniture?: FurnitureLike[];
};

export interface LayoutStats {
  capacityMax: number;
  areaM2: number | null;
}

/**
 * Part de la boîte englobante réellement occupée par chaque forme de contour.
 * Valeurs calculées par la formule du lacet sur les sommets utilisés par l'éditeur
 * (`outlinePolygonPoints`), arrondies au centième.
 */
export const OUTLINE_FILL_FACTOR: Record<string, number> = {
  rectangle: 1,
  square: 0.5,
  circle: 0.59,
  ellipse: 0.45,
  lShape: 0.88,
  rShape: 0.88,
  tShape: 0.6,
  uShape: 0.78,
  hexagon: 0.75,
  octagon: 0.82,
  pentagon: 0.7,
  triangle: 0.5,
  diamond: 0.5,
  trapezoid: 0.82,
  stadium: 0.9,
  cross: 0.51,
};

const PERCENT = 100;
const AREA_DECIMALS = 10;

function isPositiveFinite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function computeLayoutCapacity(blueprint: BlueprintLike): number {
  return (blueprint.furniture ?? []).reduce((sum, item) => {
    if (item.kind === 'table') {
      const table = item as Extract<FurnitureLike, { kind: 'table' }>;
      const hidden = table.hiddenSeatIndices?.length ?? 0;
      return sum + Math.max(0, (table.capacity ?? 0) - hidden);
    }
    if (item.kind === 'row') return sum + ((item as Extract<FurnitureLike, { kind: 'row' }>).seatCount ?? 0);
    if (item.kind === 'chair') return sum + 1;
    return sum;
  }, 0);
}

/** Surface au sol estimée en m² ; `null` si les dimensions du canvas sont absentes. */
export function computeLayoutArea(blueprint: BlueprintLike): number | null {
  const widthM = blueprint.canvas?.widthM;
  const heightM = blueprint.canvas?.heightM;
  if (!isPositiveFinite(widthM) || !isPositiveFinite(heightM)) return null;

  const outline = blueprint.roomOutline;
  const widthShare = isPositiveFinite(outline?.w) ? Math.min(outline.w, PERCENT) / PERCENT : 1;
  const heightShare = isPositiveFinite(outline?.h) ? Math.min(outline.h, PERCENT) / PERCENT : 1;
  const fill = (outline?.shape && OUTLINE_FILL_FACTOR[outline.shape]) || 1;

  const area = widthM * heightM * widthShare * heightShare * fill;
  return Math.round(area * AREA_DECIMALS) / AREA_DECIMALS;
}

export function computeLayoutStats(blueprint: unknown): LayoutStats {
  if (!blueprint || typeof blueprint !== 'object') return { capacityMax: 0, areaM2: null };
  const typed = blueprint as BlueprintLike;
  return { capacityMax: computeLayoutCapacity(typed), areaM2: computeLayoutArea(typed) };
}

type AmphitheaterStyle = 'modernFan' | 'romanSemiCircle' | 'tieredSteps' | 'horseshoeU';

/** Coefficient historique utilisé par le poseur 3D (localZ = factor × t² × k). */
export const ROW_ARC_Z_K = 0.08;
export const ROW_SEAT_MAX = 60;
const LEGACY_CURVE_FACTOR_MAX = 1.5;

/**
 * L’éditeur stocke la courbure en % (0–100).
 * Les anciens templates / API utilisent encore 0–0.4.
 */
export function rowCurveFactor(curve: number | undefined | null): number {
  const raw = Number(curve ?? 0);
  if (!Number.isFinite(raw)) return 0;
  if (Math.abs(raw) <= LEGACY_CURVE_FACTOR_MAX) return raw;
  return raw / 100;
}

export function rowCurvePercent(curve: number | undefined | null): number {
  const raw = Number(curve ?? 0);
  if (!Number.isFinite(raw)) return 0;
  if (Math.abs(raw) <= LEGACY_CURVE_FACTOR_MAX) return raw * 100;
  return raw;
}

export function clampRowSeatCount(seatCount: number): number {
  return Math.min(ROW_SEAT_MAX, Math.max(2, Math.round(seatCount) || 2));
}

export function rowSeatLocalX(
  index: number,
  count: number,
  spacing: number,
  aisleSplit?: boolean,
  aisleWidthPct?: number,
): number {
  const mid = (count - 1) / 2;
  const t = index - mid;
  if (!aisleSplit || count < 4) return t * spacing;
  const width = Math.min(30, Math.max(5, aisleWidthPct ?? 14));
  const gap = spacing * (0.55 + width / 20);
  const side = index < count / 2 ? -1 : 1;
  return t * spacing + side * (gap / 2);
}

export function rowArcZ(localX: number, spacing: number, curveFactor: number): number {
  const t = spacing === 0 ? 0 : localX / spacing;
  return curveFactor * t * t * ROW_ARC_Z_K;
}

/** Espacement pixel 2D calé sur la largeur des pastilles de siège (~32px). */
const CHECKOUT_ROW_SEAT_SPACING_PX = 16;
const CHECKOUT_ROW_FOCUS_LOCAL_Z = -80;

/** Positions 2D d’une rangée, alignées sur la pose 3D (courbe + allée). */
export function getRowSeatCoordinates2D(
  capacity: number,
  seatIndex: number,
  rowMeta?: { curve?: number; aisleSplit?: boolean; aisleWidthPct?: number } | null,
) {
  const count = Math.max(1, capacity);
  const curve = rowMeta?.curve ?? 36;
  const localX = rowSeatLocalX(
    seatIndex,
    count,
    CHECKOUT_ROW_SEAT_SPACING_PX,
    rowMeta?.aisleSplit,
    rowMeta?.aisleWidthPct,
  );
  const localZ = rowArcZ(localX, CHECKOUT_ROW_SEAT_SPACING_PX, rowCurveFactor(curve));
  const faceY = Math.atan2(-localX, CHECKOUT_ROW_FOCUS_LOCAL_Z - localZ);
  return {
    x: localX,
    y: localZ,
    rotationDeg: (faceY * 180) / Math.PI + 180,
  };
}

export function computeRowSeatPose(
  index: number,
  count: number,
  spacing: number,
  curve: number | undefined,
  elevation: number,
  focusLocal: { x: number; z: number },
  aisleSplit?: boolean,
  aisleWidthPct?: number,
) {
  const curveF = rowCurveFactor(curve);
  const localX = rowSeatLocalX(index, count, spacing, aisleSplit, aisleWidthPct);
  const localZ = rowArcZ(localX, spacing, curveF);
  const faceY = Math.atan2(focusLocal.x - localX, focusLocal.z - localZ);
  return { localX, localZ, y: elevation, faceY, curveF };
}

export function seatsGrownForTier(style: AmphitheaterStyle, baseSeats: number, tierIndex: number): number {
  const grow = style === 'romanSemiCircle' ? 3 : style === 'tieredSteps' ? 0 : 2;
  return baseSeats + tierIndex * grow;
}

export function rowSeatCode(rowName: string | undefined | null, index: number): string {
  const raw = String(rowName || 'A').trim();
  const token = raw.replace(/^rang(ée)?\s+/i, '').split(/\s+/)[0] || 'A';
  const prefix = token.slice(0, 4).toUpperCase();
  return `${prefix}${index + 1}`;
}

export function estimateAmphitheaterSeats(
  style: AmphitheaterStyle,
  tierCount: number,
  seatsPerRow: number,
): number {
  let total = 0;
  for (let t = 0; t < tierCount; t += 1) {
    const seats = seatsGrownForTier(style, seatsPerRow, t);
    if (style === 'horseshoeU') {
      total += Math.max(4, seats - 4) + 2 * Math.max(4, Math.round(seats * 0.45));
    } else {
      total += seats;
    }
  }
  return total;
}

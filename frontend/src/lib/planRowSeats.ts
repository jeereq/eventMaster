/**
 * Rangées de cinéma / d’amphithéâtre dans les plans 2D « invités » (billetterie, plan de l’invité,
 * invitation imprimée) : chaque fauteuil est posé à sa vraie place, avec la même courbure,
 * la même allée et la même orientation que la vue 3D et le plan vu du dessus.
 *
 * Auparavant ces plans dessinaient une rangée comme une table (pastille ronde, sièges serrés
 * à 16 px quelle que soit la salle) : les rangs se chevauchaient, et le plan invité
 * les écartait même les uns des autres comme des tables.
 *
 * Module pur : seules des importations de types pointent vers '@/'.
 */
import { computeRowSeatPose, rowLabelPrefix, rowSeatCode } from './roomAmphitheaterGeom.ts';
import { pctToPlanMeters, rotateY, rotYToSvgDeg, TOP_VIEW_ROW_SPACING_M } from './roomPlanTopViewGeom.ts';
import type { SeatRowMeta } from './seatSelectionLayout.ts';

export type PlanRowInput = {
  x: number;
  y: number;
  capacity: number;
  rotation?: number | null;
  rowMeta?: SeatRowMeta | null;
};

type FixtureLike = { kind: string; x: number; y: number; w: number; h: number };

export interface PlanRowSeat {
  index: number;
  /** Position en % du canevas (même repère que les tables et les murs). */
  xPct: number;
  yPct: number;
  /** Rotation à l’écran (degrés, sens horaire). À 0, le dossier est en haut et le spectateur regarde vers le bas. */
  rotDeg: number;
}

/** Largeur d’un fauteuil vu du dessus (un peu moins que l’entraxe de 55 cm). */
export const PLAN_ROW_SEAT_WIDTH_M = 0.48;

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Point regardé par la rangée : foyer enregistré, sinon scène / podium, sinon devant elle (comme en 3D). */
export function planRowFocusPct(row: PlanRowInput, fixtures: readonly FixtureLike[] | null | undefined): [number, number] {
  const meta = row.rowMeta ?? {};
  const hasFocus = Boolean(meta.focusX) || Boolean(meta.focusY);
  const target = hasFocus
    ? undefined
    : (fixtures ?? []).find((f) => f.kind === 'stage' || f.kind === 'podium');
  const fx = meta.focusX ?? (target ? target.x + target.w / 2 : row.x);
  const fy = meta.focusY ?? (target ? target.y + target.h / 2 : Math.max(4, row.y - 25));
  return [fx, fy];
}

/** Fauteuils d’une rangée, à l’échelle de la salle. */
export function planRowSeats(
  row: PlanRowInput,
  fixtures: readonly FixtureLike[] | null | undefined,
  widthM: number,
  heightM: number,
): PlanRowSeat[] {
  const W = widthM > 0 ? widthM : 20;
  const H = heightM > 0 ? heightM : 16;
  const count = Math.max(0, Math.round(row.capacity) || 0);
  if (count === 0) return [];
  const meta = row.rowMeta ?? {};
  const [cx, cy] = pctToPlanMeters(row.x, row.y, W, H);
  const [fxPct, fyPct] = planRowFocusPct(row, fixtures);
  const [fx, fy] = pctToPlanMeters(fxPct, fyPct, W, H);
  const rowRot = ((row.rotation ?? 0) * Math.PI) / 180;
  const dx = fx - cx;
  const dz = fy - cy;
  const focusLocal = {
    x: Math.cos(rowRot) * dx - Math.sin(rowRot) * dz,
    z: Math.sin(rowRot) * dx + Math.cos(rowRot) * dz,
  };
  const seats: PlanRowSeat[] = [];
  for (let i = 0; i < count; i += 1) {
    const pose = computeRowSeatPose(
      i,
      count,
      TOP_VIEW_ROW_SPACING_M,
      meta.curve ?? 0,
      0,
      focusLocal,
      meta.aisleSplit === true,
      meta.aisleWidthPct,
    );
    const [wx, wz] = rotateY(pose.localX, pose.localZ, rowRot);
    seats.push({
      index: i,
      xPct: round(((cx + wx) / W) * 100),
      yPct: round(((cy + wz) / H) * 100),
      rotDeg: rotYToSvgDeg(rowRot + pose.faceY),
    });
  }
  return seats;
}

/**
 * Emplacement des étiquettes de rang (« A ») aux deux bouts de la rangée, dans l’axe des fauteuils,
 * comme les plaques au bout des rangs d’une salle.
 */
export function planRowLabelPoints(
  seats: readonly PlanRowSeat[],
  widthM: number,
  heightM: number,
  gapM = 0.6,
): Array<{ xPct: number; yPct: number }> {
  if (seats.length === 0) return [];
  const W = widthM > 0 ? widthM : 20;
  const H = heightM > 0 ? heightM : 16;
  if (seats.length === 1) return [{ xPct: seats[0].xPct, yPct: seats[0].yPct }];
  const end = (a: PlanRowSeat, b: PlanRowSeat) => {
    const ax = (a.xPct / 100) * W;
    const ay = (a.yPct / 100) * H;
    const vx = ax - (b.xPct / 100) * W;
    const vy = ay - (b.yPct / 100) * H;
    const len = Math.hypot(vx, vy) || 1;
    return {
      xPct: round(((ax + (vx / len) * gapM) / W) * 100),
      yPct: round(((ay + (vy / len) * gapM) / H) * 100),
    };
  };
  return [end(seats[0], seats[1]), end(seats[seats.length - 1], seats[seats.length - 2])];
}

/** Libellé court d’un rang : « Rangée A » → « A », « Gradin 2 — Rangée 3 » → « G2R3 ». */
export function planRowShortLabel(name: string | null | undefined, rowMeta?: SeatRowMeta | null): string {
  return rowLabelPrefix(rowMeta?.rowName || name || '') || '·';
}

/** Code d’un fauteuil (« A5 ») : celui enregistré sur la rangée s’il existe, sinon calculé. */
export function planRowSeatCode(name: string | null | undefined, rowMeta: SeatRowMeta | null | undefined, index: number): string {
  return rowMeta?.seatCodes?.[index] || rowSeatCode(rowMeta?.rowName || name || '', index);
}

/** Une table du plan est-elle une rangée de fauteuils (cinéma, amphithéâtre, conférence) ? */
export function isPlanRow(table: { rowMeta?: SeatRowMeta | null }): boolean {
  return Boolean(table.rowMeta && typeof table.rowMeta === 'object');
}

/**
 * Emprise d’une rangée sur le plan (en % du canevas), fauteuils compris : sert à encadrer
 * une zone tarifaire de cinéma / gradins sur toute la largeur réelle de ses rangs.
 */
export function planRowBoundsPct(
  row: PlanRowInput,
  fixtures: readonly FixtureLike[] | null | undefined,
  widthM: number,
  heightM: number,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const seats = planRowSeats(row, fixtures, widthM, heightM);
  if (seats.length === 0) return null;
  const W = widthM > 0 ? widthM : 20;
  const H = heightM > 0 ? heightM : 16;
  const halfX = ((PLAN_ROW_SEAT_WIDTH_M / 2) / W) * 100;
  const halfY = ((PLAN_ROW_SEAT_WIDTH_M / 2) / H) * 100;
  const xs = seats.map((s) => s.xPct);
  const ys = seats.map((s) => s.yPct);
  return {
    minX: round(Math.min(...xs) - halfX),
    maxX: round(Math.max(...xs) + halfX),
    minY: round(Math.min(...ys) - halfY),
    maxY: round(Math.max(...ys) + halfY),
  };
}

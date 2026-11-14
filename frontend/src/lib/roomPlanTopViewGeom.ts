/**
 * Géométrie du plan 2D « vu du dessus », calculée avec les mêmes règles que la
 * vue 3D (taille des plateaux, place des chaises, courbure des rangées) pour
 * que le plan 2D et la maquette 3D montrent exactement la même salle.
 *
 * Repère : mètres depuis le coin haut-gauche du canevas, x vers la droite,
 * y vers le bas (= axe Z de la 3D). Les rotations sont données en degrés SVG
 * (sens horaire à l’écran) : une rotation Three.js `rotY` vaut `-rotY` en SVG.
 *
 * Module pur : seules des importations de types pointent vers '@/'.
 */
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { getTableSeatPlacement3D, tablePlateSizeMeters } from './tablePlanUtils.ts';
import type { TableShape } from './tablePlanUtils.ts';
import { clampRowSeatCount, computeRowSeatPose } from './roomAmphitheaterGeom.ts';

type FurnitureItem = RoomLayoutBlueprint['furniture'][number];
type TableItem = Extract<FurnitureItem, { kind: 'table' }>;
type RowItem = Extract<FurnitureItem, { kind: 'row' }>;
type ChairItem = Extract<FurnitureItem, { kind: 'chair' }>;
type FixtureLike = Pick<RoomLayoutBlueprint['fixtures'][number], 'kind' | 'x' | 'y' | 'w' | 'h'>;

/** Mêmes constantes que la vue 3D. */
export const TOP_VIEW_MAX_TABLE_CHAIRS = 40;
export const TOP_VIEW_ROW_SPACING_M = 0.55;
const ARC_SWEEP = Math.PI * 0.95;
const ARC_START = -ARC_SWEEP / 2;

export interface TopViewSeat {
  /** Index du siège sur sa table / rangée. */
  index: number;
  x: number;
  y: number;
  /** Rotation SVG (degrés). À 0, le dossier est en haut et le convive regarde vers le bas. */
  rotDeg: number;
}

export interface TopViewTable {
  id: string;
  shape: TableShape;
  cx: number;
  cy: number;
  rotDeg: number;
  /** Plateau en mètres [largeur, profondeur], comme en 3D. */
  size: [number, number];
  seats: TopViewSeat[];
}

export interface TopViewRow {
  id: string;
  cx: number;
  cy: number;
  seats: TopViewSeat[];
}

const toDeg = (rad: number) => (rad * 180) / Math.PI;
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Convertit un pourcentage du canevas en mètres depuis le coin haut-gauche. */
export function pctToPlanMeters(xPct: number, yPct: number, widthM: number, heightM: number): [number, number] {
  return [(xPct / 100) * widthM, (yPct / 100) * heightM];
}

/** Applique la rotation Three.js `rotY` à un vecteur local (x, z). */
export function rotateY(x: number, z: number, rotY: number): [number, number] {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return [x * c + z * s, -x * s + z * c];
}

/** Une rotation Three.js autour de Y, exprimée en degrés SVG. */
export function rotYToSvgDeg(rotY: number): number {
  const deg = -toDeg(rotY);
  const norm = ((deg % 360) + 360) % 360;
  return round(norm === 360 ? 0 : norm);
}

export function topViewTable(item: TableItem, widthM: number, heightM: number): TopViewTable {
  const shape = item.shape;
  const size = tablePlateSizeMeters(
    shape,
    item.capacity,
    { customWidthM: item.customWidthM, customDepthM: item.customDepthM, customRadiusM: item.customRadiusM },
    item.seatingSide,
  );
  const [cx, cy] = pctToPlanMeters(item.x, item.y, widthM, heightM);
  const tableRot = ((item.rotation ?? 0) * Math.PI) / 180;
  const seats: TopViewSeat[] = [];
  const hasChairs = item.attachedChairs !== false && shape !== 'cocktail' && shape !== 'highTop';
  if (hasChairs) {
    const hidden = new Set(item.hiddenSeatIndices ?? []);
    const count = Math.min(item.capacity, TOP_VIEW_MAX_TABLE_CHAIRS);
    for (let i = 0; i < count; i += 1) {
      if (hidden.has(i)) continue;
      const seat = getTableSeatPlacement3D(shape, item.capacity, i, size, item.seatingSide);
      const [dx, dz] = rotateY(seat.x, seat.z, tableRot);
      seats.push({
        index: i,
        x: round(cx + dx),
        y: round(cy + dz),
        rotDeg: rotYToSvgDeg(tableRot + seat.rotationY),
      });
    }
  }
  return { id: item.id, shape, cx, cy, rotDeg: rotYToSvgDeg(tableRot), size, seats };
}

/** Point visé par une rangée : focus explicite, sinon scène / podium, sinon devant la rangée. */
export function rowFocusPct(item: RowItem, fixtures: readonly FixtureLike[]): [number, number] {
  const stage = !item.focusX && !item.focusY
    ? fixtures.find((f) => f.kind === 'stage' || f.kind === 'podium')
    : undefined;
  const fx = item.focusX ?? (stage ? stage.x + stage.w / 2 : item.x);
  const fy = item.focusY ?? (stage ? stage.y + stage.h / 2 : Math.max(4, item.y - 25));
  return [fx, fy];
}

export function topViewRow(
  item: RowItem,
  fixtures: readonly FixtureLike[],
  widthM: number,
  heightM: number,
): TopViewRow {
  const [cx, cy] = pctToPlanMeters(item.x, item.y, widthM, heightM);
  const [fxPct, fyPct] = rowFocusPct(item, fixtures);
  const [fx, fy] = pctToPlanMeters(fxPct, fyPct, widthM, heightM);
  const rowRot = ((item.rotation ?? 0) * Math.PI) / 180;
  const dx = fx - cx;
  const dz = fy - cy;
  // Rotation inverse R_y(-rowRot) : vecteur vers le foyer dans le repère de la rangée.
  const focusLocal = {
    x: Math.cos(rowRot) * dx - Math.sin(rowRot) * dz,
    z: Math.sin(rowRot) * dx + Math.cos(rowRot) * dz,
  };
  const count = clampRowSeatCount(item.seatCount);
  const seats: TopViewSeat[] = [];
  for (let i = 0; i < count; i += 1) {
    const pose = computeRowSeatPose(
      i,
      count,
      TOP_VIEW_ROW_SPACING_M,
      item.curve ?? 0,
      0,
      focusLocal,
      item.aisleSplit === true,
      item.aisleWidthPct,
    );
    const [wx, wz] = rotateY(pose.localX, pose.localZ, rowRot);
    seats.push({
      index: i,
      x: round(cx + wx),
      y: round(cy + wz),
      rotDeg: rotYToSvgDeg(rowRot + pose.faceY),
    });
  }
  return { id: item.id, cx, cy, seats };
}

export function topViewFreeChair(item: ChairItem, widthM: number, heightM: number): TopViewSeat {
  const [x, y] = pctToPlanMeters(item.x, item.y, widthM, heightM);
  return { index: 0, x, y, rotDeg: rotYToSvgDeg(((item.rotation ?? 0) * Math.PI) / 180) };
}

/** Rayon de la ligne médiane d’une table en arc (identique au maillage 3D). */
export function arcTableRadius(size: [number, number]): number {
  return Math.max(1.4, size[0] / 2);
}

/** Épaisseur du plateau d’une table en arc (identique au maillage 3D). */
export function arcTableThickness(size: [number, number]): number {
  return Math.min(0.72, Math.max(0.48, size[1] * 0.38));
}

/**
 * Contour SVG (repère local de la table, en mètres) du plateau en arc :
 * secteur d’anneau ouvert vers le haut, comme en 3D (bombé vers +Z).
 */
export function arcTablePath(size: [number, number], segments = 24): string {
  const r = arcTableRadius(size);
  const half = arcTableThickness(size) / 2;
  const outer: string[] = [];
  const inner: string[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const a = ARC_START + (i / segments) * ARC_SWEEP;
    const s = Math.sin(a);
    const c = Math.cos(a);
    outer.push(`${round(s * (r + half))} ${round(c * (r + half))}`);
    inner.push(`${round(s * (r - half))} ${round(c * (r - half))}`);
  }
  return `M ${outer.join(' L ')} L ${inner.reverse().join(' L ')} Z`;
}

/**
 * Taille d’une tuile de sol en % du canevas, pour que la texture du plan 2D
 * ait la même échelle qu’en 3D (une tuile = `tileM` mètres).
 */
export function floorTileSizePct(tileM: number, widthM: number, heightM: number): [number, number] {
  if (!(tileM > 0) || !(widthM > 0) || !(heightM > 0)) return [100, 100];
  return [round((tileM / widthM) * 100), round((tileM / heightM) * 100)];
}

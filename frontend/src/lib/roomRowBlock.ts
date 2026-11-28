/**
 * Bloc de rangées (salle de cinéma, amphithéâtre, conférence) : les rangées d’un même
 * ensemble se règlent ensemble dans l’éditeur.
 *
 * - trouver les rangées du bloc (même groupe, ou même point de visée) ;
 * - les ordonner du premier rang (près de l’écran / de la scène) au dernier ;
 * - régler l’écart réel entre rangs (en mètres), dos à dos ;
 * - ajouter un rang devant ou derrière (même pas, même contremarche, même progression de fauteuils) ;
 * - renommer A, B, C… (en sautant I et O comme dans la plupart des salles) ;
 * - ranger les rangées en colonne propre (au lieu d’un quadrillage de tables).
 *
 * Module pur, testé avec `node --test`.
 */
import { clampRowSeatCount } from './roomAmphitheaterGeom.ts';

/** Ce dont le module a besoin d’une rangée du plan. */
export interface BlockRow {
  id: string;
  kind: 'row';
  label: string;
  seatCount: number;
  x: number;
  y: number;
  rotation?: number;
  curve?: number;
  elevationM?: number;
  rowName?: string;
  focusX?: number;
  focusY?: number;
  groupId?: string;
  storyId?: string;
  amphitheaterStyle?: string;
}

type FixtureLike = { kind: string; x: number; y: number; w: number; h: number };
type AnyItem = { kind: string; id: string };

/** Écart dos à dos par défaut (m) : 1,15 m en gradins de cinéma, 0,95 m ailleurs. */
export function defaultRowPitchM(row: Pick<BlockRow, 'amphitheaterStyle'>): number {
  return row.amphitheaterStyle === 'cinemaStadium' ? 1.15 : 0.95;
}

export const ROW_PITCH_MIN_M = 0.8;
export const ROW_PITCH_MAX_M = 2.5;
/** Distance minimale entre le premier rang et l’écran / la scène. */
const FRONT_ROW_MIN_DISTANCE_M = 1.5;

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

function isRow(item: AnyItem): item is AnyItem & BlockRow {
  return item.kind === 'row';
}

const sameFocus = (a: BlockRow, b: BlockRow) =>
  a.focusX != null && a.focusY != null
  && Math.abs((a.focusX ?? 0) - (b.focusX ?? 0)) < 0.01
  && Math.abs((a.focusY ?? 0) - (b.focusY ?? 0)) < 0.01;

/**
 * Rangées du même bloc que `rowId` : même groupe ; sans groupe, même point de visée
 * (les modèles de salle n’ont pas toujours de groupe) ; sinon la rangée seule.
 */
export function rowBlockRows<T extends AnyItem>(furniture: readonly T[], rowId: string): Array<T & BlockRow> {
  const rows = furniture.filter(isRow) as Array<T & BlockRow>;
  const seed = rows.find((r) => r.id === rowId);
  if (!seed) return [];
  const sameStory = (r: BlockRow) => (r.storyId ?? '') === (seed.storyId ?? '');
  if (seed.groupId) return rows.filter((r) => r.groupId === seed.groupId);
  if (seed.focusX != null && seed.focusY != null) {
    return rows.filter((r) => !r.groupId && sameStory(r) && sameFocus(r, seed));
  }
  return [seed];
}

/** Point regardé par le bloc (% du plan) : foyer enregistré, sinon scène / écran, sinon devant le premier rang. */
export function rowBlockFocus(rows: readonly BlockRow[], fixtures: readonly FixtureLike[] | null | undefined): [number, number] {
  const withFocus = rows.find((r) => r.focusX != null && r.focusY != null);
  if (withFocus) return [withFocus.focusX as number, withFocus.focusY as number];
  const target = (fixtures ?? []).find((f) => f.kind === 'stage' || f.kind === 'podium')
    ?? (fixtures ?? []).find((f) => f.kind === 'screen');
  if (target) return [target.x + target.w / 2, target.y + target.h / 2];
  const front = rows.reduce<BlockRow | null>((best, r) => (!best || r.y < best.y ? r : best), null);
  return front ? [front.x, Math.max(2, front.y - 25)] : [50, 5];
}

interface RowGeom {
  /** Distance au foyer (m). */
  dist: number;
  /** Direction foyer → rangée (unitaire, m). */
  ux: number;
  uy: number;
}

function rowGeom(row: BlockRow, focus: [number, number], W: number, H: number): RowGeom {
  const dx = ((row.x - focus[0]) / 100) * W;
  const dy = ((row.y - focus[1]) / 100) * H;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return { dist: 0, ux: 0, uy: 1 };
  return { dist, ux: dx / dist, uy: dy / dist };
}

/** Rangées du premier rang (le plus proche de l’écran) au dernier. */
export function orderRowsFrontToBack<T extends BlockRow>(rows: readonly T[], focus: [number, number], W: number, H: number): T[] {
  return [...rows].sort((a, b) => rowGeom(a, focus, W, H).dist - rowGeom(b, focus, W, H).dist);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface RowBlockStats {
  rows: number;
  seats: number;
  /** Écart dos à dos courant (m), médiane des écarts du bloc. */
  pitchM: number;
  /** Contremarche courante (m) : différence d’élévation d’un rang au suivant. */
  riseM: number;
  /** Fauteuils ajoutés d’un rang au suivant (0 en cinéma, +2 en éventail…). */
  seatGrowth: number;
  /** Rangées qui ont toutes le même nombre de fauteuils. */
  uniformSeats: boolean;
}

/** Résumé d’un bloc déjà ordonné de l’avant vers l’arrière. */
export function rowBlockStats(ordered: readonly BlockRow[], focus: [number, number], W: number, H: number): RowBlockStats {
  const dists = ordered.map((r) => rowGeom(r, focus, W, H).dist);
  const gaps = dists.slice(1).map((d, i) => d - dists[i]).filter((g) => g > 0.05);
  const rises = ordered.slice(1).map((r, i) => (r.elevationM ?? 0) - (ordered[i].elevationM ?? 0));
  const growth = ordered.slice(1).map((r, i) => r.seatCount - ordered[i].seatCount);
  return {
    rows: ordered.length,
    seats: ordered.reduce((n, r) => n + (r.seatCount || 0), 0),
    pitchM: gaps.length ? round2(median(gaps)) : defaultRowPitchM(ordered[0] ?? {}),
    riseM: rises.length ? round2(Math.max(0, median(rises))) : 0,
    seatGrowth: growth.length ? Math.round(median(growth)) : 0,
    uniformSeats: ordered.every((r) => r.seatCount === ordered[0]?.seatCount),
  };
}

const inPlan = (x: number, y: number) => x >= 1 && x <= 99 && y >= 1 && y <= 99;

/**
 * Nouvelles positions pour un écart dos à dos de `pitchM` : le premier rang ne bouge pas,
 * chaque rang suivant recule dans sa propre direction depuis le foyer (les éventails restent concentriques).
 * Renvoie `null` si le dernier rang sortirait de la salle.
 */
export function respaceRowBlock(
  ordered: readonly BlockRow[],
  focus: [number, number],
  W: number,
  H: number,
  pitchM: number,
): Map<string, { x: number; y: number }> | null {
  const pitch = Math.min(ROW_PITCH_MAX_M, Math.max(ROW_PITCH_MIN_M, pitchM));
  if (ordered.length === 0) return new Map();
  const base = rowGeom(ordered[0], focus, W, H).dist;
  const out = new Map<string, { x: number; y: number }>();
  for (let i = 0; i < ordered.length; i += 1) {
    const row = ordered[i];
    const g = rowGeom(row, focus, W, H);
    if (i === 0) {
      out.set(row.id, { x: row.x, y: row.y });
      continue;
    }
    const d = base + i * pitch;
    const x = round2(focus[0] + ((g.ux * d) / W) * 100);
    const y = round2(focus[1] + ((g.uy * d) / H) * 100);
    if (!inPlan(x, y)) return null;
    out.set(row.id, { x, y });
  }
  return out;
}

/** Lettres de rang : A, B, C… Z, puis AA, AB… ; I et O sautés au besoin (confusion avec 1 et 0). */
export function rowLetter(index: number, skipIO = true): string {
  const alphabet = skipIO ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const n = alphabet.length;
  let i = Math.max(0, Math.floor(index));
  let out = '';
  do {
    out = alphabet[i % n] + out;
    i = Math.floor(i / n) - 1;
  } while (i >= 0);
  return out;
}

/** Rang de départ d’une lettre (« C » → 2), ou -1. */
export function rowLetterIndex(letter: string, skipIO = true): number {
  const target = letter.trim().toUpperCase();
  if (!/^[A-Z]{1,2}$/.test(target)) return -1;
  for (let i = 0; i < 24 * 25 + 26; i += 1) if (rowLetter(i, skipIO) === target) return i;
  return -1;
}

export type RowNumbering = 'letters' | 'numbers';

/** Noms de rangs du premier au dernier : « Rang A », « Rang B »… ou « Rang 1 », « Rang 2 »… */
export function relabelRowBlock(
  ordered: readonly BlockRow[],
  opts: { numbering?: RowNumbering; start?: string; skipIO?: boolean } = {},
): Map<string, { rowName: string; label: string }> {
  const numbering = opts.numbering ?? 'letters';
  const skipIO = opts.skipIO ?? true;
  const out = new Map<string, { rowName: string; label: string }>();
  const startNum = Math.max(1, parseInt(opts.start ?? '1', 10) || 1);
  const startLetter = Math.max(0, rowLetterIndex(opts.start ?? 'A', skipIO));
  ordered.forEach((row, i) => {
    const code = numbering === 'numbers' ? String(startNum + i) : rowLetter(startLetter + i, skipIO);
    out.set(row.id, { rowName: `Rang ${code}`, label: `Rangée ${code}` });
  });
  return out;
}

/** Le bloc suit-il une numérotation automatique (« Rang A », « Rang B »…) qu’on peut prolonger ? */
export function rowBlockAutoNumbering(ordered: readonly BlockRow[]): { numbering: RowNumbering; start: string; skipIO: boolean } | null {
  const codes = ordered.map((r) => /^(?:rang(?:ée|ee)?)\s+([A-Z]{1,2}|\d{1,3})$/i.exec((r.rowName || r.label || '').trim())?.[1]?.toUpperCase());
  if (codes.length === 0 || codes.some((c) => !c)) return null;
  if (codes.every((c) => /^\d+$/.test(c as string))) return { numbering: 'numbers', start: codes[0] as string, skipIO: true };
  const usesIO = codes.some((c) => /[IO]/.test(c as string));
  return { numbering: 'letters', start: codes[0] as string, skipIO: !usesIO };
}

/**
 * Nouveau rang à ajouter devant ou derrière le bloc : il prend le pas, la contremarche
 * et la progression de fauteuils du bloc. `null` s’il ne tient pas dans la salle.
 */
export function rowForBlockEdge<T extends BlockRow>(
  ordered: readonly T[],
  where: 'front' | 'back',
  focus: [number, number],
  W: number,
  H: number,
): Omit<T, 'id'> | null {
  if (ordered.length === 0) return null;
  const stats = rowBlockStats(ordered, focus, W, H);
  const edge = where === 'back' ? ordered[ordered.length - 1] : ordered[0];
  const g = rowGeom(edge, focus, W, H);
  const d = where === 'back' ? g.dist + stats.pitchM : g.dist - stats.pitchM;
  if (where === 'front' && d < FRONT_ROW_MIN_DISTANCE_M) return null;
  const x = round2(focus[0] + ((g.ux * d) / W) * 100);
  const y = round2(focus[1] + ((g.uy * d) / H) * 100);
  if (!inPlan(x, y)) return null;
  const sign = where === 'back' ? 1 : -1;
  const elevation = Math.max(0, round2((edge.elevationM ?? 0) + sign * stats.riseM));
  const { id: _id, ...rest } = edge;
  void _id;
  return {
    ...rest,
    x,
    y,
    seatCount: clampRowSeatCount(edge.seatCount + sign * stats.seatGrowth),
    ...(edge.elevationM != null || elevation > 0 ? { elevationM: elevation } : {}),
  } as Omit<T, 'id'>;
}

/**
 * Rangées en colonne propre : centrées sur le même axe, du premier au dernier rang,
 * à écart régulier. Remplace le « rangement en grille » des tables, qui éparpillait
 * les rangs d’une salle de cinéma sur plusieurs colonnes.
 */
export function tidyRowsColumn(rows: readonly BlockRow[]): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  if (rows.length === 0) return out;
  const sorted = [...rows].sort((a, b) => a.y - b.y);
  const axisX = round1(median(sorted.map((r) => r.x)));
  const top = sorted[0].y;
  const bottom = sorted[sorted.length - 1].y;
  const step = sorted.length > 1 ? (bottom - top) / (sorted.length - 1) : 0;
  sorted.forEach((r, i) => out.set(r.id, { x: axisX, y: round1(top + i * step) }));
  return out;
}

/**
 * Découverte des salles en gradins (amphithéâtre, cinéma, auditorium) : où poser la caméra
 * pour voir la salle comme le public, depuis le haut des gradins ou depuis le milieu des rangs.
 * Fonctions pures (sans Three.js) pour être testées.
 */
import type { RoomLayoutBlueprint } from './roomLayoutUtils.ts';

type Vec3 = [number, number, number];

export interface AudienceViewPose {
  pos: Vec3;
  target: Vec3;
}

interface RowLike {
  kind: string;
  x: number;
  y: number;
  elevationM?: number;
  focusX?: number;
  focusY?: number;
}

interface FixtureLike {
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  screenKind?: string;
  screenRatio?: string;
  screenElevationM?: number;
  heightM?: number;
}

const RATIO: Record<string, number> = { '16:9': 16 / 9, '21:9': 2.39, '32:9': 32 / 9, '9:16': 1.85, '1.43:1': 1.43 };

/** Grands écrans regardés par toute la salle (même liste que `isAudienceScreenKind`). */
const AUDIENCE_SCREENS = new Set(['stageLedWall', 'cinemaScreen', 'ledCurvedWall', 'videoWall', 'motorizedScreen', 'inflatableScreen']);

function roomSize(bp: RoomLayoutBlueprint): { w: number; d: number } {
  const w = Number.isFinite(bp.canvas?.widthM) && (bp.canvas?.widthM ?? 0) > 0 ? bp.canvas.widthM : 20;
  const d = Number.isFinite(bp.canvas?.heightM) && (bp.canvas?.heightM ?? 0) > 0 ? bp.canvas.heightM : 16;
  return { w, d };
}

function rowsOf(bp: RoomLayoutBlueprint): RowLike[] {
  return ((bp.furniture ?? []) as unknown as RowLike[]).filter((f) => f.kind === 'row');
}

/** Salle en gradins : un amphithéâtre, ou au moins trois rangées dont le haut est surélevé. */
export function isTieredRoom(bp: RoomLayoutBlueprint): boolean {
  const rows = rowsOf(bp);
  if (rows.length < 3) return false;
  if (bp.roomType === 'AMPHITHEATER') return true;
  return Math.max(...rows.map((r) => r.elevationM ?? 0)) >= 0.45;
}

/** Ce que regarde le public (m, repère monde) : écran, scène, sinon le point vers lequel les rangs sont tournés. */
export function audienceFocus(bp: RoomLayoutBlueprint): { x: number; z: number; y: number } | null {
  const { w, d } = roomSize(bp);
  const toWorld = (xPct: number, yPct: number) => ({ x: (xPct / 100 - 0.5) * w, z: (yPct / 100 - 0.5) * d });
  const fixtures = (bp.fixtures ?? []) as unknown as FixtureLike[];
  const screen = fixtures.find((f) => f.kind === 'screen' && f.screenKind === 'cinemaScreen')
    ?? fixtures.find((f) => f.kind === 'screen' && (!f.screenKind || AUDIENCE_SCREENS.has(f.screenKind)))
    ?? fixtures.find((f) => f.kind === 'screen');
  if (screen) {
    const c = toWorld(screen.x + screen.w / 2, screen.y + screen.h / 2);
    const sw = Math.max(3, (screen.w / 100) * w);
    if (screen.screenKind === 'cinemaScreen') {
      const sh = sw / (RATIO[screen.screenRatio ?? '21:9'] ?? 2.39);
      return { ...c, y: Math.max(0.6, screen.screenElevationM ?? 1.2) + sh / 2 };
    }
    return { ...c, y: Math.max(1.2, (screen.heightM ?? 2.4) * 0.55) };
  }
  const stage = fixtures.find((f) => f.kind === 'stage' || f.kind === 'podium');
  if (stage) return { ...toWorld(stage.x + stage.w / 2, stage.y + stage.h / 2), y: 1.5 };
  const rows = rowsOf(bp).filter((r) => Number.isFinite(r.focusX) && Number.isFinite(r.focusY));
  if (rows.length > 0) {
    const fx = rows.reduce((s, r) => s + (r.focusX as number), 0) / rows.length;
    const fy = rows.reduce((s, r) => s + (r.focusY as number), 0) / rows.length;
    return { ...toWorld(fx, fy), y: 1.5 };
  }
  return null;
}

/**
 * Point de vue du public : `top` debout derrière le dernier rang (on embrasse tous les gradins
 * et l'écran), `middle` assis au milieu des rangs (la vue d'un spectateur).
 */
export function audienceViewPose(
  bp: RoomLayoutBlueprint,
  spot: 'top' | 'middle' = 'top',
  opts: { ceilingM?: number | null } = {},
): AudienceViewPose | null {
  if (!isTieredRoom(bp)) return null;
  const focus = audienceFocus(bp);
  if (!focus) return null;
  const { w, d } = roomSize(bp);
  const rows = rowsOf(bp)
    .map((r) => ({
      x: (r.x / 100 - 0.5) * w,
      z: (r.y / 100 - 0.5) * d,
      elev: r.elevationM ?? 0,
    }))
    .map((r) => ({ ...r, dist: Math.hypot(r.x - focus.x, r.z - focus.z) }))
    .sort((a, b) => a.dist - b.dist);
  if (rows.length === 0) return null;
  const ceiling = opts.ceilingM != null && Number.isFinite(opts.ceilingM) && opts.ceilingM > 0 ? opts.ceilingM : null;
  // Sous un plafond bas, on ne garde que les rangs où une tête passe encore (assis + 35 cm de marge).
  const fitting = ceiling != null ? rows.filter((r) => r.elev + 1.1 + 0.35 <= ceiling) : rows;
  const pool = fitting.length > 0 ? fitting : rows;
  const row = spot === 'top' ? pool[pool.length - 1] : pool[Math.floor((pool.length - 1) * 0.55)];
  const dirX = row.dist > 1e-3 ? (row.x - focus.x) / row.dist : 0;
  const dirZ = row.dist > 1e-3 ? (row.z - focus.z) / row.dist : 1;
  // Derrière le dernier rang (dans l'allée haute) ou juste au-dessus d'un siège du milieu.
  const back = spot === 'top' ? 0.7 : 0.15;
  const eye = spot === 'top' ? 1.75 : 1.2;
  const margin = 0.5;
  const px = Math.max(-w / 2 + margin, Math.min(w / 2 - margin, row.x + dirX * back));
  const pz = Math.max(-d / 2 + margin, Math.min(d / 2 - margin, row.z + dirZ * back));
  let py = row.elev + eye;
  // Salle couverte : on reste sous le plafond (un auditorium à gradins hauts touche presque le faux plafond).
  if (ceiling != null) py = Math.max(row.elev + 1.1, Math.min(py, ceiling - 0.35));
  const dist = Math.hypot(px - focus.x, pz - focus.z);
  if (spot === 'middle') {
    return { pos: [px, py, pz], target: [focus.x, Math.max(focus.y, row.elev * 0.35 + 1.2), focus.z] };
  }
  // En haut des gradins, on baisse un peu le regard : l'écran (ou la scène) en haut du cadre,
  // les rangs en dessous, comme sur la vue d'un plan de salle de billetterie.
  const base = Math.atan2(py - focus.y, Math.max(1, dist));
  const pitch = Math.min(base + (6 * Math.PI) / 180, (16 * Math.PI) / 180);
  return { pos: [px, py, pz], target: [focus.x, py - Math.tan(pitch) * dist, focus.z] };
}

/**
 * Décor mural vu du dessus (plan 2D) : chaque image ou graffiti devient un liseré coloré
 * le long du mur, du côté où il est peint (salle ou extérieur), comme en 3D.
 */

import type { RoomWallSegment } from './roomLayoutUtils.ts';
import { wallArtFace, type RoomWallArt } from './roomWallArt.ts';

export interface WallArtPlanStrip {
  id: string;
  kind: RoomWallArt['kind'];
  face: 'inside' | 'outside';
  /** Extrémités du liseré, en mètres dans le repère du plan (x vers la droite, y vers le bas). */
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  label: string;
}

/**
 * Côté salle d'un mur, même règle que la 3D : +1 ou -1 selon que l'intérieur est
 * à gauche ou à droite du mur parcouru du début vers la fin.
 */
export function wallInnerSide(wall: Pick<RoomWallSegment, 'start' | 'end'>, widthM: number, heightM: number): 1 | -1 {
  const sx = ((wall.start.x / 100) - 0.5) * widthM;
  const sz = ((wall.start.y / 100) - 0.5) * heightM;
  const ex = ((wall.end.x / 100) - 0.5) * widthM;
  const ez = ((wall.end.y / 100) - 0.5) * heightM;
  const angle = Math.atan2(ez - sz, ex - sx);
  const midX = (sx + ex) / 2;
  const midZ = (sz + ez) / 2;
  return Math.sin(angle) * midX - Math.cos(angle) * midZ >= 0 ? 1 : -1;
}

function artColor(a: RoomWallArt): string {
  if (a.kind === 'graffiti') return a.fillColor ?? '#ff6b35';
  if (a.frame === 'gold') return '#c9a227';
  if (a.frame === 'thin' || a.frame === 'gallery') return '#1f2937';
  return '#94a3b8';
}

export function wallArtPlanStrips(walls: RoomWallSegment[], widthM: number, heightM: number): WallArtPlanStrip[] {
  const out: WallArtPlanStrip[] = [];
  for (const wall of walls) {
    const art = wall.art ?? [];
    if (!art.length) continue;
    const sx = (wall.start.x / 100) * widthM;
    const sy = (wall.start.y / 100) * heightM;
    const ex = (wall.end.x / 100) * widthM;
    const ey = (wall.end.y / 100) * heightM;
    const len = Math.hypot(ex - sx, ey - sy);
    if (len < 0.05) continue;
    const ux = (ex - sx) / len;
    const uy = (ey - sy) / len;
    const angle = Math.atan2(uy, ux);
    const inSide = wallInnerSide(wall, widthM, heightM);
    // Normale côté salle (voir le repère du mur en 3D : rotation de -angle autour de la verticale).
    const nx = -Math.sin(angle) * inSide;
    const ny = Math.cos(angle) * inSide;
    const half = (wall.thicknessM ?? 0.2) / 2 + 0.07;
    for (const a of art) {
      const face = wallArtFace(a);
      const k = face === 'inside' ? half : -half;
      const c = a.t * len;
      const h = Math.min(len / 2, a.widthM / 2);
      out.push({
        id: a.id,
        kind: a.kind,
        face,
        x1: sx + ux * (c - h) + nx * k,
        y1: sy + uy * (c - h) + ny * k,
        x2: sx + ux * (c + h) + nx * k,
        y2: sy + uy * (c + h) + ny * k,
        color: artColor(a),
        label: a.kind === 'graffiti' ? `Graffiti « ${a.text ?? ''} »` : 'Image',
      });
    }
  }
  return out;
}

/**
 * Distance de projection d’un grand écran : de la toile jusqu’au mur qui lui fait face
 * (là où se trouve la cabine de projection). Calculée dans le rectangle englobant du
 * contour de la salle. Module pur, sans Three.js.
 */

export interface ScreenThrowInput {
  /** Centre de l’écran et rotation (°), comme sur le plan (x, y en % du canevas). */
  cxPct: number;
  cyPct: number;
  rotationDeg: number;
  /** Rectangle englobant du contour de la salle, en % du canevas. */
  outline: { x: number; y: number; w: number; h: number };
  widthM: number;
  depthM: number;
}

/**
 * Longueur (m) du rayon qui part de l’écran vers le public (+Z local, tourné de `rotationDeg`)
 * jusqu’au mur opposé. `null` si l’écran est hors de la salle.
 */
export function screenThrowM({ cxPct, cyPct, rotationDeg, outline, widthM, depthM }: ScreenThrowInput): number | null {
  const toX = (pct: number) => (pct / 100 - 0.5) * widthM;
  const toZ = (pct: number) => (pct / 100 - 0.5) * depthM;
  const x0 = toX(outline.x);
  const x1 = toX(outline.x + outline.w);
  const z0 = toZ(outline.y);
  const z1 = toZ(outline.y + outline.h);
  const px = toX(cxPct);
  const pz = toZ(cyPct);
  if (px < x0 - 0.01 || px > x1 + 0.01 || pz < z0 - 0.01 || pz > z1 + 0.01) return null;
  const r = (rotationDeg * Math.PI) / 180;
  const dx = Math.sin(r);
  const dz = Math.cos(r);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (x1 - px) / dx);
  if (dx < -1e-6) t = Math.min(t, (x0 - px) / dx);
  if (dz > 1e-6) t = Math.min(t, (z1 - pz) / dz);
  if (dz < -1e-6) t = Math.min(t, (z0 - pz) / dz);
  return Number.isFinite(t) && t > 0 ? t : null;
}

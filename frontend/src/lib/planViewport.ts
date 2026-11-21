/** Géométrie des plans 2D affichés à l’échelle dans un cadre (plan invité, réservation de places). */

export type PlanZoomLimits = { min: number; max: number };

export function clampPlanZoom(zoom: number, limits: PlanZoomLimits): number {
  if (!Number.isFinite(zoom)) return limits.min;
  return Math.max(limits.min, Math.min(limits.max, zoom));
}

/** Zoom qui fait tenir toute la salle dans le cadre, marges comprises, sans jamais dépasser 1. */
export function planFitZoom(
  boxW: number,
  boxH: number,
  logicalW: number,
  logicalH: number,
  padding: number,
  limits: PlanZoomLimits,
): number {
  if (boxW <= 0 || boxH <= 0 || logicalW <= 0 || logicalH <= 0) return clampPlanZoom(1, limits);
  const w = Math.max(1, boxW - padding * 2);
  const h = Math.max(1, boxH - padding * 2);
  return clampPlanZoom(Math.min(w / logicalW, h / logicalH, 1), limits);
}

/** Position du plan dans le cadre : centré quand il est plus petit, sinon collé à la marge. */
export function planStageOffset(
  boxW: number,
  boxH: number,
  scaledW: number,
  scaledH: number,
  padding: number,
): { x: number; y: number } {
  return {
    x: Math.max(padding, (boxW - scaledW) / 2),
    y: Math.max(padding, (boxH - scaledH) / 2),
  };
}

/** Hauteur d’un cadre de plan qui épouse la forme de la salle au lieu d’un grand vide. */
export function planFrameHeight(
  boxW: number,
  logicalW: number,
  logicalH: number,
  opts: { min: number; max: number; padding: number },
): number {
  if (boxW <= 0 || logicalW <= 0) return opts.max;
  const natural = (boxW - opts.padding * 2) * (logicalH / logicalW) + opts.padding * 2;
  return Math.round(Math.max(opts.min, Math.min(opts.max, natural)));
}

/**
 * Agrandissement des tables quand la salle est vue de loin : leurs noms restent lisibles
 * sur un téléphone, sans que deux tables voisines se chevauchent.
 */
export function planMarkerBoost(
  zoom: number,
  points: Array<{ x: number; y: number }>,
  footprint: number,
  opts: { readableZoom?: number; max?: number } = {},
): number {
  const readable = opts.readableZoom ?? 0.6;
  const wanted = Math.min(opts.max ?? 1.8, readable / Math.max(zoom, 0.01));
  if (wanted <= 1) return 1;
  let minGap = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      minGap = Math.min(minGap, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  const room = Number.isFinite(minGap) && footprint > 0 ? minGap / footprint : wanted;
  return Math.max(1, Math.min(wanted, room));
}

/** Taille logique d’un plan à partir des dimensions réelles de la salle (largeur fixe). */
export function planLogicalSize(widthM: number | undefined, heightM: number | undefined, logicalW = 1000) {
  const w = widthM && widthM > 0 ? widthM : 20;
  const h = heightM && heightM > 0 ? heightM : 16;
  const ratio = Math.max(0.35, Math.min(2.2, h / w));
  return { w: logicalW, h: Math.round(logicalW * ratio) };
}

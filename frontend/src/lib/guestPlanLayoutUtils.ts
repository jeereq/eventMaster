/** Utilitaires d'affichage du plan invité — anti-chevauchement et mise à l'échelle */

export const GUEST_PLAN_LOGICAL_W = 1000;
export const GUEST_PLAN_LOGICAL_H = 720;

export interface PlanTablePoint {
  id: string;
  x: number;
  y: number;
}

/** Résout les chevauchements par séparation itérative (positions d'affichage uniquement) */
export function resolveGuestTablePositions(
  tables: PlanTablePoint[],
  minDistancePct = 12,
  iterations = 24,
): Map<string, { x: number; y: number }> {
  const positions = new Map(tables.map((t) => [t.id, { x: t.x, y: t.y }]));

  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const a = positions.get(tables[i].id)!;
        const b = positions.get(tables[j].id)!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;

        if (dist < minDistancePct) {
          const push = (minDistancePct - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          a.x = clampPct(a.x - nx * push);
          a.y = clampPct(a.y - ny * push);
          b.x = clampPct(b.x + nx * push);
          b.y = clampPct(b.y + ny * push);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return positions;
}

function clampPct(v: number) {
  return Math.max(4, Math.min(96, v));
}

export function computeFitZoom(
  containerWidth: number,
  containerHeight: number,
  logicalW = GUEST_PLAN_LOGICAL_W,
  logicalH = GUEST_PLAN_LOGICAL_H,
  padding = 16,
): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  const w = containerWidth - padding * 2;
  const h = containerHeight - padding * 2;
  return Math.min(w / logicalW, h / logicalH, 1.2);
}

export function getGuestTableMarkerSize(tableCount: number): number {
  if (tableCount <= 6) return 52;
  if (tableCount <= 12) return 44;
  if (tableCount <= 20) return 38;
  return 32;
}

export function pctToLogical(xPct: number, yPct: number) {
  return {
    x: (xPct / 100) * GUEST_PLAN_LOGICAL_W,
    y: (yPct / 100) * GUEST_PLAN_LOGICAL_H,
  };
}

export function logicalSizeFromPct(wPct: number, hPct: number) {
  return {
    w: (wPct / 100) * GUEST_PLAN_LOGICAL_W,
    h: (hPct / 100) * GUEST_PLAN_LOGICAL_H,
  };
}

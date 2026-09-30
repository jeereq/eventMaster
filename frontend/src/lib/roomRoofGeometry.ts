/**
 * Emprise des toitures 3D : découpe du contour de la salle en volumes couvrables.
 *
 * - Contour orthogonal (rectangle, L, T, U, croix…) → rectangles juxtaposés, chacun reçoit
 *   son propre faîtage (comme des tentes ou des corps de bâtiment accolés).
 * - Contour convexe (cercle, octogone, hexagone…) → toiture rayonnante depuis le centre
 *   (chapiteau, pavillon, coupole).
 *
 * Coordonnées « monde » en mètres : x vers la droite, z vers le bas du plan.
 */

export type RoofPoint = { x: number; z: number };
export type RoofRect = { cx: number; cz: number; w: number; d: number };
export type RoofFootprint =
  | { kind: 'rects'; rects: RoofRect[] }
  | { kind: 'radial'; center: RoofPoint; ring: RoofPoint[] };

const EPS = 1e-3;

function isRectilinear(pts: RoofPoint[]): boolean {
  if (pts.length < 4) return false;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (Math.abs(a.x - b.x) > EPS && Math.abs(a.z - b.z) > EPS) return false;
  }
  return true;
}

function pointInPolygon(x: number, z: number, pts: RoofPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i, i += 1) {
    const a = pts[i];
    const b = pts[j];
    if ((a.z > z) !== (b.z > z) && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

/** Aire signée (formule du lacet). */
export function polygonArea(pts: RoofPoint[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    s += a.x * b.z - b.x * a.z;
  }
  return s / 2;
}

export function polygonCentroid(pts: RoofPoint[]): RoofPoint {
  const area = polygonArea(pts);
  if (Math.abs(area) < EPS) {
    const n = Math.max(1, pts.length);
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, z: pts.reduce((s, p) => s + p.z, 0) / n };
  }
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const k = a.x * b.z - b.x * a.z;
    cx += (a.x + b.x) * k;
    cz += (a.z + b.z) * k;
  }
  return { x: cx / (6 * area), z: cz / (6 * area) };
}

/**
 * Découpe un polygone orthogonal en bandes verticales, puis fusionne les bandes voisines
 * de même étendue : un L donne 2 rectangles, un T ou un U en donne 3.
 */
export function rectilinearToRects(pts: RoofPoint[]): RoofRect[] {
  const xs = [...new Set(pts.map((p) => Math.round(p.x * 1000) / 1000))].sort((a, b) => a - b);
  const zs = [...new Set(pts.map((p) => Math.round(p.z * 1000) / 1000))].sort((a, b) => a - b);
  type Slab = { x0: number; x1: number; spans: Array<[number, number]> };
  const slabs: Slab[] = [];
  for (let i = 0; i < xs.length - 1; i += 1) {
    const x0 = xs[i];
    const x1 = xs[i + 1];
    if (x1 - x0 < EPS) continue;
    const mx = (x0 + x1) / 2;
    const spans: Array<[number, number]> = [];
    let open: number | null = null;
    for (let j = 0; j < zs.length - 1; j += 1) {
      const inside = pointInPolygon(mx, (zs[j] + zs[j + 1]) / 2, pts);
      if (inside && open === null) open = zs[j];
      if (!inside && open !== null) {
        spans.push([open, zs[j]]);
        open = null;
      }
    }
    if (open !== null) spans.push([open, zs[zs.length - 1]]);
    slabs.push({ x0, x1, spans });
  }
  const rects: RoofRect[] = [];
  let pending: Array<{ x0: number; x1: number; z0: number; z1: number }> = [];
  for (const slab of slabs) {
    const next: typeof pending = [];
    for (const [z0, z1] of slab.spans) {
      const prev = pending.find((p) => Math.abs(p.z0 - z0) < EPS && Math.abs(p.z1 - z1) < EPS && Math.abs(p.x1 - slab.x0) < EPS);
      if (prev) {
        prev.x1 = slab.x1;
        next.push(prev);
      } else {
        next.push({ x0: slab.x0, x1: slab.x1, z0, z1 });
      }
    }
    for (const p of pending) {
      if (!next.includes(p)) rects.push({ cx: (p.x0 + p.x1) / 2, cz: (p.z0 + p.z1) / 2, w: p.x1 - p.x0, d: p.z1 - p.z0 });
    }
    pending = next;
  }
  for (const p of pending) rects.push({ cx: (p.x0 + p.x1) / 2, cz: (p.z0 + p.z1) / 2, w: p.x1 - p.x0, d: p.z1 - p.z0 });
  return rects.filter((r) => r.w > 0.2 && r.d > 0.2);
}

export function roofFootprint(pts: RoofPoint[]): RoofFootprint {
  if (isRectilinear(pts)) {
    const rects = rectilinearToRects(pts);
    if (rects.length) return { kind: 'rects', rects };
  }
  // Anneau orienté dans le sens trigonométrique pour des normales cohérentes.
  const ring = polygonArea(pts) < 0 ? [...pts].reverse() : [...pts];
  return { kind: 'radial', center: polygonCentroid(ring), ring };
}

/** Faîtage le long du grand côté : longueur, portée et angle de rotation autour de Y. */
export function ridgeFrame(rect: RoofRect): { length: number; span: number; rotationY: number } {
  return rect.w >= rect.d
    ? { length: rect.w, span: rect.d, rotationY: 0 }
    : { length: rect.d, span: rect.w, rotationY: Math.PI / 2 };
}

/** Trame de portiques (≈ 5 m entre fermes, comme les structures de tente louées). */
export function frameBays(length: number, target = 5): number {
  return Math.max(1, Math.round(length / target));
}

/** Hauteur de faîtage pour une pente donnée (degrés) sur une demi-portée. */
export function ridgeRise(span: number, pitchDeg: number): number {
  return (span / 2) * Math.tan((pitchDeg * Math.PI) / 180);
}

/**
 * Décale un contour fermé de `d` m vers l’intérieur (d > 0) avec des angles en onglet
 * (acrotère, bande de rive). L’orientation du contour est détectée automatiquement.
 */
export function offsetRing(pts: RoofPoint[], d: number): RoofPoint[] {
  const n = pts.length;
  if (n < 3) return pts;
  const sign = polygonArea(pts) > 0 ? 1 : -1;
  return pts.map((p, i) => {
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];
    const e1 = { x: p.x - prev.x, z: p.z - prev.z };
    const e2 = { x: next.x - p.x, z: next.z - p.z };
    const l1 = Math.hypot(e1.x, e1.z) || 1;
    const l2 = Math.hypot(e2.x, e2.z) || 1;
    // Normale intérieure de chaque arête (à gauche pour un contour trigonométrique).
    const n1 = { x: (-e1.z / l1) * sign, z: (e1.x / l1) * sign };
    const n2 = { x: (-e2.z / l2) * sign, z: (e2.x / l2) * sign };
    const bx = n1.x + n2.x;
    const bz = n1.z + n2.z;
    const bl = Math.hypot(bx, bz);
    if (bl < 1e-6) return { x: p.x + n1.x * d, z: p.z + n1.z * d };
    const cos = (n1.x * bx + n1.z * bz) / bl;
    const k = d / Math.max(0.25, cos);
    return { x: p.x + (bx / bl) * k, z: p.z + (bz / bl) * k };
  });
}

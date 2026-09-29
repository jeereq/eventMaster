/**
 * Éléments personnalisés de l’éditeur de salle, créés à partir d’une image ou d’une vidéo.
 *
 * - `cutout`   : découpe 3D — la silhouette détourée est extrudée (épaisseur réelle), l’image sur les faces.
 * - `panel`    : panneau / kakémono imprimé sur un pied.
 * - `box`      : bloc (meuble, comptoir, caisse) avec l’image en façade.
 * - `cylinder` : volume rond (colonne, gâteau, fût) habillé de l’image.
 * - `video`    : écran qui diffuse la vidéo en boucle.
 *
 * Les fonctions de traitement d’image (détourage, contour) sont pures et testables hors navigateur :
 * elles travaillent sur des tableaux RGBA.
 */

export type CustomElementMode = 'cutout' | 'panel' | 'box' | 'cylinder' | 'video';

export type CustomElementDefinition = {
  /** Identifiant de bibliothèque (cloud ou local). */
  id?: string;
  name: string;
  mode: CustomElementMode;
  /** Image (détourée si possible, PNG avec transparence). */
  imageUrl: string;
  /** Vidéo diffusée (mode `video`). */
  videoUrl?: string;
  /** Silhouette normalisée [x0, y0, x1, y1, …] dans l’image (0 → 1, y vers le bas). */
  outline?: number[];
  /** Rapport largeur / hauteur de l’image. */
  aspect: number;
  /** Dimensions réelles (m). */
  widthM: number;
  heightM: number;
  depthM: number;
  /** Hauteur du bas de l’élément au-dessus du sol (accroché au mur, suspendu). */
  elevationM?: number;
  /** Couleur des chants / côtés (moyenne de l’image par défaut). */
  edgeColor?: string;
};

export const CUSTOM_ELEMENT_MODE_META: Record<CustomElementMode, { label: string; hint: string; defaultDepthM: number }> = {
  cutout: { label: 'Découpe 3D', hint: 'La silhouette de l’objet, en volume, avec son épaisseur réelle.', defaultDepthM: 0.12 },
  panel: { label: 'Panneau sur pied', hint: 'Kakémono, photocall, affiche ou silhouette imprimée.', defaultDepthM: 0.04 },
  box: { label: 'Bloc', hint: 'Meuble, comptoir, caisse ou présentoir avec l’image en façade.', defaultDepthM: 0.6 },
  cylinder: { label: 'Volume rond', hint: 'Colonne, gâteau, fût ou totem habillé de l’image.', defaultDepthM: 0.6 },
  video: { label: 'Écran vidéo', hint: 'Un écran qui diffuse la vidéo en boucle, au sol ou au mur.', defaultDepthM: 0.08 },
};

export const CUSTOM_ELEMENT_MODES: CustomElementMode[] = ['cutout', 'panel', 'box', 'cylinder', 'video'];

const MAX_OUTLINE_POINTS = 240;

const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;

/** URL http(s) ou relative ; image intégrée (data URL) acceptée en secours quand l’envoi cloud est indisponible. */
const isHttpUrl = (v: unknown): v is string =>
  typeof v === 'string'
  && ((v.length < 1000 && /^(https?:\/\/|\/)/.test(v))
    || (v.length < 3_000_000 && /^data:image\/(png|jpeg|webp);base64,/.test(v)));

/** Valide et borne une définition venue du stockage ou du réseau. */
export function sanitizeCustomElement(raw: unknown): CustomElementDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const mode = CUSTOM_ELEMENT_MODES.includes(r.mode as CustomElementMode) ? (r.mode as CustomElementMode) : null;
  if (!mode || !isHttpUrl(r.imageUrl)) return null;
  if (mode === 'video' && !isHttpUrl(r.videoUrl)) return null;
  let outline: number[] | undefined;
  if (
    Array.isArray(r.outline)
    && r.outline.length >= 6
    && r.outline.length % 2 === 0
    && r.outline.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    outline = (r.outline as number[]).slice(0, MAX_OUTLINE_POINTS * 2).map((v) => Math.max(0, Math.min(1, v)));
  }
  const name = typeof r.name === 'string' && r.name.trim() ? r.name.trim().slice(0, 60) : 'Élément importé';
  return {
    ...(typeof r.id === 'string' ? { id: r.id } : {}),
    name,
    mode,
    imageUrl: r.imageUrl,
    ...(mode === 'video' ? { videoUrl: r.videoUrl as string } : {}),
    ...(outline ? { outline } : {}),
    aspect: num(r.aspect, 0.05, 20, 1),
    widthM: num(r.widthM, 0.05, 40, 1),
    heightM: num(r.heightM, 0.05, 20, 1),
    depthM: num(r.depthM, 0.005, 20, CUSTOM_ELEMENT_MODE_META[mode].defaultDepthM),
    ...(typeof r.elevationM === 'number' ? { elevationM: num(r.elevationM, 0, 15, 0) } : {}),
    ...(typeof r.edgeColor === 'string' && /^#[0-9a-f]{6}$/i.test(r.edgeColor) ? { edgeColor: r.edgeColor } : {}),
  };
}

/** Empreinte au sol (m) d’un élément : largeur × profondeur, rond pour les volumes cylindriques. */
export function customElementFootprintM(def: Pick<CustomElementDefinition, 'mode' | 'widthM' | 'depthM'>) {
  if (def.mode === 'cylinder') return { w: def.widthM, d: def.widthM };
  if (def.mode === 'panel') return { w: def.widthM, d: Math.max(def.depthM, Math.min(0.6, def.widthM * 0.35)) };
  return { w: def.widthM, d: Math.max(0.02, def.depthM) };
}

// ───────────────────────── traitement d’image (pur) ─────────────────────────

export type RgbaImage = { width: number; height: number; data: Uint8ClampedArray };

const colorDist = (d: Uint8ClampedArray, i: number, r: number, g: number, b: number) => {
  const dr = d[i] - r;
  const dg = d[i + 1] - g;
  const db = d[i + 2] - b;
  return Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
};

/** L’image a-t-elle déjà un fond transparent (PNG détouré) ? */
export function hasTransparency(img: RgbaImage): boolean {
  const { data } = img;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 16) if (data[i] < 200) transparent += 1;
  return transparent > data.length / 16 / 50;
}

/**
 * Retire le fond uni ou quasi uni d’une photo d’objet : remplissage depuis les bords
 * sur les pixels proches des couleurs de fond échantillonnées dans les coins et sur le pourtour.
 * `tolerance` 0 → 100. Modifie l’alpha en place et renvoie l’image.
 */
export function removeBackground(img: RgbaImage, tolerance = 28): RgbaImage {
  const { width: w, height: h, data } = img;
  // Couleurs de fond : moyennes de petits carrés aux 4 coins + milieu des bords.
  const samples: [number, number, number][] = [];
  const probe = (cx: number, cy: number) => {
    const s = Math.max(2, Math.round(Math.min(w, h) * 0.02));
    let r = 0; let g = 0; let b = 0; let n = 0;
    for (let y = Math.max(0, cy - s); y < Math.min(h, cy + s); y += 1) {
      for (let x = Math.max(0, cx - s); x < Math.min(w, cx + s); x += 1) {
        const i = (y * w + x) * 4;
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
      }
    }
    samples.push([r / n, g / n, b / n]);
  };
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1], [0, 0.5], [1, 0.5]] as const) {
    probe(Math.round(fx * (w - 1)), Math.round(fy * (h - 1)));
  }
  const thr = 6 + tolerance * 1.1;
  const isBg = (i: number) => samples.some(([r, g, b]) => colorDist(data, i, r, g, b) < thr);
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    const p = y * w + x;
    if (visited[p]) return;
    visited[p] = 1;
    if (isBg(p * 4)) stack.push(p);
  };
  for (let x = 0; x < w; x += 1) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y += 1) { push(0, y); push(w - 1, y); }
  const bg = new Uint8Array(w * h);
  while (stack.length) {
    const p = stack.pop()!;
    bg[p] = 1;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) push(x - 1, y);
    if (x < w - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < h - 1) push(x, y + 1);
  }
  // Bord adouci : pixels d’objet voisins du fond rendus semi-transparents (anti-crénelage).
  for (let p = 0; p < w * h; p += 1) {
    if (bg[p]) {
      data[p * 4 + 3] = 0;
      continue;
    }
    const x = p % w;
    const y = (p - x) / w;
    const edge = (x > 0 && bg[p - 1]) || (x < w - 1 && bg[p + 1]) || (y > 0 && bg[p - w]) || (y < h - 1 && bg[p + w]);
    if (edge) data[p * 4 + 3] = Math.min(data[p * 4 + 3], 170);
  }
  return img;
}

/** Cadre englobant des pixels visibles (alpha > seuil), ou null si l’image est vide. */
export function opaqueBounds(img: RgbaImage, alphaThreshold = 40) {
  const { width: w, height: h, data } = img;
  let minX = w; let minY = h; let maxX = -1; let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Couleur moyenne des pixels visibles (pour les chants de la découpe). */
export function averageOpaqueColor(img: RgbaImage): string {
  const { data } = img;
  let r = 0; let g = 0; let b = 0; let n = 0;
  for (let i = 0; i < data.length; i += 4 * 7) {
    if (data[i + 3] > 128) { r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1; }
  }
  if (!n) return '#8a8a8a';
  const hex = (v: number) => Math.round(v / n * 0.8).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/**
 * Contour extérieur de la plus grande forme visible (suivi de bord de Moore sur une grille réduite),
 * simplifié (Douglas-Peucker) et normalisé 0 → 1. Renvoie null si aucune forme exploitable.
 */
export function traceOutline(img: RgbaImage, opts: { grid?: number; alphaThreshold?: number; maxPoints?: number } = {}): number[] | null {
  const grid = opts.grid ?? 160;
  const thr = opts.alphaThreshold ?? 90;
  const maxPoints = opts.maxPoints ?? 120;
  const { width: W, height: H, data } = img;
  const scale = Math.max(W, H) / grid;
  const gw = Math.max(2, Math.round(W / scale));
  const gh = Math.max(2, Math.round(H / scale));
  // Grille binaire avec marge vide d’une case (le suivi de bord ne sort jamais de la grille).
  const cw = gw + 2;
  const ch = gh + 2;
  const cell = new Uint8Array(cw * ch);
  for (let y = 0; y < gh; y += 1) {
    for (let x = 0; x < gw; x += 1) {
      const sx = Math.min(W - 1, Math.floor((x + 0.5) * W / gw));
      const sy = Math.min(H - 1, Math.floor((y + 0.5) * H / gh));
      if (data[(sy * W + sx) * 4 + 3] > thr) cell[(y + 1) * cw + x + 1] = 1;
    }
  }
  // Plus grande composante connexe (les poussières de détourage sont ignorées).
  const label = new Int32Array(cw * ch);
  let best = -1; let bestSize = 0; let bestStart = -1; let next = 1;
  for (let p = 0; p < cell.length; p += 1) {
    if (!cell[p] || label[p]) continue;
    const id = next++;
    let size = 0;
    const stack = [p];
    label[p] = id;
    while (stack.length) {
      const q = stack.pop()!;
      size += 1;
      for (const n of [q - 1, q + 1, q - cw, q + cw]) {
        if (cell[n] && !label[n]) { label[n] = id; stack.push(n); }
      }
    }
    if (size > bestSize) { bestSize = size; best = id; bestStart = p; }
  }
  if (best < 0 || bestSize < 6) return null;
  // Suivi de Moore depuis le premier pixel (le plus en haut à gauche) de la composante.
  const inside = (p: number) => label[p] === best;
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]] as const;
  const start = bestStart;
  const pts: [number, number][] = [];
  let cur = start;
  let backDir = 4; // on arrive depuis la gauche
  for (let guard = 0; guard < cw * ch * 4; guard += 1) {
    const x = cur % cw;
    const y = (cur - x) / cw;
    pts.push([x, y]);
    let found = -1;
    for (let k = 1; k <= 8; k += 1) {
      const d = (backDir + k) % 8;
      const n = (y + dirs[d][1]) * cw + (x + dirs[d][0]);
      if (inside(n)) { found = d; cur = n; break; }
    }
    if (found < 0) break; // pixel isolé
    backDir = (found + 4) % 8;
    if (cur === start && pts.length > 2) break;
  }
  if (pts.length < 3) return null;
  let simplified = simplifyPolygon(pts, 0.6);
  let eps = 0.6;
  while (simplified.length > maxPoints && eps < 12) {
    eps *= 1.5;
    simplified = simplifyPolygon(pts, eps);
  }
  if (simplified.length < 3) return null;
  const out: number[] = [];
  for (const [x, y] of simplified) {
    out.push(Math.max(0, Math.min(1, (x - 1 + 0.5) / gw)), Math.max(0, Math.min(1, (y - 1 + 0.5) / gh)));
  }
  return out;
}

/** Douglas-Peucker sur un contour fermé. */
export function simplifyPolygon(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length <= 4) return points.slice();
  const rdp = (pts: [number, number][]): [number, number][] => {
    if (pts.length < 3) return pts;
    const [ax, ay] = pts[0];
    const [bx, by] = pts[pts.length - 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let maxD = 0; let idx = 0;
    for (let i = 1; i < pts.length - 1; i += 1) {
      const [px, py] = pts[i];
      const d = Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD <= epsilon) return [pts[0], pts[pts.length - 1]];
    const left = rdp(pts.slice(0, idx + 1));
    const right = rdp(pts.slice(idx));
    return [...left.slice(0, -1), ...right];
  };
  // Coupe le contour fermé au point le plus éloigné du départ pour garder les deux moitiés.
  let far = 0; let farD = 0;
  for (let i = 1; i < points.length; i += 1) {
    const d = Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]);
    if (d > farD) { farD = d; far = i; }
  }
  const a = rdp(points.slice(0, far + 1));
  const b = rdp([...points.slice(far), points[0]]);
  return [...a.slice(0, -1), ...b.slice(0, -1)];
}

/** Aire signée d’un contour normalisé (utile pour vérifier qu’il n’est pas dégénéré). */
export function outlineArea(flat: number[]): number {
  let a = 0;
  for (let i = 0; i < flat.length; i += 2) {
    const j = (i + 2) % flat.length;
    a += flat[i] * flat[j + 1] - flat[j] * flat[i + 1];
  }
  return a / 2;
}

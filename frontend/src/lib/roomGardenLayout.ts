/**
 * Espace vert réglable (style `garden` des aménagements extérieurs) : gazon,
 * bordure, fleurs, arbustes, arbres et chemin de pas japonais.
 *
 * Ce module calcule les positions (stables pour un même élément grâce à la
 * graine) ; le rendu 3D et le plan 2D les lisent tels quels. Origine au centre
 * de l’empreinte, X sur la largeur `w`, Z sur la profondeur `d`, en mètres.
 *
 * Module pur, testé avec `node --test`.
 */

import { seededRandom } from './roomOutdoorUtils.ts';

export type GardenLawn = 'english' | 'meadow' | 'dry' | 'synthetic';
export type GardenBorder = 'none' | 'hedge' | 'stone' | 'wood' | 'flowers';
export type GardenPath = 'none' | 'stones' | 'gravel';

export interface GardenOptions {
  lawn: GardenLawn;
  border: GardenBorder;
  path: GardenPath;
  /** 0–1 : densité des fleurs dans le gazon. */
  flowerDensity: number;
  /** Couleurs des fleurs (une ou plusieurs). */
  flowerColors: string[];
  shrubs: number;
  trees: number;
}

export const GARDEN_LAWN_LABELS: Record<GardenLawn, string> = {
  english: 'Gazon anglais tondu',
  meadow: 'Prairie haute',
  dry: 'Pelouse sèche d’été',
  synthetic: 'Gazon synthétique',
};

export const GARDEN_BORDER_LABELS: Record<GardenBorder, string> = {
  none: 'Sans bordure',
  hedge: 'Haie basse de buis',
  stone: 'Bordure en pierre',
  wood: 'Volige en bois',
  flowers: 'Plate-bande fleurie',
};

export const GARDEN_PATH_LABELS: Record<GardenPath, string> = {
  none: 'Sans chemin',
  stones: 'Pas japonais',
  gravel: 'Allée de gravier',
};

/** Palettes de fleurs proposées dans l’éditeur. */
export const GARDEN_FLOWER_PALETTES: Record<string, { label: string; colors: string[] }> = {
  mixed: { label: 'Champêtre multicolore', colors: ['#f9a8d4', '#fdfcf7', '#fde047', '#c4b5fd', '#fb7185'] },
  white: { label: 'Jardin blanc', colors: ['#fdfcf7', '#f5f5f4', '#fef9c3'] },
  pink: { label: 'Roses et pivoines', colors: ['#f9a8d4', '#f472b6', '#fbcfe8', '#fdfcf7'] },
  lavender: { label: 'Lavande provençale', colors: ['#a78bfa', '#8b5cf6', '#c4b5fd'] },
  warm: { label: 'Soleil (jaune, orange)', colors: ['#fde047', '#fb923c', '#facc15', '#fdfcf7'] },
};

export const DEFAULT_GARDEN: GardenOptions = {
  lawn: 'english',
  border: 'stone',
  path: 'stones',
  flowerDensity: 0.3,
  flowerColors: GARDEN_FLOWER_PALETTES.mixed.colors,
  shrubs: 3,
  trees: 1,
};

/** Teinte et texture du gazon par type (textures générées de public/floors/gen). */
export const GARDEN_LAWN_SURFACE: Record<GardenLawn, { url: string; tint: string; tuftColor: string; tuftHeight: number; tuftsPerM2: number }> = {
  english: { url: '/floors/gen/grass-fine.jpg', tint: '#ffffff', tuftColor: '#4f7d33', tuftHeight: 0.05, tuftsPerM2: 6 },
  meadow: { url: '/floors/gen/meadow.jpg', tint: '#ffffff', tuftColor: '#6a8f3a', tuftHeight: 0.28, tuftsPerM2: 14 },
  dry: { url: '/floors/gen/grass-lawn.jpg', tint: '#d9c98f', tuftColor: '#a59a5a', tuftHeight: 0.12, tuftsPerM2: 8 },
  synthetic: { url: '/floors/gen/turf-synthetic.jpg', tint: '#ffffff', tuftColor: '#3f8a35', tuftHeight: 0, tuftsPerM2: 0 },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Normalise des réglages venus du plan (valeurs absentes ou hors bornes). */
export function resolveGardenOptions(raw: Partial<GardenOptions> | undefined): GardenOptions {
  const r = raw ?? {};
  const pick = <T extends string>(v: unknown, labels: Record<T, string>, fallback: T): T =>
    typeof v === 'string' && v in labels ? (v as T) : fallback;
  const colors = Array.isArray(r.flowerColors) ? r.flowerColors.filter((c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c)) : [];
  return {
    lawn: pick(r.lawn, GARDEN_LAWN_LABELS, DEFAULT_GARDEN.lawn),
    border: pick(r.border, GARDEN_BORDER_LABELS, DEFAULT_GARDEN.border),
    path: pick(r.path, GARDEN_PATH_LABELS, DEFAULT_GARDEN.path),
    flowerDensity: clamp(Number.isFinite(r.flowerDensity) ? Number(r.flowerDensity) : DEFAULT_GARDEN.flowerDensity, 0, 1),
    flowerColors: colors.length ? colors.slice(0, 6) : DEFAULT_GARDEN.flowerColors,
    shrubs: Math.round(clamp(Number.isFinite(r.shrubs) ? Number(r.shrubs) : DEFAULT_GARDEN.shrubs, 0, 16)),
    trees: Math.round(clamp(Number.isFinite(r.trees) ? Number(r.trees) : DEFAULT_GARDEN.trees, 0, 6)),
  };
}

export interface GardenPoint {
  x: number;
  z: number;
  /** Échelle ou rayon (m). */
  s: number;
  rot: number;
  /** Index de couleur, nuance… selon l’usage. */
  k: number;
}

export interface GardenLayout {
  /** Largeur de la bordure (m) : le gazon commence après. */
  borderWidth: number;
  /** Le chemin court le long du grand côté (X si `w ≥ d`). */
  pathAlongX: boolean;
  pathWidth: number;
  stones: GardenPoint[];
  flowers: GardenPoint[];
  shrubs: GardenPoint[];
  trees: GardenPoint[];
  tufts: GardenPoint[];
}

const FLOWERS_PER_M2_MAX = 40;
const FLOWER_CAP = 1500;
const TUFT_CAP = 2500;

/**
 * Positions de tous les éléments. Les fleurs, arbustes et arbres évitent le
 * chemin et la bordure ; une bordure « fleurie » reçoit sa propre plate-bande.
 */
export function gardenLayout(w: number, d: number, options: GardenOptions, seed: number): GardenLayout {
  const empty: GardenLayout = { borderWidth: 0, pathAlongX: true, pathWidth: 0, stones: [], flowers: [], shrubs: [], trees: [], tufts: [] };
  if (!(w > 0) || !(d > 0)) return empty;
  const rand = seededRandom(seed);
  const borderWidth = options.border === 'none' ? 0 : options.border === 'hedge' ? 0.45 : options.border === 'flowers' ? 0.6 : 0.12;
  const halfW = Math.max(0.1, w / 2 - borderWidth);
  const halfD = Math.max(0.1, d / 2 - borderWidth);
  const pathAlongX = w >= d;
  const pathWidth = options.path === 'none' ? 0 : Math.min(options.path === 'gravel' ? 1.1 : 0.7, Math.min(w, d) * 0.35);
  const offPath = (x: number, z: number, margin: number) => pathWidth === 0 || Math.abs(pathAlongX ? z : x) > pathWidth / 2 + margin;

  // Pas japonais : une dalle tous les ~65 cm, légèrement décalée et tournée.
  const stones: GardenPoint[] = [];
  if (options.path === 'stones') {
    const len = (pathAlongX ? w : d) - borderWidth * 2;
    const n = Math.max(1, Math.floor(len / 0.65));
    for (let i = 0; i < n; i += 1) {
      const along = ((i + 0.5) / n - 0.5) * len;
      const across = (rand() - 0.5) * pathWidth * 0.25;
      stones.push({ x: pathAlongX ? along : across, z: pathAlongX ? across : along, s: 0.24 + rand() * 0.06, rot: rand() * Math.PI, k: i });
    }
  }

  /** Point libre : `edge` = recul des bords, `fromPath` = recul du chemin (m). */
  const randomSpot = (edge: number, fromPath = edge) => {
    for (let tries = 0; tries < 24; tries += 1) {
      const x = (rand() * 2 - 1) * Math.max(0, halfW - edge);
      const z = (rand() * 2 - 1) * Math.max(0, halfD - edge);
      if (offPath(x, z, fromPath)) return { x, z };
    }
    return null;
  };

  const trees: GardenPoint[] = [];
  for (let i = 0; i < options.trees; i += 1) {
    const p = randomSpot(Math.min(1.2, Math.min(halfW, halfD) * 0.5), 0.5);
    if (p) trees.push({ ...p, s: 0.8 + rand() * 0.4, rot: rand() * Math.PI * 2, k: Math.floor(rand() * 1000) });
  }
  const shrubs: GardenPoint[] = [];
  for (let i = 0; i < options.shrubs; i += 1) {
    const p = randomSpot(Math.min(0.45, Math.min(halfW, halfD) * 0.4), 0.3);
    if (p) shrubs.push({ ...p, s: 0.35 + rand() * 0.3, rot: rand() * Math.PI * 2, k: Math.floor(rand() * 1000) });
  }

  const nColors = Math.max(1, options.flowerColors.length);
  const flowers: GardenPoint[] = [];
  const lawnArea = halfW * halfD * 4;
  const nFlowers = Math.min(FLOWER_CAP, Math.round(lawnArea * options.flowerDensity * FLOWERS_PER_M2_MAX));
  // Fleurs en petites touffes (comme dans un vrai jardin), pas en pluie uniforme.
  for (let placed = 0, guard = 0; placed < nFlowers && guard < nFlowers * 3; guard += 1) {
    const c = randomSpot(0.1);
    if (!c) continue;
    const clump = 3 + Math.floor(rand() * 5);
    const color = Math.floor(rand() * nColors);
    for (let j = 0; j < clump && placed < nFlowers; j += 1) {
      const x = clamp(c.x + (rand() - 0.5) * 0.35, -halfW, halfW);
      const z = clamp(c.z + (rand() - 0.5) * 0.35, -halfD, halfD);
      if (!offPath(x, z, 0.05)) continue;
      flowers.push({ x, z, s: 0.8 + rand() * 0.5, rot: rand() * Math.PI * 2, k: color });
      placed += 1;
    }
  }
  if (options.border === 'flowers') {
    const per = Math.round((w + d) * 2 * 10);
    for (let i = 0; i < Math.min(FLOWER_CAP, per); i += 1) {
      const t = rand();
      const inset = w / 2 - borderWidth / 2 + (rand() - 0.5) * borderWidth * 0.7;
      const insetD = d / 2 - borderWidth / 2 + (rand() - 0.5) * borderWidth * 0.7;
      const side = Math.floor(rand() * 4);
      const x = side < 2 ? (t - 0.5) * w * 0.96 : (side === 2 ? -inset : inset);
      const z = side < 2 ? (side === 0 ? -insetD : insetD) : (t - 0.5) * d * 0.96;
      flowers.push({ x, z, s: 1 + rand() * 0.6, rot: rand() * Math.PI * 2, k: Math.floor(rand() * nColors) });
    }
  }

  const surface = GARDEN_LAWN_SURFACE[options.lawn];
  const tufts: GardenPoint[] = [];
  const nTufts = Math.min(TUFT_CAP, Math.round(lawnArea * surface.tuftsPerM2));
  for (let i = 0; i < nTufts; i += 1) {
    const x = (rand() * 2 - 1) * halfW;
    const z = (rand() * 2 - 1) * halfD;
    if (!offPath(x, z, 0)) continue;
    tufts.push({ x, z, s: 0.6 + rand() * 0.8, rot: rand() * Math.PI * 2, k: rand() });
  }

  return { borderWidth, pathAlongX, pathWidth, stones, flowers, shrubs, trees, tufts };
}

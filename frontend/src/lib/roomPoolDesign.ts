/**
 * Piscines réglables (aménagement extérieur `landscapeStyle: 'pool'`) : type de bassin,
 * eau, revêtement, margelles, accès, éclairage, cascade et décor flottant.
 *
 * Le rendu 3D (bassin réellement creusé dans le sol) et le plan 2D lisent ces réglages.
 * Origine au centre de l’empreinte, X sur la largeur `w`, Z sur la profondeur `d`, en mètres.
 *
 * Module pur, testé avec `node --test`.
 */

import { poolOutline, type PoolShape } from './roomOutdoorUtils.ts';

export type PoolType =
  | 'classic'
  | 'infinity'
  | 'lap'
  | 'natural'
  | 'lagoon'
  | 'spa'
  | 'kids'
  | 'raised'
  | 'mirror';

export type PoolLiner = 'mosaicBlue' | 'mosaicWhite' | 'sand' | 'grey' | 'black' | 'green' | 'gravel';
export type PoolCoping = 'stone' | 'travertine' | 'ipe' | 'concrete' | 'marble' | 'slate' | 'rocks';
export type PoolAccess = 'roman' | 'ladder' | 'beach' | 'none';
export type PoolFloating = 'none' | 'floats' | 'candles' | 'petals' | 'lanterns';
export type PoolEdge = 'north' | 'south' | 'east' | 'west';

export interface PoolOptions {
  type: PoolType;
  /** Couleur de l’eau (hex). */
  water: string;
  liner: PoolLiner;
  coping: PoolCoping;
  /** Largeur des margelles / plage autour du bassin, en mètres. */
  copingM: number;
  access: PoolAccess;
  /** Projecteurs immergés allumés. */
  lights: boolean;
  /** Teinte des projecteurs (hex) ; `rgb` = couleurs qui tournent. */
  lightColor: string;
  /** Lame d’eau (cascade) sur un côté. */
  waterfall: boolean;
  floating: PoolFloating;
  /** Piscine à débordement : côté qui déborde. */
  infinityEdge: PoolEdge;
}

export type PoolTypeMeta = {
  label: string;
  hint: string;
  /** Empreinte par défaut (m) et profondeur d’eau maximale (m). */
  widthM: number;
  depthM: number;
  waterDepthM: number;
  shape: PoolShape;
  /** Formes proposées pour ce type (la première est celle par défaut). */
  shapes: PoolShape[];
  defaults: Partial<PoolOptions>;
};

const ALL_SHAPES: PoolShape[] = ['rectangle', 'rounded', 'oval', 'round', 'kidney', 'lShape', 'freeform'];

export const POOL_TYPE_META: Record<PoolType, PoolTypeMeta> = {
  classic: {
    label: 'Piscine classique',
    hint: 'Bassin enterré carrelé, petit et grand bain, marches romaines.',
    widthM: 10, depthM: 5, waterDepthM: 1.8, shape: 'rectangle', shapes: ALL_SHAPES,
    defaults: {},
  },
  infinity: {
    label: 'Piscine à débordement',
    hint: 'L’eau affleure et déborde d’un côté dans un bac de rétention : effet miroir sans fin.',
    widthM: 12, depthM: 5, waterDepthM: 1.6, shape: 'rectangle', shapes: ['rectangle'],
    defaults: { water: '#1f8fb0', liner: 'grey', coping: 'slate', access: 'roman', infinityEdge: 'north' },
  },
  lap: {
    label: 'Couloir de nage',
    hint: 'Bassin long et étroit avec lignes d’eau, pour nager en longueur.',
    widthM: 18, depthM: 3, waterDepthM: 1.5, shape: 'rectangle', shapes: ['rectangle', 'rounded'],
    defaults: { water: '#1a7fae', liner: 'mosaicWhite', coping: 'concrete', access: 'ladder' },
  },
  natural: {
    label: 'Baignade naturelle',
    hint: 'Bassin biologique : fond de galets, berges en pierre et zone de plantes filtrantes.',
    widthM: 11, depthM: 6, waterDepthM: 1.8, shape: 'freeform', shapes: ['freeform', 'kidney', 'oval', 'round'],
    defaults: { water: '#2c6e64', liner: 'gravel', coping: 'rocks', copingM: 0.6, access: 'beach', lights: false },
  },
  lagoon: {
    label: 'Piscine lagon',
    hint: 'Fond sable et plage immergée en pente douce, eau des Caraïbes.',
    widthM: 12, depthM: 7, waterDepthM: 1.5, shape: 'freeform', shapes: ['freeform', 'kidney', 'oval', 'round'],
    defaults: { water: '#2fc4d0', liner: 'sand', coping: 'travertine', copingM: 0.7, access: 'beach' },
  },
  spa: {
    label: 'Spa / jacuzzi',
    hint: 'Bain bouillonnant surélevé avec banquette, jets et eau chaude.',
    widthM: 2.6, depthM: 2.6, waterDepthM: 0.95, shape: 'round', shapes: ['round', 'rounded', 'rectangle', 'oval'],
    defaults: { water: '#29b6d6', liner: 'mosaicWhite', coping: 'stone', copingM: 0.3, access: 'none', lightColor: '#7dd3fc' },
  },
  kids: {
    label: 'Pataugeoire',
    hint: 'Bassin pour enfants peu profond, accès en pente douce et bouées.',
    widthM: 5, depthM: 4, waterDepthM: 0.4, shape: 'round', shapes: ['round', 'oval', 'kidney', 'freeform', 'rounded'],
    defaults: { water: '#45c6e8', liner: 'mosaicBlue', coping: 'stone', access: 'beach', floating: 'floats' },
  },
  raised: {
    label: 'Piscine hors-sol bois',
    hint: 'Bassin posé sur le sol, parois habillées de lames de bois et échelle.',
    widthM: 6, depthM: 4, waterDepthM: 1.3, shape: 'rectangle', shapes: ['rectangle', 'rounded', 'oval', 'round'],
    defaults: { water: '#2aa7c9', liner: 'mosaicBlue', coping: 'ipe', copingM: 0.25, access: 'ladder' },
  },
  mirror: {
    label: 'Miroir d’eau',
    hint: 'Lame d’eau de quelques centimètres sur fond sombre : reflète le décor, parfait en réception.',
    widthM: 10, depthM: 4, waterDepthM: 0.08, shape: 'rectangle', shapes: ['rectangle', 'rounded', 'oval', 'round', 'freeform'],
    defaults: { water: '#16232b', liner: 'black', coping: 'slate', copingM: 0.2, access: 'none', lights: false, floating: 'candles' },
  },
};

export const POOL_TYPE_ORDER: PoolType[] = ['classic', 'infinity', 'lap', 'natural', 'lagoon', 'spa', 'kids', 'raised', 'mirror'];

export const POOL_WATER_PRESETS: Record<string, { label: string; color: string }> = {
  turquoise: { label: 'Turquoise', color: '#2aa7c9' },
  caribbean: { label: 'Lagon des Caraïbes', color: '#2fc4d0' },
  deepBlue: { label: 'Bleu profond', color: '#1a5f9e' },
  emerald: { label: 'Vert émeraude', color: '#1f9e8a' },
  natural: { label: 'Naturelle (verte)', color: '#2c6e64' },
  black: { label: 'Noir miroir', color: '#16232b' },
  rose: { label: 'Rose (soirée)', color: '#e48bb5' },
};

export const POOL_LINER_META: Record<PoolLiner, { label: string; color: string; texture: 'mosaic' | 'plain' | 'sand' | 'gravel' }> = {
  mosaicBlue: { label: 'Mosaïque bleue', color: '#8fd3ea', texture: 'mosaic' },
  mosaicWhite: { label: 'Mosaïque blanche', color: '#f4f8fa', texture: 'mosaic' },
  sand: { label: 'Liner sable', color: '#e8d9b5', texture: 'sand' },
  grey: { label: 'Gris anthracite', color: '#6b7280', texture: 'plain' },
  black: { label: 'Noir', color: '#22262b', texture: 'plain' },
  green: { label: 'Vert d’eau', color: '#9fd8c4', texture: 'plain' },
  gravel: { label: 'Galets (naturel)', color: '#a89a80', texture: 'gravel' },
};

export const POOL_COPING_META: Record<PoolCoping, { label: string; color: string; texture: string; tileM: number }> = {
  stone: { label: 'Pierre reconstituée', color: '#f3efe6', texture: '/floors/gen/limestone-slabs.jpg', tileM: 1.2 },
  travertine: { label: 'Travertin', color: '#f4e7d1', texture: '/floors/gen/travertine.jpg', tileM: 1.6 },
  ipe: { label: 'Bois ipé', color: '#d9b894', texture: '/floors/gen/deck-ipe.jpg', tileM: 1.4 },
  concrete: { label: 'Béton gris', color: '#c9c7c2', texture: '/floors/gen/concrete-polished.jpg', tileM: 2 },
  marble: { label: 'Marbre blanc', color: '#ffffff', texture: '/floors/gen/marble-calacatta.jpg', tileM: 1.6 },
  slate: { label: 'Ardoise', color: '#5b6066', texture: '/floors/gen/wall-slate.jpg', tileM: 1.2 },
  rocks: { label: 'Rochers naturels', color: '#b7b0a4', texture: '/floors/gen/flagstone.jpg', tileM: 1.4 },
};

export const POOL_ACCESS_LABELS: Record<PoolAccess, string> = {
  roman: 'Marches romaines',
  ladder: 'Échelle inox',
  beach: 'Plage immergée (pente douce)',
  none: 'Aucun',
};

export const POOL_FLOATING_LABELS: Record<PoolFloating, string> = {
  none: 'Rien',
  floats: 'Bouées et matelas',
  candles: 'Bougies flottantes',
  petals: 'Pétales et fleurs',
  lanterns: 'Boules lumineuses',
};

export const POOL_EDGE_LABELS: Record<PoolEdge, string> = {
  north: 'Haut du plan',
  south: 'Bas du plan',
  east: 'Droite',
  west: 'Gauche',
};

export const POOL_LIGHT_PRESETS: Record<string, { label: string; color: string }> = {
  white: { label: 'Blanc', color: '#e0f7ff' },
  blue: { label: 'Bleu', color: '#38bdf8' },
  turquoise: { label: 'Turquoise', color: '#2dd4bf' },
  violet: { label: 'Violet', color: '#a78bfa' },
  pink: { label: 'Rose', color: '#f472b6' },
  warm: { label: 'Blanc chaud', color: '#fcd9a8' },
  rgb: { label: 'Multicolore (change)', color: 'rgb' },
};

export const DEFAULT_POOL: PoolOptions = {
  type: 'classic',
  water: '#2aa7c9',
  liner: 'mosaicBlue',
  coping: 'stone',
  copingM: 0.35,
  access: 'roman',
  lights: true,
  lightColor: '#e0f7ff',
  waterfall: false,
  floating: 'none',
  infinityEdge: 'north',
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

export function isPoolType(value: unknown): value is PoolType {
  return typeof value === 'string' && value in POOL_TYPE_META;
}

/** Réglages complets : défauts du type, puis choix de l’utilisateur (valeurs inconnues ignorées). */
export function resolvePoolOptions(raw?: Partial<PoolOptions> | null): PoolOptions {
  const type = isPoolType(raw?.type) ? raw.type : 'classic';
  const base: PoolOptions = { ...DEFAULT_POOL, ...POOL_TYPE_META[type].defaults, type };
  if (!raw) return base;
  return {
    type,
    water: isHex(raw.water) ? raw.water : base.water,
    liner: raw.liner && raw.liner in POOL_LINER_META ? raw.liner : base.liner,
    coping: raw.coping && raw.coping in POOL_COPING_META ? raw.coping : base.coping,
    copingM: Number.isFinite(raw.copingM) ? clamp(raw.copingM as number, 0.15, 1.5) : base.copingM,
    access: raw.access && raw.access in POOL_ACCESS_LABELS ? raw.access : base.access,
    lights: typeof raw.lights === 'boolean' ? raw.lights : base.lights,
    lightColor: isHex(raw.lightColor) || raw.lightColor === 'rgb' ? raw.lightColor : base.lightColor,
    waterfall: typeof raw.waterfall === 'boolean' ? raw.waterfall : base.waterfall,
    floating: raw.floating && raw.floating in POOL_FLOATING_LABELS ? raw.floating : base.floating,
    infinityEdge: raw.infinityEdge && raw.infinityEdge in POOL_EDGE_LABELS ? raw.infinityEdge : base.infinityEdge,
  };
}

/** Forme effective : celle choisie si le type l’accepte, sinon la forme par défaut du type. */
export function resolvePoolShape(type: PoolType, shape?: PoolShape): PoolShape {
  const meta = POOL_TYPE_META[type];
  return shape && meta.shapes.includes(shape) ? shape : meta.shape;
}

/** Profondeur d’eau réglable : bornes par type (un spa ne descend pas à 3 m). */
export function poolDepthRange(type: PoolType): { min: number; max: number } {
  switch (type) {
    case 'mirror': return { min: 0.03, max: 0.3 };
    case 'kids': return { min: 0.2, max: 0.8 };
    case 'spa': return { min: 0.6, max: 1.2 };
    case 'raised': return { min: 0.8, max: 1.5 };
    default: return { min: 0.8, max: 3.5 };
  }
}

export function resolvePoolDepth(type: PoolType, depthM?: number): number {
  const { min, max } = poolDepthRange(type);
  return clamp(Number.isFinite(depthM) ? (depthM as number) : POOL_TYPE_META[type].waterDepthM, min, max);
}

/** Bassin posé sur le sol (aucune excavation). */
export function poolIsAboveGround(type: PoolType): boolean {
  return type === 'raised';
}

/** Hauteur du rebord au-dessus du sol (spa surélevé, hors-sol), en mètres. */
export function poolRimHeight(type: PoolType, depthM: number): number {
  if (type === 'raised') return depthM + 0.12;
  if (type === 'spa') return 0.45;
  return 0;
}

/** Largeur de margelle effective : un miroir d’eau à débordement n’en a presque pas. */
export function poolCopingWidth(o: PoolOptions, w: number, d: number): number {
  return clamp(o.copingM, 0.12, Math.max(0.12, Math.min(w, d) * 0.25));
}

/** Contour intérieur du bassin (bord de l’eau), centré, en mètres. */
export function poolWaterOutline(o: PoolOptions, shape: PoolShape, w: number, d: number): Array<[number, number]> {
  const c = poolCopingWidth(o, w, d);
  const s = resolvePoolShape(o.type, shape);
  if (o.type === 'infinity') {
    // La margelle disparaît du côté qui déborde : le bassin va jusqu’au bac de rétention.
    const trough = poolInfinityTroughM(w, d);
    let x0 = -w / 2 + c, x1 = w / 2 - c, z0 = -d / 2 + c, z1 = d / 2 - c;
    if (o.infinityEdge === 'north') z0 = -d / 2 + trough;
    if (o.infinityEdge === 'south') z1 = d / 2 - trough;
    if (o.infinityEdge === 'west') x0 = -w / 2 + trough;
    if (o.infinityEdge === 'east') x1 = w / 2 - trough;
    return [[x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  }
  return poolOutline(s, Math.max(0.6, w - c * 2), Math.max(0.6, d - c * 2));
}

/** Largeur du bac de rétention d’une piscine à débordement. */
export function poolInfinityTroughM(w: number, d: number): number {
  return clamp(Math.min(w, d) * 0.08, 0.3, 0.6);
}

/**
 * Trou à découper dans le sol (bassin + bac de rétention), centré, en mètres.
 * `null` pour un bassin hors-sol, qui se pose simplement sur le sol.
 */
export function poolGroundHole(o: PoolOptions, shape: PoolShape, w: number, d: number): Array<[number, number]> | null {
  if (poolIsAboveGround(o.type)) return null;
  if (o.type === 'infinity') {
    const c = poolCopingWidth(o, w, d);
    let x0 = -w / 2 + c, x1 = w / 2 - c, z0 = -d / 2 + c, z1 = d / 2 - c;
    if (o.infinityEdge === 'north') z0 = -d / 2;
    if (o.infinityEdge === 'south') z1 = d / 2;
    if (o.infinityEdge === 'west') x0 = -w / 2;
    if (o.infinityEdge === 'east') x1 = w / 2;
    return [[x1, z0], [x1, z1], [x0, z1], [x0, z0]];
  }
  return poolWaterOutline(o, shape, w, d);
}

/**
 * Profondeur du fond (m, positive) au point (x, z) : grand bain d’un côté, petit bain de l’autre,
 * ou plage en pente douce jusqu’à la surface. Fonction plane, donc exacte sur la triangulation.
 */
export function poolFloorDepthAt(o: PoolOptions, depthM: number, w: number, d: number, x: number, z: number): number {
  const along = w >= d ? x / Math.max(0.01, w) : z / Math.max(0.01, d); // −0,5 … 0,5
  const t = clamp(along + 0.5, 0, 1);
  if (o.access === 'beach') {
    // Plage : 5 cm sous l’eau d’un côté, profondeur pleine de l’autre.
    return 0.05 + (depthM - 0.05) * t;
  }
  if (o.type === 'mirror' || o.type === 'spa' || o.type === 'kids' || o.type === 'raised' || o.type === 'lap') return depthM;
  const shallow = Math.min(depthM, Math.max(0.9, depthM * 0.55));
  return shallow + (depthM - shallow) * t;
}

/** Lignes d’eau d’un couloir de nage : positions transversales (m) des lignes. */
export function poolLaneLines(o: PoolOptions, w: number, d: number): number[] {
  if (o.type !== 'lap') return [];
  const across = Math.min(w, d) - poolCopingWidth(o, w, d) * 2;
  const lanes = Math.max(1, Math.round(across / 2.2));
  return Array.from({ length: lanes - 1 }, (_, i) => -across / 2 + (across / lanes) * (i + 1));
}

/** Teinte de l’eau vue du dessus dans le plan 2D (plus sombre au centre). */
export function poolPlanColors(o: PoolOptions): { light: string; deep: string; edge: string; coping: string } {
  return {
    light: mixHex(o.water, '#ffffff', 0.35),
    deep: mixHex(o.water, '#0b2533', 0.25),
    edge: mixHex(o.water, '#0b2533', 0.45),
    coping: POOL_COPING_META[o.coping].color,
  };
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const mix = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
}

/** Place un point local (x, z) d’un élément tourné de `rotationDeg` et centré en (cx, cz). */
export function poolLocalToWorld(x: number, z: number, cx: number, cz: number, rotationDeg: number): [number, number] {
  const a = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return [cx + x * cos + z * sin, cz - x * sin + z * cos];
}

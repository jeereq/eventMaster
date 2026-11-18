/**
 * Décor mural : images (photos, affiches, logos) et graffitis posés sur un mur, côté salle
 * (face intérieure, par défaut) ou côté extérieur (façade).
 *
 * Chaque élément est rattaché à un mur et repéré le long de celui-ci (`t`, de 0 au début du mur
 * à 1 à sa fin), par la hauteur de son centre et par sa largeur, en mètres. Le rendu 3D lit ces
 * valeurs telles quelles ; `clampWallArt` les garde dans les limites du mur.
 */

export type WallArtKind = 'image' | 'graffiti';

/** Habillage d’une image murale. */
export type WallArtFrame = 'none' | 'canvas' | 'thin' | 'gallery' | 'gold';

/** Styles de lettrage graffiti (dessinés dans le navigateur, sans image à fournir). */
export type GraffitiStyle =
  | 'bubble' | 'drip' | 'neon' | 'stencil' | 'wild'
  | 'chrome' | 'retro' | 'tag' | 'throwup' | 'comic';

/** Face du mur où l’élément est posé. */
export type WallArtFace = 'inside' | 'outside';

/** Police du lettrage. `auto` suit le style choisi. */
export type GraffitiFont = 'auto' | 'block' | 'round' | 'condensed' | 'script' | 'marker' | 'serif';

/** Fond peint derrière les lettres. */
export type GraffitiBackdrop = 'none' | 'splash' | 'cloud' | 'banner' | 'panel';

/** Effets réglables un à un ; absents, ils suivent le style. */
export interface GraffitiEffects {
  /** Relief 3D (lettres extrudées). */
  depth?: boolean;
  /** Coulures de peinture sous les lettres. */
  drips?: boolean;
  /** Étincelles et reflets. */
  sparkles?: boolean;
  /** Brume de bombe autour des lettres. */
  spray?: boolean;
}

export interface RoomWallArt {
  id: string;
  kind: WallArtKind;
  /** Position du centre le long du mur (0 = début, 1 = fin). */
  t: number;
  /** Hauteur du centre au-dessus du sol (m). */
  yM: number;
  /** Largeur (m). La hauteur suit le format de l’image ou du lettrage. */
  widthM: number;
  /** Rapport largeur / hauteur (mémorisé à l’ajout pour éviter les sauts au chargement). */
  aspect: number;
  /** Image : adresse (cloud ou data URL). */
  imageUrl?: string;
  frame?: WallArtFrame;
  /** Graffiti : texte, style et couleurs (remplissage, contour). */
  text?: string;
  graffitiStyle?: GraffitiStyle;
  fillColor?: string;
  outlineColor?: string;
  /** Seconde couleur des lettres : dégradé du haut (fillColor) vers le bas. */
  fillColor2?: string;
  graffitiFont?: GraffitiFont;
  /** Inclinaison du lettrage, en degrés (-25 à 25). */
  tiltDeg?: number;
  /** Courbure de la ligne de texte (-1 = creux, 1 = en arc). */
  curve?: number;
  /** Épaisseur du contour (0,3 à 2, 1 = normal). */
  outlineScale?: number;
  backdrop?: GraffitiBackdrop;
  backdropColor?: string;
  effects?: GraffitiEffects;
  /** Côté du mur : salle (par défaut) ou extérieur. */
  face?: WallArtFace;
  /** 0–1. Une image peinte à même le mur (sans cadre) peut être légèrement fondue. */
  opacity?: number;
}

export const WALL_ART_FRAME_LABELS: Record<WallArtFrame, string> = {
  none: 'Peinte sur le mur',
  canvas: 'Toile tendue',
  thin: 'Cadre fin noir',
  gallery: 'Cadre galerie (passe-partout)',
  gold: 'Cadre doré mouluré',
};

export const GRAFFITI_STYLE_LABELS: Record<GraffitiStyle, string> = {
  bubble: 'Bulles (bubble letters)',
  drip: 'Coulures de peinture',
  neon: 'Néon lumineux',
  stencil: 'Pochoir',
  wild: 'Wildstyle penché',
  chrome: 'Chrome métallisé',
  retro: 'Rétro années 80',
  tag: 'Tag à main levée',
  throwup: 'Throw-up (lettres rondes)',
  comic: 'BD pop art',
};

export const WALL_ART_FACE_LABELS: Record<WallArtFace, string> = {
  inside: 'Côté salle',
  outside: 'Côté extérieur',
};

export const GRAFFITI_FONT_LABELS: Record<GraffitiFont, string> = {
  auto: 'Selon le style',
  block: 'Bâton épais',
  round: 'Arrondie',
  condensed: 'Étroite (affiche)',
  script: 'Pinceau (script)',
  marker: 'Feutre',
  serif: 'Classique à empattements',
};

export const GRAFFITI_BACKDROP_LABELS: Record<GraffitiBackdrop, string> = {
  none: 'Aucun',
  splash: 'Éclaboussure',
  cloud: 'Nuage',
  banner: 'Banderole',
  panel: 'Panneau peint',
};

export const GRAFFITI_EFFECT_LABELS: Record<keyof GraffitiEffects, string> = {
  depth: 'Relief 3D',
  drips: 'Coulures',
  sparkles: 'Étincelles',
  spray: 'Halo de bombe',
};

/** Effets d’un style quand l’utilisateur ne les a pas réglés. */
export const GRAFFITI_STYLE_EFFECTS: Record<GraffitiStyle, Required<GraffitiEffects>> = {
  bubble: { depth: true, drips: false, sparkles: true, spray: true },
  drip: { depth: false, drips: true, sparkles: false, spray: true },
  neon: { depth: false, drips: false, sparkles: false, spray: false },
  stencil: { depth: false, drips: false, sparkles: false, spray: true },
  wild: { depth: true, drips: false, sparkles: true, spray: true },
  chrome: { depth: true, drips: false, sparkles: true, spray: false },
  retro: { depth: true, drips: false, sparkles: false, spray: false },
  tag: { depth: false, drips: true, sparkles: false, spray: true },
  throwup: { depth: false, drips: false, sparkles: false, spray: true },
  comic: { depth: true, drips: false, sparkles: false, spray: false },
};

/** Effets réellement appliqués (choix de l’utilisateur, sinon ceux du style). */
export function graffitiEffects(art: Pick<RoomWallArt, 'graffitiStyle' | 'effects'>): Required<GraffitiEffects> {
  const base = GRAFFITI_STYLE_EFFECTS[art.graffitiStyle ?? 'bubble'] ?? GRAFFITI_STYLE_EFFECTS.bubble;
  const e = art.effects ?? {};
  return {
    depth: e.depth ?? base.depth,
    drips: e.drips ?? base.drips,
    sparkles: e.sparkles ?? base.sparkles,
    spray: e.spray ?? base.spray,
  };
}

export function wallArtFace(art: Pick<RoomWallArt, 'face'>): WallArtFace {
  return art.face === 'outside' ? 'outside' : 'inside';
}

/** Couleurs proposées pour un graffiti : [remplissage, contour]. */
export const GRAFFITI_PALETTES: Array<{ id: string; label: string; fill: string; outline: string }> = [
  { id: 'sunset', label: 'Coucher de soleil', fill: '#ff6b35', outline: '#2b1055' },
  { id: 'electric', label: 'Électrique', fill: '#00e5ff', outline: '#1a1a2e' },
  { id: 'candy', label: 'Bonbon', fill: '#ff4fa3', outline: '#ffffff' },
  { id: 'gold', label: 'Or', fill: '#f5c542', outline: '#3d2b00' },
  { id: 'lime', label: 'Citron vert', fill: '#b6f500', outline: '#0b3d2e' },
  { id: 'mono', label: 'Noir et blanc', fill: '#f5f5f5', outline: '#111111' },
  { id: 'miami', label: 'Miami', fill: '#ff3cac', outline: '#2b86c5' },
  { id: 'jungle', label: 'Jungle', fill: '#2ecc71', outline: '#14361f' },
  { id: 'royal', label: 'Royal', fill: '#7b2ff7', outline: '#f5c542' },
  { id: 'fire', label: 'Feu', fill: '#ffd200', outline: '#c0192c' },
];

export const GRAFFITI_DEFAULT_TEXT = 'LOVE';
const MAX_TEXT = 24;

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Rapport largeur / hauteur d’un graffiti selon la longueur du texte (lettrage plus large que haut). */
export function graffitiAspect(text: string): number {
  const n = Math.max(1, Math.min(MAX_TEXT, text.trim().length || 1));
  return clamp(0.55 + n * 0.62, 1.2, 9);
}

export function sanitizeGraffitiText(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT) || GRAFFITI_DEFAULT_TEXT;
}

let seq = 0;
function makeId(): string {
  seq += 1;
  return `art-${Date.now().toString(36)}-${seq}`;
}

/** Nouvel élément mural centré sur le mur, à hauteur d’œil. */
export function createWallArt(
  kind: WallArtKind,
  opts: { imageUrl?: string; aspect?: number; text?: string; style?: GraffitiStyle; wallLengthM?: number; wallHeightM?: number } = {},
): RoomWallArt {
  const wallLen = opts.wallLengthM ?? 6;
  const wallH = opts.wallHeightM ?? 3;
  if (kind === 'graffiti') {
    const text = sanitizeGraffitiText(opts.text ?? GRAFFITI_DEFAULT_TEXT);
    const palette = GRAFFITI_PALETTES[0];
    return clampWallArt(
      {
        id: makeId(),
        kind,
        t: 0.5,
        yM: Math.min(1.7, wallH * 0.55),
        widthM: Math.min(3.2, wallLen * 0.6),
        aspect: graffitiAspect(text),
        text,
        graffitiStyle: opts.style ?? 'bubble',
        fillColor: palette.fill,
        outlineColor: palette.outline,
      },
      wallLen,
      wallH,
    );
  }
  return clampWallArt(
    {
      id: makeId(),
      kind,
      t: 0.5,
      yM: Math.min(1.6, wallH * 0.52),
      widthM: Math.min(1.4, wallLen * 0.4),
      aspect: opts.aspect && Number.isFinite(opts.aspect) && opts.aspect > 0 ? opts.aspect : 1.5,
      imageUrl: opts.imageUrl,
      frame: 'gallery',
    },
    wallLen,
    wallH,
  );
}

/** Garde l’élément entièrement sur le mur (largeur, hauteur et position). */
export function clampWallArt(art: RoomWallArt, wallLengthM: number, wallHeightM: number): RoomWallArt {
  const aspect = clamp(Number.isFinite(art.aspect) && art.aspect > 0 ? art.aspect : 1.5, 0.2, 10);
  const maxW = Math.max(0.2, wallLengthM * 0.98);
  const maxWByHeight = Math.max(0.2, (wallHeightM - 0.1) * aspect);
  const widthM = clamp(art.widthM, 0.2, Math.min(maxW, maxWByHeight));
  const heightM = widthM / aspect;
  const halfT = wallLengthM > 0 ? widthM / 2 / wallLengthM : 0.5;
  const t = halfT >= 0.5 ? 0.5 : clamp(art.t, halfT, 1 - halfT);
  const yM = clamp(art.yM, heightM / 2 + 0.02, Math.max(heightM / 2 + 0.02, wallHeightM - heightM / 2 - 0.02));
  const opacity = art.opacity === undefined ? undefined : clamp(art.opacity, 0.2, 1);
  const extra: Partial<RoomWallArt> = {};
  if (art.tiltDeg !== undefined) extra.tiltDeg = clamp(Number(art.tiltDeg) || 0, -25, 25);
  if (art.curve !== undefined) extra.curve = clamp(Number(art.curve) || 0, -1, 1);
  if (art.outlineScale !== undefined) extra.outlineScale = clamp(Number(art.outlineScale) || 1, 0.3, 2);
  return { ...art, aspect, widthM, t, yM, ...(opacity === undefined ? {} : { opacity }), ...extra };
}

export function wallArtHeightM(art: Pick<RoomWallArt, 'widthM' | 'aspect'>): number {
  return art.widthM / (art.aspect > 0 ? art.aspect : 1.5);
}

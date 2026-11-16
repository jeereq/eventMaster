/**
 * Décor mural : images (photos, affiches, logos) et graffitis posés sur la face intérieure d’un mur.
 *
 * Chaque élément est rattaché à un mur et repéré le long de celui-ci (`t`, de 0 au début du mur
 * à 1 à sa fin), par la hauteur de son centre et par sa largeur, en mètres. Le rendu 3D lit ces
 * valeurs telles quelles ; `clampWallArt` les garde dans les limites du mur.
 */

export type WallArtKind = 'image' | 'graffiti';

/** Habillage d’une image murale. */
export type WallArtFrame = 'none' | 'canvas' | 'thin' | 'gallery' | 'gold';

/** Styles de lettrage graffiti (dessinés dans le navigateur, sans image à fournir). */
export type GraffitiStyle = 'bubble' | 'drip' | 'neon' | 'stencil' | 'wild';

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
};

/** Couleurs proposées pour un graffiti : [remplissage, contour]. */
export const GRAFFITI_PALETTES: Array<{ id: string; label: string; fill: string; outline: string }> = [
  { id: 'sunset', label: 'Coucher de soleil', fill: '#ff6b35', outline: '#2b1055' },
  { id: 'electric', label: 'Électrique', fill: '#00e5ff', outline: '#1a1a2e' },
  { id: 'candy', label: 'Bonbon', fill: '#ff4fa3', outline: '#ffffff' },
  { id: 'gold', label: 'Or', fill: '#f5c542', outline: '#3d2b00' },
  { id: 'lime', label: 'Citron vert', fill: '#b6f500', outline: '#0b3d2e' },
  { id: 'mono', label: 'Noir et blanc', fill: '#f5f5f5', outline: '#111111' },
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
  return { ...art, aspect, widthM, t, yM, ...(opacity === undefined ? {} : { opacity }) };
}

export function wallArtHeightM(art: Pick<RoomWallArt, 'widthM' | 'aspect'>): number {
  return art.widthM / (art.aspect > 0 ? art.aspect : 1.5);
}

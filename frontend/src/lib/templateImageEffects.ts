/**
 * Effets d’image des modèles d’invitation : forme (masque), fondu, voile dégradé,
 * cadrage non destructif (zoom + point focal + format), filtres, opacité, rotation.
 *
 * Tout est calculé en CSS pur pour que l’éditeur, l’invitation invitée, l’impression
 * et la vitrine affichent exactement la même chose.
 */
import type { CSSProperties } from 'react';

export const TEMPLATE_IMAGE_SHAPES = [
  { id: 'none', label: 'Aucune' },
  { id: 'rounded', label: 'Arrondie' },
  { id: 'circle', label: 'Cercle' },
  { id: 'oval', label: 'Ovale' },
  { id: 'arch', label: 'Arche' },
  { id: 'heart', label: 'Cœur' },
  { id: 'star', label: 'Étoile' },
  { id: 'hexagon', label: 'Hexagone' },
  { id: 'diamond', label: 'Losange' },
  { id: 'octagon', label: 'Octogone' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'blob', label: 'Organique' },
  { id: 'scallop', label: 'Festonnée' },
  { id: 'drop', label: 'Goutte' },
] as const;
export type TemplateImageShapeId = (typeof TEMPLATE_IMAGE_SHAPES)[number]['id'];

export const TEMPLATE_IMAGE_FADES = [
  { id: 'none', label: 'Aucun' },
  { id: 'bottom', label: 'Bas' },
  { id: 'top', label: 'Haut' },
  { id: 'left', label: 'Gauche' },
  { id: 'right', label: 'Droite' },
  { id: 'vertical', label: 'Haut et bas' },
  { id: 'edges', label: 'Bords' },
] as const;
export type TemplateImageFadeId = (typeof TEMPLATE_IMAGE_FADES)[number]['id'];

export const TEMPLATE_IMAGE_OVERLAY_DIRECTIONS = [
  { id: 'to bottom', label: '↓' },
  { id: 'to top', label: '↑' },
  { id: 'to right', label: '→' },
  { id: 'to left', label: '←' },
  { id: 'to bottom right', label: '↘' },
  { id: 'to top right', label: '↗' },
  { id: 'radial', label: '◎' },
] as const;
export type TemplateImageOverlayDirection = (typeof TEMPLATE_IMAGE_OVERLAY_DIRECTIONS)[number]['id'];

export const TEMPLATE_IMAGE_BLENDS = [
  { id: 'normal', label: 'Normal' },
  { id: 'multiply', label: 'Produit' },
  { id: 'screen', label: 'Superposition claire' },
  { id: 'overlay', label: 'Incrustation' },
  { id: 'soft-light', label: 'Lumière douce' },
  { id: 'color', label: 'Teinte' },
] as const;
export type TemplateImageBlend = (typeof TEMPLATE_IMAGE_BLENDS)[number]['id'];

export const TEMPLATE_IMAGE_FILTERS = [
  { id: 'none', label: 'Original', css: '' },
  { id: 'bw', label: 'Noir & blanc', css: 'grayscale(1) contrast(1.05)' },
  { id: 'sepia', label: 'Sépia', css: 'sepia(0.75) contrast(1.05)' },
  { id: 'warm', label: 'Chaud', css: 'sepia(0.25) saturate(1.3) hue-rotate(-8deg)' },
  { id: 'cool', label: 'Froid', css: 'saturate(0.9) hue-rotate(12deg) brightness(1.04)' },
  { id: 'vivid', label: 'Éclatant', css: 'saturate(1.45) contrast(1.1)' },
  { id: 'soft', label: 'Doux', css: 'brightness(1.08) contrast(0.9) saturate(0.85)' },
  { id: 'faded', label: 'Délavé', css: 'contrast(0.82) brightness(1.12) saturate(0.7)' },
  { id: 'dramatic', label: 'Contrasté', css: 'contrast(1.35) brightness(0.92) saturate(1.1)' },
] as const;
export type TemplateImageFilterId = (typeof TEMPLATE_IMAGE_FILTERS)[number]['id'];

export const TEMPLATE_IMAGE_ASPECTS = [
  { id: 'auto', label: 'Libre' },
  { id: '1/1', label: '1:1' },
  { id: '4/5', label: '4:5' },
  { id: '3/4', label: '3:4' },
  { id: '2/3', label: '2:3' },
  { id: '3/2', label: '3:2' },
  { id: '16/9', label: '16:9' },
] as const;
export type TemplateImageAspect = (typeof TEMPLATE_IMAGE_ASPECTS)[number]['id'];

/** Champs d’effets portés par un élément image (tous optionnels, rétrocompatibles). */
export interface TemplateImageEffects {
  imageShape?: TemplateImageShapeId;
  imageFade?: TemplateImageFadeId;
  /** Taille du fondu, en % de l’image (10–90). */
  imageFadeSize?: number;
  imageOverlayColor?: string;
  /** Seconde couleur du voile ; vide = transparent (dégradé vers l’image). */
  imageOverlayColor2?: string;
  imageOverlayDirection?: TemplateImageOverlayDirection;
  /** Opacité du voile (0–100). */
  imageOverlayOpacity?: number;
  imageOverlayBlend?: TemplateImageBlend;
  /** Zoom de cadrage (1–3). */
  imageZoom?: number;
  /** Point focal horizontal / vertical en % (0–100). */
  imageFocusX?: number;
  imageFocusY?: number;
  imageAspect?: TemplateImageAspect;
  imageFilter?: TemplateImageFilterId;
  /** Opacité de l’image (0–100). */
  imageOpacity?: number;
  /** Rotation en degrés (-180–180). */
  imageRotation?: number;
  imageFlipX?: boolean;
  imageShadow?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

const svgMask = (d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}' fill='black'/></svg>`,
  )}")`;

/** Bord festonné : demi-cercles autour d’un cercle. */
function scallopPath(bumps = 16, r = 44): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2 - Math.PI / 2;
    pts.push([50 + r * Math.cos(a), 50 + r * Math.sin(a)]);
  }
  const bumpR = (2 * r * Math.sin(Math.PI / bumps)) / 2 + 0.6;
  const f = (n: number) => n.toFixed(2);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 1; i <= bumps; i++) {
    const [x, y] = pts[i % bumps];
    d += ` A${f(bumpR)} ${f(bumpR)} 0 0 1 ${f(x)} ${f(y)}`;
  }
  return `${d} Z`;
}

const SHAPE_PATHS: Partial<Record<TemplateImageShapeId, string>> = {
  heart:
    'M50 95 C22 74 2 56 2 31 C2 14 15 3 29 3 C39 3 46 9 50 17 C54 9 61 3 71 3 C85 3 98 14 98 31 C98 56 78 74 50 95 Z',
  blob: 'M53 2 C72 2 89 13 96 31 C102 48 97 66 87 80 C76 95 57 100 40 97 C22 93 7 81 3 63 C-1 45 5 26 18 14 C28 5 40 2 53 2 Z',
  drop: 'M50 2 C50 2 90 44 90 66 C90 86 72 98 50 98 C28 98 10 86 10 66 C10 44 50 2 50 2 Z',
  scallop: scallopPath(),
};

/** Style de découpe (clip-path ou masque SVG) d’une forme. */
export function templateImageShapeStyle(shape?: string): CSSProperties {
  switch (shape) {
    case 'rounded':
      return { clipPath: 'inset(0 round 14%)' };
    case 'circle':
      return { clipPath: 'circle(50% at 50% 50%)', aspectRatio: '1 / 1' };
    case 'oval':
      return { clipPath: 'ellipse(50% 50% at 50% 50%)' };
    case 'arch':
      return { clipPath: 'inset(0 round 9999px 9999px 0 0)' };
    case 'star':
      return {
        clipPath:
          'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
      };
    case 'hexagon':
      return { clipPath: 'polygon(25% 3%, 75% 3%, 100% 50%, 75% 97%, 25% 97%, 0% 50%)' };
    case 'diamond':
      return { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' };
    case 'octagon':
      return { clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' };
    case 'triangle':
      return { clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' };
    default: {
      const d = shape ? SHAPE_PATHS[shape as TemplateImageShapeId] : undefined;
      if (!d) return {};
      const mask = svgMask(d);
      return {
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskSize: '100% 100%',
        maskSize: '100% 100%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      };
    }
  }
}

/** Masque de fondu vers la transparence (l’image se fond dans le fond de la carte). */
export function templateImageFadeStyle(fade?: string, size?: number): CSSProperties {
  if (!fade || fade === 'none') return {};
  const s = clamp(num(size, 40), 5, 95);
  const solid = 100 - s;
  let mask = '';
  switch (fade) {
    case 'bottom':
      mask = `linear-gradient(to bottom, #000 ${solid}%, transparent 100%)`;
      break;
    case 'top':
      mask = `linear-gradient(to top, #000 ${solid}%, transparent 100%)`;
      break;
    case 'left':
      mask = `linear-gradient(to left, #000 ${solid}%, transparent 100%)`;
      break;
    case 'right':
      mask = `linear-gradient(to right, #000 ${solid}%, transparent 100%)`;
      break;
    case 'vertical':
      mask = `linear-gradient(to bottom, transparent 0%, #000 ${s / 2}%, #000 ${100 - s / 2}%, transparent 100%)`;
      break;
    case 'edges':
      mask = `radial-gradient(ellipse 50% 50% at 50% 50%, #000 ${solid}%, transparent 100%)`;
      break;
    default:
      return {};
  }
  return { WebkitMaskImage: mask, maskImage: mask };
}

/** Voile dégradé posé sur l’image ; null s’il n’y a pas de voile. */
export function templateImageOverlayStyle(el: TemplateImageEffects): CSSProperties | null {
  const c1 = el.imageOverlayColor?.trim();
  if (!c1) return null;
  const opacity = clamp(num(el.imageOverlayOpacity, 60), 0, 100) / 100;
  if (opacity <= 0) return null;
  const c2 = el.imageOverlayColor2?.trim() || 'transparent';
  const dir = el.imageOverlayDirection || 'to bottom';
  const background =
    dir === 'radial'
      ? `radial-gradient(ellipse at center, ${c2} 0%, ${c1} 100%)`
      : `linear-gradient(${dir}, ${c2} 0%, ${c1} 100%)`;
  const blend = el.imageOverlayBlend && el.imageOverlayBlend !== 'normal' ? el.imageOverlayBlend : undefined;
  return { background, opacity, mixBlendMode: blend };
}

export function templateImageFilterCss(filter?: string): string {
  return TEMPLATE_IMAGE_FILTERS.find((f) => f.id === filter)?.css || '';
}

/** Vrai si l’élément utilise au moins un effet (sinon on garde le rendu historique). */
export function hasTemplateImageEffects(el: TemplateImageEffects): boolean {
  return Boolean(
    (el.imageShape && el.imageShape !== 'none') ||
      (el.imageFade && el.imageFade !== 'none') ||
      el.imageOverlayColor ||
      num(el.imageZoom, 1) !== 1 ||
      (el.imageFocusX !== undefined && el.imageFocusX !== 50) ||
      (el.imageFocusY !== undefined && el.imageFocusY !== 50) ||
      (el.imageAspect && el.imageAspect !== 'auto') ||
      (el.imageFilter && el.imageFilter !== 'none') ||
      (el.imageOpacity !== undefined && el.imageOpacity !== 100) ||
      num(el.imageRotation, 0) !== 0 ||
      el.imageFlipX ||
      el.imageShadow,
  );
}

export interface TemplateImageLayerStyles {
  /** Conteneur extérieur : rotation, opacité, ombre portée (suit la forme). */
  outer: CSSProperties;
  /** Cadre découpé : forme, format, recadrage. */
  frame: CSSProperties;
  /** Couche de fondu. */
  fade: CSSProperties;
  img: CSSProperties;
  overlay: CSSProperties | null;
}

/** Styles des couches du rendu d’une image avec effets. */
export function templateImageLayerStyles(
  el: TemplateImageEffects & { imageWidth?: string; imageHeight?: string; imageObjectFit?: string },
): TemplateImageLayerStyles {
  const zoom = clamp(num(el.imageZoom, 1), 1, 4);
  const fx = clamp(num(el.imageFocusX, 50), 0, 100);
  const fy = clamp(num(el.imageFocusY, 50), 0, 100);
  const rotation = clamp(num(el.imageRotation, 0), -180, 180);
  const opacity = clamp(num(el.imageOpacity, 100), 0, 100) / 100;
  const shape = templateImageShapeStyle(el.imageShape);
  const aspect = el.imageAspect && el.imageAspect !== 'auto' ? el.imageAspect.replace('/', ' / ') : undefined;
  const aspectRatio = (shape.aspectRatio as string | undefined) || aspect;
  const rawHeight = el.imageHeight?.trim();
  const fixedHeight = !aspectRatio && rawHeight && rawHeight !== 'auto' ? rawHeight : undefined;
  const fillsBox = Boolean(aspectRatio || fixedHeight);

  const transforms: string[] = [];
  if (zoom !== 1) transforms.push(`scale(${zoom})`);
  if (el.imageFlipX) transforms.push('scaleX(-1)');

  return {
    outer: {
      width: el.imageWidth || '100%',
      maxWidth: '100%',
      transform: rotation ? `rotate(${rotation}deg)` : undefined,
      opacity: opacity < 1 ? opacity : undefined,
      filter: el.imageShadow ? 'drop-shadow(0 10px 18px rgba(0,0,0,0.28))' : undefined,
    },
    frame: {
      position: 'relative',
      overflow: 'hidden',
      width: '100%',
      height: fixedHeight,
      ...shape,
      aspectRatio,
    },
    fade: {
      position: 'relative',
      width: '100%',
      height: fillsBox ? '100%' : undefined,
      ...templateImageFadeStyle(el.imageFade, el.imageFadeSize),
    },
    img: {
      display: 'block',
      width: '100%',
      height: fillsBox ? '100%' : 'auto',
      objectFit: (el.imageObjectFit as CSSProperties['objectFit']) || 'cover',
      objectPosition: `${fx}% ${fy}%`,
      transform: transforms.length ? transforms.join(' ') : undefined,
      transformOrigin: `${fx}% ${fy}%`,
      filter: templateImageFilterCss(el.imageFilter) || undefined,
    },
    overlay: templateImageOverlayStyle(el),
  };
}

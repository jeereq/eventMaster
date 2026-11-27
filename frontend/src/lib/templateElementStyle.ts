/**
 * Réglages communs à tous les éléments d’un modèle d’invitation : rotation, opacité,
 * ombre ou contour du texte, verrouillage. Appliqués sur le conteneur de l’élément
 * par l’éditeur, l’invitation invitée, l’impression et la vitrine.
 */
import type { CSSProperties } from 'react';

export const TEMPLATE_TEXT_SHADOWS = [
  { id: 'none', label: 'Aucune' },
  { id: 'soft', label: 'Douce' },
  { id: 'strong', label: 'Marquée' },
  { id: 'glow', label: 'Halo' },
  { id: 'outline', label: 'Contour' },
] as const;
export type TemplateTextShadowId = (typeof TEMPLATE_TEXT_SHADOWS)[number]['id'];

export interface TemplateElementEffects {
  /** Rotation en degrés (placement libre uniquement). */
  rotation?: number;
  /** Opacité de l’élément (0–100). */
  opacity?: number;
  textShadow?: TemplateTextShadowId;
  textShadowColor?: string;
  /** Verrouillé : ne se déplace ni ne se redimensionne plus dans l’éditeur. */
  locked?: boolean;
}

const HEX = /^#[0-9a-f]{3,8}$/i;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Convertit #rgb / #rrggbb en rgba(…, alpha). */
function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 && h.length !== 8) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function templateTextShadowCss(shadow?: string, color?: string): string | undefined {
  if (!shadow || shadow === 'none') return undefined;
  const c = color && HEX.test(color.trim()) ? color.trim() : undefined;
  switch (shadow) {
    case 'soft':
      return `0 1px 3px ${withAlpha(c || '#000000', 0.35)}`;
    case 'strong':
      return `0 2px 4px ${withAlpha(c || '#000000', 0.55)}, 0 4px 14px ${withAlpha(c || '#000000', 0.45)}`;
    case 'glow':
      return `0 0 6px ${withAlpha(c || '#ffffff', 0.95)}, 0 0 16px ${withAlpha(c || '#ffffff', 0.75)}`;
    case 'outline': {
      const o = c || '#ffffff';
      return `-1px -1px 0 ${o}, 1px -1px 0 ${o}, -1px 1px 0 ${o}, 1px 1px 0 ${o}, 0 0 2px ${o}`;
    }
    default:
      return undefined;
  }
}

/** Style à fusionner sur le conteneur d’un élément (rotation seulement en placement libre). */
export function templateElementWrapperStyle(el: TemplateElementEffects, free: boolean): CSSProperties {
  const style: CSSProperties = {};
  if (free && finite(el.rotation) && el.rotation % 360 !== 0) {
    style.transform = `rotate(${Math.max(-180, Math.min(180, el.rotation))}deg)`;
  }
  if (finite(el.opacity) && el.opacity < 100) {
    style.opacity = Math.max(0, Math.min(100, el.opacity)) / 100;
  }
  const shadow = templateTextShadowCss(el.textShadow, el.textShadowColor);
  if (shadow) style.textShadow = shadow;
  return style;
}

/** Aimante un angle sur les multiples de 45° à moins de `tolerance` degrés. */
export function snapAngle(deg: number, tolerance = 4): number {
  let a = ((deg + 180) % 360 + 360) % 360 - 180;
  const nearest = Math.round(a / 45) * 45;
  if (Math.abs(a - nearest) <= tolerance) a = nearest;
  if (a === -180) a = 180;
  return Math.round(a);
}

/** Taille de police mise à l’échelle (ex. « 16px » × 1,5 → « 24px »), bornée à 6–200 px. */
export function scaleFontSize(size: string | undefined, factor: number): string | undefined {
  const m = /^(\d+(?:\.\d+)?)px$/.exec((size || '').trim());
  if (!m) return size;
  const next = Math.max(6, Math.min(200, Math.round(parseFloat(m[1]) * factor)));
  return `${next}px`;
}

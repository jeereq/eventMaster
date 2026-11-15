/**
 * Placement des décors d’allée et de couloir : pétales semés au hasard (mais
 * toujours au même endroit pour un même élément), lanternes et appliques
 * espacées selon la longueur réelle.
 *
 * Module pur, testé avec `node --test`. L’allée court le long de Z (profondeur `d`).
 */

import { seededRandom } from './roomOutdoorUtils.ts';

/** Gris des couloirs créés avant les réglages : traité comme « pas de teinte choisie ». */
export const LEGACY_CORRIDOR_GREY = '#d6d3d1';

export interface AislePetal {
  x: number;
  z: number;
  /** Rotation autour de la verticale (rad). */
  rot: number;
  /** Rayon du pétale (m). */
  size: number;
  /** 0–1 : nuance de la couleur (plus clair / plus foncé). */
  tone: number;
}

/** Pétales par m² au réglage maximal. */
export const PETALS_PER_M2_MAX = 60;
const PETAL_CAP = 600;

/**
 * Pétales semés sur l’allée. `density` 0–1 (0,35 par défaut ≈ 21 / m²).
 * Les pétales se raréfient vers les bords, comme lancés par les enfants d’honneur.
 */
export function aislePetals(w: number, d: number, density: number, seed: number): AislePetal[] {
  if (!(w > 0) || !(d > 0)) return [];
  const dens = Math.max(0, Math.min(1, density));
  const count = Math.min(PETAL_CAP, Math.round(w * d * dens * PETALS_PER_M2_MAX));
  const rand = seededRandom(seed);
  const out: AislePetal[] = [];
  for (let i = 0; i < count; i += 1) {
    // Somme de deux tirages : concentration au centre de la largeur.
    const across = (rand() + rand()) / 2 - 0.5;
    out.push({
      x: across * w * 0.92,
      z: (rand() - 0.5) * d * 0.96,
      rot: rand() * Math.PI * 2,
      size: 0.022 + rand() * 0.02,
      tone: rand(),
    });
  }
  return out;
}

/**
 * Positions (Z, centrées) de lanternes ou d’appliques espacées d’environ
 * `spacingM` mètres le long d’une longueur `lengthM`. Au moins une ; jamais
 * collées aux extrémités.
 */
export function evenlySpacedOffsets(lengthM: number, spacingM: number): number[] {
  if (!(lengthM > 0)) return [];
  const spacing = Math.max(0.5, Number.isFinite(spacingM) ? spacingM : 2);
  const count = Math.max(1, Math.min(60, Math.round(lengthM / spacing)));
  return Array.from({ length: count }, (_, i) => Math.round(((i + 0.5) / count - 0.5) * lengthM * 1000) / 1000);
}

/** Éclaircit (t > 0) ou assombrit (t < 0) une couleur hexadécimale. */
export function shadeHex(hex: string, t: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const k = Math.max(-1, Math.min(1, t));
  const ch = (v: number) => Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

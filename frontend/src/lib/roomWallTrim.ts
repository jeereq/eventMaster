/**
 * Décor de menuiserie des murs (boiseries, cimaise, moulures à la française, pilastres).
 *
 * Calcule, sans three.js, les pièces à poser sur la face intérieure d'un mur en évitant
 * portes et fenêtres. Repère : x le long du mur (centre = 0), y depuis le sol,
 * `d` = saillie de la pièce depuis la face du mur.
 */

import type { RoomWallOpening } from './roomLayoutUtils.ts';

/** Teinte des boiseries peintes par défaut (blanc cassé satiné). */
export const WALL_TRIM_DEFAULT_COLOR = '#efebe4';

export type WallTrimStyle = 'standard' | 'none' | 'chairRail' | 'wainscot' | 'frames' | 'pilasters';

export const WALL_TRIM_STYLES: WallTrimStyle[] = ['standard', 'chairRail', 'wainscot', 'frames', 'pilasters', 'none'];

export const WALL_TRIM_LABELS: Record<WallTrimStyle, string> = {
  standard: 'Plinthe et corniche',
  chairRail: 'Cimaise',
  wainscot: 'Boiserie basse',
  frames: 'Moulures à la française',
  pilasters: 'Pilastres',
  none: 'Mur nu',
};

export const WALL_TRIM_HINTS: Record<WallTrimStyle, string> = {
  standard: 'Plinthe au sol et corniche sous le plafond.',
  chairRail: 'Ajoute une moulure horizontale à hauteur d’appui (90 cm).',
  wainscot: 'Lambris à panneaux en relief jusqu’à 1 m, coiffé d’une cimaise.',
  frames: 'Cadres moulurés sous et au-dessus de la cimaise, style salon haussmannien.',
  pilasters: 'Colonnes plates à base et chapiteau, régulièrement espacées.',
  none: 'Ni plinthe ni corniche : mur brut ou industriel.',
};

/** Pièce de menuiserie : centre (x, y), largeur, hauteur, saillie. */
export interface TrimBox {
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
}

/** Ligne de moulure filante (cimaise) de x0 à x1, à la hauteur y. */
export interface TrimRun {
  x0: number;
  x1: number;
  y: number;
}

export interface WallTrimLayout {
  boxes: TrimBox[];
  rails: TrimRun[];
}

export function normalizeWallTrim(value: unknown): WallTrimStyle {
  return typeof value === 'string' && (WALL_TRIM_STYLES as string[]).includes(value) ? (value as WallTrimStyle) : 'standard';
}

export function wallTrimHasBaseAndCornice(style: WallTrimStyle | undefined): boolean {
  return style !== 'none';
}

/** Hauteur de la cimaise : 90 cm, abaissée dans les murs bas. */
export function chairRailHeight(wallH: number): number {
  return Math.min(0.9, Math.max(0.5, wallH * 0.32));
}

type OpeningLike = Pick<RoomWallOpening, 'kind' | 't' | 'widthM' | 'heightM' | 'sillM'>;

/** Bande [a, b] le long du mur occupée par une ouverture qui coupe la tranche de hauteur [y0, y1]. */
function blockedSpans(openings: OpeningLike[], length: number, y0: number, y1: number, margin: number): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const op of openings) {
    const sill = op.sillM ?? (op.kind === 'door' ? 0 : 0.9);
    const top = sill + op.heightM;
    if (top <= y0 - margin || sill >= y1 + margin) continue;
    const w = Math.min(op.widthM, length * 0.85);
    const cx = (op.t - 0.5) * length;
    spans.push([cx - w / 2 - margin, cx + w / 2 + margin]);
  }
  return spans.sort((p, q) => p[0] - q[0]);
}

/** Tronçons libres du mur (de gauche à droite) sur la tranche [y0, y1], au moins `minLen` de long. */
export function freeRuns(openings: OpeningLike[], length: number, y0: number, y1: number, margin = 0.1, minLen = 0.05): Array<[number, number]> {
  const half = length / 2;
  const runs: Array<[number, number]> = [];
  let x = -half;
  for (const [a, b] of blockedSpans(openings, length, y0, y1, margin)) {
    if (a > x) runs.push([x, Math.min(a, half)]);
    x = Math.max(x, b);
  }
  if (x < half) runs.push([x, half]);
  return runs.filter(([a, b]) => b - a >= minLen);
}

/** Découpe un tronçon en `n` panneaux de largeur proche de `target`, séparés par `gap`. */
function panelSlots(a: number, b: number, target: number, gap: number): Array<[number, number]> {
  const len = b - a;
  if (len < gap * 2 + 0.2) return [];
  const n = Math.max(1, Math.round((len - gap) / (target + gap)));
  const w = (len - gap * (n + 1)) / n;
  if (w < 0.18) return [];
  return Array.from({ length: n }, (_, i) => {
    const x0 = a + gap + i * (w + gap);
    return [x0, x0 + w] as [number, number];
  });
}

/** Cadre mouluré : quatre baguettes autour du rectangle [x0, x1] × [y0, y1]. */
function frame(out: TrimBox[], x0: number, x1: number, y0: number, y1: number, bar: number, d: number) {
  const w = x1 - x0;
  const h = y1 - y0;
  out.push({ x: (x0 + x1) / 2, y: y1 - bar / 2, w, h: bar, d });
  out.push({ x: (x0 + x1) / 2, y: y0 + bar / 2, w, h: bar, d });
  out.push({ x: x0 + bar / 2, y: (y0 + y1) / 2, w: bar, h: h - 2 * bar, d });
  out.push({ x: x1 - bar / 2, y: (y0 + y1) / 2, w: bar, h: h - 2 * bar, d });
}

const PLINTH_TOP = 0.1;
const CORNICE_H = 0.08;

/**
 * Pièces de décor pour un style donné. `standard` et `none` n'ajoutent rien ici :
 * plinthe et corniche sont dessinées à part (et retirées pour `none`).
 */
export function wallTrimLayout(style: WallTrimStyle | undefined, length: number, wallH: number, openings: OpeningLike[] = []): WallTrimLayout {
  const boxes: TrimBox[] = [];
  const rails: TrimRun[] = [];
  if (!style || style === 'standard' || style === 'none' || length < 0.3 || wallH < 1.2) return { boxes, rails };
  const railY = chairRailHeight(wallH);

  const addRail = (y: number) => {
    for (const [a, b] of freeRuns(openings, length, y - 0.04, y + 0.04, 0.08)) rails.push({ x0: a, x1: b, y });
  };

  if (style === 'chairRail') {
    addRail(railY);
  } else if (style === 'wainscot') {
    // Lambris : fond plein, panneaux à plate-bande encadrés, cimaise en couronnement.
    const top = railY + 0.08;
    for (const [a, b] of freeRuns(openings, length, 0, top, 0.08)) {
      const h = top - PLINTH_TOP;
      boxes.push({ x: (a + b) / 2, y: PLINTH_TOP + h / 2, w: b - a, h, d: 0.012 });
      for (const [x0, x1] of panelSlots(a, b, 0.7, 0.1)) {
        const y0 = PLINTH_TOP + 0.09;
        const y1 = top - 0.1;
        if (y1 - y0 < 0.2) continue;
        frame(boxes, x0, x1, y0, y1, 0.025, 0.026);
        // Plate-bande en relief au centre du panneau.
        boxes.push({ x: (x0 + x1) / 2, y: (y0 + y1) / 2, w: x1 - x0 - 0.12, h: y1 - y0 - 0.12, d: 0.02 });
      }
    }
    addRail(top);
  } else if (style === 'frames') {
    addRail(railY);
    const bands: Array<[number, number]> = [
      [PLINTH_TOP + 0.12, railY - 0.12],
      [railY + 0.2, wallH - CORNICE_H - 0.28],
    ];
    for (const [y0, y1] of bands) {
      if (y1 - y0 < 0.25) continue;
      for (const [a, b] of freeRuns(openings, length, y0, y1, 0.12)) {
        for (const [x0, x1] of panelSlots(a, b, 1.1, 0.22)) frame(boxes, x0, x1, y0, y1, 0.03, 0.018);
      }
    }
  } else if (style === 'pilasters') {
    const shaftW = 0.3;
    const top = wallH - CORNICE_H;
    for (const [a, b] of freeRuns(openings, length, 0, top, 0.06)) {
      const len = b - a;
      if (len < shaftW + 0.1) continue;
      const usable = len - shaftW - 0.1;
      const n = Math.max(1, Math.round(usable / 2.8) + 1);
      for (let i = 0; i < n; i += 1) {
        const x = n === 1 ? (a + b) / 2 : a + 0.05 + shaftW / 2 + (usable * i) / (n - 1);
        // Base, fût, astragale et chapiteau.
        boxes.push({ x, y: 0.14, w: shaftW + 0.1, h: 0.28, d: 0.06 });
        boxes.push({ x, y: (0.28 + top - 0.22) / 2, w: shaftW, h: top - 0.22 - 0.28, d: 0.04 });
        boxes.push({ x, y: top - 0.24, w: shaftW + 0.04, h: 0.04, d: 0.05 });
        boxes.push({ x, y: top - 0.11, w: shaftW + 0.12, h: 0.18, d: 0.07 });
      }
    }
  }
  return { boxes, rails };
}

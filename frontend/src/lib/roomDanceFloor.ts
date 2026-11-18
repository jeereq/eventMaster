/**
 * Pistes de danse : styles (classique, dalles LED animées, ciel étoilé, laqué noir ou blanc),
 * motifs des dalles LED, monogramme central et boule à facettes. Module pur (sans three.js).
 */

export type DanceFloorStyle = 'classic' | 'ledTiles' | 'starlit' | 'blackGloss' | 'whiteGloss';
export type DanceLedPattern = 'rainbow' | 'disco' | 'wave' | 'checker' | 'ripple';

export const DANCE_FLOOR_STYLE_LABELS: Record<DanceFloorStyle, string> = {
  classic: 'Classique (matière choisie)',
  ledTiles: 'Dalles LED animées',
  starlit: 'Ciel étoilé (noir scintillant)',
  blackGloss: 'Noir laqué miroir',
  whiteGloss: 'Blanc laqué (mariage)',
};

export const DANCE_LED_PATTERN_LABELS: Record<DanceLedPattern, string> = {
  rainbow: 'Arc-en-ciel qui défile',
  disco: 'Disco 70’s',
  wave: 'Vague de couleur',
  checker: 'Damier alterné',
  ripple: 'Onde depuis le centre',
};

export type DanceTile = { i: number; j: number; x: number; z: number; size: number };

/** Dalles carrées (~`tileM` m) qui remplissent la piste w × h, centrées sur l’origine. */
export function danceTileGrid(w: number, h: number, tileM = 0.6): { nx: number; nz: number; tiles: DanceTile[] } {
  const nx = Math.max(1, Math.min(40, Math.round(w / tileM)));
  const nz = Math.max(1, Math.min(40, Math.round(h / tileM)));
  const sx = w / nx;
  const sz = h / nz;
  const tiles: DanceTile[] = [];
  for (let i = 0; i < nx; i += 1) {
    for (let j = 0; j < nz; j += 1) {
      tiles.push({ i, j, x: -w / 2 + (i + 0.5) * sx, z: -h / 2 + (j + 0.5) * sz, size: Math.min(sx, sz) });
    }
  }
  return { nx, nz, tiles };
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const hh = ((h % 1) + 1) % 1;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hh * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0.55, 0.36, 0.96];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Petit hachage déterministe → [0, 1). */
function hash(a: number, b: number, c = 0): number {
  const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Couleur (0..1) d’une dalle LED au temps `t` (s). `base` sert aux motifs monochromes
 * (vague, damier, onde) ; arc-en-ciel et disco ignorent la teinte.
 */
export function danceTileColor(pattern: DanceLedPattern, t: number, tile: Pick<DanceTile, 'i' | 'j'>, nx: number, nz: number, base = '#8b5cf6'): [number, number, number] {
  const { i, j } = tile;
  const b = hexToRgb(base);
  const scale = (k: number): [number, number, number] => [b[0] * k, b[1] * k, b[2] * k];
  switch (pattern) {
    case 'rainbow':
      return hsl((i + j) / (nx + nz) - t * 0.18, 0.95, 0.52);
    case 'disco': {
      // Change toutes les 0,5 s, couleurs franches tirées au hasard pour chaque dalle.
      const step = Math.floor(t * 2);
      const r = hash(i, j, step);
      if (r < 0.18) return [0.04, 0.04, 0.05];
      return hsl(Math.floor(hash(j, i, step + 7) * 6) / 6, 1, 0.5);
    }
    case 'wave': {
      const k = 0.15 + 0.85 * (0.5 + 0.5 * Math.sin((i / Math.max(1, nx)) * Math.PI * 2 - t * 2.4));
      return scale(k);
    }
    case 'checker': {
      const on = ((i + j) % 2 === 0) === (Math.floor(t * 1.2) % 2 === 0);
      return on ? scale(1) : [0.05, 0.05, 0.06];
    }
    case 'ripple':
    default: {
      const cx = (nx - 1) / 2;
      const cz = (nz - 1) / 2;
      const d = Math.hypot(i - cx, j - cz);
      const k = 0.1 + 0.9 * Math.pow(0.5 + 0.5 * Math.cos(d * 0.9 - t * 3.2), 2);
      return scale(k);
    }
  }
}

/** Points lumineux d’une piste « ciel étoilé » (déterministes), avec phase de scintillement. */
export function starlitPoints(w: number, h: number, densityPerM2 = 9): Array<{ x: number; z: number; phase: number; size: number }> {
  const n = Math.max(12, Math.min(1600, Math.round(w * h * densityPerM2)));
  return Array.from({ length: n }, (_, k) => ({
    x: (hash(k, 1) - 0.5) * (w - 0.08),
    z: (hash(k, 2) - 0.5) * (h - 0.08),
    phase: hash(k, 3) * Math.PI * 2,
    size: 0.008 + hash(k, 4) * 0.014,
  }));
}

/** Monogramme : initiales nettoyées (lettres, chiffres, « & », espaces), 12 caractères au plus. */
export function sanitizeMonogram(text: string | undefined): string {
  return (text ?? '')
    .replace(/[^\p{L}\p{N}&+ .'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12)
    .trim();
}

/**
 * Jeux de lumière LED : uplights au pied des murs et bandeau LED en corniche, en couleur fixe
 * ou animés (arc-en-ciel, pulsation, chenillard, disco). Fonctions pures, testées : le rendu 3D
 * n’applique que la couleur et l’intensité calculées ici à chaque image.
 */

export type LedShowMode = 'off' | 'static' | 'rainbow' | 'pulse' | 'chase' | 'disco' | 'twinkle';

export interface LedShowSettings {
  mode: LedShowMode;
  /** Couleur de base (fixe, pulsation, chenillard, scintillement). */
  color: string;
  /** Vitesse 0,2 (lent) à 3 (rapide). */
  speed: number;
  /** Uplights au pied des murs. */
  uplights: boolean;
  /** Bandeau LED sous la corniche, tout autour de la salle. */
  cove: boolean;
}

export const LED_SHOW_MODE_LABELS: Record<LedShowMode, string> = {
  off: 'Éteint',
  static: 'Couleur fixe',
  rainbow: 'Arc-en-ciel',
  pulse: 'Pulsation',
  chase: 'Chenillard',
  disco: 'Disco',
  twinkle: 'Scintillement',
};

export const LED_COLOR_PRESETS: Array<{ id: string; label: string; color: string }> = [
  { id: 'gold', label: 'Or chaud', color: '#ffb347' },
  { id: 'violet', label: 'Violet', color: '#8b5cf6' },
  { id: 'blue', label: 'Bleu nuit', color: '#2563eb' },
  { id: 'pink', label: 'Rose', color: '#ec4899' },
  { id: 'cyan', label: 'Turquoise', color: '#06b6d4' },
  { id: 'red', label: 'Rouge', color: '#ef4444' },
  { id: 'green', label: 'Vert', color: '#22c55e' },
  { id: 'white', label: 'Blanc', color: '#f8fafc' },
];

export const DEFAULT_LED_SHOW: LedShowSettings = { mode: 'off', color: '#8b5cf6', speed: 1, uplights: true, cove: true };

const MODES = new Set<LedShowMode>(['off', 'static', 'rainbow', 'pulse', 'chase', 'disco', 'twinkle']);

export function resolveLedShow(raw?: Partial<LedShowSettings> | null): LedShowSettings {
  const mode = raw?.mode && MODES.has(raw.mode) ? raw.mode : 'off';
  const color = typeof raw?.color === 'string' && /^#[0-9a-f]{6}$/i.test(raw.color) ? raw.color : DEFAULT_LED_SHOW.color;
  const speed = typeof raw?.speed === 'number' && Number.isFinite(raw.speed) ? Math.min(3, Math.max(0.2, raw.speed)) : 1;
  return { mode, color, speed, uplights: raw?.uplights !== false, cove: raw?.cove !== false };
}

export function isLedShowOn(show: LedShowSettings): boolean {
  return show.mode !== 'off' && (show.uplights || show.cove);
}

/** Les modes animés demandent un rendu à chaque image. */
export function isLedShowAnimated(show: LedShowSettings): boolean {
  return show.mode !== 'off' && show.mode !== 'static';
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h * 12) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** Bruit stable par lampe et par pas de temps (disco, scintillement). */
function hash01(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
  h ^= h >>> 13;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Couleur (r, g, b entre 0 et 1) et intensité (0 à 1) de la lampe `index` sur `count`
 * au temps `time` (secondes).
 */
export function ledColorAt(show: LedShowSettings, time: number, index: number, count: number): { rgb: [number, number, number]; intensity: number } {
  const base = hexToRgb(show.color);
  const n = Math.max(1, count);
  const s = show.speed;
  switch (show.mode) {
    case 'off':
      return { rgb: base, intensity: 0 };
    case 'static':
      return { rgb: base, intensity: 1 };
    case 'rainbow':
      return { rgb: hslToRgb(((time * s * 0.08 + index / n) % 1 + 1) % 1, 0.9, 0.55), intensity: 1 };
    case 'pulse':
      return { rgb: base, intensity: 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * s * 2.4)) };
    case 'chase': {
      const head = (time * s * 0.35 * n) % n;
      const d = Math.min(Math.abs(index - head), n - Math.abs(index - head));
      return { rgb: base, intensity: 0.12 + 0.88 * Math.max(0, 1 - d / Math.max(1.5, n * 0.18)) };
    }
    case 'disco': {
      const step = Math.floor(time * s * 2.2);
      return { rgb: hslToRgb(hash01(index, step), 1, 0.55), intensity: 0.55 + 0.45 * hash01(index + 97, step) };
    }
    case 'twinkle': {
      const phase = hash01(index, 7) * Math.PI * 2;
      const tw = 0.5 + 0.5 * Math.sin(time * s * (1.5 + hash01(index, 11) * 2.5) + phase);
      return { rgb: base, intensity: 0.25 + 0.75 * tw * tw };
    }
    default:
      return { rgb: base, intensity: 1 };
  }
}

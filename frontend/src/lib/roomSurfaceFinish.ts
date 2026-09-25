'use client';

/**
 * Textures de détail procédurales (bois, métal brossé, tissus, cuir…) pour le mobilier 3D.
 *
 * - Générées une seule fois sur canvas, en niveaux de gris neutres : la couleur vient du matériau,
 *   donc une texture sert toutes les teintes (peu de mémoire GPU, OK mobile).
 * - Bruit « value noise » périodique : chaque texture boucle sans raccord.
 * - Générateur pseudo-aléatoire à graine : rendu identique d'une session à l'autre.
 */

import * as THREE from 'three';

export type DetailKind =
  | 'woodGrain'
  | 'brushedMetal'
  | 'fabricWeave'
  | 'linen'
  | 'velvet'
  | 'leather'
  | 'suede'
  | 'boucle'
  | 'mesh'
  | 'rattan'
  | 'plaster'
  | 'stoneGrain';

export type DetailSet = {
  /** Albédo neutre (≈ 0,8 – 1) à multiplier par la couleur du matériau. */
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  /** Canal vert = multiplicateur de rugosité. */
  roughnessMap: THREE.Texture | null;
  /** Force conseillée de la carte de normales. */
  normalScale: number;
};

type Field = Float32Array;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bruit de valeur périodique : `cellsX` × `cellsY` cellules sur la texture (entiers → raccord parfait). */
function valueNoise(size: number, cellsX: number, cellsY: number, seed: number): Field {
  const rand = mulberry32(seed);
  const lattice = new Float32Array(cellsX * cellsY);
  for (let i = 0; i < lattice.length; i += 1) lattice[i] = rand();
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    const fy = (y / size) * cellsY;
    const y0 = Math.floor(fy);
    const ty = fy - y0;
    const sy = ty * ty * (3 - 2 * ty);
    const r0 = (y0 % cellsY) * cellsX;
    const r1 = ((y0 + 1) % cellsY) * cellsX;
    for (let x = 0; x < size; x += 1) {
      const fx = (x / size) * cellsX;
      const x0 = Math.floor(fx);
      const tx = fx - x0;
      const sx = tx * tx * (3 - 2 * tx);
      const c0 = x0 % cellsX;
      const c1 = (x0 + 1) % cellsX;
      const a = lattice[r0 + c0] + (lattice[r0 + c1] - lattice[r0 + c0]) * sx;
      const b = lattice[r1 + c0] + (lattice[r1 + c1] - lattice[r1 + c0]) * sx;
      out[y * size + x] = a + (b - a) * sy;
    }
  }
  return out;
}

/** Somme d'octaves périodiques, normalisée dans [0, 1]. */
function fbm(size: number, cellsX: number, cellsY: number, octaves: number, seed: number, gain = 0.5): Field {
  const out = new Float32Array(size * size);
  let amp = 1;
  let cx = cellsX;
  let cy = cellsY;
  for (let o = 0; o < octaves; o += 1) {
    const n = valueNoise(size, Math.min(size, cx), Math.min(size, cy), seed + o * 101);
    for (let i = 0; i < out.length; i += 1) out[i] += n[i] * amp;
    amp *= gain;
    cx *= 2;
    cy *= 2;
  }
  return normalize(out);
}

function normalize(f: Field): Field {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < f.length; i += 1) {
    if (f[i] < min) min = f[i];
    if (f[i] > max) max = f[i];
  }
  const span = max - min || 1;
  for (let i = 0; i < f.length; i += 1) f[i] = (f[i] - min) / span;
  return f;
}

/** Voronoï périodique (distance au germe le plus proche), pour cuir et bouclette. */
function cellular(size: number, cells: number, seed: number): Field {
  const rand = mulberry32(seed);
  const pts: Array<[number, number]> = [];
  for (let gy = 0; gy < cells; gy += 1) {
    for (let gx = 0; gx < cells; gx += 1) pts.push([(gx + rand()) / cells, (gy + rand()) / cells]);
  }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    const gy = Math.floor(v * cells);
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const gx = Math.floor(u * cells);
      let best = Infinity;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const cxI = (gx + ox + cells) % cells;
          const cyI = (gy + oy + cells) % cells;
          const [px, py] = pts[cyI * cells + cxI];
          let dx = Math.abs(u - px);
          let dy = Math.abs(v - py);
          dx = Math.min(dx, 1 - dx);
          dy = Math.min(dy, 1 - dy);
          const d = dx * dx + dy * dy;
          if (d < best) best = d;
        }
      }
      out[y * size + x] = Math.sqrt(best) * cells;
    }
  }
  return normalize(out);
}

function fieldToTexture(size: number, fill: (i: number) => [number, number, number], srgb: boolean): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < size * size; i += 1) {
      const [r, g, b] = fill(i);
      img.data[i * 4] = Math.round(Math.min(1, Math.max(0, r)) * 255);
      img.data[i * 4 + 1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
      img.data[i * 4 + 2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function grayTexture(size: number, f: Field, lo: number, hi: number, srgb = true): THREE.Texture {
  return fieldToTexture(size, (i) => {
    const v = lo + (hi - lo) * f[i];
    return [v, v, v];
  }, srgb);
}

/** Normales tangentielles (convention OpenGL de three.js) depuis un champ de hauteur périodique. */
function normalTexture(size: number, h: Field, strength: number): THREE.Texture {
  return fieldToTexture(size, (i) => {
    const x = i % size;
    const y = (i - x) / size;
    const l = h[y * size + ((x - 1 + size) % size)];
    const r = h[y * size + ((x + 1) % size)];
    const t = h[((y - 1 + size) % size) * size + x];
    const b = h[((y + 1) % size) * size + x];
    let nx = (l - r) * strength;
    let ny = (b - t) * strength;
    let nz = 1;
    const len = Math.hypot(nx, ny, nz);
    nx /= len;
    ny /= len;
    nz /= len;
    return [nx * 0.5 + 0.5, ny * 0.5 + 0.5, nz * 0.5 + 0.5];
  }, false);
}

function buildDetail(kind: DetailKind): DetailSet {
  switch (kind) {
    case 'woodGrain': {
      const size = 512;
      const fibers = fbm(size, 2, 64, 4, 11);
      const warp = fbm(size, 1, 3, 3, 12);
      const pores = fbm(size, 8, 160, 2, 13);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) {
        const y = Math.floor(i / size) / size;
        const ring = 0.5 + 0.5 * Math.sin(2 * Math.PI * (y * 12 + (warp[i] - 0.5) * 0.9));
        h[i] = 0.34 * ring ** 2 + 0.5 * fibers[i] + 0.16 * pores[i];
      }
      normalize(h);
      return {
        // Contraste modéré : veinage lisible sans effet « zébrano » sur les grands panneaux.
        map: grayTexture(size, h, 0.8, 1),
        normalMap: normalTexture(size, h, 2.2),
        roughnessMap: grayTexture(size, h, 1, 0.82, false),
        normalScale: 0.35,
      };
    }
    case 'brushedMetal': {
      const size = 256;
      const streaks = fbm(size, 1, 96, 3, 21);
      const spots = fbm(size, 4, 4, 3, 22);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) h[i] = streaks[i] * 0.85 + spots[i] * 0.15;
      return {
        map: null,
        normalMap: normalTexture(size, streaks, 1.2),
        roughnessMap: grayTexture(size, h, 0.72, 1.05, false),
        normalScale: 0.12,
      };
    }
    case 'fabricWeave':
    case 'linen': {
      const size = 256;
      const threads = kind === 'linen' ? 48 : 32;
      const slubX = fbm(size, 2, 48, 3, 31);
      const slubY = fbm(size, 48, 2, 3, 32);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) {
        const x = i % size;
        const y = (i - x) / size;
        const u = (x / size) * threads;
        const v = (y / size) * threads;
        const over = (Math.floor(u) + Math.floor(v)) % 2 === 0;
        const warpT = Math.sin(Math.PI * (u % 1));
        const weftT = Math.sin(Math.PI * (v % 1));
        h[i] = (over ? warpT : weftT) * 0.8 + (slubX[i] + slubY[i]) * 0.1;
      }
      normalize(h);
      return {
        map: grayTexture(size, h, 0.8, 1),
        normalMap: normalTexture(size, h, 2.4),
        roughnessMap: null,
        normalScale: 0.55,
      };
    }
    case 'velvet': {
      const size = 256;
      const crush = fbm(size, 3, 3, 4, 41);
      const nap = fbm(size, 64, 64, 2, 42);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) h[i] = crush[i] * 0.8 + nap[i] * 0.2;
      normalize(h);
      return {
        map: grayTexture(size, h, 0.74, 1),
        normalMap: normalTexture(size, nap, 1.2),
        roughnessMap: null,
        normalScale: 0.2,
      };
    }
    case 'leather': {
      const size = 256;
      const cells = cellular(size, 22, 51);
      const soft = fbm(size, 4, 4, 3, 52);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) h[i] = Math.sqrt(cells[i]) * 0.8 + soft[i] * 0.2;
      normalize(h);
      return {
        map: grayTexture(size, soft, 0.86, 1),
        normalMap: normalTexture(size, h, 3.2),
        roughnessMap: grayTexture(size, h, 0.8, 1, false),
        normalScale: 0.5,
      };
    }
    case 'suede': {
      const size = 256;
      const fine = fbm(size, 64, 64, 2, 61);
      const patch = fbm(size, 3, 3, 3, 62);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) h[i] = fine[i] * 0.5 + patch[i] * 0.5;
      normalize(h);
      return {
        map: grayTexture(size, h, 0.8, 1),
        normalMap: normalTexture(size, fine, 1.6),
        roughnessMap: null,
        normalScale: 0.3,
      };
    }
    case 'boucle': {
      const size = 256;
      const loops = cellular(size, 36, 71);
      const n = fbm(size, 16, 16, 3, 72);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) h[i] = (1 - loops[i]) * 0.7 + n[i] * 0.3;
      normalize(h);
      return {
        map: grayTexture(size, h, 0.78, 1),
        normalMap: normalTexture(size, h, 4),
        roughnessMap: null,
        normalScale: 0.9,
      };
    }
    case 'mesh': {
      const size = 256;
      const cells = 24;
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) {
        const x = i % size;
        const y = (i - x) / size;
        const u = ((x / size) * cells) % 1;
        const v = ((y / size) * cells) % 1;
        const hole = Math.min(u, 1 - u, v, 1 - v);
        h[i] = Math.min(1, hole * 6);
      }
      return {
        map: grayTexture(size, h, 1, 0.55),
        normalMap: normalTexture(size, h, 2.4),
        roughnessMap: null,
        normalScale: 0.6,
      };
    }
    case 'rattan': {
      const size = 256;
      const cells = 12;
      const fib = fbm(size, 4, 64, 2, 81);
      const h = new Float32Array(size * size);
      for (let i = 0; i < h.length; i += 1) {
        const x = i % size;
        const y = (i - x) / size;
        const u = (x / size) * cells;
        const v = (y / size) * cells;
        const a = (u + v) % 1;
        const b = (u - v + cells) % 1;
        const over = (Math.floor(u + v) + Math.floor(u - v + cells)) % 2 === 0;
        const strand = Math.sin(Math.PI * (over ? a : b));
        h[i] = strand * 0.85 + fib[i] * 0.15;
      }
      normalize(h);
      return {
        map: grayTexture(size, h, 0.62, 1),
        normalMap: normalTexture(size, h, 3),
        roughnessMap: null,
        normalScale: 0.8,
      };
    }
    case 'plaster': {
      const size = 256;
      const h = fbm(size, 6, 6, 5, 91, 0.55);
      return {
        map: null,
        normalMap: normalTexture(size, h, 1.8),
        roughnessMap: null,
        normalScale: 0.35,
      };
    }
    case 'stoneGrain':
    default: {
      const size = 256;
      const h = fbm(size, 8, 8, 5, 101, 0.6);
      return {
        map: grayTexture(size, h, 0.86, 1),
        normalMap: normalTexture(size, h, 2),
        roughnessMap: grayTexture(size, h, 0.85, 1, false),
        normalScale: 0.4,
      };
    }
  }
}

const detailCache = new Map<DetailKind, DetailSet>();
const EMPTY: DetailSet = { map: null, normalMap: null, roughnessMap: null, normalScale: 0 };

/** Jeu de textures de détail (singleton, créé à la première demande). */
export function getDetailSet(kind: DetailKind): DetailSet {
  if (typeof document === 'undefined') return EMPTY;
  const cached = detailCache.get(kind);
  if (cached) return cached;
  const set = buildDetail(kind);
  detailCache.set(kind, set);
  return set;
}

const repeatCache = new Map<string, THREE.Texture>();

/**
 * Même image, autre répétition (et éventuellement tournée d'un quart de tour, ex. veinage vertical
 * sur un montant) : clone léger, la source GPU est partagée.
 */
export function withRepeat(tex: THREE.Texture | null, rx: number, ry: number, quarterTurn = false): THREE.Texture | null {
  if (!tex) return null;
  if (rx === 1 && ry === 1 && !quarterTurn) return tex;
  const key = `${tex.uuid}|${rx.toFixed(2)}|${ry.toFixed(2)}|${quarterTurn ? 'r' : ''}`;
  const cached = repeatCache.get(key);
  if (cached) return cached;
  const clone = tex.clone();
  clone.repeat.set(rx, ry);
  if (quarterTurn) {
    clone.center.set(0.5, 0.5);
    clone.rotation = Math.PI / 2;
  }
  repeatCache.set(key, clone);
  return clone;
}

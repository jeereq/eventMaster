'use client';

/**
 * Textures importées par l’utilisateur (sol, plateau, assise, tapis d’allée…) :
 * chaque image est traitée une seule fois dans le navigateur pour se comporter
 * comme une vraie matière (voir `roomImportedTextureMath.ts`) :
 * recadrée en carré de 2 048 px, bouclable sans quadrillage, avec une carte de normales
 * (relief du grain) et une carte de rugosité (creux mats, reliefs brillants).
 *
 * Les textures rendues sont des copies qui partagent la même image : une seule
 * mise en mémoire graphique par photo, quelle que soit la répétition demandée.
 */

import * as THREE from 'three';
import {
  makeSeamless,
  normalMapFromHeight,
  reliefFromRgba,
  roughnessFromRelief,
} from './roomImportedTextureMath.ts';

export interface ImportedTextureSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

export interface ImportedTextureOptions {
  repeatX?: number;
  repeatY?: number;
  /** Fondre les bords pour une répétition sans raccord (défaut : oui). */
  seamless?: boolean;
  /** Écart de rugosité entre creux et reliefs (0–0,9). */
  roughnessSpread?: number;
}

/**
 * Tailles fixes (carré) : la texture garde la même taille en mémoire graphique
 * avant et après le chargement, donc toutes les copies qui partagent l’image
 * (répétitions différentes) se mettent à jour d’un coup. La photo est recadrée
 * au centre sur un carré : une matière n’a pas de sens « portrait ».
 */
const COLOR_PX = 2048;
const DETAIL_PX = 1024;

type Entry = { textures: THREE.Texture[]; base: ImportedTextureSet; canvases: Record<keyof ImportedTextureSet, HTMLCanvasElement> };
const entries = new Map<string, Entry>();
const views = new Map<string, ImportedTextureSet>();

function filledCanvas(size: number, color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

function prepare(tex: THREE.Texture, colorData: boolean) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = colorData ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
}

function putPixels(canvas: HTMLCanvasElement, pixels: Uint8ClampedArray) {
  canvas.getContext('2d')?.putImageData(new ImageData(new Uint8ClampedArray(pixels), canvas.width, canvas.height), 0, 0);
}

/** Recadrage centré sur un carré de `size` px. */
function drawSquare(ctx: CanvasRenderingContext2D, img: CanvasImageSource, srcW: number, srcH: number, size: number) {
  const side = Math.min(srcW, srcH);
  ctx.drawImage(img, (srcW - side) / 2, (srcH - side) / 2, side, side, 0, 0, size, size);
}

function refresh(entry: Entry) {
  for (const tex of entry.textures) tex.needsUpdate = true;
}

function processImage(entry: Entry, img: HTMLImageElement, seamless: boolean, spread: number) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) return;
  const colorCanvas = entry.canvases.map;
  const ctx = colorCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  drawSquare(ctx, img, srcW, srcH, COLOR_PX);
  let colorPixels: Uint8ClampedArray;
  try {
    colorPixels = ctx.getImageData(0, 0, COLOR_PX, COLOR_PX).data;
  } catch {
    // Image d’un autre domaine sans CORS : la carte graphique la refuserait aussi.
    refresh(entry);
    return;
  }
  if (seamless) putPixels(colorCanvas, makeSeamless(colorPixels, COLOR_PX, COLOR_PX));

  // Relief et rugosité à 1 024 px : le détail fin n’a pas besoin de la pleine résolution.
  const detailCanvas = document.createElement('canvas');
  detailCanvas.width = DETAIL_PX;
  detailCanvas.height = DETAIL_PX;
  const dctx = detailCanvas.getContext('2d', { willReadFrequently: true });
  if (!dctx) {
    refresh(entry);
    return;
  }
  dctx.drawImage(colorCanvas, 0, 0, DETAIL_PX, DETAIL_PX);
  const relief = reliefFromRgba(dctx.getImageData(0, 0, DETAIL_PX, DETAIL_PX).data, DETAIL_PX, DETAIL_PX);
  putPixels(entry.canvases.normalMap, normalMapFromHeight(relief, DETAIL_PX, DETAIL_PX));
  putPixels(entry.canvases.roughnessMap, roughnessFromRelief(relief, DETAIL_PX, DETAIL_PX, spread));
  refresh(entry);
}

function entryFor(url: string, seamless: boolean, spread: number): Entry {
  const key = `${url}|${seamless ? 's' : 'r'}|${spread.toFixed(2)}`;
  const cached = entries.get(key);
  if (cached) return cached;
  // En attendant l’image : gris neutre, relief plat, rugosité pleine (jamais de noir ni de miroir).
  const canvases = {
    map: filledCanvas(COLOR_PX, '#b8b2a8'),
    normalMap: filledCanvas(DETAIL_PX, 'rgb(128,128,255)'),
    roughnessMap: filledCanvas(DETAIL_PX, '#ffffff'),
  };
  const base: ImportedTextureSet = {
    map: prepare(new THREE.CanvasTexture(canvases.map), false),
    normalMap: prepare(new THREE.CanvasTexture(canvases.normalMap), true),
    roughnessMap: prepare(new THREE.CanvasTexture(canvases.roughnessMap), true),
  };
  const entry: Entry = { base, canvases, textures: [base.map, base.normalMap, base.roughnessMap] };
  entries.set(key, entry);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.onload = () => {
    try {
      processImage(entry, img, seamless, spread);
    } catch {
      refresh(entry);
    }
  };
  img.src = url;
  return entry;
}

/**
 * Jeu de textures (couleur, normales, rugosité) pour une image importée, répétée
 * `repeatX` × `repeatY` fois. Hors navigateur : `null`.
 */
export function loadImportedTexture(url: string, options: ImportedTextureOptions = {}): ImportedTextureSet | null {
  if (typeof document === 'undefined' || !url) return null;
  const seamless = options.seamless !== false;
  const spread = Math.max(0, Math.min(0.9, options.roughnessSpread ?? 0.35));
  const rx = Math.max(0.05, options.repeatX ?? 1);
  const ry = Math.max(0.05, options.repeatY ?? 1);
  const key = `${url}|${seamless ? 's' : 'r'}|${spread.toFixed(2)}|${rx.toFixed(3)}|${ry.toFixed(3)}`;
  const cached = views.get(key);
  if (cached) return cached;
  const entry = entryFor(url, seamless, spread);
  const view = (Object.keys(entry.base) as Array<keyof ImportedTextureSet>).reduce((acc, role) => {
    const copy = entry.base[role].clone();
    copy.repeat.set(rx, ry);
    copy.needsUpdate = true;
    entry.textures.push(copy);
    acc[role] = copy;
    return acc;
  }, {} as ImportedTextureSet);
  views.set(key, view);
  return view;
}

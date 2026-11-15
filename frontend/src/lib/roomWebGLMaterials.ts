'use client';

import * as THREE from 'three';
import type { ChairType, ChairStyle, SeatMaterial, TableShape, TableSurfaceStyle, WallTextureStyle, ZoneMaterial, OpeningMaterial } from '@/lib/roomLayoutUtils';
import { SEAT_MATERIAL_COLORS, WALL_TEXTURE_COLORS } from '@/lib/roomLayoutUtils';
import { getFloorAsset, FLOOR_TEXTURE_REPEAT_M } from '@/lib/roomFloorUtils';
import { PROCEDURAL_FLOOR_DRAW } from '@/lib/roomFloorProcedural';
import { TABLE_DEFAULT_TEXTURE, TABLE_SURFACE_TEXTURES, resolveTableSurface } from '@/lib/roomTableSurface';
import { ZONE_DECK_TEXTURES, ZONE_MATERIAL_COLORS } from '@/lib/roomZoneSurface';
import type { FloorType } from '@/lib/roomThemeUtils';
import { getDetailSet, withRepeat, type DetailKind } from '@/lib/roomSurfaceFinish';
import { loadImportedTexture, type ImportedTextureSet } from '@/lib/roomImportedTexture';
import { tileRepeat } from '@/lib/roomImportedTextureMath';

const textureCache = new Map<string, THREE.Texture>();
const canvasCache = new Map<string, THREE.CanvasTexture>();

function configureMap(tex: THREE.Texture, repeatX: number, repeatY: number) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Résolution de rastérisation des SVG procéduraux (sinon rendus à leur taille native, parfois 80 px). */
const SVG_RASTER_PX = 1024;

function isSvgUrl(url: string) {
  return /\.svg($|\?)/i.test(url);
}

/** Charge un SVG et le rastérise sur un canvas carré haute résolution (texture nette, mipmaps propres). */
function loadSvgAsCanvasTexture(url: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = SVG_RASTER_PX;
  canvas.height = SVG_RASTER_PX;
  const tex = new THREE.CanvasTexture(canvas);
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, SVG_RASTER_PX, SVG_RASTER_PX);
    tex.needsUpdate = true;
  };
  img.src = url;
  return tex;
}

export function loadTiledTexture(url: string, repeatX: number, repeatY: number, colorData = false): THREE.Texture {
  const key = `${url}|${repeatX.toFixed(2)}|${repeatY.toFixed(2)}|${colorData ? 'data' : 'srgb'}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const tex = isSvgUrl(url) ? loadSvgAsCanvasTexture(url) : new THREE.TextureLoader().load(url);
  configureMap(tex, repeatX, repeatY);
  if (colorData) tex.colorSpace = THREE.NoColorSpace;
  textureCache.set(key, tex);
  return tex;
}

/** Carte de normales générée à côté des textures procédurales (`/floors/gen/x.jpg` → `x-normal.jpg`). */
export function normalMapUrlFor(url: string): string | null {
  if (!url.startsWith('/floors/gen/') || !url.endsWith('.jpg')) return null;
  return url.replace(/\.jpg$/, '-normal.jpg');
}

/**
 * Rugosité moyenne des cartes `x-rough.jpg` (scripts/textures/generate_roughness.py) :
 * three multiplie la rugosité du matériau par la carte, on la divise donc par cette
 * moyenne pour garder la brillance d’ensemble de chaque matière.
 */
export const GENERATED_ROUGHNESS_MEAN = 0.8;
const NO_ROUGHNESS_MAP = new Set(['/floors/gen/water.jpg']);

/** Carte de rugosité générée à côté des textures procédurales (`x.jpg` → `x-rough.jpg`). */
export function roughnessMapUrlFor(url: string): string | null {
  if (!normalMapUrlFor(url) || NO_ROUGHNESS_MAP.has(url)) return null;
  return url.replace(/\.jpg$/, '-rough.jpg');
}

/** Rugosité à donner au matériau quand une carte de rugosité générée l’accompagne. */
export function roughnessWithMap(roughness: number, roughnessMap: THREE.Texture | null | undefined): number {
  return roughnessMap ? Math.min(1, roughness / GENERATED_ROUGHNESS_MEAN) : roughness;
}

/** Cartes de normales et de rugosité d’une texture générée, à la même répétition que sa couleur. */
export function generatedDetailMaps(url: string, repeatX: number, repeatY: number): { normalMap: THREE.Texture | null; roughnessMap: THREE.Texture | null } {
  const normalUrl = normalMapUrlFor(url);
  const roughUrl = roughnessMapUrlFor(url);
  return {
    normalMap: normalUrl ? loadTiledTexture(normalUrl, repeatX, repeatY, true) : null,
    roughnessMap: roughUrl ? loadTiledTexture(roughUrl, repeatX, repeatY, true) : null,
  };
}

/** Image de plan : un seul panneau, sans répétition (évite le mosaïque). */
export function loadCoverTexture(url: string): THREE.Texture {
  const key = `cover:${url}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const loader = new THREE.TextureLoader();
  const tex = loader.load(url);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1, 1);
  tex.offset.set(0, 0);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  textureCache.set(key, tex);
  return tex;
}

export function resolveFloorMap(
  floorType: FloorType | undefined,
  floorImageUrl: string | undefined,
  widthM: number,
  heightM: number,
  floorColor?: string,
  floorImageFit?: 'cover' | 'tile',
  /** Sol importé en mosaïque : taille réelle d’une répétition de l’image (m). */
  floorImageTileM?: number,
): {
  map: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  envMapIntensity: number;
  isPlan: boolean;
  bumpMap: THREE.Texture | null;
  bumpScale: number;
  normalMap?: THREE.Texture | null;
  normalScale?: number;
  roughnessMap?: THREE.Texture | null;
} {
  if (floorImageUrl) {
    const isPlan = floorImageFit !== 'tile';
    const color = floorColor && floorColor !== '#ffffff' ? floorColor : '#ffffff';
    if (isPlan) {
      return {
        map: loadCoverTexture(floorImageUrl),
        color,
        roughness: 0.82,
        metalness: 0.04,
        clearcoat: 0,
        envMapIntensity: 0.25,
        isPlan,
        bumpMap: null,
        bumpScale: 0,
      };
    }
    // Matière importée : relief et rugosité tirés de la photo, motif à l’échelle choisie.
    const tileM = floorImageTileM && floorImageTileM > 0 ? floorImageTileM : DEFAULT_IMPORTED_FLOOR_TILE_M;
    const set = loadImportedTexture(floorImageUrl, {
      repeatX: tileRepeat(widthM, tileM),
      repeatY: tileRepeat(heightM, tileM),
    });
    return {
      map: set?.map ?? loadTiledTexture(floorImageUrl, widthM / tileM, heightM / tileM),
      color,
      roughness: 0.78,
      metalness: 0.02,
      clearcoat: 0,
      envMapIntensity: 0.5,
      isPlan,
      bumpMap: null,
      bumpScale: 0,
      normalMap: set?.normalMap ?? null,
      normalScale: 0.9,
      roughnessMap: set?.roughnessMap ?? null,
    };
  }
  const type = floorType && floorType !== 'custom' ? floorType : 'parquet';

  if (type === 'miroirNoir') {
    const tileM = FLOOR_TEXTURE_REPEAT_M.miroirNoir;
    const { map: mTex, bumpMap: mBump, normalMap: mNormal } = makeCanvasTexture('floor:miroir-noir-v1', PROCEDURAL_FLOOR_DRAW.miroirNoir, 512, true, true, 2.2);
    mTex.repeat.set(widthM / tileM, heightM / tileM);
    if (mBump) mBump.repeat.set(widthM / tileM, heightM / tileM);
    if (mNormal) mNormal.repeat.set(widthM / tileM, heightM / tileM);
    return {
      map: mTex,
      color: floorColor && floorColor !== '#ffffff' ? floorColor : '#ffffff',
      roughness: 0.03,
      metalness: 0.32,
      clearcoat: 1.0,
      envMapIntensity: 1.6,
      isPlan: false,
      bumpMap: mBump ?? null,
      bumpScale: 0.002,
      normalMap: mNormal ?? null,
      normalScale: 0.6,
    };
  }

  if (type === 'dancefloorLed') {
    const tileM = FLOOR_TEXTURE_REPEAT_M.dancefloorLed;
    const { map: ledTex, bumpMap: ledBump, normalMap: ledNormal } = makeCanvasTexture('floor:dancefloor-led-v1', PROCEDURAL_FLOOR_DRAW.dancefloorLed, 512, true, true, 2.5);
    ledTex.repeat.set(widthM / tileM, heightM / tileM);
    if (ledBump) ledBump.repeat.set(widthM / tileM, heightM / tileM);
    if (ledNormal) ledNormal.repeat.set(widthM / tileM, heightM / tileM);
    return {
      map: ledTex,
      color: floorColor && floorColor !== '#ffffff' ? floorColor : '#ffffff',
      roughness: 0.08,
      metalness: 0.16,
      clearcoat: 0.95,
      envMapIntensity: 1.35,
      isPlan: false,
      bumpMap: ledBump ?? null,
      bumpScale: 0.004,
      normalMap: ledNormal ?? null,
      normalScale: 0.75,
    };
  }

  if (type === 'parquetVersailles') {
    const tileM = FLOOR_TEXTURE_REPEAT_M.parquetVersailles;
    const { map: versTex, bumpMap: versBump, normalMap: versNormal } = makeCanvasTexture('floor:parquet-versailles-v2', PROCEDURAL_FLOOR_DRAW.parquetVersailles, 512, true, true, 2.2);
    versTex.repeat.set(widthM / tileM, heightM / tileM);
    if (versBump) versBump.repeat.set(widthM / tileM, heightM / tileM);
    if (versNormal) versNormal.repeat.set(widthM / tileM, heightM / tileM);
    return {
      map: versTex,
      color: floorColor && floorColor !== '#ffffff' ? floorColor : '#ffffff',
      roughness: 0.40,
      metalness: 0.04,
      clearcoat: 0.35,
      envMapIntensity: 0.65,
      isPlan: false,
      bumpMap: versBump ?? null,
      bumpScale: 0.016,
      normalMap: versNormal ?? null,
      normalScale: 0.85,
    };
  }

  const asset = getFloorAsset(type);
  const tileM = FLOOR_TEXTURE_REPEAT_M[type] ?? 2;
  const map = loadTiledTexture(asset.url, widthM / tileM, heightM / tileM);

  let roughness = 0.72;
  let metalness = 0.04;
  let clearcoat = 0;
  let envMapIntensity = 0.4;
  if (
    type === 'epoxy' || type === 'marbre' || type === 'epoxyMenthe'
    || type === 'marbreCalacatta' || type === 'marbreOr' || type === 'marbreBourgogne'
    || type === 'damierMarbreNoirBlanc' || type === 'verreLumineux'
  ) {
    roughness = type === 'verreLumineux' ? 0.05 : type === 'epoxyMenthe' || type === 'marbreCalacatta' || type === 'marbreOr' || type === 'damierMarbreNoirBlanc' ? 0.08 : 0.18;
    metalness = type === 'verreLumineux' ? 0.25 : 0.12;
    clearcoat = 0.95;
    envMapIntensity = type === 'verreLumineux' ? 1.4 : 1.1;
  } else if (type === 'terrazzoVenitien') {
    roughness = 0.22;
    metalness = 0.08;
    clearcoat = 0.65;
    envMapIntensity = 0.8;
  } else if (type === 'dancefloorBoisVitrifié') {
    roughness = 0.12;
    metalness = 0.06;
    clearcoat = 0.92;
    envMapIntensity = 0.95;
  } else if (type === 'tometteProvencale') {
    roughness = 0.85;
    metalness = 0.02;
    clearcoat = 0.08;
    envMapIntensity = 0.25;
  } else if (type === 'pavesEventail') {
    roughness = 0.82;
    metalness = 0.04;
    envMapIntensity = 0.32;
  } else if (
    type === 'moquette' || type === 'moquetteRouge' || type === 'herbe' || type === 'pelouse' || type === 'prairie'
    || type === 'gazonSynth' || type === 'gazonFleurie' || type === 'pelouseRayee' || type === 'sable' || type === 'terreBattue'
  ) {
    roughness = 0.98;
    metalness = 0;
    envMapIntensity = 0.15;
  } else if (type === 'galets' || type === 'gravier' || type === 'gravierFonce') {
    roughness = 0.9;
    metalness = 0.02;
    envMapIntensity = 0.28;
  } else if (type === 'betonCire' || type === 'travertin') {
    roughness = type === 'betonCire' ? 0.38 : 0.5;
    metalness = 0.04;
    clearcoat = type === 'betonCire' ? 0.35 : 0.15;
    envMapIntensity = 0.55;
  } else if (type === 'terrasseIpe') {
    roughness = 0.62;
    metalness = 0.02;
    clearcoat = 0.12;
    envMapIntensity = 0.4;
  } else if (type === 'beton' || type === 'pavesPinwheel' || type === 'pavesGranit' || type === 'brique' || type === 'pierre' || type === 'carrelage') {
    roughness = 0.88;
    metalness = 0.04;
    envMapIntensity = 0.3;
  } else if (type === 'pierreModulaire' || type === 'dallesIrregulieres') {
    roughness = 0.78;
    metalness = 0.05;
    envMapIntensity = 0.35;
  } else if (
    type === 'parquet' || type === 'chevron' || type === 'chevronGris' || type === 'chevronGreige'
    || type === 'bois' || type === 'boisPanel' || type === 'boisHex' || type === 'boisAmber'
    || type === 'boisRustique' || type === 'boisBlond' || type === 'boisPetale'
    || type === 'boisCharcoal' || type === 'boisMarqueterie' || type === 'pointDeHongrie'
  ) {
    roughness =
      type === 'pointDeHongrie' ? 0.32 :
      type === 'boisAmber' ? 0.38 :
      type === 'boisBlond' || type === 'chevronGreige' ? 0.55 :
      type === 'boisPanel' || type === 'boisMarqueterie' ? 0.62 : 0.48;
    metalness = 0.05;
    clearcoat = type === 'pointDeHongrie' ? 0.45 : type === 'boisAmber' || type === 'boisBlond' ? 0.25 : 0.1;
    envMapIntensity = 0.55;
  }

  const { normalMap, roughnessMap } = generatedDetailMaps(asset.url, widthM / tileM, heightM / tileM);

  const tint = floorColor && floorColor !== '#ffffff' ? floorColor : asset.fallback;
  const isWood =
    type === 'parquet' || type === 'chevron' || type === 'chevronGris' || type === 'chevronGreige'
    || type === 'bois' || type === 'boisPanel' || type === 'boisHex' || type === 'boisAmber'
    || type === 'boisRustique' || type === 'boisBlond' || type === 'boisPetale'
    || type === 'boisCharcoal' || type === 'boisMarqueterie' || type === 'pointDeHongrie' || type === 'dancefloorBoisVitrifié';
  return {
    map,
    color: floorColor ? tint : '#ffffff',
    roughness: roughnessWithMap(roughness, roughnessMap),
    metalness,
    clearcoat,
    envMapIntensity,
    isPlan: false,
    // Relief : vraie carte de normales pour les textures générées, sinon relief tiré de l'albédo.
    bumpMap: normalMap ? null : map ? bumpFromAlbedo(map) : null,
    bumpScale: isWood ? 0.016 : clearcoat > 0.4 ? 0.008 : 0.01,
    normalMap,
    normalScale: normalMap ? (clearcoat > 0.4 ? 0.35 : isWood ? 0.8 : 0.9) : undefined,
    roughnessMap,
  };
}

function canvasToBumpTexture(source: HTMLCanvasElement, key: string): THREE.CanvasTexture {
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const size = source.width;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const ctx = bumpCanvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(bumpCanvas);
    canvasCache.set(key, empty);
    return empty;
  }
  const srcCtx = source.getContext('2d');
  if (!srcCtx) {
    const empty = new THREE.CanvasTexture(bumpCanvas);
    canvasCache.set(key, empty);
    return empty;
  }
  const src = srcCtx.getImageData(0, 0, size, size);
  const dst = ctx.createImageData(size, size);
  for (let i = 0; i < src.data.length; i += 4) {
    const lum = src.data[i] * 0.299 + src.data[i + 1] * 0.587 + src.data[i + 2] * 0.114;
    dst.data[i] = dst.data[i + 1] = dst.data[i + 2] = lum;
    dst.data[i + 3] = 255;
  }
  ctx.putImageData(dst, 0, 0);
  const tex = new THREE.CanvasTexture(bumpCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  canvasCache.set(key, tex);
  return tex;
}

/** Génération d'une carte de normales tangentielles via filtre de convolution de Sobel (PBR 2.0). */
function canvasToNormalTexture(source: HTMLCanvasElement, key: string, strength = 2.0): THREE.CanvasTexture {
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const size = source.width;
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const ctx = normalCanvas.getContext('2d');
  const srcCtx = source.getContext('2d');
  if (!ctx || !srcCtx) {
    const empty = new THREE.CanvasTexture(normalCanvas);
    canvasCache.set(key, empty);
    return empty;
  }

  const src = srcCtx.getImageData(0, 0, size, size);
  const dst = ctx.createImageData(size, size);
  const data = src.data;

  const lumAt = (x: number, y: number) => {
    const px = (x + size) % size;
    const py = (y + size) % size;
    const idx = (py * size + px) * 4;
    return (data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114) / 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Masque de Sobel 3x3 pour gradients X et Y
      const tl = lumAt(x - 1, y - 1);
      const l  = lumAt(x - 1, y);
      const bl = lumAt(x - 1, y + 1);
      const t  = lumAt(x, y - 1);
      const b  = lumAt(x, y + 1);
      const tr = lumAt(x + 1, y - 1);
      const r  = lumAt(x + 1, y);
      const br = lumAt(x + 1, y + 1);

      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);

      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz) || 1.0;
      nx /= len;
      ny /= len;
      nz /= len;

      const idx = (y * size + x) * 4;
      dst.data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      dst.data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      dst.data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      dst.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(dst, 0, 0);
  const tex = new THREE.CanvasTexture(normalCanvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 8;
  canvasCache.set(key, tex);
  return tex;
}

function makeCanvasTexture(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
  withBump = false,
  withNormal = false,
  normalStrength = 2.0,
): { map: THREE.CanvasTexture; bumpMap?: THREE.CanvasTexture; normalMap?: THREE.CanvasTexture } {
  const cached = canvasCache.get(key);
  if (cached) {
    const bump = withBump ? canvasCache.get(`bump:${key}`) : undefined;
    const normal = withNormal ? canvasCache.get(`normal:${key}`) : undefined;
    return { map: cached, bumpMap: bump, normalMap: normal };
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    canvasCache.set(key, empty);
    return { map: empty };
  }
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  canvasCache.set(key, tex);
  const bumpMap = withBump ? canvasToBumpTexture(canvas, `bump:${key}`) : undefined;
  const normalMap = withNormal ? canvasToNormalTexture(canvas, `normal:${key}`, normalStrength) : undefined;
  return { map: tex, bumpMap, normalMap };
}

function noise(ctx: CanvasRenderingContext2D, size: number, alpha = 0.08) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * alpha;
    img.data[i] = Math.min(255, Math.max(0, img.data[i] + n));
    img.data[i + 1] = Math.min(255, Math.max(0, img.data[i + 1] + n));
    img.data[i + 2] = Math.min(255, Math.max(0, img.data[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

/** Aléatoire déterministe : même rendu à chaque chargement (et entre 2D / 3D). */
function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeRgb(r: number, g: number, b: number, factor: number): string {
  return `rgb(${Math.round(Math.min(255, Math.max(0, r * factor)))},${Math.round(Math.min(255, Math.max(0, g * factor)))},${Math.round(Math.min(255, Math.max(0, b * factor)))})`;
}

const SEAT_DETAIL: Record<SeatMaterial, { kind: DetailKind | null; repeat: number }> = {
  fabric: { kind: 'fabricWeave', repeat: 3 },
  linen: { kind: 'linen', repeat: 3 },
  velvet: { kind: 'velvet', repeat: 1.5 },
  leather: { kind: 'leather', repeat: 2 },
  suede: { kind: 'suede', repeat: 2 },
  boucle: { kind: 'boucle', repeat: 2.5 },
  mesh: { kind: 'mesh', repeat: 2 },
  rattan: { kind: 'rattan', repeat: 2 },
  wood: { kind: 'woodGrain', repeat: 1 },
  plastic: { kind: null, repeat: 1 },
};

/**
 * Texture tissu / cuir / velours pour assises.
 * Textures neutres (niveaux de gris) + normales : la teinte vient de la couleur du matériau,
 * sans double teinte (l'ancienne texture pré-colorée, multipliée par la couleur, noircissait les sièges).
 * `_tint` est conservé pour compatibilité d'appel.
 */
export function resolveSeatFabricMap(material?: SeatMaterial, _tint?: string): {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  normalScale: number;
  roughness: number;
  metalness: number;
} {
  const mat = material ?? 'fabric';
  const { kind, repeat } = SEAT_DETAIL[mat] ?? SEAT_DETAIL.fabric;
  const set = kind ? getDetailSet(kind) : null;

  const roughness =
    mat === 'leather' ? 0.48 :
    mat === 'velvet' ? 0.92 :
    mat === 'plastic' ? 0.3 :
    mat === 'wood' ? 0.55 :
    mat === 'linen' ? 0.9 :
    mat === 'boucle' ? 0.95 :
    mat === 'suede' ? 0.9 :
    mat === 'mesh' ? 0.6 :
    mat === 'rattan' ? 0.75 : 0.88;

  return {
    map: withRepeat(set?.map ?? null, repeat, repeat),
    normalMap: withRepeat(set?.normalMap ?? null, repeat, repeat),
    normalScale: set?.normalScale ?? 0,
    roughness,
    // Tissus, cuir, bois, plastique : diélectriques.
    metalness: 0,
  };
}

/** Contremarche / nez de marche bois. */
export function getStairWoodMap(): THREE.Texture {
  return getWallTexture('wood').map;
}

function bumpFromAlbedo(tex: THREE.Texture): THREE.Texture {
  const bump = tex.clone();
  bump.colorSpace = THREE.NoColorSpace;
  return bump;
}

function photoWallMaterial(
  url: string,
  repeatX: number,
  repeatY: number,
  color: string,
  roughness: number,
  metalness: number,
  bumpScale: number,
  normalScale = 0.6,
): WallSurfaceMaterial {
  const map = loadTiledTexture(url, repeatX, repeatY);
  const detail = generatedDetailMaps(url, repeatX, repeatY);
  const normalMap = detail.normalMap ?? undefined;
  const roughnessMap = detail.roughnessMap ?? undefined;
  return {
    map,
    bumpMap: normalMap ? undefined : bumpFromAlbedo(map),
    normalMap,
    normalScale,
    roughnessMap,
    color,
    roughness: roughnessWithMap(roughness, roughnessMap),
    metalness,
    bumpScale: normalMap ? 0 : bumpScale,
  };
}
export const WALL_TEXTURE_TILE_M: Record<WallTextureStyle, { w: number; h: number }> = {
  plaster: { w: 2.4, h: 2.4 },
  brick: { w: 0.9, h: 0.9 },
  wood: { w: 1.2, h: 1.2 },
  concrete: { w: 2.4, h: 2.4 },
  wallpaper: { w: 0.55, h: 0.55 },
  stone: { w: 2, h: 2 },
  limewash: { w: 3, h: 3 },
  tadelakt: { w: 2.5, h: 2.5 },
  boardConcrete: { w: 1.2, h: 1.2 },
  paintedBrick: { w: 0.9, h: 0.9 },
  fluted: { w: 0.28, h: 2.6 },
  travertine: { w: 0.6, h: 0.6 },
  slate: { w: 1.6, h: 1.6 },
  metalCorrugated: { w: 0.35, h: 2.4 },
  metroTile: { w: 0.8, h: 0.8 },
  woodPanel: { w: 0.35, h: 2.4 },
};

const WALL_BUMP_SCALE: Partial<Record<WallTextureStyle, number>> = {
  brick: 0.022,
  paintedBrick: 0.018,
  concrete: 0.012,
  boardConcrete: 0.02,
  stone: 0.025,
  slate: 0.028,
  fluted: 0.035,
  metalCorrugated: 0.04,
  metroTile: 0.015,
  wallpaper: 0.01,
  wood: 0.008,
  woodPanel: 0.01,
  travertine: 0.006,
};

/** Styles muraux rendus par texture générée ; `tinted` = albédo quasi blanc teinté par la peinture du mur. */
const GENERATED_WALLS: Partial<Record<WallTextureStyle, { url: string; roughness: number; normalScale: number; tinted?: boolean; metalness?: number }>> = {
  brick: { url: '/floors/gen/wall-brick.jpg', roughness: 0.93, normalScale: 1.1 },
  paintedBrick: { url: '/floors/gen/wall-brick-painted.jpg', roughness: 0.82, normalScale: 1.0, tinted: true },
  stone: { url: '/floors/gen/wall-stone.jpg', roughness: 0.9, normalScale: 1.1 },
  slate: { url: '/floors/gen/wall-slate.jpg', roughness: 0.78, normalScale: 1.2 },
  concrete: { url: '/floors/gen/wall-concrete.jpg', roughness: 0.86, normalScale: 0.7, metalness: 0.04 },
  boardConcrete: { url: '/floors/gen/wall-board-concrete.jpg', roughness: 0.88, normalScale: 0.9, metalness: 0.04 },
  plaster: { url: '/floors/gen/wall-plaster.jpg', roughness: 0.9, normalScale: 0.45, tinted: true },
  limewash: { url: '/floors/gen/wall-limewash.jpg', roughness: 0.92, normalScale: 0.4, tinted: true },
  metroTile: { url: '/floors/gen/wall-metro.jpg', roughness: 0.18, normalScale: 0.8 },
};

export type WallSurfaceMaterial = {
  map: THREE.Texture;
  bumpMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  normalScale?: number;
  roughnessMap?: THREE.Texture;
  color: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
};

export function getWallTexture(style: WallTextureStyle, colorOverride?: string): WallSurfaceMaterial {
  const base = colorOverride ?? WALL_TEXTURE_COLORS[style];

  if (style === 'wood') {
    return photoWallMaterial(
      '/floors/gen/wood-amber.jpg',
      2.4,
      2.4,
      colorOverride && colorOverride !== '#ffffff' ? colorOverride : '#ffffff',
      0.55,
      0.05,
      WALL_BUMP_SCALE.wood ?? 0.008,
    );
  }

  if (style === 'woodPanel') {
    return photoWallMaterial(
      '/floors/gen/wood-panel.jpg',
      1.8,
      2.2,
      colorOverride && colorOverride !== '#ffffff' ? colorOverride : '#ffffff',
      0.52,
      0.04,
      WALL_BUMP_SCALE.woodPanel ?? 0.01,
    );
  }

  if (style === 'travertine') {
    return photoWallMaterial(
      '/floors/gen/travertine.jpg',
      2.8,
      2.8,
      colorOverride && colorOverride !== '#ffffff' ? colorOverride : '#f5f5f4',
      0.28,
      0.08,
      WALL_BUMP_SCALE.travertine ?? 0.006,
    );
  }

  // Parements et enduits réalistes : textures générées (scripts/textures/generate_surfaces.py) avec vraie carte de normales.
  const generated = GENERATED_WALLS[style];
  if (generated) {
    const tile = WALL_TEXTURE_TILE_M[style];
    return photoWallMaterial(
      generated.url,
      3 / tile.w,
      3 / tile.h,
      generated.tinted ? base : '#ffffff',
      generated.roughness,
      generated.metalness ?? 0.02,
      0,
      generated.normalScale,
    );
  }

  const key = `wall:${style}:${base}:v2`;
  // Enduits lisses : micro-relief générique ; parements (brique, pierre…) : normales tirées du dessin.
  const smoothFinish = style === 'limewash' || style === 'tadelakt' || style === 'plaster';

  const { map, normalMap: drawnNormal } = makeCanvasTexture(key, (ctx, size) => {
    if (style === 'brick' || style === 'paintedBrick') {
      const mortar = style === 'paintedBrick' ? '#e2e8f0' : '#c4b5a5';
      ctx.fillStyle = mortar;
      ctx.fillRect(0, 0, size, size);
      const bh = size / 10;
      const bw = size / 5;
      const tones = style === 'paintedBrick'
        ? ['#f1f5f9', '#e2e8f0', '#f8fafc', '#cbd5e1', '#f1f5f9']
        : ['#9a4a32', '#b4533c', '#8b3a2a', '#a65d45', '#7c3a28'];
      const rand = seededRandom(style === 'paintedBrick' ? 7 : 3);
      // Une teinte par brique réelle : la brique coupée au bord droit reprend celle du bord gauche (raccord).
      const brickTone = Array.from({ length: 10 * 5 }, () => ({ tone: Math.floor(rand() * tones.length), shade: 0.85 + rand() * 0.25 }));
      for (let row = 0; row < 10; row += 1) {
        const offset = row % 2 === 0 ? 0 : bw / 2;
        for (let col = -1; col < 6; col += 1) {
          const x = col * bw + offset;
          const y = row * bh;
          const b = brickTone[row * 5 + ((col % 5) + 5) % 5];
          const shade = b.shade;
          ctx.fillStyle = tones[b.tone];
          ctx.globalAlpha = shade;
          ctx.fillRect(x + 1.5, y + 1.5, bw - 3, bh - 3);
          ctx.globalAlpha = 1;
          ctx.fillStyle = 'rgba(255,248,240,0.35)';
          ctx.fillRect(x + 2, y + 2, bw - 4, 1.2);
        }
      }
      noise(ctx, size, style === 'paintedBrick' ? 0.08 : 0.14);
      return;
    }

    if (style === 'concrete' || style === 'boardConcrete') {
      ctx.fillStyle = style === 'boardConcrete' ? '#9ca3af' : '#a8a29e';
      ctx.fillRect(0, 0, size, size);
      if (style === 'boardConcrete') {
        const plankH = size / 6;
        for (let row = 0; row < 6; row += 1) {
          ctx.fillStyle = row % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
          ctx.fillRect(0, row * plankH, size, plankH);
          ctx.strokeStyle = 'rgba(40,40,50,0.12)';
          ctx.beginPath();
          ctx.moveTo(0, row * plankH);
          ctx.lineTo(size, row * plankH);
          ctx.stroke();
        }
      }
      noise(ctx, size, 0.32);
      for (let i = 0; i < 8; i += 1) {
        ctx.strokeStyle = `rgba(60,60,70,${0.08 + Math.random() * 0.1})`;
        ctx.beginPath();
        ctx.moveTo(Math.random() * size, 0);
        ctx.lineTo(Math.random() * size, size);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92);
      return;
    }

    if (style === 'stone' || style === 'slate') {
      // Appareillage en assises : blocs rectangulaires joints au mortier, dessinés en boucle (sans raccord).
      const rand = seededRandom(style === 'slate' ? 17 : 13);
      const tones = style === 'slate'
        ? ['#4b4b53', '#3f3f46', '#52525b', '#36363c', '#5b5b63']
        : ['#8a8177', '#7a7166', '#968c80', '#6e665c', '#a39a8d', '#81786c'];
      ctx.fillStyle = style === 'slate' ? '#1f1f23' : '#5d574f';
      ctx.fillRect(0, 0, size, size);
      const joint = style === 'slate' ? 2 : 4;
      const rowHeights: number[] = [];
      let used = 0;
      while (used < size) {
        let h = style === 'slate' ? 18 + rand() * 26 : 48 + rand() * 50;
        if (size - used - h < (style === 'slate' ? 18 : 48)) h = size - used;
        rowHeights.push(h);
        used += h;
      }
      let y = 0;
      for (const h of rowHeights) {
        let x = rand() * size;
        const end = x + size;
        while (x < end - 1) {
          let w = style === 'slate' ? 60 + rand() * 120 : 70 + rand() * 110;
          if (end - x - w < 40) w = end - x;
          const tone = tones[Math.floor(rand() * tones.length)];
          const lift = 0.9 + rand() * 0.2;
          for (const dx of [0, -size]) {
            const bx = x + dx + joint / 2;
            ctx.globalAlpha = lift > 1 ? 1 : lift;
            ctx.fillStyle = tone;
            ctx.fillRect(bx, y + joint / 2, w - joint, h - joint);
            ctx.globalAlpha = 1;
            // Arête supérieure éclairée / inférieure ombrée : lecture du relief.
            ctx.fillStyle = 'rgba(255,255,255,0.10)';
            ctx.fillRect(bx, y + joint / 2, w - joint, 2);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(bx, y + h - joint / 2 - 2, w - joint, 2);
          }
          x += w;
        }
        y += h;
      }
      noise(ctx, size, style === 'slate' ? 0.1 : 0.16);
      return;
    }

    if (style === 'wallpaper') {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      const step = size / 6;
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          ctx.beginPath();
          ctx.arc(x + step / 2, y + step / 2, step * 0.22, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      noise(ctx, size, 0.06);
      return;
    }

    if (style === 'limewash') {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 12; i += 1) {
        const g = ctx.createRadialGradient(
          Math.random() * size, Math.random() * size, 0,
          Math.random() * size, Math.random() * size, size * 0.35,
        );
        g.addColorStop(0, 'rgba(255,255,255,0.25)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      noise(ctx, size, 0.1);
      return;
    }

    if (style === 'tadelakt') {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, shadeRgb(...hexToRgb(base), 1.08));
      grad.addColorStop(0.5, base);
      grad.addColorStop(1, shadeRgb(...hexToRgb(base), 0.92));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 6) {
        ctx.strokeStyle = `rgba(255,255,255,${0.04 + (y % 12 === 0 ? 0.06 : 0)})`;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.3, y + 2, size * 0.7, y - 2, size, y + 1);
        ctx.stroke();
      }
      noise(ctx, size, 0.06);
      return;
    }

    if (style === 'fluted') {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      const fluteW = size / 14;
      for (let i = 0; i < 14; i += 1) {
        const x = i * fluteW;
        const grad = ctx.createLinearGradient(x, 0, x + fluteW, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.12)');
        grad.addColorStop(0.45, 'rgba(255,255,255,0.14)');
        grad.addColorStop(1, 'rgba(0,0,0,0.1)');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, fluteW, size);
      }
      noise(ctx, size, 0.04);
      return;
    }

    if (style === 'metalCorrugated') {
      ctx.fillStyle = '#64748b';
      ctx.fillRect(0, 0, size, size);
      const waveW = size / 12;
      for (let i = 0; i < 12; i += 1) {
        const x = i * waveW;
        const grad = ctx.createLinearGradient(x, 0, x + waveW, 0);
        grad.addColorStop(0, '#475569');
        grad.addColorStop(0.5, '#94a3b8');
        grad.addColorStop(1, '#475569');
        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, waveW + 0.5, size);
      }
      noise(ctx, size, 0.08);
      return;
    }

    if (style === 'metroTile') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, size, size);
      const tileW = size / 4;
      const tileH = size / 8;
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const x = col * tileW;
          const y = row * tileH;
          const shade = 0.96 + Math.random() * 0.08;
          ctx.fillStyle = `rgba(226,232,240,${shade})`;
          ctx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
        }
      }
      ctx.strokeStyle = 'rgba(148,163,184,0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * tileW, 0);
        ctx.lineTo(i * tileW, size);
        ctx.stroke();
      }
      for (let i = 0; i <= 8; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, i * tileH);
        ctx.lineTo(size, i * tileH);
        ctx.stroke();
      }
      noise(ctx, size, 0.04);
      return;
    }

    // plaster default
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    noise(ctx, size, 0.14);
  }, 512, false, !smoothFinish, 2.4);
  const normalMap = drawnNormal ?? getDetailSet('plaster').normalMap ?? undefined;

  const repeatX =
    style === 'brick' || style === 'paintedBrick' ? 4 :
    style === 'metroTile' ? 3 :
    style === 'fluted' ? 2 :
    style === 'metalCorrugated' ? 2.5 : 3;
  const repeatY =
    style === 'brick' || style === 'paintedBrick' ? 3 :
    style === 'metroTile' ? 4 :
    style === 'fluted' ? 2 :
    style === 'metalCorrugated' ? 2 : 2;
  map.repeat.set(repeatX, repeatY);

  const roughness =
    style === 'concrete' || style === 'boardConcrete' ? 0.9 :
    style === 'stone' || style === 'slate' ? 0.92 :
    style === 'wallpaper' ? 0.8 :
    style === 'brick' || style === 'paintedBrick' ? 0.95 :
    style === 'tadelakt' ? 0.22 :
    style === 'limewash' ? 0.85 :
    style === 'fluted' ? 0.55 :
    style === 'metalCorrugated' ? 0.35 :
    style === 'metroTile' ? 0.25 : 0.88;

  const metalness =
    style === 'concrete' || style === 'boardConcrete' ? 0.08 :
    style === 'metalCorrugated' ? 0.82 :
    style === 'metroTile' ? 0.04 :
    style === 'tadelakt' ? 0.06 : 0.02;

  return {
    map,
    normalMap,
    normalScale: smoothFinish ? 0.35 : 0.8,
    color: '#ffffff',
    roughness,
    metalness,
    bumpScale: 0,
  };
}

/** Texture murale calibrée à la taille réelle du segment (évite tuiles trop grosses / fines). */
export function wallTextureForSurface(
  style: WallTextureStyle,
  widthM: number,
  heightM: number,
  colorOverride?: string,
): WallSurfaceMaterial {
  const base = getWallTexture(style, colorOverride);
  const tile = WALL_TEXTURE_TILE_M[style];
  const repeatX = Math.max(0.5, widthM / tile.w);
  const repeatY = Math.max(0.5, heightM / tile.h);
  const map = base.map.clone();
  configureMap(map, repeatX, repeatY);
  let normalMap: THREE.Texture | undefined;
  if (base.normalMap) {
    normalMap = base.normalMap.clone();
    normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
    // Micro-relief d'enduit : grain plus fin que la teinte (≈ 60 cm).
    const smooth = !base.bumpMap && style === 'tadelakt';
    normalMap.repeat.set(smooth ? widthM / 0.6 : repeatX, smooth ? heightM / 0.6 : repeatY);
  }
  let bumpMap: THREE.Texture | undefined;
  if (!normalMap && base.map) {
    bumpMap = bumpFromAlbedo(map);
    bumpMap.repeat.set(repeatX, repeatY);
  }
  let roughnessMap: THREE.Texture | undefined;
  if (base.roughnessMap) {
    roughnessMap = base.roughnessMap.clone();
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(repeatX, repeatY);
  }
  return { ...base, map, normalMap, bumpMap, roughnessMap, bumpScale: bumpMap ? base.bumpScale || 0.006 : 0 };
}

/** Texture et PBR pour battants de porte selon le matériau. */
export function getDoorMaterialProps(
  material: OpeningMaterial | undefined,
  color?: string,
): {
  color: string;
  map?: THREE.Texture;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
} {
  const mat = material ?? 'wood';
  if (mat === 'glass') {
    return {
      color: color ?? '#93c5fd',
      roughness: 0.08,
      metalness: 0.35,
      transparent: true,
      opacity: 0.5,
    };
  }
  if (mat === 'metal' || mat === 'blackSteel') {
    return {
      color: color ?? (mat === 'blackSteel' ? '#1e293b' : '#64748b'),
      roughness: mat === 'blackSteel' ? 0.28 : 0.22,
      metalness: 0.9,
    };
  }
  if (mat === 'brass') {
    return {
      color: color ?? '#c9a227',
      roughness: 0.18,
      metalness: 0.92,
    };
  }
  if (mat === 'lacquer') {
    return {
      color: color ?? '#f8fafc',
      roughness: 0.12,
      metalness: 0.15,
    };
  }
  if (mat === 'painted') {
    return {
      color: color ?? '#f1f5f9',
      roughness: 0.55,
      metalness: 0.04,
    };
  }
  if (mat === 'oak') {
    const wood = getWallTexture('wood', '#c4a06a');
    return { color: color ?? '#ffffff', map: wood.map, roughness: 0.5, metalness: 0.06 };
  }
  if (mat === 'walnut') {
    const wood = getWallTexture('wood', '#5c4030');
    return { color: color ?? '#d4c4a8', map: wood.map, roughness: 0.48, metalness: 0.06 };
  }
  const wood = getWallTexture('wood');
  return {
    color: color ?? '#6b4423',
    map: wood.map,
    roughness: 0.52,
    metalness: 0.08,
  };
}

export { TABLE_DEFAULT_TEXTURE, TABLE_LINEN_TEXTURE } from '@/lib/roomTableSurface';

export function resolveTableMaterial(
  shape: TableShape,
  color?: string,
  imageUrl?: string,
  surface?: TableSurfaceStyle,
  /** Plateau [largeur, profondeur] en mètres : une image importée garde son échelle réelle. */
  sizeM?: [number, number],
): {
  map: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  normalMap?: THREE.Texture;
  normalScale?: number;
  roughnessMap?: THREE.Texture;
  clearcoat?: number;
  clearcoatRoughness?: number;
  transmission?: number;
  ior?: number;
  /** Plateau nappé (lin) : la table reçoit une retombée de nappe. */
  isCloth?: boolean;
} {
  if (imageUrl) {
    const [w, d] = sizeM ?? [1.2, 1.2];
    const set = loadImportedTexture(imageUrl, {
      repeatX: tileRepeat(w, IMPORTED_TABLE_TILE_M),
      repeatY: tileRepeat(d, IMPORTED_TABLE_TILE_M),
    });
    return {
      map: set?.map ?? loadTiledTexture(imageUrl, 1.2, 1.2),
      color: '#ffffff',
      roughness: 0.55,
      metalness: 0.04,
      normalMap: set?.normalMap,
      normalScale: 0.7,
      roughnessMap: set?.roughnessMap,
      clearcoat: 0.2,
      clearcoatRoughness: 0.25,
    };
  }

  const resolvedSurface = resolveTableSurface(shape, surface);

  if (resolvedSurface === 'glass') {
    return {
      map: null,
      color: color && color !== '#ffffff' ? color : '#f1f5f9',
      roughness: 0.04,
      metalness: 0.06,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transmission: 0.94,
      ior: 1.52,
    };
  }

  if (resolvedSurface === 'whiteLacquer') {
    return {
      map: null,
      color: color && color !== '#ffffff' ? color : '#fafafa',
      roughness: 0.1,
      metalness: 0.15,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
    };
  }

  const url = TABLE_SURFACE_TEXTURES[resolvedSurface as keyof typeof TABLE_SURFACE_TEXTURES] ?? TABLE_DEFAULT_TEXTURE;
  // Les textures portent déjà la teinte du matériau : blanc = couleur de la texture telle quelle.
  const defaultColors: Record<TableSurfaceStyle, string> = {
    wood: '#ffffff',
    linen: '#ffffff',
    walnut: '#ffffff',
    marble: '#ffffff',
    darkWood: '#ffffff',
    whiteLacquer: '#fafafa',
    glass: '#e2e8f0',
  };

  const isLinen = resolvedSurface === 'linen';
  const isMarble = resolvedSurface === 'marble';
  // Nappe : trame fine (plus de répétitions) ; bois / marbre : une planche par plateau environ.
  const repeat = isLinen ? 4 : isMarble ? 1 : 1.2;
  const map = loadTiledTexture(url, repeat, repeat);
  const detail = generatedDetailMaps(url, repeat, repeat);
  const normalMap = detail.normalMap ?? undefined;
  const roughnessMap = detail.roughnessMap ?? undefined;
  const baseRoughness = isMarble ? 0.12 : isLinen ? 0.92 : resolvedSurface === 'walnut' || resolvedSurface === 'darkWood' ? 0.42 : 0.48;

  return {
    map,
    bumpMap: normalMap ? undefined : bumpFromAlbedo(map),
    bumpScale: normalMap ? 0 : 0.008,
    normalMap,
    normalScale: isLinen ? 0.6 : isMarble ? 0.25 : 0.5,
    color: color && color !== '#ffffff' ? color : defaultColors[resolvedSurface],
    isCloth: isLinen,
    roughnessMap,
    // Bois vernis satiné, marbre poli, nappe mate : matériaux diélectriques (métal = 0).
    roughness: roughnessWithMap(baseRoughness, roughnessMap),
    metalness: 0,
    clearcoat: isMarble ? 0.8 : isLinen ? 0 : 0.35,
    clearcoatRoughness: isMarble ? 0.06 : 0.22,
  };
}

// Palette des chaises : module pur partagé avec le plan 2D.
export { CHAIR_VISUALS, resolveChairVisual, type ChairVisual } from '@/lib/roomChairVisual';

export { ZONE_MATERIAL_COLORS } from '@/lib/roomZoneSurface';

export function resolveZoneMaterialMap(material: ZoneMaterial | undefined): {
  map: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
  /** Épaisseur visuelle de la surface (m). */
  thicknessM?: number;
} {
  const mat = material ?? 'wood';
  const color = ZONE_MATERIAL_COLORS[mat];
  if (mat === 'carpet') {
    const { map: pile } = makeCanvasTexture('zone:carpet-pile', (ctx, size) => {
      ctx.fillStyle = '#1a2744';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 4000; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillStyle = Math.random() > 0.5 ? '#2a3f66' : '#152038';
        ctx.fillRect(x, y, 1.2, 2.4);
      }
      noise(ctx, size, 0.12);
    }, 512);
    pile.repeat.set(4, 4);
    return {
      map: pile,
      color,
      roughness: 0.98,
      metalness: 0,
      thicknessM: 0.045,
    };
  }
  if (mat === 'vinyl') {
    const { map: dance } = makeCanvasTexture('zone:dance-vinyl-v2', (ctx, size) => {
      // Damier disco classique (noir / ivoire) — pas de cyan « piscine »
      const cell = size / 10;
      for (let row = 0; row < 10; row += 1) {
        for (let col = 0; col < 10; col += 1) {
          const light = (row + col) % 2 === 0;
          ctx.fillStyle = light ? '#e7e5e4' : '#171717';
          ctx.fillRect(col * cell, row * cell, cell + 0.5, cell + 0.5);
        }
      }
      // Joints fins
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 10; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * cell, 0);
        ctx.lineTo(i * cell, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cell);
        ctx.lineTo(size, i * cell);
        ctx.stroke();
      }
      // Reflet soft chaud (scène / club), pas d’eau
      const g = ctx.createRadialGradient(size * 0.5, size * 0.35, size * 0.05, size * 0.5, size * 0.5, size * 0.7);
      g.addColorStop(0, 'rgba(255,251,235,0.22)');
      g.addColorStop(0.45, 'rgba(251,191,36,0.06)');
      g.addColorStop(1, 'rgba(0,0,0,0.18)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      // Cercle central discret
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212,175,55,0.55)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.08, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(24,24,27,0.55)';
      ctx.fill();
    }, 512);
    dance.repeat.set(1.5, 1.5);
    return {
      map: dance,
      color: '#ffffff',
      roughness: 0.38,
      metalness: 0.08,
      thicknessM: 0.04,
      emissive: '#000000',
      emissiveIntensity: 0,
    };
  }
  if (mat === 'parquet' || mat === 'wood') {
    return {
      // Lames réalistes (l’ancien « bois ambré » saturé donnait un grain orange géant).
      map: loadTiledTexture(mat === 'wood' ? '/floors/gen/deck-ipe.jpg' : '/floors/gen/oak-planks.jpg', 1, 1),
      color: '#ffffff',
      roughness: 0.42,
      metalness: 0.06,
      thicknessM: 0.02,
    };
  }
  if (mat === 'marble') {
    return {
      map: loadTiledTexture('/floors/gen/marble-veined.jpg', 1.5, 1.5),
      color: '#ffffff',
      roughness: 0.22,
      metalness: 0.15,
      thicknessM: 0.03,
    };
  }
  if (mat === 'concrete') {
    return {
      map: loadTiledTexture('/floors/gen/concrete.jpg', 1, 1),
      color: '#ffffff',
      roughness: 0.85,
      metalness: 0.05,
      thicknessM: 0.02,
    };
  }
  if (mat === 'epoxy') {
    return {
      map: loadTiledTexture('/floors/gen/epoxy-grey.jpg', 1, 1),
      color: '#ffffff',
      roughness: 0.15,
      metalness: 0.22,
      thicknessM: 0.018,
    };
  }
  if (mat === 'grass') {
    return {
      map: loadTiledTexture('/floors/gen/grass-lawn.jpg', 1.5, 1.5),
      color: '#ffffff',
      roughness: 0.95,
      metalness: 0,
      thicknessM: 0.03,
    };
  }
  if (mat === 'gravel') {
    return {
      map: loadTiledTexture('/floors/gen/gravel-light.jpg', 3, 3),
      color: '#ffffff',
      roughness: 0.92,
      metalness: 0.02,
      thicknessM: 0.025,
    };
  }
  if (mat === 'brick') {
    return {
      map: loadTiledTexture('/floors/gen/brick-pavers.jpg', 1.5, 1.5),
      color: '#ffffff',
      roughness: 0.78,
      metalness: 0.04,
      thicknessM: 0.04,
    };
  }
  // led — bandeau piste (ambre / club), pas cyan piscine
  return {
    map: null,
    color: '#18181b',
    roughness: 0.35,
    metalness: 0.25,
    emissive: '#b45309',
    emissiveIntensity: 0.35,
    thicknessM: 0.035,
  };
}

/** Textures de plateau (scène, podium, estrade) et taille d’un motif en mètres réels. */
const DECK_FINISH: Partial<Record<ZoneMaterial, { roughness: number; metalness: number }>> = {
  wood: { roughness: 0.5, metalness: 0.02 },
  parquet: { roughness: 0.45, metalness: 0.02 },
  marble: { roughness: 0.2, metalness: 0.05 },
  concrete: { roughness: 0.7, metalness: 0.02 },
  epoxy: { roughness: 0.2, metalness: 0.1 },
  grass: { roughness: 0.95, metalness: 0 },
  gravel: { roughness: 0.92, metalness: 0 },
  brick: { roughness: 0.8, metalness: 0 },
  carpet: { roughness: 0.95, metalness: 0 },
};
const DECK_SURFACES: Partial<Record<ZoneMaterial, { url: string; tileM: number; roughness: number; metalness: number }>> = Object.fromEntries(
  Object.entries(ZONE_DECK_TEXTURES).map(([mat, tex]) => [mat, { ...tex!, ...DECK_FINISH[mat as ZoneMaterial]! }]),
);

/** Matériaux « textiles / bois » : les flancs d’une estrade sont une jupe de scène, pas la même matière. */
export function deckUsesSkirt(material: ZoneMaterial | undefined): boolean {
  const mat = material ?? 'wood';
  return mat === 'wood' || mat === 'parquet' || mat === 'carpet' || mat === 'vinyl' || mat === 'led';
}

/**
 * Surface d’un plateau de `wM` × `dM` mètres : la texture est répétée à l’échelle réelle
 * (une lame de scène garde sa largeur, qu’il s’agisse d’un pupitre ou d’une scène de 12 m).
 */
export function resolveDeckSurface(material: ZoneMaterial | undefined, wM: number, dM: number): {
  map: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  emissiveIntensity?: number;
} {
  const mat = material ?? 'wood';
  const spec = DECK_SURFACES[mat];
  if (!spec) {
    const z = resolveZoneMaterialMap(mat);
    return { map: z.map, normalMap: null, color: z.color, roughness: z.roughness, metalness: z.metalness, emissive: z.emissive, emissiveIntensity: z.emissiveIntensity };
  }
  // Répétition arrondie au quart pour partager les textures en cache.
  const q = (v: number) => Math.max(0.25, Math.round((v / spec.tileM) * 4) / 4);
  const rx = q(Math.max(0.1, wM));
  const ry = q(Math.max(0.1, dM));
  const { normalMap, roughnessMap } = generatedDetailMaps(spec.url, rx, ry);
  return {
    map: loadTiledTexture(spec.url, rx, ry),
    normalMap,
    roughnessMap,
    color: '#ffffff',
    roughness: roughnessWithMap(spec.roughness, roughnessMap),
    metalness: spec.metalness,
  };
}

export function resolveChairMap(imageUrl?: string): THREE.Texture | null {
  if (!imageUrl) return null;
  return resolveImportedSurface(imageUrl, 1, 1)?.map ?? loadTiledTexture(imageUrl, 1, 1);
}

/** Sol importé : taille par défaut d’une répétition de l’image (m). */
export const DEFAULT_IMPORTED_FLOOR_TILE_M = 3.5;
/** Plateau importé : une répétition de l’image couvre 90 cm. */
const IMPORTED_TABLE_TILE_M = 0.9;

/**
 * Matière importée (couleur + relief + rugosité) répétée `repeatX` × `repeatY` :
 * assise de chaise, tapis d’allée, sol de couloir…
 */
export function resolveImportedSurface(imageUrl: string | undefined, repeatX = 1, repeatY = 1): ImportedTextureSet | null {
  if (!imageUrl) return null;
  return loadImportedTexture(imageUrl, { repeatX, repeatY });
}

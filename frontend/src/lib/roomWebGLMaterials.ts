'use client';

import * as THREE from 'three';
import type { ChairType, ChairStyle, SeatMaterial, TableShape, TableSurfaceStyle, WallTextureStyle, ZoneMaterial, OpeningMaterial } from '@/lib/roomLayoutUtils';
import { SEAT_MATERIAL_COLORS, WALL_TEXTURE_COLORS } from '@/lib/roomLayoutUtils';
import { getFloorAsset, FLOOR_TEXTURE_REPEAT_M } from '@/lib/roomFloorUtils';
import type { FloorType } from '@/lib/roomThemeUtils';

const textureCache = new Map<string, THREE.Texture>();
const canvasCache = new Map<string, THREE.CanvasTexture>();

function configureMap(tex: THREE.Texture, repeatX: number, repeatY: number) {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(Math.max(0.5, repeatX), Math.max(0.5, repeatY));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function loadTiledTexture(url: string, repeatX: number, repeatY: number): THREE.Texture {
  const key = `${url}|${repeatX.toFixed(2)}|${repeatY.toFixed(2)}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const loader = new THREE.TextureLoader();
  const tex = loader.load(url);
  configureMap(tex, repeatX, repeatY);
  textureCache.set(key, tex);
  return tex;
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
): {
  map: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  envMapIntensity: number;
  isPlan: boolean;
} {
  if (floorImageUrl) {
    const isPlan = floorImageFit !== 'tile';
    const map = isPlan
      ? loadCoverTexture(floorImageUrl)
      : loadTiledTexture(floorImageUrl, widthM / 3.5, heightM / 3.5);
    return {
      map,
      color: floorColor && floorColor !== '#ffffff' ? floorColor : '#ffffff',
      roughness: isPlan ? 0.82 : 0.7,
      metalness: 0.04,
      clearcoat: 0,
      envMapIntensity: isPlan ? 0.25 : 0.45,
      isPlan,
    };
  }
  const type = floorType && floorType !== 'custom' ? floorType : 'parquet';
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
  ) {
    roughness = type === 'epoxyMenthe' || type === 'marbreCalacatta' || type === 'marbreOr' ? 0.08 : 0.18;
    metalness = 0.12;
    clearcoat = 0.85;
    envMapIntensity = 1.1;
  } else if (type === 'moquette' || type === 'herbe' || type === 'pelouse' || type === 'prairie' || type === 'gazonSynth') {
    roughness = 0.98;
    metalness = 0;
    envMapIntensity = 0.15;
  } else if (type === 'beton' || type === 'pavesPinwheel' || type === 'pavesGranit') {
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
    || type === 'boisCharcoal' || type === 'boisMarqueterie'
  ) {
    roughness =
      type === 'boisAmber' ? 0.38 :
      type === 'boisBlond' || type === 'chevronGreige' ? 0.55 :
      type === 'boisPanel' || type === 'boisMarqueterie' ? 0.62 : 0.48;
    metalness = 0.05;
    clearcoat = type === 'boisAmber' || type === 'boisBlond' ? 0.25 : 0.1;
    envMapIntensity = 0.55;
  }

  const tint = floorColor && floorColor !== '#ffffff' ? floorColor : asset.fallback;
  return {
    map,
    color: floorColor ? tint : '#ffffff',
    roughness,
    metalness,
    clearcoat,
    envMapIntensity,
    isPlan: false,
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

function makeCanvasTexture(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
  withBump = false,
): { map: THREE.CanvasTexture; bumpMap?: THREE.CanvasTexture } {
  const cached = canvasCache.get(key);
  if (cached) {
    const bump = withBump ? canvasCache.get(`bump:${key}`) : undefined;
    return { map: cached, bumpMap: bump };
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
  return { map: tex, bumpMap };
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

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shadeRgb(r: number, g: number, b: number, factor: number): string {
  return `rgb(${Math.round(Math.min(255, Math.max(0, r * factor)))},${Math.round(Math.min(255, Math.max(0, g * factor)))},${Math.round(Math.min(255, Math.max(0, b * factor)))})`;
}

/** Texture tissu / cuir / velours pour assises. */
export function resolveSeatFabricMap(material?: SeatMaterial, tint?: string): {
  map: THREE.Texture;
  roughness: number;
  metalness: number;
} {
  const mat = material ?? 'fabric';
  const base = tint ?? '#1e3a5f';
  const key = `seat:${mat}:${base}`;
  const { map } = makeCanvasTexture(key, (ctx, size) => {
    const [r, g, b] = hexToRgb(base);
    ctx.fillStyle = shadeRgb(r, g, b, 0.85);
    ctx.fillRect(0, 0, size, size);

    if (mat === 'leather') {
      for (let i = 0; i < 120; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 4 + Math.random() * 14, 2 + Math.random() * 6, Math.random() * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
      }
      noise(ctx, size, 0.18);
      return;
    }

    if (mat === 'velvet') {
      const grad = ctx.createRadialGradient(size * 0.4, size * 0.35, 10, size * 0.5, size * 0.5, size * 0.7);
      grad.addColorStop(0, shadeRgb(r, g, b, 1.25));
      grad.addColorStop(1, shadeRgb(r, g, b, 0.7));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 2) {
        ctx.fillStyle = `rgba(255,255,255,${0.015 + (y % 4 === 0 ? 0.02 : 0)})`;
        ctx.fillRect(0, y, size, 1);
      }
      noise(ctx, size, 0.1);
      return;
    }

    if (mat === 'linen') {
      ctx.fillStyle = shadeRgb(r, g, b, 1.05);
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < size; i += 3) {
        ctx.strokeStyle = `rgba(255,255,255,0.07)`;
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0,0,0,0.05)`;
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      noise(ctx, size, 0.08);
      return;
    }

    if (mat === 'wood') {
      const grad = ctx.createLinearGradient(0, 0, size, 0);
      grad.addColorStop(0, shadeRgb(r, g, b, 0.75));
      grad.addColorStop(0.5, shadeRgb(r, g, b, 1.15));
      grad.addColorStop(1, shadeRgb(r, g, b, 0.85));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 22; i += 1) {
        ctx.strokeStyle = `rgba(40,24,8,${0.1 + Math.random() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, (i / 22) * size);
        ctx.bezierCurveTo(size * 0.35, (i / 22) * size + 6, size * 0.65, (i / 22) * size - 5, size, (i / 22) * size + 3);
        ctx.stroke();
      }
      return;
    }

    if (mat === 'plastic') {
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, shadeRgb(r, g, b, 0.9));
      grad.addColorStop(0.5, shadeRgb(r, g, b, 1.2));
      grad.addColorStop(1, shadeRgb(r, g, b, 0.95));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      noise(ctx, size, 0.05);
      return;
    }

    if (mat === 'boucle') {
      for (let y = 0; y < size; y += 2) {
        for (let x = 0; x < size; x += 2) {
          const curl = ((x * 7 + y * 13) % 5) / 5;
          ctx.fillStyle = shadeRgb(r, g, b, 0.72 + curl * 0.35);
          ctx.fillRect(x, y, 2.5, 2.5);
        }
      }
      noise(ctx, size, 0.14);
      return;
    }

    if (mat === 'suede') {
      const grad = ctx.createLinearGradient(0, 0, size * 0.6, size);
      grad.addColorStop(0, shadeRgb(r, g, b, 1.1));
      grad.addColorStop(1, shadeRgb(r, g, b, 0.75));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 80; i += 1) {
        ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
        ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 0.8);
      }
      noise(ctx, size, 0.2);
      return;
    }

    if (mat === 'mesh') {
      ctx.fillStyle = shadeRgb(r, g, b, 0.9);
      ctx.fillRect(0, 0, size, size);
      const step = size / 16;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i <= 16; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
      }
      noise(ctx, size, 0.06);
      return;
    }

    if (mat === 'rattan') {
      ctx.fillStyle = shadeRgb(r, g, b, 0.95);
      ctx.fillRect(0, 0, size, size);
      const step = size / 8;
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          const x = col * step;
          const y = row * step;
          ctx.strokeStyle = shadeRgb(r, g, b, row % 2 === 0 ? 0.65 : 1.15);
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          if (row % 2 === 0) {
            ctx.arc(x + step / 2, y + step / 2, step * 0.38, 0, Math.PI);
          } else {
            ctx.arc(x + step / 2, y + step / 2, step * 0.38, Math.PI, Math.PI * 2);
          }
          ctx.stroke();
        }
      }
      noise(ctx, size, 0.1);
      return;
    }

    // fabric weave
    for (let y = 0; y < size; y += 4) {
      for (let x = 0; x < size; x += 4) {
        const dark = (x + y) % 8 === 0;
        ctx.fillStyle = dark ? shadeRgb(r, g, b, 0.78) : shadeRgb(r, g, b, 1.08);
        ctx.fillRect(x, y, 4, 4);
      }
    }
    noise(ctx, size, 0.1);
  }, 512);

  map.repeat.set(2.5, 2.5);

  const roughness =
    mat === 'leather' ? 0.55 :
    mat === 'velvet' ? 0.95 :
    mat === 'plastic' ? 0.35 :
    mat === 'wood' ? 0.65 :
    mat === 'linen' ? 0.88 :
    mat === 'boucle' ? 0.92 :
    mat === 'suede' ? 0.88 :
    mat === 'mesh' ? 0.45 :
    mat === 'rattan' ? 0.78 : 0.82;

  const metalness =
    mat === 'plastic' ? 0.12 :
    mat === 'leather' ? 0.08 :
    mat === 'mesh' ? 0.15 : 0.02;
  return { map, roughness, metalness };
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
): WallSurfaceMaterial {
  const map = loadTiledTexture(url, repeatX, repeatY);
  return {
    map,
    bumpMap: bumpFromAlbedo(map),
    color,
    roughness,
    metalness,
    bumpScale,
  };
}
export const WALL_TEXTURE_TILE_M: Record<WallTextureStyle, { w: number; h: number }> = {
  plaster: { w: 2.4, h: 2.4 },
  brick: { w: 0.65, h: 0.32 },
  wood: { w: 1.2, h: 1.2 },
  concrete: { w: 2, h: 2 },
  wallpaper: { w: 0.55, h: 0.55 },
  stone: { w: 1.4, h: 1.4 },
  limewash: { w: 3, h: 3 },
  tadelakt: { w: 2.5, h: 2.5 },
  boardConcrete: { w: 2.8, h: 0.45 },
  paintedBrick: { w: 0.65, h: 0.32 },
  fluted: { w: 0.28, h: 2.6 },
  travertine: { w: 0.6, h: 0.6 },
  slate: { w: 0.9, h: 0.9 },
  metalCorrugated: { w: 0.35, h: 2.4 },
  metroTile: { w: 0.2, h: 0.1 },
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

export type WallSurfaceMaterial = {
  map: THREE.Texture;
  bumpMap?: THREE.Texture;
  color: string;
  roughness: number;
  metalness: number;
  bumpScale: number;
};

export function getWallTexture(style: WallTextureStyle, colorOverride?: string): WallSurfaceMaterial {
  const base = colorOverride ?? WALL_TEXTURE_COLORS[style];

  if (style === 'wood') {
    return photoWallMaterial(
      '/floors/wood-amber.png',
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
      '/floors/wood-panel.png',
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
      '/floors/marble-calacatta.png',
      2.8,
      2.8,
      colorOverride && colorOverride !== '#ffffff' ? colorOverride : '#f5f5f4',
      0.28,
      0.08,
      WALL_BUMP_SCALE.travertine ?? 0.006,
    );
  }

  const key = `wall:${style}:${base}`;
  const useBump = style !== 'limewash' && style !== 'tadelakt' && style !== 'plaster';

  const { map, bumpMap } = makeCanvasTexture(key, (ctx, size) => {
    if (style === 'brick' || style === 'paintedBrick') {
      const mortar = style === 'paintedBrick' ? '#e2e8f0' : '#c4b5a5';
      ctx.fillStyle = mortar;
      ctx.fillRect(0, 0, size, size);
      const bh = size / 10;
      const bw = size / 5;
      const tones = style === 'paintedBrick'
        ? ['#f1f5f9', '#e2e8f0', '#f8fafc', '#cbd5e1', '#f1f5f9']
        : ['#9a4a32', '#b4533c', '#8b3a2a', '#a65d45', '#7c3a28'];
      for (let row = 0; row < 10; row += 1) {
        const offset = row % 2 === 0 ? 0 : bw / 2;
        for (let col = -1; col < 6; col += 1) {
          const x = col * bw + offset;
          const y = row * bh;
          const shade = 0.85 + Math.random() * 0.25;
          ctx.fillStyle = tones[(row + col + Math.floor(Math.random() * 3)) % tones.length];
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
      ctx.fillStyle = style === 'slate' ? '#3f3f46' : '#5c574f';
      ctx.fillRect(0, 0, size, size);
      const count = style === 'slate' ? 40 : 55;
      const tones = style === 'slate'
        ? ['#52525b', '#3f3f46', '#27272a', '#71717a', '#18181b']
        : ['#8a8278', '#57534e', '#78716c', '#a8a29e', '#44403c'];
      for (let i = 0; i < count; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 6 + Math.random() * (style === 'slate' ? 28 : 32);
        ctx.fillStyle = tones[i % tones.length];
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * (0.55 + Math.random() * 0.4), Math.random(), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.stroke();
      }
      noise(ctx, size, 0.16);
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
  }, 512, useBump);

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
  if (bumpMap) bumpMap.repeat.set(repeatX, repeatY);

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
    bumpMap,
    color: '#ffffff',
    roughness,
    metalness,
    bumpScale: WALL_BUMP_SCALE[style] ?? 0,
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
  let bumpMap: THREE.Texture | undefined;
  if (base.bumpMap) {
    bumpMap = base.bumpMap.clone();
    bumpMap.repeat.set(repeatX, repeatY);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  } else if (!base.bumpMap && base.map) {
    bumpMap = bumpFromAlbedo(map);
    bumpMap.repeat.set(repeatX, repeatY);
  }
  return { ...base, map, bumpMap, bumpScale: base.bumpScale || (bumpMap ? 0.006 : 0) };
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

export const TABLE_DEFAULT_TEXTURE = '/floors/table-wood.svg';
export const TABLE_LINEN_TEXTURE = '/floors/table-linen.svg';

export function resolveTableMaterial(
  shape: TableShape,
  color?: string,
  imageUrl?: string,
  surface?: TableSurfaceStyle,
): {
  map: THREE.Texture | null;
  color: string;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
} {
  if (imageUrl) {
    return {
      map: loadTiledTexture(imageUrl, 1.2, 1.2),
      color: '#ffffff',
      roughness: 0.55,
      metalness: 0.08,
    };
  }

  const resolvedSurface = surface ?? (
    shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop'
      ? 'linen'
      : 'wood'
  );

  if (resolvedSurface === 'glass') {
    return {
      map: null,
      color: color && color !== '#ffffff' ? color : '#e2e8f0',
      roughness: 0.06,
      metalness: 0.22,
      transparent: true,
      opacity: 0.42,
    };
  }

  if (resolvedSurface === 'whiteLacquer') {
    return {
      map: null,
      color: color && color !== '#ffffff' ? color : '#fafafa',
      roughness: 0.12,
      metalness: 0.18,
    };
  }

  const textureBySurface: Record<Exclude<TableSurfaceStyle, 'glass' | 'whiteLacquer'>, string> = {
    wood: TABLE_DEFAULT_TEXTURE,
    linen: TABLE_LINEN_TEXTURE,
    walnut: '/floors/wood-charcoal.png',
    marble: '/floors/marble-calacatta.png',
    darkWood: '/floors/wood-rustic.png',
  };

  const url = textureBySurface[resolvedSurface as keyof typeof textureBySurface] ?? TABLE_DEFAULT_TEXTURE;
  const defaultColors: Record<TableSurfaceStyle, string> = {
    wood: '#f5f0e8',
    linen: '#faf7f2',
    walnut: '#d4c4a8',
    marble: '#f5f5f4',
    darkWood: '#44403c',
    whiteLacquer: '#fafafa',
    glass: '#e2e8f0',
  };

  const map = loadTiledTexture(url, 1.4, 1.4);
  const bumpScale =
    resolvedSurface === 'marble' ? 0.008 :
    resolvedSurface === 'walnut' || resolvedSurface === 'darkWood' ? 0.012 :
    resolvedSurface === 'wood' ? 0.01 : 0.006;

  return {
    map,
    bumpMap: bumpFromAlbedo(map),
    bumpScale,
    color: color && color !== '#ffffff' ? color : defaultColors[resolvedSurface],
    roughness: resolvedSurface === 'marble' ? 0.22 : resolvedSurface === 'walnut' || resolvedSurface === 'darkWood' ? 0.48 : 0.45,
    metalness: resolvedSurface === 'marble' ? 0.12 : 0.08,
  };
}

export type ChairVisual = {
  seatColor: string;
  frameColor: string;
  backHeight: number;
  seatSize: [number, number, number];
  hasArms: boolean;
  cushion: boolean;
  scale: number;
};

export const CHAIR_VISUALS: Record<ChairType, ChairVisual> = {
  BANQUET: {
    seatColor: '#1e3a5f',
    frameColor: '#c9a227',
    backHeight: 0.55,
    seatSize: [0.38, 0.06, 0.38],
    hasArms: false,
    cushion: true,
    scale: 1,
  },
  FOLDING: {
    seatColor: '#64748b',
    frameColor: '#94a3b8',
    backHeight: 0.42,
    seatSize: [0.36, 0.04, 0.34],
    hasArms: false,
    cushion: false,
    scale: 0.95,
  },
  THEATER: {
    seatColor: '#7f1d1d',
    frameColor: '#292524',
    backHeight: 0.62,
    seatSize: [0.42, 0.08, 0.4],
    hasArms: true,
    cushion: true,
    scale: 1.05,
  },
  STOOL: {
    seatColor: '#44403c',
    frameColor: '#292524',
    backHeight: 0,
    seatSize: [0.32, 0.05, 0.32],
    hasArms: false,
    cushion: false,
    scale: 0.9,
  },
  ARMCHAIR: {
    seatColor: '#1e293b',
    frameColor: '#0f172a',
    backHeight: 0.7,
    seatSize: [0.52, 0.12, 0.5],
    hasArms: true,
    cushion: true,
    scale: 1.15,
  },
  WHEELCHAIR: {
    seatColor: '#334155',
    frameColor: '#64748b',
    backHeight: 0.5,
    seatSize: [0.45, 0.08, 0.48],
    hasArms: true,
    cushion: true,
    scale: 1.1,
  },
  CROSSBACK: {
    seatColor: '#f5f0e8',
    frameColor: '#92400e',
    backHeight: 0.58,
    seatSize: [0.4, 0.05, 0.38],
    hasArms: false,
    cushion: true,
    scale: 1,
  },
  GHOST: {
    seatColor: '#e2e8f0',
    frameColor: '#cbd5e1',
    backHeight: 0.52,
    seatSize: [0.42, 0.06, 0.4],
    hasArms: false,
    cushion: false,
    scale: 1,
  },
  MESH: {
    seatColor: '#334155',
    frameColor: '#1e293b',
    backHeight: 0.48,
    seatSize: [0.44, 0.06, 0.42],
    hasArms: true,
    cushion: false,
    scale: 1,
  },
  BARSTOOL: {
    seatColor: '#44403c',
    frameColor: '#292524',
    backHeight: 0.35,
    seatSize: [0.34, 0.05, 0.34],
    hasArms: false,
    cushion: true,
    scale: 1.05,
  },
  POUF: {
    seatColor: '#7c2d12',
    frameColor: '#57534e',
    backHeight: 0,
    seatSize: [0.42, 0.22, 0.42],
    hasArms: false,
    cushion: true,
    scale: 0.95,
  },
};

const CHAIR_STYLE_TWEAKS: Record<ChairStyle, Partial<ChairVisual>> = {
  classic: { backHeight: 0.65, hasArms: true, scale: 1.1 },
  lounge: { backHeight: 0.55, seatSize: [0.58, 0.14, 0.56], scale: 1.25, cushion: true },
  club: { backHeight: 0.72, seatSize: [0.5, 0.13, 0.52], scale: 1.2, hasArms: true },
  bergere: { backHeight: 0.78, seatSize: [0.54, 0.12, 0.5], scale: 1.18, hasArms: true },
  modern: { backHeight: 0.48, seatSize: [0.48, 0.08, 0.48], scale: 1.05, hasArms: false },
  chiavari: { backHeight: 0.58, seatSize: [0.36, 0.05, 0.36], scale: 0.95, hasArms: false, cushion: false },
  napoleon: { backHeight: 0.62, seatSize: [0.42, 0.06, 0.4], scale: 1.02, hasArms: false, cushion: true },
  crossback: { backHeight: 0.58, seatSize: [0.4, 0.05, 0.38], scale: 1, hasArms: false, cushion: true },
  tolix: { backHeight: 0.42, seatSize: [0.38, 0.04, 0.36], scale: 0.98, hasArms: false, cushion: false },
  ghost: { backHeight: 0.5, seatSize: [0.42, 0.06, 0.4], scale: 1, hasArms: false, cushion: false },
  panton: { backHeight: 0.55, seatSize: [0.46, 0.08, 0.44], scale: 1.05, hasArms: false, cushion: false },
};

export function resolveChairVisual(
  chairType: ChairType,
  style?: ChairStyle,
  material?: SeatMaterial,
): ChairVisual {
  const base = { ...CHAIR_VISUALS[chairType] };
  if (chairType === 'ARMCHAIR' || style || chairType === 'CROSSBACK' || chairType === 'GHOST' || chairType === 'BARSTOOL') {
    const tweak = CHAIR_STYLE_TWEAKS[style ?? 'classic'];
    Object.assign(base, tweak);
  }
  if (material) {
    const colors = SEAT_MATERIAL_COLORS[material];
    base.seatColor = colors.seat;
    base.frameColor = colors.frame;
    if (material === 'leather' || material === 'velvet' || material === 'boucle' || material === 'suede') base.cushion = true;
    if (material === 'wood' || material === 'plastic' || material === 'mesh') base.cushion = false;
  }
  if (chairType === 'GHOST') {
    base.seatColor = '#e2e8f0';
    base.frameColor = '#cbd5e1';
    base.cushion = false;
  }
  if (chairType === 'POUF') {
    base.backHeight = 0;
    base.cushion = true;
  }
  return base;
}

export const ZONE_MATERIAL_COLORS: Record<ZoneMaterial, string> = {
  wood: '#8b6914',
  carpet: '#1e3a5f',
  vinyl: '#e7e5e4',
  led: '#fbbf24',
  marble: '#e7e5e4',
  concrete: '#9ca3af',
  parquet: '#c4a06a',
  epoxy: '#cbd5e1',
};

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
      map: loadTiledTexture('/floors/wood-amber.png', 1.8, 1.8),
      color: '#ffffff',
      roughness: 0.42,
      metalness: 0.06,
      thicknessM: 0.02,
    };
  }
  if (mat === 'marble') {
    return {
      map: loadTiledTexture('/floors/marble.svg', 1.5, 1.5),
      color: '#ffffff',
      roughness: 0.22,
      metalness: 0.15,
      thicknessM: 0.03,
    };
  }
  if (mat === 'concrete') {
    return {
      map: loadTiledTexture('/floors/concrete.svg', 2, 2),
      color: '#ffffff',
      roughness: 0.85,
      metalness: 0.05,
      thicknessM: 0.02,
    };
  }
  if (mat === 'epoxy') {
    return {
      map: loadTiledTexture('/floors/epoxy.svg', 2, 2),
      color: '#ffffff',
      roughness: 0.15,
      metalness: 0.22,
      thicknessM: 0.018,
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

export function resolveChairMap(imageUrl?: string): THREE.Texture | null {
  if (!imageUrl) return null;
  return loadTiledTexture(imageUrl, 1, 1);
}

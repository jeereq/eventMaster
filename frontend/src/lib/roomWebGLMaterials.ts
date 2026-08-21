'use client';

import * as THREE from 'three';
import type { ChairType, ChairStyle, SeatMaterial, TableShape, WallTextureStyle, ZoneMaterial } from '@/lib/roomLayoutUtils';
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
  tex.needsUpdate = true;
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

export function resolveFloorMap(
  floorType: FloorType | undefined,
  floorImageUrl: string | undefined,
  widthM: number,
  heightM: number,
): { map: THREE.Texture | null; color: string; roughness: number; metalness: number } {
  if (floorImageUrl) {
    const map = loadTiledTexture(floorImageUrl, widthM / 3.5, heightM / 3.5);
    return { map, color: '#ffffff', roughness: 0.75, metalness: 0.05 };
  }
  const type = floorType && floorType !== 'custom' ? floorType : 'parquet';
  const asset = getFloorAsset(type);
  const tileM = FLOOR_TEXTURE_REPEAT_M[type] ?? 2;
  const map = loadTiledTexture(asset.url, widthM / tileM, heightM / tileM);

  let roughness = 0.85;
  let metalness = 0.04;
  if (type === 'epoxy' || type === 'marbre') {
    roughness = 0.25;
    metalness = 0.15;
  } else if (type === 'moquette' || type === 'herbe' || type === 'pelouse' || type === 'prairie' || type === 'gazonSynth') {
    roughness = 0.98;
    metalness = 0;
  } else if (type === 'beton') {
    roughness = 0.7;
    metalness = 0.08;
  }

  return { map, color: '#ffffff', roughness, metalness };
}

function makeCanvasTexture(
  key: string,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 256,
): THREE.CanvasTexture {
  const cached = canvasCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const empty = new THREE.CanvasTexture(canvas);
    canvasCache.set(key, empty);
    return empty;
  }
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  canvasCache.set(key, tex);
  return tex;
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

export function getWallTexture(style: WallTextureStyle, colorOverride?: string): {
  map: THREE.Texture;
  color: string;
  roughness: number;
  metalness: number;
} {
  const base = colorOverride ?? WALL_TEXTURE_COLORS[style];
  const key = `wall:${style}:${base}`;

  const map = makeCanvasTexture(key, (ctx, size) => {
    if (style === 'brick') {
      ctx.fillStyle = '#6b3a2a';
      ctx.fillRect(0, 0, size, size);
      const bh = size / 8;
      const bw = size / 4;
      for (let row = 0; row < 8; row += 1) {
        const offset = row % 2 === 0 ? 0 : bw / 2;
        for (let col = -1; col < 5; col += 1) {
          const x = col * bw + offset;
          const y = row * bh;
          ctx.fillStyle = row % 3 === 0 ? '#a0522d' : '#b4533c';
          ctx.fillRect(x + 1, y + 1, bw - 2, bh - 2);
          ctx.strokeStyle = '#e8ddd4';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, bw - 2, bh - 2);
        }
      }
      noise(ctx, size, 0.12);
      return;
    }

    if (style === 'wood') {
      const grad = ctx.createLinearGradient(0, 0, size, 0);
      grad.addColorStop(0, '#5c3d1e');
      grad.addColorStop(0.5, '#8b6914');
      grad.addColorStop(1, '#6b4a22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 18; i += 1) {
        ctx.strokeStyle = `rgba(40,24,8,${0.08 + Math.random() * 0.12})`;
        ctx.beginPath();
        ctx.moveTo(0, (i / 18) * size + Math.random() * 4);
        ctx.bezierCurveTo(size * 0.3, (i / 18) * size + 8, size * 0.7, (i / 18) * size - 6, size, (i / 18) * size + 4);
        ctx.stroke();
      }
      noise(ctx, size, 0.1);
      return;
    }

    if (style === 'concrete') {
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(0, 0, size, size);
      noise(ctx, size, 0.25);
      ctx.strokeStyle = 'rgba(60,60,70,0.15)';
      ctx.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);
      return;
    }

    if (style === 'stone') {
      ctx.fillStyle = '#6b6560';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 40; i += 1) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 8 + Math.random() * 28;
        ctx.fillStyle = Math.random() > 0.5 ? '#8a8278' : '#57534e';
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.7, Math.random(), 0, Math.PI * 2);
        ctx.fill();
      }
      noise(ctx, size, 0.15);
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

    // plaster default
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);
    noise(ctx, size, 0.14);
  });

  map.repeat.set(style === 'brick' ? 4 : style === 'wood' ? 2.5 : 3, style === 'brick' ? 3 : 2);

  const roughness =
    style === 'wood' ? 0.7 :
    style === 'concrete' ? 0.9 :
    style === 'stone' ? 0.92 :
    style === 'wallpaper' ? 0.8 :
    style === 'brick' ? 0.95 : 0.88;

  return { map, color: '#ffffff', roughness, metalness: style === 'concrete' ? 0.08 : 0.02 };
}

export const TABLE_DEFAULT_TEXTURE = '/floors/table-wood.svg';
export const TABLE_LINEN_TEXTURE = '/floors/table-linen.svg';

export function resolveTableMaterial(
  shape: TableShape,
  color?: string,
  imageUrl?: string,
): { map: THREE.Texture | null; color: string; roughness: number; metalness: number } {
  if (imageUrl) {
    return {
      map: loadTiledTexture(imageUrl, 1.2, 1.2),
      color: '#ffffff',
      roughness: 0.55,
      metalness: 0.08,
    };
  }
  const url =
    shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop'
      ? TABLE_LINEN_TEXTURE
      : TABLE_DEFAULT_TEXTURE;
  return {
    map: loadTiledTexture(url, 1.4, 1.4),
    color: color && color !== '#ffffff' ? color : '#f5f0e8',
    roughness: 0.45,
    metalness: 0.08,
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
};

const CHAIR_STYLE_TWEAKS: Record<ChairStyle, Partial<ChairVisual>> = {
  classic: { backHeight: 0.65, hasArms: true, scale: 1.1 },
  lounge: { backHeight: 0.55, seatSize: [0.58, 0.14, 0.56], scale: 1.25, cushion: true },
  club: { backHeight: 0.72, seatSize: [0.5, 0.13, 0.52], scale: 1.2, hasArms: true },
  bergere: { backHeight: 0.78, seatSize: [0.54, 0.12, 0.5], scale: 1.18, hasArms: true },
  modern: { backHeight: 0.48, seatSize: [0.48, 0.08, 0.48], scale: 1.05, hasArms: false },
  chiavari: { backHeight: 0.58, seatSize: [0.36, 0.05, 0.36], scale: 0.95, hasArms: false, cushion: false },
};

export function resolveChairVisual(
  chairType: ChairType,
  style?: ChairStyle,
  material?: SeatMaterial,
): ChairVisual {
  const base = { ...CHAIR_VISUALS[chairType] };
  if (chairType === 'ARMCHAIR' || style) {
    const tweak = CHAIR_STYLE_TWEAKS[style ?? 'classic'];
    Object.assign(base, tweak);
  }
  if (material) {
    const colors = SEAT_MATERIAL_COLORS[material];
    base.seatColor = colors.seat;
    base.frameColor = colors.frame;
    if (material === 'leather' || material === 'velvet') base.cushion = true;
    if (material === 'wood' || material === 'plastic') base.cushion = false;
  }
  return base;
}

export const ZONE_MATERIAL_COLORS: Record<ZoneMaterial, string> = {
  wood: '#8b6914',
  carpet: '#1e3a5f',
  vinyl: '#312e81',
  led: '#0ea5e9',
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
} {
  const mat = material ?? 'wood';
  const color = ZONE_MATERIAL_COLORS[mat];
  if (mat === 'carpet' || mat === 'vinyl') {
    return {
      map: loadTiledTexture('/floors/carpet.svg', 2.5, 2.5),
      color: mat === 'vinyl' ? '#4c1d95' : color,
      roughness: 0.95,
      metalness: 0,
    };
  }
  if (mat === 'parquet' || mat === 'wood') {
    return {
      map: loadTiledTexture('/floors/parquet-oak.svg', 2, 2),
      color: '#ffffff',
      roughness: 0.7,
      metalness: 0.05,
    };
  }
  if (mat === 'marble') {
    return {
      map: loadTiledTexture('/floors/marble.svg', 1.5, 1.5),
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0.12,
    };
  }
  if (mat === 'concrete') {
    return {
      map: loadTiledTexture('/floors/concrete.svg', 2, 2),
      color: '#ffffff',
      roughness: 0.85,
      metalness: 0.05,
    };
  }
  if (mat === 'epoxy') {
    return {
      map: loadTiledTexture('/floors/epoxy.svg', 2, 2),
      color: '#ffffff',
      roughness: 0.2,
      metalness: 0.2,
    };
  }
  // led
  return {
    map: loadTiledTexture('/floors/epoxy.svg', 1.2, 1.2),
    color: '#0ea5e9',
    roughness: 0.25,
    metalness: 0.4,
    emissive: '#0284c7',
    emissiveIntensity: 0.35,
  };
}

export function resolveChairMap(imageUrl?: string): THREE.Texture | null {
  if (!imageUrl) return null;
  return loadTiledTexture(imageUrl, 1, 1);
}

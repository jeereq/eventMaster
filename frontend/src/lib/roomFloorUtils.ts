import type React from 'react';
import type { FloorType } from '@/lib/roomThemeUtils';

export const floorTypeLabels: Record<FloorType, string> = {
  parquet: 'Parquet Hongrie',
  chevron: 'Parquet chevron',
  bois: 'Lames de chêne',
  carrelage: 'Carrelage pierre',
  marbre: 'Marbre veiné',
  damier: 'Damier',
  terrazzo: 'Terrazzo',
  pierre: 'Dalles de pierre',
  moquette: 'Moquette velours',
  herbe: 'Gazon naturel',
  pelouse: 'Pelouse fine',
  gazonSynth: 'Gazon synthétique',
  prairie: 'Prairie / jardin',
  sable: 'Sable',
  beton: 'Béton poli',
  epoxy: 'Résine brillante',
  brique: 'Brique',
  custom: 'Image importée',
};

type FloorAsset = {
  url: string;
  size: string;
  fallback: string;
};

const DAMIER_TILE = '36px 36px';

const FLOOR_ASSETS: Record<Exclude<FloorType, 'custom'>, FloorAsset> = {
  parquet: { url: '/floors/parquet-herringbone.svg', size: '88px 88px', fallback: '#c4a06a' },
  chevron: { url: '/floors/chevron.svg', size: '72px 44px', fallback: '#c9a06a' },
  bois: { url: '/floors/parquet-oak.svg', size: '96px 96px', fallback: '#d2b07a' },
  carrelage: { url: '/floors/tile.svg', size: '56px 56px', fallback: '#e2dcd0' },
  marbre: { url: '/floors/marble.svg', size: DAMIER_TILE, fallback: '#ebe6dc' },
  damier: { url: '/floors/damier.svg', size: DAMIER_TILE, fallback: '#1c1917' },
  terrazzo: { url: '/floors/terrazzo.svg', size: '64px 64px', fallback: '#e8e0d4' },
  pierre: { url: '/floors/pierre.svg', size: DAMIER_TILE, fallback: '#c8c0b4' },
  moquette: { url: '/floors/carpet.svg', size: '56px 56px', fallback: '#1a1528' },
  herbe: { url: '/floors/grass.svg', size: DAMIER_TILE, fallback: '#166534' },
  pelouse: { url: '/floors/pelouse.svg', size: DAMIER_TILE, fallback: '#22c55e' },
  gazonSynth: { url: '/floors/gazon-synth.svg', size: DAMIER_TILE, fallback: '#15803d' },
  prairie: { url: '/floors/prairie.svg', size: DAMIER_TILE, fallback: '#65a30d' },
  sable: { url: '/floors/sable.svg', size: '48px 48px', fallback: '#e8d5a3' },
  beton: { url: '/floors/concrete.svg', size: DAMIER_TILE, fallback: '#8b95a3' },
  epoxy: { url: '/floors/epoxy.svg', size: DAMIER_TILE, fallback: '#cbd5e1' },
  brique: { url: '/floors/brique.svg', size: '64px 32px', fallback: '#b45309' },
};

function lightingOverlays(floorType: FloorType): { image: string; size: string; repeat: string; blend: string } {
  if (floorType === 'moquette' || floorType === 'damier') {
    return {
      image: [
        'radial-gradient(ellipse at 50% 38%, rgba(80,60,120,0.16) 0%, transparent 55%)',
        'linear-gradient(180deg, rgba(0,0,0,0.28) 0%, transparent 38%, rgba(0,0,0,0.18) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'soft-light, multiply',
    };
  }
  if (floorType === 'herbe' || floorType === 'pelouse' || floorType === 'gazonSynth' || floorType === 'prairie' || floorType === 'sable') {
    return {
      image: [
        'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.1) 0%, transparent 50%)',
        'linear-gradient(180deg, rgba(20,40,10,0.22) 0%, transparent 42%, rgba(10,30,8,0.2) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'overlay, multiply',
    };
  }
  if (floorType === 'epoxy' || floorType === 'marbre') {
    return {
      image: [
        'radial-gradient(ellipse at 50% 42%, transparent 40%, rgba(12,16,28,0.28) 100%)',
        'linear-gradient(118deg, rgba(255,255,255,0.28) 0%, transparent 32%, rgba(20,24,36,0.12) 100%)',
        'linear-gradient(180deg, rgba(8,12,24,0.18) 0%, transparent 36%, rgba(255,255,255,0.06) 100%)',
      ].join(', '),
      size: '100% 100%, 100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat, no-repeat',
      blend: 'multiply, overlay, soft-light',
    };
  }
  return {
    image: [
      'radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(28,14,4,0.26) 100%)',
      'linear-gradient(118deg, rgba(255,255,255,0.14) 0%, transparent 34%, rgba(40,20,6,0.12) 100%)',
      'linear-gradient(180deg, rgba(20,10,4,0.2) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)',
    ].join(', '),
    size: '100% 100%, 100% 100%, 100% 100%',
    repeat: 'no-repeat, no-repeat, no-repeat',
    blend: 'multiply, overlay, soft-light',
  };
}

export function getFloorPatternStyle(floorType: FloorType, _accentColor = '#94a3b8'): React.CSSProperties {
  if (floorType === 'custom') {
    return { backgroundColor: '#c4a06a' };
  }
  const asset = FLOOR_ASSETS[floorType] ?? FLOOR_ASSETS.parquet;
  const light = lightingOverlays(floorType);
  return {
    backgroundColor: asset.fallback,
    backgroundImage: `${light.image}, url(${asset.url})`,
    backgroundSize: `${light.size}, ${asset.size}`,
    backgroundRepeat: `${light.repeat}, repeat`,
    backgroundBlendMode: `${light.blend}, normal` as React.CSSProperties['backgroundBlendMode'],
  };
}

export function resolveFloorStyle(
  floorType: FloorType | undefined,
  floorImageUrl?: string | undefined,
  accentColor?: string,
): React.CSSProperties {
  if (floorImageUrl) {
    return {
      backgroundColor: '#8b6840',
      backgroundImage: [
        'radial-gradient(ellipse at 50% 42%, transparent 48%, rgba(28,14,4,0.26) 100%)',
        'linear-gradient(180deg, rgba(20,10,4,0.18) 0%, transparent 40%, rgba(255,255,255,0.05) 100%)',
        `url(${floorImageUrl})`,
      ].join(', '),
      backgroundSize: '100% 100%, 100% 100%, cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return getFloorPatternStyle(floorType ?? 'parquet', accentColor);
}

/** 0 = plat, 100 = perspective 2,5D max. `depthView` historique = 55. */
export function resolveDepthAmount(meta?: {
  depthView?: boolean;
  depthAmount?: number;
} | null): number {
  if (typeof meta?.depthAmount === 'number' && !Number.isNaN(meta.depthAmount)) {
    return Math.max(0, Math.min(100, Math.round(meta.depthAmount)));
  }
  return meta?.depthView ? 55 : 0;
}

/** Vue invité : conserver le réglage org, sinon une profondeur lisible par défaut. */
export const GUEST_PLAN_DEFAULT_DEPTH = 48;

export function resolveGuestDepthAmount(meta?: {
  depthView?: boolean;
  depthAmount?: number;
} | null): number {
  const resolved = resolveDepthAmount(meta);
  return resolved > 0 ? resolved : GUEST_PLAN_DEFAULT_DEPTH;
}

export function depthScaleForY(yPct: number, amount: number): number {
  if (amount <= 0) return 1;
  const t = Math.min(1, Math.max(0, yPct / 100));
  const strength = amount / 100;
  const far = 0.58;
  const near = 1;
  return 1 - (1 - (far + t * (near - far))) * strength;
}

export function furnitureDepthStyle(yPct: number, amount: number): React.CSSProperties {
  if (amount <= 0) return {};
  const t = Math.min(1, Math.max(0, yPct / 100));
  const strength = amount / 100;
  const brightness = 1 - (1 - (0.76 + t * 0.24)) * strength;
  const shadowY = 2 + t * 16 * strength;
  const shadowBlur = 6 + t * 22 * strength;
  return {
    zIndex: Math.round(8 + t * 48),
    filter: `brightness(${brightness.toFixed(3)})`,
    ['--em-item-shadow' as string]: `0 ${shadowY.toFixed(1)}px ${shadowBlur.toFixed(1)}px rgba(12, 8, 4, ${0.18 + t * 0.28 * strength})`,
  };
}

export function depthCanvasVars(amount: number): React.CSSProperties {
  if (amount <= 0) return {};
  return {
    ['--em-depth-perspective' as string]: `${2100 - amount * 7}px`,
    ['--em-depth-origin' as string]: `${84 + amount * 0.06}%`,
    ['--em-depth-haze' as string]: String(amount / 100),
    ['--em-depth-rotate' as string]: `${(amount / 100) * 38}deg`,
  };
}

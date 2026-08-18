import type React from 'react';
import type { FloorType } from '@/lib/roomThemeUtils';

export const floorTypeLabels: Record<FloorType, string> = {
  parquet: 'Parquet point de Hongrie',
  carrelage: 'Carrelage pierre',
  marbre: 'Marbre veiné',
  moquette: 'Moquette velours',
  herbe: 'Gazon',
  beton: 'Béton poli',
  bois: 'Parquet à lames',
  custom: 'Image importée',
};

type FloorAsset = {
  url: string;
  size: string;
  fallback: string;
};

const FLOOR_ASSETS: Record<Exclude<FloorType, 'custom'>, FloorAsset> = {
  parquet: { url: '/floors/parquet-herringbone.svg', size: '360px 360px', fallback: '#c4a06a' },
  bois: { url: '/floors/parquet-oak.svg', size: '380px 380px', fallback: '#d2b07a' },
  carrelage: { url: '/floors/tile.svg', size: '220px 220px', fallback: '#e2dcd0' },
  marbre: { url: '/floors/marble.svg', size: '420px 420px', fallback: '#ebe6dc' },
  moquette: { url: '/floors/carpet.svg', size: '180px 180px', fallback: '#1a1528' },
  herbe: { url: '/floors/grass.svg', size: '260px 260px', fallback: '#166534' },
  beton: { url: '/floors/concrete.svg', size: '320px 320px', fallback: '#8b95a3' },
};

function lightingOverlays(floorType: FloorType): { image: string; size: string; repeat: string; blend: string } {
  if (floorType === 'moquette') {
    return {
      image: 'radial-gradient(ellipse at 50% 38%, rgba(80,60,120,0.18) 0%, transparent 55%), radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.45) 0%, transparent 70%)',
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'soft-light, multiply',
    };
  }
  if (floorType === 'herbe') {
    return {
      image: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.08) 0%, transparent 50%), radial-gradient(ellipse at 50% 100%, rgba(10,40,10,0.35) 0%, transparent 65%)',
      size: '100% 100%, 100% 100%',
      repeat: 'no-repeat, no-repeat',
      blend: 'overlay, multiply',
    };
  }
  return {
    image: [
      'radial-gradient(ellipse at 50% 42%, transparent 42%, rgba(28,14,4,0.28) 100%)',
      'linear-gradient(118deg, rgba(255,255,255,0.16) 0%, transparent 34%, rgba(40,20,6,0.14) 100%)',
    ].join(', '),
    size: '100% 100%, 100% 100%',
    repeat: 'no-repeat, no-repeat',
    blend: 'multiply, overlay',
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
  floorImageUrl: string | undefined,
  accentColor?: string,
): React.CSSProperties {
  if (floorImageUrl) {
    return {
      backgroundColor: '#8b6840',
      backgroundImage: [
        'radial-gradient(ellipse at 50% 42%, transparent 48%, rgba(28,14,4,0.26) 100%)',
        `url(${floorImageUrl})`,
      ].join(', '),
      backgroundSize: '100% 100%, cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return getFloorPatternStyle(floorType ?? 'parquet', accentColor);
}

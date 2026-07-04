import type React from 'react';
import type { FloorType } from '@/lib/roomThemeUtils';

export const floorTypeLabels: Record<FloorType, string> = {
  parquet: 'Parquet',
  carrelage: 'Carrelage',
  marbre: 'Marbre',
  moquette: 'Moquette / Tissu',
  herbe: 'Herbe / Gazon',
  beton: 'Béton / Ardoise',
  bois: 'Planches bois',
  custom: 'Image importée',
};

export function getFloorPatternStyle(floorType: FloorType, accentColor = '#94a3b8'): React.CSSProperties {
  switch (floorType) {
    case 'parquet':
      return {
        backgroundColor: '#c4a574',
        backgroundImage: `
          repeating-linear-gradient(90deg, transparent, transparent 36px, rgba(0,0,0,0.07) 36px, rgba(0,0,0,0.07) 38px),
          repeating-linear-gradient(0deg, transparent, transparent 16px, rgba(255,255,255,0.1) 16px, rgba(255,255,255,0.1) 18px),
          linear-gradient(160deg, #dcc9a3 0%, #a8895c 55%, #8b7048 100%)
        `,
      };
    case 'carrelage':
      return {
        backgroundColor: '#e2e8f0',
        backgroundImage: `
          linear-gradient(rgba(0,0,0,0.09) 1.5px, transparent 1.5px),
          linear-gradient(90deg, rgba(0,0,0,0.09) 1.5px, transparent 1.5px),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.35) 0%, transparent 70%),
          linear-gradient(145deg, #f8fafc 0%, #cbd5e1 100%)
        `,
        backgroundSize: '28px 28px, 28px 28px, 28px 28px, 100% 100%',
      };
    case 'marbre':
      return {
        backgroundColor: '#f1f5f9',
        backgroundImage: `
          radial-gradient(ellipse 80% 50% at 20% 40%, rgba(255,255,255,0.9) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 75% 65%, rgba(148,163,184,0.25) 0%, transparent 45%),
          radial-gradient(ellipse 50% 30% at 50% 20%, rgba(255,255,255,0.6) 0%, transparent 40%),
          linear-gradient(135deg, #f8fafc 0%, #e2e8f0 40%, #f1f5f9 100%)
        `,
      };
    case 'moquette':
      return {
        backgroundColor: '#334155',
        backgroundImage: `
          repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 6px),
          repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 6px),
          linear-gradient(180deg, color-mix(in srgb, ${accentColor} 25%, #1e293b) 0%, #0f172a 100%)
        `,
      };
    case 'herbe':
      return {
        backgroundColor: '#15803d',
        backgroundImage: `
          radial-gradient(circle at 15% 25%, rgba(255,255,255,0.12) 0%, transparent 8%),
          radial-gradient(circle at 85% 70%, rgba(255,255,255,0.08) 0%, transparent 10%),
          radial-gradient(circle at 45% 55%, rgba(0,0,0,0.06) 0%, transparent 12%),
          repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px),
          linear-gradient(180deg, #4ade80 0%, #16a34a 45%, #14532d 100%)
        `,
      };
    case 'beton':
      return {
        backgroundColor: '#64748b',
        backgroundImage: `
          radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 25%),
          radial-gradient(circle at 70% 80%, rgba(0,0,0,0.08) 0%, transparent 20%),
          linear-gradient(135deg, #94a3b8 0%, #64748b 50%, #475569 100%)
        `,
      };
    case 'bois':
      return {
        backgroundColor: '#92400e',
        backgroundImage: `
          repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.12) 48px, rgba(0,0,0,0.12) 50px),
          linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 40%, rgba(0,0,0,0.06) 100%),
          linear-gradient(90deg, #b45309 0%, #92400e 30%, #78350f 60%, #92400e 100%)
        `,
      };
    case 'custom':
    default:
      return { backgroundColor: '#f1f5f9' };
  }
}

export function resolveFloorStyle(
  floorType: FloorType | undefined,
  floorImageUrl: string | undefined,
  accentColor?: string,
): React.CSSProperties {
  if (floorImageUrl) {
    return {
      backgroundImage: `url(${floorImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return getFloorPatternStyle(floorType ?? 'parquet', accentColor);
}

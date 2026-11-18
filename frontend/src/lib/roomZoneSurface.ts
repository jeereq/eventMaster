/**
 * Revêtement des zones (estrades, pièces, pistes), partagé par la vue 3D et le
 * plan 2D : même texture, à la même taille réelle (`tileM` mètres par motif).
 *
 * Module pur (sans three.js).
 */
import type React from 'react';
import type { ZoneMaterial } from '@/lib/roomLayoutUtils';

export const ZONE_MATERIAL_COLORS: Record<ZoneMaterial, string> = {
  wood: '#8b6914',
  carpet: '#1e3a5f',
  vinyl: '#e7e5e4',
  led: '#fbbf24',
  marble: '#e7e5e4',
  concrete: '#9ca3af',
  parquet: '#c4a06a',
  epoxy: '#cbd5e1',
  grass: '#4d7c3f',
  gravel: '#78716c',
  brick: '#b45309',
};

/** Textures « métriques » des zones (un motif = `tileM` mètres). */
export const ZONE_DECK_TEXTURES: Partial<Record<ZoneMaterial, { url: string; tileM: number }>> = {
  wood: { url: '/floors/gen/deck-ipe.jpg', tileM: 1.8 },
  parquet: { url: '/floors/gen/oak-planks.jpg', tileM: 1.8 },
  marble: { url: '/floors/gen/marble-veined.jpg', tileM: 1.4 },
  concrete: { url: '/floors/gen/concrete-polished.jpg', tileM: 2.4 },
  epoxy: { url: '/floors/gen/epoxy-grey.jpg', tileM: 2.4 },
  grass: { url: '/floors/gen/turf-synthetic.jpg', tileM: 1.5 },
  gravel: { url: '/floors/gen/gravel-light.jpg', tileM: 1.2 },
  brick: { url: '/floors/gen/brick-pavers.jpg', tileM: 1.4 },
  carpet: { url: '/floors/gen/carpet-navy.jpg', tileM: 1.2 },
};

/** Texture d’une zone sans matériau métrique (étirée une fois, teintée par la couleur). */
const ZONE_FALLBACK_TEXTURE = '/floors/gen/deck-ipe.jpg';

const pct = (v: number) => `${Math.round(v * 1000) / 1000}%`;

/**
 * Fond CSS d’une zone dans le plan 2D, calé sur la surface 3D :
 * - matériau métrique : texture à l’échelle réelle, sans teinte (comme en 3D) ;
 * - moquette : teinte de la zone sur la moquette ;
 * - piste vinyle : damier noir / ivoire ; LED : dalle sombre ambrée ;
 * - sans matériau : bois teinté par la couleur de la zone.
 */
export function zoneTopViewStyle(
  zone: { material?: ZoneMaterial; color?: string; zoneKind?: string },
  widthM: number,
  heightM: number,
): React.CSSProperties {
  // Emplacement sans murs : sol de la salle visible, voile coloré et bordure en tirets.
  if (zone.zoneKind === 'plot') {
    const c = zone.color ?? '#475569';
    return {
      backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
      outline: `2px dashed ${c}`,
      outlineOffset: '-2px',
    };
  }
  const material = zone.material;
  const w = Math.max(0.1, widthM);
  const h = Math.max(0.1, heightM);
  if (material === 'vinyl') {
    // 3D : damier 10 × 10 répété 1,5 fois sur la zone.
    return {
      backgroundColor: '#171717',
      backgroundImage: 'repeating-conic-gradient(#e7e5e4 0 25%, #171717 0 50%)',
      backgroundSize: `${pct(100 / 7.5)} ${pct(100 / 7.5)}`,
    };
  }
  if (material === 'led') {
    return {
      backgroundColor: '#18181b',
      backgroundImage: 'radial-gradient(ellipse at 50% 50%, rgba(245,158,11,0.45), rgba(180,83,9,0.15) 70%)',
    };
  }
  if (material === 'carpet') {
    const spec = ZONE_DECK_TEXTURES.carpet!;
    return {
      backgroundColor: zone.color ?? ZONE_MATERIAL_COLORS.carpet,
      backgroundImage: `url(${spec.url})`,
      backgroundSize: `${pct((spec.tileM / w) * 100)} ${pct((spec.tileM / h) * 100)}`,
      backgroundBlendMode: 'multiply',
    };
  }
  const spec = material ? ZONE_DECK_TEXTURES[material] : undefined;
  if (spec) {
    return {
      backgroundColor: ZONE_MATERIAL_COLORS[material!],
      backgroundImage: `url(${spec.url})`,
      backgroundSize: `${pct((spec.tileM / w) * 100)} ${pct((spec.tileM / h) * 100)}`,
    };
  }
  // Piste de danse : bois naturel, non teinté (comme en 3D).
  const tint = zone.zoneKind === 'dance' ? undefined : zone.color;
  return {
    backgroundColor: tint ?? '#ffffff',
    backgroundImage: `url(${ZONE_FALLBACK_TEXTURE})`,
    backgroundSize: '100% 100%',
    backgroundBlendMode: 'multiply',
  };
}

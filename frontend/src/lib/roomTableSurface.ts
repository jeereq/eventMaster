/**
 * Plateaux de table (textures et surface par défaut), partagés par la vue 3D
 * et le plan 2D pour qu’une table ait le même aspect partout.
 *
 * Module pur (sans three.js).
 */
import type { TableSurfaceStyle } from '@/lib/roomLayoutUtils';

export const TABLE_DEFAULT_TEXTURE = '/floors/gen/table-wood.jpg';
export const TABLE_LINEN_TEXTURE = '/floors/gen/table-linen.jpg';

export const TABLE_SURFACE_TEXTURES: Record<Exclude<TableSurfaceStyle, 'glass' | 'whiteLacquer'>, string> = {
  wood: TABLE_DEFAULT_TEXTURE,
  linen: TABLE_LINEN_TEXTURE,
  walnut: '/floors/gen/table-walnut.jpg',
  marble: '/floors/gen/marble-calacatta.jpg',
  darkWood: '/floors/gen/table-darkwood.jpg',
};

/** Surface effective : nappe pour les tables rondes, bois pour les autres. */
export function resolveTableSurface(shape: string, surface?: TableSurfaceStyle): TableSurfaceStyle {
  if (surface) return surface;
  return shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop' ? 'linen' : 'wood';
}

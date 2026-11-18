/**
 * Apparence des chaises (couleurs d’assise et de structure, gabarit), partagée
 * par la vue 3D et le plan 2D pour qu’une chaise ait la même teinte partout.
 *
 * Module pur (sans three.js).
 */
import type { ChairType, ChairStyle, SeatMaterial } from '@/lib/roomLayoutUtils';
import { SEAT_MATERIAL_COLORS } from '@/lib/roomLayoutUtils';

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
    seatColor: '#faf7f2',
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
  louis: { backHeight: 0.7, seatSize: [0.42, 0.07, 0.4], scale: 1.05, hasArms: false, cushion: true },
  ovalBack: { backHeight: 0.68, seatSize: [0.44, 0.08, 0.42], scale: 1.08, hasArms: false, cushion: true },
  wishbone: { backHeight: 0.62, seatSize: [0.4, 0.04, 0.38], scale: 1, hasArms: false, cushion: false },
  tiffany: { backHeight: 0.6, seatSize: [0.38, 0.05, 0.36], scale: 0.98, hasArms: false, cushion: true },
  phoenix: { backHeight: 0.72, seatSize: [0.44, 0.07, 0.42], scale: 1.08, hasArms: false, cushion: true },
  windsor: { backHeight: 0.6, seatSize: [0.44, 0.045, 0.42], scale: 1.02, hasArms: false, cushion: false },
  bistro: { backHeight: 0.5, seatSize: [0.4, 0.035, 0.38], scale: 0.98, hasArms: false, cushion: false },
  scandi: { backHeight: 0.42, seatSize: [0.46, 0.05, 0.44], scale: 1, hasArms: false, cushion: false },
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
  if (style === 'chiavari' && (!material || material === 'linen' || material === 'fabric')) {
    base.frameColor = '#c9a227';
    base.seatColor = '#faf7f2';
    base.cushion = true;
  }
  if (style === 'tiffany' && !material) {
    base.frameColor = '#d4af37';
    base.seatColor = '#faf7f2';
    base.cushion = true;
  }
  if (style === 'phoenix' && !material) {
    base.frameColor = '#c9a227';
    base.seatColor = '#4c1d95';
    base.cushion = true;
  }
  if (style === 'windsor' && !material) {
    base.frameColor = '#8a5a34';
    base.seatColor = '#8a5a34';
    base.cushion = false;
  }
  if (style === 'bistro' && !material) {
    base.frameColor = '#3b2416';
    base.seatColor = '#d9c08f';
    base.cushion = false;
  }
  if (style === 'scandi' && !material) {
    base.frameColor = '#c9a273';
    base.seatColor = '#e7e2d8';
    base.cushion = false;
  }
  if (style === 'wishbone' && !material) {
    base.frameColor = '#92400e';
    base.seatColor = '#e7e5e4';
    base.cushion = false;
  }
  if (style === 'ovalBack' && (!material || material === 'velvet' || material === 'linen' || material === 'fabric')) {
    base.seatColor = '#c4a4a4';
    base.frameColor = '#d6c4b0';
    base.cushion = true;
  }
  if (style === 'louis' && !material) {
    base.seatColor = '#f8fafc';
    base.frameColor = '#f5f5f4';
    base.cushion = true;
  }
  if (chairType === 'FOLDING' && (material === 'plastic' || material === 'linen')) {
    base.frameColor = '#f8fafc';
    base.seatColor = '#f4f4f5';
    base.cushion = false;
  }
  if (chairType === 'FOLDING' && material === 'wood') {
    base.frameColor = '#1c1917';
    base.seatColor = '#f5f0e8';
    base.cushion = true;
  }
  if (style === 'napoleon' && (material === 'linen' || material === 'plastic' || !material)) {
    base.frameColor = '#f8fafc';
    base.seatColor = '#f4f4f5';
    base.cushion = true;
  }
  if (style === 'lounge' && (material === 'suede' || material === 'velvet')) {
    base.seatColor = '#ea580c';
    base.frameColor = '#171717';
    base.cushion = true;
  }
  if (chairType === 'THEATER' && (material === 'velvet' || material === 'fabric')) {
    base.seatColor = '#1e3a5f';
    base.frameColor = '#292524';
    base.cushion = true;
  }
  return base;
}

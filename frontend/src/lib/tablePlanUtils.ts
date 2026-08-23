export type TableShape = 'round' | 'rectangular' | 'square' | 'oval' | 'cocktail' | 'highTop';

import type React from 'react';
import type { TableSurfaceStyle } from '@/lib/roomLayoutUtils';

export interface TablePlanTable {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  seats?: Record<number, string | null>;
}

export function getTableShapeLabel(shape: TableShape | string): string {
  switch (shape) {
    case 'round':
      return 'Ronde';
    case 'rectangular':
      return 'Rectangulaire';
    case 'square':
      return 'Carrée';
    case 'oval':
      return 'Ovale';
    default:
      return 'Table';
  }
}

export function getTableShapeDescription(shape: TableShape | string): string {
  switch (shape) {
    case 'round':
      return 'Disposition circulaire, idéale pour favoriser les échanges entre tous les convives.';
    case 'rectangular':
      return 'Table allongée, parfaite pour les grands groupes ou les tables d\'honneur.';
    case 'square':
      return 'Format compact à quatre côtés, pratique pour les espaces restreints.';
    case 'oval':
      return 'Forme elliptique élégante, combinant convivialité et esthétique.';
    default:
      return '';
  }
}

export function getTableShapeEmoji(shape: TableShape | string): string {
  switch (shape) {
    case 'round':
      return '🟡';
    case 'rectangular':
      return '⬜';
    case 'square':
      return '🔲';
    case 'oval':
      return '🥚';
    default:
      return '🍽️';
  }
}

function tableSizeClass(shape: TableShape | string): string {
  if (shape === 'round') return 'w-24 h-24 rounded-full';
  if (shape === 'oval') return 'w-28 h-20 rounded-[999px]';
  if (shape === 'square') return 'w-20 h-20 rounded-[1.15rem]';
  return 'w-32 h-16 rounded-[0.85rem]';
}

function isDarkTableColor(color?: string): boolean {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 3 && hex.length !== 6) return false;
  const n = hex.length === 3
    ? hex.split('').map((c) => parseInt(c + c, 16))
    : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((c) => parseInt(c, 16));
  const [r, g, b] = n;
  return (r * 299 + g * 587 + b * 114) / 1000 < 90;
}

export function getTableVisualClasses(shape: TableShape | string, active = false): string {
  return `${tableSizeClass(shape)} em-table-realistic em-table-realistic--${shape}${active ? ' em-table-realistic--active' : ''}`;
}

const TABLE_SURFACE_2D: Partial<Record<TableSurfaceStyle, string>> = {
  wood: '/floors/table-wood.svg',
  linen: '/floors/table-linen.svg',
  walnut: '/floors/wood-charcoal.png',
  marble: '/floors/marble-calacatta.png',
  darkWood: '/floors/wood-rustic.png',
};

export function getTableVisualStyle(
  shape: TableShape | string,
  active = false,
  tableColor?: string,
  tableImageUrl?: string,
  tableSurface?: TableSurfaceStyle,
): { className: string; style?: React.CSSProperties } {
  const size = tableSizeClass(shape);
  const shapeKey = ['round', 'oval', 'square', 'rectangular', 'cocktail', 'highTop'].includes(String(shape))
    ? (shape === 'cocktail' || shape === 'highTop' ? 'round' : shape)
    : 'rectangular';
  const className = `${size} em-table-realistic em-table-realistic--${shapeKey}${active ? ' em-table-realistic--active' : ''}`;
  const linen = 'url(/floors/table-linen.svg)';
  const wood = 'url(/floors/table-wood.svg)';
  const dark = isDarkTableColor(tableColor);
  const tint = tableColor || (dark ? '#1e293b' : '#f3e6c8');
  const resolvedSurface: TableSurfaceStyle | undefined = tableSurface ?? (
    shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop'
      ? 'linen'
      : 'wood'
  );

  if (tableImageUrl) {
    return {
      className,
      style: {
        backgroundColor: tint,
        backgroundImage: `radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.28) 0%, transparent 42%), url(${tableImageUrl})`,
        backgroundSize: '100% 100%, cover',
        backgroundPosition: 'center',
      },
    };
  }

  if (resolvedSurface === 'glass') {
    return {
      className,
      style: {
        backgroundColor: tint,
        backgroundImage: 'linear-gradient(135deg, rgba(248,250,252,0.92) 0%, rgba(203,213,225,0.45) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(148,163,184,0.35)',
        color: dark ? '#f8fafc' : '#334155',
      },
    };
  }

  if (resolvedSurface === 'whiteLacquer') {
    return {
      className,
      style: {
        backgroundColor: tint,
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(226,232,240,0.7) 100%)',
        color: dark ? '#f8fafc' : '#475569',
      },
    };
  }

  const surfaceUrl = TABLE_SURFACE_2D[resolvedSurface];
  if (surfaceUrl) {
    const highlight = dark
      ? 'radial-gradient(ellipse at 36% 30%, rgba(255,255,255,0.16) 0%, transparent 46%)'
      : 'radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.42) 0%, transparent 44%)';
    return {
      className,
      style: {
        backgroundColor: tint,
        backgroundImage: `${highlight}, url(${surfaceUrl})`,
        backgroundSize: '100% 100%, cover',
        backgroundBlendMode: 'soft-light, multiply',
        color: dark ? '#f8fafc' : '#3f2a12',
      },
    };
  }

  return {
    className,
    style: {
      backgroundColor: tint,
      backgroundImage: dark
        ? `radial-gradient(ellipse at 36% 30%, rgba(255,255,255,0.16) 0%, transparent 46%), ${linen}`
        : `radial-gradient(ellipse at 34% 28%, rgba(255,255,255,0.55) 0%, transparent 44%), ${linen}, ${wood}`,
      backgroundSize: dark ? '100% 100%, 72px 72px' : '100% 100%, 72px 72px, cover',
      backgroundBlendMode: dark ? 'soft-light, multiply' : 'soft-light, multiply, overlay',
      color: dark ? '#f8fafc' : '#3f2a12',
    },
  };
}

export function getOccupiedSeatCount(table: Pick<TablePlanTable, 'seats' | 'capacity'>): number {
  if (!table.seats) return 0;
  return Object.values(table.seats).filter(Boolean).length;
}

export function getSeatCoordinates(
  shape: TableShape,
  capacity: number,
  seatIndex: number,
  radius = 45,
) {
  if (shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop') {
    const angle = (seatIndex / capacity) * 2 * Math.PI - Math.PI / 2;
    const rx = shape === 'oval' ? radius * 1.3 : radius;
    const ry = shape === 'oval' ? radius * 0.8 : radius;
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
      /** Angle en degrés : dossier à l’extérieur, face vers le centre de la table. */
      rotationDeg: (angle * 180) / Math.PI + 90,
    };
  }

  if (shape === 'square') {
    const seatsPerSide = Math.ceil(capacity / 4);
    const side = Math.floor(seatIndex / seatsPerSide) % 4;
    const indexOnSide = seatIndex % seatsPerSide;
    const step = 80 / (seatsPerSide + 1);
    const offset = -40 + step * (indexOnSide + 1);

    if (side === 0) return { x: offset, y: -40, rotationDeg: 180 };
    if (side === 1) return { x: 40, y: offset, rotationDeg: 270 };
    if (side === 2) return { x: -offset, y: 40, rotationDeg: 0 };
    return { x: -40, y: -offset, rotationDeg: 90 };
  }

  const seatsPerSide = Math.ceil(capacity / 2);
  const isTopSide = seatIndex < seatsPerSide;
  const sideIndex = isTopSide ? seatIndex : seatIndex - seatsPerSide;
  const width = 100;
  const step = width / (seatsPerSide + 1);
  const x = -width / 2 + step * (sideIndex + 1);
  const y = isTopSide ? -35 : 35;
  return { x, y, rotationDeg: isTopSide ? 180 : 0 };
}

/**
 * Placement 3D des chaises autour d’une table (mètres locaux, centre = 0).
 * Le fauteuil modèle regarde vers +Z : rotationY oriente le siège vers le plateau.
 */
export function getTableSeatPlacement3D(
  shape: TableShape,
  capacity: number,
  seatIndex: number,
  tableSize: [number, number],
): { x: number; z: number; rotationY: number } {
  const [tw, td] = tableSize;
  const gap = 0.48;
  const n = Math.max(1, capacity);

  if (shape === 'round' || shape === 'oval' || shape === 'cocktail' || shape === 'highTop') {
    const a = (seatIndex / n) * Math.PI * 2 - Math.PI / 2;
    const rx = (shape === 'oval' ? tw * 0.55 : tw / 2) + gap;
    const rz = (shape === 'oval' ? td * 0.55 : td / 2) + gap;
    const x = Math.cos(a) * rx;
    const z = Math.sin(a) * rz;
    // Face vers le centre (0,0)
    return { x, z, rotationY: Math.atan2(-x, -z) };
  }

  if (shape === 'square') {
    const seatsPerSide = Math.ceil(n / 4);
    const side = Math.floor(seatIndex / seatsPerSide) % 4;
    const indexOnSide = seatIndex % seatsPerSide;
    const half = Math.max(tw, td) / 2 + gap;
    const span = Math.max(tw, td) * 0.75;
    const step = span / (seatsPerSide + 1);
    const offset = -span / 2 + step * (indexOnSide + 1);
    if (side === 0) return { x: offset, z: -half, rotationY: 0 };
    if (side === 1) return { x: half, z: offset, rotationY: -Math.PI / 2 };
    if (side === 2) return { x: -offset, z: half, rotationY: Math.PI };
    return { x: -half, z: -offset, rotationY: Math.PI / 2 };
  }

  // rectangular: côtés longs haut/bas
  const seatsPerSide = Math.ceil(n / 2);
  const isTop = seatIndex < seatsPerSide;
  const sideIndex = isTop ? seatIndex : seatIndex - seatsPerSide;
  const span = tw * 0.85;
  const step = span / (seatsPerSide + 1);
  const x = -span / 2 + step * (sideIndex + 1);
  const z = isTop ? -(td / 2 + gap) : td / 2 + gap;
  return { x, z, rotationY: isTop ? 0 : Math.PI };
}

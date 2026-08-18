export type TableShape = 'round' | 'rectangular' | 'square' | 'oval';

import type React from 'react';

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

export function getTableVisualStyle(
  shape: TableShape | string,
  active = false,
  tableColor?: string,
  tableImageUrl?: string,
): { className: string; style?: React.CSSProperties } {
  const size = tableSizeClass(shape);
  const shapeKey = ['round', 'oval', 'square', 'rectangular'].includes(String(shape)) ? shape : 'rectangular';
  const className = `${size} em-table-realistic em-table-realistic--${shapeKey}${active ? ' em-table-realistic--active' : ''}`;
  const linen = 'url(/floors/table-linen.svg)';
  const wood = 'url(/floors/table-wood.svg)';
  const dark = isDarkTableColor(tableColor);
  const tint = tableColor || (dark ? '#1e293b' : '#f3e6c8');

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
  if (shape === 'round' || shape === 'oval') {
    const angle = (seatIndex / capacity) * 2 * Math.PI - Math.PI / 2;
    const rx = shape === 'oval' ? radius * 1.3 : radius;
    const ry = shape === 'oval' ? radius * 0.8 : radius;
    return {
      x: Math.cos(angle) * rx,
      y: Math.sin(angle) * ry,
    };
  }

  if (shape === 'square') {
    const seatsPerSide = Math.ceil(capacity / 4);
    const side = Math.floor(seatIndex / seatsPerSide) % 4;
    const indexOnSide = seatIndex % seatsPerSide;
    const step = 80 / (seatsPerSide + 1);
    const offset = -40 + step * (indexOnSide + 1);

    if (side === 0) return { x: offset, y: -40 };
    if (side === 1) return { x: 40, y: offset };
    if (side === 2) return { x: -offset, y: 40 };
    return { x: -40, y: -offset };
  }

  const seatsPerSide = Math.ceil(capacity / 2);
  const isTopSide = seatIndex < seatsPerSide;
  const sideIndex = isTopSide ? seatIndex : seatIndex - seatsPerSide;
  const width = 100;
  const step = width / (seatsPerSide + 1);
  const x = -width / 2 + step * (sideIndex + 1);
  const y = isTopSide ? -35 : 35;
  return { x, y };
}

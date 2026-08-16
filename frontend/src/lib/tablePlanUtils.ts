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

export function getTableVisualClasses(shape: TableShape | string, active = false): string {
  const base = active
    ? 'bg-primary text-white'
    : 'bg-surface border border-border text-foreground';

  const size =
    shape === 'round'
      ? 'w-24 h-24 rounded-full'
      : shape === 'oval'
        ? 'w-28 h-20 rounded-[50%]'
        : shape === 'square'
          ? 'w-20 h-20 rounded-xl'
          : 'w-32 h-16 rounded-xl';

  return `${size} ${base}`;
}

export function getTableVisualStyle(
  shape: TableShape | string,
  active = false,
  tableColor?: string,
  tableImageUrl?: string,
): { className: string; style?: React.CSSProperties } {
  const size =
    shape === 'round'
      ? 'w-24 h-24 rounded-full'
      : shape === 'oval'
        ? 'w-28 h-20 rounded-[50%]'
        : shape === 'square'
          ? 'w-20 h-20 rounded-xl'
          : 'w-32 h-16 rounded-xl';

  if (tableImageUrl && !active) {
    return {
      className: `${size} border-2 text-foreground shadow-lg overflow-hidden`,
      style: {
        backgroundImage: `url(${tableImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderColor: tableColor ?? 'rgba(148,163,184,0.6)',
      },
    };
  }

  if (tableColor && !active) {
    return {
      className: `${size} border-2 text-foreground shadow-lg`,
      style: {
        backgroundColor: tableColor,
        borderColor: tableColor,
        filter: 'brightness(0.92)',
      },
    };
  }

  const base = active
    ? 'bg-primary text-white border-primary-hover'
    : 'bg-surface border border-border text-foreground';

  return { className: `${size} ${base} shadow-lg border-2` };
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

export type TableShape = 'round' | 'rectangular' | 'square' | 'oval' | 'cocktail' | 'highTop' | 'arc';

/**
 * Disposition des chaises : tout autour (défaut) ou d’un seul côté, face à la salle
 * (table d’honneur, table des mariés, jury, panel).
 */
export type TableSeatingSide = 'around' | 'oneSide';

/** Formes qui acceptent l’option « chaises d’un seul côté ». */
export function supportsOneSideSeating(shape: TableShape | string | undefined): boolean {
  return shape === 'rectangular' || shape === 'oval' || shape === 'square';
}

export function isOneSideSeating(shape: TableShape | string | undefined, seatingSide?: TableSeatingSide | null): boolean {
  return seatingSide === 'oneSide' && supportsOneSideSeating(shape);
}

/** Largeur de couvert confortable (m) : 60 cm par convive, standard traiteur. */
export const COVER_WIDTH_M = 0.6;

import type React from 'react';
import type { TableSurfaceStyle } from '@/lib/roomLayoutUtils';

export interface TablePlanTable {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  seats?: Record<number, string | null> | null;
}

/** Garantit un dictionnaire de sièges, y compris pour les plans enregistrés sans `seats`. */
export function normalizeTableSeats(
  seats: Record<number, string | null> | null | undefined,
  capacity?: number,
): Record<number, string | null> {
  const next: Record<number, string | null> = {};
  if (seats && typeof seats === 'object') {
    for (const [key, value] of Object.entries(seats)) {
      const index = Number(key);
      if (!Number.isFinite(index) || index < 0) continue;
      next[index] = value ?? null;
    }
  }
  const size = Math.max(0, Number(capacity) || 0);
  for (let i = 0; i < size; i++) {
    if (!(i in next)) next[i] = null;
  }
  return next;
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
    case 'arc':
      return 'Arc';
    case 'cocktail':
    case 'highTop':
      return 'Cocktail';
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
    case 'arc':
      return 'Segment courbe pour composer des anneaux et des allées festives.';
    case 'cocktail':
    case 'highTop':
      return 'Table haute, idéale pour un cocktail ou un espace debout.';
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
    case 'arc':
      return '🌙';
    default:
      return '🍽️';
  }
}

function tableSizeClass(shape: TableShape | string): string {
  if (shape === 'round') return 'w-24 h-24 rounded-full';
  if (shape === 'oval') return 'w-28 h-20 rounded-[999px]';
  if (shape === 'square') return 'w-20 h-20 rounded-[1.15rem]';
  if (shape === 'arc') return 'w-36 h-20 rounded-[2rem]';
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
  wood: '/floors/gen/table-wood.jpg',
  linen: '/floors/gen/table-linen.jpg',
  walnut: '/floors/gen/table-walnut.jpg',
  marble: '/floors/gen/marble-calacatta.jpg',
  darkWood: '/floors/gen/table-darkwood.jpg',
};

export function getTableVisualStyle(
  shape: TableShape | string,
  active = false,
  tableColor?: string,
  tableImageUrl?: string,
  tableSurface?: TableSurfaceStyle,
  customDims?: {
    customWidthM?: number;
    customDepthM?: number;
    customRadiusM?: number;
    cornerRadiusM?: number;
  },
): { className: string; style?: React.CSSProperties } {
  const size = tableSizeClass(shape);
  const shapeKey = ['round', 'oval', 'square', 'rectangular', 'cocktail', 'highTop', 'arc'].includes(String(shape))
    ? (shape === 'cocktail' || shape === 'highTop' ? 'round' : shape)
    : 'rectangular';
  const className = `${size} em-table-realistic em-table-realistic--${shapeKey}${active ? ' em-table-realistic--active' : ''}`;
  const linen = 'url(/floors/gen/table-linen.jpg)';
  const wood = 'url(/floors/gen/table-wood.jpg)';
  const dark = isDarkTableColor(tableColor);
  const tint = tableColor || (dark ? '#1e293b' : '#f3e6c8');
  const customCornerRadius = typeof customDims?.cornerRadiusM === 'number' && customDims.cornerRadiusM > 0
    ? `${Math.round(customDims.cornerRadiusM * 100)}px`
    : undefined;
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
        ...(customCornerRadius ? { borderRadius: customCornerRadius } : {}),
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
        ...(customCornerRadius ? { borderRadius: customCornerRadius } : {}),
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
        ...(customCornerRadius ? { borderRadius: customCornerRadius } : {}),
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
        ...(customCornerRadius ? { borderRadius: customCornerRadius } : {}),
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
      ...(customCornerRadius ? { borderRadius: customCornerRadius } : {}),
    },
  };
}

export function getOccupiedSeatCount(table: Pick<TablePlanTable, 'seats' | 'capacity'>): number {
  return Object.values(normalizeTableSeats(table.seats, table.capacity)).filter(Boolean).length;
}

export function getSeatCoordinates(
  shape: TableShape,
  capacity: number,
  seatIndex: number,
  radius = 45,
  seatingSide?: TableSeatingSide | null,
) {
  if (isOneSideSeating(shape, seatingSide)) {
    // Tous les convives du même côté (haut), face à la salle.
    const n = Math.max(1, capacity);
    const width = shape === 'square' ? 80 : 100;
    const step = width / n;
    return { x: -width / 2 + step * (seatIndex + 0.5), y: shape === 'square' ? -40 : -35, rotationDeg: 0 };
  }

  if (shape === 'arc') {
    const n = Math.max(1, capacity);
    const t = n === 1 ? 0.5 : seatIndex / (n - 1);
    const a = (t - 0.5) * Math.PI * 0.9;
    return {
      x: Math.sin(a) * radius * 1.15,
      y: Math.cos(a) * radius * 0.7,
      rotationDeg: (a * 180) / Math.PI + 180,
    };
  }

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

    if (side === 0) return { x: offset, y: -40, rotationDeg: 0 };
    if (side === 1) return { x: 40, y: offset, rotationDeg: 90 };
    if (side === 2) return { x: -offset, y: 40, rotationDeg: 180 };
    return { x: -40, y: -offset, rotationDeg: 270 };
  }

  const seatsPerSide = Math.ceil(capacity / 2);
  const isTopSide = seatIndex < seatsPerSide;
  const sideIndex = isTopSide ? seatIndex : seatIndex - seatsPerSide;
  const width = 100;
  const step = width / (seatsPerSide + 1);
  const x = -width / 2 + step * (sideIndex + 1);
  const y = isTopSide ? -35 : 35;
  return { x, y, rotationDeg: isTopSide ? 0 : 180 };
}

/** Dimensions du plateau 3D (mètres), alignées sur le viewer. */
export function tablePlateSizeMeters(
  shape: TableShape,
  capacity: number,
  customDims?: {
    customWidthM?: number;
    customDepthM?: number;
    customRadiusM?: number;
  },
  seatingSide?: TableSeatingSide | null,
): [number, number] {
  const auto = defaultTablePlateSize(shape, capacity, seatingSide);
  if (customDims) {
    if (shape === 'round' || shape === 'cocktail' || shape === 'highTop') {
      if (typeof customDims.customRadiusM === 'number' && customDims.customRadiusM > 0) {
        const diam = Math.round(customDims.customRadiusM * 2 * 100) / 100;
        return [diam, diam];
      }
      if (typeof customDims.customWidthM === 'number' && customDims.customWidthM > 0) {
        return [customDims.customWidthM, customDims.customWidthM];
      }
    } else if (shape === 'oval') {
      const [defaultW, defaultD] = auto;
      const w = typeof customDims.customWidthM === 'number' && customDims.customWidthM > 0
        ? customDims.customWidthM
        : typeof customDims.customRadiusM === 'number' && customDims.customRadiusM > 0
          ? customDims.customRadiusM * 2
          : defaultW;
      const d = typeof customDims.customDepthM === 'number' && customDims.customDepthM > 0
        ? customDims.customDepthM
        : defaultD;
      return [w, d];
    } else if (shape === 'square') {
      const defaultSide = auto[0];
      const side = typeof customDims.customWidthM === 'number' && customDims.customWidthM > 0
        ? customDims.customWidthM
        : typeof customDims.customDepthM === 'number' && customDims.customDepthM > 0
          ? customDims.customDepthM
          : typeof customDims.customRadiusM === 'number' && customDims.customRadiusM > 0
            ? customDims.customRadiusM * 2
            : defaultSide;
      return [side, side];
    } else if (shape === 'rectangular' || shape === 'arc') {
      const [defaultW, defaultD] = auto;
      const w = typeof customDims.customWidthM === 'number' && customDims.customWidthM > 0
        ? customDims.customWidthM
        : defaultW;
      const d = typeof customDims.customDepthM === 'number' && customDims.customDepthM > 0
        ? customDims.customDepthM
        : defaultD;
      return [w, d];
    }
  }

  return auto;
}

const clampM = (min: number, max: number, v: number) => Math.round(Math.min(max, Math.max(min, v)) * 100) / 100;

/**
 * Taille de plateau déduite de la capacité : 60 cm de couvert par convive,
 * comme les tables traiteur (ronde Ø152 pour 8–10, banquet 2,44 m pour 8…).
 */
function defaultTablePlateSize(
  shape: TableShape,
  capacity: number,
  seatingSide?: TableSeatingSide | null,
): [number, number] {
  const n = Math.max(1, Math.round(capacity) || 1);
  if (isOneSideSeating(shape, seatingSide)) {
    const length = clampM(1.2, 14, n * COVER_WIDTH_M + 0.3);
    if (shape === 'square') return [length, length];
    return [length, shape === 'oval' ? 0.9 : 0.76];
  }
  if (shape === 'rectangular') {
    const perSide = Math.ceil(n / 2);
    return [clampM(1.2, 12, perSide * COVER_WIDTH_M + 0.1), n >= 14 ? 0.95 : 0.9];
  }
  if (shape === 'oval') {
    const w = clampM(1.7, 5, n * 0.21);
    return [w, clampM(1, 1.4, w * 0.55)];
  }
  if (shape === 'square') {
    const side = clampM(0.9, 3, Math.ceil(n / 4) * COVER_WIDTH_M + 0.2);
    return [Math.max(1.2, side), Math.max(1.2, side)];
  }
  if (shape === 'cocktail') return [0.7, 0.7];
  if (shape === 'highTop') return [0.75, 0.75];
  if (shape === 'arc') return [3.6, 1.8];
  // Ronde : périmètre ≈ n × 52 cm au bord du plateau (Ø1,32 m pour 8, Ø1,66 m pour 10).
  const diam = clampM(0.9, 2.4, (n * 0.52) / Math.PI);
  return [diam, diam];
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
  seatingSide?: TableSeatingSide | null,
): { x: number; z: number; rotationY: number } {
  const [tw, td] = tableSize;
  const gap = 0.48;
  const n = Math.max(1, capacity);

  if (isOneSideSeating(shape, seatingSide)) {
    // Convives alignés derrière le plateau (côté -Z), tournés vers la salle (+Z).
    const span = Math.max(0.5, tw - 0.3);
    const step = span / n;
    return { x: -span / 2 + step * (seatIndex + 0.5), z: -(td / 2 + gap), rotationY: 0 };
  }

  if (shape === 'arc') {
    const radius = Math.max(1.4, tw / 2) + 0.5;
    const sweep = Math.PI * 0.95;
    const start = -sweep / 2;
    const a = start + (n === 1 ? sweep / 2 : (seatIndex / (n - 1)) * sweep);
    return { x: Math.sin(a) * radius, z: Math.cos(a) * radius, rotationY: a + Math.PI };
  }

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
  // Chaises centrées sur leur couvert, sans déborder aux bouts du plateau.
  const span = Math.max(0.5, tw - 0.2);
  const step = span / seatsPerSide;
  const x = -span / 2 + step * (sideIndex + 0.5);
  const z = isTop ? -(td / 2 + gap) : td / 2 + gap;
  return { x, z, rotationY: isTop ? 0 : Math.PI };
}

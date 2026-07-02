import type { RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import { defaultRoomOutline } from '@/lib/roomLayoutUtils';

export type RoomThemeId =
  | 'classic'
  | 'wedding'
  | 'gala'
  | 'garden'
  | 'modern'
  | 'royal';

export interface RoomTheme {
  id: RoomThemeId;
  name: string;
  description: string;
  roomOutline: {
    fill: string;
    stroke: string;
    strokeWidth?: number;
  };
  defaultTableColor: string;
  canvasBackground: string;
  gridColor: string;
  accentColor: string;
  guestCanvasBg: string;
}

export const ROOM_THEMES: Record<RoomThemeId, RoomTheme> = {
  classic: {
    id: 'classic',
    name: 'Classique',
    description: 'Neutre et élégant, adapté à tout événement.',
    roomOutline: { fill: 'rgba(248, 250, 252, 0.95)', stroke: '#94a3b8', strokeWidth: 2 },
    defaultTableColor: '#ffffff',
    canvasBackground: '#f1f5f9',
    gridColor: 'rgba(148,163,184,0.2)',
    accentColor: '#4f46e5',
    guestCanvasBg: 'rgba(15,23,42,0.6)',
  },
  wedding: {
    id: 'wedding',
    name: 'Mariage',
    description: 'Ivoire, doré et touches romantiques.',
    roomOutline: { fill: 'rgba(255, 251, 235, 0.95)', stroke: '#d4af37', strokeWidth: 2 },
    defaultTableColor: '#fffbeb',
    canvasBackground: '#fef3c7',
    gridColor: 'rgba(212,175,55,0.15)',
    accentColor: '#b45309',
    guestCanvasBg: 'rgba(69,26,3,0.55)',
  },
  gala: {
    id: 'gala',
    name: 'Gala',
    description: 'Noir profond, accents dorés et tables sombres.',
    roomOutline: { fill: 'rgba(15, 23, 42, 0.92)', stroke: '#eab308', strokeWidth: 2 },
    defaultTableColor: '#1e293b',
    canvasBackground: '#0f172a',
    gridColor: 'rgba(234,179,8,0.12)',
    accentColor: '#eab308',
    guestCanvasBg: 'rgba(2,6,23,0.85)',
  },
  garden: {
    id: 'garden',
    name: 'Jardin',
    description: 'Verts naturels et ambiance champêtre.',
    roomOutline: { fill: 'rgba(236, 253, 245, 0.95)', stroke: '#059669', strokeWidth: 2 },
    defaultTableColor: '#ecfdf5',
    canvasBackground: '#d1fae5',
    gridColor: 'rgba(5,150,105,0.12)',
    accentColor: '#059669',
    guestCanvasBg: 'rgba(6,78,59,0.5)',
  },
  modern: {
    id: 'modern',
    name: 'Moderne',
    description: 'Minimaliste, gris ardoise et indigo.',
    roomOutline: { fill: 'rgba(241, 245, 249, 0.98)', stroke: '#6366f1', strokeWidth: 2 },
    defaultTableColor: '#f8fafc',
    canvasBackground: '#e2e8f0',
    gridColor: 'rgba(99,102,241,0.12)',
    accentColor: '#6366f1',
    guestCanvasBg: 'rgba(30,41,59,0.65)',
  },
  royal: {
    id: 'royal',
    name: 'Royal',
    description: 'Pourpre royal et finitions premium.',
    roomOutline: { fill: 'rgba(250, 245, 255, 0.95)', stroke: '#7c3aed', strokeWidth: 2 },
    defaultTableColor: '#f5f3ff',
    canvasBackground: '#ede9fe',
    gridColor: 'rgba(124,58,237,0.12)',
    accentColor: '#7c3aed',
    guestCanvasBg: 'rgba(46,16,101,0.55)',
  },
};

export const roomThemeList = Object.values(ROOM_THEMES);

export function getRoomTheme(themeId?: RoomThemeId | string | null): RoomTheme {
  if (themeId && themeId in ROOM_THEMES) {
    return ROOM_THEMES[themeId as RoomThemeId];
  }
  return ROOM_THEMES.classic;
}

export function applyRoomTheme(
  blueprint: RoomLayoutBlueprint,
  themeId: RoomThemeId,
): RoomLayoutBlueprint {
  const theme = ROOM_THEMES[themeId];
  const shape = blueprint.roomOutline?.shape ?? 'rectangle';
  const baseOutline = blueprint.roomOutline ?? defaultRoomOutline(shape as RoomOutlineShape);

  return {
    ...blueprint,
    roomOutline: {
      ...baseOutline,
      fill: theme.roomOutline.fill,
      stroke: theme.roomOutline.stroke,
      strokeWidth: theme.roomOutline.strokeWidth ?? baseOutline.strokeWidth,
    },
    metadata: {
      ...blueprint.metadata,
      roomThemeId: themeId,
      defaultTableColor: theme.defaultTableColor,
    },
  };
}

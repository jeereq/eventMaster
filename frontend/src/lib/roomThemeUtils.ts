import type { RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import { defaultRoomOutline } from '@/lib/roomLayoutUtils';

export type FloorType =
  | 'parquet'
  | 'carrelage'
  | 'marbre'
  | 'moquette'
  | 'herbe'
  | 'beton'
  | 'bois'
  | 'custom';

export type BuiltInRoomThemeId =
  | 'classic'
  | 'wedding'
  | 'gala'
  | 'garden'
  | 'modern'
  | 'royal';

export type RoomThemeId = BuiltInRoomThemeId | `custom_${string}`;

export interface RoomTheme {
  id: RoomThemeId;
  name: string;
  description: string;
  isCustom?: boolean;
  roomOutline: {
    fill: string;
    stroke: string;
    strokeWidth?: number;
    innerGlow?: string;
  };
  defaultTableColor: string;
  canvasBackground: string;
  canvasPattern?: string;
  gridColor: string;
  accentColor: string;
  guestCanvasBg: string;
  defaultFloorType: FloorType;
  ambientOverlay?: string;
  tableBorderColor?: string;
}

export const ROOM_THEMES: Record<BuiltInRoomThemeId, RoomTheme> = {
  classic: {
    id: 'classic',
    name: 'Classique',
    description: 'Neutre et élégant, parquet point de Hongrie.',
    roomOutline: {
      fill: 'rgba(248, 250, 252, 0.92)',
      stroke: '#94a3b8',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 40px rgba(148,163,184,0.15)',
    },
    defaultTableColor: '#f3e6c8',
    canvasBackground: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    gridColor: 'rgba(148,163,184,0.18)',
    accentColor: '#4f46e5',
    guestCanvasBg: 'rgba(15,23,42,0.6)',
    defaultFloorType: 'parquet',
    tableBorderColor: '#cbd5e1',
  },
  wedding: {
    id: 'wedding',
    name: 'Mariage',
    description: 'Ivoire, doré, nappes crème et sol marbre.',
    roomOutline: {
      fill: 'rgba(255, 251, 235, 0.94)',
      stroke: '#d4af37',
      strokeWidth: 2.5,
      innerGlow: 'inset 0 0 60px rgba(212,175,55,0.12), inset 0 0 120px rgba(255,251,235,0.5)',
    },
    defaultTableColor: '#fffbeb',
    canvasBackground: 'radial-gradient(ellipse at 50% 0%, #fef9c3 0%, #fde68a 35%, #fef3c7 100%)',
    canvasPattern: 'radial-gradient(circle at 20% 30%, rgba(212,175,55,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(251,191,36,0.06) 0%, transparent 40%)',
    gridColor: 'rgba(212,175,55,0.12)',
    accentColor: '#b45309',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(69,26,3,0.65) 0%, rgba(28,12,2,0.88) 100%)',
    defaultFloorType: 'marbre',
    ambientOverlay: 'linear-gradient(180deg, rgba(255,251,235,0.15) 0%, transparent 40%, rgba(212,175,55,0.06) 100%)',
    tableBorderColor: '#d4af37',
  },
  gala: {
    id: 'gala',
    name: 'Gala',
    description: 'Velours noir, lumières dorées et moquette premium.',
    roomOutline: {
      fill: 'rgba(15, 23, 42, 0.94)',
      stroke: '#eab308',
      strokeWidth: 2.5,
      innerGlow: 'inset 0 0 80px rgba(234,179,8,0.08), inset 0 0 40px rgba(0,0,0,0.4)',
    },
    defaultTableColor: '#1e293b',
    canvasBackground: 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #0f172a 50%, #020617 100%)',
    canvasPattern: 'radial-gradient(circle at 50% 0%, rgba(234,179,8,0.12) 0%, transparent 55%)',
    gridColor: 'rgba(234,179,8,0.1)',
    accentColor: '#eab308',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(2,6,23,0.92) 0%, #000000 100%)',
    defaultFloorType: 'moquette',
    ambientOverlay: 'linear-gradient(180deg, rgba(234,179,8,0.06) 0%, transparent 50%)',
    tableBorderColor: '#ca8a04',
  },
  garden: {
    id: 'garden',
    name: 'Jardin',
    description: 'Gazon naturel, pergola verte et tables en bois.',
    roomOutline: {
      fill: 'rgba(236, 253, 245, 0.9)',
      stroke: '#059669',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 50px rgba(5,150,105,0.1)',
    },
    defaultTableColor: '#ecfdf5',
    canvasBackground: 'linear-gradient(180deg, #bbf7d0 0%, #86efac 40%, #4ade80 100%)',
    canvasPattern: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.25) 0%, transparent 30%), radial-gradient(circle at 90% 80%, rgba(21,128,61,0.15) 0%, transparent 35%)',
    gridColor: 'rgba(5,150,105,0.1)',
    accentColor: '#059669',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(6,78,59,0.55) 0%, rgba(4,47,46,0.85) 100%)',
    defaultFloorType: 'herbe',
    ambientOverlay: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 60%)',
    tableBorderColor: '#34d399',
  },
  modern: {
    id: 'modern',
    name: 'Moderne',
    description: 'Béton poli, lignes nettes et indigo.',
    roomOutline: {
      fill: 'rgba(241, 245, 249, 0.96)',
      stroke: '#6366f1',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 30px rgba(99,102,241,0.08)',
    },
    defaultTableColor: '#f8fafc',
    canvasBackground: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 50%, #94a3b8 100%)',
    canvasPattern: 'repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(99,102,241,0.04) 80px, rgba(99,102,241,0.04) 81px)',
    gridColor: 'rgba(99,102,241,0.1)',
    accentColor: '#6366f1',
    guestCanvasBg: 'linear-gradient(180deg, rgba(30,41,59,0.75) 0%, rgba(15,23,42,0.9) 100%)',
    defaultFloorType: 'beton',
    tableBorderColor: '#818cf8',
  },
  royal: {
    id: 'royal',
    name: 'Royal',
    description: 'Marbre pourpre, dorures et velours.',
    roomOutline: {
      fill: 'rgba(250, 245, 255, 0.93)',
      stroke: '#7c3aed',
      strokeWidth: 2.5,
      innerGlow: 'inset 0 0 70px rgba(124,58,237,0.12), inset 0 0 30px rgba(212,175,55,0.06)',
    },
    defaultTableColor: '#f5f3ff',
    canvasBackground: 'radial-gradient(ellipse at 50% 0%, #ede9fe 0%, #ddd6fe 40%, #c4b5fd 100%)',
    canvasPattern: 'radial-gradient(circle at 15% 25%, rgba(124,58,237,0.1) 0%, transparent 45%), radial-gradient(circle at 85% 75%, rgba(212,175,55,0.08) 0%, transparent 40%)',
    gridColor: 'rgba(124,58,237,0.1)',
    accentColor: '#7c3aed',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(46,16,101,0.6) 0%, rgba(30,10,60,0.9) 100%)',
    defaultFloorType: 'marbre',
    ambientOverlay: 'linear-gradient(180deg, rgba(237,233,254,0.2) 0%, transparent 50%, rgba(124,58,237,0.05) 100%)',
    tableBorderColor: '#a78bfa',
  },
};

export const roomThemeList = Object.values(ROOM_THEMES);

export type CustomRoomTheme = RoomTheme & { isCustom: true };

export function isCustomThemeId(id: string): id is `custom_${string}` {
  return id.startsWith('custom_');
}

export function createCustomTheme(partial: Partial<RoomTheme> & { name: string }): CustomRoomTheme {
  const id = `custom_${Math.random().toString(36).slice(2, 10)}` as `custom_${string}`;
  return {
    id,
    isCustom: true,
    name: partial.name,
    description: partial.description ?? 'Thème personnalisé',
    roomOutline: partial.roomOutline ?? {
      fill: 'rgba(248, 250, 252, 0.92)',
      stroke: partial.accentColor ?? '#6366f1',
      strokeWidth: 2,
    },
    defaultTableColor: partial.defaultTableColor ?? '#f3e6c8',
    canvasBackground: partial.canvasBackground ?? '#e2e8f0',
    gridColor: partial.gridColor ?? 'rgba(99,102,241,0.12)',
    accentColor: partial.accentColor ?? '#6366f1',
    guestCanvasBg: partial.guestCanvasBg ?? 'rgba(15,23,42,0.65)',
    defaultFloorType: partial.defaultFloorType ?? 'parquet',
    canvasPattern: partial.canvasPattern,
    ambientOverlay: partial.ambientOverlay,
    tableBorderColor: partial.tableBorderColor ?? partial.accentColor,
  };
}

export function listAvailableThemes(blueprint?: RoomLayoutBlueprint | null): RoomTheme[] {
  const custom = (blueprint?.metadata?.customThemes ?? []) as CustomRoomTheme[];
  return [...roomThemeList, ...custom];
}

export function getRoomTheme(
  themeId?: RoomThemeId | string | null,
  blueprint?: RoomLayoutBlueprint | null,
): RoomTheme {
  if (themeId && themeId in ROOM_THEMES) {
    return ROOM_THEMES[themeId as BuiltInRoomThemeId];
  }
  if (themeId && isCustomThemeId(themeId)) {
    const custom = blueprint?.metadata?.customThemes?.find((t) => t.id === themeId);
    if (custom) return custom as CustomRoomTheme;
  }
  return ROOM_THEMES.classic;
}

export function applyRoomTheme(
  blueprint: RoomLayoutBlueprint,
  themeId: RoomThemeId,
): RoomLayoutBlueprint {
  const theme = getRoomTheme(themeId, blueprint);
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
      floorType: theme.defaultFloorType,
      floorImageUrl: undefined,
    },
  };
}

export function saveCustomThemeToBlueprint(
  blueprint: RoomLayoutBlueprint,
  theme: CustomRoomTheme,
): RoomLayoutBlueprint {
  const existing = blueprint.metadata.customThemes ?? [];
  const idx = existing.findIndex((t) => t.id === theme.id);
  const customThemes = idx >= 0
    ? existing.map((t, i) => (i === idx ? theme : t))
    : [...existing, theme];
  return {
    ...blueprint,
    metadata: { ...blueprint.metadata, customThemes },
  };
}

export function deleteCustomThemeFromBlueprint(
  blueprint: RoomLayoutBlueprint,
  themeId: string,
): RoomLayoutBlueprint {
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      customThemes: (blueprint.metadata.customThemes ?? []).filter((t) => t.id !== themeId),
      roomThemeId: blueprint.metadata.roomThemeId === themeId ? 'classic' : blueprint.metadata.roomThemeId,
    },
  };
}

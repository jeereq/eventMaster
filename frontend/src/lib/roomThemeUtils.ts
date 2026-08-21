import type { RoomLayoutBlueprint, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import { defaultRoomOutline } from '@/lib/roomLayoutUtils';

export type FloorType =
  | 'parquet'
  | 'carrelage'
  | 'marbre'
  | 'moquette'
  | 'herbe'
  | 'pelouse'
  | 'gazonSynth'
  | 'prairie'
  | 'beton'
  | 'bois'
  | 'boisPanel'
  | 'boisHex'
  | 'boisAmber'
  | 'boisRustique'
  | 'chevron'
  | 'damier'
  | 'terrazzo'
  | 'pierre'
  | 'sable'
  | 'epoxy'
  | 'brique'
  | 'custom';

export type BuiltInRoomThemeId =
  | 'classic'
  | 'wedding'
  | 'gala'
  | 'garden'
  | 'modern'
  | 'royal'
  | 'champagne'
  | 'soiree'
  | 'rustique'
  | 'cotier'
  | 'fete'
  | 'loft';

export type RoomThemeId = BuiltInRoomThemeId | `custom_${string}`;

/** Groupes thématiques pour l’UI éditeur. */
export type RoomThemeCategory =
  | 'ceremony'
  | 'evening'
  | 'nature'
  | 'contemporary'
  | 'custom';

export const roomThemeCategoryLabels: Record<RoomThemeCategory, string> = {
  ceremony: 'Cérémonie & élégance',
  evening: 'Soirée & gala',
  nature: 'Nature & extérieur',
  contemporary: 'Contemporain',
  custom: 'Personnalisés',
};

export const ROOM_THEME_CATEGORY_ORDER: RoomThemeCategory[] = [
  'ceremony',
  'evening',
  'nature',
  'contemporary',
  'custom',
];

export interface RoomTheme {
  id: RoomThemeId;
  name: string;
  description: string;
  category?: RoomThemeCategory;
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
    category: 'ceremony',
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
    category: 'ceremony',
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
    category: 'evening',
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
    category: 'nature',
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
    category: 'contemporary',
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
    category: 'ceremony',
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
  champagne: {
    id: 'champagne',
    name: 'Champagne',
    category: 'ceremony',
    description: 'Blush, or pâle et parquet chevron clair.',
    roomOutline: {
      fill: 'rgba(255, 247, 237, 0.94)',
      stroke: '#e8b86a',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 50px rgba(251,191,36,0.12)',
    },
    defaultTableColor: '#fff7ed',
    canvasBackground: 'linear-gradient(180deg, #fff7ed 0%, #fed7aa 45%, #fdba74 100%)',
    canvasPattern: 'radial-gradient(circle at 70% 20%, rgba(251,191,36,0.14) 0%, transparent 42%)',
    gridColor: 'rgba(180,83,9,0.12)',
    accentColor: '#c2410c',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(124,45,18,0.55) 0%, rgba(67,20,7,0.88) 100%)',
    defaultFloorType: 'chevron',
    ambientOverlay: 'linear-gradient(180deg, rgba(255,247,237,0.18) 0%, transparent 50%)',
    tableBorderColor: '#e8b86a',
  },
  soiree: {
    id: 'soiree',
    name: 'Soirée',
    category: 'evening',
    description: 'Nuit indigo, damier et lumières froides.',
    roomOutline: {
      fill: 'rgba(15, 23, 42, 0.95)',
      stroke: '#38bdf8',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 70px rgba(56,189,248,0.08), inset 0 0 30px rgba(0,0,0,0.45)',
    },
    defaultTableColor: '#0f172a',
    canvasBackground: 'radial-gradient(ellipse at 50% 0%, #1e3a5f 0%, #020617 70%)',
    canvasPattern: 'radial-gradient(circle at 50% 0%, rgba(56,189,248,0.16) 0%, transparent 50%)',
    gridColor: 'rgba(56,189,248,0.1)',
    accentColor: '#38bdf8',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(8,47,73,0.8) 0%, #020617 100%)',
    defaultFloorType: 'damier',
    ambientOverlay: 'linear-gradient(180deg, rgba(56,189,248,0.08) 0%, transparent 55%)',
    tableBorderColor: '#7dd3fc',
  },
  rustique: {
    id: 'rustique',
    name: 'Rustique',
    category: 'nature',
    description: 'Bois chaud, pierre et nappes lin.',
    roomOutline: {
      fill: 'rgba(255, 251, 235, 0.9)',
      stroke: '#92400e',
      strokeWidth: 2.5,
      innerGlow: 'inset 0 0 40px rgba(146,64,14,0.12)',
    },
    defaultTableColor: '#fde68a',
    canvasBackground: 'linear-gradient(180deg, #fef3c7 0%, #fbbf24 40%, #b45309 100%)',
    canvasPattern: 'radial-gradient(circle at 20% 80%, rgba(120,53,15,0.15) 0%, transparent 40%)',
    gridColor: 'rgba(146,64,14,0.12)',
    accentColor: '#b45309',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(69,26,3,0.6) 0%, rgba(28,12,2,0.9) 100%)',
    defaultFloorType: 'pierre',
    ambientOverlay: 'linear-gradient(180deg, rgba(255,237,213,0.16) 0%, transparent 55%)',
    tableBorderColor: '#d97706',
  },
  cotier: {
    id: 'cotier',
    name: 'Côtier',
    category: 'nature',
    description: 'Sable, aqua et lumière de bord de mer.',
    roomOutline: {
      fill: 'rgba(240, 253, 250, 0.92)',
      stroke: '#0d9488',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 50px rgba(13,148,136,0.1)',
    },
    defaultTableColor: '#ecfeff',
    canvasBackground: 'linear-gradient(180deg, #ecfeff 0%, #99f6e4 40%, #5eead4 100%)',
    canvasPattern: 'radial-gradient(circle at 80% 10%, rgba(255,255,255,0.35) 0%, transparent 40%)',
    gridColor: 'rgba(13,148,136,0.12)',
    accentColor: '#0d9488',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(19,78,74,0.55) 0%, rgba(4,47,46,0.88) 100%)',
    defaultFloorType: 'sable',
    ambientOverlay: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
    tableBorderColor: '#5eead4',
  },
  fete: {
    id: 'fete',
    name: 'Fête',
    category: 'evening',
    description: 'Vert profond, or et terrazzo festif.',
    roomOutline: {
      fill: 'rgba(236, 253, 245, 0.9)',
      stroke: '#ca8a04',
      strokeWidth: 2.5,
      innerGlow: 'inset 0 0 60px rgba(22,163,74,0.1), inset 0 0 30px rgba(202,138,4,0.08)',
    },
    defaultTableColor: '#fefce8',
    canvasBackground: 'radial-gradient(ellipse at 50% 0%, #bbf7d0 0%, #166534 55%, #14532d 100%)',
    canvasPattern: 'radial-gradient(circle at 30% 20%, rgba(250,204,21,0.16) 0%, transparent 45%)',
    gridColor: 'rgba(202,138,4,0.14)',
    accentColor: '#ca8a04',
    guestCanvasBg: 'radial-gradient(ellipse at center, rgba(20,83,45,0.7) 0%, rgba(5,46,22,0.92) 100%)',
    defaultFloorType: 'terrazzo',
    ambientOverlay: 'linear-gradient(180deg, rgba(254,249,195,0.12) 0%, transparent 50%)',
    tableBorderColor: '#eab308',
  },
  loft: {
    id: 'loft',
    name: 'Loft',
    category: 'contemporary',
    description: 'Brique, résine brillante et acier.',
    roomOutline: {
      fill: 'rgba(244, 244, 245, 0.94)',
      stroke: '#52525b',
      strokeWidth: 2,
      innerGlow: 'inset 0 0 40px rgba(82,82,91,0.12)',
    },
    defaultTableColor: '#f4f4f5',
    canvasBackground: 'linear-gradient(135deg, #e4e4e7 0%, #a1a1aa 50%, #71717a 100%)',
    canvasPattern: 'repeating-linear-gradient(90deg, transparent, transparent 64px, rgba(24,24,27,0.05) 64px, rgba(24,24,27,0.05) 65px)',
    gridColor: 'rgba(82,82,91,0.12)',
    accentColor: '#3f3f46',
    guestCanvasBg: 'linear-gradient(180deg, rgba(39,39,42,0.75) 0%, rgba(9,9,11,0.92) 100%)',
    defaultFloorType: 'brique',
    tableBorderColor: '#71717a',
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
    category: 'custom',
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

export function groupThemesByCategory(
  themes: RoomTheme[],
): { category: RoomThemeCategory; label: string; themes: RoomTheme[] }[] {
  const buckets = new Map<RoomThemeCategory, RoomTheme[]>();
  for (const theme of themes) {
    const cat: RoomThemeCategory = theme.isCustom
      ? 'custom'
      : (theme.category ?? 'ceremony');
    const list = buckets.get(cat) ?? [];
    list.push(theme);
    buckets.set(cat, list);
  }
  return ROOM_THEME_CATEGORY_ORDER
    .filter((cat) => (buckets.get(cat)?.length ?? 0) > 0)
    .map((category) => ({
      category,
      label: roomThemeCategoryLabels[category],
      themes: buckets.get(category) ?? [],
    }));
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
  options?: { keepFloor?: boolean },
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
      floorType: options?.keepFloor ? (blueprint.metadata.floorType ?? theme.defaultFloorType) : theme.defaultFloorType,
      floorImageUrl: options?.keepFloor ? blueprint.metadata.floorImageUrl : undefined,
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

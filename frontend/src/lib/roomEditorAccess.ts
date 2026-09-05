import type { TableShape } from '@/lib/roomLayoutUtils';

export type RoomEditorLevel = 'basic' | 'standard' | 'advanced' | 'complete';

export type RoomEditorCapabilities = {
  level: RoomEditorLevel;
  label: string;
  description: string;
  maxTables: number;
  maxRows: number;
  canAddRows: boolean;
  canDuplicate: boolean;
  canLock: boolean;
  canChangeOutline: boolean;
  canThemes: boolean;
  canFixtures: boolean;
  canCustomImages: boolean;
  /** Lecture d’un plan depuis une photo (jetons IA), distincte des images perso. */
  canPlanFromPhoto: boolean;
  canCustomTheme: boolean;
  canZones: boolean;
  canSnapGrid: boolean;
  canRotate: boolean;
  canTemplates: boolean;
  canAutoAssign: boolean;
  canAlign: boolean;
  /** Qualité showcase + mode présentation. */
  canShowcaseRender: boolean;
  tableShapes: TableShape[];
  fixtureKinds: Array<'stage' | 'podium' | 'aisle' | 'corridor' | 'entrance' | 'door' | 'chandelier' | 'column' | 'flower' | 'perimeter' | 'buffet' | 'carpet' | 'stairs' | 'balcony' | 'arch' | 'partition' | 'decal' | 'pedestal' | 'stringLight' | 'fountain' | 'gazebo' | 'djBooth' | 'screen' | 'instrument' | 'bar'>;
};

const LEVEL_ORDER: RoomEditorLevel[] = ['basic', 'standard', 'advanced', 'complete'];

export function parseRoomEditorLevel(value?: string | null): RoomEditorLevel {
  if (value === 'standard' || value === 'advanced' || value === 'complete') return value;
  return 'basic';
}

export function roomEditorCapabilities(
  level?: string | null,
  themesFixtures = true,
): RoomEditorCapabilities {
  const parsed = parseRoomEditorLevel(level);
  const base: RoomEditorCapabilities = {
    level: parsed,
    label: 'Essentiel',
    description: 'Tables simples, déplacement et suppression. Passez à Business pour les rangées et le verrouillage.',
    maxTables: 8,
    maxRows: 0,
    canAddRows: false,
    canDuplicate: false,
    canLock: false,
    canChangeOutline: false,
    canThemes: false,
    canFixtures: false,
    canCustomImages: false,
    canPlanFromPhoto: false,
    canCustomTheme: false,
    canZones: false,
    canSnapGrid: false,
    canRotate: false,
    canTemplates: false,
    canAutoAssign: false,
    canAlign: false,
    canShowcaseRender: false,
    tableShapes: ['round', 'rectangular'],
    fixtureKinds: [],
  };

  if (parsed === 'standard') {
    Object.assign(base, {
      label: 'Business',
      description: 'Rangées, duplication, verrouillage, grille et formes de table. Thèmes et scène dès Premium.',
      maxTables: 16,
      maxRows: 10,
      canAddRows: true,
      canDuplicate: true,
      canLock: true,
      canSnapGrid: true,
      canAutoAssign: true,
      canTemplates: true,
      tableShapes: ['round', 'rectangular', 'square', 'oval', 'arc'] as TableShape[],
      canPlanFromPhoto: true,
      canFixtures: themesFixtures,
      fixtureKinds: themesFixtures ? ['entrance', 'door', 'aisle', 'corridor'] : [],
    } satisfies Partial<RoomEditorCapabilities>);
  } else if (parsed === 'advanced') {
    Object.assign(base, {
      label: 'Premium',
      description: 'Thèmes, sol, scène, fleurs, zones (piste, VIP) et rotation. Images personnalisées en Enterprise.',
      maxTables: 36,
      maxRows: 24,
      canAddRows: true,
      canDuplicate: true,
      canLock: true,
      canChangeOutline: true,
      canThemes: themesFixtures,
      canFixtures: themesFixtures,
      canZones: true,
      canSnapGrid: true,
      canRotate: true,
      canTemplates: true,
      canAutoAssign: true,
      canAlign: true,
      canShowcaseRender: true,
      tableShapes: ['round', 'rectangular', 'square', 'oval', 'cocktail', 'highTop', 'arc'] as TableShape[],
      canPlanFromPhoto: true,
      fixtureKinds: themesFixtures
        ? ['stage', 'podium', 'aisle', 'corridor', 'entrance', 'door', 'chandelier', 'column', 'flower', 'buffet', 'stairs', 'balcony', 'arch', 'partition', 'decal', 'pedestal', 'stringLight', 'screen', 'instrument', 'bar']
        : [],
    } satisfies Partial<RoomEditorCapabilities>);
  } else if (parsed === 'complete') {
    Object.assign(base, {
      label: 'Complet',
      description: 'Éditeur intégral : thèmes perso, images, périmètre, rotation et zones illimitées.',
      maxTables: 80,
      maxRows: 40,
      canAddRows: true,
      canDuplicate: true,
      canLock: true,
      canChangeOutline: true,
      canThemes: themesFixtures,
      canFixtures: themesFixtures,
      canCustomImages: themesFixtures,
      canPlanFromPhoto: true,
      canCustomTheme: themesFixtures,
      canZones: true,
      canSnapGrid: true,
      canRotate: true,
      canTemplates: true,
      canAutoAssign: true,
      canAlign: true,
      canShowcaseRender: true,
      tableShapes: ['round', 'rectangular', 'square', 'oval', 'cocktail', 'highTop', 'arc'] as TableShape[],
      fixtureKinds: themesFixtures
        ? ['stage', 'podium', 'aisle', 'corridor', 'entrance', 'door', 'chandelier', 'column', 'flower', 'perimeter', 'buffet', 'carpet', 'stairs', 'balcony', 'arch', 'partition', 'decal', 'pedestal', 'stringLight', 'fountain', 'gazebo', 'djBooth', 'screen', 'instrument', 'bar']
        : [],
    } satisfies Partial<RoomEditorCapabilities>);
  }

  if (!themesFixtures) {
    base.canThemes = false;
    base.canFixtures = false;
    base.canCustomImages = false;
    base.canCustomTheme = false;
    base.fixtureKinds = [];
  }

  return base;
}

export function nextRoomEditorLevel(level: RoomEditorLevel): RoomEditorLevel | null {
  const i = LEVEL_ORDER.indexOf(level);
  return i >= 0 && i < LEVEL_ORDER.length - 1 ? LEVEL_ORDER[i + 1] : null;
}

export function snapLayoutPct(value: number, enabled: boolean, step = 2.5): number {
  const clamped = Math.max(0, Math.min(100, value));
  if (!enabled) return clamped;
  return Math.round(clamped / step) * step;
}

import type { RoomLayoutBlueprint, ZoneMaterial } from '@/lib/roomLayoutUtils';
import {
  createBlueprintFixture,
  createWallOpening,
  makeLayoutId,
  refreshBlueprintMetadata,
} from '@/lib/roomLayoutUtils';
import type { LayoutSelectionItem } from '@/lib/roomSelectionUtils';
import {
  computeStairMetrics,
  resolveStairStyle,
  type StairStyle,
} from '@/lib/roomStairsUtils';

/** Étage d’un bâtiment / maison (plan multi-niveaux). */
export type RoomStory = {
  id: string;
  label: string;
  /** Hauteur du plancher par rapport au sol (m). */
  elevationM: number;
};

export type FoundationKind = 'none' | 'slab' | 'crawlspace' | 'basement';

export type RoomFoundation = {
  kind: FoundationKind;
  /** Épaisseur / hauteur visible de la fondation (m). */
  heightM: number;
  material?: ZoneMaterial;
  color?: string;
};

export const foundationKindLabels: Record<FoundationKind, string> = {
  none: 'Sans fondation',
  slab: 'Dalle béton',
  crawlspace: 'Vide sanitaire',
  basement: 'Sous-sol',
};

export const DEFAULT_STORY_ID = 'story-rdc';

export function defaultStories(): RoomStory[] {
  return [{ id: DEFAULT_STORY_ID, label: 'RDC', elevationM: 0 }];
}

export function defaultFoundation(): RoomFoundation {
  return { kind: 'slab', heightM: 0.35, material: 'concrete', color: '#78716c' };
}

export function resolveStories(blueprint: RoomLayoutBlueprint): RoomStory[] {
  const list = blueprint.metadata.stories;
  if (Array.isArray(list) && list.length > 0) return list;
  return defaultStories();
}

export function resolveActiveStoryId(blueprint: RoomLayoutBlueprint): string {
  const stories = resolveStories(blueprint);
  const active = blueprint.metadata.activeStoryId;
  if (active && stories.some((s) => s.id === active)) return active;
  return stories[0]!.id;
}

export function resolveFoundation(blueprint: RoomLayoutBlueprint): RoomFoundation {
  return blueprint.metadata.foundation ?? { kind: 'none', heightM: 0 };
}

export function storyElevationM(blueprint: RoomLayoutBlueprint, storyId?: string): number {
  const id = storyId ?? resolveActiveStoryId(blueprint);
  return resolveStories(blueprint).find((s) => s.id === id)?.elevationM ?? 0;
}

/** Élément visible sur l’étage actif (sans storyId = RDC / tous les étages legacy). */
export function belongsToActiveStory(
  blueprint: RoomLayoutBlueprint,
  storyId: string | undefined,
): boolean {
  const active = resolveActiveStoryId(blueprint);
  const stories = resolveStories(blueprint);
  const rdc = stories[0]?.id ?? DEFAULT_STORY_ID;
  if (!storyId) return active === rdc;
  return storyId === active;
}

export type BalconySide = 'north' | 'south' | 'east' | 'west';

export const balconySideLabels: Record<BalconySide, string> = {
  north: 'Nord (haut)',
  south: 'Sud (bas)',
  east: 'Est (droite)',
  west: 'Ouest (gauche)',
};

export function addStory(
  blueprint: RoomLayoutBlueprint,
  label?: string,
): RoomLayoutBlueprint {
  const stories = [...resolveStories(blueprint)];
  const index = stories.length;
  const prevElev = stories[stories.length - 1]?.elevationM ?? 0;
  const id = makeLayoutId('story');
  stories.push({
    id,
    label: label?.trim() || (index === 0 ? 'RDC' : `${index}ᵉ étage`),
    elevationM: prevElev + 3.2,
  });
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      stories,
      activeStoryId: id,
      foundation: blueprint.metadata.foundation ?? defaultFoundation(),
    },
  };
}

/** Modèles prêts à l’emploi pour la structure multi-étages. */
export type BuildingStoryPresetId = 'rdc' | 'duplex' | 'triplex' | 'villa' | 'immeuble';

export type BuildingStoryPreset = {
  id: BuildingStoryPresetId;
  label: string;
  hint: string;
  storyCount: number;
  withStairs: boolean;
  balconySides: BalconySide[];
  foundation: FoundationKind;
  stackView: boolean;
};

export const BUILDING_STORY_PRESETS: BuildingStoryPreset[] = [
  {
    id: 'rdc',
    label: 'Plein pied',
    hint: '1 niveau · idéal salle unique',
    storyCount: 1,
    withStairs: false,
    balconySides: [],
    foundation: 'slab',
    stackView: false,
  },
  {
    id: 'duplex',
    label: 'Duplex',
    hint: 'RDC + 1er · escalier inclus',
    storyCount: 2,
    withStairs: true,
    balconySides: [],
    foundation: 'slab',
    stackView: true,
  },
  {
    id: 'triplex',
    label: 'Triplex',
    hint: '3 niveaux · escaliers entre étages',
    storyCount: 3,
    withStairs: true,
    balconySides: [],
    foundation: 'slab',
    stackView: true,
  },
  {
    id: 'villa',
    label: 'Villa',
    hint: '2 niveaux · balcons · escalier',
    storyCount: 2,
    withStairs: true,
    balconySides: ['south', 'east'],
    foundation: 'slab',
    stackView: true,
  },
  {
    id: 'immeuble',
    label: 'Petit immeuble',
    hint: '3 niveaux · 4 balcons · sous-sol',
    storyCount: 3,
    withStairs: true,
    balconySides: ['north', 'south', 'east', 'west'],
    foundation: 'basement',
    stackView: true,
  },
];

/**
 * Applique un modèle de structure (étages, escaliers, balcons, fondation).
 * Conserves le mobilier existant en le reportant sur le RDC si besoin.
 */
export function applyBuildingStoryPreset(
  blueprint: RoomLayoutBlueprint,
  presetId: BuildingStoryPresetId | string,
): RoomLayoutBlueprint {
  const preset =
    BUILDING_STORY_PRESETS.find((p) => p.id === presetId) ?? BUILDING_STORY_PRESETS[0]!;

  const stories: RoomStory[] = Array.from({ length: preset.storyCount }).map((_, i) => ({
    id: i === 0 ? DEFAULT_STORY_ID : `story-lvl-${i}`,
    label: i === 0 ? 'RDC' : `${i}ᵉ étage`,
    elevationM: i * 3.2,
  }));
  const rdcId = stories[0]!.id;
  const validIds = new Set(stories.map((s) => s.id));

  const remapStory = (storyId?: string) =>
    storyId && validIds.has(storyId) ? storyId : rdcId;

  let next: RoomLayoutBlueprint = {
    ...blueprint,
    furniture: blueprint.furniture.map((f) => ({ ...f, storyId: remapStory(f.storyId) })),
    fixtures: blueprint.fixtures
      .filter((f) => f.kind !== 'stairs' && f.kind !== 'balcony')
      .map((f) => ({
        ...f,
        storyId: remapStory(f.storyId),
        connectsToStoryId: undefined,
      })),
    walls: (blueprint.walls ?? []).map((w) => ({ ...w, storyId: remapStory(w.storyId) })),
    metadata: {
      ...blueprint.metadata,
      stories,
      activeStoryId: rdcId,
      stackView: preset.stackView,
      verticalLinks: [],
      buildingPresetId: preset.id,
      foundation: {
        kind: preset.foundation,
        heightM:
          preset.foundation === 'basement' ? 2.4
            : preset.foundation === 'crawlspace' ? 0.9
              : preset.foundation === 'none' ? 0
                : 0.35,
        material: 'concrete',
        color: '#78716c',
      },
    },
  };

  if (preset.withStairs && stories.length >= 2) {
    for (let i = 0; i < stories.length - 1; i += 1) {
      next = setActiveStory(next, stories[i]!.id);
      const linked = addStairsLinkingStories(next, stories[i + 1]!.id);
      if (linked) next = linked.blueprint;
    }
  }

  if (preset.balconySides.length > 0) {
    const balconyStoryId = stories[Math.min(1, stories.length - 1)]!.id;
    next = setActiveStory(next, balconyStoryId);
    next = addBalconies(next, preset.balconySides).blueprint;
  }

  return refreshBlueprintMetadata(setActiveStory(next, rdcId));
}

export function resolveBuildingPresetId(
  blueprint?: RoomLayoutBlueprint | null,
): BuildingStoryPresetId | null {
  const id = blueprint?.metadata?.buildingPresetId;
  if (id && BUILDING_STORY_PRESETS.some((p) => p.id === id)) {
    return id as BuildingStoryPresetId;
  }
  return null;
}

/**
 * Supprime un étage et son contenu (mobilier, fixtures, murs).
 * Impossible s’il ne reste qu’un seul étage.
 */
export function removeStory(
  blueprint: RoomLayoutBlueprint,
  storyId: string,
): RoomLayoutBlueprint {
  const stories = resolveStories(blueprint);
  if (stories.length <= 1) return blueprint;
  if (!stories.some((s) => s.id === storyId)) return blueprint;

  const remaining = stories
    .filter((s) => s.id !== storyId)
    .map((s, i) => ({
      ...s,
      elevationM: i * 3.2,
      label: s.label || (i === 0 ? 'RDC' : `${i}ᵉ étage`),
    }));
  const fallbackId = remaining[0]!.id;
  const nextActive =
    blueprint.metadata.activeStoryId === storyId
      ? fallbackId
      : remaining.some((s) => s.id === blueprint.metadata.activeStoryId)
        ? blueprint.metadata.activeStoryId!
        : fallbackId;

  const furniture = blueprint.furniture.filter((f) => f.storyId !== storyId);
  const fixtures = blueprint.fixtures
    .filter((f) => f.storyId !== storyId)
    .map((f) =>
      f.connectsToStoryId === storyId
        ? { ...f, connectsToStoryId: undefined }
        : f,
    );
  const walls = (blueprint.walls ?? []).filter((w) => w.storyId !== storyId);
  const verticalLinks = resolveVerticalLinks(blueprint).filter(
    (l) => l.fromStoryId !== storyId && l.toStoryId !== storyId,
  );

  return refreshBlueprintMetadata({
    ...blueprint,
    furniture,
    fixtures,
    walls,
    metadata: {
      ...blueprint.metadata,
      stories: remaining,
      activeStoryId: nextActive,
      verticalLinks,
      stackView: remaining.length > 1 ? blueprint.metadata.stackView : false,
    },
  });
}

const BALCONY_PLACEMENTS: Record<BalconySide, { x: number; y: number; w: number; h: number }> = {
  north: { x: 28, y: 1, w: 44, h: 9 },
  south: { x: 28, y: 90, w: 44, h: 9 },
  east: { x: 90, y: 28, w: 9, h: 44 },
  west: { x: 1, y: 28, w: 9, h: 44 },
};

export function createBalconyFixture(
  index = 1,
  side: BalconySide = 'south',
): RoomLayoutBlueprint['fixtures'][number] {
  const place = BALCONY_PLACEMENTS[side];
  return {
    id: makeLayoutId('balcony'),
    kind: 'balcony',
    ...place,
    label: index <= 1 ? `Balcon ${balconySideLabels[side].split(' ')[0]}` : `Balcon ${index}`,
    material: 'concrete',
    color: '#d6d3d1',
    heightM: 0.12,
    balconySide: side,
  };
}

/** Ajoute un ou plusieurs balcons sur les façades libres. */
export function addBalconies(
  blueprint: RoomLayoutBlueprint,
  sides: BalconySide[],
): { blueprint: RoomLayoutBlueprint; ids: string[] } {
  const storyId = resolveActiveStoryId(blueprint);
  const existingSides = new Set(
    blueprint.fixtures
      .filter((f) => f.kind === 'balcony' && (f.storyId ?? storyId) === storyId)
      .map((f) => f.balconySide)
      .filter(Boolean),
  );
  const ids: string[] = [];
  let fixtures = [...blueprint.fixtures];
  let n = fixtures.filter((f) => f.kind === 'balcony').length;

  for (const side of sides) {
    if (existingSides.has(side)) continue;
    n += 1;
    const balcony = { ...createBalconyFixture(n, side), storyId };
    fixtures.push(balcony);
    ids.push(balcony.id);
    existingSides.add(side);
  }

  if (ids.length === 0) {
    return { blueprint, ids: [] };
  }
  return {
    blueprint: refreshBlueprintMetadata({ ...blueprint, fixtures }),
    ids,
  };
}

export function setActiveStory(
  blueprint: RoomLayoutBlueprint,
  storyId: string,
): RoomLayoutBlueprint {
  const stories = resolveStories(blueprint);
  if (!stories.some((s) => s.id === storyId)) return blueprint;
  return {
    ...blueprint,
    metadata: { ...blueprint.metadata, activeStoryId: storyId, stories },
  };
}

export function updateFoundation(
  blueprint: RoomLayoutBlueprint,
  patch: Partial<RoomFoundation>,
): RoomLayoutBlueprint {
  const current = resolveFoundation(blueprint);
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      foundation: { ...current, ...patch },
      stories: resolveStories(blueprint),
    },
  };
}

export function createCorridorFixture(
  index = 1,
): RoomLayoutBlueprint['fixtures'][number] {
  return {
    id: makeLayoutId('corridor'),
    kind: 'corridor',
    x: 42,
    y: 20,
    w: 16,
    h: 60,
    label: index <= 1 ? 'Couloir' : `Couloir ${index}`,
    material: 'wood',
    color: '#d6d3d1',
  };
}

export type SelectionStylePatch = {
  tableColor?: string;
  color?: string;
  locked?: boolean;
  material?: ZoneMaterial;
};

/** Applique un style à tous les éléments de la sélection (tables, zones, fixtures). */
export function applyStyleToSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  patch: SelectionStylePatch,
): RoomLayoutBlueprint {
  const ids = new Set(selection.map((s) => s.id));
  const furniture = blueprint.furniture.map((f) => {
    if (!ids.has(f.id)) return f;
    if (f.kind === 'table') {
      return {
        ...f,
        ...(patch.tableColor !== undefined ? { tableColor: patch.tableColor } : {}),
        ...(patch.locked !== undefined ? { locked: patch.locked } : {}),
      };
    }
    if (f.kind === 'zone') {
      return {
        ...f,
        ...(patch.color !== undefined ? { color: patch.color } : {}),
        ...(patch.material !== undefined ? { material: patch.material } : {}),
      };
    }
    return f;
  });
  const fixtures = blueprint.fixtures.map((f) => {
    if (!ids.has(f.id)) return f;
    return {
      ...f,
      ...(patch.color !== undefined ? { color: patch.color } : {}),
      ...(patch.material !== undefined ? { material: patch.material } : {}),
    };
  });
  return refreshBlueprintMetadata({ ...blueprint, furniture, fixtures });
}

/** Assigne l’étage actif aux nouveaux éléments sans storyId. */
export function withActiveStoryId<T extends { storyId?: string }>(
  blueprint: RoomLayoutBlueprint,
  item: T,
): T {
  if (item.storyId) return item;
  return { ...item, storyId: resolveActiveStoryId(blueprint) };
}

export type VerticalLink = {
  id: string;
  kind: 'stairs' | 'elevator' | 'ramp';
  fromStoryId: string;
  toStoryId: string;
  fixtureId: string;
};

export function resolveVerticalLinks(blueprint: RoomLayoutBlueprint): VerticalLink[] {
  return blueprint.metadata.verticalLinks ?? [];
}

/** Relie un escalier de l’étage courant vers un autre étage (métriques auto). */
export function linkStairsToStory(
  blueprint: RoomLayoutBlueprint,
  stairsId: string,
  toStoryId: string,
  options?: { style?: StairStyle; keepPosition?: boolean },
): RoomLayoutBlueprint {
  const stories = resolveStories(blueprint);
  const stairs = blueprint.fixtures.find((f) => f.id === stairsId && f.kind === 'stairs');
  if (!stairs || !stories.some((s) => s.id === toStoryId)) return blueprint;

  const fromStoryId = stairs.storyId ?? resolveActiveStoryId(blueprint);
  if (fromStoryId === toStoryId) return blueprint;

  const fromElev = storyElevationM(blueprint, fromStoryId);
  const toElev = storyElevationM(blueprint, toStoryId);
  const style = options?.style ?? resolveStairStyle(stairs.stairStyle);
  const metrics = computeStairMetrics({
    riseM: Math.abs(toElev - fromElev),
    canvasWidthM: blueprint.canvas.widthM,
    canvasDepthM: blueprint.canvas.heightM,
    style,
  });
  const toLabel = stories.find((s) => s.id === toStoryId)?.label ?? 'étage';

  const x = options?.keepPosition
    ? Math.max(2, Math.min(98 - metrics.wPct, stairs.x))
    : Math.max(2, Math.min(98 - metrics.wPct, stairs.x));
  const y = Math.max(2, Math.min(98 - metrics.hPct, stairs.y));

  const link: VerticalLink = {
    id: makeLayoutId('vlink'),
    kind: 'stairs',
    fromStoryId,
    toStoryId,
    fixtureId: stairsId,
  };
  const links = resolveVerticalLinks(blueprint).filter((l) => l.fixtureId !== stairsId);
  links.push(link);

  return {
    ...blueprint,
    fixtures: blueprint.fixtures.map((f) =>
      f.id === stairsId
        ? {
            ...f,
            connectsToStoryId: toStoryId,
            heightM: metrics.riseM,
            steps: metrics.steps,
            w: metrics.wPct,
            h: metrics.hPct,
            x,
            y,
            storyId: fromStoryId,
            stairStyle: style,
            label: f.label?.startsWith('Escalier') ? `Escalier → ${toLabel}` : f.label,
          }
        : f,
    ),
    metadata: {
      ...blueprint.metadata,
      stories,
      verticalLinks: links,
    },
  };
}

/**
 * Crée un escalier sur l’étage actif, déjà relié vers `toStoryId`.
 * Hauteur / marches calculées automatiquement.
 */
export function addStairsLinkingStories(
  blueprint: RoomLayoutBlueprint,
  toStoryId: string,
): { blueprint: RoomLayoutBlueprint; stairsId: string } | null {
  const stories = resolveStories(blueprint);
  if (stories.length < 2) return null;
  if (!stories.some((s) => s.id === toStoryId)) return null;

  const fromStoryId = resolveActiveStoryId(blueprint);
  if (fromStoryId === toStoryId) return null;

  const toLabel = stories.find((s) => s.id === toStoryId)?.label ?? 'étage';
  const base = createBlueprintFixture('stairs');
  const stairs = {
    ...base,
    storyId: fromStoryId,
    label: `Escalier → ${toLabel}`,
  };
  const withStairs: RoomLayoutBlueprint = {
    ...blueprint,
    fixtures: [...blueprint.fixtures, stairs],
    metadata: {
      ...blueprint.metadata,
      stories,
    },
  };
  return {
    blueprint: linkStairsToStory(withStairs, stairs.id, toStoryId),
    stairsId: stairs.id,
  };
}

export function setStackView(
  blueprint: RoomLayoutBlueprint,
  enabled: boolean,
): RoomLayoutBlueprint {
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      stories: resolveStories(blueprint),
      stackView: enabled,
    },
  };
}

/** Visible en mode normal (étage actif) ou en vue empilée (tous). */
export function isStoryVisible(
  blueprint: RoomLayoutBlueprint,
  storyId: string | undefined,
): boolean {
  if (blueprint.metadata.stackView) return true;
  return belongsToActiveStory(blueprint, storyId);
}

/** Élévation Y monde pour un élément (vue empilée ou 0). */
export function worldElevationForStory(
  blueprint: RoomLayoutBlueprint,
  storyId: string | undefined,
): number {
  if (!blueprint.metadata.stackView) return 0;
  // Sans storyId = éléments legacy → RDC (pas l’étage actif).
  if (!storyId) {
    return resolveStories(blueprint)[0]?.elevationM ?? 0;
  }
  return storyElevationM(blueprint, storyId);
}

/** Hauteur totale du bâtiment (dernier plancher + murs). */
export function buildingTopElevationM(
  blueprint: RoomLayoutBlueprint,
  wallHeightM = 3,
): number {
  const stories = resolveStories(blueprint);
  const topFloor = stories.reduce((max, s) => Math.max(max, s.elevationM), 0);
  return topFloor + wallHeightM;
}

/** Centre vertical pour cadrer la vue empilée. */
export function stackViewFocusY(blueprint: RoomLayoutBlueprint, wallHeightM = 3): number {
  if (!blueprint.metadata.stackView) return 0;
  return buildingTopElevationM(blueprint, wallHeightM) / 2;
}

function pointOnSegment(
  ax: number, ay: number, bx: number, by: number, t: number,
): { x: number; y: number } {
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}

function distPointToSeg(
  px: number, py: number,
  ax: number, ay: number, bx: number, by: number,
): { dist: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const q = pointOnSegment(ax, ay, bx, by, t);
  const dist = Math.hypot(px - q.x, py - q.y);
  return { dist, t };
}

/**
 * Perce des portes dans les murs croisés par les couloirs de l’étage actif.
 */
export function punchCorridorOpenings(
  blueprint: RoomLayoutBlueprint,
): { blueprint: RoomLayoutBlueprint; added: number } {
  const corridors = blueprint.fixtures.filter(
    (f) => f.kind === 'corridor' && belongsToActiveStory(blueprint, f.storyId),
  );
  if (corridors.length === 0 || !blueprint.walls?.length) {
    return { blueprint, added: 0 };
  }

  let added = 0;
  const walls = blueprint.walls.map((wall) => {
    if (!belongsToActiveStory(blueprint, wall.storyId)) return wall;
    const openings = [...(wall.openings ?? [])];
    const ax = wall.start.x;
    const ay = wall.start.y;
    const bx = wall.end.x;
    const by = wall.end.y;

    for (const c of corridors) {
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      const { dist, t } = distPointToSeg(cx, cy, ax, ay, bx, by);
      const threshold = Math.max(c.w, c.h) * 0.55;
      if (dist > threshold) continue;
      if (openings.some((o) => o.kind === 'door' && Math.abs(o.t - t) < 0.12)) continue;
      openings.push(
        createWallOpening('door', {
          t,
          style: 'single',
          widthM: Math.min(1.2, Math.max(0.8, (Math.min(c.w, c.h) / 100) * ((blueprint.canvas.widthM + blueprint.canvas.heightM) / 2))),
        }),
      );
      added += 1;
    }
    return { ...wall, openings };
  });

  return {
    blueprint: { ...blueprint, walls },
    added,
  };
}

import type { RoomLayoutBlueprint, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { makeLayoutId, refreshBlueprintMetadata } from '@/lib/roomLayoutUtils';
import type { LayoutSelectionItem } from '@/lib/roomSelectionUtils';

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

import type { RoomLayoutBlueprint, ZoneMaterial } from '@/lib/roomLayoutUtils';
import { createWallOpening, makeLayoutId, refreshBlueprintMetadata } from '@/lib/roomLayoutUtils';
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

/** Relie un escalier de l’étage courant vers un autre étage (hauteur auto). */
export function linkStairsToStory(
  blueprint: RoomLayoutBlueprint,
  stairsId: string,
  toStoryId: string,
): RoomLayoutBlueprint {
  const stories = resolveStories(blueprint);
  const stairs = blueprint.fixtures.find((f) => f.id === stairsId && f.kind === 'stairs');
  if (!stairs || !stories.some((s) => s.id === toStoryId)) return blueprint;

  const fromStoryId = stairs.storyId ?? resolveActiveStoryId(blueprint);
  if (fromStoryId === toStoryId) return blueprint;

  const fromElev = storyElevationM(blueprint, fromStoryId);
  const toElev = storyElevationM(blueprint, toStoryId);
  const heightM = Math.max(0.8, Math.abs(toElev - fromElev));
  const steps = Math.max(4, Math.min(20, Math.round(heightM / 0.18)));

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
        ? { ...f, connectsToStoryId: toStoryId, heightM, steps, storyId: fromStoryId }
        : f,
    ),
    metadata: {
      ...blueprint.metadata,
      stories,
      verticalLinks: links,
    },
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
  return storyElevationM(blueprint, storyId);
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

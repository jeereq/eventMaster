import type { RoomLayoutBlueprint, TableShape } from '@/lib/roomLayoutUtils';
import { makeLayoutId, refreshBlueprintMetadata } from '@/lib/roomLayoutUtils';
import {
  alignedPositions,
  clusterIndices,
  cxOf,
  cyOf,
  IMPORT_ALIGN_TOLERANCE,
  IMPORT_SNAP_STEP,
  median,
  snapPct,
  snapRotationDeg,
  type AlignBox,
  type AlignMode as SharedAlignMode,
} from '@/lib/layoutAlignMath';

export type LayoutSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'chair' | 'wall';

export type LayoutSelectionItem = {
  kind: LayoutSelectableKind;
  id: string;
};

export type AlignMode = SharedAlignMode;

export type LayoutBounds = {
  kind: LayoutSelectableKind;
  id: string;
  /** Coin haut-gauche (ou centre pour points). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** true = x,y est le centre (table, chaise, rangée). */
  isCenter: boolean;
  groupId?: string;
};

export const alignModeLabels: Record<AlignMode, string> = {
  left: 'Aligner à gauche',
  right: 'Aligner à droite',
  centerX: 'Centrer horizontalement',
  top: 'Aligner en haut',
  bottom: 'Aligner en bas',
  centerY: 'Centrer verticalement',
  distributeX: 'Répartir horizontalement',
  distributeY: 'Répartir verticalement',
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Boîte utile d’un élément sélectionnable (en % canvas). */
export function getSelectionBounds(
  blueprint: RoomLayoutBlueprint,
  item: LayoutSelectionItem,
): LayoutBounds | null {
  if (item.kind === 'wall') return null;

  if (item.kind === 'fixture') {
    const f = blueprint.fixtures.find((x) => x.id === item.id);
    if (!f) return null;
    return {
      kind: 'fixture',
      id: f.id,
      x: f.x,
      y: f.y,
      w: f.w,
      h: f.h,
      isCenter: false,
      groupId: f.groupId,
    };
  }

  const furn = blueprint.furniture.find((x) => x.id === item.id);
  if (!furn) return null;

  if (furn.kind === 'zone') {
    return {
      kind: 'zone',
      id: furn.id,
      x: furn.x,
      y: furn.y,
      w: furn.w,
      h: furn.h,
      isCenter: false,
      groupId: furn.groupId,
    };
  }

  if (furn.kind === 'table' || furn.kind === 'chair' || furn.kind === 'row') {
    const size = furn.kind === 'table'
      ? tableFootprint(furn.shape, furn.capacity)
      : furn.kind === 'row'
        ? rowFootprint(furn.seatCount)
        : { w: 3, h: 3 };
    return {
      kind: furn.kind,
      id: furn.id,
      x: furn.x,
      y: furn.y,
      w: size.w,
      h: size.h,
      isCenter: true,
      groupId: furn.groupId,
    };
  }

  return null;
}

function tableFootprint(shape: TableShape | undefined, capacity: number): { w: number; h: number } {
  if (shape === 'cocktail' || shape === 'highTop') return { w: 5, h: 5 };
  if (shape === 'rectangular' || shape === 'arc') {
    const w = capacity >= 14 ? 16 : capacity >= 10 ? 13 : 10;
    return { w, h: 7 };
  }
  const span = Math.max(6, Math.min(14, 5 + capacity * 0.55));
  return { w: span, h: span };
}

function rowFootprint(seatCount: number): { w: number; h: number } {
  return { w: Math.min(40, Math.max(8, seatCount * 2.2)), h: 5 };
}

const FLOOR_FIXTURE_KINDS = new Set<RoomLayoutBlueprint['fixtures'][number]['kind']>([
  'aisle',
  'carpet',
  'stage',
  'podium',
  'buffet',
  'corridor',
  'decal',
  'flower',
  'arch',
  'partition',
  'pedestal',
  'djBooth',
  'screen',
  'fountain',
  'gazebo',
  'instrument',
  'bar',
]);

function applyPosition(
  blueprint: RoomLayoutBlueprint,
  item: LayoutSelectionItem,
  pos: { x: number; y: number },
): RoomLayoutBlueprint {
  const x = clamp(pos.x, 1, 99);
  const y = clamp(pos.y, 1, 99);
  if (item.kind === 'fixture') {
    return {
      ...blueprint,
      fixtures: blueprint.fixtures.map((f) => (f.id === item.id ? { ...f, x, y } : f)),
    };
  }
  return {
    ...blueprint,
    furniture: blueprint.furniture.map((f) => (f.id === item.id ? { ...f, x, y } : f)),
  };
}

/** Aligne ou répartit les éléments sélectionnés (min. 2). */
export function alignLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  mode: AlignMode,
): RoomLayoutBlueprint {
  const boxes = selection
    .map((s) => getSelectionBounds(blueprint, s))
    .filter((b): b is LayoutBounds => Boolean(b));
  const moves = alignedPositions(boxes, mode);
  if (moves.size === 0) return blueprint;

  let next = blueprint;
  for (const box of boxes) {
    const pos = moves.get(box.id);
    if (!pos) continue;
    next = applyPosition(next, { kind: box.kind, id: box.id }, pos);
  }
  return refreshBlueprintMetadata(next);
}

function toAlignBox(bounds: LayoutBounds): AlignBox {
  return { id: bounds.id, x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h, isCenter: bounds.isCenter };
}

function snapFloorItemPosition<T extends { x: number; y: number; rotation?: number }>(item: T): T {
  return {
    ...item,
    x: snapPct(item.x, IMPORT_SNAP_STEP),
    y: snapPct(item.y, IMPORT_SNAP_STEP),
    rotation: snapRotationDeg(item.rotation),
  };
}

function applyClusterAxis(
  blueprint: RoomLayoutBlueprint,
  items: LayoutSelectionItem[],
  axis: 'x' | 'y',
): RoomLayoutBlueprint {
  const boxes = items
    .map((item) => getSelectionBounds(blueprint, item))
    .filter((box): box is LayoutBounds => Boolean(box));
  if (boxes.length < 2) return blueprint;
  const values = boxes.map((box) => (axis === 'x' ? cxOf(toAlignBox(box)) : cyOf(toAlignBox(box))));
  const groups = clusterIndices(values, IMPORT_ALIGN_TOLERANCE);
  let next = blueprint;
  for (const group of groups) {
    if (group.length < 2) continue;
    const target = snapPct(median(group.map((index) => values[index])), IMPORT_SNAP_STEP);
    for (const index of group) {
      const box = boxes[index];
      const pos = axis === 'x'
        ? { x: box.isCenter ? target : target - box.w / 2, y: box.y }
        : { x: box.x, y: box.isCenter ? target : target - box.h / 2 };
      next = applyPosition(next, { kind: box.kind, id: box.id }, pos);
    }
  }
  return next;
}

/** Grille + alignement des éléments au sol après un import photo / studio IA. */
export function tidyImportedFloorLayout(blueprint: RoomLayoutBlueprint): RoomLayoutBlueprint {
  let next: RoomLayoutBlueprint = {
    ...blueprint,
    furniture: blueprint.furniture.map((item) => snapFloorItemPosition(item)),
    fixtures: blueprint.fixtures.map((item) => (
      FLOOR_FIXTURE_KINDS.has(item.kind) ? snapFloorItemPosition(item) : item
    )),
  };

  const tables: LayoutSelectionItem[] = next.furniture
    .filter((item) => item.kind === 'table')
    .map((item) => ({ kind: 'table' as const, id: item.id }));
  const rows: LayoutSelectionItem[] = next.furniture
    .filter((item) => item.kind === 'row')
    .map((item) => ({ kind: 'row' as const, id: item.id }));
  const chairs: LayoutSelectionItem[] = next.furniture
    .filter((item) => item.kind === 'chair')
    .map((item) => ({ kind: 'chair' as const, id: item.id }));

  for (const group of [tables, rows, chairs]) {
    next = applyClusterAxis(next, group, 'y');
    next = applyClusterAxis(next, group, 'x');
  }

  return refreshBlueprintMetadata(next);
}

/** Déplace plusieurs éléments d’un delta en %. */
export function moveLayoutSelectionByDelta(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  dx: number,
  dy: number,
): RoomLayoutBlueprint {
  let next = blueprint;
  for (const item of selection) {
    if (item.kind === 'wall') continue;
    const box = getSelectionBounds(next, item);
    if (!box) continue;
    next = applyPosition(next, item, { x: box.x + dx, y: box.y + dy });
  }
  return next;
}

/** Étend la sélection à tous les membres des groupes concernés. */
export function expandSelectionWithGroups(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
): LayoutSelectionItem[] {
  const groupIds = new Set<string>();
  for (const s of selection) {
    const b = getSelectionBounds(blueprint, s);
    if (b?.groupId) groupIds.add(b.groupId);
  }
  if (groupIds.size === 0) return selection;

  const extra: LayoutSelectionItem[] = [];
  for (const f of blueprint.fixtures) {
    if (f.groupId && groupIds.has(f.groupId)) {
      extra.push({ kind: 'fixture', id: f.id });
    }
  }
  for (const f of blueprint.furniture) {
    if ('groupId' in f && f.groupId && groupIds.has(f.groupId)) {
      const kind = f.kind as LayoutSelectableKind;
      if (kind === 'table' || kind === 'chair' || kind === 'row' || kind === 'zone') {
        extra.push({ kind, id: f.id });
      }
    }
  }

  const key = (s: LayoutSelectionItem) => `${s.kind}:${s.id}`;
  const map = new Map<string, LayoutSelectionItem>();
  [...selection, ...extra].forEach((s) => map.set(key(s), s));
  return [...map.values()];
}

export function groupLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
): RoomLayoutBlueprint {
  const items = selection.filter((s) => s.kind !== 'wall');
  if (items.length < 2) return blueprint;
  const groupId = makeLayoutId('group');
  const ids = new Set(items.map((i) => i.id));

  return refreshBlueprintMetadata({
    ...blueprint,
    fixtures: blueprint.fixtures.map((f) =>
      ids.has(f.id) && items.some((i) => i.kind === 'fixture' && i.id === f.id)
        ? { ...f, groupId }
        : f,
    ),
    furniture: blueprint.furniture.map((f) =>
      ids.has(f.id) ? { ...f, groupId } : f,
    ),
  });
}

export function ungroupLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
): RoomLayoutBlueprint {
  const groupIds = new Set<string>();
  for (const s of selection) {
    const b = getSelectionBounds(blueprint, s);
    if (b?.groupId) groupIds.add(b.groupId);
  }
  if (groupIds.size === 0) {
    // clear groupId only on selection
    const ids = new Set(selection.map((s) => s.id));
    return refreshBlueprintMetadata({
      ...blueprint,
      fixtures: blueprint.fixtures.map((f) =>
        ids.has(f.id) ? { ...f, groupId: undefined } : f,
      ),
      furniture: blueprint.furniture.map((f) =>
        ids.has(f.id) ? { ...f, groupId: undefined } : f,
      ),
    });
  }

  return refreshBlueprintMetadata({
    ...blueprint,
    fixtures: blueprint.fixtures.map((f) =>
      f.groupId && groupIds.has(f.groupId) ? { ...f, groupId: undefined } : f,
    ),
    furniture: blueprint.furniture.map((f) =>
      f.groupId && groupIds.has(f.groupId) ? { ...f, groupId: undefined } : f,
    ),
  });
}

const DUPLICATE_OFFSET_PCT = 6;

function copyLabel(value: string | undefined, fallback: string) {
  const base = value?.trim() || fallback;
  return base.endsWith('(copie)') ? base : `${base} (copie)`;
}

function nextFurnitureId(kind: LayoutSelectableKind) {
  if (kind === 'table') return makeLayoutId('table');
  if (kind === 'row') return makeLayoutId('row');
  if (kind === 'chair') return makeLayoutId('chair');
  if (kind === 'zone') return makeLayoutId('zone');
  return makeLayoutId(kind);
}

export type DuplicateLayoutResult = {
  blueprint: RoomLayoutBlueprint;
  selection: LayoutSelectionItem[];
};

/** Duplique la sélection (tables, sièges, rangées, zones, fixtures) en conservant le groupe. */
export function duplicateLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  options?: { offsetPct?: number },
): DuplicateLayoutResult {
  const offset = options?.offsetPct ?? DUPLICATE_OFFSET_PCT;
  const items = selection.filter((s) => s.kind !== 'wall');
  if (items.length === 0) return { blueprint, selection };

  const keepGroup = items.length > 1 || items.some((item) => getSelectionBounds(blueprint, item)?.groupId);
  const newGroupId = keepGroup ? makeLayoutId('group') : undefined;
  const nextFurniture = [...blueprint.furniture];
  const nextFixtures = [...blueprint.fixtures];
  const copied: LayoutSelectionItem[] = [];

  for (const item of items) {
    if (item.kind === 'fixture') {
      const source = blueprint.fixtures.find((f) => f.id === item.id);
      if (!source) continue;
      const id = makeLayoutId('fixture');
      nextFixtures.push({
        ...source,
        id,
        x: clamp(source.x + offset, 1, Math.max(1, 99 - source.w)),
        y: clamp(source.y + offset, 1, Math.max(1, 99 - source.h)),
        label: copyLabel(source.label, source.kind),
        groupId: newGroupId,
      });
      copied.push({ kind: 'fixture', id });
      continue;
    }

    const source = blueprint.furniture.find((f) => f.id === item.id);
    if (!source) continue;
    const id = nextFurnitureId(item.kind);
    if (source.kind === 'table') {
      nextFurniture.push({
        ...source,
        id,
        name: copyLabel(source.name, 'Table'),
        x: clamp(source.x + offset, 1, 99),
        y: clamp(source.y + offset, 1, 99),
        locked: false,
        groupId: newGroupId,
      });
    } else if (source.kind === 'row') {
      nextFurniture.push({
        ...source,
        id,
        label: copyLabel(source.label, 'Rangée'),
        rowName: source.rowName ? copyLabel(source.rowName, source.rowName) : source.rowName,
        x: clamp(source.x + offset, 1, 99),
        y: clamp(source.y + offset, 1, 99),
        groupId: newGroupId,
      });
    } else if (source.kind === 'chair') {
      nextFurniture.push({
        ...source,
        id,
        label: source.label ? copyLabel(source.label, 'Siège') : source.label,
        x: clamp(source.x + offset, 1, 99),
        y: clamp(source.y + offset, 1, 99),
        locked: false,
        groupId: newGroupId,
      });
    } else if (source.kind === 'zone') {
      nextFurniture.push({
        ...source,
        id,
        label: copyLabel(source.label, 'Zone'),
        x: clamp(source.x + offset, 1, Math.max(1, 99 - source.w)),
        y: clamp(source.y + offset, 1, Math.max(1, 99 - source.h)),
        groupId: newGroupId,
      });
    }
    copied.push({ kind: item.kind, id });
  }

  if (copied.length === 0) return { blueprint, selection };

  return {
    blueprint: refreshBlueprintMetadata({
      ...blueprint,
      furniture: nextFurniture,
      fixtures: nextFixtures,
    }),
    selection: copied,
  };
}

function selectionCentroid(boxes: LayoutBounds[]) {
  const xs = boxes.map(cxOf);
  const ys = boxes.map(cyOf);
  return {
    x: xs.reduce((sum, n) => sum + n, 0) / boxes.length,
    y: ys.reduce((sum, n) => sum + n, 0) / boxes.length,
  };
}

function applyBoxTransform(
  blueprint: RoomLayoutBlueprint,
  box: LayoutBounds,
  nextCenter: { x: number; y: number },
  nextSize?: { w: number; h: number },
  extraRotation = 0,
): RoomLayoutBlueprint {
  const w = nextSize?.w ?? box.w;
  const h = nextSize?.h ?? box.h;
  const x = box.isCenter ? nextCenter.x : nextCenter.x - w / 2;
  const y = box.isCenter ? nextCenter.y : nextCenter.y - h / 2;
  let next = applyPosition(blueprint, { kind: box.kind, id: box.id }, { x, y });
  if (box.kind === 'fixture' && nextSize) {
    next = {
      ...next,
      fixtures: next.fixtures.map((f) => (f.id === box.id ? { ...f, w, h } : f)),
    };
  }
  if (box.kind === 'zone' && nextSize) {
    next = {
      ...next,
      furniture: next.furniture.map((f) =>
        f.id === box.id && f.kind === 'zone' ? { ...f, w, h } : f,
      ),
    };
  }
  if (extraRotation) {
    const addRot = (current?: number) => ((current ?? 0) + extraRotation + 360) % 360;
    if (box.kind === 'fixture') {
      next = {
        ...next,
        fixtures: next.fixtures.map((f) => (f.id === box.id ? { ...f, rotation: addRot(f.rotation) } : f)),
      };
    } else {
      next = {
        ...next,
        furniture: next.furniture.map((f) => (f.id === box.id ? { ...f, rotation: addRot(f.rotation) } : f)),
      };
    }
  }
  return next;
}

/** Tourne la sélection de 90° autour de son centre (sens horaire). */
export function rotateLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
): RoomLayoutBlueprint {
  const boxes = selection
    .map((s) => getSelectionBounds(blueprint, s))
    .filter((b): b is LayoutBounds => Boolean(b));
  if (boxes.length === 0) return blueprint;
  const origin = selectionCentroid(boxes);
  let next = blueprint;
  for (const box of boxes) {
    const dx = cxOf(box) - origin.x;
    const dy = cyOf(box) - origin.y;
    const swapSize = !box.isCenter;
    next = applyBoxTransform(
      next,
      box,
      { x: origin.x - dy, y: origin.y + dx },
      swapSize ? { w: box.h, h: box.w } : undefined,
      90,
    );
  }
  return refreshBlueprintMetadata(next);
}

export type FlipAxis = 'horizontal' | 'vertical';

/** Miroir de la sélection autour de son centre. */
export function flipLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  axis: FlipAxis,
): RoomLayoutBlueprint {
  const boxes = selection
    .map((s) => getSelectionBounds(blueprint, s))
    .filter((b): b is LayoutBounds => Boolean(b));
  if (boxes.length === 0) return blueprint;
  const origin = selectionCentroid(boxes);
  let next = blueprint;
  for (const box of boxes) {
    const cx = cxOf(box);
    const cy = cyOf(box);
    const nextCenter = axis === 'horizontal'
      ? { x: origin.x * 2 - cx, y: cy }
      : { x: cx, y: origin.y * 2 - cy };
    next = applyBoxTransform(next, box, nextCenter, undefined, 0);
  }
  return refreshBlueprintMetadata(next);
}

export function selectionKey(s: LayoutSelectionItem) {
  return `${s.kind}:${s.id}`;
}

export function toggleSelectionItem(
  current: LayoutSelectionItem[],
  item: LayoutSelectionItem,
): LayoutSelectionItem[] {
  const k = selectionKey(item);
  if (current.some((c) => selectionKey(c) === k)) {
    return current.filter((c) => selectionKey(c) !== k);
  }
  return [...current, item];
}

export function isItemSelected(
  selection: LayoutSelectionItem[],
  kind: LayoutSelectableKind,
  id: string,
) {
  return selection.some((s) => s.kind === kind && s.id === id);
}

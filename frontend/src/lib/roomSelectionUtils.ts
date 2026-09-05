import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import { makeLayoutId, refreshBlueprintMetadata } from '@/lib/roomLayoutUtils';

export type LayoutSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'chair' | 'wall';

export type LayoutSelectionItem = {
  kind: LayoutSelectableKind;
  id: string;
};

export type AlignMode =
  | 'left'
  | 'right'
  | 'centerX'
  | 'top'
  | 'bottom'
  | 'centerY'
  | 'distributeX'
  | 'distributeY';

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
    const w = furn.kind === 'row' ? Math.min(furn.seatCount, 12) * 1.2 : 6;
    const h = furn.kind === 'row' ? 4 : 6;
    return {
      kind: furn.kind,
      id: furn.id,
      x: furn.x,
      y: furn.y,
      w,
      h,
      isCenter: true,
      groupId: furn.groupId,
    };
  }

  return null;
}

function leftOf(b: LayoutBounds) {
  return b.isCenter ? b.x - b.w / 2 : b.x;
}
function rightOf(b: LayoutBounds) {
  return b.isCenter ? b.x + b.w / 2 : b.x + b.w;
}
function topOf(b: LayoutBounds) {
  return b.isCenter ? b.y - b.h / 2 : b.y;
}
function bottomOf(b: LayoutBounds) {
  return b.isCenter ? b.y + b.h / 2 : b.y + b.h;
}
function cxOf(b: LayoutBounds) {
  return b.isCenter ? b.x : b.x + b.w / 2;
}
function cyOf(b: LayoutBounds) {
  return b.isCenter ? b.y : b.y + b.h / 2;
}

function setLeft(b: LayoutBounds, left: number): { x: number; y: number } {
  if (b.isCenter) return { x: left + b.w / 2, y: b.y };
  return { x: left, y: b.y };
}
function setRight(b: LayoutBounds, right: number): { x: number; y: number } {
  if (b.isCenter) return { x: right - b.w / 2, y: b.y };
  return { x: right - b.w, y: b.y };
}
function setTop(b: LayoutBounds, top: number): { x: number; y: number } {
  if (b.isCenter) return { x: b.x, y: top + b.h / 2 };
  return { x: b.x, y: top };
}
function setBottom(b: LayoutBounds, bottom: number): { x: number; y: number } {
  if (b.isCenter) return { x: b.x, y: bottom - b.h / 2 };
  return { x: b.x, y: bottom - b.h };
}
function setCx(b: LayoutBounds, cx: number): { x: number; y: number } {
  if (b.isCenter) return { x: cx, y: b.y };
  return { x: cx - b.w / 2, y: b.y };
}
function setCy(b: LayoutBounds, cy: number): { x: number; y: number } {
  if (b.isCenter) return { x: b.x, y: cy };
  return { x: b.x, y: cy - b.h / 2 };
}

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
  if (boxes.length < 2) return blueprint;

  let next = blueprint;

  if (mode === 'distributeX' || mode === 'distributeY') {
    const sorted = [...boxes].sort((a, b) =>
      mode === 'distributeX' ? cxOf(a) - cxOf(b) : cyOf(a) - cyOf(b),
    );
    if (sorted.length < 3) {
      // 2 éléments : pas de répartition, centrer entre eux suffit via align
      return blueprint;
    }
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const start = mode === 'distributeX' ? cxOf(first) : cyOf(first);
    const end = mode === 'distributeX' ? cxOf(last) : cyOf(last);
    const step = (end - start) / (sorted.length - 1);
    sorted.forEach((b, i) => {
      const target = start + step * i;
      const pos = mode === 'distributeX' ? setCx(b, target) : setCy(b, target);
      next = applyPosition(next, { kind: b.kind, id: b.id }, pos);
    });
    return refreshBlueprintMetadata(next);
  }

  const targetLeft = Math.min(...boxes.map(leftOf));
  const targetRight = Math.max(...boxes.map(rightOf));
  const targetTop = Math.min(...boxes.map(topOf));
  const targetBottom = Math.max(...boxes.map(bottomOf));
  const targetCx = (targetLeft + targetRight) / 2;
  const targetCy = (targetTop + targetBottom) / 2;

  for (const b of boxes) {
    let pos = { x: b.x, y: b.y };
    if (mode === 'left') pos = setLeft(b, targetLeft);
    if (mode === 'right') pos = setRight(b, targetRight);
    if (mode === 'centerX') pos = setCx(b, targetCx);
    if (mode === 'top') pos = setTop(b, targetTop);
    if (mode === 'bottom') pos = setBottom(b, targetBottom);
    if (mode === 'centerY') pos = setCy(b, targetCy);
    next = applyPosition(next, { kind: b.kind, id: b.id }, pos);
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

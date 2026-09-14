import type { RoomLayoutBlueprint, TableShape } from '@/lib/roomLayoutUtils';
import {
  estimateTableFootprint,
  findClearLayoutSlot,
  makeLayoutId,
  placeCenteredItemWithClearance,
  placeFixtureWithClearance,
  refreshBlueprintMetadata,
} from '@/lib/roomLayoutUtils';
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
import {
  enforceRealLayoutClearances,
  detectLayoutClearanceConflicts,
  REAL_CLEARANCE_METERS,
  CLEARANCE_PRESETS,
  type ClearancePreset,
  type ClearanceAnalysisReport,
  type LayoutClearanceConflict,
} from '@/lib/roomLayoutClearance';

export {
  enforceRealLayoutClearances,
  detectLayoutClearanceConflicts,
  REAL_CLEARANCE_METERS,
  CLEARANCE_PRESETS,
  type ClearancePreset,
  type ClearanceAnalysisReport,
  type LayoutClearanceConflict,
};

export type LayoutSelectableKind = 'table' | 'row' | 'zone' | 'fixture' | 'chair' | 'wall';

export type LayoutSelectionItem = {
  kind: LayoutSelectableKind;
  id: string;
  /** Siège attaché (table ou rangée) — indépendant du plateau / de la rangée. */
  seatIndex?: number;
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
  centerRoomX: 'Centrer dans la salle (horizontal)',
  centerRoomY: 'Centrer dans la salle (vertical)',
  gridTidy: 'Organiser en grille propre',
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
      ? tableFootprint(furn.shape, furn.capacity, {
          customWidthM: furn.customWidthM,
          customDepthM: furn.customDepthM,
          customRadiusM: furn.customRadiusM,
        })
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

function tableFootprint(
  shape: TableShape | undefined,
  capacity: number,
  customDims?: {
    customWidthM?: number;
    customDepthM?: number;
    customRadiusM?: number;
  },
): { w: number; h: number } {
  if (customDims) {
    if (typeof customDims.customRadiusM === 'number' && customDims.customRadiusM > 0) {
      const span = Math.max(4, Math.min(30, customDims.customRadiusM * 2 * 6.5));
      return { w: span, h: span };
    }
    const w = typeof customDims.customWidthM === 'number' && customDims.customWidthM > 0
      ? Math.max(4, Math.min(35, customDims.customWidthM * 5.8))
      : undefined;
    const h = typeof customDims.customDepthM === 'number' && customDims.customDepthM > 0
      ? Math.max(4, Math.min(30, customDims.customDepthM * 5.8))
      : undefined;
    if (w !== undefined || h !== undefined) {
      const def = shape === 'square' ? { w: 8, h: 8 } : { w: 10, h: 7 };
      return { w: w ?? def.w, h: h ?? def.h };
    }
  }
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
  'orderCounter',
  'pickupCounter',
  'pizzaOven',
  'kitchenLine',
  'displayCase',
  'stylingStation',
  'washBasin',
  'condimentStation',
  'loungeSofa',
  'car',
  'parasol',
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

    // Ne pas aligner des éléments qui se chevauchent déjà sur l'axe perpendiculaire
    // pour éviter de les empiler au même point
    const hasPerpOverlap = group.some((i, idx) => {
      const b1 = boxes[i];
      return group.slice(idx + 1).some((j) => {
        const b2 = boxes[j];
        if (axis === 'y') {
          const dist = Math.abs(cxOf(toAlignBox(b1)) - cxOf(toAlignBox(b2)));
          const minSep = (b1.w + b2.w) / 2;
          return dist < minSep;
        } else {
          const dist = Math.abs(cyOf(toAlignBox(b1)) - cyOf(toAlignBox(b2)));
          const minSep = (b1.h + b2.h) / 2;
          return dist < minSep;
        }
      });
    });
    if (hasPerpOverlap) continue;

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

/** Grille + alignement + dés-empilement et écartements réels du mobilier au sol. */
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

  // Seules les tables et rangées peuvent être alignées en rangée/colonne si non chevauchantes
  for (const group of [tables, rows]) {
    next = applyClusterAxis(next, group, 'y');
    next = applyClusterAxis(next, group, 'x');
  }

  // Dés-empilement strict des chaises et application des écartements physiques réels
  next = enforceRealLayoutClearances(next);

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
  if (selection.some((s) => typeof s.seatIndex === 'number')) return selection;
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
      const draft = {
        ...source,
        id,
        x: clamp(source.x + offset, 1, Math.max(1, 99 - source.w)),
        y: clamp(source.y + offset, 1, Math.max(1, 99 - source.h)),
        label: copyLabel(source.label, source.kind),
        groupId: newGroupId,
      };
      nextFixtures.push(
        placeFixtureWithClearance({ ...blueprint, furniture: nextFurniture, fixtures: nextFixtures }, draft),
      );
      copied.push({ kind: 'fixture', id });
      continue;
    }

    const source = blueprint.furniture.find((f) => f.id === item.id);
    if (!source) continue;
    const id = nextFurnitureId(item.kind);
    if (source.kind === 'table') {
      nextFurniture.push(
        placeCenteredItemWithClearance(
          { ...blueprint, furniture: nextFurniture, fixtures: nextFixtures },
          {
            ...source,
            id,
            name: copyLabel(source.name, 'Table'),
            x: clamp(source.x + offset, 1, 99),
            y: clamp(source.y + offset, 1, 99),
            locked: false,
            groupId: newGroupId,
          },
          estimateTableFootprint(source.shape, source.capacity),
          'table',
        ),
      );
    } else if (source.kind === 'row') {
      nextFurniture.push(
        placeCenteredItemWithClearance(
          { ...blueprint, furniture: nextFurniture, fixtures: nextFixtures },
          {
            ...source,
            id,
            label: copyLabel(source.label, 'Rangée'),
            rowName: source.rowName ? copyLabel(source.rowName, source.rowName) : source.rowName,
            x: clamp(source.x + offset, 1, 99),
            y: clamp(source.y + offset, 1, 99),
            groupId: newGroupId,
          },
          { w: Math.min(40, Math.max(8, source.seatCount * 2.2)), h: 5 },
          'row',
        ),
      );
    } else if (source.kind === 'chair') {
      nextFurniture.push(
        placeCenteredItemWithClearance(
          { ...blueprint, furniture: nextFurniture, fixtures: nextFixtures },
          {
            ...source,
            id,
            label: source.label ? copyLabel(source.label, 'Siège') : source.label,
            x: clamp(source.x + offset, 1, 99),
            y: clamp(source.y + offset, 1, 99),
            locked: false,
            groupId: newGroupId,
          },
          { w: 3, h: 3 },
          'chair',
        ),
      );
    } else if (source.kind === 'zone') {
      const draft = {
        ...source,
        id,
        label: copyLabel(source.label, 'Zone'),
        x: clamp(source.x + offset, 1, Math.max(1, 99 - source.w)),
        y: clamp(source.y + offset, 1, Math.max(1, 99 - source.h)),
        groupId: newGroupId,
      };
      const slot = findClearLayoutSlot(
        { ...blueprint, furniture: nextFurniture, fixtures: nextFixtures },
        {
          w: draft.w,
          h: draft.h,
          preferred: { x: draft.x, y: draft.y },
          storyId: draft.storyId,
          kind: 'zone',
        },
      );
      nextFurniture.push({ ...draft, x: slot.x, y: slot.y });
    }
    copied.push({ kind: item.kind, id });
  }

  if (copied.length === 0) return { blueprint, selection };

  const sanitized = enforceRealLayoutClearances({
    ...blueprint,
    furniture: nextFurniture,
    fixtures: nextFixtures,
  });

  return {
    blueprint: refreshBlueprintMetadata(sanitized as RoomLayoutBlueprint),
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

/** Tourne la sélection d'un angle en degrés autour de son centre (sens horaire). Par défaut 90°. */
export function rotateLayoutSelection(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  angleDeg = 90,
): RoomLayoutBlueprint {
  const boxes = selection
    .map((s) => getSelectionBounds(blueprint, s))
    .filter((b): b is LayoutBounds => Boolean(b));
  if (boxes.length === 0) return blueprint;
  const origin = selectionCentroid(boxes);
  let next = blueprint;
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  for (const box of boxes) {
    const dx = cxOf(box) - origin.x;
    const dy = cyOf(box) - origin.y;
    // Rotation 2D du centre de chaque boîte autour du barycentre
    const nextDx = dx * cos - dy * sin;
    const nextDy = dx * sin + dy * cos;

    // Pour les zones (rectangles d'ambiance 2D sans propriété rotation CSS),
    // on permute largeur et hauteur lors des rotations orthogonales (90° / 270°)
    const isOrthogonal = Math.abs(angleDeg % 180) === 90;
    const swapSize = isOrthogonal && box.kind === 'zone';

    next = applyBoxTransform(
      next,
      box,
      { x: origin.x + nextDx, y: origin.y + nextDy },
      swapSize ? { w: box.h, h: box.w } : undefined,
      angleDeg,
    );
  }
  return refreshBlueprintMetadata(next);
}

/** Calcule l'angle d'orientation (en degrés 0..360) d'un point vers un autre. */
export function calculateAngleToPoint(fromX: number, fromY: number, targetX: number, targetY: number): number {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 0;
  // Convention EventMaster 2D & 3D : 0° = Sud, 90° = Est, 180° = Nord, 270° = Ouest
  let deg = Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
  if (deg < 0) deg += 360;
  return deg % 360;
}

/** Trouve le point focal de scène ou de podium du plan (ou le fond de scène par défaut). */
export function findPrimaryStageFocus(blueprint: RoomLayoutBlueprint): { x: number; y: number } {
  const stage = blueprint.fixtures.find((f) => f.kind === 'stage' || f.kind === 'podium');
  if (stage) {
    return { x: stage.x + stage.w / 2, y: stage.y + stage.h / 2 };
  }
  return { x: 50, y: 12 };
}

/** Trouve la table la plus proche d'un point (pour orienter une chaise libre par exemple). */
export function findClosestTableCenter(
  blueprint: RoomLayoutBlueprint,
  xPct: number,
  yPct: number,
  ignoreId?: string,
): { x: number; y: number } | null {
  let closest: { x: number; y: number; dist: number } | null = null;
  for (const item of blueprint.furniture) {
    if (item.kind !== 'table' || item.id === ignoreId) continue;
    const dist = Math.hypot(item.x - xPct, item.y - yPct);
    if (!closest || dist < closest.dist) {
      closest = { x: item.x, y: item.y, dist };
    }
  }
  return closest ? { x: closest.x, y: closest.y } : null;
}

export type SmartOrientationTarget = 'stage' | 'center' | 'closestTable' | 'closestWall';

/** Oriente chaque élément de la sélection vers une cible intelligente (scène, centre, table la plus proche, mur). */
export function orientSelectionTowards(
  blueprint: RoomLayoutBlueprint,
  selection: LayoutSelectionItem[],
  target: SmartOrientationTarget,
): RoomLayoutBlueprint {
  const ids = new Set(selection.map((s) => s.id));
  const stageFocus = findPrimaryStageFocus(blueprint);

  const getTargetPos = (x: number, y: number, id: string): { x: number; y: number } => {
    if (target === 'stage') return stageFocus;
    if (target === 'center') return { x: 50, y: 50 };
    if (target === 'closestTable') {
      const tbl = findClosestTableCenter(blueprint, x, y, id);
      return tbl ?? stageFocus;
    }
    // closestWall : orienter vers l'intérieur de la salle (loin du mur le plus proche)
    const distTop = y;
    const distBottom = 100 - y;
    const distLeft = x;
    const distRight = 100 - x;
    const minDist = Math.min(distTop, distBottom, distLeft, distRight);
    if (minDist === distTop) return { x, y: 100 };
    if (minDist === distBottom) return { x, y: 0 };
    if (minDist === distLeft) return { x: 100, y };
    return { x: 0, y };
  };

  const nextFurniture = blueprint.furniture.map((item) => {
    if (!ids.has(item.id)) return item;
    const targetPos = getTargetPos(item.x, item.y, item.id);
    const rotation = calculateAngleToPoint(item.x, item.y, targetPos.x, targetPos.y);
    return { ...item, rotation };
  });

  const nextFixtures = blueprint.fixtures.map((item) => {
    if (!ids.has(item.id)) return item;
    const cx = item.x + item.w / 2;
    const cy = item.y + item.h / 2;
    const targetPos = getTargetPos(cx, cy, item.id);
    const rotation = calculateAngleToPoint(cx, cy, targetPos.x, targetPos.y);
    return { ...item, rotation };
  });

  return refreshBlueprintMetadata({
    ...blueprint,
    furniture: nextFurniture,
    fixtures: nextFixtures,
  });
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
  return typeof s.seatIndex === 'number' ? `${s.kind}:${s.id}:${s.seatIndex}` : `${s.kind}:${s.id}`;
}

/** Indices de sièges sélectionnés pour une table ou une rangée. */
export function selectedSeatIndicesFor(
  selection: LayoutSelectionItem[],
  kind: 'table' | 'row',
  id: string,
): number[] {
  return selection
    .filter((s) => s.kind === kind && s.id === id && typeof s.seatIndex === 'number')
    .map((s) => s.seatIndex as number);
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

/** Sélectionne l'intégralité des éléments mobiliers, zones et équipements du plan. */
export function selectAllItems(blueprint: RoomLayoutBlueprint): LayoutSelectionItem[] {
  const items: LayoutSelectionItem[] = [];
  for (const f of blueprint.furniture) {
    if (f.kind === 'table' || f.kind === 'chair' || f.kind === 'row' || f.kind === 'zone') {
      items.push({ kind: f.kind, id: f.id });
    }
  }
  for (const fix of blueprint.fixtures) {
    items.push({ kind: 'fixture', id: fix.id });
  }
  return items;
}

/** Filtre et sélectionne les éléments selon une catégorie spécifique (ex. toutes les tables, ou tous les écrans). */
export function selectItemsByKind(
  blueprint: RoomLayoutBlueprint,
  kindFilter: 'table' | 'chair' | 'row' | 'zone' | 'fixture' | 'screen',
): LayoutSelectionItem[] {
  if (kindFilter === 'screen') {
    return blueprint.fixtures
      .filter((f) => f.kind === 'screen')
      .map((f) => ({ kind: 'fixture', id: f.id }));
  }
  if (kindFilter === 'fixture') {
    return blueprint.fixtures.map((f) => ({ kind: 'fixture', id: f.id }));
  }
  return blueprint.furniture
    .filter((f) => f.kind === kindFilter)
    .map((f) => ({ kind: f.kind as LayoutSelectableKind, id: f.id }));
}

/** Inverse la sélection courante sur l'ensemble des éléments du plan. */
export function invertSelection(
  blueprint: RoomLayoutBlueprint,
  current: LayoutSelectionItem[],
): LayoutSelectionItem[] {
  const all = selectAllItems(blueprint);
  const currentKeys = new Set(current.map(selectionKey));
  return all.filter((item) => !currentKeys.has(selectionKey(item)));
}

/** Sélectionne tous les éléments intersectant un rectangle tracé sur le canvas (% 0–100). */
export function selectItemsInRect(
  blueprint: RoomLayoutBlueprint,
  rect: { x: number; y: number; w: number; h: number },
): LayoutSelectionItem[] {
  const minX = Math.min(rect.x, rect.x + rect.w);
  const maxX = Math.max(rect.x, rect.x + rect.w);
  const minY = Math.min(rect.y, rect.y + rect.h);
  const maxY = Math.max(rect.y, rect.y + rect.h);

  // Surface minimale pour éviter les clics stationnaires
  if (maxX - minX < 0.5 && maxY - minY < 0.5) return [];

  const all = selectAllItems(blueprint);
  const hits: LayoutSelectionItem[] = [];

  for (const item of all) {
    const box = getSelectionBounds(blueprint, item);
    if (!box) continue;
    const boxL = box.isCenter ? box.x - box.w / 2 : box.x;
    const boxR = box.isCenter ? box.x + box.w / 2 : box.x + box.w;
    const boxT = box.isCenter ? box.y - box.h / 2 : box.y;
    const boxB = box.isCenter ? box.y + box.h / 2 : box.y + box.h;

    const noOverlap = boxR < minX || boxL > maxX || boxB < minY || boxT > maxY;
    if (!noOverlap) {
      hits.push(item);
    }
  }

  return hits;
}

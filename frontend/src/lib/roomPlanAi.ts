import { api } from '@/lib/api';
import { applyServerAllowance, getOrCreateDeviceId, type AiAllowance } from '@/lib/aiTokens';
import type { RoomEditorCapabilities } from '@/lib/roomEditorAccess';
import type { LayoutSelectionItem } from '@/lib/roomSelectionUtils';
import {
  createBlueprintChair,
  createBlueprintFixture,
  createBlueprintRow,
  createBlueprintTable,
  createBlueprintZone,
  createWallOpening,
  createWallSegment,
  defaultRoomOutline,
  ensureBlueprintDefaults,
  refreshBlueprintMetadata,
  wallsFromRoomOutline,
  type ChairType,
  type RoomLayoutBlueprint,
  type RoomOutlineShape,
  type TableShape,
  type ZoneKind,
} from '@/lib/roomLayoutUtils';

export const AI_ROOM_PLAN_TOKEN_COST = 3;
export const AI_ROOM_IMPORT_GROUP_ID = 'ai-import';

export type RoomPlanVisionView = 'top' | 'perspective' | 'unclear';

export type RoomPlanVisionItemKind =
  | 'table'
  | 'row'
  | 'chair'
  | 'zone'
  | 'stage'
  | 'podium'
  | 'aisle'
  | 'door'
  | 'entrance'
  | 'carpet'
  | 'buffet'
  | 'column'
  | 'stairs'
  | 'balcony'
  | 'chandelier'
  | 'flower';

export interface RoomPlanVisionItem {
  kind: RoomPlanVisionItemKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  seats?: number;
  shape?: string;
  label?: string;
  zoneKind?: string;
}

export interface RoomPlanVisionDraft {
  view: RoomPlanVisionView;
  canvas: { widthM: number; heightM: number };
  outline: { shape: string; x: number; y: number; w: number; h: number };
  items: RoomPlanVisionItem[];
  walls: Array<{
    start: { x: number; y: number };
    end: { x: number; y: number };
    doors: number[];
    windows: number[];
  }>;
  confidence: number;
  warnings: string[];
}

export type RoomPlanAiResult = {
  draft: RoomPlanVisionDraft;
  remaining?: number;
  allowance?: Partial<AiAllowance>;
  tokenCost?: number;
};

const FIXTURE_KINDS = new Set<RoomLayoutBlueprint['fixtures'][number]['kind']>([
  'stage',
  'podium',
  'aisle',
  'door',
  'entrance',
  'carpet',
  'buffet',
  'column',
  'stairs',
  'balcony',
  'chandelier',
  'flower',
]);

const OUTLINE_SHAPES = new Set<RoomOutlineShape>([
  'rectangle',
  'square',
  'circle',
  'ellipse',
  'lShape',
  'uShape',
  'hexagon',
  'octagon',
  'trapezoid',
  'stadium',
]);

function defaultChairType(roomType: RoomLayoutBlueprint['roomType']): ChairType {
  return roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
}

function asTableShape(value: string | undefined, allowed: TableShape[]): TableShape {
  if (value && (allowed as string[]).includes(value)) return value as TableShape;
  return allowed[0] ?? 'round';
}

export async function analyzeRoomPlanFromPhoto(input: {
  imageUrl: string;
  roomType: RoomLayoutBlueprint['roomType'];
  widthM: number;
  heightM: number;
  brief?: string;
}): Promise<RoomPlanAiResult> {
  const deviceId = getOrCreateDeviceId();
  const data = await api.post('/rooms/ai/from-photo', {
    deviceId,
    imageUrl: input.imageUrl,
    roomType: input.roomType,
    widthM: input.widthM,
    heightM: input.heightM,
    brief: input.brief,
  });
  if (data?.allowance) applyServerAllowance(data.allowance);
  return data as RoomPlanAiResult;
}

export function applyRoomPlanVisionDraft(
  current: RoomLayoutBlueprint,
  draft: RoomPlanVisionDraft,
  caps: RoomEditorCapabilities,
  options: { imageUrl?: string } = {},
): { blueprint: RoomLayoutBlueprint; warnings: string[]; selection: LayoutSelectionItem[] } {
  const warnings = [...(draft.warnings || [])];
  const chairType = defaultChairType(current.roomType);
  const storyId = current.metadata.activeStoryId;
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  const fixtures: RoomLayoutBlueprint['fixtures'] = [];
  const selection: LayoutSelectionItem[] = [];

  let tableCount = 0;
  let rowCount = 0;
  let zoneCount = 0;
  let chairCount = 0;

  for (const item of draft.items) {
    if (FIXTURE_KINDS.has(item.kind as RoomLayoutBlueprint['fixtures'][number]['kind'])) {
      const kind = item.kind as RoomLayoutBlueprint['fixtures'][number]['kind'];
      const allowed = caps.canFixtures && caps.fixtureKinds.includes(kind as RoomEditorCapabilities['fixtureKinds'][number]);
      if (!allowed && kind === 'carpet' && caps.canZones) {
        const zone = {
          ...createBlueprintZone(item.label || 'Moquette', zoneCount + 1, {
            zoneKind: 'carpet',
            w: item.w,
            h: item.h,
          }),
          x: item.x,
          y: item.y,
          rotation: item.rotation,
          groupId: AI_ROOM_IMPORT_GROUP_ID,
          storyId,
        };
        zoneCount += 1;
        furniture.push(zone);
        selection.push({ kind: 'zone', id: zone.id });
        continue;
      }
      if (!allowed) {
        warnings.push(`« ${item.label || kind} » ignoré — non inclus dans votre forfait.`);
        continue;
      }
      const created = createBlueprintFixture(kind);
      const fixture = {
        ...created,
        x: item.x,
        y: item.y,
        w: item.w ?? created.w,
        h: item.h ?? created.h,
        rotation: item.rotation,
        label: item.label || created.label,
        groupId: AI_ROOM_IMPORT_GROUP_ID,
        storyId,
      };
      fixtures.push(fixture);
      selection.push({ kind: 'fixture', id: fixture.id });
      continue;
    }

    if (item.kind === 'table') {
      if (tableCount >= caps.maxTables) {
        warnings.push(`Limite de ${caps.maxTables} tables (${caps.label}) — tables supplémentaires ignorées.`);
        continue;
      }
      tableCount += 1;
      const table = {
        ...createBlueprintTable(tableCount, {
          shape: asTableShape(item.shape, caps.tableShapes),
          capacity: item.seats ?? 8,
          chairType,
        }),
        name: item.label || `Table ${tableCount}`,
        x: item.x,
        y: item.y,
        rotation: item.rotation,
        groupId: AI_ROOM_IMPORT_GROUP_ID,
        storyId,
      };
      furniture.push(table);
      selection.push({ kind: 'table', id: table.id });
      continue;
    }

    if (item.kind === 'row') {
      if (!caps.canAddRows) {
        warnings.push('Les rangées ne sont pas incluses dans votre forfait.');
        continue;
      }
      if (rowCount >= caps.maxRows) {
        warnings.push(`Limite de ${caps.maxRows} rangées (${caps.label}) — rangées supplémentaires ignorées.`);
        continue;
      }
      rowCount += 1;
      const row = {
        ...createBlueprintRow(rowCount, {
          seatCount: item.seats ?? 10,
          chairType,
          x: item.x,
          y: item.y,
          label: item.label,
          groupId: AI_ROOM_IMPORT_GROUP_ID,
        }),
        rotation: item.rotation,
        storyId,
      };
      furniture.push(row);
      selection.push({ kind: 'row', id: row.id });
      continue;
    }

    if (item.kind === 'chair') {
      chairCount += 1;
      const chair = {
        ...createBlueprintChair(chairCount, {
          chairType,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
        }),
        groupId: AI_ROOM_IMPORT_GROUP_ID,
        storyId,
      };
      furniture.push(chair);
      selection.push({ kind: 'chair', id: chair.id });
      continue;
    }

    if (item.kind === 'zone') {
      if (!caps.canZones) {
        warnings.push('Les zones (piste, VIP, buffet) ne sont pas incluses dans votre forfait.');
        continue;
      }
      zoneCount += 1;
      const zone = {
        ...createBlueprintZone(item.label || 'Zone', zoneCount, {
          zoneKind: (item.zoneKind as ZoneKind | undefined),
          w: item.w,
          h: item.h,
        }),
        x: item.x,
        y: item.y,
        rotation: item.rotation,
        groupId: AI_ROOM_IMPORT_GROUP_ID,
        storyId,
      };
      furniture.push(zone);
      selection.push({ kind: 'zone', id: zone.id });
    }
  }

  const outlineShape = OUTLINE_SHAPES.has(draft.outline.shape as RoomOutlineShape)
    ? draft.outline.shape as RoomOutlineShape
    : 'rectangle';
  const outline = caps.canChangeOutline
    ? {
      ...defaultRoomOutline(outlineShape),
      shape: outlineShape,
      x: draft.outline.x,
      y: draft.outline.y,
      w: draft.outline.w,
      h: draft.outline.h,
    }
    : (current.roomOutline ?? defaultRoomOutline('rectangle'));

  let walls = current.walls;
  if (draft.walls.length > 0) {
    walls = draft.walls.map((wall) => {
      const segment = createWallSegment({
        start: wall.start,
        end: wall.end,
        openings: [
          ...wall.doors.map((t) => createWallOpening('door', { t, style: 'double' })),
          ...wall.windows.map((t) => createWallOpening('window', { t })),
        ],
      });
      return { ...segment, storyId };
    });
    walls.forEach((wall) => selection.push({ kind: 'wall', id: wall.id }));
  } else if (caps.canChangeOutline) {
    walls = wallsFromRoomOutline(outline, { withEntrance: true }).map((wall) => ({ ...wall, storyId }));
  }

  const next = ensureBlueprintDefaults({
    ...current,
    roomOutline: outline,
    walls,
    furniture,
    fixtures,
    canvas: current.canvas,
    metadata: {
      ...current.metadata,
      floorImageUrl: options.imageUrl || current.metadata.floorImageUrl,
      floorType: options.imageUrl || current.metadata.floorImageUrl ? 'custom' : current.metadata.floorType,
      floorImageFit: options.imageUrl || current.metadata.floorImageUrl ? 'cover' : current.metadata.floorImageFit,
    },
  });

  return {
    blueprint: refreshBlueprintMetadata(next),
    warnings: warnings.filter((item, index, all) => all.indexOf(item) === index),
    selection,
  };
}

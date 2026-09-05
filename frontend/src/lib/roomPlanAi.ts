import { api } from '@/lib/api';
import { applyServerAllowance, getOrCreateDeviceId, AI_ROOM_PLAN_TOKEN_COST, type AiAllowance } from '@/lib/aiTokens';
import type { RoomEditorCapabilities } from '@/lib/roomEditorAccess';
import type { LayoutSelectionItem } from '@/lib/roomSelectionUtils';
import type { FloorType } from '@/lib/roomThemeUtils';
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
  type AisleStyle,
  type ChairStyle,
  type ChairType,
  type RoomLayoutBlueprint,
  type RoomOutlineShape,
  type SeatMaterial,
  type TableShape,
  type TableSurfaceStyle,
  type WallTextureStyle,
  type ZoneKind,
  type ZoneMaterial,
} from '@/lib/roomLayoutUtils';

export { AI_ROOM_PLAN_TOKEN_COST };
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
  color?: string;
  surface?: string;
  material?: string;
  chairStyle?: string;
  seatMaterial?: string;
  aisleStyle?: string;
  anchor?: 'box' | 'center';
}

export interface RoomPlanVisionAppearance {
  imageRole: 'plan' | 'photo' | 'texture';
  floorType?: string;
  floorColor?: string;
  wallTexture?: string;
  wallColor?: string;
  tableSurface?: string;
  tableColor?: string;
}

export interface RoomPlanVisionDraft {
  view: RoomPlanVisionView;
  canvas: { widthM: number; heightM: number };
  outline: { shape: string; x: number; y: number; w: number; h: number };
  appearance?: RoomPlanVisionAppearance;
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

const TABLE_SURFACES = new Set<TableSurfaceStyle>([
  'wood', 'linen', 'walnut', 'marble', 'darkWood', 'whiteLacquer', 'glass',
]);
const ZONE_MATERIALS = new Set<ZoneMaterial>([
  'wood', 'carpet', 'vinyl', 'led', 'marble', 'concrete', 'parquet', 'epoxy',
]);
const WALL_TEXTURES = new Set<WallTextureStyle>([
  'plaster', 'brick', 'wood', 'concrete', 'wallpaper', 'stone',
  'tadelakt', 'travertine', 'metroTile', 'woodPanel',
]);
const CHAIR_STYLES = new Set<ChairStyle>([
  'classic', 'chiavari', 'napoleon', 'ghost', 'lounge', 'crossback',
]);
const SEAT_MATERIALS = new Set<SeatMaterial>([
  'velvet', 'wood', 'fabric', 'leather', 'plastic', 'linen',
]);
const AISLE_STYLES = new Set<AisleStyle>([
  'royalRed', 'whiteMirror', 'botanicalRunner', 'rusticWood', 'damaskGold', 'ledRunway', 'blackVelvet',
]);

const FLOOR_ALIASES: Record<string, FloorType> = {
  parquet: 'parquet',
  wood: 'bois',
  bois: 'bois',
  marble: 'marbre',
  marbre: 'marbre',
  carpet: 'moquette',
  moquette: 'moquette',
  tile: 'carrelage',
  carrelage: 'carrelage',
  concrete: 'beton',
  beton: 'beton',
  grass: 'herbe',
  herbe: 'herbe',
  checker: 'damier',
  damier: 'damier',
  terrazzo: 'terrazzo',
  sand: 'sable',
  sable: 'sable',
  brick: 'brique',
  brique: 'brique',
  stone: 'pierre',
  pierre: 'pierre',
  epoxy: 'epoxy',
};

const DEFAULT_FOOTPRINT: Record<string, { w: number; h: number }> = {
  table: { w: 10, h: 10 },
  row: { w: 28, h: 6 },
  chair: { w: 3, h: 3 },
  zone: { w: 26, h: 16 },
};

function clampPct(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value * 10) / 10));
}

function asTableSurface(value: string | undefined): TableSurfaceStyle | undefined {
  return value && TABLE_SURFACES.has(value as TableSurfaceStyle) ? value as TableSurfaceStyle : undefined;
}

function asZoneMaterial(value: string | undefined): ZoneMaterial | undefined {
  return value && ZONE_MATERIALS.has(value as ZoneMaterial) ? value as ZoneMaterial : undefined;
}

function asWallTexture(value: string | undefined): WallTextureStyle | undefined {
  return value && WALL_TEXTURES.has(value as WallTextureStyle) ? value as WallTextureStyle : undefined;
}

function asChairStyle(value: string | undefined): ChairStyle | undefined {
  return value && CHAIR_STYLES.has(value as ChairStyle) ? value as ChairStyle : undefined;
}

function asSeatMaterial(value: string | undefined): SeatMaterial | undefined {
  return value && SEAT_MATERIALS.has(value as SeatMaterial) ? value as SeatMaterial : undefined;
}

function asAisleStyle(value: string | undefined): AisleStyle | undefined {
  return value && AISLE_STYLES.has(value as AisleStyle) ? value as AisleStyle : undefined;
}

function asFloorType(value: string | undefined): FloorType | undefined {
  if (!value) return undefined;
  return FLOOR_ALIASES[value] ?? FLOOR_ALIASES[value.toLowerCase()];
}

function looksGold(color?: string): boolean {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 150 && g > 110 && b < 120 && r - b > 40;
}

function looksRed(color?: string): boolean {
  if (!color) return false;
  const hex = color.replace('#', '');
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 110 && r > g + 30 && r > b + 30;
}

/** Empreinte : l’IA envoie le coin haut-gauche (box), l’éditeur tables/chaises/rangées utilise le centre. */
export function itemFootprint(
  item: Pick<RoomPlanVisionItem, 'x' | 'y' | 'w' | 'h' | 'anchor'>,
  fallback: { w: number; h: number },
): { x: number; y: number; cx: number; cy: number; w: number; h: number } {
  const w = item.w ?? fallback.w;
  const h = item.h ?? fallback.h;
  if (item.anchor === 'center') {
    return {
      x: clampPct(item.x - w / 2),
      y: clampPct(item.y - h / 2),
      cx: clampPct(item.x),
      cy: clampPct(item.y),
      w,
      h,
    };
  }
  return {
    x: clampPct(item.x),
    y: clampPct(item.y),
    cx: clampPct(item.x + w / 2),
    cy: clampPct(item.y + h / 2),
    w,
    h,
  };
}

function defaultChairType(roomType: RoomLayoutBlueprint['roomType']): ChairType {
  return roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET';
}

function asTableShape(value: string | undefined, allowed: TableShape[]): TableShape {
  if (value && (allowed as string[]).includes(value)) return value as TableShape;
  return allowed[0] ?? 'round';
}

function resolveImageRole(draft: RoomPlanVisionDraft): RoomPlanVisionAppearance['imageRole'] {
  if (draft.appearance?.imageRole) return draft.appearance.imageRole;
  return draft.view === 'top' ? 'plan' : 'photo';
}

function neutralizeAisle(
  fixture: RoomLayoutBlueprint['fixtures'][number],
  item: RoomPlanVisionItem,
): RoomLayoutBlueprint['fixtures'][number] {
  const style = asAisleStyle(item.aisleStyle);
  const color = item.color;
  const inferred = style
    ?? (looksRed(color) ? 'royalRed' : looksGold(color) ? 'damaskGold' : undefined);
  return {
    ...fixture,
    aisleStyle: inferred,
    color: color ?? (inferred === 'royalRed' ? '#991b1b' : inferred === 'damaskGold' ? '#c4a06a' : '#78716c'),
    material: asZoneMaterial(item.material) ?? 'carpet',
    hasGoldBorder: inferred === 'damaskGold' || looksGold(color),
    hasSideLanterns: false,
    hasPetals: false,
  };
}

function applyFixtureLook(
  created: RoomLayoutBlueprint['fixtures'][number],
  item: RoomPlanVisionItem,
): RoomLayoutBlueprint['fixtures'][number] {
  const material = asZoneMaterial(item.material);
  let next: RoomLayoutBlueprint['fixtures'][number] = {
    ...created,
    color: item.color ?? created.color,
    material: material ?? created.material,
  };
  if (item.kind === 'aisle') {
    next = neutralizeAisle(next, item);
  }
  if (item.kind === 'flower' && item.color) {
    next = { ...next, flowerColor: item.color };
  }
  if (item.kind === 'chandelier' && item.color && !looksGold(item.color)) {
    next = { ...next, lightWarmth: 'neutral', color: item.color };
  }
  if ((item.kind === 'door' || item.kind === 'entrance') && !item.color) {
    next = { ...next, hasMat: false, matColor: undefined };
  }
  return next;
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
  const appearance = draft.appearance;
  const chairType = defaultChairType(current.roomType);
  const storyId = current.metadata.activeStoryId;
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  const fixtures: RoomLayoutBlueprint['fixtures'] = [];
  const selection: LayoutSelectionItem[] = [];
  const defaultSurface = asTableSurface(appearance?.tableSurface);
  const defaultTableColor = appearance?.tableColor;

  let tableCount = 0;
  let rowCount = 0;
  let zoneCount = 0;
  let chairCount = 0;

  for (const item of draft.items) {
    if (FIXTURE_KINDS.has(item.kind as RoomLayoutBlueprint['fixtures'][number]['kind'])) {
      const kind = item.kind as RoomLayoutBlueprint['fixtures'][number]['kind'];
      const allowed = caps.canFixtures && caps.fixtureKinds.includes(kind as RoomEditorCapabilities['fixtureKinds'][number]);
      if (!allowed && kind === 'carpet' && caps.canZones) {
        const box = itemFootprint(item, DEFAULT_FOOTPRINT.zone);
        const zone = {
          ...createBlueprintZone(item.label || 'Moquette', zoneCount + 1, {
            zoneKind: 'carpet',
            material: asZoneMaterial(item.material) ?? 'carpet',
            color: item.color,
            w: box.w,
            h: box.h,
          }),
          x: box.x,
          y: box.y,
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
      const created = applyFixtureLook(createBlueprintFixture(kind), item);
      const box = itemFootprint(item, { w: created.w, h: created.h });
      const fixture = {
        ...created,
        x: box.x,
        y: box.y,
        w: box.w,
        h: box.h,
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
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.table);
      const table = {
        ...createBlueprintTable(tableCount, {
          shape: asTableShape(item.shape, caps.tableShapes),
          capacity: item.seats ?? 8,
          chairType,
        }),
        name: item.label || `Table ${tableCount}`,
        x: box.cx,
        y: box.cy,
        rotation: item.rotation,
        tableColor: item.color ?? defaultTableColor,
        tableSurface: asTableSurface(item.surface) ?? defaultSurface,
        ...(asChairStyle(item.chairStyle) ? { chairStyle: asChairStyle(item.chairStyle) } : {}),
        ...(asSeatMaterial(item.seatMaterial) ? { seatMaterial: asSeatMaterial(item.seatMaterial) } : {}),
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
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.row);
      const row = {
        ...createBlueprintRow(rowCount, {
          seatCount: item.seats ?? 10,
          chairType,
          x: box.cx,
          y: box.cy,
          label: item.label,
          groupId: AI_ROOM_IMPORT_GROUP_ID,
        }),
        rotation: item.rotation,
        ...(asChairStyle(item.chairStyle) ? { chairStyle: asChairStyle(item.chairStyle) } : {}),
        ...(asSeatMaterial(item.seatMaterial) ? { seatMaterial: asSeatMaterial(item.seatMaterial) } : {}),
        storyId,
      };
      furniture.push(row);
      selection.push({ kind: 'row', id: row.id });
      continue;
    }

    if (item.kind === 'chair') {
      chairCount += 1;
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.chair);
      const chair = {
        ...createBlueprintChair(chairCount, {
          chairType,
          x: box.cx,
          y: box.cy,
          rotation: item.rotation,
        }),
        ...(asChairStyle(item.chairStyle) ? { chairStyle: asChairStyle(item.chairStyle) } : {}),
        ...(asSeatMaterial(item.seatMaterial) ? { seatMaterial: asSeatMaterial(item.seatMaterial) } : {}),
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
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.zone);
      const zone = {
        ...createBlueprintZone(item.label || 'Zone', zoneCount, {
          zoneKind: (item.zoneKind as ZoneKind | undefined),
          material: asZoneMaterial(item.material),
          color: item.color,
          w: box.w,
          h: box.h,
        }),
        x: box.x,
        y: box.y,
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

  const wallTexture = asWallTexture(appearance?.wallTexture);
  const wallColor = appearance?.wallColor;
  const existingWalls = current.walls ?? [];
  let walls = existingWalls;
  if (draft.walls.length > 0) {
    walls = draft.walls.map((wall) => {
      const segment = createWallSegment({
        start: wall.start,
        end: wall.end,
        texture: wallTexture ?? existingWalls[0]?.texture ?? 'plaster',
        color: wallColor,
        openings: [
          ...wall.doors.map((t) => createWallOpening('door', { t, style: 'double' })),
          ...wall.windows.map((t) => createWallOpening('window', { t })),
        ],
      });
      return { ...segment, storyId };
    });
    walls.forEach((wall) => selection.push({ kind: 'wall', id: wall.id }));
  } else if (caps.canChangeOutline) {
    walls = wallsFromRoomOutline(outline, {
      withEntrance: false,
      texture: wallTexture ?? existingWalls[0]?.texture ?? 'plaster',
    }).map((wall) => ({ ...wall, color: wallColor, storyId }));
    warnings.push('Aucun mur visible sur la photo — contour sans porte ni fenêtre inventées.');
  } else if (wallTexture || wallColor) {
    walls = existingWalls.map((wall) => ({
      ...wall,
      texture: wallTexture ?? wall.texture,
      color: wallColor ?? wall.color,
    }));
  }

  const imageRole = resolveImageRole(draft);
  const observedFloor = asFloorType(appearance?.floorType);
  const usePlanCover = Boolean(options.imageUrl) && imageRole === 'plan' && draft.view !== 'perspective';
  const useFloorTile = Boolean(options.imageUrl) && imageRole === 'texture';

  if (draft.view === 'perspective' || imageRole === 'photo') {
    warnings.push('Photo en perspective : le sol reprend la matière et la couleur vues, sans étirer l’image.');
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
      defaultTableColor: defaultTableColor ?? current.metadata.defaultTableColor,
      defaultTableSurface: defaultSurface ?? current.metadata.defaultTableSurface,
      wallPaintColor: wallColor ?? current.metadata.wallPaintColor,
      floorColor: appearance?.floorColor ?? current.metadata.floorColor,
      floorImageUrl: usePlanCover || useFloorTile
        ? options.imageUrl
        : imageRole === 'photo'
          ? undefined
          : current.metadata.floorImageUrl,
      floorType: usePlanCover || useFloorTile
        ? 'custom'
        : observedFloor ?? current.metadata.floorType,
      floorImageFit: usePlanCover ? 'cover' : useFloorTile ? 'tile' : current.metadata.floorImageFit,
    },
  });

  return {
    blueprint: refreshBlueprintMetadata(next),
    warnings: warnings.filter((item, index, all) => all.indexOf(item) === index),
    selection,
  };
}

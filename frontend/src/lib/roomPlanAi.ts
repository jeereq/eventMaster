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

export const ROOM_PLAN_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp';
export const ROOM_PLAN_PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const ROOM_PLAN_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ROOM_PLAN_PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

/** `null` si le fichier peut être envoyé à la lecture IA. */
export function roomPlanPhotoError(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const typeOk = ROOM_PLAN_PHOTO_TYPES.has(file.type) || ROOM_PLAN_PHOTO_EXTS.has(ext);
  if (!typeOk) {
    return 'Utilisez une photo JPEG, PNG ou WebP. Les fichiers HEIC ne sont pas lus.';
  }
  if (file.size > ROOM_PLAN_PHOTO_MAX_BYTES) {
    return `« ${file.name} » dépasse 10 Mo. Compressez l’image ou choisissez-en une autre.`;
  }
  return null;
}

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
  | 'flower'
  | 'arch'
  | 'partition'
  | 'decal'
  | 'pedestal'
  | 'stringLight'
  | 'fountain'
  | 'gazebo'
  | 'djBooth'
  | 'screen';

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
  hasCenterpiece?: boolean;
  hasPetals?: boolean;
  hasSideLanterns?: boolean;
  stageShape?: string;
  decalKind?: string;
  pedestalStyle?: string;
  anchor?: 'box' | 'center';
}

export interface RoomPlanVisionAppearance {
  imageRole: 'plan' | 'photo' | 'texture';
  floorType?: string;
  floorColor?: string;
  wallTexture?: string;
  wallColor?: string;
  tableSurface?: string;
  roofStyle?: string;
  tableColor?: string;
  curtainColor?: string;
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
  'arch',
  'partition',
  'decal',
  'pedestal',
  'stringLight',
  'fountain',
  'gazebo',
  'djBooth',
  'screen',
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
  'wood', 'carpet', 'vinyl', 'led', 'marble', 'concrete', 'parquet', 'epoxy', 'grass', 'gravel', 'brick',
]);
const WALL_TEXTURES = new Set<WallTextureStyle>([
  'plaster', 'brick', 'wood', 'concrete', 'wallpaper', 'stone',
  'tadelakt', 'travertine', 'metroTile', 'woodPanel',
]);
const CHAIR_STYLES = new Set<ChairStyle>([
  'classic', 'chiavari', 'napoleon', 'ghost', 'lounge', 'crossback', 'louis', 'ovalBack',
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
  gravel: 'gravier',
  gravier: 'gravier',
  gravierFonce: 'gravierFonce',
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

const VISION_KIND_ALIASES: Record<string, RoomPlanVisionItemKind> = {
  tables: 'table',
  chairs: 'row',
  rangee: 'row',
  rangees: 'row',
  banquettes: 'row',
  amphitheater: 'row',
  amphitheatre: 'row',
  dancefloor: 'zone',
  dance: 'zone',
  piste: 'zone',
  dj: 'djBooth',
  lights: 'stringLight',
  lighting: 'stringLight',
  guirlandes: 'stringLight',
  scene: 'stage',
  allee: 'aisle',
  porte: 'door',
  entree: 'entrance',
  ecran: 'screen',
  fontaine: 'fountain',
  lustre: 'chandelier',
};

const ZONE_KIND_ALIASES: Record<string, ZoneKind> = {
  dance: 'dance',
  dancefloor: 'dance',
  piste: 'dance',
  vip: 'vip',
  lounge: 'vip',
  buffet: 'buffet',
  carpet: 'carpet',
  tapis: 'carpet',
  moquette: 'carpet',
  custom: 'custom',
};

const ZONE_FALLBACK_FIXTURES = new Set<RoomPlanVisionItemKind>([
  'stage',
  'podium',
  'carpet',
  'buffet',
  'arch',
  'partition',
  'decal',
  'fountain',
  'gazebo',
  'djBooth',
  'screen',
  'flower',
  'pedestal',
]);

const CANVAS_MIN_M = 5;
const CANVAS_MAX_M = 80;

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

function aliasKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function resolveImportedKind(item: RoomPlanVisionItem): RoomPlanVisionItemKind {
  if (FIXTURE_KINDS.has(item.kind as RoomLayoutBlueprint['fixtures'][number]['kind'])) return item.kind;
  if (item.kind === 'table' || item.kind === 'row' || item.kind === 'chair' || item.kind === 'zone') {
    return item.kind;
  }
  return VISION_KIND_ALIASES[aliasKey(item.kind)] ?? item.kind;
}

function resolveZoneKind(item: RoomPlanVisionItem, fallback?: ZoneKind): ZoneKind | undefined {
  if (item.zoneKind && ZONE_KIND_ALIASES[aliasKey(item.zoneKind)]) {
    return ZONE_KIND_ALIASES[aliasKey(item.zoneKind)];
  }
  const fromKind = ZONE_KIND_ALIASES[aliasKey(item.kind)];
  if (fromKind) return fromKind;
  return fallback;
}

function inferTableCapacity(item: RoomPlanVisionItem, shape: TableShape): number {
  if (item.seats != null) return Math.max(2, Math.min(16, Math.round(item.seats)));
  if (shape === 'cocktail' || shape === 'highTop') return 2;
  const span = Math.max(item.w ?? 10, item.h ?? 10);
  if (span <= 6) return 4;
  if (span <= 11) return 8;
  if (span <= 14) return 10;
  return 12;
}

function inferRowSeatCount(item: RoomPlanVisionItem): number {
  if (item.seats != null) return Math.max(2, Math.min(40, Math.round(item.seats)));
  if (item.w == null) return 10;
  return Math.max(4, Math.min(40, Math.round(item.w / 2.4)));
}

function inferTableShape(item: RoomPlanVisionItem, allowed: TableShape[]): TableShape {
  if (item.shape) return asTableShape(item.shape, allowed);
  const w = item.w ?? 10;
  const h = item.h ?? 10;
  const ratio = w / Math.max(h, 0.1);
  if (ratio > 1.45 || ratio < 0.7) return asTableShape('rectangular', allowed);
  return allowed[0] ?? 'round';
}

function applyDraftCanvas(
  current: RoomLayoutBlueprint['canvas'],
  draft: RoomPlanVisionDraft,
): RoomLayoutBlueprint['canvas'] {
  const widthM = Number.isFinite(draft.canvas?.widthM) ? draft.canvas.widthM : current.widthM;
  const heightM = Number.isFinite(draft.canvas?.heightM) ? draft.canvas.heightM : current.heightM;
  return {
    widthM: Math.min(CANVAS_MAX_M, Math.max(CANVAS_MIN_M, widthM)),
    heightM: Math.min(CANVAS_MAX_M, Math.max(CANVAS_MIN_M, heightM)),
  };
}

function fixtureAsZoneLabel(kind: RoomPlanVisionItemKind, label?: string): string {
  if (label) return label;
  const names: Partial<Record<RoomPlanVisionItemKind, string>> = {
    stage: 'Scène',
    podium: 'Podium',
    carpet: 'Moquette',
    buffet: 'Buffet',
    arch: 'Arche',
    partition: 'Cloison',
    decal: 'Motif au sol',
    fountain: 'Fontaine',
    gazebo: 'Gloriette',
    djBooth: 'Régie DJ',
    screen: 'Écran',
    flower: 'Fleurs',
    pedestal: 'Piédestal',
  };
  return names[kind] ?? 'Zone';
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
    hasSideLanterns: item.hasSideLanterns === true,
    hasPetals: item.hasPetals === true,
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
  if ((item.kind === 'flower' || item.kind === 'arch' || item.kind === 'pedestal') && item.color) {
    next = { ...next, flowerColor: item.color };
  }
  if (item.kind === 'decal') {
    next = {
      ...next,
      decalKind: item.decalKind === 'butterfly' || item.decalKind === 'custom' ? item.decalKind : 'rose',
    };
  }
  if (item.kind === 'pedestal') {
    next = {
      ...next,
      pedestalStyle: item.pedestalStyle === 'columnGold' ? 'columnGold' : 'squareWhite',
    };
  }
  if ((item.kind === 'stage' || item.kind === 'podium') && (item.stageShape === 'semiCircle' || item.shape === 'semiCircle')) {
    next = { ...next, stageShape: 'semiCircle' };
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

  for (const rawItem of draft.items) {
    const kind = resolveImportedKind(rawItem);
    const item = kind === rawItem.kind ? rawItem : { ...rawItem, kind };
    if (FIXTURE_KINDS.has(kind as RoomLayoutBlueprint['fixtures'][number]['kind'])) {
      const fixtureKind = kind as RoomLayoutBlueprint['fixtures'][number]['kind'];
      const allowed = caps.canFixtures && caps.fixtureKinds.includes(fixtureKind as RoomEditorCapabilities['fixtureKinds'][number]);
      if (!allowed && caps.canZones && ZONE_FALLBACK_FIXTURES.has(kind)) {
        const box = itemFootprint(item, DEFAULT_FOOTPRINT.zone);
        const zoneKind = resolveZoneKind(item, kind === 'carpet' ? 'carpet' : kind === 'buffet' ? 'buffet' : 'custom');
        const zone = {
          ...createBlueprintZone(fixtureAsZoneLabel(kind, item.label), zoneCount + 1, {
            zoneKind,
            material: asZoneMaterial(item.material) ?? (zoneKind === 'carpet' ? 'carpet' : undefined),
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
        warnings.push(`« ${zone.label} » importé comme zone — élément hors forfait décor.`);
        continue;
      }
      if (!allowed) {
        warnings.push(`« ${item.label || kind} » ignoré — non inclus dans votre forfait.`);
        continue;
      }
      const created = applyFixtureLook(createBlueprintFixture(fixtureKind), item);
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

    if (kind === 'table') {
      if (tableCount >= caps.maxTables) {
        warnings.push(`Limite de ${caps.maxTables} tables (${caps.label}) — tables supplémentaires ignorées.`);
        continue;
      }
      tableCount += 1;
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.table);
      const shape = inferTableShape(item, caps.tableShapes);
      const table = {
        ...createBlueprintTable(tableCount, {
          shape,
          capacity: inferTableCapacity(item, shape),
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
        hasCenterpiece: item.hasCenterpiece === true,
        groupId: AI_ROOM_IMPORT_GROUP_ID,
        storyId,
      };
      furniture.push(table);
      selection.push({ kind: 'table', id: table.id });
      continue;
    }

    if (kind === 'row') {
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
          seatCount: inferRowSeatCount(item),
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

    if (kind === 'chair') {
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

    if (kind === 'zone') {
      if (!caps.canZones) {
        warnings.push('Les zones (piste, VIP, buffet) ne sont pas incluses dans votre forfait.');
        continue;
      }
      zoneCount += 1;
      const box = itemFootprint(item, DEFAULT_FOOTPRINT.zone);
      const zone = {
        ...createBlueprintZone(item.label || 'Zone', zoneCount, {
          zoneKind: resolveZoneKind(item),
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
    canvas: applyDraftCanvas(current.canvas, draft),
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
      roofStyle: appearance?.roofStyle === 'tentSwag' || appearance?.roofStyle === 'gabled' || appearance?.roofStyle === 'coffered'
        ? appearance.roofStyle
        : current.metadata.roofStyle,
      showRoof: appearance?.roofStyle === 'tentSwag' || appearance?.roofStyle === 'gabled' || appearance?.roofStyle === 'coffered'
        ? true
        : current.metadata.showRoof,
      curtainColor: appearance?.curtainColor ?? current.metadata.curtainColor,
      showCurtains: appearance?.curtainColor ? true : current.metadata.showCurtains,
    },
  });

  return {
    blueprint: refreshBlueprintMetadata(next),
    warnings: warnings.filter((item, index, all) => all.indexOf(item) === index),
    selection,
  };
}

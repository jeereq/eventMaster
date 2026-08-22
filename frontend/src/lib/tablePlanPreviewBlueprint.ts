import {
  ensureBlueprintDefaults,
  type ChairType,
  type RoomLayoutBlueprint,
  type RoomType,
  type TableShape,
} from '@/lib/roomLayoutUtils';

export type TablePlanPreviewTable = {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  locked?: boolean;
  chairType?: string;
  tableColor?: string;
  rotation?: number;
  sourceFurnitureId?: string;
};

export type TablePlanPreviewInput = {
  roomOutline?: RoomLayoutBlueprint['roomOutline'];
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  floorColor?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  defaultTableColor?: string | null;
  sourceRoomType?: string | null;
  lightingPreset?: RoomLayoutBlueprint['metadata']['lightingPreset'] | null;
  fixtures?: unknown;
  renderQuality?: RoomLayoutBlueprint['metadata']['renderQuality'] | null;
};

function tablesToFurniture(tables: TablePlanPreviewTable[]) {
  return tables.map((table) => ({
    id: table.id,
    kind: 'table' as const,
    name: table.name,
    shape: table.shape,
    capacity: table.capacity,
    chairType: (table.chairType as ChairType) || 'BANQUET',
    tableColor: table.tableColor,
    x: table.x,
    y: table.y,
    locked: table.locked,
    rotation: table.rotation,
  }));
}

function estimateCanvasM(
  tables: TablePlanPreviewTable[],
  outline?: RoomLayoutBlueprint['roomOutline'],
) {
  if (outline) {
    return {
      widthM: Math.max(12, Math.round(outline.w * 0.24)),
      heightM: Math.max(10, Math.round(outline.h * 0.24)),
    };
  }
  if (tables.length === 0) {
    return { widthM: 20, heightM: 15 };
  }
  const maxX = Math.max(...tables.map((t) => t.x + 8), 88);
  const maxY = Math.max(...tables.map((t) => t.y + 8), 88);
  return {
    widthM: Math.max(12, Math.round(maxX * 0.22)),
    heightM: Math.max(10, Math.round(maxY * 0.22)),
  };
}

function metadataFromPlan(
  tablePlan: TablePlanPreviewInput | null | undefined,
  tables: TablePlanPreviewTable[],
) {
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  return {
    tableCount: tables.length,
    totalSeats,
    defaultTableColor: tablePlan?.defaultTableColor ?? '#ffffff',
    roomThemeId: tablePlan?.roomThemeId ?? undefined,
    floorType: (tablePlan?.floorType as RoomLayoutBlueprint['metadata']['floorType']) ?? undefined,
    floorImageUrl: tablePlan?.floorImageUrl ?? undefined,
    floorColor: tablePlan?.floorColor ?? undefined,
    depthAmount: tablePlan?.depthAmount ?? (tablePlan?.depthView ? 55 : 0),
    depthView: Boolean(tablePlan?.depthView || (tablePlan?.depthAmount ?? 0) > 0),
    lightingPreset: tablePlan?.lightingPreset ?? undefined,
    renderQuality: tablePlan?.renderQuality ?? undefined,
  };
}

/** Construit un blueprint WebGL à partir du plan de table courant (+ blueprint salle si dispo). */
export function buildTablePlanPreviewBlueprint(
  tablePlan: TablePlanPreviewInput | null | undefined,
  tables: TablePlanPreviewTable[],
  roomBlueprint?: RoomLayoutBlueprint | null,
): RoomLayoutBlueprint | null {
  const planFixtures = Array.isArray(tablePlan?.fixtures)
    ? (tablePlan.fixtures as RoomLayoutBlueprint['fixtures'])
    : undefined;

  if (tables.length === 0 && !roomBlueprint?.furniture?.length && (!planFixtures || planFixtures.length === 0)) {
    return null;
  }

  const furniture = tablesToFurniture(tables);
  const meta = metadataFromPlan(tablePlan, tables);

  if (roomBlueprint) {
    const base = ensureBlueprintDefaults(structuredClone(roomBlueprint));
    return ensureBlueprintDefaults({
      ...base,
      fixtures: planFixtures ?? base.fixtures,
      furniture: furniture.length > 0 ? furniture : base.furniture,
      metadata: {
        ...base.metadata,
        ...meta,
        showChandeliers: base.metadata.showChandeliers ?? true,
        showUplights: base.metadata.showUplights ?? true,
        showDecorPlants: base.metadata.showDecorPlants ?? true,
        showRoof: base.metadata.showRoof ?? true,
        renderQuality: meta.renderQuality ?? base.metadata.renderQuality ?? 'showcase',
      },
    });
  }

  const roomType = (tablePlan?.sourceRoomType as RoomType | undefined) ?? 'BANQUET';
  const canvas = estimateCanvasM(tables, tablePlan?.roomOutline);

  return ensureBlueprintDefaults({
    version: 1,
    roomType,
    roomOutline: tablePlan?.roomOutline,
    canvas,
    fixtures: planFixtures ?? [],
    furniture,
    metadata: {
      ...meta,
      renderQuality: meta.renderQuality ?? 'standard',
    },
  });
}

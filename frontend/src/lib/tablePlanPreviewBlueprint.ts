import {
  ensureBlueprintDefaults,
  type ChairType,
  type RoomLayoutBlueprint,
  type RoomType,
  type TableShape,
} from '@/lib/roomLayoutUtils';
import type { PricingZone } from '@/lib/ticketPricing';
import { formatFc } from '@/config/landingPricing';

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
  pricingZoneId?: string;
  rowMeta?: { tier?: number; curve?: number; elevationM?: number };
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
  pricingZones?: PricingZone[];
};

function pricingZonesToFurniture(
  zones: PricingZone[] | undefined,
  tables: TablePlanPreviewTable[],
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'zone' }>[] {
  if (!zones || zones.length === 0) return [];
  const result: Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'zone' }>[] = [];

  for (const zone of zones) {
    let x = zone.x;
    let y = zone.y;
    let w = zone.w;
    let h = zone.h;

    // Si les bornes de la zone sont absentes, on les calcule à partir des tables assignées
    if (x == null || y == null || w == null || h == null) {
      const assigned = tables.filter((t) => t.pricingZoneId === zone.id);
      if (assigned.length > 0) {
        const xs = assigned.map((t) => t.x);
        const ys = assigned.map((t) => t.y);
        const minX = Math.max(2, Math.min(...xs) - 8);
        const maxX = Math.min(98, Math.max(...xs) + 8);
        const minY = Math.max(2, Math.min(...ys) - 7);
        const maxY = Math.min(98, Math.max(...ys) + 7);
        x = Math.round(minX);
        y = Math.round(minY);
        w = Math.round(maxX - minX);
        h = Math.round(maxY - minY);
      }
    }

    if (x != null && y != null && w != null && h != null) {
      const label = `${zone.name}${zone.priceFc > 0 ? ` · ${formatFc(zone.priceFc)}` : ''}`;
      result.push({
        id: `zone-mesh-${zone.id}`,
        kind: 'zone',
        label,
        color: zone.color || '#c4a35a',
        x,
        y,
        w,
        h,
      });
    }
  }

  return result;
}

function tablesToFurniture(
  tables: TablePlanPreviewTable[],
  zones?: PricingZone[],
  roomBlueprint?: RoomLayoutBlueprint | null,
): RoomLayoutBlueprint['furniture'] {
  const zoneColorMap = new Map<string, string>();
  if (zones) {
    for (const z of zones) {
      if (z.color) zoneColorMap.set(z.id, z.color);
    }
  }

  const existingRowMap = new Map<string, Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>>();
  if (roomBlueprint?.furniture) {
    for (const f of roomBlueprint.furniture) {
      if (f.kind === 'row') {
        existingRowMap.set(f.id, f);
      }
    }
  }

  return tables.map((table) => {
    const zoneColor = table.pricingZoneId ? zoneColorMap.get(table.pricingZoneId) : undefined;
    const effectiveTableColor =
      table.tableColor && table.tableColor !== '#ffffff' && table.tableColor !== '#f3e6c8'
        ? table.tableColor
        : (zoneColor || table.tableColor);

    // Si la table correspond à une rangée / gradin de la salle
    const existingRow = existingRowMap.get(table.id) || (table.sourceFurnitureId ? existingRowMap.get(table.sourceFurnitureId) : undefined);
    if (existingRow) {
      return {
        ...existingRow,
        id: table.id,
        x: table.x,
        y: table.y,
        rotation: table.rotation ?? existingRow.rotation,
        label: table.name || existingRow.label,
        seatCount: table.capacity || existingRow.seatCount,
      };
    }

    if (table.rowMeta) {
      return {
        id: table.id,
        kind: 'row' as const,
        label: table.name,
        rowName: table.name,
        seatCount: table.capacity,
        chairType: (table.chairType as ChairType) || 'THEATER',
        chairStyle: 'modern',
        seatMaterial: 'velvet',
        tier: table.rowMeta.tier ?? 0,
        x: table.x,
        y: table.y,
        curve: table.rowMeta.curve ?? 0,
        rotation: table.rotation ?? 0,
        elevationM: table.rowMeta.elevationM ?? (table.rowMeta.tier ? table.rowMeta.tier * 0.28 : 0),
        showSeatNumbers: true,
      };
    }

    return {
      id: table.id,
      kind: 'table' as const,
      name: table.name,
      shape: table.shape,
      capacity: table.capacity,
      chairType: (table.chairType as ChairType) || 'BANQUET',
      tableColor: effectiveTableColor,
      x: table.x,
      y: table.y,
      locked: table.locked,
      rotation: table.rotation,
    };
  });
}

function estimateCanvasM(
  tables: TablePlanPreviewTable[],
  outline?: RoomLayoutBlueprint['roomOutline'],
) {
  if (outline && Number.isFinite(outline.w) && Number.isFinite(outline.h)) {
    return {
      widthM: Math.max(12, Math.round(outline.w * 0.24)),
      heightM: Math.max(10, Math.round(outline.h * 0.24)),
    };
  }
  if (!tables || tables.length === 0) {
    return { widthM: 20, heightM: 15 };
  }
  const validXs = tables.map((t) => (Number.isFinite(t.x) ? t.x + 8 : 40));
  const validYs = tables.map((t) => (Number.isFinite(t.y) ? t.y + 8 : 40));
  const maxX = Math.max(...validXs, 88);
  const maxY = Math.max(...validYs, 88);
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
  pricingZonesOverride?: PricingZone[],
): RoomLayoutBlueprint | null {
  const planFixtures = Array.isArray(tablePlan?.fixtures)
    ? (tablePlan.fixtures as RoomLayoutBlueprint['fixtures'])
    : undefined;

  const resolvedZones = pricingZonesOverride ?? tablePlan?.pricingZones ?? [];

  if (tables.length === 0 && !roomBlueprint?.furniture?.length && (!planFixtures || planFixtures.length === 0)) {
    return null;
  }

  const zoneFurniture = pricingZonesToFurniture(resolvedZones, tables);
  const tableFurniture = tablesToFurniture(tables, resolvedZones, roomBlueprint);
  const meta = metadataFromPlan(tablePlan, tables);

  if (roomBlueprint) {
    let base: RoomLayoutBlueprint;
    try {
      base = ensureBlueprintDefaults(structuredClone(roomBlueprint));
    } catch {
      try {
        base = ensureBlueprintDefaults(JSON.parse(JSON.stringify(roomBlueprint)));
      } catch {
        base = ensureBlueprintDefaults({ ...roomBlueprint });
      }
    }
    // Conserver le mobilier décoratif non-table et non-rangée de la salle (bars, scène, podium, etc.)
    // Les rangées et tables sont déjà incluses et synchronisées dans tableFurniture
    const existingDecor = (base.furniture || []).filter((f) => f && f.kind !== 'table' && f.kind !== 'row' && f.kind !== 'zone');
    const combinedFurniture = [
      ...zoneFurniture,
      ...(tableFurniture.length > 0 ? tableFurniture : (base.furniture || []).filter((f) => f && (f.kind === 'table' || f.kind === 'row'))),
      ...existingDecor,
    ];

    return ensureBlueprintDefaults({
      ...base,
      fixtures: planFixtures ?? base.fixtures,
      furniture: combinedFurniture,
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
    furniture: [...zoneFurniture, ...tableFurniture],
    metadata: {
      ...meta,
      renderQuality: meta.renderQuality ?? 'standard',
    },
  });
}

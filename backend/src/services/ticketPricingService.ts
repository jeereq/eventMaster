export type TicketPricingMode = 'global' | 'by_zone';

export type PricingZone = {
  id: string;
  name: string;
  priceFc: number;
  color?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  maxSeats?: number;
};

type PlanTable = {
  id: string;
  name?: string;
  x: number;
  y: number;
  capacity: number;
  pricingZoneId?: string;
  rowMeta?: { tier?: number };
  seats?: Record<string | number, string | null>;
};

export type TablePlanPricing = {
  tables: PlanTable[];
  pricingZones?: PricingZone[];
};

function planTables(tablePlan: unknown): PlanTable[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const tables = (tablePlan as TablePlanPricing).tables;
  return Array.isArray(tables) ? tables : [];
}

export function pricingZonesFromPlan(tablePlan: unknown): PricingZone[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const zones = (tablePlan as TablePlanPricing).pricingZones;
  if (!Array.isArray(zones)) return [];
  return zones
    .filter((z) => z && typeof z === 'object' && typeof z.id === 'string')
    .map((z) => ({
      id: String(z.id),
      name: String(z.name || 'Zone'),
      priceFc: Math.max(0, Math.round(Number(z.priceFc) || 0)),
      color: z.color ? String(z.color) : undefined,
      x: z.x != null ? Number(z.x) : undefined,
      y: z.y != null ? Number(z.y) : undefined,
      w: z.w != null ? Number(z.w) : undefined,
      h: z.h != null ? Number(z.h) : undefined,
      maxSeats: z.maxSeats != null ? Math.max(0, Math.round(Number(z.maxSeats))) : undefined,
    }));
}

export function normalizeTicketPricingMode(value: unknown): TicketPricingMode {
  return value === 'by_zone' ? 'by_zone' : 'global';
}

function pointInZone(x: number, y: number, zone: PricingZone): boolean {
  if (zone.x == null || zone.y == null || zone.w == null || zone.h == null) return false;
  return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

export function resolveTablePricingZoneId(table: PlanTable, zones: PricingZone[]): string | null {
  if (!zones.length) return null;
  if (table.pricingZoneId && zones.some((z) => z.id === table.pricingZoneId)) {
    return table.pricingZoneId;
  }
  const tier = table.rowMeta?.tier;
  if (tier != null && Number.isFinite(tier)) {
    const byId = zones.find((z) => z.id === `tier-${tier}`);
    if (byId) return byId.id;
    if (zones[tier]) return zones[tier].id;
  }
  for (const zone of zones) {
    if (pointInZone(table.x, table.y, zone)) return zone.id;
  }
  return null;
}

export function findPricingZone(zones: PricingZone[], zoneId: string | null | undefined): PricingZone | null {
  if (!zoneId) return null;
  return zones.find((z) => z.id === zoneId) ?? null;
}

export type ResolvedSeatPrice = {
  priceFc: number;
  pricingZoneId: string | null;
  pricingZoneName: string | null;
};

export function resolveSeatPrice(
  event: { ticketPricingMode?: string; ticketPriceFc: number; tablePlan?: unknown },
  tableId: string,
  seatIndex: number,
): ResolvedSeatPrice {
  const mode = normalizeTicketPricingMode(event.ticketPricingMode);
  const fallback = Math.max(0, Math.round(event.ticketPriceFc || 0));
  if (mode !== 'by_zone') {
    return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
  }

  const zones = pricingZonesFromPlan(event.tablePlan);
  const table = planTables(event.tablePlan).find((t) => t.id === tableId);
  if (!table) {
    return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
  }
  if (seatIndex < 0 || seatIndex >= table.capacity) {
    return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
  }

  const zoneId = resolveTablePricingZoneId(table, zones);
  const zone = findPricingZone(zones, zoneId);
  return {
    priceFc: zone ? zone.priceFc : fallback,
    pricingZoneId: zone?.id ?? null,
    pricingZoneName: zone?.name ?? null,
  };
}

export function resolveZoneTicketPrice(
  event: { ticketPricingMode?: string; ticketPriceFc: number; tablePlan?: unknown },
  pricingZoneId: string,
): ResolvedSeatPrice {
  const mode = normalizeTicketPricingMode(event.ticketPricingMode);
  const fallback = Math.max(0, Math.round(event.ticketPriceFc || 0));
  if (mode !== 'by_zone') {
    return { priceFc: fallback, pricingZoneId: null, pricingZoneName: null };
  }
  const zone = findPricingZone(pricingZonesFromPlan(event.tablePlan), pricingZoneId);
  if (!zone) throw new Error('Zone tarifaire introuvable.');
  return { priceFc: zone.priceFc, pricingZoneId: zone.id, pricingZoneName: zone.name };
}

export function priceFromFcForEvent(event: {
  ticketPricingMode?: string;
  ticketPriceFc: number;
  ticketingEnabled?: boolean;
  tablePlan?: unknown;
}): number | null {
  const paid = Boolean(event.ticketingEnabled && (event.ticketPriceFc > 0 || normalizeTicketPricingMode(event.ticketPricingMode) === 'by_zone'));
  if (!paid) return null;
  const mode = normalizeTicketPricingMode(event.ticketPricingMode);
  if (mode !== 'by_zone') return Math.max(0, event.ticketPriceFc);
  const zones = pricingZonesFromPlan(event.tablePlan);
  const prices = zones.map((z) => z.priceFc).filter((p) => p > 0);
  if (prices.length) return Math.min(...prices);
  return Math.max(0, event.ticketPriceFc) || null;
}

/** Applique pricingZoneId sur les tables selon position / rang. */
export function applyAutoZoneAssignment(tablePlan: unknown, zones: PricingZone[]): unknown {
  if (!tablePlan || typeof tablePlan !== 'object' || !zones.length) return tablePlan;
  const plan = structuredClone(tablePlan) as TablePlanPricing;
  if (!Array.isArray(plan.tables)) return tablePlan;
  plan.pricingZones = zones;
  plan.tables = plan.tables.map((table) => {
    const zoneId = resolveTablePricingZoneId(table, zones);
    return zoneId ? { ...table, pricingZoneId: zoneId } : table;
  });
  return plan;
}

export function mergePricingZonesIntoTablePlan(
  tablePlan: unknown,
  pricingZones: PricingZone[] | undefined,
): unknown {
  if (!pricingZones?.length) return tablePlan;
  const base =
    tablePlan && typeof tablePlan === 'object'
      ? structuredClone(tablePlan)
      : { tables: [] };
  return applyAutoZoneAssignment(base, pricingZones);
}

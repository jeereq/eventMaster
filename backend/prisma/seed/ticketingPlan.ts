import { blueprintToTablePlan } from '../../src/services/roomLayoutService';
import {
  applyAutoZoneAssignment,
  resolveSeatPrice,
  type PricingZone,
} from '../../src/services/ticketPricingService';

type PlanTable = {
  id: string;
  capacity: number;
  seats?: Record<string | number, string | null>;
  pricingZoneId?: string;
};

export type TablePlanLike = {
  tables?: PlanTable[];
  pricingZones?: PricingZone[];
  [key: string]: unknown;
};

/** Zones tarifaires démo — Gala Prestige (Kinshasa). */
export const SEED_GALA_PRICING_ZONES: PricingZone[] = [
  {
    id: 'zone-vip',
    name: 'VIP',
    priceFc: 250_000,
    color: '#5b8def',
    x: 28,
    y: 6,
    w: 44,
    h: 20,
  },
  {
    id: 'zone-standard',
    name: 'Standard',
    priceFc: 150_000,
    color: '#c4a35a',
    x: 6,
    y: 22,
    w: 88,
    h: 52,
  },
  {
    id: 'zone-fosse',
    name: 'Fosse',
    priceFc: 80_000,
    color: '#e85d5d',
    x: 22,
    y: 74,
    w: 56,
    h: 18,
  },
];

/** Zones pour amphithéâtre / conférence. */
export const SEED_AMPHI_PRICING_ZONES: PricingZone[] = [
  { id: 'tier-0', name: 'Orchestre', priceFc: 120_000, color: '#6bbd6e', x: 10, y: 55, w: 80, h: 35 },
  { id: 'tier-1', name: 'Balcon', priceFc: 75_000, color: '#9b6bcc', x: 12, y: 12, w: 76, h: 38 },
];

export function pricingZonesForVolumeSeed(index: number): PricingZone[] {
  const variants: PricingZone[][] = [
    [
      { id: 'zone-vip', name: 'VIP', priceFc: 45_000, color: '#5b8def', x: 25, y: 8, w: 50, h: 22 },
      { id: 'zone-standard', name: 'Standard', priceFc: 25_000, color: '#c4a35a', x: 8, y: 28, w: 84, h: 50 },
    ],
    [
      { id: 'zone-premium', name: 'Premium', priceFc: 60_000, color: '#e85d5d', x: 15, y: 10, w: 70, h: 30 },
      { id: 'zone-fosse', name: 'Fosse', priceFc: 18_000, color: '#f59e42', x: 20, y: 68, w: 60, h: 22 },
    ],
    SEED_AMPHI_PRICING_ZONES,
  ];
  return variants[index % variants.length];
}

export function buildSeedTablePlan(
  blueprint: unknown,
  zones?: PricingZone[],
): TablePlanLike {
  const base = blueprintToTablePlan(blueprint as Parameters<typeof blueprintToTablePlan>[0]) as TablePlanLike;
  if (!zones?.length) return base;
  return applyAutoZoneAssignment(base, zones) as TablePlanLike;
}

export function enrichTablePlanWithZones(
  tablePlan: TablePlanLike | undefined,
  zones: PricingZone[],
): TablePlanLike | undefined {
  if (!tablePlan) return undefined;
  return applyAutoZoneAssignment(tablePlan, zones) as TablePlanLike;
}

export function cloneTablePlan(plan: unknown): TablePlanLike {
  return structuredClone(plan) as TablePlanLike;
}

export function findAvailableSeat(tablePlan: unknown): { tableId: string; seatIndex: number } | null {
  const tables = planTables(tablePlan);
  for (const table of tables) {
    const cap = Math.max(0, Number(table.capacity) || 0);
    for (let i = 0; i < cap; i++) {
      const taken = Boolean(table.seats?.[i] ?? table.seats?.[String(i)]);
      if (!taken) return { tableId: table.id, seatIndex: i };
    }
  }
  return null;
}

export function assignSeatOnPlan(
  tablePlan: unknown,
  tableId: string,
  seatIndex: number,
  guestId: string,
): TablePlanLike {
  const plan = cloneTablePlan(tablePlan);
  const table = plan.tables?.find((t) => t.id === tableId);
  if (!table) throw new Error(`Table ${tableId} introuvable sur le plan seed.`);
  if (!table.seats) table.seats = {};
  table.seats[seatIndex] = guestId;
  return plan;
}

export function resolveOrderPricing(
  event: { ticketPricingMode?: string; ticketPriceFc: number; tablePlan?: unknown },
  opts: {
    tableId?: string | null;
    seatIndex?: number | null;
    pricingZoneId?: string | null;
  },
): { unitPriceFc: number; pricingZoneId: string | null; amountFc: number } {
  const quantity = 1;
  const mode = event.ticketPricingMode === 'by_zone' ? 'by_zone' : 'global';
  if (mode === 'by_zone' && opts.tableId != null && opts.seatIndex != null) {
    const resolved = resolveSeatPrice(event, opts.tableId, opts.seatIndex);
    return {
      unitPriceFc: resolved.priceFc,
      pricingZoneId: resolved.pricingZoneId,
      amountFc: resolved.priceFc * quantity,
    };
  }
  if (mode === 'by_zone' && opts.pricingZoneId) {
    const zones = (event.tablePlan as TablePlanLike)?.pricingZones ?? [];
    const zone = zones.find((z) => z.id === opts.pricingZoneId);
    const unit = zone?.priceFc ?? event.ticketPriceFc;
    return { unitPriceFc: unit, pricingZoneId: zone?.id ?? null, amountFc: unit * quantity };
  }
  const unit = Math.max(0, event.ticketPriceFc);
  return { unitPriceFc: unit, pricingZoneId: null, amountFc: unit * quantity };
}

function planTables(tablePlan: unknown): PlanTable[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const tables = (tablePlan as TablePlanLike).tables;
  return Array.isArray(tables) ? tables : [];
}

export const SEED_EVENT_PROGRAM_GALA = {
  slots: [
    {
      id: 'accueil',
      label: 'Accueil & cocktail',
      startsAt: '18:30',
      endsAt: '19:30',
      lighting: 'twilight',
    },
    {
      id: 'gala',
      label: 'Dîner & spectacle',
      startsAt: '19:30',
      endsAt: '23:00',
      lighting: 'night',
    },
  ],
};

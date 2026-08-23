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

export const PRICING_ZONE_COLORS = ['#c4a35a', '#5b8def', '#e85d5d', '#6bbd6e', '#9b6bcc', '#f59e42'];

export function makePricingZoneId(): string {
  return `zone-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyPricingZone(index = 0): PricingZone {
  return {
    id: makePricingZoneId(),
    name: index === 0 ? 'Standard' : index === 1 ? 'VIP' : `Zone ${index + 1}`,
    priceFc: 0,
    color: PRICING_ZONE_COLORS[index % PRICING_ZONE_COLORS.length],
  };
}

export function pricingZonesFromTablePlan(tablePlan: unknown): PricingZone[] {
  if (!tablePlan || typeof tablePlan !== 'object') return [];
  const zones = (tablePlan as { pricingZones?: PricingZone[] }).pricingZones;
  if (!Array.isArray(zones)) return [];
  return zones.map((z) => ({
    id: String(z.id),
    name: String(z.name || 'Zone'),
    priceFc: Math.max(0, Math.round(Number(z.priceFc) || 0)),
    color: z.color ? String(z.color) : PRICING_ZONE_COLORS[0],
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

export function priceFromFcForEvent(event: {
  ticketPricingMode?: string;
  ticketPriceFc: number;
  ticketingEnabled?: boolean;
  paid?: boolean;
  pricingZones?: PricingZone[];
  tablePlan?: unknown;
}): number | null {
  const zones = event.pricingZones?.length
    ? event.pricingZones
    : pricingZonesFromTablePlan(event.tablePlan);
  const mode = normalizeTicketPricingMode(event.ticketPricingMode);
  const paid =
    event.paid ||
    Boolean(event.ticketingEnabled && (event.ticketPriceFc > 0 || (mode === 'by_zone' && zones.some((z) => z.priceFc > 0))));
  if (!paid) return null;
  if (mode !== 'by_zone') return Math.max(0, event.ticketPriceFc);
  const prices = zones.map((z) => z.priceFc).filter((p) => p > 0);
  if (prices.length) return Math.min(...prices);
  return Math.max(0, event.ticketPriceFc) || null;
}

export function formatPriceRangeFc(minFc: number, maxFc: number): string {
  if (minFc === maxFc) return `${minFc.toLocaleString('fr-FR')} FC`;
  return `${minFc.toLocaleString('fr-FR')} – ${maxFc.toLocaleString('fr-FR')} FC`;
}

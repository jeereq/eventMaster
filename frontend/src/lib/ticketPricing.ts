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

export type ZoneRevenueStat = {
  zone: PricingZone;
  tableCount: number;
  seatCount: number;
  totalRevenueFc: number;
  percentageOfSeats: number;
};

export type TicketingRevenueSummary = {
  byZone: ZoneRevenueStat[];
  unassigned: {
    tableCount: number;
    seatCount: number;
    percentageOfSeats: number;
    potentialRevenueFc: number;
  };
  totalTables: number;
  totalSeats: number;
  totalRevenueFc: number;
};

/** Calcule le chiffre d'affaires prévisionnel et les statistiques de répartition par zone. */
export function computeTicketingRevenueSummary(
  tables: Array<{ id: string; capacity: number; pricingZoneId?: string }>,
  zones: PricingZone[],
  defaultPriceFc = 0,
): TicketingRevenueSummary {
  const totalTables = tables.length;
  const totalSeats = tables.reduce((acc, t) => acc + Math.max(0, t.capacity || 0), 0);

  const zoneMap = new Map<string, { tableCount: number; seatCount: number }>();
  for (const z of zones) {
    zoneMap.set(z.id, { tableCount: 0, seatCount: 0 });
  }

  let unassignedTableCount = 0;
  let unassignedSeatCount = 0;

  for (const t of tables) {
    const cap = Math.max(0, t.capacity || 0);
    if (t.pricingZoneId && zoneMap.has(t.pricingZoneId)) {
      const stats = zoneMap.get(t.pricingZoneId)!;
      stats.tableCount += 1;
      stats.seatCount += cap;
    } else {
      unassignedTableCount += 1;
      unassignedSeatCount += cap;
    }
  }

  let totalRevenueFc = 0;
  const byZone: ZoneRevenueStat[] = zones.map((zone) => {
    const stats = zoneMap.get(zone.id) || { tableCount: 0, seatCount: 0 };
    const rev = stats.seatCount * Math.max(0, zone.priceFc || 0);
    totalRevenueFc += rev;
    return {
      zone,
      tableCount: stats.tableCount,
      seatCount: stats.seatCount,
      totalRevenueFc: rev,
      percentageOfSeats: totalSeats > 0 ? Math.round((stats.seatCount / totalSeats) * 100) : 0,
    };
  });

  const unassignedPotential = unassignedSeatCount * Math.max(0, defaultPriceFc);
  totalRevenueFc += unassignedPotential;

  return {
    byZone,
    unassigned: {
      tableCount: unassignedTableCount,
      seatCount: unassignedSeatCount,
      percentageOfSeats: totalSeats > 0 ? Math.round((unassignedSeatCount / totalSeats) * 100) : 0,
      potentialRevenueFc: unassignedPotential,
    },
    totalTables,
    totalSeats,
    totalRevenueFc,
  };
}

export type ZoneDistributionStrategy = 'front_to_back' | 'concentric' | 'capacity_ratio';

export interface AutoDistributeOptions {
  strategy?: ZoneDistributionStrategy;
  fixtures?: Array<{ kind: string; x: number; y: number; w?: number; h?: number }>;
  ratios?: number[];
  updateBoundingBoxes?: boolean;
}

export interface AutoDistributeResult<T extends { id: string; x: number; y: number; capacity: number; pricingZoneId?: string }> {
  tables: T[];
  zones: PricingZone[];
  summary: TicketingRevenueSummary;
}

/** Répartit intelligemment les tables dans les zones de billetterie selon la configuration scénique ou spatiale. */
export function autoDistributeTablesToZones<
  T extends { id: string; x: number; y: number; capacity: number; pricingZoneId?: string }
>(
  tables: T[],
  zones: PricingZone[],
  options: AutoDistributeOptions = {},
): AutoDistributeResult<T> {
  if (!tables.length || !zones.length) {
    return {
      tables: [...tables],
      zones: [...zones],
      summary: computeTicketingRevenueSummary(tables, zones),
    };
  }

  const strategy = options.strategy || 'front_to_back';

  // Trier les zones par prix décroissant (la plus chère en premier : VIP)
  const sortedZones = [...zones].sort((a, b) => (b.priceFc || 0) - (a.priceFc || 0));

  // Déterminer le point focal (ex: scène ou estrade)
  const stage = options.fixtures?.find((f) => f.kind === 'stage' || f.kind === 'podium');
  const focalX = stage ? stage.x + (stage.w ? stage.w / 2 : 0) : 50;
  const focalY = stage ? stage.y + (stage.h ? stage.h / 2 : 0) : 10;

  // Calculer le centre de la salle pour la stratégie concentrique
  const meanX = tables.reduce((acc, t) => acc + t.x, 0) / tables.length;
  const meanY = tables.reduce((acc, t) => acc + t.y, 0) / tables.length;

  // Calculer un score de proximité / prestige pour chaque table
  const tableScored = tables.map((t) => {
    let score = 0;
    if (strategy === 'concentric') {
      // Plus proche du centre d'honneur = score plus élevé
      const dist = Math.hypot(t.x - meanX, t.y - meanY);
      score = -dist;
    } else {
      // Stratégie 'front_to_back' ou 'capacity_ratio' :
      // Plus proche de la scène / du haut de la salle = score plus élevé
      const dist = Math.hypot(t.x - focalX, t.y - focalY);
      score = -dist;
    }
    return { table: t, score };
  });

  // Trier les tables par ordre de prestige (les meilleures en premier)
  tableScored.sort((a, b) => b.score - a.score);

  // Ratios de répartition par zone
  let ratios = options.ratios;
  if (!ratios || ratios.length !== sortedZones.length) {
    if (sortedZones.length === 1) {
      ratios = [1.0];
    } else if (sortedZones.length === 2) {
      ratios = [0.35, 0.65];
    } else if (sortedZones.length === 3) {
      ratios = [0.20, 0.35, 0.45];
    } else {
      const step = 1 / sortedZones.length;
      ratios = sortedZones.map(() => step);
    }
  }

  // Normaliser les ratios
  const ratioSum = ratios.reduce((a, b) => a + b, 0) || 1;
  const normRatios = ratios.map((r) => r / ratioSum);

  // Calculer le quota de places par zone
  const totalSeats = tables.reduce((acc, t) => acc + Math.max(1, t.capacity || 1), 0);
  const targetSeatsPerZone = normRatios.map((r) => Math.max(1, Math.round(r * totalSeats)));

  // Assigner les tables aux zones
  const assignedTableMap = new Map<string, string>();
  let currentZoneIdx = 0;
  let currentZoneSeats = 0;

  for (const item of tableScored) {
    const t = item.table;
    const cap = Math.max(1, t.capacity || 1);

    // Passer à la zone suivante si le quota est dépassé (sauf pour la dernière zone qui prend le reste)
    if (
      currentZoneIdx < sortedZones.length - 1 &&
      currentZoneSeats + cap / 2 > targetSeatsPerZone[currentZoneIdx]
    ) {
      currentZoneIdx += 1;
      currentZoneSeats = 0;
    }

    assignedTableMap.set(t.id, sortedZones[currentZoneIdx].id);
    currentZoneSeats += cap;
  }

  const updatedTables = tables.map((t) => ({
    ...t,
    pricingZoneId: assignedTableMap.get(t.id) || sortedZones[0].id,
  }));

  // Optionnel : recalculer les bounding boxes spatiales des zones (x, y, w, h)
  let updatedZones = [...zones];
  if (options.updateBoundingBoxes !== false) {
    updatedZones = zones.map((zone) => {
      const zoneTables = updatedTables.filter((t) => t.pricingZoneId === zone.id);
      if (!zoneTables.length) return zone;

      const xs = zoneTables.map((t) => t.x);
      const ys = zoneTables.map((t) => t.y);
      const minX = Math.max(2, Math.min(...xs) - 8);
      const maxX = Math.min(98, Math.max(...xs) + 8);
      const minY = Math.max(2, Math.min(...ys) - 7);
      const maxY = Math.min(98, Math.max(...ys) + 7);

      return {
        ...zone,
        x: Math.round(minX),
        y: Math.round(minY),
        w: Math.round(maxX - minX),
        h: Math.round(maxY - minY),
      };
    });
  }

  const summary = computeTicketingRevenueSummary(updatedTables, updatedZones);

  return {
    tables: updatedTables,
    zones: updatedZones,
    summary,
  };
}

export interface TicketingZonePreset {
  id: string;
  label: string;
  description: string;
  badge: string;
  zones: Array<{ name: string; priceFc: number; color: string }>;
}

export const TICKETING_ZONE_PRESETS: TicketingZonePreset[] = [
  {
    id: 'preset-gala',
    label: 'Gala & Soirée Prestige',
    description: 'VIP Table d’honneur, Carré d’Or central et Standard',
    badge: 'Mariages & Galas',
    zones: [
      { name: 'VIP Prestige', priceFc: 100000, color: '#c4a35a' },
      { name: 'Carré d’Or', priceFc: 60000, color: '#5b8def' },
      { name: 'Standard', priceFc: 35000, color: '#6bbd6e' },
    ],
  },
  {
    id: 'preset-concert',
    label: 'Concert & Spectacle',
    description: 'VVIP devant scène, Club Privilège et Salle générale',
    badge: 'Concerts & Soirées',
    zones: [
      { name: 'VVIP Table Scène', priceFc: 150000, color: '#9b6bcc' },
      { name: 'Club Privilège', priceFc: 80000, color: '#f59e42' },
      { name: 'Standard / Fosse', priceFc: 40000, color: '#5b8def' },
    ],
  },
  {
    id: 'preset-conference',
    label: 'Conférence & Forum Pro',
    description: 'Délégués Officiels, Pass Entreprise et Participants',
    badge: 'Séminaires & B2B',
    zones: [
      { name: 'Délégué VIP / Officiel', priceFc: 120000, color: '#c4a35a' },
      { name: 'Pass Entreprise', priceFc: 70000, color: '#5b8def' },
      { name: 'Participant Standard', priceFc: 30000, color: '#6bbd6e' },
    ],
  },
];


export const IMPORT_SNAP_STEP = 0.5;

export function clampPct(value: number, min = 1, max = 99): number {
  return Math.max(min, Math.min(max, value));
}

export function snapPct(value: number, step = IMPORT_SNAP_STEP): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

/**
 * Distances et dégagements physiques réels (en mètres).
 * Basés sur les normes événementielles et de sécurité CHR / ERP :
 * - Table à table : 1.40m (recul chaises 2x 0.45m + passage serveur 0.50m)
 * - Chaise à chaise : 0.70m centre-à-centre
 * - Table à rangée : 1.20m
 * - Rangée à rangée : 0.90m dos-à-dossier
 * - Circulation périphérique le long des murs : 0.90m
 * - Dégagement portes & issues de secours : 1.40m
 * - Dégagement scène / estrade : 1.40m
 * - Dégagement service bar / buffet : 1.50m
 */
export const REAL_CLEARANCE_METERS = {
  /** Distance minimale centre-à-centre entre deux chaises (0.50m largeur + 0.20m espace libre) */
  chairToChair: 0.70,
  /** Distance minimale bord-à-bord entre tables pour recul des chaises et passage serveurs */
  tableToTable: 1.40,
  /** Distance minimale entre une chaise isolée et l'enveloppe d'une table */
  chairToTable: 0.80,
  /** Distance minimale entre une table et une rangée / banquette */
  tableToRow: 1.20,
  /** Distance minimale entre une chaise isolée et une rangée / banquette */
  chairToRow: 0.80,
  /** Distance minimale entre rangées de sièges (allée de passage libre) */
  rowToRow: 0.90,
  /** Distance minimale entre mobilier et les murs extérieurs (circulation périphérique) */
  wallMargin: 0.90,
  /** Dégagement de sécurité autour des estrades, scènes et régies */
  stageClearance: 1.40,
  /** Dégagement générique autour des installations fixes */
  fixtureClearance: 1.20,
  /** Dégagement de service devant comptoirs de bar et buffets */
  serviceCounterClearance: 1.50,
  /** Dégagement de sécurité et d'évacuation devant les portes */
  doorClearance: 1.40,
  /** Dégagement autour de la piste de danse et zones actives */
  danceFloorClearance: 0.80,
  /** Dégagement de part et d'autre d'une allée centrale ou tapis d'honneur */
  aisleClearance: 0.80,
  /** Dégagement autour des colonnes et piliers porteurs */
  columnClearance: 0.60,
};

export type ClearancePreset = 'standard' | 'vip' | 'compact';

export const CLEARANCE_PRESETS: Record<ClearancePreset, Partial<typeof REAL_CLEARANCE_METERS>> = {
  standard: {
    tableToTable: 1.40,
    chairToChair: 0.70,
    chairToTable: 0.80,
    tableToRow: 1.20,
    chairToRow: 0.80,
    rowToRow: 0.90,
    wallMargin: 0.90,
    stageClearance: 1.40,
    doorClearance: 1.40,
    danceFloorClearance: 0.80,
    serviceCounterClearance: 1.50,
  },
  vip: {
    tableToTable: 1.80,
    chairToChair: 0.80,
    chairToTable: 1.00,
    tableToRow: 1.50,
    chairToRow: 0.95,
    rowToRow: 1.10,
    wallMargin: 1.10,
    stageClearance: 1.60,
    doorClearance: 1.60,
    danceFloorClearance: 1.00,
    serviceCounterClearance: 1.80,
  },
  compact: {
    tableToTable: 1.10,
    chairToChair: 0.60,
    chairToTable: 0.65,
    tableToRow: 0.95,
    chairToRow: 0.65,
    rowToRow: 0.80,
    wallMargin: 0.75,
    stageClearance: 1.10,
    doorClearance: 1.20,
    danceFloorClearance: 0.60,
    serviceCounterClearance: 1.20,
  },
};

const SOLID_FIXTURE_KINDS = new Set([
  'stage',
  'podium',
  'buffet',
  'bar',
  'column',
  'stairs',
  'balcony',
  'djBooth',
  'screen',
  'orderCounter',
  'pickupCounter',
  'pizzaOven',
  'kitchenLine',
  'displayCase',
  'stylingStation',
  'washBasin',
  'condimentStation',
  'car',
]);

export function estimateTableSizeMeters(
  shape: string | undefined,
  capacity: number = 8,
  rotationDeg: number = 0,
): {
  wM: number;
  hM: number;
  radiusM: number;
  halfWM: number;
  halfHM: number;
  effectiveRadiusM: number;
} {
  let baseW = 1.6;
  let baseH = 1.6;

  if (shape === 'cocktail' || shape === 'highTop') {
    baseW = 0.85;
    baseH = 0.85;
    const r = baseW / 2;
    return {
      wM: baseW,
      hM: baseH,
      radiusM: r,
      halfWM: r + 0.30,
      halfHM: r + 0.30,
      effectiveRadiusM: r + 0.30,
    };
  }

  if (shape === 'square') {
    const side = capacity <= 2 ? 0.85 : capacity <= 4 ? 1.05 : 1.50;
    baseW = side;
    baseH = side;
  } else if (shape === 'rectangular' || shape === 'arc') {
    baseH = 1.05;
    if (capacity <= 2) baseW = 0.90;
    else if (capacity <= 4) baseW = 1.35;
    else if (capacity <= 6) baseW = 1.80;
    else if (capacity <= 8) baseW = 2.25;
    else if (capacity <= 10) baseW = 2.70;
    else if (capacity <= 12) baseW = 3.15;
    else baseW = 3.50;
  } else {
    // round / oval
    const diam = Math.max(0.9, Math.min(2.8, 0.8 + capacity * 0.125));
    baseW = diam;
    baseH = shape === 'oval' ? diam * 0.75 : diam;
  }

  const rad = ((rotationDeg % 360) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = baseW * cos + baseH * sin;
  const rotH = baseW * sin + baseH * cos;

  const pullBack = 0.45; // enveloppe de recul des chaises assises
  const radiusM = Math.hypot(rotW, rotH) / 2;
  return {
    wM: rotW,
    hM: rotH,
    radiusM,
    halfWM: rotW / 2 + pullBack,
    halfHM: rotH / 2 + pullBack,
    effectiveRadiusM: radiusM + pullBack,
  };
}

export function estimateRowSizeMeters(
  seatCount: number = 10,
  rotationDeg: number = 0,
): {
  wM: number;
  hM: number;
  halfWM: number;
  halfHM: number;
  radiusM: number;
} {
  const baseW = Math.max(1.5, seatCount * 0.50);
  const baseH = 0.75;
  const rad = ((rotationDeg % 360) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const rotW = baseW * cos + baseH * sin;
  const rotH = baseW * sin + baseH * cos;
  return {
    wM: rotW,
    hM: rotH,
    halfWM: rotW / 2,
    halfHM: rotH / 2,
    radiusM: Math.hypot(rotW, rotH) / 2,
  };
}

export type MinimalBlueprint = {
  canvas?: { widthM?: number; heightM?: number };
  furniture: any[];
  fixtures?: any[];
  walls?: any[];
};

type MutableItem = {
  id: string;
  kind: string;
  name?: string;
  label?: string;
  cxM: number;
  cyM: number;
  halfWM: number;
  halfHM: number;
  radiusM: number;
  effectiveRadiusM: number;
  storyId?: string;
  zoneKind?: string;
  shape?: string;
  capacity?: number;
};

type MutableFixture = {
  id: string;
  kind: string;
  label?: string;
  xM: number;
  yM: number;
  wM: number;
  hM: number;
  isSolid: boolean;
  storyId?: string;
};

type DoorZone = {
  id: string;
  cxM: number;
  cyM: number;
  widthM: number;
  storyId?: string;
};

export interface LayoutClearanceConflict {
  id: string;
  type:
    | 'chair_overlap'
    | 'table_overlap'
    | 'table_row_overlap'
    | 'chair_table_overlap'
    | 'door_blocked'
    | 'stage_blocked'
    | 'wall_blocked'
    | 'fixture_blocked';
  severity: 'error' | 'warning';
  message: string;
  itemIds: string[];
  distanceM?: number;
  requiredM?: number;
}

export interface ClearanceAnalysisReport {
  conflicts: LayoutClearanceConflict[];
  errorCount: number;
  warningCount: number;
  isCompliant: boolean;
  score: number;
  summary: string;
}

/**
 * Analyse un plan et détecte les conflits de dégagement et de chevauchement.
 */
export function detectLayoutClearanceConflicts(
  blueprint: MinimalBlueprint,
  customClearances?: Partial<typeof REAL_CLEARANCE_METERS>,
): ClearanceAnalysisReport {
  const widthM = Math.max(5, blueprint.canvas?.widthM || 20);
  const heightM = Math.max(5, blueprint.canvas?.heightM || 16);
  const clearances = { ...REAL_CLEARANCE_METERS, ...customClearances };

  const pctToM_X = (pct: number) => (pct / 100) * widthM;
  const pctToM_Y = (pct: number) => (pct / 100) * heightM;
  const sameStory = (s1?: string, s2?: string) => !s1 || !s2 || s1 === s2;

  const conflicts: LayoutClearanceConflict[] = [];

  const chairs = (blueprint.furniture || []).filter((f) => f.kind === 'chair');
  const tables = (blueprint.furniture || []).filter((f) => f.kind === 'table');
  const rows = (blueprint.furniture || []).filter((f) => f.kind === 'row');

  // 1. Chaises empilées ou trop proches
  for (let i = 0; i < chairs.length; i++) {
    for (let j = i + 1; j < chairs.length; j++) {
      const c1 = chairs[i];
      const c2 = chairs[j];
      if (!sameStory(c1.storyId, c2.storyId)) continue;

      const dxM = pctToM_X(c2.x) - pctToM_X(c1.x);
      const dyM = pctToM_Y(c2.y) - pctToM_Y(c1.y);
      const dist = Math.hypot(dxM, dyM);
      const target = clearances.chairToChair;

      if (dist < target * 0.95) {
        conflicts.push({
          id: `chair_overlap_${c1.id}_${c2.id}`,
          type: 'chair_overlap',
          severity: dist < 0.1 ? 'error' : 'warning',
          message:
            dist < 0.1
              ? 'Chaises empilées exactement aux mêmes coordonnées.'
              : `Chaises trop serrées (${dist.toFixed(2)}m, minimum ${target}m).`,
          itemIds: [c1.id, c2.id],
          distanceM: Math.round(dist * 100) / 100,
          requiredM: target,
        });
      }
    }
  }

  // 2. Tables trop proches ou chevauchantes
  for (let i = 0; i < tables.length; i++) {
    for (let j = i + 1; j < tables.length; j++) {
      const t1 = tables[i];
      const t2 = tables[j];
      if (!sameStory(t1.storyId, t2.storyId)) continue;

      const sz1 = estimateTableSizeMeters(t1.shape, t1.capacity, t1.rotation);
      const sz2 = estimateTableSizeMeters(t2.shape, t2.capacity, t2.rotation);

      const dxM = Math.abs(pctToM_X(t2.x) - pctToM_X(t1.x));
      const dyM = Math.abs(pctToM_Y(t2.y) - pctToM_Y(t1.y));
      const dist = Math.hypot(pctToM_X(t2.x) - pctToM_X(t1.x), pctToM_Y(t2.y) - pctToM_Y(t1.y));
      const targetCenter = sz1.radiusM + sz2.radiusM + clearances.tableToTable;

      if (dist < targetCenter * 0.95) {
        const name1 = t1.name || `Table ${i + 1}`;
        const name2 = t2.name || `Table ${j + 1}`;
        conflicts.push({
          id: `table_overlap_${t1.id}_${t2.id}`,
          type: 'table_overlap',
          severity: dist < sz1.radiusM + sz2.radiusM ? 'error' : 'warning',
          message: `Espace insuffisant entre "${name1}" et "${name2}" (${dist.toFixed(2)}m pour ${targetCenter.toFixed(2)}m requis).`,
          itemIds: [t1.id, t2.id],
          distanceM: Math.round(dist * 100) / 100,
          requiredM: Math.round(targetCenter * 100) / 100,
        });
      }
    }
  }

  // 3. Tables trop proches d'une rangée ou banquette
  for (const t of tables) {
    for (const r of rows) {
      if (!sameStory(t.storyId, r.storyId)) continue;
      const szT = estimateTableSizeMeters(t.shape, t.capacity, t.rotation);
      const szR = estimateRowSizeMeters(r.seatCount, r.rotation);

      const dxM = Math.abs(pctToM_X(r.x) - pctToM_X(t.x));
      const dyM = Math.abs(pctToM_Y(r.y) - pctToM_Y(t.y));
      const reqX = szT.halfWM + szR.halfWM + clearances.tableToRow;
      const reqY = szT.halfHM + szR.halfHM + clearances.tableToRow;

      if (dxM < reqX * 0.95 && dyM < reqY * 0.95) {
        conflicts.push({
          id: `table_row_${t.id}_${r.id}`,
          type: 'table_row_overlap',
          severity: 'warning',
          message: `Table "${t.name || 'Table'}" trop proche de la rangée/banquette "${r.label || 'Rangée'}".`,
          itemIds: [t.id, r.id],
        });
      }
    }
  }

  // 4. Mobilier bloquant une porte
  const doorFixtures = (blueprint.fixtures || []).filter(
    (fx) => fx.kind === 'door' || fx.kind === 'entrance',
  );
  for (const item of [...tables, ...chairs, ...rows]) {
    for (const df of doorFixtures) {
      if (!sameStory(item.storyId, df.storyId)) continue;
      const itemX = pctToM_X(item.x);
      const itemY = pctToM_Y(item.y);
      const doorX = pctToM_X(df.x) + pctToM_X(df.w) / 2;
      const doorY = pctToM_Y(df.y) + pctToM_Y(df.h) / 2;
      const dist = Math.hypot(itemX - doorX, itemY - doorY);
      if (dist < clearances.doorClearance) {
        conflicts.push({
          id: `door_blocked_${item.id}_${df.id}`,
          type: 'door_blocked',
          severity: 'error',
          message: `Mobilier placé devant une porte d'accès (dégagement de sécurité requis : ${clearances.doorClearance}m).`,
          itemIds: [item.id, df.id],
          distanceM: Math.round(dist * 100) / 100,
          requiredM: clearances.doorClearance,
        });
      }
    }
  }

  const errorCount = conflicts.filter((c) => c.severity === 'error').length;
  const warningCount = conflicts.filter((c) => c.severity === 'warning').length;
  const isCompliant = conflicts.length === 0;
  const score = Math.max(0, Math.min(100, 100 - errorCount * 18 - warningCount * 6));

  const summary = isCompliant
    ? 'Tous les espacements sont fluides et conformes aux normes réelles.'
    : `${conflicts.length} problème${conflicts.length > 1 ? 's' : ''} d’espacement détecté${conflicts.length > 1 ? 's' : ''} (${errorCount} critique${errorCount > 1 ? 's' : ''}).`;

  return {
    conflicts,
    errorCount,
    warningCount,
    isCompliant,
    score,
    summary,
  };
}

/**
 * Empêche l'empilement des chaises et impose un écartement physique réel
 * (en mètres réels projetés sur le canvas) entre tables, chaises, rangées, fixtures, portes et murs.
 */
export function enforceRealLayoutClearances<T extends MinimalBlueprint>(
  blueprint: T,
  options?: {
    iterations?: number;
    preset?: ClearancePreset;
    clearances?: Partial<typeof REAL_CLEARANCE_METERS>;
  },
): T {
  const widthM = Math.max(5, blueprint.canvas?.widthM || 20);
  const heightM = Math.max(5, blueprint.canvas?.heightM || 16);

  const pctToM_X = (pct: number) => (pct / 100) * widthM;
  const pctToM_Y = (pct: number) => (pct / 100) * heightM;
  const mToPct_X = (m: number) => (m / widthM) * 100;
  const mToPct_Y = (m: number) => (m / heightM) * 100;

  const presetValues = options?.preset ? CLEARANCE_PRESETS[options.preset] : undefined;

  const clearances = {
    ...REAL_CLEARANCE_METERS,
    ...presetValues,
    ...options?.clearances,
  };

  const iterations = Math.max(6, Math.min(24, options?.iterations ?? 10));

  // Convertir le mobilier en coordonnées métriques modifiables
  const mutableItems: MutableItem[] = (blueprint.furniture || []).map((f) => {
    const cxM = pctToM_X(f.x);
    const cyM = pctToM_Y(f.y);

    if (f.kind === 'chair') {
      return {
        id: f.id,
        kind: 'chair',
        label: f.label,
        cxM,
        cyM,
        halfWM: 0.25,
        halfHM: 0.25,
        radiusM: 0.25,
        effectiveRadiusM: 0.25,
        storyId: f.storyId,
      };
    }

    if (f.kind === 'table') {
      const sz = estimateTableSizeMeters(f.shape, f.capacity, f.rotation);
      return {
        id: f.id,
        kind: 'table',
        name: f.name,
        shape: f.shape,
        capacity: f.capacity,
        cxM,
        cyM,
        halfWM: sz.halfWM,
        halfHM: sz.halfHM,
        radiusM: sz.radiusM,
        effectiveRadiusM: sz.effectiveRadiusM,
        storyId: f.storyId,
      };
    }

    if (f.kind === 'row') {
      const sz = estimateRowSizeMeters(f.seatCount, f.rotation);
      return {
        id: f.id,
        kind: 'row',
        label: f.label,
        cxM,
        cyM,
        halfWM: sz.halfWM,
        halfHM: sz.halfHM,
        radiusM: sz.radiusM,
        effectiveRadiusM: sz.radiusM,
        storyId: f.storyId,
      };
    }

    const wM = pctToM_X(f.w ?? 10);
    const hM = pctToM_Y(f.h ?? 10);
    return {
      id: f.id,
      kind: f.kind,
      label: f.label,
      zoneKind: f.zoneKind,
      cxM: pctToM_X(f.x) + wM / 2,
      cyM: pctToM_Y(f.y) + hM / 2,
      halfWM: wM / 2,
      halfHM: hM / 2,
      radiusM: Math.max(wM, hM) / 2,
      effectiveRadiusM: Math.max(wM, hM) / 2,
      storyId: f.storyId,
    };
  });

  const mutableFixtures: MutableFixture[] = (blueprint.fixtures || []).map((fx) => ({
    id: fx.id,
    kind: fx.kind,
    label: fx.label,
    xM: pctToM_X(fx.x),
    yM: pctToM_Y(fx.y),
    wM: pctToM_X(fx.w),
    hM: pctToM_Y(fx.h),
    isSolid: SOLID_FIXTURE_KINDS.has(fx.kind),
    storyId: fx.storyId,
  }));

  // Extraire les portes des murs et fixtures
  const doorZones: DoorZone[] = [];
  for (const fx of mutableFixtures) {
    if (fx.kind === 'door' || fx.kind === 'entrance') {
      doorZones.push({
        id: fx.id,
        cxM: fx.xM + fx.wM / 2,
        cyM: fx.yM + fx.hM / 2,
        widthM: Math.max(1.0, fx.wM),
        storyId: fx.storyId,
      });
    }
  }

  if (Array.isArray(blueprint.walls)) {
    for (const w of blueprint.walls) {
      if (!Array.isArray(w.openings)) continue;
      for (const op of w.openings) {
        if (op.kind === 'door') {
          const t = typeof op.t === 'number' ? op.t : 0.5;
          const xPct = w.start.x + t * (w.end.x - w.start.x);
          const yPct = w.start.y + t * (w.end.y - w.start.y);
          doorZones.push({
            id: op.id || `wall_door_${xPct.toFixed(1)}_${yPct.toFixed(1)}`,
            cxM: pctToM_X(xPct),
            cyM: pctToM_Y(yPct),
            widthM: op.widthM || 1.2,
            storyId: w.storyId,
          });
        }
      }
    }
  }

  const sameStory = (s1?: string, s2?: string) => !s1 || !s2 || s1 === s2;

  // Passes de relaxation physique pour séparer les éléments et garantir les écarts
  for (let it = 0; it < iterations; it++) {
    const chairs = mutableItems.filter((item) => item.kind === 'chair');
    const tables = mutableItems.filter((item) => item.kind === 'table');
    const rows = mutableItems.filter((item) => item.kind === 'row');
    const zones = mutableItems.filter((item) => item.kind === 'zone');

    // 1. Anti-empilement et écartement des chaises
    const chairTarget = clearances.chairToChair * 1.15;
    for (let i = 0; i < chairs.length; i++) {
      for (let j = i + 1; j < chairs.length; j++) {
        const c1 = chairs[i];
        const c2 = chairs[j];
        if (!sameStory(c1.storyId, c2.storyId)) continue;

        const dx = c2.cxM - c1.cxM;
        const dy = c2.cyM - c1.cyM;
        const dist = Math.hypot(dx, dy);

        if (dist < chairTarget) {
          const overlap = chairTarget - dist;
          if (dist < 0.005) {
            const angle = (((i * 3 + j * 5) % 8) * Math.PI) / 4;
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);
            const shift = chairTarget * 0.5;
            c1.cxM -= nx * shift;
            c1.cyM -= ny * shift;
            c2.cxM += nx * shift;
            c2.cyM += ny * shift;
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const shift = overlap * 0.5;
            c1.cxM -= nx * shift;
            c1.cyM -= ny * shift;
            c2.cxM += nx * shift;
            c2.cyM += ny * shift;
          }
        }
      }
    }

    // 2. Écartement chaise isolée vs enveloppe de table
    for (const c of chairs) {
      for (const t of tables) {
        if (!sameStory(c.storyId, t.storyId)) continue;

        const dx = c.cxM - t.cxM;
        const dy = c.cyM - t.cyM;
        const dist = Math.hypot(dx, dy);
        const target = t.effectiveRadiusM + c.radiusM + clearances.chairToTable;

        if (dist < target) {
          const overlap = target - dist;
          let nx = 1;
          let ny = 0;
          if (dist >= 0.005) {
            nx = dx / dist;
            ny = dy / dist;
          }
          c.cxM += nx * overlap;
          c.cyM += ny * overlap;
        }
      }
    }

    // 3. Écartement table vs table (recul chaises + passage serveurs)
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const t1 = tables[i];
        const t2 = tables[j];
        if (!sameStory(t1.storyId, t2.storyId)) continue;

        const dx = t2.cxM - t1.cxM;
        const dy = t2.cyM - t1.cyM;
        const dist = Math.hypot(dx, dy);
        const target = t1.radiusM + t2.radiusM + clearances.tableToTable;

        if (dist < target) {
          const overlap = target - dist;
          if (dist < 0.005) {
            const angle = (((i * 2 + j * 4) % 6) * Math.PI) / 3;
            const nx = Math.cos(angle);
            const ny = Math.sin(angle);
            const shift = target * 0.5;
            t1.cxM -= nx * shift;
            t1.cyM -= ny * shift;
            t2.cxM += nx * shift;
            t2.cyM += ny * shift;
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const shift = overlap * 0.5;
            t1.cxM -= nx * shift;
            t1.cyM -= ny * shift;
            t2.cxM += nx * shift;
            t2.cyM += ny * shift;
          }
        }
      }
    }

    // 4. Écartement table vs rangée / banquette
    for (const t of tables) {
      for (const r of rows) {
        if (!sameStory(t.storyId, r.storyId)) continue;

        const dx = r.cxM - t.cxM;
        const dy = r.cyM - t.cyM;
        const targetX = t.halfWM + r.halfWM + clearances.tableToRow;
        const targetY = t.halfHM + r.halfHM + clearances.tableToRow;

        if (Math.abs(dx) < targetX && Math.abs(dy) < targetY) {
          const overlapX = targetX - Math.abs(dx);
          const overlapY = targetY - Math.abs(dy);

          if (overlapX < overlapY) {
            const sign = dx >= 0 ? 1 : -1;
            t.cxM -= sign * overlapX * 0.5;
            r.cxM += sign * overlapX * 0.5;
          } else {
            const sign = dy >= 0 ? 1 : -1;
            t.cyM -= sign * overlapY * 0.5;
            r.cyM += sign * overlapY * 0.5;
          }
        }
      }
    }

    // 5. Écartement chaise isolée vs rangée
    for (const c of chairs) {
      for (const r of rows) {
        if (!sameStory(c.storyId, r.storyId)) continue;
        const dx = c.cxM - r.cxM;
        const dy = c.cyM - r.cyM;
        const targetX = c.halfWM + r.halfWM + clearances.chairToRow;
        const targetY = c.halfHM + r.halfHM + clearances.chairToRow;

        if (Math.abs(dx) < targetX && Math.abs(dy) < targetY) {
          const overlapY = targetY - Math.abs(dy);
          const sign = dy >= 0 ? 1 : -1;
          c.cyM += sign * overlapY;
        }
      }
    }

    // 6. Écartement rangée vs rangée (théâtre / conférence)
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const r1 = rows[i];
        const r2 = rows[j];
        if (!sameStory(r1.storyId, r2.storyId)) continue;

        const overlapX = Math.abs(r1.cxM - r2.cxM) < r1.halfWM + r2.halfWM;
        if (overlapX) {
          const dy = Math.abs(r2.cyM - r1.cyM);
          const targetY = r1.halfHM + r2.halfHM + clearances.rowToRow;
          if (dy < targetY) {
            const overlap = targetY - dy;
            const sign = r2.cyM >= r1.cyM ? 1 : -1;
            r1.cyM -= sign * (overlap * 0.5);
            r2.cyM += sign * (overlap * 0.5);
          }
        }
      }
    }

    // 7. Dégagement des fixtures solides (scène, estrade, buffet, bar, régie DJ)
    for (const item of [...chairs, ...tables, ...rows]) {
      for (const fx of mutableFixtures) {
        if (!fx.isSolid || !sameStory(item.storyId, fx.storyId)) continue;

        const isServiceCounter =
          fx.kind === 'bar' ||
          fx.kind === 'buffet' ||
          fx.kind === 'orderCounter' ||
          fx.kind === 'pickupCounter' ||
          fx.kind === 'condimentStation' ||
          fx.kind === 'displayCase';
        const isStage = fx.kind === 'stage' || fx.kind === 'podium' || fx.kind === 'djBooth';
        const requiredClearance = isServiceCounter
          ? clearances.serviceCounterClearance
          : isStage
            ? clearances.stageClearance
            : fx.kind === 'column'
              ? clearances.columnClearance
              : clearances.fixtureClearance;

        const margin = item.radiusM + requiredClearance;
        const minX = fx.xM - margin;
        const maxX = fx.xM + fx.wM + margin;
        const minY = fx.yM - margin;
        const maxY = fx.yM + fx.hM + margin;

        if (item.cxM > minX && item.cxM < maxX && item.cyM > minY && item.cyM < maxY) {
          const candidates: Array<{ pos: number; axis: 'x' | 'y'; dist: number }> = [];
          if (minX >= clearances.wallMargin + item.halfWM) {
            candidates.push({ pos: minX, axis: 'x', dist: item.cxM - minX });
          }
          if (maxX <= widthM - clearances.wallMargin - item.halfWM) {
            candidates.push({ pos: maxX, axis: 'x', dist: maxX - item.cxM });
          }
          if (minY >= clearances.wallMargin + item.halfHM) {
            candidates.push({ pos: minY, axis: 'y', dist: item.cyM - minY });
          }
          if (maxY <= heightM - clearances.wallMargin - item.halfHM) {
            candidates.push({ pos: maxY, axis: 'y', dist: maxY - item.cyM });
          }

          if (candidates.length > 0) {
            candidates.sort((a, b) => a.dist - b.dist);
            const best = candidates[0];
            if (best.axis === 'x') item.cxM = best.pos;
            else item.cyM = best.pos;
          } else {
            item.cyM = maxY;
          }
        }
      }
    }

    // 8. Dégagement des portes et issues de secours
    for (const item of [...chairs, ...tables, ...rows]) {
      for (const door of doorZones) {
        if (!sameStory(item.storyId, door.storyId)) continue;
        const dx = item.cxM - door.cxM;
        const dy = item.cyM - door.cyM;
        const dist = Math.hypot(dx, dy);
        const target = clearances.doorClearance + item.radiusM;

        if (dist < target) {
          const overlap = target - dist;
          let nx = dx / (dist || 1);
          let ny = dy / (dist || 1);
          if (dist < 0.05) {
            // Pousser vers le centre de la salle
            nx = item.cxM < widthM / 2 ? 1 : -1;
            ny = item.cyM < heightM / 2 ? 1 : -1;
          }
          item.cxM += nx * overlap;
          item.cyM += ny * overlap;
        }
      }
    }

    // 9. Dégagement de l'allée d'honneur centrale (aisle runner)
    const aisleFixtures = mutableFixtures.filter((fx) => fx.kind === 'aisle');
    for (const item of [...chairs, ...tables]) {
      for (const aisle of aisleFixtures) {
        if (!sameStory(item.storyId, aisle.storyId)) continue;
        const minX = aisle.xM - clearances.aisleClearance - item.halfWM;
        const maxX = aisle.xM + aisle.wM + clearances.aisleClearance + item.halfWM;
        const minY = aisle.yM - item.halfHM;
        const maxY = aisle.yM + aisle.hM + item.halfHM;

        if (item.cxM > minX && item.cxM < maxX && item.cyM > minY && item.cyM < maxY) {
          // Pousser latéralement vers le côté le plus proche de l'allée
          const aisleMidX = aisle.xM + aisle.wM / 2;
          if (item.cxM <= aisleMidX) {
            item.cxM = Math.max(clearances.wallMargin + item.halfWM, minX);
          } else {
            item.cxM = Math.min(widthM - clearances.wallMargin - item.halfWM, maxX);
          }
        }
      }
    }

    // 10. Dégagement de la piste de danse (zone dance)
    const danceZones = zones.filter((z) => z.zoneKind === 'dance' || z.label?.toLowerCase().includes('piste'));
    for (const item of [...chairs, ...tables]) {
      for (const dz of danceZones) {
        if (!sameStory(item.storyId, dz.storyId)) continue;
        const minX = dz.cxM - dz.halfWM - clearances.danceFloorClearance - item.halfWM;
        const maxX = dz.cxM + dz.halfWM + clearances.danceFloorClearance + item.halfWM;
        const minY = dz.cyM - dz.halfHM - clearances.danceFloorClearance - item.halfHM;
        const maxY = dz.cyM + dz.halfHM + clearances.danceFloorClearance + item.halfHM;

        if (item.cxM > minX && item.cxM < maxX && item.cyM > minY && item.cyM < maxY) {
          const dLeft = Math.abs(item.cxM - minX);
          const dRight = Math.abs(maxX - item.cxM);
          const dTop = Math.abs(item.cyM - minY);
          const dBottom = Math.abs(maxY - item.cyM);
          const minD = Math.min(dLeft, dRight, dTop, dBottom);

          if (minD === dLeft) item.cxM = minX;
          else if (minD === dRight) item.cxM = maxX;
          else if (minD === dTop) item.cyM = minY;
          else item.cyM = maxY;
        }
      }
    }

    // 11. Circulation périphérique le long des murs extérieurs
    for (const item of mutableItems) {
      const minX = clearances.wallMargin + item.halfWM;
      const maxX = widthM - clearances.wallMargin - item.halfWM;
      const minY = clearances.wallMargin + item.halfHM;
      const maxY = heightM - clearances.wallMargin - item.halfHM;

      if (maxX >= minX) {
        item.cxM = Math.max(minX, Math.min(maxX, item.cxM));
      }
      if (maxY >= minY) {
        item.cyM = Math.max(minY, Math.min(maxY, item.cyM));
      }
    }
  }

  // Mapper les positions recalculées en pourcentages
  const itemMap = new Map(mutableItems.map((item) => [item.id, item]));

  const updatedFurniture = (blueprint.furniture || []).map((f) => {
    const item = itemMap.get(f.id);
    if (!item) return f;

    if (f.kind === 'zone') {
      const wM = pctToM_X(f.w ?? 10);
      const hM = pctToM_Y(f.h ?? 10);
      const leftM = item.cxM - wM / 2;
      const topM = item.cyM - hM / 2;
      return {
        ...f,
        x: clampPct(snapPct(mToPct_X(leftM), IMPORT_SNAP_STEP), 1, 99),
        y: clampPct(snapPct(mToPct_Y(topM), IMPORT_SNAP_STEP), 1, 99),
      };
    }

    return {
      ...f,
      x: clampPct(snapPct(mToPct_X(item.cxM), IMPORT_SNAP_STEP), 1, 99),
      y: clampPct(snapPct(mToPct_Y(item.cyM), IMPORT_SNAP_STEP), 1, 99),
    };
  });

  return {
    ...blueprint,
    furniture: updatedFurniture,
  };
}

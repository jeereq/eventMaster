export const IMPORT_SNAP_STEP = 0.5;

export function clampPct(value: number, min = 1, max = 99): number {
  return Math.max(min, Math.min(max, value));
}

export function snapPct(value: number, step = IMPORT_SNAP_STEP): number {
  if (!Number.isFinite(value) || step <= 0) return value;
  return Math.round(value / step) * step;
}

export const REAL_CLEARANCE_METERS = {
  /** Distance minimale centre-à-centre entre deux chaises (0.50m largeur + 0.20m espace libre) */
  chairToChair: 0.70,
  /** Distance minimale bord-à-bord entre tables pour recul des chaises et passage serveurs */
  tableToTable: 1.40,
  /** Distance minimale entre une chaise isolée et l'enveloppe d'une table */
  chairToTable: 0.80,
  /** Distance minimale entre rangées de sièges (allée de passage) */
  rowToRow: 0.90,
  /** Distance minimale entre mobilier et les murs extérieurs (circulation périphérique) */
  wallMargin: 0.90,
  /** Dégagement autour des estrades, scènes, buffets et bars */
  fixtureClearance: 1.20,
  /** Dégagement de part et d'autre d'une allée centrale */
  aisleClearance: 0.80,
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
]);

export function estimateTableSizeMeters(
  shape: string | undefined,
  capacity: number = 8,
): { wM: number; hM: number; radiusM: number } {
  if (shape === 'cocktail' || shape === 'highTop') {
    return { wM: 0.9, hM: 0.9, radiusM: 0.45 };
  }
  if (shape === 'rectangular' || shape === 'arc') {
    const wM = capacity >= 14 ? 3.2 : capacity >= 10 ? 2.6 : 2.0;
    const hM = 1.1;
    return { wM, hM, radiusM: Math.max(wM, hM) / 2 };
  }
  // Rond / carré / ovale
  const spanM = Math.max(1.2, Math.min(2.8, 1.0 + capacity * 0.12));
  return { wM: spanM, hM: spanM, radiusM: spanM / 2 };
}

export type MinimalBlueprintFurnitureItem = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
  shape?: string;
  capacity?: number;
  seatCount?: number;
  storyId?: string;
  zoneKind?: string;
};

export type MinimalBlueprintFixtureItem = {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  storyId?: string;
};

export type MinimalBlueprint = {
  canvas?: { widthM?: number; heightM?: number };
  furniture: any[];
  fixtures?: any[];
};

type MutableItem = {
  id: string;
  kind: string;
  cxM: number;
  cyM: number;
  halfWM: number;
  halfHM: number;
  radiusM: number;
  effectiveRadiusM: number;
  storyId?: string;
};

type MutableFixture = {
  id: string;
  kind: string;
  xM: number;
  yM: number;
  wM: number;
  hM: number;
  isSolid: boolean;
  storyId?: string;
};

/**
 * Empêche l'empilement des chaises et impose un écartement physique réel
 * (en mètres réels projetés sur le canvas) entre tables, chaises, rangées et murs.
 */
export function enforceRealLayoutClearances<T extends MinimalBlueprint>(
  blueprint: T,
  options?: {
    iterations?: number;
    clearances?: Partial<typeof REAL_CLEARANCE_METERS>;
  },
): T {
  const widthM = Math.max(5, blueprint.canvas?.widthM || 20);
  const heightM = Math.max(5, blueprint.canvas?.heightM || 16);

  const pctToM_X = (pct: number) => (pct / 100) * widthM;
  const pctToM_Y = (pct: number) => (pct / 100) * heightM;
  const mToPct_X = (m: number) => (m / widthM) * 100;
  const mToPct_Y = (m: number) => (m / heightM) * 100;

  const clearances = {
    ...REAL_CLEARANCE_METERS,
    ...options?.clearances,
  };

  const iterations = Math.max(4, Math.min(20, options?.iterations ?? 8));

  // Convertir le mobilier en coordonnées métriques
  const mutableItems: MutableItem[] = blueprint.furniture.map((f) => {
    const cxM = pctToM_X(f.x);
    const cyM = pctToM_Y(f.y);

    if (f.kind === 'chair') {
      return {
        id: f.id,
        kind: 'chair',
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
      const { wM, hM, radiusM } = estimateTableSizeMeters(f.shape, f.capacity);
      return {
        id: f.id,
        kind: 'table',
        cxM,
        cyM,
        halfWM: wM / 2 + 0.45,
        halfHM: hM / 2 + 0.45,
        radiusM,
        effectiveRadiusM: radiusM + 0.45,
        storyId: f.storyId,
      };
    }

    if (f.kind === 'row') {
      const seatCount = f.seatCount ?? 10;
      const wM = Math.min(widthM * 0.45, Math.max(1.8, seatCount * 0.50));
      const halfWM = wM / 2;
      const halfHM = 0.40;
      return {
        id: f.id,
        kind: 'row',
        cxM,
        cyM,
        halfWM,
        halfHM,
        radiusM: Math.max(halfWM, halfHM),
        effectiveRadiusM: Math.max(halfWM, halfHM),
        storyId: f.storyId,
      };
    }

    const wM = pctToM_X(f.w ?? 10);
    const hM = pctToM_Y(f.h ?? 10);
    return {
      id: f.id,
      kind: f.kind,
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
    xM: pctToM_X(fx.x),
    yM: pctToM_Y(fx.y),
    wM: pctToM_X(fx.w),
    hM: pctToM_Y(fx.h),
    isSolid: SOLID_FIXTURE_KINDS.has(fx.kind),
    storyId: fx.storyId,
  }));

  const sameStory = (s1?: string, s2?: string) => !s1 || !s2 || s1 === s2;

  // Passes de relaxation physique pour séparer les éléments et garantir les écarts
  for (let it = 0; it < iterations; it++) {
    const chairs = mutableItems.filter((item) => item.kind === 'chair');
    const tables = mutableItems.filter((item) => item.kind === 'table');
    const rows = mutableItems.filter((item) => item.kind === 'row');

    // 1. Anti-empilement et écartement des chaises
    // Marge de sécurité pour absorber l'arrondi snapPct (0.5% du canvas)
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
            // Empilement exact au même endroit : distribution angulaire déterministe
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

    // 3. Écartement table vs table (recul chaises + allée serveurs)
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

    // 4. Écartement rangée vs rangée
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const r1 = rows[i];
        const r2 = rows[j];
        if (!sameStory(r1.storyId, r2.storyId)) continue;

        const overlapX = Math.abs(r1.cxM - r2.cxM) < (r1.halfWM + r2.halfWM);
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

    // 5. Dégagement des fixtures solides (scène, estrade, buffet, bar)
    for (const item of [...chairs, ...tables]) {
      for (const fx of mutableFixtures) {
        if (!fx.isSolid || !sameStory(item.storyId, fx.storyId)) continue;

        const margin = item.radiusM + clearances.fixtureClearance;
        const minX = fx.xM - margin;
        const maxX = fx.xM + fx.wM + margin;
        const minY = fx.yM - margin;
        const maxY = fx.yM + fx.hM + margin;

        if (item.cxM > minX && item.cxM < maxX && item.cyM > minY && item.cyM < maxY) {
          // Filtrer les directions de sortie qui ne sont pas bloquées par un mur
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
            // Repli : dégager vers le bas (en face de l'estrade)
            item.cyM = maxY;
          }
        }
      }
    }

    // 6. Circulation périphérique le long des murs
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

  const updatedFurniture = blueprint.furniture.map((f) => {
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

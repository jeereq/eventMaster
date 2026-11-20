/**
 * Normes de sécurité et d’accessibilité d’une salle de réception (ERP, règlement
 * français de sécurité incendie et arrêté accessibilité du 20 avril 2017), appliquées
 * aux modèles de salles et vérifiables sur n’importe quel plan.
 *
 * - Dégagements (art. CO 38) : nombre d’issues et largeur en unités de passage (UP)
 *   selon l’effectif ; 1 UP = 0,90 m, 2 UP = 1,40 m, n UP = n × 0,60 m au-delà.
 * - Rangées de sièges (art. L 13) : 16 sièges au plus entre deux circulations.
 * - Places PMR : 2 jusqu’à 50 places, puis 1 par tranche de 50.
 * - Densité : surface par personne assise, à table ou en rangée.
 *
 * Module pur, testé avec `node --test`.
 */

export type NormCheckId = 'exits' | 'exitWidth' | 'rowLength' | 'pmr' | 'density';

export type NormCheck = {
  id: NormCheckId;
  label: string;
  ok: boolean;
  /** Valeur constatée et valeur exigée, en clair. */
  detail: string;
};

/** Ce qu’il faut au plan pour être vérifié (sous-ensemble du plan de salle). */
export type NormBlueprint = {
  canvas?: { widthM: number; heightM: number };
  roomOutline?: { shape?: string; x: number; y: number; w: number; h: number };
  walls?: Array<{ openings?: Array<{ kind: string; widthM?: number; style?: string }> }>;
  furniture: Array<
    | { kind: 'table'; capacity?: number }
    | { kind: 'row'; seatCount?: number; aisleSplit?: boolean; pmrSeatIndices?: number[] }
    | { kind: 'chair'; chairType?: string }
    | { kind: 'zone' }
  >;
  metadata?: { totalSeats?: number; showWalls?: boolean };
};

/** Unités de passage offertes par une porte de largeur donnée. */
export function exitUnits(widthM: number): number {
  if (!Number.isFinite(widthM) || widthM < 0.9) return 0;
  if (widthM < 1.4) return 1;
  if (widthM < 1.8) return 2;
  return Math.floor(widthM / 0.6 + 1e-6);
}

/** Largeur minimale (m) d’un dégagement de `units` unités de passage. */
export function exitWidthForUnits(units: number): number {
  if (units <= 1) return 0.9;
  if (units === 2) return 1.4;
  return Math.round(units * 0.6 * 100) / 100;
}

/** Issues et unités de passage exigées pour un effectif. */
export function requiredExits(occupancy: number): { exits: number; units: number } {
  const n = Math.max(0, Math.ceil(occupancy));
  if (n === 0) return { exits: 0, units: 0 };
  if (n < 20) return { exits: 1, units: 1 };
  if (n <= 50) return { exits: 1, units: 2 };
  if (n <= 500) return { exits: 2, units: Math.max(2, Math.ceil(n / 100)) };
  return { exits: 2 + Math.ceil((n - 500) / 500), units: Math.ceil(n / 100) };
}

/** Emplacements pour fauteuil roulant exigés dans une salle à places assises. */
export function requiredPmrPlaces(seats: number): number {
  const n = Math.max(0, Math.ceil(seats));
  if (n === 0) return 0;
  if (n <= 50) return 2;
  if (n <= 1000) return 2 + Math.ceil((n - 50) / 50);
  return 21 + Math.ceil((n - 1000) / 1000);
}

/** Sièges au plus entre deux circulations. */
export const MAX_SEATS_BETWEEN_AISLES = 16;

/** Surface minimale par personne (m²) : convives à table, public en rangées. */
export const MIN_AREA_PER_GUEST_M2 = { table: 1.2, row: 0.6 } as const;

export function outlineAreaM2(bp: NormBlueprint): number {
  const w = bp.canvas?.widthM ?? 20;
  const h = bp.canvas?.heightM ?? 16;
  const o = bp.roomOutline ?? { x: 5, y: 5, w: 90, h: 90, shape: 'rectangle' };
  const rect = (o.w / 100) * w * ((o.h / 100) * h);
  if (o.shape === 'circle') return (rect * Math.PI) / 4;
  if (o.shape === 'octagon') return rect * 0.83;
  return rect;
}

function seatsOf(bp: NormBlueprint): { table: number; row: number; total: number } {
  let table = 0;
  let row = 0;
  for (const item of bp.furniture) {
    if (item.kind === 'table') table += item.capacity ?? 0;
    else if (item.kind === 'row') row += item.seatCount ?? 0;
    else if (item.kind === 'chair') table += 1;
  }
  return { table, row, total: Math.max(bp.metadata?.totalSeats ?? 0, table + row) };
}

/** Plus long tronçon de rangée sans circulation (une allée centrale coupe la rangée en deux). */
export function longestRowRun(row: { seatCount?: number; aisleSplit?: boolean }): number {
  const n = row.seatCount ?? 0;
  return row.aisleSplit ? Math.ceil(n / 2) : n;
}

export function auditRoomNorms(bp: NormBlueprint): NormCheck[] {
  const seats = seatsOf(bp);
  const checks: NormCheck[] = [];
  const enclosed = bp.metadata?.showWalls !== false;

  if (enclosed && seats.total > 0) {
    const need = requiredExits(seats.total);
    const doors = (bp.walls ?? []).flatMap((w) => (w.openings ?? []).filter((o) => o.kind === 'door'));
    const exits = doors.filter((d) => exitUnits(d.widthM ?? 0.9) > 0);
    const units = exits.reduce((sum, d) => sum + exitUnits(d.widthM ?? 0.9), 0);
    checks.push({
      id: 'exits',
      label: 'Issues de secours',
      ok: exits.length >= need.exits,
      detail: `${exits.length} issue(s) pour ${seats.total} personnes, ${need.exits} exigée(s)`,
    });
    checks.push({
      id: 'exitWidth',
      label: 'Largeur des dégagements',
      ok: units >= need.units,
      detail: `${units} UP, ${need.units} UP exigée(s)`,
    });
  }

  const rows = bp.furniture.filter((f): f is Extract<NormBlueprint['furniture'][number], { kind: 'row' }> => f.kind === 'row');
  if (rows.length > 0) {
    const longest = Math.max(...rows.map(longestRowRun));
    checks.push({
      id: 'rowLength',
      label: 'Sièges entre deux circulations',
      ok: longest <= MAX_SEATS_BETWEEN_AISLES,
      detail: `${longest} au plus, ${MAX_SEATS_BETWEEN_AISLES} autorisés`,
    });
    const pmr = rows.reduce((sum, r) => sum + (r.pmrSeatIndices?.length ?? 0), 0)
      + bp.furniture.filter((f) => f.kind === 'chair' && f.chairType === 'WHEELCHAIR').length;
    const needPmr = requiredPmrPlaces(seats.row);
    checks.push({
      id: 'pmr',
      label: 'Emplacements fauteuil roulant',
      ok: pmr >= needPmr,
      detail: `${pmr} emplacement(s), ${needPmr} exigé(s)`,
    });
  }

  if (seats.total > 0) {
    const area = outlineAreaM2(bp);
    const needed = seats.table * MIN_AREA_PER_GUEST_M2.table + seats.row * MIN_AREA_PER_GUEST_M2.row;
    checks.push({
      id: 'density',
      label: 'Surface par personne',
      ok: area >= needed,
      detail: `${Math.round(area)} m² pour ${Math.round(needed)} m² minimum`,
    });
  }
  return checks;
}

export function isRoomCompliant(bp: NormBlueprint): boolean {
  return auditRoomNorms(bp).every((c) => c.ok);
}

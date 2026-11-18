/**
 * Emplacements sans murs : découpe d’un espace ouvert en surfaces numérotées
 * (stands, lots, coins). Chaque emplacement est une zone « plot » : aucun mur,
 * aucun revêtement, seulement une bordure (marquage, cordon) et un numéro au sol.
 * Module pur (sans three.js), testé dans roomPlots.test.ts.
 */
import { makeLayoutId, type PlotBorderStyle, type RoomLayoutBlueprint } from './roomLayoutUtils.ts';

type ZoneItem = Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'zone' }>;

export type PlotGridOptions = {
  /** Nombre d’emplacements (1–60). */
  count: number;
  /** Emplacements par rangée (1–12). */
  columns: number;
  /** Largeur et profondeur d’un emplacement (m). */
  widthM: number;
  depthM: number;
  /** Allée de circulation entre deux emplacements (m). */
  aisleM: number;
  border?: PlotBorderStyle;
  color?: string;
  storyId?: string;
};

export const PLOT_GRID_DEFAULTS: PlotGridOptions = {
  count: 6,
  columns: 3,
  widthM: 3,
  depthM: 3,
  aisleM: 1.5,
  border: 'paint',
};

/** Couleurs proposées pour distinguer des familles d’emplacements. */
export const PLOT_COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#e11d48', '#8b5cf6', '#64748b'] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round2 = (v: number) => Math.round(v * 100) / 100;

/** Numéro d’un emplacement : lettre de rangée + rang dans la rangée (A1, A2… B1…). */
export function plotCode(rowIndex: number, colIndex: number): string {
  let n = rowIndex;
  let letters = '';
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${letters}${colIndex + 1}`;
}

/** Normalise les réglages saisis (bornes réalistes). */
export function normalizePlotGrid(opts: Partial<PlotGridOptions>): PlotGridOptions {
  const count = Math.round(clamp(Number(opts.count) || PLOT_GRID_DEFAULTS.count, 1, 60));
  return {
    count,
    columns: Math.round(clamp(Number(opts.columns) || PLOT_GRID_DEFAULTS.columns, 1, Math.min(12, count))),
    widthM: round2(clamp(Number(opts.widthM) || PLOT_GRID_DEFAULTS.widthM, 0.5, 50)),
    depthM: round2(clamp(Number(opts.depthM) || PLOT_GRID_DEFAULTS.depthM, 0.5, 50)),
    aisleM: round2(clamp(Number.isFinite(Number(opts.aisleM)) ? Number(opts.aisleM) : PLOT_GRID_DEFAULTS.aisleM, 0, 20)),
    border: opts.border ?? PLOT_GRID_DEFAULTS.border,
    color: opts.color,
    storyId: opts.storyId,
  };
}

/** Emprise totale de la grille (m). */
export function plotGridFootprint(opts: PlotGridOptions): { widthM: number; depthM: number; rows: number } {
  const rows = Math.ceil(opts.count / opts.columns);
  return {
    widthM: round2(opts.columns * opts.widthM + (opts.columns - 1) * opts.aisleM),
    depthM: round2(rows * opts.depthM + (rows - 1) * opts.aisleM),
    rows,
  };
}

/**
 * Grille d’emplacements centrée sur `center` (en % du plan, centre de la salle par défaut).
 * `fits` est faux quand la grille déborde du plan : elle est alors recalée contre les bords.
 */
export function buildPlotGrid(
  canvas: { widthM: number; heightM: number },
  raw: Partial<PlotGridOptions>,
  center: { x: number; y: number } = { x: 50, y: 50 },
): { plots: ZoneItem[]; fits: boolean } {
  const opts = normalizePlotGrid(raw);
  const W = Math.max(1, canvas.widthM);
  const H = Math.max(1, canvas.heightM);
  const foot = plotGridFootprint(opts);
  const fits = foot.widthM <= W + 1e-6 && foot.depthM <= H + 1e-6;
  const cx = (center.x / 100) * W;
  const cy = (center.y / 100) * H;
  const left = clamp(cx - foot.widthM / 2, 0, Math.max(0, W - foot.widthM));
  const top = clamp(cy - foot.depthM / 2, 0, Math.max(0, H - foot.depthM));
  const groupId = makeLayoutId('plots');
  const plots: ZoneItem[] = [];
  for (let i = 0; i < opts.count; i += 1) {
    const row = Math.floor(i / opts.columns);
    const col = i % opts.columns;
    const xM = left + col * (opts.widthM + opts.aisleM);
    const yM = top + row * (opts.depthM + opts.aisleM);
    plots.push({
      id: makeLayoutId('zone'),
      kind: 'zone',
      label: plotCode(row, col),
      zoneKind: 'plot',
      plotBorder: opts.border,
      ...(opts.color ? { color: opts.color } : {}),
      x: round2((xM / W) * 100),
      y: round2((yM / H) * 100),
      w: round2((opts.widthM / W) * 100),
      h: round2((opts.depthM / H) * 100),
      groupId,
      ...(opts.storyId ? { storyId: opts.storyId } : {}),
    });
  }
  return { plots, fits };
}

/** Emplacement isolé de taille réelle (m), centré sur `center` (%). */
export function buildSinglePlot(
  canvas: { widthM: number; heightM: number },
  label: string,
  sizeM: { widthM: number; depthM: number } = { widthM: 3, depthM: 3 },
  center: { x: number; y: number } = { x: 50, y: 50 },
): ZoneItem {
  const W = Math.max(1, canvas.widthM);
  const H = Math.max(1, canvas.heightM);
  const w = Math.min(100, (sizeM.widthM / W) * 100);
  const h = Math.min(100, (sizeM.depthM / H) * 100);
  return {
    id: makeLayoutId('zone'),
    kind: 'zone',
    label,
    zoneKind: 'plot',
    plotBorder: 'paint',
    x: round2(clamp(center.x - w / 2, 0, 100 - w)),
    y: round2(clamp(center.y - h / 2, 0, 100 - h)),
    w: round2(w),
    h: round2(h),
  };
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Position libre (en %) pour un nouvel emplacement : la plus proche de sa position voulue
 * sans chevaucher les emplacements existants (écart d’au moins `gapPct`). Repli : position voulue.
 */
export function findFreePlotSpot(existing: Rect[], plot: Rect, gapPct = 2): { x: number; y: number } {
  const overlaps = (x: number, y: number) =>
    existing.some((r) => x < r.x + r.w + gapPct && x + plot.w + gapPct > r.x && y < r.y + r.h + gapPct && y + plot.h + gapPct > r.y);
  if (!overlaps(plot.x, plot.y)) return { x: plot.x, y: plot.y };
  let best: { x: number; y: number; d: number } | null = null;
  for (let y = 0; y <= 100 - plot.h + 1e-6; y += 1) {
    for (let x = 0; x <= 100 - plot.w + 1e-6; x += 1) {
      if (overlaps(x, y)) continue;
      const d = (x - plot.x) ** 2 + (y - plot.y) ** 2;
      if (!best || d < best.d) best = { x, y, d };
    }
  }
  return best ? { x: best.x, y: best.y } : { x: plot.x, y: plot.y };
}

/** Prochain numéro libre pour un emplacement isolé (« Emplacement 3 »). */
export function nextPlotLabel(blueprint: Pick<RoomLayoutBlueprint, 'furniture'>): string {
  const n = blueprint.furniture.filter((f) => f.kind === 'zone' && f.zoneKind === 'plot').length + 1;
  return `Emplacement ${n}`;
}

/** Espace ouvert : murs et toit masqués (rien n’est supprimé, on peut les réafficher). */
export function isOpenSpace(metadata?: RoomLayoutBlueprint['metadata'] | null): boolean {
  return metadata?.showWalls === false && metadata?.showRoof === false;
}

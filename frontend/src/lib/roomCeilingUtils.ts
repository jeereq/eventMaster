/** Styles de lustres / suspensions au plafond. */
export type ChandelierType =
  | 'classic'
  | 'crystal'
  | 'modern'
  | 'industrial'
  | 'lantern'
  | 'recessed';

export const CHANDELIER_TYPE_ORDER: ChandelierType[] = [
  'classic',
  'crystal',
  'modern',
  'industrial',
  'lantern',
  'recessed',
];

export const chandelierTypeLabels: Record<ChandelierType, string> = {
  classic: 'Classique or',
  crystal: 'Cristal',
  modern: 'Moderne',
  industrial: 'Industriel',
  lantern: 'Lanterne',
  recessed: 'Spots plafond',
};

export const chandelierTypeHints: Record<ChandelierType, string> = {
  classic: 'Bras dorés, ampoules chaudes',
  crystal: 'Gouttes de cristal, gala',
  modern: 'Cylindre minimal',
  industrial: 'Métal noir, loft',
  lantern: 'Cage décorative',
  recessed: 'Encastrés discrets',
};

export function resolveChandelierType(value?: string | null): ChandelierType {
  if (value && value in chandelierTypeLabels) return value as ChandelierType;
  return 'classic';
}

export function resolveChandelierCount(value?: number | null, qualityMax = 4): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : Math.min(3, qualityMax);
  return Math.max(1, Math.min(5, Math.min(qualityMax, Math.round(n))));
}

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

/**
 * Nombre de lustres « automatiques » (réglage Lustres au plafond) réellement affichés.
 *
 * Les lustres posés sur le plan sont la seule source dès qu’il y en a un : les thèmes, les modèles
 * et le mode présentation activent aussi les lustres automatiques, qui venaient alors s’ajouter
 * à ceux que l’on avait choisis (un lustre posé en donnait quatre au plafond).
 */
export function ceilingChandelierCount(
  metadata: { showChandeliers?: boolean; chandelierCount?: number | null },
  fixtures: ReadonlyArray<{ kind: string }>,
  qualityMax = 4,
): number {
  if (metadata.showChandeliers !== true) return 0;
  if (fixtures.some((f) => f.kind === 'chandelier')) return 0;
  return resolveChandelierCount(metadata.chandelierCount, qualityMax);
}

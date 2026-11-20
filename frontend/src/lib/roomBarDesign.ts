/**
 * Habillage des bars : façade, plateau, arrière-bar et tabourets.
 *
 * Chaque type de bar (cocktail, vin, bières…) a son propre habillage par défaut, pour qu’un
 * bar à vins ne ressemble plus à un bar cocktail recoloré. L’utilisateur peut ensuite changer
 * chaque partie séparément depuis l’éditeur.
 */

import type { BarStyle } from '@/lib/roomLayoutUtils';

export type BarFront =
  | 'slats'
  | 'fluted'
  | 'staves'
  | 'deco'
  | 'planks'
  | 'metro'
  | 'tufted'
  | 'backlit'
  | 'cane'
  | 'terrazzo'
  | 'tiles'
  | 'bamboo'
  | 'neon'
  | 'stripes';

export type BarTop = 'marble' | 'blackMarble' | 'oak' | 'walnut' | 'zinc' | 'terrazzo' | 'concrete' | 'quartz';

export type BarBack = 'mirror' | 'wineWall' | 'kegs' | 'cafe' | 'amber' | 'neon' | 'tiki' | 'candy';

export type BarStool = 'leather' | 'velvet' | 'wood' | 'industrial' | 'rattan' | 'none';

/** Métal des accessoires : repose-pieds, poignées, piètements. */
export type BarMetal = 'brass' | 'chrome' | 'black';

export type BarDesign = {
  front: BarFront;
  top: BarTop;
  back: BarBack;
  stool: BarStool;
  metal: BarMetal;
};

export const BAR_FRONT_LABELS: Record<BarFront, string> = {
  slats: 'Tasseaux bois',
  fluted: 'Cannelures',
  staves: 'Douelles de tonneau',
  deco: 'Laque Art déco',
  planks: 'Planches brutes',
  metro: 'Carrelage métro',
  tufted: 'Cuir capitonné',
  backlit: 'Onyx rétroéclairé',
  cane: 'Cannage',
  terrazzo: 'Terrazzo',
  tiles: 'Tomettes',
  bamboo: 'Bambou (paillote)',
  neon: 'Lignes LED (club)',
  stripes: 'Rayures bonbon',
};

export const BAR_TOP_LABELS: Record<BarTop, string> = {
  marble: 'Marbre blanc',
  blackMarble: 'Marbre noir',
  oak: 'Chêne massif',
  walnut: 'Noyer',
  zinc: 'Zinc',
  terrazzo: 'Terrazzo',
  concrete: 'Béton ciré',
  quartz: 'Quartz blanc',
};

export const BAR_BACK_LABELS: Record<BarBack, string> = {
  mirror: 'Miroir et étagères',
  wineWall: 'Casier à vins',
  kegs: 'Fûts et ardoise',
  cafe: 'Étagères ouvertes',
  amber: 'Rétroéclairage ambré',
  neon: 'Néon',
  tiki: 'Paillote bambou',
  candy: 'Bocaux de bonbons',
};

export const BAR_STOOL_LABELS: Record<BarStool, string> = {
  leather: 'Cuir à dossier',
  velvet: 'Velours',
  wood: 'Bois',
  industrial: 'Métal industriel',
  rattan: 'Rotin',
  none: 'Sans tabouret',
};

export const BAR_METAL_LABELS: Record<BarMetal, string> = {
  brass: 'Laiton',
  chrome: 'Chrome',
  black: 'Acier noir',
};

/** Habillage par défaut de chaque type de bar. */
export const BAR_STYLE_DESIGN: Record<BarStyle, BarDesign> = {
  cocktail: { front: 'fluted', top: 'marble', back: 'mirror', stool: 'leather', metal: 'brass' },
  wine: { front: 'staves', top: 'oak', back: 'wineWall', stool: 'wood', metal: 'black' },
  champagne: { front: 'deco', top: 'blackMarble', back: 'mirror', stool: 'velvet', metal: 'brass' },
  beer: { front: 'planks', top: 'oak', back: 'kegs', stool: 'industrial', metal: 'black' },
  coffee: { front: 'metro', top: 'walnut', back: 'cafe', stool: 'wood', metal: 'chrome' },
  whiskey: { front: 'tufted', top: 'walnut', back: 'amber', stool: 'leather', metal: 'brass' },
  island: { front: 'slats', top: 'marble', back: 'mirror', stool: 'leather', metal: 'brass' },
  lShaped: { front: 'slats', top: 'marble', back: 'mirror', stool: 'leather', metal: 'brass' },
  juice: { front: 'terrazzo', top: 'marble', back: 'cafe', stool: 'rattan', metal: 'chrome' },
  mocktail: { front: 'backlit', top: 'marble', back: 'neon', stool: 'velvet', metal: 'chrome' },
  tapas: { front: 'tiles', top: 'zinc', back: 'wineWall', stool: 'wood', metal: 'black' },
  tea: { front: 'cane', top: 'oak', back: 'cafe', stool: 'rattan', metal: 'brass' },
  tiki: { front: 'bamboo', top: 'walnut', back: 'tiki', stool: 'rattan', metal: 'black' },
  gin: { front: 'fluted', top: 'marble', back: 'mirror', stool: 'velvet', metal: 'brass' },
  dessert: { front: 'stripes', top: 'quartz', back: 'candy', stool: 'velvet', metal: 'brass' },
  iceCream: { front: 'stripes', top: 'quartz', back: 'cafe', stool: 'velvet', metal: 'chrome' },
  neonClub: { front: 'neon', top: 'blackMarble', back: 'neon', stool: 'industrial', metal: 'chrome' },
  oyster: { front: 'metro', top: 'zinc', back: 'wineWall', stool: 'wood', metal: 'chrome' },
  cart: { front: 'stripes', top: 'oak', back: 'mirror', stool: 'none', metal: 'brass' },
};

function pick<T extends string>(value: unknown, labels: Record<T, string>, fallback: T): T {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(labels, value) ? (value as T) : fallback;
}

/** Habillage effectif : celui du type de bar, avec les choix de l’utilisateur par-dessus. */
export function resolveBarDesign(
  style: BarStyle | undefined,
  overrides?: { barFront?: unknown; barTop?: unknown; barBack?: unknown; barStool?: unknown; barMetal?: unknown },
): BarDesign {
  const base = BAR_STYLE_DESIGN[style ?? 'cocktail'] ?? BAR_STYLE_DESIGN.cocktail;
  return {
    front: pick(overrides?.barFront, BAR_FRONT_LABELS, base.front),
    top: pick(overrides?.barTop, BAR_TOP_LABELS, base.top),
    back: pick(overrides?.barBack, BAR_BACK_LABELS, base.back),
    stool: pick(overrides?.barStool, BAR_STOOL_LABELS, base.stool),
    metal: pick(overrides?.barMetal, BAR_METAL_LABELS, base.metal),
  };
}

/**
 * Arts de la table : services d’assiettes (sous-assiette, assiette, couverts, verres, serviette)
 * et centres de table. Partagé par la vue 3D (couverts posés devant chaque convive) et le plan 2D
 * (pastille d’assiette et de centre aux mêmes couleurs).
 *
 * Module pur (sans three.js).
 */

export type CouvertStyle =
  | 'classic'
  | 'gold'
  | 'festive'
  | 'silver'
  | 'black'
  | 'rustic'
  | 'marble'
  | 'rattan'
  | 'beaded'
  | 'emerald'
  | 'cobalt'
  | 'blush'
  | 'scalloped'
  | 'bistro';

/** Sous-assiette : matière et forme. */
export type ChargerKind = 'metal' | 'glass' | 'wood' | 'rattan' | 'marble' | 'beaded' | 'ceramic' | 'scalloped' | 'none';

/** Pliage de serviette. */
export type NapkinFold = 'flat' | 'ring' | 'pocket' | 'knot' | 'fan';

export type CouvertSpec = {
  charger: ChargerKind;
  chargerColor: string;
  plate: string;
  /** Filet décoratif sur l’aile de l’assiette (null : assiette unie). */
  rim: string | null;
  /** Assiette creuse posée sur l’assiette plate (entrée / soupe). */
  bowl: string | null;
  flatware: string;
  /** 0 = mat (noir, laiton brossé), 1 = miroir. */
  flatwareShine: number;
  napkin: string;
  fold: NapkinFold;
  /** Rond de serviette ou ruban. */
  napkinAccent: string;
  glass: string;
  /** Verres teintés (ambre, rose, vert) plutôt que cristal clair. */
  tintedGlass: boolean;
};

export const COUVERT_SPECS: Record<CouvertStyle, CouvertSpec> = {
  classic: {
    charger: 'metal', chargerColor: '#d9dde3', plate: '#fafaf9', rim: '#cbd5e1', bowl: null,
    flatware: '#d4d8de', flatwareShine: 0.95, napkin: '#fcfbf9', fold: 'ring', napkinAccent: '#cbd5e1',
    glass: '#f8fafc', tintedGlass: false,
  },
  gold: {
    charger: 'metal', chargerColor: '#c9a227', plate: '#fbf8ee', rim: '#d4af37', bowl: null,
    flatware: '#d4af37', flatwareShine: 0.9, napkin: '#fcfbf9', fold: 'ring', napkinAccent: '#d4af37',
    glass: '#f8fafc', tintedGlass: false,
  },
  festive: {
    charger: 'metal', chargerColor: '#be185d', plate: '#fdf2f8', rim: '#db2777', bowl: null,
    flatware: '#cbd5e1', flatwareShine: 0.95, napkin: '#fbcfe8', fold: 'fan', napkinAccent: '#db2777',
    glass: '#f9a8d4', tintedGlass: true,
  },
  silver: {
    charger: 'beaded', chargerColor: '#c0c6cf', plate: '#ffffff', rim: '#aab2bd', bowl: '#ffffff',
    flatware: '#e5e7eb', flatwareShine: 1, napkin: '#e5e7eb', fold: 'pocket', napkinAccent: '#9ca3af',
    glass: '#f8fafc', tintedGlass: false,
  },
  black: {
    charger: 'ceramic', chargerColor: '#18181b', plate: '#27272a', rim: null, bowl: null,
    flatware: '#1c1c1e', flatwareShine: 0.25, napkin: '#3f3f46', fold: 'flat', napkinAccent: '#b08d57',
    glass: '#e4e4e7', tintedGlass: false,
  },
  rustic: {
    charger: 'wood', chargerColor: '#8b5a2b', plate: '#e8dccb', rim: '#b9a184', bowl: '#d9c7ae',
    flatware: '#b08d57', flatwareShine: 0.4, napkin: '#c8b79e', fold: 'knot', napkinAccent: '#8a7a5c',
    glass: '#f3efe6', tintedGlass: false,
  },
  marble: {
    charger: 'marble', chargerColor: '#f1efea', plate: '#ffffff', rim: '#c9a227', bowl: null,
    flatware: '#c9a227', flatwareShine: 0.75, napkin: '#f5f5f4', fold: 'pocket', napkinAccent: '#c9a227',
    glass: '#f8fafc', tintedGlass: false,
  },
  rattan: {
    charger: 'rattan', chargerColor: '#c79a5b', plate: '#fbf7f0', rim: null, bowl: '#f3ece0',
    flatware: '#b08d57', flatwareShine: 0.5, napkin: '#c46a42', fold: 'knot', napkinAccent: '#d6b98c',
    glass: '#f6e7c8', tintedGlass: true,
  },
  beaded: {
    charger: 'glass', chargerColor: '#d4af37', plate: '#ffffff', rim: '#d4af37', bowl: null,
    flatware: '#d4af37', flatwareShine: 0.9, napkin: '#faf7f2', fold: 'fan', napkinAccent: '#d4af37',
    glass: '#fff7dc', tintedGlass: false,
  },
  emerald: {
    charger: 'metal', chargerColor: '#c9a227', plate: '#14532d', rim: '#d4af37', bowl: '#ffffff',
    flatware: '#d4af37', flatwareShine: 0.85, napkin: '#f5f0e8', fold: 'ring', napkinAccent: '#d4af37',
    glass: '#bbf7d0', tintedGlass: true,
  },
  cobalt: {
    charger: 'metal', chargerColor: '#c0c6cf', plate: '#ffffff', rim: '#1e40af', bowl: '#1e3a8a',
    flatware: '#e5e7eb', flatwareShine: 1, napkin: '#1e3a8a', fold: 'pocket', napkinAccent: '#d4af37',
    glass: '#dbeafe', tintedGlass: false,
  },
  blush: {
    charger: 'glass', chargerColor: '#f2b8c6', plate: '#fff5f7', rim: '#b76e79', bowl: null,
    flatware: '#b76e79', flatwareShine: 0.8, napkin: '#f9d5dc', fold: 'knot', napkinAccent: '#b76e79',
    glass: '#fbcfe8', tintedGlass: true,
  },
  scalloped: {
    charger: 'scalloped', chargerColor: '#f5efe3', plate: '#ffffff', rim: '#9ca3af', bowl: '#ffffff',
    flatware: '#d4d8de', flatwareShine: 0.95, napkin: '#e0ecd9', fold: 'flat', napkinAccent: '#7f9a74',
    glass: '#f8fafc', tintedGlass: false,
  },
  bistro: {
    charger: 'none', chargerColor: '#ffffff', plate: '#ffffff', rim: '#1e3a5f', bowl: null,
    flatware: '#d4d8de', flatwareShine: 0.9, napkin: '#b91c1c', fold: 'flat', napkinAccent: '#ffffff',
    glass: '#f8fafc', tintedGlass: false,
  },
};

export const couvertStyleLabels: Record<CouvertStyle, string> = {
  classic: 'Porcelaine classique',
  gold: 'Or & liseré',
  festive: 'Festif (verre teinté)',
  silver: 'Argent perlé & cristal',
  black: 'Noir mat moderne',
  rustic: 'Grès artisanal & bois',
  marble: 'Marbre blanc & laiton',
  rattan: 'Rotin bohème',
  beaded: 'Verre perlé doré',
  emerald: 'Émeraude & or',
  cobalt: 'Bleu cobalt',
  blush: 'Rose poudré & or rose',
  scalloped: 'Festonné champêtre',
  bistro: 'Bistrot (sans sous-assiette)',
};

export const couvertStyleHints: Record<CouvertStyle, string> = {
  classic: 'Sous-assiette argentée, assiette blanche, rond de serviette',
  gold: 'Sous-assiette dorée, filet or, couverts dorés',
  festive: 'Sous-assiette fuchsia, serviette en éventail, verres rosés',
  silver: 'Sous-assiette à perles argentées, assiette creuse, serviette en pochette',
  black: 'Grès noir, couverts noir mat, serviette anthracite',
  rustic: 'Rondin de bois, grès beige, serviette lin nouée',
  marble: 'Plateau marbre veiné, filet or, couverts laiton',
  rattan: 'Tressage rotin, serviette terracotta, verres ambrés',
  beaded: 'Verre doré à bord perlé, serviette en éventail',
  emerald: 'Assiette vert émeraude, sous-assiette dorée',
  cobalt: 'Filet bleu royal, assiette creuse cobalt',
  blush: 'Verre rose, couverts or rose, serviette nouée',
  scalloped: 'Bord festonné crème, serviette sauge',
  bistro: 'Assiette à filet bleu, serviette rouge à plat',
};

export function isCouvertStyle(value: unknown): value is CouvertStyle {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(COUVERT_SPECS, value);
}

export function resolveCouvertSpec(style: unknown): CouvertSpec {
  return isCouvertStyle(style) ? COUVERT_SPECS[style] : COUVERT_SPECS.classic;
}

/* ---------------------------------------------------------------------------------------------
 * Centres de table.
 * ------------------------------------------------------------------------------------------- */

export type CenterpieceStyle =
  | 'floral'
  | 'greeneryRunner'
  | 'candleCluster'
  | 'candelabra'
  | 'lanterns'
  | 'pampas'
  | 'floatingCandles'
  | 'fruitBowl'
  | 'mirrorVotives'
  | 'succulents'
  | 'rosePomander'
  | 'tropical';

export const centerpieceStyleLabels: Record<CenterpieceStyle, string> = {
  floral: 'Bouquet haut',
  greeneryRunner: 'Runner verdure',
  candleCluster: 'Bougies',
  candelabra: 'Candélabre doré 5 branches',
  lanterns: 'Trio de lanternes',
  pampas: 'Vase & herbes de pampa',
  floatingCandles: 'Bougies flottantes',
  fruitBowl: 'Coupe de fruits',
  mirrorVotives: 'Miroir & photophores',
  succulents: 'Jardinière de succulentes',
  rosePomander: 'Boule de roses sur pied',
  tropical: 'Feuillages tropicaux',
};

export const centerpieceStyleHints: Record<CenterpieceStyle, string> = {
  floral: 'Vase doré élancé et bouquet',
  greeneryRunner: 'Eucalyptus le long de la table, bougies',
  candleCluster: 'Trois bougies sur couronne de feuillage',
  candelabra: 'Chandelier baroque et bougies allumées',
  lanterns: 'Lanternes métal noir, verre et bougie',
  pampas: 'Céramique mate, plumes de pampa (bohème)',
  floatingCandles: 'Cylindres de verre, eau et pétales',
  fruitBowl: 'Compotier doré, agrumes et raisin',
  mirrorVotives: 'Plateau miroir, photophores en cristal',
  succulents: 'Caisse en bois, plantes grasses',
  rosePomander: 'Sphère de roses sur coupe argentée',
  tropical: 'Monstera, palmes et orchidées',
};

/** Teinte dominante (pastille du plan 2D). */
export const centerpieceStyleColor: Record<CenterpieceStyle, string> = {
  floral: '#e8b4c4',
  greeneryRunner: '#7fa36b',
  candleCluster: '#f5e6c4',
  candelabra: '#c9a227',
  lanterns: '#27272a',
  pampas: '#e3cfa8',
  floatingCandles: '#bfe3ef',
  fruitBowl: '#f59e0b',
  mirrorVotives: '#d6dde6',
  succulents: '#6b8f71',
  rosePomander: '#e11d48',
  tropical: '#166534',
};

export function isCenterpieceStyle(value: unknown): value is CenterpieceStyle {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(centerpieceStyleLabels, value);
}

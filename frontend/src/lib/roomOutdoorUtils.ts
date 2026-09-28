/**
 * Aménagements extérieurs : végétation, eau, feu, clôtures (fixture `landscape`)
 * et abords de la salle (terrain qui entoure le plan en 3D : jardin, plage, forêt…).
 */

export type LandscapeStyle =
  | 'oak'
  | 'palm'
  | 'olive'
  | 'cypress'
  | 'hedge'
  | 'shrub'
  | 'planter'
  | 'pool'
  | 'pond'
  | 'firePit'
  | 'torch'
  | 'fence'
  | 'boulder';

export type LandscapeGroup = 'vegetation' | 'water' | 'ambiance';

export type LandscapeMeta = {
  label: string;
  hint: string;
  group: LandscapeGroup;
  /** Empreinte par défaut en mètres (largeur × profondeur). */
  widthM: number;
  depthM: number;
  /** Hauteur par défaut (m) ; profondeur d’eau pour piscine et bassin. */
  heightM: number;
  color: string;
};

export const LANDSCAPE_STYLE_META: Record<LandscapeStyle, LandscapeMeta> = {
  oak: { label: 'Arbre feuillu', hint: 'Chêne ou tilleul, large couronne d’ombre.', group: 'vegetation', widthM: 5, depthM: 5, heightM: 7, color: '#3f6b2a' },
  palm: { label: 'Palmier', hint: 'Tronc annelé et palmes, idéal plage et bord de piscine.', group: 'vegetation', widthM: 3.5, depthM: 3.5, heightM: 6.5, color: '#4c7a2e' },
  olive: { label: 'Olivier', hint: 'Tronc noueux, feuillage argenté, ambiance méditerranéenne.', group: 'vegetation', widthM: 3.2, depthM: 3.2, heightM: 4, color: '#7d8c62' },
  cypress: { label: 'Cyprès', hint: 'Colonne verte élancée pour border une allée.', group: 'vegetation', widthM: 1.2, depthM: 1.2, heightM: 7, color: '#2d4a26' },
  hedge: { label: 'Haie taillée', hint: 'Buis ou charmille au cordeau : délimite, cache, guide.', group: 'vegetation', widthM: 6, depthM: 0.8, heightM: 1.3, color: '#355e2a' },
  shrub: { label: 'Massif fleuri', hint: 'Buissons arrondis parsemés de fleurs.', group: 'vegetation', widthM: 2.4, depthM: 1.6, heightM: 0.9, color: '#4a7a34' },
  planter: { label: 'Jardinière', hint: 'Bac en bois garni de graminées.', group: 'vegetation', widthM: 1.6, depthM: 0.6, heightM: 0.9, color: '#6b4a2e' },
  pool: { label: 'Piscine', hint: 'Bassin carrelé, margelles en pierre, eau turquoise.', group: 'water', widthM: 10, depthM: 5, heightM: 1.4, color: '#2aa7c9' },
  pond: { label: 'Bassin naturel', hint: 'Plan d’eau aux berges de galets et nénuphars.', group: 'water', widthM: 5, depthM: 3.5, heightM: 0.6, color: '#2f6b5e' },
  firePit: { label: 'Brasero', hint: 'Foyer en acier avec flammes et lueur chaude.', group: 'ambiance', widthM: 1.2, depthM: 1.2, heightM: 0.5, color: '#3b3b3b' },
  torch: { label: 'Torche de jardin', hint: 'Torche tiki en bambou, flamme vive.', group: 'ambiance', widthM: 0.4, depthM: 0.4, heightM: 1.7, color: '#a47a45' },
  fence: { label: 'Clôture bois', hint: 'Barrière à lattes pour fermer un enclos ou un parking.', group: 'ambiance', widthM: 6, depthM: 0.2, heightM: 1.1, color: '#b08a5a' },
  boulder: { label: 'Rochers', hint: 'Groupe de rochers pour un décor minéral.', group: 'ambiance', widthM: 2, depthM: 1.6, heightM: 0.9, color: '#8a857c' },
};

export const LANDSCAPE_GROUP_LABELS: Record<LandscapeGroup, string> = {
  vegetation: 'Végétation',
  water: 'Eau',
  ambiance: 'Feu, clôtures & minéral',
};

export const LANDSCAPE_STYLE_ORDER: LandscapeStyle[] = [
  'oak', 'palm', 'olive', 'cypress', 'hedge', 'shrub', 'planter',
  'pool', 'pond',
  'firePit', 'torch', 'fence', 'boulder',
];

export function isLandscapeStyle(value: unknown): value is LandscapeStyle {
  return typeof value === 'string' && value in LANDSCAPE_STYLE_META;
}

/** Empreinte par défaut en % du plan, pour une salle de `widthM` × `depthM`. */
export function landscapeFootprintPct(style: LandscapeStyle, widthM: number, depthM: number) {
  const meta = LANDSCAPE_STYLE_META[style];
  const clampPct = (v: number) => Math.max(1.5, Math.min(90, v));
  return {
    w: clampPct((meta.widthM / Math.max(1, widthM)) * 100),
    h: clampPct((meta.depthM / Math.max(1, depthM)) * 100),
  };
}

// ───────────────────────── abords de la salle ─────────────────────────

export type OutdoorSurroundings =
  | 'none'
  | 'garden'
  | 'park'
  | 'beach'
  | 'countryside'
  | 'forest'
  | 'courtyard'
  | 'desert';

export type SurroundingsMeta = {
  label: string;
  hint: string;
  /** Texture du terrain autour du plan. */
  groundUrl: string;
  /** Taille réelle (m) d’une tuile de texture de terrain. */
  groundTileM: number;
  /** Couleur de l’horizon (brume lointaine). */
  horizon: string;
};

export const OUTDOOR_SURROUNDINGS_META: Record<Exclude<OutdoorSurroundings, 'none'>, SurroundingsMeta> = {
  garden: { label: 'Jardin à la française', hint: 'Pelouse, haies taillées, cyprès et massifs fleuris.', groundUrl: '/floors/gen/grass-striped.jpg', groundTileM: 6, horizon: '#cfe0c3' },
  park: { label: 'Parc arboré', hint: 'Grande pelouse, chênes et bosquets.', groundUrl: '/floors/gen/grass-lawn.jpg', groundTileM: 2.2, horizon: '#c9dcc0' },
  beach: { label: 'Plage', hint: 'Sable, palmiers et mer à l’horizon.', groundUrl: '/floors/gen/sand.jpg', groundTileM: 3, horizon: '#cfe7f2' },
  countryside: { label: 'Campagne & vignes', hint: 'Prairie, rangées de vignes et oliviers.', groundUrl: '/floors/gen/meadow.jpg', groundTileM: 2.6, horizon: '#dfe3c6' },
  forest: { label: 'Clairière en forêt', hint: 'Sous-bois, sapins et feuillus tout autour.', groundUrl: '/floors/gen/dirt.jpg', groundTileM: 3, horizon: '#b8c7ae' },
  courtyard: { label: 'Cour pavée', hint: 'Pavés, murets en pierre et jardinières.', groundUrl: '/floors/gen/pavers-fan.jpg', groundTileM: 2.8, horizon: '#e2ddd3' },
  desert: { label: 'Désert & oasis', hint: 'Dunes, rochers et palmiers.', groundUrl: '/floors/gen/sand.jpg', groundTileM: 4, horizon: '#f0dcc0' },
};

export const OUTDOOR_SURROUNDINGS_ORDER: OutdoorSurroundings[] = [
  'none', 'garden', 'park', 'beach', 'countryside', 'forest', 'courtyard', 'desert',
];

export function resolveOutdoorSurroundings(value: unknown): OutdoorSurroundings {
  return typeof value === 'string' && (value === 'none' || value in OUTDOOR_SURROUNDINGS_META)
    ? (value as OutdoorSurroundings)
    : 'none';
}

/** Générateur pseudo-aléatoire à graine : même décor d’une ouverture à l’autre. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

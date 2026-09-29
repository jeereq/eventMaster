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
  | 'desert'
  | 'custom';

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
  custom: { label: 'Sur mesure', hint: 'Terrain nu : composez vous-même arbres, rochers et relief.', groundUrl: '/floors/gen/grass-lawn.jpg', groundTileM: 2.2, horizon: '#d6e2cf' },
};

export const OUTDOOR_SURROUNDINGS_ORDER: OutdoorSurroundings[] = [
  'none', 'garden', 'park', 'beach', 'countryside', 'forest', 'courtyard', 'desert', 'custom',
];

// ───────────────────────── environnement sur mesure ─────────────────────────

/** Éléments de décor que l’on peut ajouter ou retirer autour du plan. */
export type SurroundingSpecies = 'oak' | 'palm' | 'olive' | 'cypress' | 'fir' | 'shrub' | 'boulder' | 'torch' | 'planter';

export const SURROUNDING_SPECIES_ORDER: SurroundingSpecies[] = [
  'oak', 'fir', 'palm', 'olive', 'cypress', 'shrub', 'boulder', 'planter', 'torch',
];

export const SURROUNDING_SPECIES_LABELS: Record<SurroundingSpecies, string> = {
  oak: 'Feuillus',
  fir: 'Sapins',
  palm: 'Palmiers',
  olive: 'Oliviers',
  cypress: 'Cyprès',
  shrub: 'Massifs fleuris',
  boulder: 'Rochers',
  planter: 'Jardinières',
  torch: 'Torches',
};

/** Structures construites des abords (haies, murets, vignes) et éléments naturels. */
export type SurroundingFeature = 'structures' | 'water' | 'relief';

export const SURROUNDING_FEATURE_LABELS: Record<SurroundingFeature, string> = {
  structures: 'Haies, murets & vignes',
  water: 'Mer & bassins',
  relief: 'Dunes & relief',
};

/**
 * Réglages libres de l’environnement (stockés dans `metadata.environment`).
 * Tout est optionnel : un champ absent garde la valeur du décor et de l’éclairage choisis.
 */
export type EnvironmentSettings = {
  /** Texture du terrain (générée ou image importée). */
  groundUrl?: string;
  /** Taille réelle (m) d’une tuile de terrain. */
  groundTileM?: number;
  /** Teinte multipliée sur le terrain. */
  groundTint?: string;
  /** Multiplicateur de densité du décor (0 = nu, 1 = normal, 2.5 = très dense). */
  density?: number;
  /** Échelle des arbres et buissons. */
  vegetationScale?: number;
  /** Distance du décor au plan (multiplicateur). */
  spread?: number;
  /** Tirage aléatoire : change la disposition sans changer le style. */
  seed?: number;
  /** Espèces retirées du décor de base. */
  hiddenSpecies?: SurroundingSpecies[];
  /** Espèces ajoutées : nombre d’exemplaires. */
  extraSpecies?: Partial<Record<SurroundingSpecies, number>>;
  /** Éléments de décor désactivés. */
  hiddenFeatures?: SurroundingFeature[];
  /** Soleil : hauteur (°) et orientation (°, 0 = derrière la scène). */
  sunElevation?: number;
  sunAzimuth?: number;
  /** Multiplicateur de la lumière du soleil / de la lune. */
  sunIntensity?: number;
  /** Température : -1 froid, 0 neutre, +1 chaud. */
  warmth?: number;
  /** Multiplicateur d’exposition globale. */
  exposure?: number;
  /** Voile du ciel (0 limpide → 1 brumeux). */
  haze?: number;
  /** Brouillard au loin (0 aucun → 1 dense). */
  fog?: number;
};

export const DEFAULT_EXTRA_SPECIES_COUNT = 10;

/** Textures de terrain proposées pour les abords. */
export const SURROUNDING_GROUND_OPTIONS: { url: string; label: string; tileM: number }[] = [
  { url: '/floors/gen/grass-lawn.jpg', label: 'Pelouse', tileM: 2.2 },
  { url: '/floors/gen/grass-striped.jpg', label: 'Pelouse rayée', tileM: 6 },
  { url: '/floors/gen/lawn-flowers.jpg', label: 'Pelouse fleurie', tileM: 2.4 },
  { url: '/floors/gen/meadow.jpg', label: 'Prairie', tileM: 2.6 },
  { url: '/floors/gen/turf-synthetic.jpg', label: 'Gazon synthétique', tileM: 2 },
  { url: '/floors/gen/sand.jpg', label: 'Sable', tileM: 3 },
  { url: '/floors/gen/dirt.jpg', label: 'Terre battue', tileM: 3 },
  { url: '/floors/gen/gravel-light.jpg', label: 'Gravier clair', tileM: 2 },
  { url: '/floors/gen/gravel-dark.jpg', label: 'Gravier foncé', tileM: 2 },
  { url: '/floors/gen/pebbles.jpg', label: 'Galets', tileM: 1.6 },
  { url: '/floors/gen/pavers-fan.jpg', label: 'Pavés en éventail', tileM: 2.8 },
  { url: '/floors/gen/cobble-granite.jpg', label: 'Pavés granit', tileM: 2 },
  { url: '/floors/gen/flagstone.jpg', label: 'Dallage pierre', tileM: 2.6 },
  { url: '/floors/gen/limestone-slabs.jpg', label: 'Dalles calcaires', tileM: 2.4 },
  { url: '/floors/gen/deck-ipe.jpg', label: 'Terrasse bois', tileM: 2 },
  { url: '/floors/gen/concrete.jpg', label: 'Béton', tileM: 3 },
];

const clampNum = (v: unknown, min: number, max: number): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : undefined;

const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** Nettoie des réglages venus du stockage (valeurs hors bornes, champs inconnus). */
export function resolveEnvironmentSettings(value: unknown): EnvironmentSettings {
  if (!value || typeof value !== 'object') return {};
  const v = value as Record<string, unknown>;
  const species = (list: unknown) =>
    Array.isArray(list) ? list.filter((x): x is SurroundingSpecies => SURROUNDING_SPECIES_ORDER.includes(x as SurroundingSpecies)) : undefined;
  const extra: Partial<Record<SurroundingSpecies, number>> = {};
  if (v.extraSpecies && typeof v.extraSpecies === 'object') {
    for (const [k, n] of Object.entries(v.extraSpecies as Record<string, unknown>)) {
      const c = clampNum(n, 0, 60);
      if (SURROUNDING_SPECIES_ORDER.includes(k as SurroundingSpecies) && c) extra[k as SurroundingSpecies] = Math.round(c);
    }
  }
  const out: EnvironmentSettings = {
    groundUrl: typeof v.groundUrl === 'string'
      && ((v.groundUrl.length < 1000 && /^(https?:\/\/|\/)/.test(v.groundUrl))
        || (v.groundUrl.length < 3_000_000 && /^data:image\/(png|jpeg|webp);base64,/.test(v.groundUrl)))
      ? v.groundUrl
      : undefined,
    groundTileM: clampNum(v.groundTileM, 0.5, 20),
    groundTint: isColor(v.groundTint) ? v.groundTint : undefined,
    density: clampNum(v.density, 0, 2.5),
    vegetationScale: clampNum(v.vegetationScale, 0.4, 2),
    spread: clampNum(v.spread, 0.5, 2.5),
    seed: clampNum(v.seed, 0, 1e6),
    hiddenSpecies: species(v.hiddenSpecies),
    extraSpecies: Object.keys(extra).length ? extra : undefined,
    hiddenFeatures: Array.isArray(v.hiddenFeatures)
      ? v.hiddenFeatures.filter((x): x is SurroundingFeature => x === 'structures' || x === 'water' || x === 'relief')
      : undefined,
    sunElevation: clampNum(v.sunElevation, 2, 89),
    sunAzimuth: clampNum(v.sunAzimuth, 0, 360),
    sunIntensity: clampNum(v.sunIntensity, 0, 3),
    warmth: clampNum(v.warmth, -1, 1),
    exposure: clampNum(v.exposure, 0.3, 2.5),
    haze: clampNum(v.haze, 0, 1),
    fog: clampNum(v.fog, 0, 1),
  };
  return Object.fromEntries(Object.entries(out).filter(([, x]) => x !== undefined)) as EnvironmentSettings;
}

/** Position monde du soleil à partir de sa hauteur et de son orientation (degrés). */
export function sunPositionFromAngles(elevationDeg: number, azimuthDeg: number, distance = 50): [number, number, number] {
  const el = (elevationDeg * Math.PI) / 180;
  const az = (azimuthDeg * Math.PI) / 180;
  return [
    Math.sin(az) * Math.cos(el) * distance,
    Math.sin(el) * distance,
    -Math.cos(az) * Math.cos(el) * distance,
  ];
}

/** Hauteur / orientation (degrés) d’une position de soleil existante. */
export function sunAnglesFromPosition([x, y, z]: [number, number, number]): { elevation: number; azimuth: number } {
  const flat = Math.hypot(x, z);
  const elevation = (Math.atan2(y, flat) * 180) / Math.PI;
  let azimuth = (Math.atan2(x, -z) * 180) / Math.PI;
  if (azimuth < 0) azimuth += 360;
  return { elevation: Math.round(elevation), azimuth: Math.round(azimuth) };
}

/** Mélange deux couleurs hex (t = 0 → a, 1 → b). */
export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, sh: number) => (p >> sh) & 255;
  const m = (sh: number) => Math.round(ch(pa, sh) + (ch(pb, sh) - ch(pa, sh)) * t);
  return `#${((m(16) << 16) | (m(8) << 8) | m(0)).toString(16).padStart(6, '0')}`;
}

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

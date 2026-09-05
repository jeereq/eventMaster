import { rowSeatCode, seatsGrownForTier } from '@/lib/roomAmphitheaterGeom';

export { estimateAmphitheaterSeats, rowCurveFactor, rowCurvePercent, rowSeatCode } from '@/lib/roomAmphitheaterGeom';

export type RoomType = 'SIMPLE' | 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT' | 'CUSTOM';
export type ChairType =
  | 'BANQUET'
  | 'FOLDING'
  | 'THEATER'
  | 'STOOL'
  | 'ARMCHAIR'
  | 'WHEELCHAIR'
  | 'CROSSBACK'
  | 'GHOST'
  | 'MESH'
  | 'BARSTOOL'
  | 'POUF';
export type TableShape = 'round' | 'rectangular' | 'square' | 'oval' | 'cocktail' | 'highTop' | 'arc';
/** Finition du plateau de table (3D). */
export type TableSurfaceStyle = 'wood' | 'linen' | 'walnut' | 'marble' | 'darkWood' | 'whiteLacquer' | 'glass';
/** Style de fauteuil / chaise (surtout fauteuils). */
export type ChairStyle =
  | 'classic'
  | 'lounge'
  | 'club'
  | 'bergere'
  | 'modern'
  | 'chiavari'
  | 'napoleon'
  | 'crossback'
  | 'tolix'
  | 'ghost'
  | 'panton'
  | 'louis'
  | 'ovalBack';
/** Matériau d’assise. */
export type SeatMaterial =
  | 'velvet'
  | 'leather'
  | 'linen'
  | 'fabric'
  | 'wood'
  | 'plastic'
  | 'boucle'
  | 'suede'
  | 'mesh'
  | 'rattan';
export type TableArrangePreset = 'grid' | 'banquet' | 'ushape' | 'circle' | 'longBanquet';
export type ArrangeDensity = 'compact' | 'comfortable' | 'ample';
export type TableStyleField = 'shape' | 'chairType' | 'chairStyle' | 'seatMaterial' | 'tableColor' | 'tableSurface' | 'capacity' | 'hasCouverts' | 'couvertStyle' | 'hasCenterpiece' | 'centerpieceStyle';
export type StageShape = 'rect' | 'semiCircle';
/** Variantes d’estrade événementielle (orateur, couple, passerelle…). */
export type PodiumStyle =
  | 'speaker'
  | 'lectern'
  | 'couple'
  | 'circular'
  | 'runway'
  | 'bandRiser'
  | 'honor'
  | 'steps';
/** Instruments de concert posables au sol ou sur un podium. */
export type InstrumentStyle =
  | 'piano'
  | 'keyboard'
  | 'drums'
  | 'guitar'
  | 'bass'
  | 'micStand'
  | 'sax'
  | 'violin'
  | 'amp'
  | 'speaker';
/** Comptoir de bar et verrerie associée. */
export type BarStyle = 'cocktail' | 'wine' | 'champagne' | 'beer' | 'coffee' | 'whiskey';
export type RoofStyle = 'flat' | 'tentSwag' | 'gabled' | 'coffered';
export type RoomFixtureKind =
  | 'stage'
  | 'podium'
  | 'aisle'
  | 'corridor'
  | 'entrance'
  | 'door'
  | 'chandelier'
  | 'pillar'
  | 'perimeter'
  | 'column'
  | 'flower'
  | 'carpet'
  | 'buffet'
  | 'stairs'
  | 'balcony'
  | 'arch'
  | 'partition'
  | 'decal'
  | 'pedestal'
  | 'stringLight'
  | 'fountain'
  | 'gazebo'
  | 'djBooth'
  | 'screen'
  | 'instrument'
  | 'bar';
export type FloorDecalKind = 'rose' | 'butterfly' | 'custom' | 'path';
export type PedestalStyle = 'squareWhite' | 'columnGold';
export type CenterpieceStyle = 'floral' | 'greeneryRunner' | 'candleCluster';
export type StageRoofStyle = 'none' | 'gabled';

export type RoomOutlineShape =
  | 'rectangle'
  | 'square'
  | 'circle'
  | 'ellipse'
  | 'lShape'
  | 'rShape'
  | 'tShape'
  | 'uShape'
  | 'hexagon'
  | 'octagon'
  | 'pentagon'
  | 'triangle'
  | 'diamond'
  | 'trapezoid'
  | 'stadium'
  | 'cross';
export type ColumnShape = 'round' | 'square' | 'fluted';
export type FlowerType = 'rose' | 'tulipe' | 'orchidee' | 'tournesol' | 'lavande' | 'boquet' | 'personnalise';

/** Type de zone au sol (piste, VIP, moquette…). */
export type ZoneKind = 'dance' | 'vip' | 'buffet' | 'carpet' | 'custom';
/** Matériau de surface pour zones / moquettes. */
export type ZoneMaterial = 'wood' | 'carpet' | 'vinyl' | 'led' | 'marble' | 'concrete' | 'parquet' | 'epoxy' | 'grass' | 'gravel' | 'brick';

/** Styles de texture murale pour le rendu WebGL. */
export type WallTextureStyle =
  | 'plaster'
  | 'brick'
  | 'wood'
  | 'concrete'
  | 'wallpaper'
  | 'stone'
  | 'limewash'
  | 'tadelakt'
  | 'boardConcrete'
  | 'paintedBrick'
  | 'fluted'
  | 'travertine'
  | 'slate'
  | 'metalCorrugated'
  | 'metroTile'
  | 'woodPanel';
/** Styles de porte configurables. */
export type DoorStyle =
  | 'single'
  | 'double'
  | 'sliding'
  | 'arch'
  | 'glass'
  | 'panel'
  | 'pivot'
  | 'folding'
  | 'fireExit'
  | 'frenchDoor'
  | 'barnDoor'
  | 'grandPortal'
  | 'velvetCurtain';

export const doorStyleLabels: Record<DoorStyle, string> = {
  single: 'Simple battante',
  double: 'Double battante',
  frenchDoor: 'Porte française (croisillons)',
  sliding: 'Coulissante moderne',
  barnDoor: 'Porte de grange bois rustique',
  grandPortal: 'Grand portail royal doré',
  velvetCurtain: 'Sas rideaux velours VIP',
  arch: 'Arche florale / cintrée',
  glass: 'Vitrée contemporaine',
  panel: 'Moulurée classique',
  pivot: 'Pivotante XXL',
  folding: 'Baie accordéon',
  fireExit: 'Issue de secours (sécurisée)',
};

export const doorStyleHints: Record<DoorStyle, string> = {
  single: 'Battant standard avec poignée laiton',
  double: 'Double battant symétrique',
  frenchDoor: 'Verre et petits carreaux chic',
  sliding: 'Discrète, gain de place',
  barnDoor: 'Style champêtre Pinterest sur rail noir',
  grandPortal: 'Finition dorée & colonnes d’honneur',
  velvetCurtain: 'Drapé théâtral rouge ou ivoire',
  arch: 'Cintrée avec composition florale',
  glass: 'Transparence et cadre fin',
  panel: 'Boiserie traditionnelle',
  pivot: 'Design minimaliste de prestige',
  folding: 'Ouverture panoramique',
  fireExit: 'Signalétique réglementaire rétroéclairée',
};

/** Styles d’allées centrales et tapis d’honneur (inspiré Pinterest & Galas). */
export type AisleStyle =
  | 'royalRed'
  | 'whiteMirror'
  | 'botanicalRunner'
  | 'rusticWood'
  | 'damaskGold'
  | 'ledRunway'
  | 'blackVelvet';

export const aisleStyleLabels: Record<AisleStyle, string> = {
  royalRed: 'Tapis rouge royal (ganse or)',
  whiteMirror: 'Allée miroir blanc laqué',
  botanicalRunner: 'Allée lin poudré & pétales',
  rusticWood: 'Plancher chêne vintage',
  damaskGold: 'Brocart jacquard or & ivoire',
  ledRunway: 'Catwalk lumineux LED',
  blackVelvet: 'Velours noir haute couture',
};

export const aisleStyleHints: Record<AisleStyle, string> = {
  royalRed: 'Velours pourpre avec liseré doré',
  whiteMirror: 'Reflets laqués prestige immaculé',
  botanicalRunner: 'Romantique avec pétales et lanternes',
  rusticWood: 'Lames de parquet chevron chaleureux',
  damaskGold: 'Motifs baroques grand siècle',
  ledRunway: 'Podium moderne avec bande néon',
  blackVelvet: 'Gala contemporain contrasté',
};

/** Styles de lustres et suspensions décoratives. */
export type ChandelierFixtureStyle =
  | 'crystalCascade'
  | 'brassRings'
  | 'bohoPampas'
  | 'botanicalHalo'
  | 'fairyCanopy'
  | 'candleCandelabra'
  | 'modernMinimal'
  | 'lantern';

export const chandelierFixtureStyleLabels: Record<ChandelierFixtureStyle, string> = {
  crystalCascade: 'Cascade de cristal royal',
  brassRings: 'Halos géométriques laiton brossé',
  bohoPampas: 'Suspension rotin & herbe de pampa',
  botanicalHalo: 'Couronne végétale suspendue',
  fairyCanopy: 'Ciel étoilé micro-LED',
  candleCandelabra: 'Candélabre grand siècle (bougies)',
  modernMinimal: 'Cylindre épuré architectural',
  lantern: 'Lanterne suspendue fer forgé',
};

export const chandelierFixtureStyleHints: Record<ChandelierFixtureStyle, string> = {
  crystalCascade: 'Pampilles scintillantes et reflets dorés',
  brassRings: 'Anneaux d’or imbriqués tendance',
  bohoPampas: 'Esprit bohème chic naturel',
  botanicalHalo: 'Orchidées, roses et feuillages suspendus',
  fairyCanopy: 'Nappe féérique lumineuse',
  candleCandelabra: 'Ambiance château et lueurs chaudes',
  modernMinimal: 'Lumière ciblée contemporaine',
  lantern: 'Élégance classique intemporelle',
};

/** Styles de disposition pour amphithéâtre / gradins. */
export type AmphitheaterStyle =
  | 'modernFan'
  | 'romanSemiCircle'
  | 'tieredSteps'
  | 'horseshoeU';

export const amphitheaterStyleLabels: Record<AmphitheaterStyle, string> = {
  modernFan: 'Éventail royal (Arc étagé)',
  romanSemiCircle: 'Théâtre antique (Demi-cercle 180°)',
  tieredSteps: 'Gradins droits étagés',
  horseshoeU: 'Fer à cheval (U-shape immersif)',
};
/** Styles de fenêtre configurables. */
export type WindowStyle = 'rectangular' | 'arched' | 'bay' | 'french';
/** Matériau d’ouverture (porte / fenêtre). */
export type OpeningMaterial =
  | 'wood'
  | 'glass'
  | 'metal'
  | 'painted'
  | 'oak'
  | 'walnut'
  | 'lacquer'
  | 'brass'
  | 'blackSteel';

export interface RoomWallOpening {
  id: string;
  kind: 'door' | 'window';
  /** Position le long du mur (0 = début, 1 = fin). */
  t: number;
  widthM: number;
  heightM: number;
  /** Hauteur du bas de l’ouverture (0 = sol pour portes). */
  sillM?: number;
  style: DoorStyle | WindowStyle;
  /** Bois, vitre, métal, peint. */
  material?: OpeningMaterial;
  color?: string;
  /** Couleur du dormant / huisserie. */
  frameColor?: string;
  /** Paillasson devant la porte. */
  hasMat?: boolean;
  matColor?: string;
  /** Rideaux (fenêtres). */
  hasCurtains?: boolean;
  curtainColor?: string;
}

export interface RoomWallSegment {
  id: string;
  /** Coordonnées en % du canvas (0–100). */
  start: { x: number; y: number };
  end: { x: number; y: number };
  heightM: number;
  thicknessM: number;
  texture: WallTextureStyle;
  color?: string;
  openings?: RoomWallOpening[];
  /** Étage (maison multi-niveaux). */
  storyId?: string;
}

export interface ImageCropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutParams {
  tableCount?: number;
  tableShape?: TableShape;
  seatsPerTable?: number;
  rowCount?: number;
  seatsPerRow?: number;
  tierCount?: number;
  rowsPerTier?: number;
  chairType?: ChairType;
  tentWidthM?: number;
  tentLengthM?: number;
  canvasWidthM?: number;
  canvasHeightM?: number;
  arrangePreset?: TableArrangePreset;
  totalSeats?: number;
}

export interface SavedRoomTemplate {
  id: string;
  name: string;
  description: string;
  roomType: RoomType;
  snapshot: RoomLayoutBlueprint;
}

export interface RoomLayoutBlueprint {
  version: 1;
  roomType: RoomType;
  templateId?: string;
  roomOutline?: {
    shape: RoomOutlineShape;
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
  /** Murs procéduraux (éditeur 2.5D / WebGL). `[]` = sans murs ; `undefined` = générés depuis le contour. */
  walls?: RoomWallSegment[];
  canvas: { widthM: number; heightM: number };
  fixtures: Array<{
    id: string;
    kind: RoomFixtureKind;
    x: number;
    y: number;
    w: number;
    h: number;
    rotation?: number;
    label?: string;
    columnShape?: ColumnShape;
    color?: string;
    imageUrl?: string;
    imageCrop?: ImageCropRect;
    flowerType?: FlowerType;
    flowerColor?: string;
    /** Matériau / texture pour moquette, scène, podium, buffet… */
    material?: ZoneMaterial;
    /** Podium / scène / escalier : hauteur réelle en mètres. */
    heightM?: number;
    /** Empreinte de la scène : rectangle ou demi-lune. */
    stageShape?: StageShape;
    /** Variante de podium (orateur, couple, passerelle…). */
    podiumStyle?: PodiumStyle;
    /** Instrument de concert (piano, batterie, micro…). */
    instrumentStyle?: InstrumentStyle;
    /** Type de bar (cocktail, vin, champagne…). */
    barStyle?: BarStyle;
    /** Podium / escalier : nombre de marches. */
    steps?: number;
    /** Buffet : afficher assiettes / couverts. */
    hasCouverts?: boolean;
    /** Buffet : style d’implantation. */
    buffetStyle?: 'straight' | 'corner' | 'island';
    /** Escalier : orientation (0 = haut du plan). */
    stairDirection?: 0 | 90 | 180 | 270;
    /** Escalier : style (droit / ouvert / compact). */
    stairStyle?: import('@/lib/roomStairsUtils').StairStyle;
    /** Escalier : étage de destination (liaison verticale). */
    connectsToStoryId?: string;
    /** Balcon : façade d’attache. */
    balconySide?: 'north' | 'south' | 'east' | 'west';
    /** Style de porte / ouverture d’accès. */
    doorStyle?: DoorStyle;
    /** Sens d’ouverture porte (gauche, droite, double, coulissant, cintre). */
    doorSwing?: 'left' | 'right' | 'double' | 'sliding' | 'arch';
    /** Paillasson d’accueil pour porte / entrée. */
    hasMat?: boolean;
    matColor?: string;
    /** Essence / finition du vantail (portes fixture). */
    openingMaterial?: OpeningMaterial;
    frameColor?: string;
    couvertStyle?: 'classic' | 'gold' | 'festive';
    /** Style d’allée centrale / tapis d’honneur (Pinterest). */
    aisleStyle?: AisleStyle;
    /** Bordure dorée / satinée sur l’allée. */
    hasGoldBorder?: boolean;
    /** Lanternes / bougies disposées sur les bords de l’allée. */
    hasSideLanterns?: boolean;
    /** Pétales de roses éparpillés sur l’allée. */
    hasPetals?: boolean;
    /** Motif de décalcomanie au sol (roses, papillons, image). */
    decalKind?: FloorDecalKind;
    /** Piédestal floral : colonne blanche ou or. */
    pedestalStyle?: PedestalStyle;
    /** Toit de scène (amphithéâtre jardin). */
    stageRoof?: StageRoofStyle;
    /** Style de lustre / suspension au plafond. */
    chandelierStyle?: ChandelierFixtureStyle;
    /** Rayon de diffusion de la lumière (en % ou mètres). */
    lightRadius?: number;
    /** Chaleur et teinte lumineuse du lustre. */
    lightWarmth?: 'warm' | 'candle' | 'neutral' | 'gold' | 'rose' | 'night';
    /** Intensité lumineuse (0–100). */
    lightIntensity?: number;
    /** Groupe de sélection / alignement. */
    groupId?: string;
    /** Étage du bâtiment (maison multi-niveaux). */
    storyId?: string;
  }>;
  furniture: Array<
    | {
        id: string;
        kind: 'table';
        name: string;
        shape: TableShape;
        capacity: number;
        chairType: ChairType;
        chairStyle?: ChairStyle;
        seatMaterial?: SeatMaterial;
        chairImageUrl?: string;
        tableColor?: string;
        tableSurface?: TableSurfaceStyle;
        tableImageUrl?: string;
        /** Nappe / couverts sur la table. */
        hasCouverts?: boolean;
        /** classic | gold | festive */
        couvertStyle?: 'classic' | 'gold' | 'festive';
        /** Centre de table (vase or + bouquet). */
        hasCenterpiece?: boolean;
        /** Style du centre : bouquet haut, runner verdure, ou grappe de bougies. */
        centerpieceStyle?: CenterpieceStyle;
        x: number;
        y: number;
        locked?: boolean;
        rotation?: number;
        attachedChairs?: boolean;
        groupId?: string;
        storyId?: string;
      }
    | {
        id: string;
        kind: 'chair';
        chairType: ChairType;
        chairStyle?: ChairStyle;
        seatMaterial?: SeatMaterial;
        chairImageUrl?: string;
        label?: string;
        x: number;
        y: number;
        rotation?: number;
        locked?: boolean;
        groupId?: string;
        storyId?: string;
      }
    | {
        id: string;
        kind: 'row';
        label: string;
        seatCount: number;
        chairType: ChairType;
        chairStyle?: ChairStyle;
        seatMaterial?: SeatMaterial;
        chairImageUrl?: string;
        tier: number;
        x: number;
        y: number;
        curve?: number;
        rotation?: number;
        /** Division avec allée centrale de passage. */
        aisleSplit?: boolean;
        /** Largeur de l’allée centrale en % de la rangée (5–30%). */
        aisleWidthPct?: number;
        /** Nom / lettre de la rangée (ex: "Rang A"). */
        rowName?: string;
        /** Disposition des chaises en quinconce. */
        staggered?: boolean;
        /** Afficher les numéros de sièges sur le plan (1, 2, 3...). */
        showSeatNumbers?: boolean;
        /** Style d’amphithéâtre / gradin associé. */
        amphitheaterStyle?: AmphitheaterStyle;
        /** Élévation du gradin (m) — amphithéâtre en pente. */
        elevationM?: number;
        /** Point de visée en % (scène) pour orienter les sièges. */
        focusX?: number;
        focusY?: number;
        groupId?: string;
        storyId?: string;
      }
    | {
        id: string;
        kind: 'zone';
        label: string;
        zoneKind?: ZoneKind;
        material?: ZoneMaterial;
        color?: string;
        x: number;
        y: number;
        w: number;
        h: number;
        rotation?: number;
        groupId?: string;
        storyId?: string;
      }
  >;
  metadata: {
    tableCount?: number;
    rowCount?: number;
    totalSeats: number;
    defaultTableColor?: string;
    defaultTableSurface?: TableSurfaceStyle;
    roomThemeId?: string;
    floorType?: import('@/lib/roomThemeUtils').FloorType;
    floorImageUrl?: string;
    /**
     * Affichage de l’image de sol / plan :
     * - cover = plan importé (image entière, sans tuilage)
     * - tile = texture répétée
     */
    floorImageFit?: 'cover' | 'tile';
    /** Teinte / couleur dominante du sol (architecture). */
    floorColor?: string;
    /** Afficher le toit / plafond en 3D. */
    showRoof?: boolean;
    /** Opacité du toit (0–1). */
    roofOpacity?: number;
    /** Couleur du plafond / underside. */
    roofColor?: string;
    /** Toit plat ou faîte de tente drapée. */
    roofStyle?: RoofStyle;
    /** Style de lustre / suspension. */
    chandelierType?: import('@/lib/roomCeilingUtils').ChandelierType;
    /** Nombre de lustres (1–5, plafonné par la qualité de rendu). */
    chandelierCount?: number;
    /** Couleur de peinture globale des murs (override léger). */
    wallPaintColor?: string;
    customThemes?: import('@/lib/roomThemeUtils').CustomRoomTheme[];
    customTemplates?: SavedRoomTemplate[];
    /** Ambiances personnalisées sauvegardées par l’utilisateur. */
    customAmbiences?: SavedRoomAmbience[];
    /** Dernières ambiances appliquées sur ce plan. */
    ambienceHistory?: AmbienceHistoryEntry[];
    depthView?: boolean;
    /** 0 = vue à plat, 100 = perspective 2,5D maximale. */
    depthAmount?: number;
    /** Qualité de rendu WebGL (draft / standard / showcase). */
    renderQuality?: import('@/lib/roomRenderQuality').RenderQuality;
    /** Ambiance lumineuse scénique. */
    lightingPreset?: import('@/lib/roomRenderQuality').LightingPreset;
    /** Lustres / suspensions. */
    showChandeliers?: boolean;
    /** Uplights le long des murs. */
    showUplights?: boolean;
    /** Rideaux décoratifs. */
    showCurtains?: boolean;
    /** Teinte des rideaux muraux (ivoire, bordeaux…). */
    curtainColor?: string;
    /** Plantes d’angle. */
    showDecorPlants?: boolean;
    /** Mode présentation (orbit auto, labels masqués). */
    presentationMode?: boolean;
    /** Modèle de structure multi-étages appliqué. */
    buildingPresetId?: import('@/lib/roomBuildingUtils').BuildingStoryPresetId;
    /** Étages du bâtiment (RDC, 1er…). */
    stories?: import('@/lib/roomBuildingUtils').RoomStory[];
    /** Étage actuellement édité. */
    activeStoryId?: string;
    /** Fondation sous le RDC. */
    foundation?: import('@/lib/roomBuildingUtils').RoomFoundation;
    /** Afficher tous les étages empilés (vue coupe). */
    stackView?: boolean;
    /** Liaisons verticales explicites (escalier / ascenseur). */
    verticalLinks?: import('@/lib/roomBuildingUtils').VerticalLink[];
    /** Journal des actions d’édition, persisté avec le plan. */
    layoutActions?: import('@/lib/layoutActionLog').LayoutActionEntry[];
  };
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeLayoutId(prefix: string) {
  return uid(prefix);
}

export function refreshBlueprintMetadata(blueprint: RoomLayoutBlueprint): RoomLayoutBlueprint {
  const tableCount = blueprint.furniture.filter((f) => f.kind === 'table').length;
  const rowCount = blueprint.furniture.filter((f) => f.kind === 'row').length;
  const totalSeats = calculateBlueprintCapacity(blueprint);
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      tableCount: tableCount || undefined,
      rowCount: rowCount || undefined,
      totalSeats,
    },
  };
}

export function createBlueprintTable(
  index: number,
  defaults: { shape?: TableShape; capacity?: number; chairType?: ChairType } = {},
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }> {
  return {
    id: makeLayoutId('table'),
    kind: 'table',
    name: `Table ${index}`,
    shape: defaults.shape ?? 'round',
    capacity: defaults.capacity ?? 8,
    chairType: defaults.chairType ?? 'BANQUET',
    x: 30 + Math.random() * 40,
    y: 30 + Math.random() * 40,
  };
}

export function createBlueprintRow(
  index: number,
  defaults: {
    seatCount?: number;
    chairType?: ChairType;
    tier?: number;
    x?: number;
    y?: number;
    label?: string;
    groupId?: string;
    curve?: number;
  } = {},
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }> {
  return {
    id: makeLayoutId('row'),
    kind: 'row',
    label: defaults.label ?? `Rangée ${index}`,
    seatCount: defaults.seatCount ?? 10,
    chairType: defaults.chairType ?? 'THEATER',
    tier: defaults.tier ?? 0,
    x: defaults.x ?? 50,
    y: defaults.y ?? 20 + index * 8,
    ...(defaults.groupId ? { groupId: defaults.groupId } : {}),
    ...(defaults.curve != null ? { curve: defaults.curve } : {}),
  };
}

/** Crée plusieurs allées espacées simplement (nombre défini par l’utilisateur). */
export function createAislesBatch(
  count: number,
  existingAisleCount = 0,
): RoomLayoutBlueprint['fixtures'] {
  const n = Math.max(1, Math.min(12, Math.round(count)));
  const fixtures: RoomLayoutBlueprint['fixtures'] = [];
  for (let i = 0; i < n; i += 1) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 18 + t * 64;
    fixtures.push({
      ...createBlueprintFixture('aisle'),
      id: makeLayoutId('aisle'),
      x: Math.max(8, Math.min(88, x - 2)),
      y: 16,
      w: n > 4 ? 3 : 4,
      h: 68,
      label: n === 1 ? 'Allée centrale' : `Allée ${existingAisleCount + i + 1}`,
    });
  }
  return fixtures;
}

/**
 * Crée des groupes de rangées de chaises.
 * Ex. 3 groupes × 4 rangées × 12 sièges.
 */
export function createChairRowGroups(opts: {
  groupCount: number;
  rowsPerGroup: number;
  seatsPerRow: number;
  startRowIndex?: number;
  chairType?: ChairType;
}): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>[] {
  const groups = Math.max(1, Math.min(8, Math.round(opts.groupCount)));
  const rowsPer = Math.max(1, Math.min(20, Math.round(opts.rowsPerGroup)));
  const seats = Math.max(2, Math.min(40, Math.round(opts.seatsPerRow)));
  const start = opts.startRowIndex ?? 1;
  const rows: Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>[] = [];
  let rowIdx = start;
  for (let g = 0; g < groups; g += 1) {
    const groupId = makeLayoutId('grp');
    const xBase = groups === 1 ? 50 : 22 + (g / Math.max(1, groups - 1)) * 56;
    for (let r = 0; r < rowsPer; r += 1) {
      rows.push(
        createBlueprintRow(rowIdx, {
          seatCount: seats,
          chairType: opts.chairType ?? 'THEATER',
          tier: r,
          x: xBase,
          y: 22 + r * 7,
          label: groups > 1 ? `Groupe ${g + 1} · R${r + 1}` : `Rangée ${rowIdx}`,
          groupId,
        }),
      );
      rowIdx += 1;
    }
  }
  return rows;
}

export function createBlueprintZone(
  label: string,
  index = 1,
  opts: { zoneKind?: ZoneKind; material?: ZoneMaterial; color?: string; w?: number; h?: number } = {},
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'zone' }> {
  const zoneKind =
    opts.zoneKind ??
    (label.toLowerCase().includes('piste')
      ? 'dance'
      : label.toLowerCase().includes('vip')
        ? 'vip'
        : label.toLowerCase().includes('buffet')
          ? 'buffet'
          : label.toLowerCase().includes('moquette') || label.toLowerCase().includes('tapis')
            ? 'carpet'
            : 'custom');
  const material =
    opts.material ??
    (zoneKind === 'dance' ? 'vinyl' : zoneKind === 'carpet' ? 'carpet' : zoneKind === 'vip' ? 'marble' : 'wood');
  return {
    id: makeLayoutId('zone'),
    kind: 'zone',
    label,
    zoneKind,
    material,
    color: opts.color,
    x: 18 + (index % 3) * 10,
    y: 28 + (index % 2) * 8,
    w: opts.w ?? (zoneKind === 'dance' ? 32 : zoneKind === 'carpet' ? 28 : 26),
    h: opts.h ?? (zoneKind === 'dance' ? 24 : zoneKind === 'carpet' ? 20 : 16),
  };
}

function pointInLayoutRect(
  xPct: number,
  yPct: number,
  rect: { x: number; y: number; w: number; h: number },
): boolean {
  return xPct >= rect.x && xPct <= rect.x + rect.w && yPct >= rect.y && yPct <= rect.y + rect.h;
}

export type FurnitureSurfaceHit = {
  id: string;
  kind: 'podium' | 'stage' | 'carpet' | 'dance' | 'vip' | 'buffet' | 'zone';
  label: string;
  /** Hauteur du dessus de surface (m), pour poser le mobilier dessus. */
  elevationM: number;
};

/**
 * Surface sous un point (moquette, piste, podium…) pour y poser tables / chaises.
 * Priorité : podium / scène > autres surfaces.
 */
export function resolveFurnitureSurfaceAt(
  blueprint: RoomLayoutBlueprint,
  xPct: number,
  yPct: number,
): FurnitureSurfaceHit | null {
  let best: FurnitureSurfaceHit | null = null;

  const consider = (hit: FurnitureSurfaceHit) => {
    if (!best) {
      best = hit;
      return;
    }
    const bestIsRaised = best.kind === 'podium' || best.kind === 'stage';
    const hitIsRaised = hit.kind === 'podium' || hit.kind === 'stage';
    if (hitIsRaised && (!bestIsRaised || hit.elevationM >= best.elevationM)) {
      best = hit;
      return;
    }
    if (!bestIsRaised && hit.elevationM >= best.elevationM) {
      best = hit;
    }
  };

  for (const f of blueprint.fixtures) {
    if (!pointInLayoutRect(xPct, yPct, f)) continue;
    if (f.kind === 'podium' || f.kind === 'stage') {
      consider({
        id: f.id,
        kind: f.kind,
        label: f.label ?? (f.kind === 'podium' ? 'Podium' : 'Scène'),
        elevationM: f.heightM ?? (f.kind === 'podium' ? 0.6 : 0.45),
      });
    } else if (f.kind === 'carpet') {
      consider({
        id: f.id,
        kind: 'carpet',
        label: f.label ?? 'Moquette',
        elevationM: 0.06,
      });
    }
  }

  for (const item of blueprint.furniture) {
    if (item.kind !== 'zone') continue;
    if (!pointInLayoutRect(xPct, yPct, { x: item.x, y: item.y, w: item.w, h: item.h })) continue;
    const kind =
      item.zoneKind === 'dance' ? 'dance' :
      item.zoneKind === 'carpet' ? 'carpet' :
      item.zoneKind === 'vip' ? 'vip' :
      item.zoneKind === 'buffet' ? 'buffet' :
      'zone';
    const elevationM =
      kind === 'dance' ? 0.07 :
      kind === 'carpet' ? 0.06 :
      kind === 'vip' ? 0.05 :
      0.04;
    consider({
      id: item.id,
      kind,
      label: item.label,
      elevationM,
    });
  }

  return best;
}

export function createBlueprintChair(
  index = 1,
  defaults: {
    chairType?: ChairType;
    chairStyle?: ChairStyle;
    seatMaterial?: SeatMaterial;
    x?: number;
    y?: number;
    rotation?: number;
  } = {},
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'chair' }> {
  const chairType = defaults.chairType ?? 'ARMCHAIR';
  return {
    id: makeLayoutId('chair'),
    kind: 'chair',
    chairType,
    chairStyle: defaults.chairStyle ?? (chairType === 'ARMCHAIR' ? 'lounge' : 'classic'),
    seatMaterial: defaults.seatMaterial ?? (chairType === 'ARMCHAIR' ? 'velvet' : 'fabric'),
    label: chairType === 'ARMCHAIR' ? `Fauteuil ${index}` : `Chaise ${index}`,
    x: defaults.x ?? 40 + Math.random() * 20,
    y: defaults.y ?? 40 + Math.random() * 20,
    rotation: defaults.rotation ?? 0,
  };
}

/** Détache les chaises d’une table en éléments déplaçables indépendamment. */
export function detachTableChairs(
  blueprint: RoomLayoutBlueprint,
  tableId: string,
): RoomLayoutBlueprint {
  const table = blueprint.furniture.find((f) => f.kind === 'table' && f.id === tableId);
  if (!table || table.kind !== 'table') return blueprint;
  const capacity = Math.min(table.capacity, 14);
  const chairs = Array.from({ length: capacity }).map((_, i) => {
    const a = (i / capacity) * Math.PI * 2 - Math.PI / 2;
    const radiusPct = 7;
    return createBlueprintChair(i + 1, {
      chairType: table.chairType,
      chairStyle: table.chairStyle,
      seatMaterial: table.seatMaterial,
      x: Math.max(2, Math.min(98, table.x + Math.cos(a) * radiusPct)),
      y: Math.max(2, Math.min(98, table.y + Math.sin(a) * radiusPct)),
      // Face vers la table : angle vers le centre
      rotation: ((Math.atan2(-Math.cos(a), -Math.sin(a)) * 180) / Math.PI),
    });
  });
  return {
    ...blueprint,
    furniture: [
      ...blueprint.furniture.map((f) =>
        f.id === tableId && f.kind === 'table' ? { ...f, attachedChairs: false } : f,
      ),
      ...chairs,
    ],
  };
}

export function createBlueprintFixture(
  kind: RoomLayoutBlueprint['fixtures'][number]['kind'],
): RoomLayoutBlueprint['fixtures'][number] {
  const defaults: Record<string, { x: number; y: number; w: number; h: number; label: string }> = {
    stage: { x: 25, y: 4, w: 50, h: 8, label: 'Scène' },
    podium: { x: 40, y: 6, w: podiumStylePresets.speaker.w, h: podiumStylePresets.speaker.h, label: 'Podium orateur' },
    aisle: { x: 46, y: 14, w: 8, h: 72, label: 'Allée d’honneur' },
    door: { x: 45, y: 1, w: 10, h: 5, label: 'Porte' },
    chandelier: { x: 50, y: 45, w: 8, h: 8, label: 'Lustre' },
    corridor: { x: 42, y: 18, w: 14, h: 64, label: 'Couloir' },
    entrance: { x: 42, y: 1, w: 16, h: 6, label: 'Entrée d’accueil' },
    pillar: { x: 48, y: 48, w: 4, h: 4, label: 'Poteau' },
    column: { x: 30, y: 40, w: 3, h: 3, label: 'Colonne' },
    perimeter: { x: 8, y: 10, w: 84, h: 80, label: 'Périmètre' },
    flower: { x: 10, y: 85, w: 4, h: 4, label: 'Fleurs' },
    carpet: { x: 30, y: 55, w: 40, h: 28, label: 'Moquette' },
    buffet: { x: 12, y: 70, w: 36, h: 10, label: 'Buffet' },
    stairs: { x: 70, y: 35, w: 12, h: 28, label: 'Escalier' },
    balcony: { x: 30, y: 90, w: 40, h: 8, label: 'Balcon' },
    arch: { x: 36, y: 4, w: 28, h: 14, label: 'Arche florale' },
    partition: { x: 28, y: 40, w: 36, h: 16, label: 'Cloison basse' },
    decal: { x: 38, y: 38, w: 16, h: 16, label: 'Motif au sol' },
    pedestal: { x: 20, y: 78, w: 5, h: 5, label: 'Piédestal floral' },
    stringLight: { x: 18, y: 18, w: 64, h: 64, label: 'Guirlandes Edison' },
    fountain: { x: 42, y: 40, w: 16, h: 16, label: 'Fontaine' },
    gazebo: { x: 36, y: 36, w: 28, h: 28, label: 'Gloriette' },
    djBooth: { x: 36, y: 4, w: 28, h: 10, label: 'Régie DJ' },
    screen: { x: 38, y: 4, w: 24, h: 6, label: 'Écran' },
    instrument: { x: 44, y: 10, w: 8, h: 6, label: 'Piano à queue' },
    bar: { x: 8, y: 68, w: 28, h: 10, label: 'Bar cocktail' },
  };
  const d = defaults[kind] ?? { x: 40, y: 40, w: 20, h: 10, label: kind };
  return {
    id: makeLayoutId('fixture'),
    kind,
    ...d,
    columnShape: kind === 'pillar' || kind === 'column' ? 'round' as ColumnShape : undefined,
    color:
      kind === 'pillar' || kind === 'column' ? '#78716c' :
      kind === 'carpet' ? '#1e3a5f' :
      kind === 'aisle' ? '#991b1b' :
      kind === 'buffet' ? '#8b6914' :
      kind === 'stairs' ? '#a8a29e' :
      kind === 'balcony' ? '#d6d3d1' :
      kind === 'chandelier' ? '#f59e0b' :
      kind === 'arch' ? '#f4e8e4' :
      kind === 'partition' ? '#c4a4a4' :
      kind === 'decal' ? '#dcaeae' :
      kind === 'pedestal' ? '#f8fafc' :
      kind === 'stringLight' ? '#fbbf24' :
      kind === 'fountain' ? '#94a3b8' :
      kind === 'gazebo' ? '#f8fafc' :
      kind === 'djBooth' ? '#1c1917' :
      kind === 'screen' ? '#0f172a' :
      kind === 'instrument' ? '#1c1917' :
      kind === 'bar' ? '#4a3728' :
      undefined,
    flowerType: kind === 'arch' || kind === 'pedestal' ? 'rose' as FlowerType : kind === 'flower' ? 'boquet' as FlowerType : undefined,
    flowerColor: kind === 'arch' || kind === 'pedestal' ? '#f4e8e4' : kind === 'flower' ? '#e11d48' : undefined,
    material:
      kind === 'carpet' ? 'carpet' :
      kind === 'aisle' ? 'carpet' :
      kind === 'stage' || kind === 'podium' ? 'wood' :
      kind === 'buffet' || kind === 'bar' ? 'wood' :
      kind === 'stairs' ? 'wood' :
      kind === 'balcony' ? 'concrete' :
      undefined,
    heightM:
      kind === 'podium' ? 0.6 :
      kind === 'stage' ? 0.45 :
      kind === 'stairs' ? 1.2 :
      kind === 'balcony' ? 0.12 :
      kind === 'chandelier' ? 3.5 :
      kind === 'arch' ? 2.4 :
      kind === 'partition' ? 0.92 :
      kind === 'pedestal' ? 1.15 :
      kind === 'decal' ? 0.02 :
      kind === 'stringLight' ? 3.4 :
      kind === 'fountain' ? 1.6 :
      kind === 'gazebo' ? 3.2 :
      kind === 'djBooth' ? 1.1 :
      kind === 'screen' ? 2.4 :
      kind === 'instrument' ? 0.95 :
      kind === 'bar' ? 1.15 :
      undefined,
    steps: kind === 'podium' ? 2 : kind === 'stairs' ? 6 : undefined,
    hasCouverts: kind === 'buffet' ? true : undefined,
    buffetStyle: kind === 'buffet' ? 'straight' : undefined,
    stairDirection: kind === 'stairs' ? 0 : undefined,
    stairStyle: kind === 'stairs' ? 'straight' : undefined,
    balconySide: kind === 'balcony' ? 'south' : undefined,
    doorStyle: kind === 'door' || kind === 'entrance' ? (kind === 'entrance' ? 'grandPortal' : 'frenchDoor') : undefined,
    doorSwing: kind === 'door' || kind === 'entrance' ? 'double' : undefined,
    hasMat: kind === 'door' || kind === 'entrance' ? true : undefined,
    matColor: kind === 'door' || kind === 'entrance' ? '#78350f' : undefined,
    aisleStyle: kind === 'aisle' ? 'royalRed' : undefined,
    hasGoldBorder: kind === 'aisle' ? true : undefined,
    hasSideLanterns: kind === 'aisle' ? true : undefined,
    hasPetals: kind === 'aisle' ? true : undefined,
    chandelierStyle: kind === 'chandelier' ? 'crystalCascade' : kind === 'stringLight' ? 'fairyCanopy' : undefined,
    lightRadius: kind === 'chandelier' ? 25 : undefined,
    lightWarmth: kind === 'chandelier' ? 'gold' : undefined,
    lightIntensity: kind === 'chandelier' ? 85 : undefined,
    stageShape: kind === 'stage' ? 'rect' : undefined,
    podiumStyle: kind === 'podium' ? 'speaker' : undefined,
    instrumentStyle: kind === 'instrument' ? 'piano' : undefined,
    barStyle: kind === 'bar' ? 'cocktail' : undefined,
    decalKind: kind === 'decal' ? 'rose' : undefined,
    pedestalStyle: kind === 'pedestal' ? 'squareWhite' : undefined,
  };
}

/** Place des tables en arc autour d’un centre (cercle / demi-cercle). */
export function composeArcRing(opts: {
  centerX?: number;
  centerY?: number;
  radiusPct?: number;
  segmentCount?: number;
  capacity?: number;
  startIndex?: number;
  sweepDeg?: number;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  tableColor?: string;
}): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }>[] {
  const count = Math.max(2, Math.min(12, Math.round(opts.segmentCount ?? 6)));
  const radius = opts.radiusPct ?? 22;
  const cx = opts.centerX ?? 50;
  const cy = opts.centerY ?? 52;
  const sweep = opts.sweepDeg ?? 360;
  const start = opts.startIndex ?? 1;
  const tables: Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }>[] = [];
  const groupId = makeLayoutId('arc-ring');
  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0 : i / count;
    const deg = (t * sweep) - (sweep === 360 ? 0 : sweep / 2);
    const rad = (deg * Math.PI) / 180;
    tables.push({
      ...createBlueprintTable(start + i, { shape: 'arc', capacity: opts.capacity ?? 8, chairType: 'BANQUET' }),
      x: Math.round((cx + Math.sin(rad) * radius) * 10) / 10,
      y: Math.round((cy - Math.cos(rad) * radius) * 10) / 10,
      rotation: Math.round(deg),
      chairStyle: opts.chairStyle ?? 'ovalBack',
      seatMaterial: opts.seatMaterial ?? 'velvet',
      tableSurface: 'linen',
      tableColor: opts.tableColor ?? '#e8d4c8',
      hasCouverts: true,
      groupId,
    });
  }
  return tables;
}

/**
 * Génère des rangées d’amphithéâtre / gradins étagés de haute précision (style Pinterest).
 */
export function generateAmphitheaterRows(options: {
  style?: AmphitheaterStyle;
  tierCount?: number;
  seatsPerRow?: number;
  chairType?: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  centerX?: number;
  startY?: number;
  aisleSplit?: boolean;
  groupId?: string;
}): Array<Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>> {
  const {
    style = 'modernFan',
    tierCount = 4,
    seatsPerRow = 12,
    chairType = 'THEATER',
    chairStyle = 'napoleon',
    seatMaterial = 'velvet',
    centerX = 50,
    aisleSplit = true,
    groupId = makeLayoutId('amphi'),
  } = options;

  const focusY = 12;
  const spanCurve =
    style === 'romanSemiCircle' ? 72 :
    style === 'horseshoeU' ? 58 :
    style === 'modernFan' ? 42 :
    0;
  const radiusStart = style === 'romanSemiCircle' ? 20 : 23;
  const radiusStep = style === 'tieredSteps' ? 9 : 8.2;
  const risePerTierM = style === 'tieredSteps' ? 0.32 : 0.26;

  const rows: Array<Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }>> = [];

  const pushRow = (opts: {
    letter: string;
    suffix?: string;
    seats: number;
    x: number;
    y: number;
    rotation: number;
    curve: number;
    tier: number;
    elevationM: number;
  }) => {
    rows.push({
      id: makeLayoutId('row'),
      kind: 'row',
      label: opts.suffix ? `Rang ${opts.letter} · ${opts.suffix}` : `Rangée ${opts.letter}`,
      rowName: `Rang ${opts.letter}${opts.suffix ? ` ${opts.suffix}` : ''}`,
      seatCount: opts.seats,
      chairType,
      chairStyle,
      seatMaterial,
      tier: opts.tier,
      x: opts.x,
      y: opts.y,
      curve: opts.curve,
      rotation: opts.rotation,
      aisleSplit: style === 'horseshoeU' ? opts.suffix === 'fond' : aisleSplit,
      aisleWidthPct: 14,
      elevationM: opts.elevationM,
      focusX: centerX,
      focusY,
      showSeatNumbers: true,
      amphitheaterStyle: style,
      groupId,
    });
  };

  for (let t = 0; t < tierCount; t += 1) {
    const letter = String.fromCharCode(65 + t);
    const radius = radiusStart + t * radiusStep;
    const elevationM = Number(((t + 1) * risePerTierM).toFixed(2));
    const seats = seatsGrownForTier(style, seatsPerRow, t);
    const curve = spanCurve > 0 ? Math.max(12, spanCurve - t * 3) : 0;
    const y = Math.min(92, focusY + radius);

    if (style === 'horseshoeU') {
      const wingSeats = Math.max(4, Math.round(seats * 0.45));
      const wingAngle = 46;
      const rad = (wingAngle * Math.PI) / 180;
      const wingY = Math.min(90, focusY + Math.cos(rad) * radius * 0.78);
      const wingX = Math.sin(rad) * radius * 0.9;
      pushRow({
        letter,
        suffix: 'fond',
        seats: Math.max(4, seats - 4),
        x: centerX,
        y,
        rotation: 0,
        curve,
        tier: t + 1,
        elevationM,
      });
      pushRow({
        letter,
        suffix: 'ouest',
        seats: wingSeats,
        x: Math.max(8, centerX - wingX),
        y: wingY,
        rotation: wingAngle,
        curve: Math.round(curve * 0.55),
        tier: t + 1,
        elevationM,
      });
      pushRow({
        letter,
        suffix: 'est',
        seats: wingSeats,
        x: Math.min(92, centerX + wingX),
        y: wingY,
        rotation: -wingAngle,
        curve: Math.round(curve * 0.55),
        tier: t + 1,
        elevationM,
      });
      continue;
    }

    pushRow({
      letter,
      seats,
      x: centerX,
      y,
      rotation: 0,
      curve,
      tier: t + 1,
      elevationM,
    });
  }

  return rows;
}

export const chairStyleLabels: Record<ChairStyle, string> = {
  classic: 'Classique',
  lounge: 'Lounge',
  club: 'Club',
  bergere: 'Bergère',
  modern: 'Moderne',
  chiavari: 'Chiavari',
  napoleon: 'Napoléon III',
  crossback: 'Cross-back',
  tolix: 'Tolix (métal)',
  ghost: 'Ghost (transparent)',
  panton: 'Panton',
  louis: 'Louis XVI',
  ovalBack: 'Dossier ovale (rose)',
};

export const seatMaterialLabels: Record<SeatMaterial, string> = {
  velvet: 'Velours',
  leather: 'Cuir',
  linen: 'Lin',
  fabric: 'Tissu',
  wood: 'Bois',
  plastic: 'Plastique',
  boucle: 'Bouclé',
  suede: 'Suède',
  mesh: 'Mesh / résille',
  rattan: 'Rotin',
};

export const SEAT_MATERIAL_COLORS: Record<SeatMaterial, { seat: string; frame: string }> = {
  velvet: { seat: '#4c1d95', frame: '#c9a227' },
  leather: { seat: '#7c2d12', frame: '#292524' },
  linen: { seat: '#e7e5e4', frame: '#a8a29e' },
  fabric: { seat: '#1e3a5f', frame: '#78716c' },
  wood: { seat: '#92400e', frame: '#78350f' },
  plastic: { seat: '#64748b', frame: '#94a3b8' },
  boucle: { seat: '#d6d3d1', frame: '#78716c' },
  suede: { seat: '#a16207', frame: '#44403c' },
  mesh: { seat: '#334155', frame: '#1e293b' },
  rattan: { seat: '#ca8a04', frame: '#92400e' },
};

export const zoneKindLabels: Record<ZoneKind, string> = {
  dance: 'Piste de danse',
  vip: 'Espace VIP',
  buffet: 'Buffet',
  carpet: 'Moquette / tapis',
  custom: 'Zone libre',
};

export const zoneMaterialLabels: Record<ZoneMaterial, string> = {
  wood: 'Bois',
  carpet: 'Moquette',
  vinyl: 'Vinyle danse',
  led: 'Piste LED',
  marble: 'Marbre',
  concrete: 'Béton',
    parquet: 'Parquet',
    epoxy: 'Résine',
    grass: 'Gazon',
    gravel: 'Gravier',
    brick: 'Brique',
  };

export function defaultRoomOutline(shape: RoomOutlineShape = 'rectangle'): NonNullable<RoomLayoutBlueprint['roomOutline']> {
  return {
    shape,
    x: 5,
    y: 5,
    w: 90,
    h: 90,
    fill: 'rgba(248, 250, 252, 0.9)',
    stroke: '#94a3b8',
    strokeWidth: 2,
  };
}

/**
 * Sommets du contour en % du canvas (ordre horaire), selon la forme.
 * Utilisé pour murs WebGL et sol découpé.
 */
export function outlinePolygonPoints(
  outline: NonNullable<RoomLayoutBlueprint['roomOutline']>,
): Array<{ x: number; y: number }> {
  const { x, y, w, h, shape } = outline;
  const map = (px: number, py: number) => ({
    x: x + (px / 100) * w,
    y: y + (py / 100) * h,
  });

  switch (shape) {
    case 'square':
      return [map(20, 8), map(80, 8), map(80, 92), map(20, 92)];
    case 'circle': {
      const pts: Array<{ x: number; y: number }> = [];
      const n = 24;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        pts.push(map(50 + Math.cos(a) * 45, 50 + Math.sin(a) * 42));
      }
      return pts;
    }
    case 'ellipse': {
      const pts: Array<{ x: number; y: number }> = [];
      const n = 28;
      for (let i = 0; i < n; i += 1) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        pts.push(map(50 + Math.cos(a) * 48, 50 + Math.sin(a) * 30));
      }
      return pts;
    }
    case 'stadium': {
      const pts: Array<{ x: number; y: number }> = [];
      const n = 20;
      for (let i = 0; i <= n; i += 1) {
        const a = -Math.PI / 2 + (i / n) * Math.PI;
        pts.push(map(50 + Math.cos(a) * 46, 12 + Math.sin(a) * 8));
      }
      for (let i = 0; i <= n; i += 1) {
        const a = Math.PI / 2 + (i / n) * Math.PI;
        pts.push(map(50 + Math.cos(a) * 46, 88 + Math.sin(a) * 8));
      }
      return pts;
    }
    case 'hexagon':
      return [map(25, 0), map(75, 0), map(100, 50), map(75, 100), map(25, 100), map(0, 50)];
    case 'octagon':
      return [
        map(30, 0), map(70, 0), map(100, 30), map(100, 70),
        map(70, 100), map(30, 100), map(0, 70), map(0, 30),
      ];
    case 'pentagon':
      return [map(50, 0), map(100, 38), map(82, 100), map(18, 100), map(0, 38)];
    case 'triangle':
      return [map(50, 0), map(100, 100), map(0, 100)];
    case 'diamond':
      return [map(50, 0), map(100, 50), map(50, 100), map(0, 50)];
    case 'trapezoid':
      return [map(18, 0), map(82, 0), map(100, 100), map(0, 100)];
    case 'lShape':
      return [map(0, 0), map(65, 0), map(65, 35), map(100, 35), map(100, 100), map(0, 100)];
    case 'rShape':
      return [map(35, 0), map(100, 0), map(100, 100), map(0, 100), map(0, 35), map(35, 35)];
    case 'tShape':
      return [
        map(0, 0), map(100, 0), map(100, 38), map(68, 38),
        map(68, 100), map(32, 100), map(32, 38), map(0, 38),
      ];
    case 'uShape':
      return [
        map(0, 0), map(32, 0), map(32, 62), map(68, 62),
        map(68, 0), map(100, 0), map(100, 100), map(0, 100),
      ];
    case 'cross':
      return [
        map(35, 0), map(65, 0), map(65, 35), map(100, 35),
        map(100, 65), map(65, 65), map(65, 100), map(35, 100),
        map(35, 65), map(0, 65), map(0, 35), map(35, 35),
      ];
    case 'rectangle':
    default:
      return [map(0, 0), map(100, 0), map(100, 100), map(0, 100)];
  }
}

export const wallTextureLabels: Record<WallTextureStyle, string> = {
  plaster: 'Crépi / plâtre',
  brick: 'Brique',
  wood: 'Bois',
  concrete: 'Béton',
  wallpaper: 'Papier peint',
  stone: 'Pierre',
  limewash: 'Chaux / enduit minéral',
  tadelakt: 'Tadelakt (plâtre poli)',
  boardConcrete: 'Béton coulé (planches)',
  paintedBrick: 'Brique peinte',
  fluted: 'Panneaux cannelés',
  travertine: 'Travertin',
  slate: 'Ardoise',
  metalCorrugated: 'Tôle ondulée',
  metroTile: 'Carrelage métro',
  woodPanel: 'Lambris bois',
};

export const windowStyleLabels: Record<WindowStyle, string> = {
  rectangular: 'Rectangulaire',
  arched: 'En arche',
  bay: 'Baie vitrée',
  french: 'Française (croisillons)',
};

export const openingMaterialLabels: Record<OpeningMaterial, string> = {
  wood: 'Bois',
  glass: 'Vitre / verre',
  metal: 'Métal',
  painted: 'Peint',
  oak: 'Chêne',
  walnut: 'Noyer',
  lacquer: 'Laqué',
  brass: 'Laiton',
  blackSteel: 'Acier noir',
};

export const WALL_TEXTURE_COLORS: Record<WallTextureStyle, string> = {
  plaster: '#e8e4df',
  brick: '#b4533c',
  wood: '#8b6914',
  concrete: '#9ca3af',
  wallpaper: '#c4b5a0',
  stone: '#78716c',
  limewash: '#f5f0e8',
  tadelakt: '#e7e0d4',
  boardConcrete: '#a8a29e',
  paintedBrick: '#f1f5f9',
  fluted: '#e2e8f0',
  travertine: '#d6d3d1',
  slate: '#44403c',
  metalCorrugated: '#64748b',
  metroTile: '#f8fafc',
  woodPanel: '#c4a06a',
};

/** Aperçu couleur pour matériaux de porte / fenêtre. */
export const OPENING_MATERIAL_COLORS: Record<OpeningMaterial, string> = {
  wood: '#6b4423',
  glass: '#93c5fd',
  metal: '#64748b',
  painted: '#f1f5f9',
  oak: '#c4a06a',
  walnut: '#5c4030',
  lacquer: '#f8fafc',
  brass: '#c9a227',
  blackSteel: '#1e293b',
};

/** Presets muraux pour salles d’événement. */
export const WALL_STYLE_PRESETS: Array<{
  id: string;
  label: string;
  texture: WallTextureStyle;
  color?: string;
}> = [
  { id: 'reception', label: 'Réception classique', texture: 'limewash' },
  { id: 'mariage', label: 'Mariage élégant', texture: 'fluted', color: '#faf7f2' },
  { id: 'loft', label: 'Loft industriel', texture: 'metalCorrugated' },
  { id: 'seminaire', label: 'Séminaire', texture: 'plaster' },
  { id: 'gala', label: 'Gala / banquet', texture: 'tadelakt', color: '#f5f0e8' },
  { id: 'terrasse', label: 'Terrasse couverte', texture: 'boardConcrete' },
  { id: 'hotel', label: 'Hôtel premium', texture: 'travertine' },
  { id: 'bistro', label: 'Bistro / metro', texture: 'metroTile' },
];

export const tableSurfaceLabels: Record<TableSurfaceStyle, string> = {
  wood: 'Bois clair',
  linen: 'Nappe lin',
  walnut: 'Noyer',
  marble: 'Marbre',
  darkWood: 'Bois foncé',
  whiteLacquer: 'Laqué blanc',
  glass: 'Verre',
};

/** Ambiance complète : murs + sol + mobilier par défaut. */
export type RoomAmbiencePreset = {
  id: string;
  label: string;
  description: string;
  wallTexture: WallTextureStyle;
  wallColor?: string;
  wallPaintColor?: string;
  floorType: import('@/lib/roomThemeUtils').FloorType;
  floorColor?: string;
  roomThemeId?: import('@/lib/roomThemeUtils').BuiltInRoomThemeId;
  chairType: ChairType;
  chairStyle?: ChairStyle;
  seatMaterial?: SeatMaterial;
  tableSurface?: TableSurfaceStyle;
  defaultTableColor?: string;
  lightingPreset?: import('@/lib/roomRenderQuality').LightingPreset;
  showChandeliers?: boolean;
  chandelierType?: import('@/lib/roomCeilingUtils').ChandelierType;
  showRoof?: boolean;
  roofStyle?: RoofStyle;
  roofColor?: string;
  roofOpacity?: number;
};

export type SavedRoomAmbience = {
  id: string;
  name: string;
  preset: RoomAmbiencePreset;
};

export type SharedRoomAmbience = SavedRoomAmbience & {
  scope?: 'user' | 'org';
  authorName?: string;
  description?: string;
};

export type AmbienceHistoryEntry = {
  id: string;
  label: string;
  appliedAt: string;
  presetId?: string;
  preset?: RoomAmbiencePreset;
};

export const ROOM_AMBIENCE_PRESETS: RoomAmbiencePreset[] = [
  {
    id: 'mariage-chiavari',
    label: 'Mariage Chiavari',
    description: 'Murs cannelés, parquet, chaises dorées et nappes lin.',
    wallTexture: 'fluted',
    wallColor: '#faf7f2',
    wallPaintColor: '#faf7f2',
    floorType: 'parquet',
    floorColor: '#f5f0e8',
    roomThemeId: 'wedding',
    chairType: 'BANQUET',
    chairStyle: 'chiavari',
    seatMaterial: 'linen',
    tableSurface: 'linen',
    defaultTableColor: '#faf7f2',
    lightingPreset: 'day',
    showChandeliers: true,
    showRoof: true,
    roofStyle: 'tentSwag',
    roofColor: '#f5f0e8',
    roofOpacity: 0.78,
  },
  {
    id: 'gala-velours',
    label: 'Gala velours',
    description: 'Tadelakt, marbre, fauteuils club et plateau marbre.',
    wallTexture: 'tadelakt',
    wallPaintColor: '#f5f0e8',
    floorType: 'marbreCalacatta',
    roomThemeId: 'gala',
    chairType: 'ARMCHAIR',
    chairStyle: 'club',
    seatMaterial: 'velvet',
    tableSurface: 'marble',
    defaultTableColor: '#f8fafc',
    lightingPreset: 'night',
    showChandeliers: true,
    chandelierType: 'crystal',
  },
  {
    id: 'seminaire-mesh',
    label: 'Séminaire pro',
    description: 'Plâtre neutre, moquette, sièges mesh conférence.',
    wallTexture: 'plaster',
    floorType: 'moquette',
    floorColor: '#1e3a5f',
    roomThemeId: 'modern',
    chairType: 'MESH',
    seatMaterial: 'mesh',
    tableSurface: 'whiteLacquer',
    defaultTableColor: '#ffffff',
    lightingPreset: 'conference',
    showChandeliers: false,
  },
  {
    id: 'loft-industriel',
    label: 'Loft industriel',
    description: 'Tôle ondulée, béton, tabourets Tolix.',
    wallTexture: 'metalCorrugated',
    floorType: 'beton',
    roomThemeId: 'loft',
    chairType: 'BARSTOOL',
    chairStyle: 'tolix',
    seatMaterial: 'leather',
    tableSurface: 'darkWood',
    defaultTableColor: '#44403c',
    lightingPreset: 'dusk',
    showChandeliers: false,
  },
  {
    id: 'cocktail-ghost',
    label: 'Cocktail design',
    description: 'Chaux minérale, résine, chaises Ghost et verre.',
    wallTexture: 'limewash',
    floorType: 'epoxy',
    floorColor: '#e7e5e4',
    roomThemeId: 'soiree',
    chairType: 'GHOST',
    chairStyle: 'ghost',
    seatMaterial: 'plastic',
    tableSurface: 'glass',
    defaultTableColor: '#f8fafc',
    lightingPreset: 'night',
    showChandeliers: true,
    chandelierType: 'modern',
  },
  {
    id: 'rustique-crossback',
    label: 'Rustique champêtre',
    description: 'Brique, bois rustique, cross-back et plateau bois.',
    wallTexture: 'brick',
    floorType: 'boisRustique',
    roomThemeId: 'rustique',
    chairType: 'CROSSBACK',
    chairStyle: 'crossback',
    seatMaterial: 'linen',
    tableSurface: 'wood',
    defaultTableColor: '#e8d5a3',
    lightingPreset: 'banquet',
    showChandeliers: true,
    chandelierType: 'lantern',
  },
  {
    id: 'hotel-travertin',
    label: 'Hôtel premium',
    description: 'Travertin, parquet chevron, banquet classique.',
    wallTexture: 'travertine',
    floorType: 'chevronGreige',
    roomThemeId: 'champagne',
    chairType: 'BANQUET',
    chairStyle: 'napoleon',
    seatMaterial: 'velvet',
    tableSurface: 'walnut',
    defaultTableColor: '#d6c4a0',
    lightingPreset: 'day',
    showChandeliers: true,
    chandelierType: 'classic',
  },
  {
    id: 'bistro-metro',
    label: 'Bistro parisien',
    description: 'Carrelage métro, damier, chaises bistrot.',
    wallTexture: 'metroTile',
    floorType: 'damier',
    roomThemeId: 'classic',
    chairType: 'BANQUET',
    chairStyle: 'classic',
    seatMaterial: 'leather',
    tableSurface: 'darkWood',
    defaultTableColor: '#292524',
    lightingPreset: 'dusk',
    showChandeliers: true,
    chandelierType: 'industrial',
  },
];

export type AmbienceApplyScope = {
  walls: boolean;
  floor: boolean;
  theme: boolean;
  furniture: boolean;
  lighting: boolean;
};

export const DEFAULT_AMBIENCE_SCOPE: AmbienceApplyScope = {
  walls: true,
  floor: true,
  theme: true,
  furniture: true,
  lighting: true,
};

export function applyRoomAmbiencePreset(
  blueprint: RoomLayoutBlueprint,
  preset: RoomAmbiencePreset,
  scope: AmbienceApplyScope = DEFAULT_AMBIENCE_SCOPE,
): RoomLayoutBlueprint {
  const metadata = { ...blueprint.metadata };

  if (scope.floor) {
    metadata.floorType = preset.floorType;
    metadata.floorColor = preset.floorColor;
    metadata.floorImageUrl = undefined;
    metadata.floorImageFit = undefined;
  }
  if (scope.theme) {
    metadata.roomThemeId = preset.roomThemeId ?? blueprint.metadata.roomThemeId;
  }
  if (scope.walls) {
    metadata.wallPaintColor = preset.wallPaintColor ?? preset.wallColor;
  }
  if (scope.furniture) {
    metadata.defaultTableColor = preset.defaultTableColor;
    metadata.defaultTableSurface = preset.tableSurface;
  }
  if (scope.lighting) {
    metadata.lightingPreset = preset.lightingPreset ?? blueprint.metadata.lightingPreset;
    metadata.showChandeliers = preset.showChandeliers ?? blueprint.metadata.showChandeliers;
    metadata.chandelierType = preset.chandelierType ?? blueprint.metadata.chandelierType;
    metadata.showRoof = preset.showRoof ?? blueprint.metadata.showRoof;
    metadata.roofStyle = preset.roofStyle ?? blueprint.metadata.roofStyle;
    metadata.roofColor = preset.roofColor ?? blueprint.metadata.roofColor;
    metadata.roofOpacity = preset.roofOpacity ?? blueprint.metadata.roofOpacity;
  }

  const walls = scope.walls
    ? (blueprint.walls ?? []).map((w) => ({
        ...w,
        texture: preset.wallTexture,
        color: preset.wallColor,
      }))
    : blueprint.walls;

  const furniture = scope.furniture
    ? blueprint.furniture.map((item) => {
        if (item.kind === 'table') {
          return {
            ...item,
            chairType: preset.chairType,
            chairStyle: preset.chairStyle,
            seatMaterial: preset.seatMaterial,
            tableSurface: preset.tableSurface,
            tableColor: preset.defaultTableColor ?? item.tableColor,
          };
        }
        if (item.kind === 'row' || item.kind === 'chair') {
          return {
            ...item,
            chairType: preset.chairType,
            chairStyle: preset.chairStyle,
            seatMaterial: preset.seatMaterial,
          };
        }
        return item;
      })
    : blueprint.furniture;

  const next: RoomLayoutBlueprint = {
    ...blueprint,
    metadata,
    walls,
    furniture,
  };
  return refreshBlueprintMetadata(next);
}

export function recordAmbienceHistory(
  blueprint: RoomLayoutBlueprint,
  preset: RoomAmbiencePreset,
): RoomLayoutBlueprint {
  const entry: AmbienceHistoryEntry = {
    id: `hist-${Date.now().toString(36)}`,
    label: preset.label,
    appliedAt: new Date().toISOString(),
    presetId: preset.id,
    preset: { ...preset },
  };
  const history = blueprint.metadata.ambienceHistory ?? [];
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      ambienceHistory: [entry, ...history.filter((h) => h.presetId !== preset.id)].slice(0, 10),
    },
  };
}

export function captureRoomAmbienceFromBlueprint(
  blueprint: RoomLayoutBlueprint,
  id: string,
  label: string,
  description?: string,
): RoomAmbiencePreset {
  const wall = blueprint.walls?.[0];
  const table = blueprint.furniture.find((f) => f.kind === 'table');
  return {
    id,
    label,
    description: description?.trim() || `Ambiance « ${label} »`,
    wallTexture: wall?.texture ?? 'plaster',
    wallColor: wall?.color,
    wallPaintColor: blueprint.metadata.wallPaintColor,
    floorType: blueprint.metadata.floorType ?? 'parquet',
    floorColor: blueprint.metadata.floorColor,
    roomThemeId: blueprint.metadata.roomThemeId as import('@/lib/roomThemeUtils').BuiltInRoomThemeId | undefined,
    chairType: table && table.kind === 'table' ? table.chairType : 'BANQUET',
    chairStyle: table && table.kind === 'table' ? table.chairStyle : undefined,
    seatMaterial: table && table.kind === 'table' ? table.seatMaterial : undefined,
    tableSurface: table && table.kind === 'table'
      ? table.tableSurface ?? blueprint.metadata.defaultTableSurface
      : blueprint.metadata.defaultTableSurface,
    defaultTableColor: table && table.kind === 'table'
      ? table.tableColor ?? blueprint.metadata.defaultTableColor
      : blueprint.metadata.defaultTableColor,
    lightingPreset: blueprint.metadata.lightingPreset,
    showChandeliers: blueprint.metadata.showChandeliers,
    chandelierType: blueprint.metadata.chandelierType,
  };
}

export function saveCustomAmbienceToBlueprint(
  blueprint: RoomLayoutBlueprint,
  name: string,
): RoomLayoutBlueprint {
  const trimmed = name.trim();
  if (!trimmed) return blueprint;
  const id = `amb-${Date.now().toString(36)}`;
  const preset = captureRoomAmbienceFromBlueprint(blueprint, id, trimmed);
  const existing = blueprint.metadata.customAmbiences ?? [];
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      customAmbiences: [{ id, name: trimmed, preset }, ...existing].slice(0, 12),
    },
  };
}

export function deleteCustomAmbienceFromBlueprint(
  blueprint: RoomLayoutBlueprint,
  ambienceId: string,
): RoomLayoutBlueprint {
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      customAmbiences: (blueprint.metadata.customAmbiences ?? []).filter((a) => a.id !== ambienceId),
    },
  };
}

export const AMBIENCE_EXPORT_VERSION = 1;

export type AmbienceExportPayload = {
  version: number;
  exportedAt: string;
  ambiences: SavedRoomAmbience[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeAmbiencePreset(raw: unknown): RoomAmbiencePreset | null {
  if (!isRecord(raw)) return null;
  const wallTexture = raw.wallTexture;
  const floorType = raw.floorType;
  const chairType = raw.chairType;
  if (typeof wallTexture !== 'string' || !(wallTexture in wallTextureLabels)) return null;
  if (typeof floorType !== 'string') return null;
  if (typeof chairType !== 'string' || !(chairType in chairTypeLabels)) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `amb-${Date.now().toString(36)}`;
  const label = typeof raw.label === 'string' && raw.label.trim() ? raw.label.trim() : 'Ambiance importée';
  const description = typeof raw.description === 'string' ? raw.description : label;

  const preset: RoomAmbiencePreset = {
    id,
    label,
    description,
    wallTexture: wallTexture as WallTextureStyle,
    floorType: floorType as import('@/lib/roomThemeUtils').FloorType,
    chairType: chairType as ChairType,
  };

  if (typeof raw.wallColor === 'string') preset.wallColor = raw.wallColor;
  if (typeof raw.wallPaintColor === 'string') preset.wallPaintColor = raw.wallPaintColor;
  if (typeof raw.floorColor === 'string') preset.floorColor = raw.floorColor;
  if (typeof raw.roomThemeId === 'string') preset.roomThemeId = raw.roomThemeId as import('@/lib/roomThemeUtils').BuiltInRoomThemeId;
  if (typeof raw.chairStyle === 'string' && raw.chairStyle in chairStyleLabels) preset.chairStyle = raw.chairStyle as ChairStyle;
  if (typeof raw.seatMaterial === 'string' && raw.seatMaterial in seatMaterialLabels) preset.seatMaterial = raw.seatMaterial as SeatMaterial;
  if (typeof raw.tableSurface === 'string' && raw.tableSurface in tableSurfaceLabels) preset.tableSurface = raw.tableSurface as TableSurfaceStyle;
  if (typeof raw.defaultTableColor === 'string') preset.defaultTableColor = raw.defaultTableColor;
  if (typeof raw.lightingPreset === 'string') preset.lightingPreset = raw.lightingPreset as import('@/lib/roomRenderQuality').LightingPreset;
  if (typeof raw.showChandeliers === 'boolean') preset.showChandeliers = raw.showChandeliers;
  if (typeof raw.chandelierType === 'string') preset.chandelierType = raw.chandelierType as import('@/lib/roomCeilingUtils').ChandelierType;

  return preset;
}

function sanitizeSavedAmbience(raw: unknown): SavedRoomAmbience | null {
  if (!isRecord(raw)) return null;
  const preset = sanitizeAmbiencePreset(raw.preset ?? raw);
  if (!preset) return null;
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : preset.label;
  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : preset.id;
  return {
    id,
    name,
    preset: { ...preset, id, label: name },
  };
}

export function exportAmbiencesPayload(ambiences: SavedRoomAmbience[]): string {
  const payload: AmbienceExportPayload = {
    version: AMBIENCE_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    ambiences,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseAmbienceImport(raw: string): SavedRoomAmbience[] {
  const data = JSON.parse(raw) as unknown;
  if (Array.isArray(data)) {
    return data.map(sanitizeSavedAmbience).filter((item): item is SavedRoomAmbience => item !== null);
  }
  if (isRecord(data) && Array.isArray(data.ambiences)) {
    return data.ambiences
      .map(sanitizeSavedAmbience)
      .filter((item): item is SavedRoomAmbience => item !== null);
  }
  const single = sanitizeSavedAmbience(data);
  return single ? [single] : [];
}

export function importCustomAmbiencesToBlueprint(
  blueprint: RoomLayoutBlueprint,
  items: SavedRoomAmbience[],
  mode: 'merge' | 'replace' = 'merge',
): RoomLayoutBlueprint {
  const sanitized = items.slice(0, 24);
  if (mode === 'replace') {
    return {
      ...blueprint,
      metadata: { ...blueprint.metadata, customAmbiences: sanitized.slice(0, 12) },
    };
  }
  const merged = new Map((blueprint.metadata.customAmbiences ?? []).map((item) => [item.id, item]));
  for (const item of sanitized) merged.set(item.id, item);
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      customAmbiences: Array.from(merged.values()).slice(0, 12),
    },
  };
}

const AMBIENCE_COMPARE_KEYS: (keyof RoomAmbiencePreset)[] = [
  'wallTexture',
  'wallColor',
  'wallPaintColor',
  'floorType',
  'floorColor',
  'roomThemeId',
  'chairType',
  'chairStyle',
  'seatMaterial',
  'tableSurface',
  'defaultTableColor',
  'lightingPreset',
  'showChandeliers',
  'chandelierType',
];

export function roomAmbienceMatchesBlueprint(
  blueprint: RoomLayoutBlueprint,
  preset: RoomAmbiencePreset,
): boolean {
  const snap = captureRoomAmbienceFromBlueprint(blueprint, preset.id, preset.label);
  return AMBIENCE_COMPARE_KEYS.every((key) => {
    const current = snap[key];
    const expected = preset[key];
    if (current === undefined && expected === undefined) return true;
    return current === expected;
  });
}

export function resolveZonePreviewBackground(
  zone: { material?: ZoneMaterial; color?: string },
  fallback = 'rgba(49,46,129,0.45)',
): string {
  if (zone.color) return zone.color;
  if (zone.material) {
    const tones: Record<ZoneMaterial, string> = {
      wood: 'rgba(139,105,20,0.55)',
      carpet: 'rgba(30,58,95,0.6)',
      vinyl: 'rgba(231,229,228,0.75)',
      led: 'rgba(251,191,36,0.65)',
      marble: 'rgba(231,229,228,0.7)',
      concrete: 'rgba(156,163,175,0.65)',
      parquet: 'rgba(196,160,106,0.6)',
      epoxy: 'rgba(203,213,225,0.7)',
      grass: 'rgba(77,124,63,0.6)',
      gravel: 'rgba(120,113,108,0.65)',
      brick: 'rgba(180,83,9,0.6)',
    };
    return tones[zone.material];
  }
  return fallback;
}

export function createWallOpening(
  kind: 'door' | 'window',
  partial: Partial<RoomWallOpening> = {},
): RoomWallOpening {
  if (kind === 'door') {
    const style = (partial.style as DoorStyle) ?? 'single';
    return {
      id: makeLayoutId('door'),
      kind: 'door',
      t: partial.t ?? 0.5,
      widthM: partial.widthM ?? (
        style === 'double' || style === 'frenchDoor' ? 1.6
          : style === 'folding' ? 2.4
            : style === 'sliding' ? 1.2
              : style === 'fireExit' ? 1.1
                : 0.9
      ),
      heightM: partial.heightM ?? (style === 'arch' ? 2.4 : style === 'fireExit' ? 2.2 : 2.1),
      sillM: partial.sillM ?? 0,
      style,
      material: partial.material ?? (
        style === 'glass' ? 'glass'
          : style === 'fireExit' ? 'blackSteel'
            : 'wood'
      ),
      color: partial.color ?? '#6b4423',
      frameColor: partial.frameColor ?? '#3f2a1a',
      hasMat: partial.hasMat ?? true,
      matColor: partial.matColor ?? '#1e3a5f',
    };
  }
  const style = (partial.style as WindowStyle) ?? 'rectangular';
  return {
    id: makeLayoutId('window'),
    kind: 'window',
    t: partial.t ?? 0.5,
    widthM: partial.widthM ?? (style === 'bay' ? 1.8 : style === 'french' ? 1.4 : 1.2),
    heightM: partial.heightM ?? (style === 'arched' ? 1.5 : 1.2),
    sillM: partial.sillM ?? 0.9,
    style,
    material: partial.material ?? (style === 'bay' || style === 'french' ? 'glass' : 'glass'),
    color: partial.color ?? '#93c5fd',
    frameColor: partial.frameColor ?? '#f8fafc',
  };
}

export function createWallSegment(partial: Partial<RoomWallSegment> = {}): RoomWallSegment {
  return {
    id: makeLayoutId('wall'),
    start: partial.start ?? { x: 10, y: 10 },
    end: partial.end ?? { x: 90, y: 10 },
    heightM: partial.heightM ?? 3,
    thicknessM: partial.thicknessM ?? 0.2,
    texture: partial.texture ?? 'plaster',
    color: partial.color,
    openings: partial.openings ?? [],
  };
}

/** Génère les murs le long du polygone de la forme de salle. */
export function wallsFromRoomOutline(
  outline: NonNullable<RoomLayoutBlueprint['roomOutline']>,
  opts: { heightM?: number; thicknessM?: number; texture?: WallTextureStyle; withEntrance?: boolean } = {},
): RoomWallSegment[] {
  const heightM = opts.heightM ?? 3;
  const thicknessM = opts.thicknessM ?? 0.2;
  const texture = opts.texture ?? 'plaster';
  const points = outlinePolygonPoints(outline);
  if (points.length < 3) {
    const { x, y, w, h } = outline;
    const fallback = [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ];
    return fallback.map((start, i) =>
      createWallSegment({
        start,
        end: fallback[(i + 1) % 4],
        heightM,
        thicknessM,
        texture,
        openings: i === 2 && opts.withEntrance !== false
          ? [createWallOpening('door', { t: 0.5, style: 'double' })]
          : [],
      }),
    );
  }

  // Mur d’entrée = segment le plus proche du bas (y max) au centre
  let entranceIdx = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const midY = (a.y + b.y) / 2;
    const midX = (a.x + b.x) / 2;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const score = midY * 2 - Math.abs(midX - 50) * 0.3 + len * 0.05;
    if (score > bestScore) {
      bestScore = score;
      entranceIdx = i;
    }
  }

  const walls: RoomWallSegment[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const openings: RoomWallOpening[] = [];
    if (opts.withEntrance !== false && i === entranceIdx) {
      openings.push(createWallOpening('door', { t: 0.5, style: 'double' }));
    } else if (points.length <= 8 && i !== entranceIdx) {
      openings.push(createWallOpening('window', { t: 0.35 }));
      openings.push(createWallOpening('window', { t: 0.65 }));
    } else if (i % 3 === 0 && i !== entranceIdx) {
      openings.push(createWallOpening('window', { t: 0.5 }));
    }
    walls.push(createWallSegment({ start, end, heightM, thicknessM, texture, openings }));
  }
  return walls;
}

export function resolveBlueprintWalls(blueprint: RoomLayoutBlueprint): RoomWallSegment[] {
  if (Array.isArray(blueprint.walls)) return blueprint.walls;
  const outline = blueprint.roomOutline ?? defaultRoomOutline('rectangle');
  return wallsFromRoomOutline(outline, { withEntrance: true });
}

export function wallLengthPct(wall: RoomWallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.hypot(dx, dy);
}

export function wallLengthMeters(wall: RoomWallSegment, canvas: { widthM: number; heightM: number }): number {
  const pct = wallLengthPct(wall);
  // Approximation : moyenne des axes canvas
  const avgM = (canvas.widthM + canvas.heightM) / 2;
  return (pct / 100) * avgM;
}

export function ensureBlueprintDefaults(blueprint: RoomLayoutBlueprint): RoomLayoutBlueprint {
  const outline = blueprint.roomOutline ?? defaultRoomOutline('rectangle');
  const stories =
    Array.isArray(blueprint.metadata.stories) && blueprint.metadata.stories.length > 0
      ? blueprint.metadata.stories
      : [{ id: 'story-rdc', label: 'RDC', elevationM: 0 }];
  const activeStoryId =
    blueprint.metadata.activeStoryId && stories.some((s) => s.id === blueprint.metadata.activeStoryId)
      ? blueprint.metadata.activeStoryId
      : stories[0]!.id;
  return {
    ...blueprint,
    roomOutline: outline,
    walls: Array.isArray(blueprint.walls)
      ? blueprint.walls
      : wallsFromRoomOutline(outline, { withEntrance: true }),
    metadata: {
      ...blueprint.metadata,
      defaultTableColor: blueprint.metadata.defaultTableColor ?? '#ffffff',
      stories,
      activeStoryId,
      foundation: blueprint.metadata.foundation ?? { kind: 'none', heightM: 0 },
    },
  };
}

export interface RoomLayoutTemplate {
  id: string;
  name: string;
  description: string;
  roomType: RoomType;
  outlineShape: RoomOutlineShape;
  build: (params?: LayoutParams) => RoomLayoutBlueprint;
}

function composeTemplate(
  templateId: string,
  roomType: RoomType,
  outline: RoomOutlineShape,
  params: LayoutParams,
  arrange?: TableArrangePreset,
): RoomLayoutBlueprint {
  let next = ensureBlueprintDefaults({
    ...generateRoomBlueprint(roomType, params),
    templateId,
    roomOutline: defaultRoomOutline(outline),
  });
  if (arrange) next = autoArrangeTables(next, arrange);
  return next;
}

function emptyRoomTemplate(
  templateId: string,
  outline: RoomOutlineShape,
  params?: LayoutParams,
): RoomLayoutBlueprint {
  const seatsPer = Math.max(2, params?.seatsPerTable ?? 8);
  const fromTotal = params?.totalSeats ? Math.ceil(params.totalSeats / seatsPer) : 0;
  const tableCount = params?.tableCount ?? fromTotal;
  if (tableCount && tableCount > 0) {
    return composeTemplate(
      templateId,
      'BANQUET',
      outline,
      { tableShape: 'round', seatsPerTable: seatsPer, ...params, tableCount },
      params?.arrangePreset ?? 'grid',
    );
  }
  return ensureBlueprintDefaults({
    version: 1,
    roomType: 'SIMPLE',
    templateId,
    canvas: { widthM: params?.canvasWidthM ?? 20, heightM: params?.canvasHeightM ?? 15 },
    roomOutline: defaultRoomOutline(outline),
    fixtures: [],
    furniture: [],
    metadata: { totalSeats: 0 },
  });
}

export const ROOM_LAYOUT_TEMPLATES: RoomLayoutTemplate[] = [
  {
    id: 'banquet-classic',
    name: 'Banquet classique',
    description: 'Tables rondes en grille + scène',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => composeTemplate('banquet-classic', 'BANQUET', 'rectangle', { tableCount: 8, tableShape: 'round', ...p }, 'grid'),
  },
  {
    id: 'banquet-oval',
    name: 'Banquet ovale',
    description: 'Salle ronde, tables en cercle',
    roomType: 'BANQUET',
    outlineShape: 'circle',
    build: (p) => composeTemplate('banquet-oval', 'BANQUET', 'circle', { tableCount: 12, tableShape: 'round', ...p }, 'circle'),
  },
  {
    id: 'banquet-ushape',
    name: 'Banquet en U',
    description: 'Tables rectangulaires ouvertes vers la scène',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => composeTemplate('banquet-ushape', 'BANQUET', 'rectangle', { tableCount: 10, tableShape: 'rectangular', seatsPerTable: 6, ...p }, 'ushape'),
  },
  {
    id: 'banquet-circle',
    name: 'Banquet en cercle',
    description: 'Tables autour d’un espace central',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => composeTemplate('banquet-circle', 'BANQUET', 'rectangle', { tableCount: 10, tableShape: 'round', ...p }, 'circle'),
  },
  {
    id: 'banquet-honor',
    name: 'Table d’honneur',
    description: 'Table d’honneur verrouillée + invités en banquet',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const guestCount = Math.max(2, (p?.tableCount ?? 10) - 1);
      const next = composeTemplate(
        'banquet-honor',
        'BANQUET',
        'rectangle',
        { tableShape: 'round', seatsPerTable: 8, chairType: 'BANQUET', ...p, tableCount: guestCount },
        'banquet',
      );
      const honor: Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }> = {
        id: makeLayoutId('table'),
        kind: 'table',
        name: 'Table d’honneur',
        shape: 'rectangular',
        capacity: Math.max(8, p?.seatsPerTable ?? 12),
        chairType: p?.chairType ?? 'ARMCHAIR',
        x: 50,
        y: 18,
        locked: true,
      };
      return refreshBlueprintMetadata({ ...next, furniture: [honor, ...next.furniture] });
    },
  },
  {
    id: 'wedding-aisle-banquet',
    name: 'Mariage — allée & banquet',
    description: 'Deux rangées de tables, allée blanche, arche florale, nappes et Chiavari or',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'wedding-aisle-banquet',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 10, tableShape: 'round', seatsPerTable: p?.seatsPerTable ?? 8, chairType: 'BANQUET', ...p },
        'banquet',
      );
      const furniture = next.furniture.map((item) =>
        item.kind === 'table'
          ? {
            ...item,
            chairStyle: 'chiavari' as const,
            seatMaterial: 'linen' as const,
            tableSurface: 'linen' as const,
            tableColor: '#faf7f2',
            hasCenterpiece: true,
            hasCouverts: true,
            couvertStyle: 'gold' as const,
          }
          : item,
      );
      return refreshBlueprintMetadata({
        ...next,
        furniture,
        fixtures: [
          {
            id: makeLayoutId('aisle'),
            kind: 'aisle',
            x: 46,
            y: 16,
            w: 8,
            h: 72,
            label: 'Allée d’honneur',
            aisleStyle: 'whiteMirror',
            color: '#f8fafc',
            hasGoldBorder: false,
            hasSideLanterns: false,
            hasPetals: false,
          },
          {
            id: makeLayoutId('stage'),
            kind: 'stage',
            x: 34,
            y: 3,
            w: 32,
            h: 12,
            label: 'Plateau',
            heightM: 0.32,
            stageShape: 'semiCircle',
            color: '#f8fafc',
            material: 'marble',
          },
          {
            id: makeLayoutId('arch'),
            kind: 'arch',
            x: 36,
            y: 2,
            w: 28,
            h: 12,
            label: 'Arche florale',
            color: '#f4e8e4',
            flowerType: 'rose',
          },
          {
            id: makeLayoutId('chandelier'),
            kind: 'chandelier',
            x: 46,
            y: 32,
            w: 8,
            h: 8,
            label: 'Lustre',
            chandelierStyle: 'crystalCascade',
            lightWarmth: 'gold',
            heightM: 3.5,
          },
          {
            id: makeLayoutId('chandelier'),
            kind: 'chandelier',
            x: 46,
            y: 58,
            w: 8,
            h: 8,
            label: 'Lustre',
            chandelierStyle: 'fairyCanopy',
            lightWarmth: 'gold',
            heightM: 3.4,
          },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'parquet',
          floorColor: '#f5f0e8',
          defaultTableSurface: 'linen',
          defaultTableColor: '#faf7f2',
          showRoof: true,
          roofStyle: 'tentSwag',
          roofColor: '#f5f0e8',
          roofOpacity: 0.78,
          showChandeliers: false,
          showCurtains: true,
          curtainColor: '#faf7f2',
          lightingPreset: 'banquet',
        },
      });
    },
  },
  {
    id: 'wedding-organic-gala',
    name: 'Mariage — gala organique',
    description: 'Anneau d’arcs, nappes blush, motifs au sol et cloisons roses',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'wedding-organic-gala',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 6, tableShape: 'round', seatsPerTable: p?.seatsPerTable ?? 8, chairType: 'BANQUET', ...p },
        'circle',
      );
      const blush = '#e8d4c8';
      const ring = composeArcRing({
        centerX: 50,
        centerY: 54,
        radiusPct: 20,
        segmentCount: 6,
        capacity: p?.seatsPerTable ?? 8,
        tableColor: blush,
      });
      const centerTable = {
        ...createBlueprintTable(ring.length + 1, { shape: 'round', capacity: 10, chairType: 'BANQUET' }),
        x: 50,
        y: 54,
        chairStyle: 'ovalBack' as const,
        seatMaterial: 'velvet' as const,
        tableSurface: 'linen' as const,
        tableColor: blush,
        hasCenterpiece: true,
        hasCouverts: true,
      };
      const satellites = next.furniture
        .filter((item): item is Extract<typeof item, { kind: 'table' }> => item.kind === 'table')
        .slice(0, 3)
        .map((item, index) => ({
          ...item,
          x: 18 + index * 32,
          y: 78,
          chairStyle: 'ovalBack' as const,
          seatMaterial: 'velvet' as const,
          tableSurface: 'linen' as const,
          tableColor: blush,
          hasCenterpiece: true,
          hasCouverts: true,
        }));
      return refreshBlueprintMetadata({
        ...next,
        furniture: [...ring, centerTable, ...satellites],
        fixtures: [
          {
            id: makeLayoutId('partition'),
            kind: 'partition',
            x: 12,
            y: 30,
            w: 24,
            h: 14,
            label: 'Cloison gauche',
            color: '#c4a4a4',
          },
          {
            id: makeLayoutId('partition'),
            kind: 'partition',
            x: 64,
            y: 30,
            w: 24,
            h: 14,
            label: 'Cloison droite',
            color: '#c4a4a4',
          },
          {
            id: makeLayoutId('stage'),
            kind: 'stage',
            x: 28,
            y: 3,
            w: 44,
            h: 12,
            label: 'Scène',
            heightM: 0.4,
            color: '#f8fafc',
            material: 'marble',
          },
          {
            id: makeLayoutId('buffet'),
            kind: 'buffet',
            x: 6,
            y: 4,
            w: 18,
            h: 8,
            label: 'Bar',
            color: '#f8fafc',
            material: 'marble',
          },
          {
            id: makeLayoutId('buffet'),
            kind: 'buffet',
            x: 76,
            y: 4,
            w: 18,
            h: 8,
            label: 'Bar',
            color: '#f8fafc',
            material: 'marble',
          },
          {
            id: makeLayoutId('decal'),
            kind: 'decal',
            x: 28,
            y: 40,
            w: 14,
            h: 14,
            label: 'Roses',
            decalKind: 'rose',
            color: '#dcaeae',
          },
          {
            id: makeLayoutId('decal'),
            kind: 'decal',
            x: 58,
            y: 62,
            w: 12,
            h: 12,
            label: 'Papillons',
            decalKind: 'butterfly',
            color: '#c4a06a',
          },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'epoxy',
          floorColor: '#f3eee6',
          defaultTableSurface: 'linen',
          defaultTableColor: blush,
        },
      });
    },
  },
  {
    id: 'classroom',
    name: 'Salle de classe',
    description: 'Tables rectangulaires en rangées, allée centrale',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'classroom',
        'BANQUET',
        'rectangle',
        { tableCount: 12, tableShape: 'rectangular', seatsPerTable: 6, chairType: 'FOLDING', ...p },
        'grid',
      );
      return refreshBlueprintMetadata({
        ...next,
        fixtures: [
          ...next.fixtures.filter((f) => f.kind !== 'stage'),
          {
            id: makeLayoutId('aisle'),
            kind: 'aisle',
            x: 48,
            y: 16,
            w: 4,
            h: 74,
            label: 'Allée centrale',
          },
          {
            id: makeLayoutId('podium'),
            kind: 'podium',
            x: 38,
            y: 4,
            w: 24,
            h: 10,
            label: 'Tableau / pupitre',
          },
        ],
      });
    },
  },
  {
    id: 'cocktail',
    name: 'Cocktail debout',
    description: 'Mange-debout, tabourets, disposition libre',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => composeTemplate(
      'cocktail',
      'BANQUET',
      'rectangle',
      { tableCount: 16, tableShape: 'round', seatsPerTable: 4, chairType: 'STOOL', ...p },
      'grid',
    ),
  },
  {
    id: 'boardroom',
    name: 'Salle de conseil',
    description: 'Une grande table centrale et fauteuils',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'boardroom',
        'BANQUET',
        'rectangle',
        { tableShape: 'rectangular', seatsPerTable: 16, chairType: 'ARMCHAIR', ...p, tableCount: 1 },
      );
      const table = next.furniture.find((f) => f.kind === 'table');
      const furniture = table && table.kind === 'table'
        ? [{ ...table, name: 'Table de conseil', x: 50, y: 52, locked: false }]
        : next.furniture;
      return refreshBlueprintMetadata({
        ...next,
        roomType: 'CONFERENCE',
        furniture,
        fixtures: [
          {
            id: makeLayoutId('entrance'),
            kind: 'entrance',
            x: 44,
            y: 88,
            w: 12,
            h: 8,
            label: 'Entrée',
          },
        ],
      });
    },
  },
  {
    id: 'conference-standard',
    name: 'Conférence standard',
    description: 'Rangées face au podium + allée',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => composeTemplate('conference-standard', 'CONFERENCE', 'rectangle', {
      rowCount: p?.rowCount ?? p?.tableCount ?? 6,
      seatsPerRow: p?.seatsPerRow ?? p?.seatsPerTable ?? 10,
      ...p,
    }),
  },
  {
    id: 'conference-ushape',
    name: 'Conférence en U',
    description: 'Tables rectangulaires ouvertes vers le podium',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'conference-ushape',
        'BANQUET',
        'rectangle',
        { tableCount: 9, tableShape: 'rectangular', seatsPerTable: 6, chairType: 'ARMCHAIR', ...p },
        'ushape',
      );
      return refreshBlueprintMetadata({
        ...next,
        roomType: 'CONFERENCE',
        fixtures: [
          {
            id: makeLayoutId('podium'),
            kind: 'podium',
            x: 40,
            y: 5,
            w: 20,
            h: 10,
            label: 'Podium',
          },
        ],
      });
    },
  },
  {
    id: 'amphitheater-small',
    name: 'Amphithéâtre compact',
    description: 'Gradins en pente autour de la scène',
    roomType: 'AMPHITHEATER',
    outlineShape: 'hexagon',
    build: (p) => composeTemplate('amphitheater-small', 'AMPHITHEATER', 'hexagon', {
      tierCount: p?.tierCount ?? 3,
      rowsPerTier: p?.rowsPerTier ?? 2,
      seatsPerRow: p?.seatsPerRow ?? p?.seatsPerTable ?? 12,
      ...p,
    }),
  },
  {
    id: 'amphitheater-slope',
    name: 'Amphithéâtre en pente',
    description: 'Gradins courbes surélevés face à la scène, allée centrale',
    roomType: 'AMPHITHEATER',
    outlineShape: 'trapezoid',
    build: (p) => composeTemplate('amphitheater-slope', 'AMPHITHEATER', 'trapezoid', {
      tierCount: p?.tierCount ?? 5,
      rowsPerTier: p?.rowsPerTier ?? 2,
      seatsPerRow: p?.seatsPerRow ?? p?.seatsPerTable ?? 14,
      chairType: p?.chairType ?? 'THEATER',
      ...p,
    }),
  },
  {
    id: 'chairs-theater',
    name: 'Théâtre — chaises seules',
    description: 'Rangées de sièges face au podium, sans tables',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const bp = generateChairOnlyBlueprint(
        { rowCount: p?.rowCount ?? p?.tableCount ?? 7, seatsPerRow: p?.seatsPerRow ?? p?.seatsPerTable ?? 12, ...p },
        p?.chairType ?? 'THEATER',
        'theater',
      );
      return refreshBlueprintMetadata({
        ...bp,
        templateId: 'chairs-theater',
        roomOutline: defaultRoomOutline('rectangle'),
      });
    },
  },
  {
    id: 'chairs-cinema',
    name: 'Cinéma — gradins chaises',
    description: 'Sièges seuls en pente face à l’écran',
    roomType: 'AMPHITHEATER',
    outlineShape: 'rectangle',
    build: (p) => {
      const bp = generateChairOnlyBlueprint(
        { rowCount: p?.rowCount ?? 10, seatsPerRow: p?.seatsPerRow ?? 14, ...p },
        p?.chairType ?? 'THEATER',
        'cinema',
      );
      return refreshBlueprintMetadata({
        ...bp,
        templateId: 'chairs-cinema',
        roomOutline: defaultRoomOutline('rectangle'),
      });
    },
  },
  {
    id: 'chairs-ceremony',
    name: 'Cérémonie — chaises',
    description: 'Pelouse, grille 4×8, allée blanche, autel et piédestaux',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const bp = generateChairOnlyBlueprint(
        { rowCount: p?.rowCount ?? 8, seatsPerRow: p?.seatsPerRow ?? 8, ...p },
        p?.chairType ?? 'FOLDING',
        'ceremony',
      );
      return refreshBlueprintMetadata({
        ...bp,
        templateId: 'chairs-ceremony',
        roomOutline: defaultRoomOutline('rectangle'),
      });
    },
  },
  {
    id: 'chairs-grid',
    name: 'Grille de chaises',
    description: 'Plan uniquement de chaises individuelles face au pupitre',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const bp = generateChairOnlyBlueprint(
        { rowCount: p?.rowCount ?? 6, seatsPerRow: p?.seatsPerRow ?? 8, ...p },
        p?.chairType ?? 'FOLDING',
        'grid',
      );
      return refreshBlueprintMetadata({
        ...bp,
        templateId: 'chairs-grid',
        roomOutline: defaultRoomOutline('rectangle'),
      });
    },
  },
  {
    id: 'tent-garden',
    name: 'Tente de réception',
    description: 'Tente octogonale avec tables',
    roomType: 'TENT',
    outlineShape: 'octagon',
    build: (p) => composeTemplate('tent-garden', 'TENT', 'octagon', { tableCount: 6, tableShape: 'round', ...p }, 'grid'),
  },
  {
    id: 'grand-hall-classical',
    name: 'Grand hall — colonnades',
    description: 'Colonnes cannelées, tables mixtes, chaises sombres et bougies',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'grand-hall-classical',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 10, tableShape: 'round', seatsPerTable: p?.seatsPerTable ?? 8, chairType: 'FOLDING', ...p },
        'banquet',
      );
      const furniture = next.furniture.map((item, index) =>
        item.kind === 'table'
          ? {
            ...item,
            shape: index % 3 === 0 ? 'rectangular' as const : 'round' as const,
            capacity: index % 3 === 0 ? 12 : 8,
            chairType: 'FOLDING' as const,
            seatMaterial: 'wood' as const,
            tableSurface: 'linen' as const,
            tableColor: '#faf7f2',
            hasCenterpiece: true,
            centerpieceStyle: (index % 3 === 0 ? 'greeneryRunner' : 'candleCluster') as CenterpieceStyle,
            hasCouverts: true,
          }
          : item,
      );
      return refreshBlueprintMetadata({
        ...next,
        furniture,
        fixtures: [
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 12, y: 18, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 12, y: 42, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 12, y: 66, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 85, y: 18, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 85, y: 42, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('column'), id: makeLayoutId('column'), x: 85, y: 66, columnShape: 'fluted', color: '#d6d3d1' },
          { ...createBlueprintFixture('chandelier'), id: makeLayoutId('chandelier'), x: 46, y: 32, chandelierStyle: 'candleCandelabra', lightWarmth: 'candle' },
          { ...createBlueprintFixture('chandelier'), id: makeLayoutId('chandelier'), x: 46, y: 58, chandelierStyle: 'candleCandelabra', lightWarmth: 'candle' },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'pierre',
          floorColor: '#d6d3d1',
          lightingPreset: 'banquet',
          wallPaintColor: '#f5f0e8',
        },
      });
    },
  },
  {
    id: 'garden-dusk-reception',
    name: 'Jardin — crépuscule',
    description: 'Pelouse, piste bois, guirlandes et chaises pliantes crème',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'garden-dusk-reception',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 8, tableShape: 'round', seatsPerTable: 8, chairType: 'FOLDING', ...p },
        'circle',
      );
      const furniture = [
        ...next.furniture.map((item) =>
          item.kind === 'table'
            ? {
              ...item,
              chairType: 'FOLDING' as const,
              seatMaterial: 'wood' as const,
              tableSurface: 'linen' as const,
              tableColor: '#faf7f2',
              hasCenterpiece: true,
              centerpieceStyle: 'candleCluster' as const,
              hasCouverts: true,
            }
            : item,
        ),
        {
          ...createBlueprintZone('Piste', 1, { zoneKind: 'dance', material: 'wood', w: 28, h: 22 }),
          x: 36,
          y: 38,
        },
        {
          ...createBlueprintZone('Terrasse brique', 2, { zoneKind: 'custom', material: 'brick', w: 22, h: 16, color: '#b45309' }),
          x: 6,
          y: 72,
        },
        {
          ...createBlueprintZone('Allée gravier', 3, { zoneKind: 'custom', material: 'gravel', w: 70, h: 8, color: '#a8a29e' }),
          x: 15,
          y: 18,
        },
      ];
      return refreshBlueprintMetadata({
        ...next,
        furniture,
        fixtures: [
          { ...createBlueprintFixture('stringLight'), id: makeLayoutId('stringLight') },
          { ...createBlueprintFixture('stage'), id: makeLayoutId('stage'), x: 8, y: 28, w: 18, h: 16, stageShape: 'semiCircle', material: 'concrete', color: '#a8a29e', heightM: 0.28 },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'herbe',
          floorColor: '#4d7c3f',
          lightingPreset: 'dusk',
        },
      });
    },
  },
  {
    id: 'night-banquet-edison',
    name: 'Banquet de nuit — Edison',
    description: 'Tables longues, runner verdure, Napoleon blanc et ciel nuit',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'night-banquet-edison',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 4, tableShape: 'rectangular', seatsPerTable: 14, chairType: 'BANQUET', ...p },
        'longBanquet',
      );
      const furniture = next.furniture.map((item, index) =>
        item.kind === 'table'
          ? {
            ...item,
            shape: index === 0 ? 'oval' as const : 'rectangular' as const,
            capacity: index === 0 ? 10 : 14,
            chairStyle: 'napoleon' as const,
            seatMaterial: 'linen' as const,
            tableSurface: 'linen' as const,
            tableColor: '#faf7f2',
            hasCenterpiece: true,
            centerpieceStyle: 'greeneryRunner' as const,
            hasCouverts: true,
          }
          : item,
      );
      return refreshBlueprintMetadata({
        ...next,
        furniture,
        fixtures: [{ ...createBlueprintFixture('stringLight'), id: makeLayoutId('stringLight'), x: 12, y: 12, w: 76, h: 76 }],
        metadata: {
          ...next.metadata,
          floorType: 'gravierFonce',
          floorColor: '#3f3f46',
          lightingPreset: 'night',
        },
      });
    },
  },
  {
    id: 'courtyard-gala',
    name: 'Cour — gala pierre',
    description: 'Dalles, piste marbre, cross-back et régie DJ',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'courtyard-gala',
        'BANQUET',
        'rectangle',
        { tableCount: p?.tableCount ?? 10, tableShape: 'round', seatsPerTable: 8, chairType: 'CROSSBACK', ...p },
        'grid',
      );
      const furniture = [
        ...next.furniture.map((item) =>
          item.kind === 'table'
            ? {
              ...item,
              chairType: 'CROSSBACK' as const,
              chairStyle: 'crossback' as const,
              seatMaterial: 'linen' as const,
              tableSurface: 'linen' as const,
              tableColor: '#faf7f2',
              hasCenterpiece: true,
              centerpieceStyle: 'candleCluster' as const,
              hasCouverts: true,
            }
            : item,
        ),
        {
          ...createBlueprintZone('Piste', 1, { zoneKind: 'dance', material: 'marble', w: 26, h: 22 }),
          x: 37,
          y: 36,
        },
      ];
      return refreshBlueprintMetadata({
        ...next,
        furniture,
        fixtures: [
          { ...createBlueprintFixture('djBooth'), id: makeLayoutId('djBooth'), x: 36, y: 4 },
          { ...createBlueprintFixture('stringLight'), id: makeLayoutId('stringLight') },
          { ...createBlueprintFixture('pedestal'), id: makeLayoutId('pedestal'), x: 20, y: 86, w: 8, h: 8, label: 'Vases' },
          { ...createBlueprintFixture('pedestal'), id: makeLayoutId('pedestal'), x: 72, y: 86, w: 8, h: 8, label: 'Vases' },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'pierreModulaire',
          lightingPreset: 'day',
        },
      });
    },
  },
  {
    id: 'fountain-gala',
    name: 'Gala — fontaine & gloriettes',
    description: 'Fontaine centrale, tables en arc, gloriettes et motifs au sol',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => {
      const next = composeTemplate(
        'fountain-gala',
        'BANQUET',
        'rectangle',
        { tableCount: 4, tableShape: 'arc', seatsPerTable: p?.seatsPerTable ?? 8, chairType: 'BANQUET', ...p },
        'circle',
      );
      const ring = composeArcRing({ centerX: 50, centerY: 52, radiusPct: 18, segmentCount: 4, tableColor: '#e8d4c8' });
      const satellites = next.furniture
        .filter((item): item is Extract<typeof item, { kind: 'table' }> => item.kind === 'table')
        .slice(0, 4)
        .map((item, index) => ({
          ...item,
          x: 18 + (index % 2) * 56,
          y: 22 + Math.floor(index / 2) * 50,
          chairStyle: 'louis' as const,
          seatMaterial: 'linen' as const,
          tableColor: '#e8d4c8',
          hasCenterpiece: true,
        }));
      return refreshBlueprintMetadata({
        ...next,
        furniture: [...ring, ...satellites],
        fixtures: [
          { ...createBlueprintFixture('fountain'), id: makeLayoutId('fountain') },
          { ...createBlueprintFixture('gazebo'), id: makeLayoutId('gazebo'), x: 8, y: 8, w: 22, h: 22 },
          { ...createBlueprintFixture('gazebo'), id: makeLayoutId('gazebo'), x: 70, y: 8, w: 22, h: 22 },
          { ...createBlueprintFixture('gazebo'), id: makeLayoutId('gazebo'), x: 8, y: 68, w: 22, h: 22 },
          { ...createBlueprintFixture('gazebo'), id: makeLayoutId('gazebo'), x: 70, y: 68, w: 22, h: 22 },
          { ...createBlueprintFixture('decal'), id: makeLayoutId('decal'), x: 42, y: 18, w: 16, h: 28, decalKind: 'path', color: '#f8fafc' },
          { ...createBlueprintFixture('stage'), id: makeLayoutId('stage'), x: 30, y: 2, w: 40, h: 10, color: '#1c1917' },
          { ...createBlueprintFixture('stringLight'), id: makeLayoutId('stringLight') },
        ],
        metadata: {
          ...next.metadata,
          floorType: 'pierre',
          lightingPreset: 'dusk',
        },
      });
    },
  },
  {
    id: 'stone-amphitheater-backyard',
    name: 'Amphi jardin — pierre',
    description: 'Gradins, lounge orange, scène à pignon et écran',
    roomType: 'AMPHITHEATER',
    outlineShape: 'trapezoid',
    build: (p) => {
      const rows = generateAmphitheaterRows({
        style: 'romanSemiCircle',
        tierCount: p?.rowCount ?? 5,
        seatsPerRow: p?.seatsPerRow ?? 8,
        chairType: 'ARMCHAIR',
        chairStyle: 'lounge',
        seatMaterial: 'suede',
      });
      return refreshBlueprintMetadata({
        version: 1,
        templateId: 'stone-amphitheater-backyard',
        roomType: 'AMPHITHEATER',
        canvas: { widthM: 22, heightM: 18 },
        roomOutline: defaultRoomOutline('trapezoid'),
        furniture: rows,
        fixtures: [
          { ...createBlueprintFixture('stage'), id: makeLayoutId('stage'), x: 32, y: 4, w: 36, h: 14, material: 'concrete', color: '#a8a29e', stageRoof: 'gabled', heightM: 0.4 },
          { ...createBlueprintFixture('screen'), id: makeLayoutId('screen'), x: 38, y: 3, w: 24, h: 5 },
        ],
        metadata: {
          totalSeats: rows.reduce((sum, row) => sum + row.seatCount, 0),
          floorType: 'dallesIrregulieres',
          lightingPreset: 'day',
          roofStyle: 'gabled',
          showRoof: true,
        },
      });
    },
  },
  {
    id: 'circular-auditorium',
    name: 'Auditorium circulaire',
    description: 'Bancs concentriques, sol rond et plafond à caissons',
    roomType: 'AMPHITHEATER',
    outlineShape: 'circle',
    build: (p) => {
      const rows = generateAmphitheaterRows({
        style: 'romanSemiCircle',
        tierCount: p?.rowCount ?? 6,
        seatsPerRow: p?.seatsPerRow ?? 16,
        chairType: 'THEATER',
        chairStyle: 'modern',
        seatMaterial: 'wood',
        aisleSplit: true,
      });
      return refreshBlueprintMetadata({
        version: 1,
        templateId: 'circular-auditorium',
        roomType: 'AMPHITHEATER',
        canvas: { widthM: 24, heightM: 24 },
        roomOutline: defaultRoomOutline('circle'),
        furniture: [
          ...rows,
          { ...createBlueprintZone('Scène ronde', 1, { zoneKind: 'custom', material: 'concrete', w: 22, h: 22 }), x: 39, y: 40 },
        ],
        fixtures: [{ ...createBlueprintFixture('stage'), id: makeLayoutId('stage'), x: 40, y: 42, w: 20, h: 16, material: 'concrete', color: '#cbd5e1', heightM: 0.12 }],
        metadata: {
          totalSeats: rows.reduce((sum, row) => sum + row.seatCount, 0),
          floorType: 'beton',
          lightingPreset: 'conference',
          roofStyle: 'coffered',
          showRoof: true,
          chandelierType: 'recessed',
          showChandeliers: true,
        },
      });
    },
  },
  {
    id: 'modern-auditorium',
    name: 'Auditorium moderne',
    description: 'Gradins, sièges navy, scène bois courbe et pupitre',
    roomType: 'AMPHITHEATER',
    outlineShape: 'stadium',
    build: (p) => {
      const rows = generateAmphitheaterRows({
        style: 'tieredSteps',
        tierCount: p?.rowCount ?? 7,
        seatsPerRow: p?.seatsPerRow ?? 14,
        chairType: 'THEATER',
        seatMaterial: 'velvet',
      });
      return refreshBlueprintMetadata({
        version: 1,
        templateId: 'modern-auditorium',
        roomType: 'AMPHITHEATER',
        canvas: { widthM: 26, heightM: 18 },
        roomOutline: defaultRoomOutline('stadium'),
        furniture: rows,
        fixtures: [
          { ...createBlueprintFixture('stage'), id: makeLayoutId('stage'), x: 22, y: 4, w: 56, h: 12, stageShape: 'semiCircle', material: 'wood', color: '#d6c4b0', heightM: 0.32 },
          { ...createBlueprintFixture('podium'), id: makeLayoutId('podium'), x: 40, y: 8, color: '#1c1917' },
        ],
        metadata: {
          totalSeats: rows.reduce((sum, row) => sum + row.seatCount, 0),
          floorType: 'moquette',
          floorColor: '#64748b',
          lightingPreset: 'conference',
          roofStyle: 'coffered',
          showRoof: true,
        },
      });
    },
  },
  {
    id: 'empty-rectangle',
    name: 'Salle rectangle vide',
    description: 'Contour vide à meubler librement',
    roomType: 'SIMPLE',
    outlineShape: 'rectangle',
    build: (p) => emptyRoomTemplate('empty-rectangle', 'rectangle', p),
  },
  {
    id: 'empty-lshape',
    name: 'Salle en L',
    description: 'Contour en L personnalisable',
    roomType: 'SIMPLE',
    outlineShape: 'lShape',
    build: (p) => emptyRoomTemplate('empty-lshape', 'lShape', p),
  },
  {
    id: 'empty-ushape',
    name: 'Salle en U',
    description: 'Contour en U, idéal cérémonie',
    roomType: 'SIMPLE',
    outlineShape: 'uShape',
    build: (p) => emptyRoomTemplate('empty-ushape', 'uShape', p),
  },
  {
    id: 'empty-tshape',
    name: 'Salle en T',
    description: 'Contour en T avec avancée',
    roomType: 'SIMPLE',
    outlineShape: 'tShape',
    build: (p) => emptyRoomTemplate('empty-tshape', 'tShape', p),
  },
  {
    id: 'empty-stadium',
    name: 'Salle capsule',
    description: 'Contour arrondi type stade',
    roomType: 'SIMPLE',
    outlineShape: 'stadium',
    build: (p) => emptyRoomTemplate('empty-stadium', 'stadium', p),
  },
  {
    id: 'empty-trapezoid',
    name: 'Salle trapèze',
    description: 'Contour trapèze, vue scène élargie',
    roomType: 'SIMPLE',
    outlineShape: 'trapezoid',
    build: (p) => emptyRoomTemplate('empty-trapezoid', 'trapezoid', p),
  },
];

export interface ApplyTemplateOptions {
  keepStyle?: boolean;
}

function mergeTemplateStyle(
  built: RoomLayoutBlueprint,
  previous: RoomLayoutBlueprint,
  keepStyle: boolean,
): RoomLayoutBlueprint {
  const library = {
    customThemes: previous.metadata.customThemes,
    customTemplates: previous.metadata.customTemplates,
  };
  if (!keepStyle) {
    return refreshBlueprintMetadata({
      ...built,
      metadata: { ...built.metadata, ...library },
    });
  }
  return refreshBlueprintMetadata({
    ...built,
    canvas: previous.canvas ?? built.canvas,
    roomOutline: built.roomOutline
      ? {
          ...built.roomOutline,
          fill: previous.roomOutline?.fill ?? built.roomOutline.fill,
          stroke: previous.roomOutline?.stroke ?? built.roomOutline.stroke,
          strokeWidth: previous.roomOutline?.strokeWidth ?? built.roomOutline.strokeWidth,
        }
      : previous.roomOutline,
    metadata: {
      ...built.metadata,
      ...library,
      roomThemeId: previous.metadata.roomThemeId,
      floorType: previous.metadata.floorType,
      floorImageUrl: previous.metadata.floorImageUrl,
      floorImageFit: previous.metadata.floorImageFit,
      depthView: previous.metadata.depthView,
      depthAmount: previous.metadata.depthAmount,
      defaultTableColor: previous.metadata.defaultTableColor,
    },
  });
}

export function applyRoomTemplate(
  templateId: string,
  params?: LayoutParams,
  previous?: RoomLayoutBlueprint,
  options?: ApplyTemplateOptions,
): RoomLayoutBlueprint | null {
  const tpl = ROOM_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return null;
  const resolved = layoutParamsFromCapacity(tpl, params ?? {});
  let built = refreshBlueprintMetadata(tpl.build(resolved));
  if (resolved.totalSeats) {
    built = fitBlueprintToSeatCount(built, resolved.totalSeats);
  }
  if (!previous) return built;
  return mergeTemplateStyle(built, previous, options?.keepStyle !== false);
}

export function createSavedRoomTemplate(
  blueprint: RoomLayoutBlueprint,
  name: string,
  description = '',
): SavedRoomTemplate {
  const snapshot = JSON.parse(JSON.stringify({
    ...blueprint,
    metadata: { ...blueprint.metadata, customTemplates: [] },
  })) as RoomLayoutBlueprint;
  return {
    id: `saved_${Math.random().toString(36).slice(2, 10)}`,
    name: name.trim() || 'Mon modèle',
    description: description.trim(),
    roomType: blueprint.roomType,
    snapshot,
  };
}

export function saveCustomTemplateToBlueprint(
  blueprint: RoomLayoutBlueprint,
  template: SavedRoomTemplate,
): RoomLayoutBlueprint {
  const existing = blueprint.metadata.customTemplates ?? [];
  const idx = existing.findIndex((t) => t.id === template.id);
  const customTemplates = idx >= 0
    ? existing.map((t, i) => (i === idx ? template : t))
    : [...existing, template];
  return {
    ...blueprint,
    metadata: { ...blueprint.metadata, customTemplates },
  };
}

export function deleteCustomTemplateFromBlueprint(
  blueprint: RoomLayoutBlueprint,
  templateId: string,
): RoomLayoutBlueprint {
  return {
    ...blueprint,
    metadata: {
      ...blueprint.metadata,
      customTemplates: (blueprint.metadata.customTemplates ?? []).filter((t) => t.id !== templateId),
    },
  };
}

export function applySavedRoomTemplate(
  current: RoomLayoutBlueprint,
  templateId: string,
  options?: ApplyTemplateOptions,
): RoomLayoutBlueprint | null {
  const saved = current.metadata.customTemplates?.find((t) => t.id === templateId);
  if (!saved) return null;
  const built = JSON.parse(JSON.stringify(saved.snapshot)) as RoomLayoutBlueprint;
  built.templateId = saved.id;
  return mergeTemplateStyle(refreshBlueprintMetadata(built), current, options?.keepStyle !== false);
}

export function applyTableStyleToAll(
  blueprint: RoomLayoutBlueprint,
  sourceId: string,
  fields: TableStyleField[] = ['shape', 'chairType', 'tableColor'],
): RoomLayoutBlueprint {
  const source = blueprint.furniture.find((item) => item.id === sourceId && item.kind === 'table');
  if (!source || source.kind !== 'table') return blueprint;
  const furniture = blueprint.furniture.map((item) => {
    if (item.kind !== 'table' || item.id === sourceId) return item;
    return {
      ...item,
      shape: fields.includes('shape') ? source.shape : item.shape,
      chairType: fields.includes('chairType') ? source.chairType : item.chairType,
      chairStyle: fields.includes('chairStyle') ? source.chairStyle : item.chairStyle,
      seatMaterial: fields.includes('seatMaterial') ? source.seatMaterial : item.seatMaterial,
      tableColor: fields.includes('tableColor') ? source.tableColor : item.tableColor,
      tableSurface: fields.includes('tableSurface') ? source.tableSurface : item.tableSurface,
      capacity: fields.includes('capacity') ? source.capacity : item.capacity,
      hasCouverts: fields.includes('hasCouverts') ? source.hasCouverts : item.hasCouverts,
      couvertStyle: fields.includes('couvertStyle') ? source.couvertStyle : item.couvertStyle,
      hasCenterpiece: fields.includes('hasCenterpiece') ? source.hasCenterpiece : item.hasCenterpiece,
      centerpieceStyle: fields.includes('centerpieceStyle') ? source.centerpieceStyle : item.centerpieceStyle,
    };
  });
  return refreshBlueprintMetadata({ ...blueprint, furniture });
}

function fixtureStyleFamily(kind: RoomLayoutBlueprint['fixtures'][number]['kind']) {
  if (kind === 'door' || kind === 'entrance') return 'door';
  if (kind === 'aisle' || kind === 'carpet') return 'aisle';
  if (kind === 'pillar' || kind === 'column') return 'column';
  if (kind === 'stage' || kind === 'podium') return 'stage';
  return kind;
}

const FIXTURE_STYLE_FAMILY_LABELS: Record<string, string> = {
  door: 'portes & entrées',
  aisle: 'allées & tapis',
  chandelier: 'lustres',
  column: 'colonnes',
  stage: 'scènes & podiums',
  flower: 'compositions florales',
  buffet: 'buffets',
  instrument: 'instruments',
  bar: 'bars',
};

export function fixtureStyleFamilyLabel(kind: RoomLayoutBlueprint['fixtures'][number]['kind']) {
  return FIXTURE_STYLE_FAMILY_LABELS[fixtureStyleFamily(kind)] ?? 'éléments du même type';
}

/** Recopie le style d’un fixture d’environnement vers les autres du même type. */
export function applyFixtureStyleToSameKind(
  blueprint: RoomLayoutBlueprint,
  sourceId: string,
): RoomLayoutBlueprint {
  const source = blueprint.fixtures.find((item) => item.id === sourceId);
  if (!source) return blueprint;
  const family = fixtureStyleFamily(source.kind);
  const fixtures = blueprint.fixtures.map((item) => {
    if (item.id === sourceId || fixtureStyleFamily(item.kind) !== family) return item;
    if (family === 'door') {
      return {
        ...item,
        doorStyle: source.doorStyle,
        doorSwing: source.doorSwing,
        color: source.color,
        openingMaterial: source.openingMaterial,
        frameColor: source.frameColor,
        hasMat: source.hasMat,
        matColor: source.matColor,
      };
    }
    if (family === 'aisle') {
      return {
        ...item,
        aisleStyle: source.aisleStyle,
        color: source.color,
        material: source.material,
        hasGoldBorder: source.hasGoldBorder,
        hasSideLanterns: source.hasSideLanterns,
        hasPetals: source.hasPetals,
      };
    }
    if (family === 'chandelier') {
      return {
        ...item,
        chandelierStyle: source.chandelierStyle,
        color: source.color,
        lightWarmth: source.lightWarmth,
        lightIntensity: source.lightIntensity,
        lightRadius: source.lightRadius,
      };
    }
    if (family === 'column') {
      return {
        ...item,
        columnShape: source.columnShape,
        color: source.color,
        material: source.material,
      };
    }
    if (family === 'stage') {
      return {
        ...item,
        color: source.color,
        material: source.material,
        heightM: source.heightM,
        steps: source.steps,
        podiumStyle: source.podiumStyle,
        stageShape: source.stageShape,
      };
    }
    if (family === 'instrument') {
      return {
        ...item,
        instrumentStyle: source.instrumentStyle,
        color: source.color,
      };
    }
    if (family === 'bar') {
      return {
        ...item,
        barStyle: source.barStyle,
        color: source.color,
        material: source.material,
      };
    }
    if (family === 'flower') {
      return {
        ...item,
        flowerType: source.flowerType,
        flowerColor: source.flowerColor,
      };
    }
    if (family === 'buffet') {
      return {
        ...item,
        hasCouverts: source.hasCouverts,
        buffetStyle: source.buffetStyle,
        couvertStyle: source.couvertStyle,
        color: source.color,
        material: source.material,
      };
    }
    return { ...item, color: source.color, material: source.material };
  });
  return refreshBlueprintMetadata({ ...blueprint, fixtures });
}

export const roomOutlineLabels: Record<RoomOutlineShape, string> = {
  rectangle: 'Rectangle',
  square: 'Carré',
  circle: 'Circulaire',
  ellipse: 'Ovale allongé',
  lShape: 'Forme en L',
  rShape: 'L inversé',
  tShape: 'Forme en T',
  uShape: 'Forme en U',
  hexagon: 'Hexagone',
  octagon: 'Octogone',
  pentagon: 'Pentagone',
  triangle: 'Triangle',
  diamond: 'Losange',
  trapezoid: 'Trapèze',
  stadium: 'Capsule / stade',
  cross: 'Croix',
};

export function getRoomOutlineClipPath(shape: RoomOutlineShape): string | undefined {
  switch (shape) {
    case 'circle':
      return 'ellipse(45% 42% at 50% 50%)';
    case 'ellipse':
      return 'ellipse(48% 30% at 50% 50%)';
    case 'hexagon':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'octagon':
      return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    case 'pentagon':
      return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
    case 'triangle':
      return 'polygon(50% 0%, 100% 100%, 0% 100%)';
    case 'diamond':
      return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
    case 'trapezoid':
      return 'polygon(18% 0%, 82% 0%, 100% 100%, 0% 100%)';
    case 'stadium':
      return 'inset(6% 4% round 50%)';
    case 'lShape':
      return 'polygon(0% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 100%, 0% 100%)';
    case 'rShape':
      return 'polygon(35% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 35%, 35% 35%)';
    case 'tShape':
      return 'polygon(0% 0%, 100% 0%, 100% 38%, 68% 38%, 68% 100%, 32% 100%, 32% 38%, 0% 38%)';
    case 'uShape':
      return 'polygon(0% 0%, 32% 0%, 32% 62%, 68% 62%, 68% 0%, 100% 0%, 100% 100%, 0% 100%)';
    case 'cross':
      return 'polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)';
    case 'square':
      return 'inset(8% 20% 8% 20%)';
    default:
      return undefined;
  }
}

export function layoutParamsFromCapacity(
  template: Pick<RoomLayoutTemplate, 'id' | 'roomType'>,
  params: LayoutParams,
): LayoutParams {
  const total = params.totalSeats;
  if (!total || total < 2) return params;

  const seatsPerTable = Math.max(2, Math.min(24, params.seatsPerTable ?? 8));

  if (template.id === 'boardroom') {
    return { ...params, tableCount: 1, seatsPerTable: Math.max(8, Math.min(48, total)) };
  }
  if (template.id === 'conference-standard') {
    const seatsPerRow = Math.max(2, Math.min(40, params.seatsPerRow ?? params.seatsPerTable ?? 10));
    return { ...params, seatsPerRow, rowCount: Math.max(1, Math.ceil(total / seatsPerRow)) };
  }
  if (template.id === 'amphitheater-small') {
    const seatsPerRow = Math.max(2, Math.min(40, params.seatsPerRow ?? params.seatsPerTable ?? 12));
    const rows = Math.max(1, Math.ceil(total / seatsPerRow));
    const tierCount = Math.min(6, Math.max(2, params.tierCount ?? Math.ceil(Math.sqrt(rows))));
    const rowsPerTier = Math.max(1, params.rowsPerTier ?? Math.ceil(rows / tierCount));
    return { ...params, seatsPerRow, tierCount, rowsPerTier };
  }

  return {
    ...params,
    tableCount: Math.max(1, Math.ceil(total / seatsPerTable)),
    seatsPerTable,
  };
}

export function fitBlueprintToSeatCount(
  blueprint: RoomLayoutBlueprint,
  target: number,
): RoomLayoutBlueprint {
  const goal = Math.max(2, Math.round(target));
  const seating = blueprint.furniture.filter((item) => item.kind === 'table' || item.kind === 'row');
  if (seating.length === 0) return blueprint;

  let remaining = goal;
  const furniture = blueprint.furniture.map((item) => {
    if (item.kind === 'table') {
      if (remaining <= 0) return { ...item, capacity: 0 };
      const capacity = Math.min(item.capacity, remaining);
      remaining -= capacity;
      return { ...item, capacity };
    }
    if (item.kind === 'row') {
      if (remaining <= 0) return { ...item, seatCount: 0 };
      const seatCount = Math.min(item.seatCount, remaining);
      remaining -= seatCount;
      return { ...item, seatCount };
    }
    return item;
  }).filter((item) => {
    if (item.kind === 'table') return item.capacity >= 2;
    if (item.kind === 'row') return item.seatCount >= 2;
    return true;
  });

  if (remaining > 0) {
    for (let i = furniture.length - 1; i >= 0 && remaining > 0; i -= 1) {
      const item = furniture[i];
      if (item.kind === 'table') {
        furniture[i] = { ...item, capacity: item.capacity + remaining };
        remaining = 0;
      } else if (item.kind === 'row') {
        furniture[i] = { ...item, seatCount: item.seatCount + remaining };
        remaining = 0;
      }
    }
  }

  return refreshBlueprintMetadata({ ...blueprint, furniture });
}

function gridPositions(count: number, margin = 12, maxCol?: number) {
  const cols = maxCol ?? Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + ((col + 0.5) / cols) * (100 - 2 * margin);
    const y = margin + 18 + ((row + 0.5) / rows) * (100 - 2 * margin - 18);
    positions.push({ x, y });
  }
  return positions;
}

export function calculateBlueprintCapacity(blueprint: RoomLayoutBlueprint): number {
  return blueprint.furniture.reduce((sum, item) => {
    if (item.kind === 'table') return sum + item.capacity;
    if (item.kind === 'row') return sum + item.seatCount;
    if (item.kind === 'chair') return sum + 1;
    return sum;
  }, 0);
}

export function generateRoomBlueprint(roomType: RoomType, params: LayoutParams = {}): RoomLayoutBlueprint {
  const resolved: LayoutParams = { ...params };
  if (resolved.totalSeats && resolved.totalSeats >= 2) {
    const seatsPerTable = Math.max(2, resolved.seatsPerTable ?? 8);
    if (roomType === 'BANQUET' || roomType === 'TENT') {
      resolved.tableCount = Math.max(1, resolved.tableCount ?? Math.ceil(resolved.totalSeats / seatsPerTable));
      resolved.seatsPerTable = seatsPerTable;
    } else if (roomType === 'CONFERENCE') {
      const seatsPerRow = Math.max(2, resolved.seatsPerRow ?? seatsPerTable);
      resolved.seatsPerRow = seatsPerRow;
      resolved.rowCount = Math.max(1, resolved.rowCount ?? Math.ceil(resolved.totalSeats / seatsPerRow));
    } else if (roomType === 'AMPHITHEATER') {
      const seatsPerRow = Math.max(2, resolved.seatsPerRow ?? 12);
      const rows = Math.max(1, Math.ceil(resolved.totalSeats / seatsPerRow));
      resolved.seatsPerRow = seatsPerRow;
      resolved.tierCount = Math.min(6, Math.max(2, resolved.tierCount ?? Math.ceil(Math.sqrt(rows))));
      resolved.rowsPerTier = Math.max(1, resolved.rowsPerTier ?? Math.ceil(rows / resolved.tierCount));
    }
  }

  const chairType: ChairType = resolved.chairType || (roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET');

  let blueprint: RoomLayoutBlueprint;
  switch (roomType) {
    case 'BANQUET':
      blueprint = generateBanquetBlueprint(resolved, chairType);
      break;
    case 'CONFERENCE':
      blueprint = generateConferenceBlueprint(resolved, chairType);
      break;
    case 'AMPHITHEATER':
      blueprint = generateAmphitheaterBlueprint(resolved, chairType);
      break;
    case 'TENT':
      blueprint = generateTentBlueprint(resolved, chairType);
      break;
    case 'CUSTOM':
    case 'SIMPLE':
    default:
      blueprint = generateSimpleBlueprint(roomType);
      break;
  }

  const widthM = resolved.canvasWidthM ?? resolved.tentWidthM ?? blueprint.canvas.widthM;
  const heightM = resolved.canvasHeightM ?? resolved.tentLengthM ?? blueprint.canvas.heightM;
  let next = { ...blueprint, canvas: { widthM, heightM } };
  if (resolved.arrangePreset) {
    next = autoArrangeTables(ensureBlueprintDefaults(next), resolved.arrangePreset);
  }
  if (resolved.totalSeats) {
    next = fitBlueprintToSeatCount(ensureBlueprintDefaults(next), resolved.totalSeats);
  }
  return next;
}

function generateSimpleBlueprint(roomType: RoomType): RoomLayoutBlueprint {
  return {
    version: 1,
    roomType,
    canvas: { widthM: 20, heightM: 15 },
    fixtures: [],
    furniture: [],
    metadata: { totalSeats: 0 },
  };
}

function generateBanquetBlueprint(params: LayoutParams, chairType: ChairType): RoomLayoutBlueprint {
  const tableCount = Math.max(1, params.tableCount ?? 8);
  const tableShape: TableShape = params.tableShape ?? 'round';
  const seatsPerTable = Math.max(2, params.seatsPerTable ?? 8);
  const positions = gridPositions(tableCount);
  const furniture: RoomLayoutBlueprint['furniture'] = positions.map((pos, i) => ({
    id: uid('table'),
    kind: 'table',
    name: `Table ${i + 1}`,
    shape: tableShape,
    capacity: seatsPerTable,
    chairType,
    x: pos.x,
    y: pos.y,
    locked: false,
  }));

  return {
    version: 1,
    roomType: 'BANQUET',
    canvas: { widthM: 24, heightM: 18 },
    fixtures: [
      {
        id: uid('stage'),
        kind: 'stage',
        x: 25,
        y: 4,
        w: 50,
        h: 8,
        label: 'Scène / Table d\'honneur',
      },
    ],
    furniture,
    metadata: { tableCount, totalSeats: tableCount * seatsPerTable },
  };
}

function generateConferenceBlueprint(params: LayoutParams, chairType: ChairType): RoomLayoutBlueprint {
  const rowCount = Math.max(1, params.rowCount ?? 6);
  const seatsPerRow = Math.max(2, params.seatsPerRow ?? 10);
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  const startY = 22;
  const endY = 88;
  const step = rowCount > 1 ? (endY - startY) / (rowCount - 1) : 0;

  for (let i = 0; i < rowCount; i++) {
    furniture.push({
      id: uid('row'),
      kind: 'row',
      label: `Rangée ${i + 1}`,
      seatCount: seatsPerRow,
      chairType,
      tier: 0,
      x: 50,
      y: rowCount === 1 ? 55 : startY + step * i,
      curve: 0.04,
      focusX: 50,
      focusY: 8,
      rotation: 0,
    });
  }

  return {
    version: 1,
    roomType: 'CONFERENCE',
    canvas: { widthM: 18, heightM: 12 },
    fixtures: [
      {
        id: uid('podium'),
        kind: 'podium',
        x: 40,
        y: 6,
        w: 20,
        h: 10,
        label: 'Podium',
      },
      {
        id: uid('aisle'),
        kind: 'aisle',
        x: 48,
        y: 18,
        w: 4,
        h: 72,
        label: 'Allée centrale',
      },
    ],
    furniture,
    metadata: { rowCount, totalSeats: rowCount * seatsPerRow },
  };
}

function generateAmphitheaterBlueprint(params: LayoutParams, chairType: ChairType): RoomLayoutBlueprint {
  const tierCount = Math.max(1, params.tierCount ?? 4);
  const rowsPerTier = Math.max(1, params.rowsPerTier ?? 2);
  const baseSeats = Math.max(6, params.seatsPerRow ?? 12);
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  const risePerTierM = 0.38;
  const stageFocus = { x: 50, y: 10 };
  let rowIndex = 0;
  let totalSeats = 0;

  // Scène en bas de la pente (haut du plan) ; gradins qui remontent vers le fond
  for (let tier = 0; tier < tierCount; tier++) {
    for (let r = 0; r < rowsPerTier; r++) {
      const rowDepth = tier * rowsPerTier + r;
      const progress = rowDepth / Math.max(1, tierCount * rowsPerTier - 1);
      const y = 28 + progress * 58;
      const seats = baseSeats + tier * 2;
      const curve = Math.round(38 + progress * 22);
      const elevationM = tier * risePerTierM + r * (risePerTierM * 0.35);
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Gradin ${tier + 1} — Rangée ${r + 1}`,
        seatCount: seats,
        chairType,
        tier,
        x: 50,
        y,
        curve,
        aisleSplit: true,
        aisleWidthPct: 14,
        elevationM,
        focusX: stageFocus.x,
        focusY: stageFocus.y,
        rotation: 0,
        amphitheaterStyle: 'modernFan',
        showSeatNumbers: true,
      });
      totalSeats += seats;
      rowIndex++;
    }
  }

  return {
    version: 1,
    roomType: 'AMPHITHEATER',
    canvas: { widthM: 24, heightM: 18 },
    fixtures: [
      {
        id: uid('stage'),
        kind: 'stage',
        x: 28,
        y: 3,
        w: 44,
        h: 10,
        label: 'Scène',
        heightM: 0.55,
        material: 'wood',
      },
      {
        id: uid('aisle'),
        kind: 'aisle',
        x: 47,
        y: 16,
        w: 6,
        h: 72,
        label: 'Allée centrale',
      },
    ],
    furniture,
    metadata: { rowCount: rowIndex, totalSeats },
  };
}

/** Plan uniquement composé de chaises / rangées (sans tables). */
function generateChairOnlyBlueprint(
  params: LayoutParams,
  chairType: ChairType,
  mode: 'theater' | 'ceremony' | 'grid' | 'cinema',
): RoomLayoutBlueprint {
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  const fixtures: RoomLayoutBlueprint['fixtures'] = [];

  if (mode === 'grid') {
    const cols = Math.max(4, Math.min(12, params.seatsPerRow ?? 8));
    const rows = Math.max(3, Math.min(14, params.rowCount ?? 6));
    const startX = 18;
    const startY = 20;
    const endX = 82;
    const endY = 82;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = cols === 1 ? 50 : startX + (c / (cols - 1)) * (endX - startX);
        const y = rows === 1 ? 50 : startY + (r / (rows - 1)) * (endY - startY);
        furniture.push({
          id: uid('chair'),
          kind: 'chair',
          chairType,
          label: `Siège ${r * cols + c + 1}`,
          x,
          y,
          rotation: 0,
        });
      }
    }
    fixtures.push({
      id: uid('podium'),
      kind: 'podium',
      x: 40,
      y: 4,
      w: 20,
      h: 8,
      label: 'Pupitre',
      heightM: 0.45,
      steps: 1,
    });
    return {
      version: 1,
      roomType: 'CONFERENCE',
      canvas: { widthM: 16, heightM: 12 },
      fixtures,
      furniture,
      metadata: { totalSeats: rows * cols, rowCount: rows },
    };
  }

  if (mode === 'ceremony') {
    const rowCount = Math.max(4, params.rowCount ?? 8);
    const seatsPerSide = Math.max(4, Math.floor((params.seatsPerRow ?? 8) / 2));
    for (let i = 0; i < rowCount; i++) {
      const y = 28 + (i / Math.max(1, rowCount - 1)) * 55;
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Gauche ${i + 1}`,
        seatCount: seatsPerSide,
        chairType,
        chairStyle: chairType === 'FOLDING' ? undefined : 'classic',
        seatMaterial: 'plastic',
        tier: 0,
        x: 32,
        y,
        curve: 0,
        focusX: 50,
        focusY: 12,
        rotation: 0,
      });
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Droite ${i + 1}`,
        seatCount: seatsPerSide,
        chairType,
        chairStyle: chairType === 'FOLDING' ? undefined : 'classic',
        seatMaterial: 'plastic',
        tier: 0,
        x: 68,
        y,
        curve: 0,
        focusX: 50,
        focusY: 12,
        rotation: 0,
      });
    }
    fixtures.push(
      {
        id: uid('aisle'),
        kind: 'aisle',
        x: 47,
        y: 18,
        w: 6,
        h: 70,
        label: 'Allée centrale',
        aisleStyle: 'whiteMirror',
        color: '#f8fafc',
        hasGoldBorder: false,
        hasSideLanterns: true,
        hasPetals: true,
      },
      {
        id: uid('stage'),
        kind: 'stage',
        x: 36,
        y: 2,
        w: 28,
        h: 14,
        label: 'Autel',
        heightM: 0.28,
        stageShape: 'semiCircle',
        color: '#f8fafc',
        material: 'marble',
      },
      {
        id: uid('arch'),
        kind: 'arch',
        x: 38,
        y: 1,
        w: 24,
        h: 10,
        label: 'Arche florale',
        color: '#f4e8e4',
        flowerType: 'rose',
      },
      {
        id: uid('pedestal'),
        kind: 'pedestal',
        x: 22,
        y: 8,
        w: 5,
        h: 5,
        label: 'Piédestal autel G',
        pedestalStyle: 'squareWhite',
        flowerType: 'rose',
        flowerColor: '#f4e8e4',
        color: '#f8fafc',
        heightM: 1.15,
      },
      {
        id: uid('pedestal'),
        kind: 'pedestal',
        x: 73,
        y: 8,
        w: 5,
        h: 5,
        label: 'Piédestal autel D',
        pedestalStyle: 'squareWhite',
        flowerType: 'rose',
        flowerColor: '#f4e8e4',
        color: '#f8fafc',
        heightM: 1.15,
      },
      {
        id: uid('pedestal'),
        kind: 'pedestal',
        x: 38,
        y: 88,
        w: 5,
        h: 5,
        label: 'Entrée gauche',
        pedestalStyle: 'squareWhite',
        flowerType: 'rose',
        flowerColor: '#f4e8e4',
        color: '#f8fafc',
        heightM: 1.15,
      },
      {
        id: uid('pedestal'),
        kind: 'pedestal',
        x: 57,
        y: 88,
        w: 5,
        h: 5,
        label: 'Entrée droite',
        pedestalStyle: 'squareWhite',
        flowerType: 'rose',
        flowerColor: '#f4e8e4',
        color: '#f8fafc',
        heightM: 1.15,
      },
    );
    furniture.push(
      {
        id: uid('table'),
        kind: 'table',
        name: 'Autel',
        shape: 'square',
        capacity: 2,
        chairType: 'BANQUET',
        chairStyle: 'louis',
        seatMaterial: 'linen',
        tableSurface: 'linen',
        tableColor: '#faf7f2',
        attachedChairs: false,
        x: 50,
        y: 10,
      },
      {
        id: uid('chair'),
        kind: 'chair',
        chairType: 'ARMCHAIR',
        chairStyle: 'louis',
        seatMaterial: 'linen',
        label: 'Siège d’honneur',
        x: 56,
        y: 10,
        rotation: 0,
      },
      {
        id: uid('chair'),
        kind: 'chair',
        chairType: 'ARMCHAIR',
        chairStyle: 'louis',
        seatMaterial: 'linen',
        label: 'Siège d’honneur',
        x: 62,
        y: 10,
        rotation: 0,
      },
    );
    return {
      version: 1,
      roomType: 'CONFERENCE',
      canvas: { widthM: 18, heightM: 14 },
      fixtures,
      furniture,
      metadata: {
        rowCount: rowCount * 2,
        totalSeats: rowCount * 2 * seatsPerSide,
        floorType: 'herbe',
        floorColor: '#4d7c3f',
      },
    };
  }

  // theater / cinema — rangées continues face à la scène
  const rowCount = Math.max(4, params.rowCount ?? (mode === 'cinema' ? 10 : 7));
  const seatsPerRow = Math.max(6, params.seatsPerRow ?? (mode === 'cinema' ? 14 : 12));
  const startY = mode === 'cinema' ? 24 : 26;
  const endY = 88;
  for (let i = 0; i < rowCount; i++) {
    const progress = rowCount === 1 ? 0 : i / (rowCount - 1);
    const y = startY + progress * (endY - startY);
    const elevationM = mode === 'cinema' ? progress * 1.4 : 0;
    furniture.push({
      id: uid('row'),
      kind: 'row',
      label: `Rangée ${i + 1}`,
      seatCount: seatsPerRow + (mode === 'cinema' ? Math.floor(i / 2) : 0),
      chairType,
      tier: mode === 'cinema' ? Math.floor(progress * 4) : 0,
      x: 50,
      y,
      curve: mode === 'cinema' ? 0.06 + progress * 0.1 : 0.04,
      elevationM,
      focusX: 50,
      focusY: 8,
      rotation: 0,
    });
  }
  fixtures.push(
    {
      id: uid(mode === 'cinema' ? 'stage' : 'podium'),
      kind: mode === 'cinema' ? 'stage' : 'podium',
      x: mode === 'cinema' ? 22 : 38,
      y: 3,
      w: mode === 'cinema' ? 56 : 24,
      h: mode === 'cinema' ? 12 : 10,
      label: mode === 'cinema' ? 'Écran / scène' : 'Podium',
      heightM: mode === 'cinema' ? 0.5 : 0.55,
      steps: mode === 'cinema' ? 1 : 2,
    },
    {
      id: uid('aisle'),
      kind: 'aisle',
      x: 48,
      y: 18,
      w: 4,
      h: 72,
      label: 'Allée',
    },
  );
  const totalSeats = furniture.reduce((s, f) => s + (f.kind === 'row' ? f.seatCount : 0), 0);
  return {
    version: 1,
    roomType: mode === 'cinema' ? 'AMPHITHEATER' : 'CONFERENCE',
    canvas: { widthM: mode === 'cinema' ? 22 : 18, heightM: mode === 'cinema' ? 16 : 12 },
    fixtures,
    furniture,
    metadata: { rowCount, totalSeats },
  };
}

function generateTentBlueprint(params: LayoutParams, chairType: ChairType): RoomLayoutBlueprint {
  const widthM = params.tentWidthM ?? 15;
  const lengthM = params.tentLengthM ?? 20;
  const tableCount = params.tableCount ?? 0;
  const fixtures: RoomLayoutBlueprint['fixtures'] = [
    {
      id: uid('perimeter'),
      kind: 'perimeter',
      x: 8,
      y: 10,
      w: 84,
      h: 80,
      label: 'Périmètre tente',
    },
    {
      id: uid('pillar'),
      kind: 'pillar',
      x: 48,
      y: 48,
      w: 4,
      h: 4,
      label: 'Mât central',
    },
  ];

  const furniture: RoomLayoutBlueprint['furniture'] = [];
  if (tableCount > 0) {
    const positions = gridPositions(tableCount, 14, Math.min(4, tableCount));
    positions.forEach((pos, i) => {
      furniture.push({
        id: uid('table'),
        kind: 'table',
        name: `Table ${i + 1}`,
        shape: params.tableShape ?? 'round',
        capacity: params.seatsPerTable ?? 8,
        chairType,
        x: pos.x,
        y: pos.y,
        locked: false,
      });
    });
  } else {
    furniture.push({
      id: uid('zone'),
      kind: 'zone',
      label: 'Zone libre',
      x: 15,
      y: 18,
      w: 70,
      h: 68,
    });
  }

  const totalSeats = tableCount > 0 ? tableCount * (params.seatsPerTable ?? 8) : 0;

  return {
    version: 1,
    roomType: 'TENT',
    canvas: { widthM: widthM, heightM: lengthM },
    fixtures,
    furniture,
    metadata: { tableCount: tableCount || undefined, totalSeats },
  };
}

export function blueprintToTablePlan(blueprint: RoomLayoutBlueprint | null | undefined) {
  if (!blueprint?.furniture?.length) {
    return {
      tables: [],
      fixtures: blueprint?.fixtures ?? [],
      roomOutline: blueprint?.roomOutline,
      roomThemeId: blueprint?.metadata?.roomThemeId,
      sourceRoomType: blueprint?.roomType ?? null,
    };
  }

  const tables = blueprint.furniture
    .filter((item): item is Extract<typeof item, { kind: 'table' | 'row' }> => item.kind === 'table' || item.kind === 'row')
    .map((item) => {
      if (item.kind === 'table') {
        const seats: Record<number, string | null> = {};
        for (let i = 0; i < item.capacity; i++) seats[i] = null;
        return {
          id: item.id,
          sourceFurnitureId: item.id,
          name: item.name,
          shape: item.shape,
          capacity: item.capacity,
          chairType: item.chairType,
          chairImageUrl: item.chairImageUrl,
          tableColor: item.tableColor,
          tableImageUrl: item.tableImageUrl,
          x: item.x,
          y: item.y,
          seats,
          locked: item.locked ?? false,
        };
      }

      const seats: Record<number, string | null> = {};
      for (let i = 0; i < item.seatCount; i++) seats[i] = null;
      return {
        id: item.id,
        sourceFurnitureId: item.id,
        name: item.label,
        shape: 'rectangular' as TableShape,
        capacity: item.seatCount,
        chairType: item.chairType,
        x: item.x,
        y: item.y,
        seats,
        locked: true,
        rowMeta: {
          tier: item.tier,
          curve: item.curve ?? 0,
          rowName: item.rowName || item.label,
          seatCodes: Array.from({ length: item.seatCount }, (_, i) =>
            rowSeatCode(item.rowName || item.label, i),
          ),
        },
      };
    });

  return {
    tables,
    fixtures: blueprint.fixtures,
    defaultTableColor: blueprint.metadata.defaultTableColor,
    roomThemeId: blueprint.metadata.roomThemeId,
    floorType: blueprint.metadata.floorType,
    floorImageUrl: blueprint.metadata.floorImageUrl,
    floorImageFit: blueprint.metadata.floorImageFit,
    floorColor: blueprint.metadata.floorColor,
    depthAmount: blueprint.metadata.depthAmount ?? (blueprint.metadata.depthView ? 55 : 0),
    depthView: Boolean(blueprint.metadata.depthView || (blueprint.metadata.depthAmount ?? 0) > 0),
    roomOutline: blueprint.roomOutline,
    sourceRoomType: blueprint.roomType,
    sourceRoomBlueprintVersion: 1,
    importedAt: new Date().toISOString(),
  };
}

type TablePlanLike = {
  tables?: Array<{
    id: string;
    sourceFurnitureId?: string;
    capacity: number;
    seats?: Record<string | number, string | null>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

/**
 * Importe le blueprint salle en conservant les assignations existantes
 * (même sourceFurnitureId / id) et les tables ajoutées manuellement.
 */
export function mergeBlueprintIntoTablePlan(
  existing: TablePlanLike | null | undefined,
  blueprint: RoomLayoutBlueprint | null | undefined,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const fresh = blueprintToTablePlan(blueprint) as any;
  const oldTables = Array.isArray(existing?.tables) ? existing!.tables! : [];
  const bySource = new Map<string, (typeof oldTables)[number]>();
  for (const t of oldTables) {
    bySource.set(String(t.sourceFurnitureId || t.id), t);
  }

  const mergedTables = (fresh.tables || []).map((t: any) => {
    const prev = bySource.get(String(t.sourceFurnitureId || t.id));
    if (!prev?.seats) return t;
    const seats: Record<number, string | null> = {};
    for (let i = 0; i < t.capacity; i++) seats[i] = null;
    for (const [k, v] of Object.entries(prev.seats)) {
      const idx = Number(k);
      if (!Number.isFinite(idx) || idx < 0 || idx >= t.capacity) continue;
      if (v) seats[idx] = v as string;
    }
    return { ...t, id: prev.id, seats };
  });

  const freshKeys = new Set(mergedTables.map((t: any) => String(t.sourceFurnitureId || t.id)));
  const manualExtras = oldTables.filter((t) => {
    if (t.sourceFurnitureId) return false;
    return !freshKeys.has(String(t.id));
  });

  return {
    ...fresh,
    tables: [...mergedTables, ...manualExtras],
    mergeMode: 'preserve-seats',
    importedAt: new Date().toISOString(),
  };
}

export const roomTypeLabels: Record<RoomType, string> = {
  SIMPLE: 'Salle simple',
  BANQUET: 'Banquet',
  CONFERENCE: 'Conférence',
  AMPHITHEATER: 'Amphithéâtre',
  TENT: 'Tente',
  CUSTOM: 'Personnalisé',
};

export const roomTypeDescriptions: Record<RoomType, string> = {
  SIMPLE: 'Espace polyvalent sans disposition prédéfinie.',
  BANQUET: 'Tables rondes ou rectangulaires pour réceptions et galas.',
  CONFERENCE: 'Rangées face à un podium pour séminaires.',
  AMPHITHEATER: 'Gradins en arc de cercle autour d\'une scène.',
  TENT: 'Tente avec périmètre et option tables intérieures.',
  CUSTOM: 'Configuration importée ou éditée manuellement.',
};

export const chairTypeLabels: Record<ChairType, string> = {
  BANQUET: 'Chaise banquet',
  FOLDING: 'Chaise pliante',
  THEATER: 'Siège théâtre',
  STOOL: 'Tabouret',
  ARMCHAIR: 'Fauteuil',
  WHEELCHAIR: 'Place PMR',
  CROSSBACK: 'Cross-back (mariage)',
  GHOST: 'Chaise Ghost',
  MESH: 'Siège mesh conférence',
  BARSTOOL: 'Tabouret de bar',
  POUF: 'Pouf / ottoman',
};

export const tableShapeLabels: Record<TableShape, string> = {
  round: 'Ronde',
  rectangular: 'Rectangulaire',
  square: 'Carrée',
  oval: 'Ovale',
  cocktail: 'Cocktail (basse)',
  highTop: 'Mange-debout',
  arc: 'Courbe (arc)',
};

export const stageShapeLabels: Record<StageShape, string> = {
  rect: 'Rectangle',
  semiCircle: 'Demi-lune',
};

export const podiumStyleLabels: Record<PodiumStyle, string> = {
  speaker: 'Orateur / MC',
  lectern: 'Pupitre',
  couple: 'Couple (mariage)',
  circular: 'Circulaire',
  runway: 'Passerelle / catwalk',
  bandRiser: 'Estrade groupe',
  honor: 'Table d’honneur',
  steps: 'Gradin court',
};

export const podiumStyleHints: Record<PodiumStyle, string> = {
  speaker: 'Estrade + pupitre pour discours',
  lectern: 'Pupitre compact, conférence',
  couple: 'Plateforme ronde pour les mariés',
  circular: 'Podium rond 360°',
  runway: 'Passerelle longue, défilé',
  bandRiser: 'Plateaux étagés pour le groupe',
  honor: 'Estrade basse table d’honneur',
  steps: 'Quelques marches face public',
};

export const podiumStylePresets: Record<PodiumStyle, { w: number; h: number; heightM: number; steps: number }> = {
  speaker: { w: 14, h: 10, heightM: 0.55, steps: 2 },
  lectern: { w: 8, h: 6, heightM: 0.32, steps: 1 },
  couple: { w: 16, h: 14, heightM: 0.5, steps: 2 },
  circular: { w: 16, h: 16, heightM: 0.5, steps: 2 },
  runway: { w: 12, h: 42, heightM: 0.38, steps: 2 },
  bandRiser: { w: 34, h: 14, heightM: 0.72, steps: 3 },
  honor: { w: 26, h: 10, heightM: 0.42, steps: 2 },
  steps: { w: 22, h: 12, heightM: 0.85, steps: 4 },
};

export const instrumentStyleLabels: Record<InstrumentStyle, string> = {
  piano: 'Piano à queue',
  keyboard: 'Clavier / synthé',
  drums: 'Batterie',
  guitar: 'Guitare',
  bass: 'Basse',
  micStand: 'Pied de micro',
  sax: 'Saxophone',
  violin: 'Violon',
  amp: 'Ampli',
  speaker: 'Enceinte de scène',
};

export const instrumentStyleHints: Record<InstrumentStyle, string> = {
  piano: 'Piano à queue, à poser sur scène',
  keyboard: 'Clavier sur pied',
  drums: 'Kit batterie concert',
  guitar: 'Guitare sur stand',
  bass: 'Basse électrique',
  micStand: 'Micro + pied',
  sax: 'Saxophone sur support',
  violin: 'Violon + pupitre',
  amp: 'Ampli combo',
  speaker: 'Retour / enceinte PA',
};

export const instrumentStylePresets: Record<InstrumentStyle, { w: number; h: number; label: string }> = {
  piano: { w: 10, h: 6, label: 'Piano à queue' },
  keyboard: { w: 8, h: 4, label: 'Clavier' },
  drums: { w: 8, h: 8, label: 'Batterie' },
  guitar: { w: 4, h: 6, label: 'Guitare' },
  bass: { w: 4, h: 7, label: 'Basse' },
  micStand: { w: 3, h: 3, label: 'Micro' },
  sax: { w: 3, h: 4, label: 'Saxophone' },
  violin: { w: 3, h: 4, label: 'Violon' },
  amp: { w: 4, h: 4, label: 'Ampli' },
  speaker: { w: 4, h: 4, label: 'Enceinte' },
};

export const barStyleLabels: Record<BarStyle, string> = {
  cocktail: 'Bar cocktail',
  wine: 'Bar à vins',
  champagne: 'Bar champagne',
  beer: 'Bar bières',
  coffee: 'Coffee bar',
  whiskey: 'Bar whisky',
};

export const barStyleHints: Record<BarStyle, string> = {
  cocktail: 'Shakers, verres à cocktail, bouteilles colorées',
  wine: 'Bouteilles couchées + verres à pied',
  champagne: 'Seau à glace et flûtes',
  beer: 'Tireuses et chopes',
  coffee: 'Machine espresso et tasses',
  whiskey: 'Carafes, tumblers, étagère ambrée',
};

export const barStylePresets: Record<BarStyle, { w: number; h: number; label: string; color: string }> = {
  cocktail: { w: 28, h: 10, label: 'Bar cocktail', color: '#4a3728' },
  wine: { w: 26, h: 10, label: 'Bar à vins', color: '#3f2a22' },
  champagne: { w: 24, h: 10, label: 'Bar champagne', color: '#5c4a32' },
  beer: { w: 26, h: 10, label: 'Bar bières', color: '#5b4030' },
  coffee: { w: 22, h: 9, label: 'Coffee bar', color: '#2c2118' },
  whiskey: { w: 24, h: 10, label: 'Bar whisky', color: '#3b2416' },
};

export const roofStyleLabels: Record<RoofStyle, string> = {
  flat: 'Plat',
  tentSwag: 'Tente drapée',
  gabled: 'Pignon (jardin)',
  coffered: 'Caissons',
};

export const centerpieceStyleLabels: Record<CenterpieceStyle, string> = {
  floral: 'Bouquet haut',
  greeneryRunner: 'Runner verdure',
  candleCluster: 'Bougies',
};

export const flowerTypeLabels: Record<FlowerType, string> = {
  rose: 'Roses',
  tulipe: 'Tulipes',
  orchidee: 'Orchidées',
  tournesol: 'Tournesols',
  lavande: 'Lavande',
  boquet: 'Bouquet mixte',
  personnalise: 'Personnalisé (image)',
};

export function resolveTableColor(tableColor?: string, defaultColor?: string): string | undefined {
  return tableColor ?? defaultColor;
}

export function getChairVisualClass(chairType: ChairType): string {
  const base = 'em-chair-top';
  switch (chairType) {
    case 'THEATER':
      return `${base} em-chair-top--theater`;
    case 'FOLDING':
      return `${base} em-chair-top--folding`;
    case 'STOOL':
      return `${base} em-chair-top--stool`;
    case 'ARMCHAIR':
      return `${base} em-chair-top--armchair`;
    case 'WHEELCHAIR':
      return `${base} em-chair-top--pmr`;
    case 'CROSSBACK':
      return `${base} em-chair-top--crossback`;
    case 'GHOST':
      return `${base} em-chair-top--ghost`;
    case 'MESH':
      return `${base} em-chair-top--mesh`;
    case 'BARSTOOL':
      return `${base} em-chair-top--barstool`;
    case 'POUF':
      return `${base} em-chair-top--pouf`;
    default:
      return `${base} em-chair-top--banquet`;
  }
}

export function getFixtureClass(kind: string): string {
  switch (kind) {
    case 'stage':
      return 'bg-amber-100 border-amber-300 text-amber-800';
    case 'podium':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'buffet':
      return 'bg-amber-50 border-amber-300 text-amber-900';
    case 'stairs':
      return 'bg-stone-100 border-stone-400 text-stone-700';
    case 'balcony':
      return 'bg-sky-50 border-sky-300 text-sky-800';
    case 'door':
      return 'bg-amber-50 border-amber-600/60 text-amber-900';
    case 'entrance':
      return 'bg-emerald-50 border-emerald-500 text-emerald-800';
    case 'aisle':
      return 'bg-red-50 border-amber-500/50 text-red-900';
    case 'chandelier':
      return 'bg-amber-50/50 border-amber-400 text-amber-800 shadow-md';
    case 'corridor':
      return 'bg-stone-100 border-stone-300 text-stone-700';
    case 'pillar':
    case 'column':
      return 'bg-stone-400 border-stone-500';
    case 'flower':
    case 'arch':
      return 'bg-transparent border-transparent';
    case 'partition':
      return 'bg-rose-50 border-rose-200 text-rose-800';
    case 'decal':
      return 'bg-rose-50/80 border-rose-200 text-rose-800';
    case 'pedestal':
      return 'bg-stone-50 border-stone-300 text-stone-700';
    case 'stringLight':
      return 'bg-amber-50 border-amber-300 text-amber-800';
    case 'fountain':
      return 'bg-sky-50 border-sky-300 text-sky-800';
    case 'gazebo':
      return 'bg-stone-50 border-stone-300 text-stone-700';
    case 'djBooth':
      return 'bg-zinc-100 border-zinc-400 text-zinc-800';
    case 'screen':
      return 'bg-zinc-900 border-zinc-600 text-zinc-100';
    case 'instrument':
      return 'bg-zinc-800 border-zinc-500 text-zinc-100';
    case 'bar':
      return 'bg-amber-50 border-amber-700/50 text-amber-950';
    case 'perimeter':
      return 'bg-sky-50 border-sky-300 border-dashed text-sky-600';
    default:
      return 'bg-slate-100 border-slate-200';
  }
}

export const tableArrangeLabels: Record<TableArrangePreset, string> = {
  grid: 'Grille',
  banquet: 'Banquet',
  ushape: 'En U',
  circle: 'Cercle',
  longBanquet: 'Tables longues',
};

export const arrangeDensityLabels: Record<ArrangeDensity, string> = {
  compact: 'Serré',
  comfortable: 'Confort',
  ample: 'Aéré',
};

function densityMargin(density: ArrangeDensity): number {
  if (density === 'compact') return 7;
  if (density === 'ample') return 16;
  return 11;
}

function usableTableBounds(blueprint: RoomLayoutBlueprint, density: ArrangeDensity) {
  const o = blueprint.roomOutline ?? defaultRoomOutline();
  const m = densityMargin(density);
  let top = o.y + m;
  let bottom = o.y + o.h - m;
  let left = o.x + m;
  let right = o.x + o.w - m;
  for (const fixture of blueprint.fixtures) {
    if (fixture.kind === 'stage' || fixture.kind === 'podium' || fixture.kind === 'entrance') {
      const edge = fixture.y + fixture.h;
      if (edge < 45) top = Math.max(top, edge + m * 0.6);
    }
  }
  if (right - left < 16) {
    left = o.x + 6;
    right = o.x + o.w - 6;
  }
  if (bottom - top < 16) {
    top = o.y + 8;
    bottom = o.y + o.h - 8;
  }
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function arrangePositions(
  count: number,
  preset: TableArrangePreset,
  bounds: ReturnType<typeof usableTableBounds>,
): Array<{ x: number; y: number }> {
  if (count <= 0) return [];
  const { left, right, top, bottom, width, height } = bounds;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  if (preset === 'circle') {
    const rx = width * 0.36;
    const ry = height * 0.34;
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
    });
  }

  if (preset === 'ushape') {
    const side = Math.max(1, Math.ceil(count / 3));
    const bottomCount = count - side * 2;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < side && positions.length < count; i++) {
      const t = side === 1 ? 0.5 : i / (side - 1);
      positions.push({ x: left + width * 0.08, y: top + height * (0.12 + t * 0.76) });
    }
    const along = Math.max(bottomCount, 0);
    for (let i = 0; i < along && positions.length < count; i++) {
      const t = along === 1 ? 0.5 : (i + 1) / (along + 1);
      positions.push({ x: left + width * t, y: bottom - height * 0.08 });
    }
    for (let i = 0; i < side && positions.length < count; i++) {
      const t = side === 1 ? 0.5 : 1 - i / (side - 1);
      positions.push({ x: right - width * 0.08, y: top + height * (0.12 + t * 0.76) });
    }
    return positions.slice(0, count);
  }

  if (preset === 'banquet') {
    const leftCount = Math.ceil(count / 2);
    const rightCount = count - leftCount;
    const lx = left + width * 0.28;
    const rx = left + width * 0.72;
    const col = (n: number, x: number) =>
      Array.from({ length: n }, (_, i) => {
        const t = n === 1 ? 0.5 : (i + 0.5) / n;
        return { x, y: top + height * (0.08 + t * 0.84) };
      });
    return [...col(leftCount, lx), ...col(rightCount, rx)];
  }

  if (preset === 'longBanquet') {
    const cols = count <= 2 ? 1 : count <= 6 ? 2 : 3;
    const perCol = Math.ceil(count / cols);
    return Array.from({ length: count }, (_, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = left + ((col + 0.5) / cols) * width;
      const y = top + ((row + 0.5) / perCol) * height;
      return { x, y };
    });
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))));
  const rows = Math.ceil(count / cols);
  return Array.from({ length: count }, (_, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = left + ((col + 0.5) / cols) * width;
    const y = top + ((row + 0.5) / rows) * height;
    return { x, y };
  });
}

export function autoArrangeTables(
  blueprint: RoomLayoutBlueprint,
  preset: TableArrangePreset,
  density: ArrangeDensity = 'comfortable',
): RoomLayoutBlueprint {
  const tables = blueprint.furniture.filter((item): item is Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'table' }> => item.kind === 'table');
  const movable = tables.filter((item) => !item.locked);
  if (movable.length === 0) return blueprint;
  const bounds = usableTableBounds(blueprint, density);
  const positions = arrangePositions(movable.length, preset, bounds);
  let cursor = 0;
  const furniture = blueprint.furniture.map((item) => {
    if (item.kind !== 'table' || item.locked) return item;
    const pos = positions[cursor++];
    return pos ? { ...item, x: Math.round(pos.x * 10) / 10, y: Math.round(pos.y * 10) / 10 } : item;
  });
  return refreshBlueprintMetadata({ ...blueprint, furniture });
}

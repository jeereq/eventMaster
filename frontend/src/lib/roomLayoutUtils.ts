export type RoomType = 'SIMPLE' | 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT' | 'CUSTOM';
export type ChairType = 'BANQUET' | 'FOLDING' | 'THEATER' | 'STOOL' | 'ARMCHAIR' | 'WHEELCHAIR';
export type TableShape = 'round' | 'rectangular' | 'square' | 'oval' | 'cocktail' | 'highTop';
/** Style de fauteuil / chaise (surtout fauteuils). */
export type ChairStyle = 'classic' | 'lounge' | 'club' | 'bergere' | 'modern' | 'chiavari';
/** Matériau d’assise. */
export type SeatMaterial = 'velvet' | 'leather' | 'linen' | 'fabric' | 'wood' | 'plastic';
export type TableArrangePreset = 'grid' | 'banquet' | 'ushape' | 'circle';
export type ArrangeDensity = 'compact' | 'comfortable' | 'ample';
export type TableStyleField = 'shape' | 'chairType' | 'chairStyle' | 'seatMaterial' | 'tableColor' | 'capacity' | 'hasCouverts';

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
export type ColumnShape = 'round' | 'square';
export type FlowerType = 'rose' | 'tulipe' | 'orchidee' | 'tournesol' | 'lavande' | 'boquet' | 'personnalise';

/** Type de zone au sol (piste, VIP, moquette…). */
export type ZoneKind = 'dance' | 'vip' | 'buffet' | 'carpet' | 'custom';
/** Matériau de surface pour zones / moquettes. */
export type ZoneMaterial = 'wood' | 'carpet' | 'vinyl' | 'led' | 'marble' | 'concrete' | 'parquet' | 'epoxy';

/** Styles de texture murale pour le rendu WebGL. */
export type WallTextureStyle = 'plaster' | 'brick' | 'wood' | 'concrete' | 'wallpaper' | 'stone';
/** Styles de porte configurables. */
export type DoorStyle = 'single' | 'double' | 'sliding' | 'arch' | 'glass';
/** Styles de fenêtre configurables. */
export type WindowStyle = 'rectangular' | 'arched' | 'bay' | 'french';
/** Matériau d’ouverture (porte / fenêtre). */
export type OpeningMaterial = 'wood' | 'glass' | 'metal' | 'painted';

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
    kind: 'stage' | 'podium' | 'aisle' | 'entrance' | 'pillar' | 'perimeter' | 'column' | 'flower' | 'carpet' | 'buffet';
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
    /** Podium / scène : hauteur réelle en mètres. */
    heightM?: number;
    /** Podium : nombre de marches (1–4). */
    steps?: number;
    /** Buffet : afficher assiettes / couverts. */
    hasCouverts?: boolean;
    /** Buffet : style d’implantation. */
    buffetStyle?: 'straight' | 'corner' | 'island';
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
        tableImageUrl?: string;
        /** Nappe / couverts sur la table. */
        hasCouverts?: boolean;
        x: number;
        y: number;
        locked?: boolean;
        rotation?: number;
        attachedChairs?: boolean;
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
        /** Élévation du gradin (m) — amphithéâtre en pente. */
        elevationM?: number;
        /** Point de visée en % (scène) pour orienter les sièges. */
        focusX?: number;
        focusY?: number;
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
      }
  >;
  metadata: {
    tableCount?: number;
    rowCount?: number;
    totalSeats: number;
    defaultTableColor?: string;
    roomThemeId?: string;
    floorType?: import('@/lib/roomThemeUtils').FloorType;
    floorImageUrl?: string;
    customThemes?: import('@/lib/roomThemeUtils').CustomRoomTheme[];
    customTemplates?: SavedRoomTemplate[];
    depthView?: boolean;
    /** 0 = vue à plat, 100 = perspective 2,5D maximale. */
    depthAmount?: number;
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
  defaults: { seatCount?: number; chairType?: ChairType; tier?: number } = {},
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'row' }> {
  return {
    id: makeLayoutId('row'),
    kind: 'row',
    label: `Rangée ${index}`,
    seatCount: defaults.seatCount ?? 10,
    chairType: defaults.chairType ?? 'THEATER',
    tier: defaults.tier ?? 0,
    x: 50,
    y: 20 + index * 10,
  };
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
    podium: { x: 40, y: 6, w: 20, h: 10, label: 'Podium' },
    aisle: { x: 48, y: 18, w: 4, h: 72, label: 'Allée' },
    entrance: { x: 42, y: 2, w: 16, h: 6, label: 'Entrée' },
    pillar: { x: 48, y: 48, w: 4, h: 4, label: 'Poteau' },
    column: { x: 30, y: 40, w: 3, h: 3, label: 'Colonne' },
    perimeter: { x: 8, y: 10, w: 84, h: 80, label: 'Périmètre' },
    flower: { x: 10, y: 85, w: 4, h: 4, label: 'Fleurs' },
    carpet: { x: 30, y: 55, w: 40, h: 28, label: 'Moquette' },
    buffet: { x: 12, y: 70, w: 36, h: 10, label: 'Buffet' },
  };
  const d = defaults[kind] ?? { x: 40, y: 40, w: 20, h: 10, label: kind };
  return {
    id: makeLayoutId('fixture'),
    kind,
    ...d,
    columnShape: kind === 'pillar' || kind === 'column' ? 'round' as ColumnShape : undefined,
    color: kind === 'pillar' || kind === 'column' ? '#78716c' : kind === 'carpet' ? '#1e3a5f' : kind === 'buffet' ? '#8b6914' : undefined,
    flowerType: kind === 'flower' ? 'boquet' as FlowerType : undefined,
    flowerColor: kind === 'flower' ? '#e11d48' : undefined,
    material:
      kind === 'carpet' ? 'carpet' :
      kind === 'stage' || kind === 'podium' ? 'wood' :
      kind === 'buffet' ? 'wood' :
      undefined,
    heightM: kind === 'podium' ? 0.6 : kind === 'stage' ? 0.45 : undefined,
    steps: kind === 'podium' ? 2 : undefined,
    hasCouverts: kind === 'buffet' ? true : undefined,
    buffetStyle: kind === 'buffet' ? 'straight' : undefined,
  };
}

export const chairStyleLabels: Record<ChairStyle, string> = {
  classic: 'Classique',
  lounge: 'Lounge',
  club: 'Club',
  bergere: 'Bergère',
  modern: 'Moderne',
  chiavari: 'Chiavari',
};

export const seatMaterialLabels: Record<SeatMaterial, string> = {
  velvet: 'Velours',
  leather: 'Cuir',
  linen: 'Lin',
  fabric: 'Tissu',
  wood: 'Bois',
  plastic: 'Plastique',
};

export const SEAT_MATERIAL_COLORS: Record<SeatMaterial, { seat: string; frame: string }> = {
  velvet: { seat: '#4c1d95', frame: '#c9a227' },
  leather: { seat: '#7c2d12', frame: '#292524' },
  linen: { seat: '#e7e5e4', frame: '#a8a29e' },
  fabric: { seat: '#1e3a5f', frame: '#78716c' },
  wood: { seat: '#92400e', frame: '#78350f' },
  plastic: { seat: '#64748b', frame: '#94a3b8' },
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
};

export const doorStyleLabels: Record<DoorStyle, string> = {
  single: 'Porte simple',
  double: 'Porte double',
  sliding: 'Coulissante',
  arch: 'Arche',
  glass: 'Vitrée (panneaux)',
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
};

export const WALL_TEXTURE_COLORS: Record<WallTextureStyle, string> = {
  plaster: '#e8e4df',
  brick: '#b4533c',
  wood: '#8b6914',
  concrete: '#9ca3af',
  wallpaper: '#c4b5a0',
  stone: '#78716c',
};

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
      widthM: partial.widthM ?? (style === 'double' ? 1.6 : style === 'sliding' ? 1.2 : 0.9),
      heightM: partial.heightM ?? (style === 'arch' ? 2.4 : 2.1),
      sillM: partial.sillM ?? 0,
      style,
      material: partial.material ?? (style === 'glass' ? 'glass' : 'wood'),
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
  return {
    ...blueprint,
    roomOutline: outline,
    walls: Array.isArray(blueprint.walls)
      ? blueprint.walls
      : wallsFromRoomOutline(outline, { withEntrance: true }),
    metadata: {
      ...blueprint.metadata,
      defaultTableColor: blueprint.metadata.defaultTableColor ?? '#ffffff',
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
    description: 'Deux blocs de chaises, allée centrale, sans tables',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => {
      const bp = generateChairOnlyBlueprint(
        { rowCount: p?.rowCount ?? 8, seatsPerRow: p?.seatsPerRow ?? 10, ...p },
        p?.chairType ?? 'BANQUET',
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
      capacity: fields.includes('capacity') ? source.capacity : item.capacity,
      hasCouverts: fields.includes('hasCouverts') ? source.hasCouverts : item.hasCouverts,
    };
  });
  return refreshBlueprintMetadata({ ...blueprint, furniture });
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
      const curve = 0.12 + progress * 0.22;
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
        elevationM,
        focusX: stageFocus.x,
        focusY: stageFocus.y,
        rotation: 0,
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
    const seatsPerSide = Math.max(4, Math.floor((params.seatsPerRow ?? 10) / 2));
    for (let i = 0; i < rowCount; i++) {
      const y = 28 + (i / Math.max(1, rowCount - 1)) * 55;
      const curve = 0.08 + i * 0.015;
      // Rangée gauche
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Gauche ${i + 1}`,
        seatCount: seatsPerSide,
        chairType,
        tier: 0,
        x: 32,
        y,
        curve,
        focusX: 50,
        focusY: 12,
        rotation: 8,
      });
      // Rangée droite
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Droite ${i + 1}`,
        seatCount: seatsPerSide,
        chairType,
        tier: 0,
        x: 68,
        y,
        curve,
        focusX: 50,
        focusY: 12,
        rotation: -8,
      });
    }
    fixtures.push(
      { id: uid('aisle'), kind: 'aisle', x: 47, y: 18, w: 6, h: 70, label: 'Allée centrale' },
      { id: uid('stage'), kind: 'stage', x: 35, y: 3, w: 30, h: 10, label: 'Autel / podium', heightM: 0.35 },
    );
    return {
      version: 1,
      roomType: 'CONFERENCE',
      canvas: { widthM: 18, heightM: 14 },
      fixtures,
      furniture,
      metadata: { rowCount: rowCount * 2, totalSeats: rowCount * 2 * seatsPerSide },
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
        rowMeta: { tier: item.tier, curve: item.curve ?? 0 },
      };
    });

  return {
    tables,
    fixtures: blueprint.fixtures,
    defaultTableColor: blueprint.metadata.defaultTableColor,
    roomThemeId: blueprint.metadata.roomThemeId,
    floorType: blueprint.metadata.floorType,
    floorImageUrl: blueprint.metadata.floorImageUrl,
    roomOutline: blueprint.roomOutline,
    sourceRoomType: blueprint.roomType,
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
};

export const tableShapeLabels: Record<TableShape, string> = {
  round: 'Ronde',
  rectangular: 'Rectangulaire',
  square: 'Carrée',
  oval: 'Ovale',
  cocktail: 'Cocktail (basse)',
  highTop: 'Mange-debout',
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
    case 'aisle':
      return 'bg-slate-100 border-slate-200 border-dashed text-slate-400';
    case 'pillar':
    case 'column':
      return 'bg-stone-400 border-stone-500';
    case 'flower':
      return 'bg-transparent border-transparent';
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

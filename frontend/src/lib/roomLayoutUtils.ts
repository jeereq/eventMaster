export type RoomType = 'SIMPLE' | 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT' | 'CUSTOM';
export type ChairType = 'BANQUET' | 'FOLDING' | 'THEATER' | 'STOOL' | 'ARMCHAIR' | 'WHEELCHAIR';
export type TableShape = 'round' | 'rectangular' | 'square' | 'oval';
export type TableArrangePreset = 'grid' | 'banquet' | 'ushape' | 'circle';
export type ArrangeDensity = 'compact' | 'comfortable' | 'ample';
export type TableStyleField = 'shape' | 'chairType' | 'tableColor' | 'capacity';

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
  canvas: { widthM: number; heightM: number };
  fixtures: Array<{
    id: string;
    kind: 'stage' | 'podium' | 'aisle' | 'entrance' | 'pillar' | 'perimeter' | 'column' | 'flower';
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
  }>;
  furniture: Array<
    | {
        id: string;
        kind: 'table';
        name: string;
        shape: TableShape;
        capacity: number;
        chairType: ChairType;
        chairImageUrl?: string;
        tableColor?: string;
        tableImageUrl?: string;
        x: number;
        y: number;
        locked?: boolean;
        rotation?: number;
      }
    | {
        id: string;
        kind: 'row';
        label: string;
        seatCount: number;
        chairType: ChairType;
        chairImageUrl?: string;
        tier: number;
        x: number;
        y: number;
        curve?: number;
      }
    | {
        id: string;
        kind: 'zone';
        label: string;
        x: number;
        y: number;
        w: number;
        h: number;
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
): Extract<RoomLayoutBlueprint['furniture'][number], { kind: 'zone' }> {
  return {
    id: makeLayoutId('zone'),
    kind: 'zone',
    label,
    x: 18 + (index % 3) * 10,
    y: 28 + (index % 2) * 8,
    w: 26,
    h: 16,
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
  };
  const d = defaults[kind] ?? { x: 40, y: 40, w: 20, h: 10, label: kind };
  return {
    id: makeLayoutId('fixture'),
    kind,
    ...d,
    columnShape: kind === 'pillar' || kind === 'column' ? 'round' as ColumnShape : undefined,
    color: kind === 'pillar' || kind === 'column' ? '#78716c' : undefined,
    flowerType: kind === 'flower' ? 'boquet' as FlowerType : undefined,
    flowerColor: kind === 'flower' ? '#e11d48' : undefined,
  };
}

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

export function ensureBlueprintDefaults(blueprint: RoomLayoutBlueprint): RoomLayoutBlueprint {
  return {
    ...blueprint,
    roomOutline: blueprint.roomOutline ?? defaultRoomOutline('rectangle'),
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
    description: 'Gradins en hexagone autour de la scène',
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
      tableColor: fields.includes('tableColor') ? source.tableColor : item.tableColor,
      capacity: fields.includes('capacity') ? source.capacity : item.capacity,
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
  const tierCount = Math.max(1, params.tierCount ?? 3);
  const rowsPerTier = Math.max(1, params.rowsPerTier ?? 2);
  const seatsPerRow = Math.max(2, params.seatsPerRow ?? 12);
  const furniture: RoomLayoutBlueprint['furniture'] = [];
  let rowIndex = 0;

  for (let tier = 0; tier < tierCount; tier++) {
    for (let r = 0; r < rowsPerTier; r++) {
      const progress = (tier * rowsPerTier + r) / (tierCount * rowsPerTier - 1 || 1);
      const y = 25 + progress * 60;
      const curve = 0.15 + tier * 0.08;
      furniture.push({
        id: uid('row'),
        kind: 'row',
        label: `Gradin ${tier + 1} — Rangée ${r + 1}`,
        seatCount: seatsPerRow,
        chairType,
        tier,
        x: 50,
        y,
        curve,
      });
      rowIndex++;
    }
  }

  return {
    version: 1,
    roomType: 'AMPHITHEATER',
    canvas: { widthM: 22, heightM: 16 },
    fixtures: [
      {
        id: uid('stage'),
        kind: 'stage',
        x: 30,
        y: 88,
        w: 40,
        h: 8,
        label: 'Scène',
      },
    ],
    furniture,
    metadata: { rowCount: rowIndex, totalSeats: rowIndex * seatsPerRow },
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

export type RoomType = 'SIMPLE' | 'BANQUET' | 'CONFERENCE' | 'AMPHITHEATER' | 'TENT' | 'CUSTOM';
export type ChairType = 'BANQUET' | 'FOLDING' | 'THEATER' | 'STOOL' | 'ARMCHAIR' | 'WHEELCHAIR';
export type TableShape = 'round' | 'rectangular' | 'square' | 'oval';

export type RoomOutlineShape = 'rectangle' | 'square' | 'circle' | 'lShape' | 'hexagon' | 'octagon';
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
        x: number;
        y: number;
        locked?: boolean;
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

export const ROOM_LAYOUT_TEMPLATES: RoomLayoutTemplate[] = [
  {
    id: 'banquet-classic',
    name: 'Banquet classique',
    description: '8 tables rondes + scène',
    roomType: 'BANQUET',
    outlineShape: 'rectangle',
    build: (p) => ensureBlueprintDefaults({ ...generateRoomBlueprint('BANQUET', { tableCount: 8, ...p }), templateId: 'banquet-classic', roomOutline: defaultRoomOutline('rectangle') }),
  },
  {
    id: 'banquet-oval',
    name: 'Banquet ovale',
    description: '12 tables dans une salle ovale',
    roomType: 'BANQUET',
    outlineShape: 'circle',
    build: (p) => ensureBlueprintDefaults({ ...generateRoomBlueprint('BANQUET', { tableCount: 12, tableShape: 'round', ...p }), templateId: 'banquet-oval', roomOutline: defaultRoomOutline('circle') }),
  },
  {
    id: 'conference-standard',
    name: 'Conférence standard',
    description: '6 rangées + podium',
    roomType: 'CONFERENCE',
    outlineShape: 'rectangle',
    build: (p) => ensureBlueprintDefaults({ ...generateRoomBlueprint('CONFERENCE', { rowCount: 6, ...p }), templateId: 'conference-standard', roomOutline: defaultRoomOutline('rectangle') }),
  },
  {
    id: 'amphitheater-small',
    name: 'Amphithéâtre compact',
    description: '3 gradins × 2 rangées',
    roomType: 'AMPHITHEATER',
    outlineShape: 'hexagon',
    build: (p) => ensureBlueprintDefaults({ ...generateRoomBlueprint('AMPHITHEATER', { tierCount: 3, rowsPerTier: 2, ...p }), templateId: 'amphitheater-small', roomOutline: defaultRoomOutline('hexagon') }),
  },
  {
    id: 'tent-garden',
    name: 'Tente de réception',
    description: 'Tente avec 6 tables',
    roomType: 'TENT',
    outlineShape: 'octagon',
    build: (p) => ensureBlueprintDefaults({ ...generateRoomBlueprint('TENT', { tableCount: 6, ...p }), templateId: 'tent-garden', roomOutline: defaultRoomOutline('octagon') }),
  },
  {
    id: 'empty-lshape',
    name: 'Salle en L',
    description: 'Contour vide personnalisable',
    roomType: 'SIMPLE',
    outlineShape: 'lShape',
    build: () => ensureBlueprintDefaults({
      version: 1,
      roomType: 'SIMPLE',
      templateId: 'empty-lshape',
      canvas: { widthM: 20, heightM: 15 },
      roomOutline: defaultRoomOutline('lShape'),
      fixtures: [],
      furniture: [],
      metadata: { totalSeats: 0 },
    }),
  },
];

export function applyRoomTemplate(templateId: string, params?: LayoutParams): RoomLayoutBlueprint | null {
  const tpl = ROOM_LAYOUT_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return null;
  return refreshBlueprintMetadata(tpl.build(params));
}

export const roomOutlineLabels: Record<RoomOutlineShape, string> = {
  rectangle: 'Rectangle',
  square: 'Carré',
  circle: 'Circulaire / Ovale',
  lShape: 'Forme en L',
  hexagon: 'Hexagone',
  octagon: 'Octogone',
};

export function getRoomOutlineClipPath(shape: RoomOutlineShape): string | undefined {
  switch (shape) {
    case 'circle':
      return 'ellipse(45% 42% at 50% 50%)';
    case 'hexagon':
      return 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)';
    case 'octagon':
      return 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)';
    case 'lShape':
      return 'polygon(0% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 100%, 0% 100%)';
    case 'square':
      return 'inset(8% 20% 8% 20%)';
    default:
      return undefined;
  }
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
  const chairType: ChairType = params.chairType || (roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER' ? 'THEATER' : 'BANQUET');

  switch (roomType) {
    case 'BANQUET':
      return generateBanquetBlueprint(params, chairType);
    case 'CONFERENCE':
      return generateConferenceBlueprint(params, chairType);
    case 'AMPHITHEATER':
      return generateAmphitheaterBlueprint(params, chairType);
    case 'TENT':
      return generateTentBlueprint(params, chairType);
    case 'SIMPLE':
    default:
      return generateSimpleBlueprint(roomType);
  }
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
    locked: true,
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
        locked: true,
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
  switch (chairType) {
    case 'THEATER':
      return 'w-2.5 h-3 rounded-sm bg-slate-600';
    case 'FOLDING':
      return 'w-2.5 h-2.5 rounded-full border-2 border-slate-500 bg-transparent';
    case 'STOOL':
      return 'w-2 h-2 rounded-full bg-amber-600';
    case 'ARMCHAIR':
      return 'w-3 h-3 rounded-md bg-violet-600';
    case 'WHEELCHAIR':
      return 'w-3.5 h-3 rounded bg-emerald-600';
    default:
      return 'w-2.5 h-2.5 rounded-full bg-indigo-500';
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

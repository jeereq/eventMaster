type HttpError = Error & { status?: number };

export const ROOM_PLAN_AI_GROUP_ID = 'ai-import';
export const ROOM_PLAN_VISION_ITEM_MAX = 120;
export const ROOM_PLAN_CANVAS_MIN_M = 5;
export const ROOM_PLAN_CANVAS_MAX_M = 80;
export const ROOM_PLAN_DATA_URL_MAX_CHARS = 2_500_000;

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 4;
const rateBuckets = new Map<string, { count: number; startedAt: number }>();

const ROOM_TYPES = new Set(['SIMPLE', 'BANQUET', 'CONFERENCE', 'AMPHITHEATER', 'TENT', 'CUSTOM']);
const OUTLINE_SHAPES = new Set([
  'rectangle',
  'square',
  'circle',
  'ellipse',
  'lShape',
  'uShape',
  'hexagon',
  'octagon',
  'trapezoid',
  'stadium',
]);
const TABLE_SHAPES = new Set(['round', 'rectangular', 'square', 'oval', 'cocktail', 'highTop', 'arc']);
const ZONE_KINDS = new Set(['dance', 'vip', 'buffet', 'carpet', 'custom']);
const FLOOR_TYPES = new Set([
  'parquet', 'marbre', 'moquette', 'carrelage', 'beton', 'herbe',
  'damier', 'terrazzo', 'sable', 'brique', 'bois', 'pierre', 'epoxy',
  'gravier', 'gravierFonce',
]);
const TABLE_SURFACES = new Set(['wood', 'linen', 'walnut', 'marble', 'darkWood', 'whiteLacquer', 'glass']);
const ZONE_MATERIALS = new Set(['wood', 'carpet', 'vinyl', 'led', 'marble', 'concrete', 'parquet', 'epoxy', 'grass', 'gravel', 'brick']);
const WALL_TEXTURES = new Set([
  'plaster', 'brick', 'wood', 'concrete', 'wallpaper', 'stone',
  'tadelakt', 'travertine', 'metroTile', 'woodPanel',
]);
const CHAIR_STYLES = new Set(['classic', 'chiavari', 'napoleon', 'ghost', 'lounge', 'crossback', 'louis', 'ovalBack']);
const SEAT_MATERIALS = new Set(['velvet', 'wood', 'fabric', 'leather', 'plastic', 'linen']);
const AISLE_STYLES = new Set([
  'royalRed', 'whiteMirror', 'botanicalRunner', 'rusticWood', 'damaskGold', 'ledRunway', 'blackVelvet',
]);
const NAMED_COLORS: Record<string, string> = {
  red: '#9b1c1c',
  burgundy: '#7f1d1d',
  gold: '#c4a06a',
  cream: '#f5f0e8',
  ivory: '#f8f4ec',
  white: '#f4f4f5',
  black: '#1c1917',
  wood: '#8b6914',
  walnut: '#5c3d1e',
  green: '#3f6b4a',
  blue: '#1e3a5f',
  grey: '#78716c',
  gray: '#78716c',
};
const ITEM_KINDS = new Set([
  'table',
  'row',
  'chair',
  'zone',
  'stage',
  'podium',
  'aisle',
  'door',
  'entrance',
  'carpet',
  'buffet',
  'column',
  'stairs',
  'balcony',
  'chandelier',
  'flower',
  'arch',
  'partition',
  'decal',
  'pedestal',
  'stringLight',
  'fountain',
  'gazebo',
  'djBooth',
  'screen',
]);

/** Vocabulaire courant renvoyé par les modèles vision → kind EventMaster. */
const KIND_ALIASES: Record<string, RoomPlanVisionItemKind> = {
  table: 'table',
  tables: 'table',
  diningtable: 'table',
  banquettable: 'table',
  roundtable: 'table',
  longtable: 'table',
  cocktailtable: 'table',
  hightop: 'table',
  hightoptable: 'table',
  mangeedebout: 'table',
  desk: 'table',
  row: 'row',
  rows: 'row',
  chairrow: 'row',
  seating: 'row',
  seatingrow: 'row',
  bench: 'row',
  benches: 'row',
  banquette: 'row',
  banquettes: 'row',
  pew: 'row',
  pews: 'row',
  bleacher: 'row',
  bleachers: 'row',
  theaterseats: 'row',
  chairs: 'row',
  rangee: 'row',
  rangees: 'row',
  gradin: 'row',
  gradins: 'row',
  amphitheater: 'row',
  amphitheatre: 'row',
  chair: 'chair',
  fauteuil: 'chair',
  armchair: 'chair',
  loungechair: 'chair',
  stool: 'chair',
  zone: 'zone',
  dancefloor: 'zone',
  dance: 'zone',
  piste: 'zone',
  pistededanse: 'zone',
  vip: 'zone',
  lounge: 'zone',
  stage: 'stage',
  scene: 'stage',
  platform: 'stage',
  podium: 'podium',
  lectern: 'podium',
  speaker: 'podium',
  aisle: 'aisle',
  allee: 'aisle',
  runner: 'aisle',
  carpetrunner: 'aisle',
  door: 'door',
  porte: 'door',
  entrance: 'entrance',
  entree: 'entrance',
  lobby: 'entrance',
  carpet: 'carpet',
  tapis: 'carpet',
  moquette: 'carpet',
  buffet: 'buffet',
  bar: 'buffet',
  catering: 'buffet',
  column: 'column',
  colonne: 'column',
  pillar: 'column',
  pilier: 'column',
  stairs: 'stairs',
  escalier: 'stairs',
  staircase: 'stairs',
  balcony: 'balcony',
  balcon: 'balcony',
  chandelier: 'chandelier',
  lustre: 'chandelier',
  flower: 'flower',
  flowers: 'flower',
  fleurs: 'flower',
  bouquet: 'flower',
  plant: 'flower',
  plants: 'flower',
  arch: 'arch',
  arche: 'arch',
  floralarch: 'arch',
  partition: 'partition',
  cloison: 'partition',
  hedge: 'partition',
  decal: 'decal',
  motif: 'decal',
  floordecal: 'decal',
  pedestal: 'pedestal',
  piedestal: 'pedestal',
  stringlight: 'stringLight',
  stringlights: 'stringLight',
  lights: 'stringLight',
  lighting: 'stringLight',
  fairylights: 'stringLight',
  guirlande: 'stringLight',
  guirlandes: 'stringLight',
  edison: 'stringLight',
  fountain: 'fountain',
  fontaine: 'fountain',
  gazebo: 'gazebo',
  gloriette: 'gazebo',
  pergola: 'gazebo',
  tent: 'gazebo',
  djbooth: 'djBooth',
  dj: 'djBooth',
  djtable: 'djBooth',
  mixer: 'djBooth',
  regie: 'djBooth',
  screen: 'screen',
  ecran: 'screen',
  tv: 'screen',
  projector: 'screen',
};

const SHAPE_ALIASES: Record<string, string> = {
  round: 'round',
  circular: 'round',
  circle: 'round',
  ronde: 'round',
  rond: 'round',
  rectangular: 'rectangular',
  rectangle: 'rectangular',
  rect: 'rectangular',
  long: 'rectangular',
  banquet: 'rectangular',
  square: 'square',
  carre: 'square',
  oval: 'oval',
  ovale: 'oval',
  cocktail: 'cocktail',
  hightop: 'highTop',
  mangdebout: 'highTop',
  mangeedebout: 'highTop',
  arc: 'arc',
  curved: 'arc',
  curve: 'arc',
  cshape: 'arc',
};

const ZONE_KIND_ALIASES: Record<string, string> = {
  dance: 'dance',
  dancefloor: 'dance',
  piste: 'dance',
  vip: 'vip',
  lounge: 'vip',
  buffet: 'buffet',
  catering: 'buffet',
  bar: 'buffet',
  carpet: 'carpet',
  tapis: 'carpet',
  moquette: 'carpet',
  custom: 'custom',
};

function normalizeAliasKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizeRoomPlanVisionKind(raw: unknown): RoomPlanVisionItemKind | undefined {
  if (typeof raw !== 'string') return undefined;
  const key = normalizeAliasKey(raw);
  if (!key) return undefined;
  if (ITEM_KINDS.has(raw)) return raw as RoomPlanVisionItemKind;
  return KIND_ALIASES[key] ?? KIND_ALIASES[key.replace(/s$/, '')];
}

function resolveTableShape(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  if (TABLE_SHAPES.has(raw)) return raw;
  return SHAPE_ALIASES[normalizeAliasKey(raw)];
}

function resolveZoneKind(raw: unknown, kindHint?: string): string | undefined {
  if (typeof raw === 'string') {
    if (ZONE_KINDS.has(raw)) return raw;
    const aliased = ZONE_KIND_ALIASES[normalizeAliasKey(raw)];
    if (aliased) return aliased;
  }
  if (!kindHint) return undefined;
  return ZONE_KIND_ALIASES[normalizeAliasKey(kindHint)];
}

function inferTableSeats(w?: number, h?: number, shape?: string): number {
  if (shape === 'cocktail' || shape === 'highTop') return 2;
  const span = Math.max(w ?? 10, h ?? 10);
  if (span <= 6) return 4;
  if (span <= 11) return 8;
  if (span <= 14) return 10;
  return 12;
}

function inferRowSeats(w?: number): number {
  if (w == null) return 10;
  return Math.round(clamp(w / 2.4, 4, 40));
}

export type RoomPlanVisionView = 'top' | 'perspective' | 'unclear';

export type RoomPlanVisionItemKind =
  | 'table'
  | 'row'
  | 'chair'
  | 'zone'
  | 'stage'
  | 'podium'
  | 'aisle'
  | 'door'
  | 'entrance'
  | 'carpet'
  | 'buffet'
  | 'column'
  | 'stairs'
  | 'balcony'
  | 'chandelier'
  | 'flower'
  | 'arch'
  | 'partition'
  | 'decal'
  | 'pedestal'
  | 'stringLight'
  | 'fountain'
  | 'gazebo'
  | 'djBooth'
  | 'screen';

export interface RoomPlanVisionItem {
  kind: RoomPlanVisionItemKind;
  /** Coin haut-gauche de l’empreinte (0–100), sauf si `anchor` = center. */
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  seats?: number;
  shape?: string;
  label?: string;
  zoneKind?: string;
  color?: string;
  surface?: string;
  material?: string;
  chairStyle?: string;
  seatMaterial?: string;
  aisleStyle?: string;
  hasCenterpiece?: boolean;
  hasPetals?: boolean;
  hasSideLanterns?: boolean;
  stageShape?: string;
  decalKind?: string;
  pedestalStyle?: string;
  anchor?: 'box' | 'center';
}

export interface RoomPlanVisionWall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  doors: number[];
  windows: number[];
}

export interface RoomPlanVisionAppearance {
  imageRole: 'plan' | 'photo' | 'texture';
  floorType?: string;
  floorColor?: string;
  wallTexture?: string;
  wallColor?: string;
  tableSurface?: string;
  tableColor?: string;
  roofStyle?: string;
  curtainColor?: string;
}

export interface RoomPlanVisionDraft {
  view: RoomPlanVisionView;
  canvas: { widthM: number; heightM: number };
  outline: { shape: string; x: number; y: number; w: number; h: number };
  appearance: RoomPlanVisionAppearance;
  items: RoomPlanVisionItem[];
  walls: RoomPlanVisionWall[];
  confidence: number;
  warnings: string[];
}

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

const GEMINI_PLAN_MODEL_DEFAULT = 'gemini-2.5-pro';
const GEMINI_IMAGE_FETCH_MAX_BYTES = 8 * 1024 * 1024;

function requireGeminiKey(): string {
  const key = (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.NANO_BANANA_API_KEY ||
    ''
  ).trim();
  if (!key) {
    fail(503, 'La lecture IA n’est pas configurée sur ce serveur (GEMINI_API_KEY manquante).');
  }
  return key;
}

function getGeminiPlanModel(): string {
  return (process.env.GEMINI_PLAN_MODEL || process.env.GEMINI_MODEL || GEMINI_PLAN_MODEL_DEFAULT).trim();
}

function parseDataImage(url: string): { mimeType: string; base64: string } | null {
  const match = url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
  if (!match?.[1] || !match[2]) return null;
  return { mimeType: match[1], base64: match[2] };
}

async function loadGeminiImagePart(imageUrl: string): Promise<{ inline_data: { mime_type: string; data: string } }> {
  const embedded = parseDataImage(imageUrl);
  if (embedded) {
    return { inline_data: { mime_type: embedded.mimeType, data: embedded.base64 } };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(imageUrl, { signal: controller.signal });
    if (!response.ok) {
      fail(502, 'Impossible de télécharger la photo de la salle pour l’analyse.');
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength < 80) {
      fail(502, 'La photo de la salle est invalide ou trop petite.');
    }
    if (buffer.byteLength > GEMINI_IMAGE_FETCH_MAX_BYTES) {
      fail(413, 'La photo est trop lourde pour l’analyse Gemini (max 8 Mo).');
    }
    const header = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const mimeType = header.startsWith('image/') ? header : 'image/jpeg';
    return { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } };
  } finally {
    clearTimeout(timer);
  }
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced?.[1] || trimmed).trim();
  return JSON.parse(jsonText);
}

export function rateLimitRoomPlanAi(userId: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, startedAt: now });
    return;
  }
  if (bucket.count >= RATE_MAX) {
    fail(429, 'Trop de lectures de plan. Réessayez dans une minute.');
  }
  bucket.count += 1;
}

export function normalizeRoomPlanImageUrl(raw: unknown): string {
  if (typeof raw !== 'string') {
    fail(400, 'Fournissez l’URL ou la photo du plan de salle.');
  }
  const url = raw.trim();
  if (!url) fail(400, 'Fournissez l’URL ou la photo du plan de salle.');
  if (url.startsWith('data:image/')) {
    if (url.length > ROOM_PLAN_DATA_URL_MAX_CHARS) {
      fail(413, 'L’image est trop lourde. Importez-la d’abord (upload), puis relancez la lecture IA.');
    }
    return url;
  }
  if (!/^https:\/\//i.test(url)) {
    fail(400, 'L’image du plan doit être une URL https ou une photo importée.');
  }
  return url;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampPct(value: unknown, fallback: number): number {
  return Math.round(clamp(asNumber(value, fallback), 0, 100) * 10) / 10;
}

function clampMeters(value: unknown, fallback: number): number {
  return Math.round(clamp(asNumber(value, fallback), ROOM_PLAN_CANVAS_MIN_M, ROOM_PLAN_CANVAS_MAX_M) * 10) / 10;
}

function asString(value: unknown, max = 80): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function parseHexColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const raw = value.trim().toLowerCase();
  if (NAMED_COLORS[raw]) return NAMED_COLORS[raw];
  const hex = raw.startsWith('#') ? raw.slice(1) : raw;
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;
  if (/^[0-9a-f]{8}$/.test(hex)) return `#${hex.slice(0, 6)}`;
  return undefined;
}

function asKnown(value: unknown, allowed: Set<string>): string | undefined {
  return typeof value === 'string' && allowed.has(value) ? value : undefined;
}

function parseAppearance(raw: unknown, view: RoomPlanVisionView): RoomPlanVisionAppearance {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const role = source.imageRole === 'plan' || source.imageRole === 'photo' || source.imageRole === 'texture'
    ? source.imageRole
    : view === 'top' ? 'plan' : 'photo';
  const appearance: RoomPlanVisionAppearance = { imageRole: role };
  const floorType = asKnown(source.floorType, FLOOR_TYPES);
  if (floorType) appearance.floorType = floorType;
  const floorColor = parseHexColor(source.floorColor);
  if (floorColor) appearance.floorColor = floorColor;
  const wallTexture = asKnown(source.wallTexture, WALL_TEXTURES);
  if (wallTexture) appearance.wallTexture = wallTexture;
  const wallColor = parseHexColor(source.wallColor);
  if (wallColor) appearance.wallColor = wallColor;
  const tableSurface = asKnown(source.tableSurface, TABLE_SURFACES);
  if (tableSurface) appearance.tableSurface = tableSurface;
  const tableColor = parseHexColor(source.tableColor);
  if (tableColor) appearance.tableColor = tableColor;
  if (source.roofStyle === 'tentSwag' || source.roofStyle === 'flat' || source.roofStyle === 'gabled' || source.roofStyle === 'coffered') {
    appearance.roofStyle = source.roofStyle;
  }
  const curtainColor = parseHexColor(source.curtainColor);
  if (curtainColor) appearance.curtainColor = curtainColor;
  return appearance;
}

function asRatioList(value: unknown, max = 4): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
    .map((item) => Math.round(clamp(item, 0.08, 0.92) * 100) / 100)
    .slice(0, max);
}

export function parseRoomPlanVisionDraft(
  raw: unknown,
  known: { widthM: number; heightM: number },
): RoomPlanVisionDraft {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const canvasRaw = source.canvas && typeof source.canvas === 'object'
    ? (source.canvas as Record<string, unknown>)
    : {};
  const outlineRaw = source.outline && typeof source.outline === 'object'
    ? (source.outline as Record<string, unknown>)
    : {};
  const view = source.view === 'top' || source.view === 'perspective' || source.view === 'unclear'
    ? source.view
    : 'unclear';
  const warnings = Array.isArray(source.warnings)
    ? source.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim().slice(0, 180))
      .slice(0, 8)
    : [];

  const itemsRaw = Array.isArray(source.items) ? source.items : [];
  const items: RoomPlanVisionItem[] = [];
  for (const entry of itemsRaw) {
    if (items.length >= ROOM_PLAN_VISION_ITEM_MAX) {
      warnings.push(`Plus de ${ROOM_PLAN_VISION_ITEM_MAX} objets visibles — le reste a été ignoré.`);
      break;
    }
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const kind = normalizeRoomPlanVisionKind(row.kind);
    if (!kind) continue;
    const item: RoomPlanVisionItem = {
      kind,
      x: clampPct(row.x, 50),
      y: clampPct(row.y, 50),
    };
    if (row.w != null) item.w = clampPct(row.w, 10);
    if (row.h != null) item.h = clampPct(row.h, 8);
    if (row.rotation != null) item.rotation = Math.round(clamp(asNumber(row.rotation, 0), -180, 180));
    const shape = resolveTableShape(row.shape)
      ?? (kind === 'table' && typeof row.kind === 'string' ? resolveTableShape(row.kind) : undefined);
    if (shape) item.shape = shape;
    else if (kind === 'table' && item.w != null && item.h != null) {
      const ratio = item.w / Math.max(item.h, 0.1);
      if (ratio > 1.45 || ratio < 0.7) item.shape = 'rectangular';
    }
    if (row.seats != null) {
      item.seats = Math.round(clamp(asNumber(row.seats, kind === 'row' ? 10 : 8), 2, kind === 'row' ? 40 : 16));
    } else if (kind === 'table') {
      item.seats = inferTableSeats(item.w, item.h, item.shape);
    } else if (kind === 'row') {
      item.seats = inferRowSeats(item.w);
    }
    const label = asString(row.label, 40);
    if (label) item.label = label;
    const zoneKind = resolveZoneKind(row.zoneKind, typeof row.kind === 'string' ? row.kind : kind);
    if (zoneKind) item.zoneKind = zoneKind;
    const color = parseHexColor(row.color);
    if (color) item.color = color;
    const surface = asKnown(row.surface, TABLE_SURFACES);
    if (surface) item.surface = surface;
    const material = asKnown(row.material, ZONE_MATERIALS);
    if (material) item.material = material;
    const chairStyle = asKnown(row.chairStyle, CHAIR_STYLES);
    if (chairStyle) item.chairStyle = chairStyle;
    const seatMaterial = asKnown(row.seatMaterial, SEAT_MATERIALS);
    if (seatMaterial) item.seatMaterial = seatMaterial;
    const aisleStyle = asKnown(row.aisleStyle, AISLE_STYLES);
    if (aisleStyle) item.aisleStyle = aisleStyle;
    if (row.hasCenterpiece === true) item.hasCenterpiece = true;
    if (row.hasPetals === true) item.hasPetals = true;
    if (row.hasSideLanterns === true) item.hasSideLanterns = true;
    if (row.stageShape === 'semiCircle' || row.shape === 'semiCircle') item.stageShape = 'semiCircle';
    if (row.decalKind === 'rose' || row.decalKind === 'butterfly' || row.decalKind === 'custom') {
      item.decalKind = row.decalKind;
    }
    if (row.pedestalStyle === 'squareWhite' || row.pedestalStyle === 'columnGold') {
      item.pedestalStyle = row.pedestalStyle;
    }
    if (row.anchor === 'center' || row.anchor === 'box') item.anchor = row.anchor;
    items.push(item);
  }

  const wallsRaw = Array.isArray(source.walls) ? source.walls : [];
  const walls: RoomPlanVisionWall[] = [];
  for (const entry of wallsRaw.slice(0, 16)) {
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const start = row.start && typeof row.start === 'object' ? row.start as Record<string, unknown> : null;
    const end = row.end && typeof row.end === 'object' ? row.end as Record<string, unknown> : null;
    if (!start || !end) continue;
    walls.push({
      start: { x: clampPct(start.x, 8), y: clampPct(start.y, 8) },
      end: { x: clampPct(end.x, 92), y: clampPct(end.y, 8) },
      doors: asRatioList(row.doors, 3),
      windows: asRatioList(row.windows, 4),
    });
  }

  const outlineShape = typeof outlineRaw.shape === 'string' && OUTLINE_SHAPES.has(outlineRaw.shape)
    ? outlineRaw.shape
    : 'rectangle';

  if (items.length === 0) {
    warnings.push('Aucun objet de salle clairement visible. L’image sert de repère — placez le mobilier à la main.');
  }
  if (view === 'perspective') {
    warnings.push('Photo en perspective : les positions sont une estimation. Vérifiez l’échelle et les allées.');
  }

  return {
    view,
    canvas: {
      widthM: clampMeters(canvasRaw.widthM, known.widthM),
      heightM: clampMeters(canvasRaw.heightM, known.heightM),
    },
    outline: {
      shape: outlineShape,
      x: clampPct(outlineRaw.x, 5),
      y: clampPct(outlineRaw.y, 5),
      w: clampPct(outlineRaw.w, 90),
      h: clampPct(outlineRaw.h, 90),
    },
    appearance: parseAppearance(source.appearance, view),
    items,
    walls,
    confidence: Math.round(clamp(asNumber(source.confidence, 0.4), 0, 1) * 100) / 100,
    warnings,
  };
}

function systemPrompt(): string {
  return `Tu es l’analyste de plans de salle EventMaster (RDC).
Tu ANALYSES la photo, tu DÉDUIS le mobilier visible, puis tu produis UNIQUEMENT un JSON valide.

Mission :
- ÉNUMÈRE chaque élément visible (table, rangée, chaise isolée, piste, scène, allée, buffet, DJ, écran, colonne, fleurs, lustre, porte…).
- Un item JSON par objet au sol. 12 tables visibles = 12 items "table". 5 rangées = 5 items "row".
- DÉDUIS le kind le plus proche à partir des preuves visuelles (silhouette, nappe, chaises autour, tapis, estrade).
- Un plan vide n’est acceptable que si la photo n’est vraiment pas une salle (texture seule, selfie, document).
- Interdit : inventer de l’or, des pétales, des lanternes, un lustre cristal, une allée rouge, des portes ou un amphithéâtre fantôme s’ils ne se voient pas.
- Si un détail est flou : estime quand même l’objet principal (table / rangée / zone) et ajoute un warning. N’invente pas de numéros de sièges.

Repère :
- Le rectangle de la salle = 0–100 % (origine haut-gauche, y vers le bas), comme un plan 2D vu du dessus.
- Pour CHAQUE item : x,y = coin HAUT-GAUCHE de l’empreinte au sol, w et h = largeur et hauteur en % (anchor="box").
- Photo verticale / scan / PDF : view="top", appearance.imageRole="plan".
- Photo en perspective : view="perspective", appearance.imageRole="photo", confidence plus basse. Projette quand même le mobilier au sol (devant = y élevé, fond = y faible).
- Photo d’un parquet / carrelage sans mobilier : appearance.imageRole="texture".

Champs JSON obligatoires :
{
  "view": "top" | "perspective" | "unclear",
  "canvas": { "widthM": number, "heightM": number },
  "outline": { "shape": "rectangle"|"square"|"circle"|"ellipse"|"lShape"|"uShape"|"hexagon"|"octagon"|"trapezoid"|"stadium", "x":0-100, "y":0-100, "w":0-100, "h":0-100 },
  "appearance": {
    "imageRole": "plan"|"photo"|"texture",
    "floorType": "parquet"|"marbre"|"moquette"|"carrelage"|"beton"|"herbe"|"damier"|"terrazzo"|"sable"|"brique"|"bois"|"pierre"|"epoxy",
    "floorColor": "#rrggbb",
    "wallTexture": "plaster"|"brick"|"wood"|"concrete"|"wallpaper"|"stone"|"tadelakt"|"travertine"|"metroTile"|"woodPanel",
    "wallColor": "#rrggbb",
    "tableSurface": "wood"|"linen"|"walnut"|"marble"|"darkWood"|"whiteLacquer"|"glass",
    "tableColor": "#rrggbb",
    "roofStyle": "flat"|"tentSwag"|"gabled"|"coffered",
    "curtainColor": "#rrggbb"
  },
  "items": [{
    "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower"|"arch"|"partition"|"decal"|"pedestal"|"stringLight"|"fountain"|"gazebo"|"djBooth"|"screen",
    "x":0-100, "y":0-100, "w":0-100, "h":0-100, "anchor":"box",
    "rotation":-180-180, "seats":number,
    "shape": "round"|"rectangular"|"square"|"oval"|"cocktail"|"highTop"|"arc",
    "hasCenterpiece": true,
    "stageShape": "rect"|"semiCircle",
    "label": string, "zoneKind": "dance"|"vip"|"buffet"|"carpet"|"custom",
    "color": "#rrggbb", "surface": "wood"|"linen"|"walnut"|"marble"|"darkWood"|"whiteLacquer"|"glass",
    "material": "wood"|"carpet"|"vinyl"|"led"|"marble"|"concrete"|"parquet"|"epoxy",
    "chairStyle": "classic"|"chiavari"|"napoleon"|"ghost"|"lounge"|"crossback"|"louis"|"ovalBack",
    "seatMaterial": "velvet"|"wood"|"fabric"|"leather"|"plastic"|"linen",
    "aisleStyle": "royalRed"|"whiteMirror"|"botanicalRunner"|"rusticWood"|"damaskGold"|"ledRunway"|"blackVelvet",
    "hasPetals": true,
    "hasSideLanterns": true,
    "decalKind": "rose"|"butterfly",
    "pedestalStyle": "squareWhite"|"columnGold"
  }],
  "walls": [{ "start": {"x","y"}, "end": {"x","y"}, "doors": [0-1], "windows": [0-1] }],
  "confidence": 0-1,
  "warnings": ["..."]
}

Règles appearance :
- floorType / floorColor / wallTexture / wallColor / curtainColor : seulement si clairement visibles.
- Couleurs en hex (#rrggbb) d’après la teinte observée, pas une couleur de thème EventMaster.

Règles items (déduction autorisée) :
- table = chaque table isolée. seats = chaises / couverts visibles autour, sinon estime d’après le diamètre (cocktail 2, ronde 8, longue 10–14). shape d’après la silhouette. hasCenterpiece=true si vase ou bouquet central.
- row = chaque rangée de chaises alignées (théâtre, banquettes, gradin). Une rangée visible = un item. chairs autour d’une table → seats de la table, pas des row.
- chair = fauteuil / tabouret isolé seulement.
- zone = piste de danse, VIP, buffet au sol, grande moquette. zoneKind obligatoire. color + material si la surface se voit.
- aisle = tapis / allée au sol. aisleStyle seulement si le tapis correspond vraiment. hasPetals / hasSideLanterns seulement s’ils sont visibles.
- stage / podium / djBooth / screen / buffet / column / stairs / balcony / chandelier / flower / arch / partition / decal / pedestal / stringLight / fountain / gazebo : dès qu’ils se voient, pose-les.
- door / entrance : seulement si clairement une ouverture d’accès (sinon walls.doors).
- walls : uniquement les murs / ouvertures VISIBLES. Tableau vide si tu n’es pas sûr — n’invente pas de portes.
- Maximum ${ROOM_PLAN_VISION_ITEM_MAX} items, du plus certain au moins certain. Préfère trop d’objets réels plutôt qu’un items[].

Si la photo n’est pas une salle, view="unclear", items=[], warnings explicites.`;
}

function composeSystemPrompt(): string {
  return `Tu es l’architecte de plans de salle EventMaster (RDC).
À partir du BRIEF, tu CONÇOIS un plan réaliste et tu produis UNIQUEMENT un JSON valide.

Mission :
- Place un agencement cohérent : chaque table, rangée, piste, scène, allée, buffet, DJ, colonne… est un item séparé.
- 10 tables demandées = 10 items "table". 4 rangées = 4 items "row".
- Respecte le type de salle et les mètres fournis pour canvas.widthM / heightM.
- N’ajoute or, pétales, lustre cristal ou allée rouge que si le brief les demande.
- view="top", appearance.imageRole="plan".

Le schéma JSON est le même que pour une lecture photo :
{
  "view": "top",
  "canvas": { "widthM": number, "heightM": number },
  "outline": { "shape": "rectangle"|"square"|"circle"|"ellipse"|"lShape"|"uShape"|"hexagon"|"octagon"|"trapezoid"|"stadium", "x":0-100, "y":0-100, "w":0-100, "h":0-100 },
  "appearance": {
    "imageRole": "plan",
    "floorType": "parquet"|"marbre"|"moquette"|"carrelage"|"beton"|"herbe"|"damier"|"terrazzo"|"sable"|"brique"|"bois"|"pierre"|"epoxy",
    "floorColor": "#rrggbb",
    "wallTexture": "plaster"|"brick"|"wood"|"concrete"|"wallpaper"|"stone"|"tadelakt"|"travertine"|"metroTile"|"woodPanel",
    "wallColor": "#rrggbb",
    "tableSurface": "wood"|"linen"|"walnut"|"marble"|"darkWood"|"whiteLacquer"|"glass",
    "tableColor": "#rrggbb",
    "roofStyle": "flat"|"tentSwag"|"gabled"|"coffered",
    "curtainColor": "#rrggbb"
  },
  "items": [{
    "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower"|"arch"|"partition"|"decal"|"pedestal"|"stringLight"|"fountain"|"gazebo"|"djBooth"|"screen",
    "x":0-100, "y":0-100, "w":0-100, "h":0-100, "anchor":"box",
    "rotation":-180-180, "seats":number,
    "shape": "round"|"rectangular"|"square"|"oval"|"cocktail"|"highTop"|"arc",
    "hasCenterpiece": true,
    "stageShape": "rect"|"semiCircle",
    "label": string, "zoneKind": "dance"|"vip"|"buffet"|"carpet"|"custom",
    "color": "#rrggbb", "surface": "wood"|"linen"|"walnut"|"marble"|"darkWood"|"whiteLacquer"|"glass",
    "material": "wood"|"carpet"|"vinyl"|"led"|"marble"|"concrete"|"parquet"|"epoxy",
    "chairStyle": "classic"|"chiavari"|"napoleon"|"ghost"|"lounge"|"crossback"|"louis"|"ovalBack",
    "seatMaterial": "velvet"|"wood"|"fabric"|"leather"|"plastic"|"linen",
    "aisleStyle": "royalRed"|"whiteMirror"|"botanicalRunner"|"rusticWood"|"damaskGold"|"ledRunway"|"blackVelvet"
  }],
  "walls": [{ "start": {"x","y"}, "end": {"x","y"}, "doors": [0-1], "windows": [0-1] }],
  "confidence": 0-1,
  "warnings": ["..."]
}

Répartis le mobilier sans chevauchement. Maximum ${ROOM_PLAN_VISION_ITEM_MAX} items.`;
}

async function requestRoomPlanJson(input: {
  system: string;
  userText: string;
  imageUrl?: string;
  temperature: number;
  widthM: number;
  heightM: number;
  failMessage: string;
}): Promise<RoomPlanVisionDraft> {
  const key = requireGeminiKey();
  const model = getGeminiPlanModel();
  const parts: Array<Record<string, unknown>> = [{ text: input.userText }];
  if (input.imageUrl) {
    parts.unshift(await loadGeminiImagePart(input.imageUrl));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: 'user', parts }],
          generationConfig: {
            temperature: input.temperature,
            responseMimeType: 'application/json',
          },
        }),
      },
    );
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || input.failMessage);
    }
    const raw = (payload.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || '')
      .join('')
      .trim();
    if (!raw) {
      fail(502, input.failMessage);
    }
    let parsed: unknown = {};
    try {
      parsed = parseModelJson(raw);
    } catch {
      fail(502, 'L’IA a renvoyé un plan illisible. Réessayez avec un brief plus précis.');
    }
    return parseRoomPlanVisionDraft(parsed, { widthM: input.widthM, heightM: input.heightM });
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || input.failMessage);
  } finally {
    clearTimeout(timer);
  }
}

export async function analyzeRoomPlanPhoto(input: {
  imageUrl: string;
  roomType?: string;
  widthM: number;
  heightM: number;
  brief?: string;
}): Promise<RoomPlanVisionDraft> {
  const roomType = input.roomType && ROOM_TYPES.has(input.roomType) ? input.roomType : 'CUSTOM';
  const brief = (input.brief || '').trim().slice(0, 1500);
  const userText = `Salle déclarée par l’utilisateur (indice seulement, la PHOTO gagne) : type=${roomType}, largeur=${input.widthM} m, longueur=${input.heightM} m.
Utilise CES mètres pour canvas.widthM / heightM. Ne change l’échelle que si une cote lisible sur l’image la contredit clairement.
${brief ? `Note utilisateur : """${brief}"""` : 'Pas de note utilisateur.'}
Analyse l’image, déduis chaque élément visible, puis produis le JSON du plan à importer.`;

  return requestRoomPlanJson({
    system: systemPrompt(),
    userText,
    imageUrl: input.imageUrl,
    temperature: 0.2,
    widthM: input.widthM,
    heightM: input.heightM,
    failMessage: 'Impossible d’analyser la photo de la salle.',
  });
}

export async function composeRoomPlanFromBrief(input: {
  brief: string;
  roomType?: string;
  widthM: number;
  heightM: number;
}): Promise<RoomPlanVisionDraft> {
  const brief = input.brief.trim();
  if (brief.length < 8) {
    fail(400, 'Décrivez la salle en quelques mots (type d’événement, nombre de tables, ambiance).');
  }
  const roomType = input.roomType && ROOM_TYPES.has(input.roomType) ? input.roomType : 'BANQUET';
  const userText = `Brief : """${brief.slice(0, 1500)}"""
Salle : type=${roomType}, largeur=${input.widthM} m, longueur=${input.heightM} m.
Utilise CES mètres pour canvas.widthM / heightM.
Conçois le plan et produis le JSON à importer.`;

  return requestRoomPlanJson({
    system: composeSystemPrompt(),
    userText,
    temperature: 0.4,
    widthM: input.widthM,
    heightM: input.heightM,
    failMessage: 'Impossible de composer le plan de salle.',
  });
}

export async function composeRoomPlanAi(input: {
  brief?: string;
  imageUrl?: string;
  roomType?: string;
  widthM: number;
  heightM: number;
}): Promise<RoomPlanVisionDraft> {
  const brief = (input.brief || '').trim();
  if (input.imageUrl) {
    return analyzeRoomPlanPhoto({
      imageUrl: input.imageUrl,
      roomType: input.roomType,
      widthM: input.widthM,
      heightM: input.heightM,
      brief,
    });
  }
  return composeRoomPlanFromBrief({
    brief,
    roomType: input.roomType,
    widthM: input.widthM,
    heightM: input.heightM,
  });
}

import { parseGeminiJson, requestGeminiJson, getGeminiApiKey } from './geminiJsonClient.ts';
import {
  ROOM_PLAN_BRIEF_REFORMULATION_SYSTEM,
  applyRoomPlanEnglishSceneBrief,
  buildRoomPlanBriefReformulationUserText,
  parseRoomPlanEnglishSceneBriefFromJson,
  processRoomPlanBrief,
} from './roomPlanPromptFidelity.ts';

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
  'gravier', 'gravierFonce', 'pelouse', 'chevron', 'marbreCalacatta',
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
  'instrument',
  'bar',
  'corridor',
  'perimeter',
  'orderCounter',
  'pickupCounter',
  'pizzaOven',
  'kitchenLine',
  'displayCase',
  'stylingStation',
  'washBasin',
  'condimentStation',
  'loungeSofa',
  'car',
  'parasol',
]);

/** Vocabulaire courant renvoyé par les modèles vision → kind EventMaster. */
const KIND_ALIASES: Record<string, RoomPlanVisionItemKind> = {
  // Tables et mobilier restaurant
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
  bureau: 'table',
  twotop: 'table',
  fourtop: 'table',
  sixtop: 'table',
  eighttop: 'table',
  communaltable: 'table',
  communal: 'table',
  umbrellatable: 'table',
  umbrella: 'table',
  parasol: 'table',
  mesas: 'table',
  mesassala: 'table',
  mesa: 'table',
  bed: 'table',
  lit: 'table',

  // Rangées, banquettes, cabines & canapés
  row: 'row',
  rows: 'row',
  chairrow: 'row',
  seating: 'row',
  seatingrow: 'row',
  bench: 'row',
  benches: 'row',
  banquette: 'row',
  banquettes: 'row',
  booth: 'row',
  booths: 'row',
  box: 'row',
  alcove: 'row',
  pew: 'row',
  pews: 'row',
  bleacher: 'row',
  bleachers: 'row',
  theaterseats: 'row',
  rangee: 'row',
  rangees: 'row',
  gradin: 'row',
  gradins: 'row',
  amphitheater: 'row',
  amphitheatre: 'row',
  waiting: 'row',
  attente: 'row',

  // Chaises et tabourets
  chairs: 'chair',
  chaises: 'chair',
  chaise: 'chair',
  chair: 'chair',
  fauteuil: 'chair',
  armchair: 'chair',
  loungechair: 'chair',
  stool: 'chair',
  stools: 'chair',
  barstool: 'chair',
  barstools: 'chair',
  tabouret: 'chair',
  tabourets: 'chair',

  // Canapés et salons
  sofa: 'loungeSofa',
  couch: 'loungeSofa',
  canape: 'loungeSofa',
  canapé: 'loungeSofa',
  loungesofa: 'loungeSofa',
  salonsofa: 'loungeSofa',

  // Bars, comptoirs, buffets et stations
  bar: 'bar',
  barra: 'bar',
  comptoir: 'bar',
  counter: 'bar',
  servicecounter: 'bar',
  sushibar: 'bar',
  winebar: 'bar',
  circularbar: 'bar',
  cocktailbar: 'bar',
  buffet: 'buffet',
  catering: 'buffet',
  station: 'buffet',
  credenza: 'buffet',
  dispensary: 'buffet',

  // Comptoirs spécialisés restaurant & vente
  ordercounter: 'orderCounter',
  order: 'orderCounter',
  comptoircommande: 'orderCounter',
  sellingarea: 'orderCounter',
  pickupcounter: 'pickupCounter',
  pickup: 'pickupCounter',
  comptoirretrait: 'pickupCounter',
  retrait: 'pickupCounter',

  // Équipements de cuisine & restauration
  pizzaoven: 'pizzaOven',
  fourpizza: 'pizzaOven',
  fourabois: 'pizzaOven',
  woodfiredoven: 'pizzaOven',
  oven: 'pizzaOven',
  four: 'pizzaOven',
  kitchenline: 'kitchenLine',
  cookingarea: 'kitchenLine',
  hotcooking: 'kitchenLine',
  chipsmaking: 'kitchenLine',
  hamburgermaking: 'kitchenLine',
  pastaprep: 'kitchenLine',
  fryer: 'kitchenLine',
  grill: 'kitchenLine',

  // Vitrines, beauté et stations
  showcase: 'displayCase',
  vitrine: 'displayCase',
  pastrydisplay: 'displayCase',
  pastrycase: 'displayCase',
  displaycase: 'displayCase',
  productdisplay: 'displayCase',
  stylingstation: 'stylingStation',
  coiffeuse: 'stylingStation',
  stationcoiffure: 'stylingStation',
  washbasin: 'washBasin',
  shampoobowl: 'washBasin',
  baclavage: 'washBasin',
  shampoostation: 'washBasin',
  washstation: 'washBasin',
  shampoo: 'washBasin',
  stylist: 'stylingStation',
  condiments: 'condimentStation',
  condimentstation: 'condimentStation',
  waterstation: 'condimentStation',

  // Véhicules & Extérieur
  car: 'car',
  voiture: 'car',
  vehicule: 'car',

  // Accueil, caisse, podiums et estrades
  podium: 'podium',
  lectern: 'podium',
  speaker: 'podium',
  hostess: 'podium',
  hostessstand: 'podium',
  reception: 'podium',
  receptiondesk: 'podium',
  frontdesk: 'podium',
  cashier: 'orderCounter',
  caisse: 'orderCounter',
  pos: 'orderCounter',
  stage: 'stage',
  scene: 'stage',
  escenario: 'stage',
  platform: 'stage',

  // Zones, cuisines, terrasses et espaces spécialisés
  zone: 'zone',
  dancefloor: 'zone',
  dance: 'zone',
  piste: 'zone',
  pistededanse: 'zone',
  vip: 'zone',
  lounge: 'zone',
  livingroom: 'zone',
  patio: 'zone',
  terrace: 'zone',
  terraza: 'zone',
  terrasse: 'zone',
  outdoor: 'zone',
  kitchen: 'zone',
  cuisine: 'zone',
  cocina: 'zone',
  workzone: 'zone',
  zonadetrabajo: 'zone',
  prep: 'zone',
  dishwash: 'zone',
  storage: 'zone',
  almacen: 'zone',
  stockage: 'zone',
  restroom: 'zone',
  restrooms: 'zone',
  toilet: 'zone',
  toilets: 'zone',
  wc: 'zone',
  aseo: 'zone',
  aseos: 'zone',
  bathroom: 'zone',
  salledebain: 'zone',
  cloakroom: 'zone',
  vestiaire: 'zone',
  bedroom: 'zone',
  chambre: 'zone',
  laundry: 'zone',
  buanderie: 'zone',
  massage: 'zone',
  facial: 'zone',
  waxing: 'zone',

  // Instruments
  piano: 'instrument',
  keyboard: 'instrument',
  drums: 'instrument',
  batterie: 'instrument',
  guitar: 'instrument',
  instrument: 'instrument',

  // Circulations, allées et périmètres
  aisle: 'aisle',
  allee: 'aisle',
  runner: 'aisle',
  carpetrunner: 'aisle',
  corridor: 'corridor',
  couloir: 'corridor',
  hallway: 'corridor',
  perimeter: 'perimeter',
  perimetre: 'perimeter',

  // Portes & accès
  door: 'door',
  porte: 'door',
  entrance: 'entrance',
  entree: 'entrance',
  lobby: 'entrance',

  // Sols & décors
  carpet: 'carpet',
  tapis: 'carpet',
  moquette: 'carpet',
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
  retail: 'partition',
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
  tente: 'gazebo',
  chapiteau: 'gazebo',
  djbooth: 'djBooth',
  dj: 'djBooth',
  djtable: 'djBooth',
  mixer: 'djBooth',
  regie: 'djBooth',
  screen: 'screen',
  ecran: 'screen',
  tv: 'screen',
  television: 'screen',
  curvedscreen: 'screen',
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

const SEAT_ROW_SPAN_MIN = 16;
const SEAT_ROW_DEPTH_MAX = 10;
const SEAT_CHAIR_SPAN_MAX = 12;

/** Rangée longue et étroite → row ; petit footprint → chaise isolée. */
export function refineSeatKindFromFootprint(
  kind: RoomPlanVisionItemKind,
  w?: number,
  h?: number,
): RoomPlanVisionItemKind {
  if (kind !== 'chair' && kind !== 'row') return kind;
  if (w == null || h == null) return kind;
  const span = Math.max(w, h);
  const depth = Math.min(w, h);
  if (kind === 'chair' && span >= SEAT_ROW_SPAN_MIN && depth <= SEAT_ROW_DEPTH_MAX) {
    return 'row';
  }
  if (kind === 'row' && span < SEAT_CHAIR_SPAN_MAX && depth < SEAT_CHAIR_SPAN_MAX) {
    return 'chair';
  }
  return kind;
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
  if (span <= 5.5) return 2;
  if (span <= 8.5) return 4;
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
  | 'screen'
  | 'instrument'
  | 'bar'
  | 'corridor'
  | 'perimeter'
  | 'orderCounter'
  | 'pickupCounter'
  | 'pizzaOven'
  | 'kitchenLine'
  | 'displayCase'
  | 'stylingStation'
  | 'washBasin'
  | 'condimentStation'
  | 'loungeSofa'
  | 'car'
  | 'parasol';

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
  podiumStyle?: string;
  instrumentStyle?: string;
  barStyle?: string;
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

export function parseModelJson(raw: string): unknown {
  return parseGeminiJson(raw);
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

function unwrapVisionRoot(raw: unknown): Record<string, unknown> {
  let source = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? { ...(raw as Record<string, unknown>) }
    : {};
  for (const key of ['plan', 'layout', 'data', 'draft', 'result', 'roomPlan', 'floorPlan']) {
    const nested = source[key];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) continue;
    const nestedObj = nested as Record<string, unknown>;
    if (
      nestedObj.items != null
      || nestedObj.furniture != null
      || nestedObj.elements != null
      || nestedObj.outline != null
      || nestedObj.canvas != null
    ) {
      source = { ...source, ...nestedObj };
    }
  }
  return source;
}

function collectVisionItemRows(source: Record<string, unknown>): unknown[] {
  const rows: unknown[] = [];
  const push = (value: unknown) => {
    if (Array.isArray(value)) {
      rows.push(...value);
      return;
    }
    if (value && typeof value === 'object') {
      for (const nested of Object.values(value as Record<string, unknown>)) {
        if (Array.isArray(nested)) rows.push(...nested);
      }
    }
  };
  push(source.items);
  if (rows.length === 0) {
    push(source.furniture);
    push(source.elements);
    push(source.objects);
    push(source.fixtures);
  }
  return rows;
}

function readItemGeometry(row: Record<string, unknown>): { x: unknown; y: unknown; w: unknown; h: unknown } {
  const pos = row.position && typeof row.position === 'object' && !Array.isArray(row.position)
    ? row.position as Record<string, unknown>
    : null;
  const boxCandidate = row.bbox || row.box || row.rect;
  const box = boxCandidate && typeof boxCandidate === 'object' && !Array.isArray(boxCandidate)
    ? boxCandidate as Record<string, unknown>
    : null;
  const from = box || pos || row;
  return {
    x: from.x ?? row.x,
    y: from.y ?? row.y,
    w: from.w ?? from.width ?? row.w ?? row.width,
    h: from.h ?? from.height ?? row.h ?? row.height,
  };
}

function takeFiniteNumbers(values: unknown[]): number[] {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

function shouldScaleUnitInterval(values: number[]): boolean {
  if (values.length < 4) return false;
  return Math.max(...values) <= 1.5;
}

function clampPctMaybeUnit(value: unknown, fallback: number, scale01: boolean): number {
  const n = asNumber(value, fallback);
  return clampPct(scale01 && n <= 1.5 ? n * 100 : n, fallback);
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
  const source = unwrapVisionRoot(raw);
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

  const itemsRaw = collectVisionItemRows(source);
  const geometryByIndex = itemsRaw.map((entry) => (
    entry && typeof entry === 'object' ? readItemGeometry(entry as Record<string, unknown>) : { x: undefined, y: undefined, w: undefined, h: undefined }
  ));
  const scale01 = shouldScaleUnitInterval(takeFiniteNumbers([
    ...geometryByIndex.flatMap((geo) => [geo.x, geo.y, geo.w, geo.h]),
    outlineRaw.x,
    outlineRaw.y,
    outlineRaw.w,
    outlineRaw.h,
  ]));
  const items: RoomPlanVisionItem[] = [];
  for (const [index, entry] of itemsRaw.entries()) {
    if (items.length >= ROOM_PLAN_VISION_ITEM_MAX) {
      warnings.push(`Plus de ${ROOM_PLAN_VISION_ITEM_MAX} objets visibles — le reste a été ignoré.`);
      break;
    }
    if (!entry || typeof entry !== 'object') continue;
    const row = entry as Record<string, unknown>;
    const kindRaw = normalizeRoomPlanVisionKind(row.kind ?? row.type ?? row.category ?? row.object);
    if (!kindRaw) continue;
    const geo = geometryByIndex[index] ?? readItemGeometry(row);
    const w = geo.w != null ? clampPctMaybeUnit(geo.w, 10, scale01) : undefined;
    const h = geo.h != null ? clampPctMaybeUnit(geo.h, 8, scale01) : undefined;
    const kind = refineSeatKindFromFootprint(kindRaw, w, h);
    const item: RoomPlanVisionItem = {
      kind,
      x: clampPctMaybeUnit(geo.x, 50, scale01),
      y: clampPctMaybeUnit(geo.y, 50, scale01),
    };
    if (w != null) item.w = w;
    if (h != null) item.h = h;
    if (row.rotation != null) {
      const rawRot = clamp(asNumber(row.rotation, 0), -180, 180);
      item.rotation = (kind === 'door' || kind === 'entrance')
        ? ((Math.round(rawRot / 90) * 90) % 360 + 360) % 360
        : Math.round(rawRot);
    } else if (kind === 'door' || kind === 'entrance') {
      item.rotation = 0;
    }
    const shape = resolveTableShape(row.shape)
      ?? (kind === 'table' && typeof row.kind === 'string' ? resolveTableShape(row.kind) : undefined)
      ?? (kind === 'table' && typeof row.type === 'string' ? resolveTableShape(row.type) : undefined);
    if (shape) item.shape = shape;
    else if (kind === 'table' && item.w != null && item.h != null) {
      const ratio = item.w / Math.max(item.h, 0.1);
      if (ratio > 1.45 || ratio < 0.7) item.shape = 'rectangular';
      else if (Math.abs(ratio - 1) < 0.25 && (item.w <= 8 || item.h <= 8)) item.shape = 'square';
    }
    if (row.seats != null) {
      item.seats = Math.round(clamp(asNumber(row.seats, kind === 'row' ? 10 : 8), 2, kind === 'row' ? 40 : 16));
    } else if (kind === 'table') {
      item.seats = inferTableSeats(item.w, item.h, item.shape);
    } else if (kind === 'row') {
      item.seats = inferRowSeats(item.w);
    }
    const label = asString(row.label, 40) ?? asString(row.name, 40);
    if (label) item.label = label;
    const zoneKind = resolveZoneKind(
      row.zoneKind,
      typeof row.kind === 'string' ? row.kind : typeof row.type === 'string' ? row.type : kind,
    );
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
    else item.anchor = 'box';
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
      start: { x: clampPctMaybeUnit(start.x, 8, scale01), y: clampPctMaybeUnit(start.y, 8, scale01) },
      end: { x: clampPctMaybeUnit(end.x, 92, scale01), y: clampPctMaybeUnit(end.y, 8, scale01) },
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
      x: clampPctMaybeUnit(outlineRaw.x, 5, scale01),
      y: clampPctMaybeUnit(outlineRaw.y, 5, scale01),
      w: clampPctMaybeUnit(outlineRaw.w, 90, scale01),
      h: clampPctMaybeUnit(outlineRaw.h, 90, scale01),
    },
    appearance: parseAppearance(source.appearance, view),
    items,
    walls,
    confidence: Math.round(clamp(asNumber(source.confidence, 0.4), 0, 1) * 100) / 100,
    warnings,
  };
}

function systemPrompt(): string {
  return `You are EventMaster’s venue floor-plan analyst (Central Africa / RDC).
Analyze the photo, infer every visible piece of furniture, then return ONLY valid JSON.

Mission:
- ENUMERATE each visible element (table, seating row, isolated chair, dance floor, stage, aisle, buffet, DJ booth, screen, column, florals, chandelier, door…).
- One JSON item per floor object. 12 visible tables = 12 "table" items. 5 rows = 5 "row" items.
- Infer the closest kind from visual evidence (silhouette, tablecloth, chairs around, carpet, raised platform).
- An empty plan is acceptable only if the photo is clearly not a venue (bare texture, selfie, document).
- Forbidden: inventing gold, petals, lanterns, crystal chandeliers, a red aisle, doors or a phantom amphitheater when they are not visible.
- If a detail is blurry: still estimate the main object (table / row / zone) and add a warning. Do not invent seat counts.

Coordinate frame:
- The room rectangle = 0–100% (origin top-left, y downward), like a 2D top plan.
- For EACH item: x,y = TOP-LEFT corner of the floor footprint; w and h = width and height in % (anchor="box").
- Vertical photo / scan / PDF: view="top", appearance.imageRole="plan".
- Perspective photo: view="perspective", appearance.imageRole="photo", lower confidence. Still project furniture onto the floor (near = high y, far = low y).
- Photo of bare parquet / tile with no furniture: appearance.imageRole="texture".

Required JSON fields:
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
    "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"corridor"|"perimeter"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower"|"arch"|"partition"|"decal"|"pedestal"|"stringLight"|"fountain"|"gazebo"|"djBooth"|"screen"|"instrument"|"bar"|"orderCounter"|"pickupCounter"|"pizzaOven"|"kitchenLine"|"displayCase"|"stylingStation"|"washBasin"|"condimentStation"|"loungeSofa"|"car"|"parasol",
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
    "pedestalStyle": "squareWhite"|"columnGold",
    "podiumStyle": "speaker"|"lectern"|"couple"|"circular"|"runway"|"bandRiser"|"honor"|"steps",
    "instrumentStyle": "piano"|"keyboard"|"drums"|"guitar"|"bass"|"micStand"|"sax"|"violin"|"amp"|"speaker",
    "barStyle": "cocktail"|"wine"|"champagne"|"beer"|"coffee"|"whiskey"
  }],
  "walls": [{ "start": {"x","y"}, "end": {"x","y"}, "doors": [0-1], "windows": [0-1] }],
  "confidence": 0-1,
  "warnings": ["..."]
}

Appearance rules:
- floorType / floorColor / wallTexture / wallColor / curtainColor: only when clearly visible.
- Colors as hex (#rrggbb) from the observed tint — not an EventMaster theme color.
- tableSurface = visible cloth / top (linen if fabric cloth, wood if bare wood, marble if marble).
- roofStyle = tentSwag for draped marquee/tent, gabled for pitched roof, coffered for coffers, flat for flat ceiling. A tent is NOT a gazebo item: set canvas.widthM/heightM to the real tent size.
- Chandeliers: one chandelier item per visible ceiling fixture. Do not invent crystal or gold.
- Table w/h = real floor footprint in % (small cocktail ≈ 5–6, round 8 seats ≈ 10, long ≈ 12–16).

Item rules (inference allowed):
- ZERO OVERLAP / ZERO STACKING: Never place multiple chairs or tables at the same or overlapping coordinates. Each chair must have its own distinct physical floor location. Maintain realistic real-world clearances: minimum 0.7m center-to-center between chairs, minimum 1.4m edge-to-edge between tables for pulled-back chairs, minimum 1.2m along perimeter walls.
- ZERO EMBEDDING IN WALLS OR OTHER ITEMS: No furniture (table, chair, row, booth, counter, bar, fixture) may EVER be incorporated, embedded or intersect a wall, partition or another item. Maintain at least 0.90m clear circulation from all walls and partitions.
- STRICTLY ORTHOGONAL DOORS: Doors and entrances (kind="door"|"entrance") must ALWAYS be straight and strictly orthogonal (rotation strictly 0°, 90°, 180° or 270°). Oblique or arbitrary angled doors are strictly forbidden. The swing and access zone in front of and behind doors must remain 100% empty of any furniture.
- Align tables and rows on a grid: shared X in columns, shared Y in rows. Avoid 1–2% jitter “for neatness”.
- table = each isolated table. seats = visible chairs/covers around it, else estimate from diameter (cocktail/2-top: 2, 4-top square/round: 4, round 8 seats ≈ 8, communal/long: 8–14). shape="square"|"round"|"rectangular"|"oval"|"cocktail". hasCenterpiece=true if a central vase/candle is visible.
- row = each aligned chair row, banquette, booth or continuous sofa. One visible booth/banquette = one "row" item (label="Banquette" or "Booth").
- chair = isolated armchair or counter stool only (not chairs around a table). Bar stools along a bar counter = individual "chair" items along the counter edge.
- Chairs around a table = that table’s seats — never separate chair or row items.
- corridor = visible hallway / circulation. perimeter = edge band only if visible.
- zone = dance floor, VIP lounge, outdoor terrace, or distinct functional area. Back-of-house areas (Kitchen / Cuisine / Cocina, Toilets / Restrooms / Aseos, Storage / Almacén, Wash area) should be represented as "zone" items with zoneKind="custom" and explicit label.
- bar = any service counter, bar counter, barista order counter, pickup counter, or sushi bar (label="Comptoir Bar", "Comptoir Commande", "Sushi Bar").
- podium = hostess stand, reception desk, cashier/checkout counter, or speaker pulpit (label="Accueil", "Caisse", "Hostess", "Réception").
- buffet = buffet tables, condiment stations, water stations, pastry showcases, credenzas, or pizza ovens.
- stairs = visible indoor/outdoor stairs, spiral staircases, or container stairs.
- aisle = floor runner / aisle. aisleStyle only if the carpet truly matches. hasPetals / hasSideLanterns only if visible.
- stage / podium / djBooth / screen / buffet / bar / instrument / column / stairs / balcony / chandelier / flower / arch / partition / decal / pedestal / stringLight / fountain / gazebo: place them as soon as visible. Instruments (piano, drums, guitar) ON or near the stage.
- door / entrance: only if clearly an access opening (otherwise walls.doors).
- walls: only VISIBLE walls / openings. Empty array if unsure — do not invent doors.
- Architectural Blueprints & CAD plans: Ignore dimension callouts, dimension lines (e.g. 50'-0", 36'-0", arrows) and focus strictly on physical walls, furniture footprints, counters, and booths.
- Hand-drawn sketches & 3D isometric cutaways: Project observed items into top-down floor coordinates (0-100%).
- Maximum ${ROOM_PLAN_VISION_ITEM_MAX} items, most certain first. Prefer too many real objects over an empty items[].

If the photo is not a venue: view="unclear", items=[], explicit warnings.`;
}

function composeSystemPrompt(): string {
  return `You are EventMaster’s reception architect (Central Africa / RDC).
From the ENGLISH SCENE BRIEF, DESIGN a lived-in venue floor plan — not a software grid — and return ONLY valid JSON.

Placement forbidden:
- Stacking or overlapping chairs, tables or fixtures in the same space. NEVER output identical or overlapping (x, y) coordinates for multiple objects. Each chair and piece of furniture must occupy its own distinct physical footprint.
- Embedding or incorporating any item (table, chair, row, booth, counter, fixture) into a wall, partition or another item.
- Generating crooked, oblique or tilted doors: doors and entrances must ALWAYS be strictly orthogonal (0°, 90°, 180°, 270°) and properly oriented along wall segments.
- Crowding furniture without realistic human circulation: maintain at least 0.7m center-to-center between chairs, at least 1.4m to 1.8m edge-to-edge between tables for pulled chairs and service aisles, and at least 1.2m to 1.8m circulation corridors along perimeter walls.
- Lining tables, chandeliers or flowers in a single straight file, military checkerboard, or 1–2% “neat” jitter.
- Blocking a door, aisle or stage.
- Inventing an amphitheater or tent if the brief does not ask for one.

Composition logic (in this order):
1) Walls + doors. At least one main entrance (kind=door + entrance) on a short side, clear, often facing the honor table or stage. A service exit (buffet / kitchen) on another wall for banquets. Fill walls[] with doors at correct positions (0–1 along the segment).
2) Ceremonial axis. Aisle from the main door toward the focal point (honor table, altar, stage). Slightly curved or off-center is fine — not a default centerline.
3) Focal point. Stage and/or podium at the far end, facing guests; stageShape adapted (rect banquet, semiCircle ceremony). podiumStyle from the brief (speaker / lectern, couple wedding, runway, bandRiser concert, honor). Podium sits IN FRONT of the stage — never randomly in a corner. Concert: instruments (piano, drums, mics) ON the podium. Cocktail / gala: a bar (barStyle cocktail|wine|champagne|beer|coffee|whiskey) on one side, not in the aisle middle.
4) Tables. Banquet / wedding: ROUND tables (shape=round, seats 8–10) in staggered / honeycomb clusters — not school rows. Oval or rectangular honor table at the far end, wider, facing the door. Cocktail: highTop / cocktail in islands of 3–4, not a file. Boardroom: one long table. hasCenterpiece=true on every banquet round.
5) Dance / DJ / screen. Dance zone as a composed plateau (often near the stage, not leftover square). DJ and screen anchored to the stage, not mid-tables.
6) Florals. Arrangements at thresholds (entrance, arch), aisle corners, around the honor table and 2–4 planters (flower) — never an identical row along a wall.
7) Chandeliers. One chandelier per activity node: above the dance floor, above the honor table, then above table clusters (not a ceiling file). Style from mood (crystal / classic gala, lantern garden, modern loft).
8) Colors and materials. Coherent palette from the brief (ivory + light oak wedding; linen + walnut gala; grey carpet conference). floorColor, wallColor, tableColor, curtainColor, aisle/flower colors as real #rrggbb — not EventMaster green.

Counting mission:
- N tables requested = N "table" items. N rows = N "row" items.
- Respect room type and meters for canvas.widthM / heightM.
- Gold, petals, red aisle, crystal chandelier: only if the brief or event type (wedding, gala) justifies them.
- view="top", appearance.imageRole="plan".
- Tent: roofStyle="tentSwag", canvas = real size. No gazebo item for the tent itself.
- w/h = real floor footprint (round 8 seats ≈ 9–11, cocktail ≈ 5–6, long ≈ 12–16).

JSON schema:
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
    "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"corridor"|"perimeter"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower"|"arch"|"partition"|"decal"|"pedestal"|"stringLight"|"fountain"|"gazebo"|"djBooth"|"screen"|"instrument"|"bar"|"orderCounter"|"pickupCounter"|"pizzaOven"|"kitchenLine"|"displayCase"|"stylingStation"|"washBasin"|"condimentStation"|"loungeSofa"|"car"|"parasol",
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
    "podiumStyle": "speaker"|"lectern"|"couple"|"circular"|"runway"|"bandRiser"|"honor"|"steps",
    "instrumentStyle": "piano"|"keyboard"|"drums"|"guitar"|"bass"|"micStand"|"sax"|"violin"|"amp"|"speaker",
    "barStyle": "cocktail"|"wine"|"champagne"|"beer"|"coffee"|"whiskey"
  }],
  "walls": [{ "start": {"x","y"}, "end": {"x","y"}, "doors": [0-1], "windows": [0-1] }],
  "confidence": 0-1,
  "warnings": ["..."]
}

No overlaps. Continuous circulation door → aisle → tables → stage. Maximum ${ROOM_PLAN_VISION_ITEM_MAX} items.`;
}

async function reformulateRoomPlanBriefToEnglish(input: {
  brief: string;
  roomType?: string;
  widthM: number;
  heightM: number;
}): Promise<{ originalBrief: string; englishSceneBrief: string }> {
  const processed = processRoomPlanBrief(input.brief, {
    roomType: input.roomType,
    widthM: input.widthM,
    heightM: input.heightM,
  });
  if (!getGeminiApiKey() || processed.originalBrief.length < 8) {
    return {
      originalBrief: processed.originalBrief,
      englishSceneBrief: processed.englishSceneBrief,
    };
  }
  try {
    const parsed = await requestGeminiJson({
      system: ROOM_PLAN_BRIEF_REFORMULATION_SYSTEM,
      userText: buildRoomPlanBriefReformulationUserText(processed.originalBrief, {
        roomType: input.roomType,
        widthM: input.widthM,
        heightM: input.heightM,
      }),
      temperature: 0.25,
      timeoutMs: 45_000,
      failMessage: 'Room-plan brief reformulation failed.',
    });
    const english = parseRoomPlanEnglishSceneBriefFromJson(parsed);
    if (english.length >= 24) {
      const next = applyRoomPlanEnglishSceneBrief(processed, english);
      return {
        originalBrief: next.originalBrief,
        englishSceneBrief: next.englishSceneBrief,
      };
    }
  } catch (error) {
    console.warn(
      '[roomPlanAi] English brief reformulation failed, using local scaffold:',
      (error as Error)?.message,
    );
  }
  return {
    originalBrief: processed.originalBrief,
    englishSceneBrief: processed.englishSceneBrief,
  };
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
  const parsed = await requestGeminiJson({
    system: input.system,
    userText: input.userText,
    imageUrls: input.imageUrl ? [input.imageUrl] : undefined,
    temperature: input.temperature,
    failMessage: input.failMessage,
  });
  return parseRoomPlanVisionDraft(parsed, { widthM: input.widthM, heightM: input.heightM });
}

export async function analyzeRoomPlanPhoto(input: {
  imageUrl: string;
  roomType?: string;
  widthM: number;
  heightM: number;
  brief?: string;
}): Promise<RoomPlanVisionDraft> {
  const roomType = input.roomType && ROOM_TYPES.has(input.roomType) ? input.roomType : 'CUSTOM';
  const rawBrief = (input.brief || '').trim().slice(0, 1500);
  let englishNote = '';
  if (rawBrief.length >= 8) {
    const reformed = await reformulateRoomPlanBriefToEnglish({
      brief: rawBrief,
      roomType,
      widthM: input.widthM,
      heightM: input.heightM,
    });
    englishNote = reformed.englishSceneBrief;
  }
  const userText = `User-declared room (hint only — the PHOTO wins): type=${roomType}, width=${input.widthM} m, length=${input.heightM} m.
Use THESE meters for canvas.widthM / heightM. Change scale only if a readable dimension on the image clearly contradicts them.
${
  englishNote
    ? `ORIGINAL USER NOTE:
"""
${rawBrief}
"""

ENGLISH SCENE NOTE (décor / layout intent only — never invent furniture missing from the photo):
"""
${englishNote.slice(0, 1400)}
"""`
    : 'No user note.'
}
Analyze the image, infer every visible element, then produce the import JSON.`;

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
  const reformed = await reformulateRoomPlanBriefToEnglish({
    brief,
    roomType,
    widthM: input.widthM,
    heightM: input.heightM,
  });
  const userText = `ORIGINAL USER BRIEF (facts to preserve — any language):
"""
${reformed.originalBrief.slice(0, 1500)}
"""

ENGLISH SCENE BRIEF (Nano Banana narrative — use this as the creative layout brief):
"""
${reformed.englishSceneBrief.slice(0, 1600)}
"""

Room: type=${roomType}, width=${input.widthM} m, length=${input.heightM} m.
Use THESE meters for canvas.widthM / heightM.
Compose as a reception architect: doors and exits, podium/stage with sightlines, staggered round tables (not a straight file), florals at thresholds and honor, chandeliers above activity nodes, color palette from the brief.
Produce the import JSON.`;

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

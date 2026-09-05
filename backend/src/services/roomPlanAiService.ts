type HttpError = Error & { status?: number };

export const ROOM_PLAN_AI_GROUP_ID = 'ai-import';
export const ROOM_PLAN_VISION_ITEM_MAX = 80;
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
]);
const TABLE_SURFACES = new Set(['wood', 'linen', 'walnut', 'marble', 'darkWood', 'whiteLacquer', 'glass']);
const ZONE_MATERIALS = new Set(['wood', 'carpet', 'vinyl', 'led', 'marble', 'concrete', 'parquet', 'epoxy']);
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
]);

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
  | 'pedestal';

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

function requireOpenAiKey(): string {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    fail(503, 'La lecture IA n’est pas configurée sur ce serveur (OPENAI_API_KEY manquante).');
  }
  return key;
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
  if (source.roofStyle === 'tentSwag' || source.roofStyle === 'flat') {
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
    if (typeof row.kind !== 'string' || !ITEM_KINDS.has(row.kind)) continue;
    const kind = row.kind as RoomPlanVisionItemKind;
    const item: RoomPlanVisionItem = {
      kind,
      x: clampPct(row.x, 50),
      y: clampPct(row.y, 50),
    };
    if (row.w != null) item.w = clampPct(row.w, 10);
    if (row.h != null) item.h = clampPct(row.h, 8);
    if (row.rotation != null) item.rotation = Math.round(clamp(asNumber(row.rotation, 0), -180, 180));
    if (row.seats != null) {
      item.seats = Math.round(clamp(asNumber(row.seats, kind === 'row' ? 10 : 8), 2, kind === 'row' ? 40 : 16));
    }
    if (typeof row.shape === 'string' && TABLE_SHAPES.has(row.shape)) item.shape = row.shape;
    const label = asString(row.label, 40);
    if (label) item.label = label;
    if (typeof row.zoneKind === 'string' && ZONE_KINDS.has(row.zoneKind)) item.zoneKind = row.zoneKind;
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
Tu ANALYSES UNIQUEMENT la photo fournie, puis tu produis UNIQUEMENT un JSON valide (response_format json_object).

Vérité visuelle (non négociable) :
- DÉTECTE uniquement ce qui est RÉELLEMENT VISIBLE. Ne déduis pas, n’invente pas, n’idéalise pas.
- Interdit : inventer des tables, rangées, sièges, une scène, des murs, des portes, un amphithéâtre ou un fer à cheval « parce que ça ressemble ».
- Interdit : inventer or, pétales, lanternes, lustre cristal ou allée rouge royal s’ils ne sont pas visibles.
- Si un détail est flou, coupé ou indiscernable : omets-le et ajoute un warning.
- N’invente jamais de numéros de sièges.

Repère :
- Le rectangle de la salle = 0–100 % (origine haut-gauche, y vers le bas), comme un plan 2D vu du dessus.
- Pour CHAQUE item : x,y = coin HAUT-GAUCHE de l’empreinte au sol, w et h = largeur et hauteur en % (anchor="box").
- Photo verticale / scan / PDF : view="top", appearance.imageRole="plan".
- Photo en perspective : view="perspective", appearance.imageRole="photo", confidence plus basse.
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
    "roofStyle": "flat"|"tentSwag",
    "curtainColor": "#rrggbb"
  },
  "items": [{
    "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower"|"arch"|"partition"|"decal"|"pedestal",
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

Règles items :
- table = table isolée. seats = couverts visibles ou lisibles, sinon omets seats. color + surface = nappe / plateau vus. shape="arc" pour tables en C / S / courbe. hasCenterpiece=true si vase ou bouquet central.
- row = rangée de chaises alignées (pas une table ronde). chairStyle + seatMaterial si visibles. louis = Louis XVI, ovalBack = dossier ovale rose, chiavari = Chiavari or.
- chair = fauteuil isolé seulement, pas les chaises collées à une table.
- arch = arche florale (fer à cheval / semi-cercle fleuri). partition = cloison basse courbe végétalisée.
- pedestal = colonne / piédestal carré surmonté d’un bouquet. decal = grand motif peint ou projeté au sol (roses, papillons).
- aisle : aisleStyle seulement si le tapis correspond vraiment (rouge royal, bois, LED…). Sinon color hex seule. hasPetals / hasSideLanterns seulement s’ils sont visibles.
- stage : stageShape="semiCircle" si plateau en demi-lune / D. roofStyle="tentSwag" si plafond tente drapé. curtainColor si rideaux / tentures murales visibles.
- zone = piste, VIP, buffet au sol, moquette large. color + material obligatoires si la surface se voit.
- door / entrance : seulement si clairement une ouverture d’accès (sinon walls.doors).
- walls : uniquement les murs / ouvertures VISIBLES. Tableau vide si tu n’es pas sûr — n’invente pas de portes.
- Maximum ${ROOM_PLAN_VISION_ITEM_MAX} items, du plus certain au moins certain.

Si la photo n’est pas un plan de salle, view="unclear", items=[], warnings explicites.`;
}

export async function analyzeRoomPlanPhoto(input: {
  imageUrl: string;
  roomType?: string;
  widthM: number;
  heightM: number;
  brief?: string;
}): Promise<RoomPlanVisionDraft> {
  const key = requireOpenAiKey();
  const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const roomType = input.roomType && ROOM_TYPES.has(input.roomType) ? input.roomType : 'CUSTOM';
  const brief = (input.brief || '').trim().slice(0, 400);
  const userText = `Salle déclarée par l’utilisateur (indice seulement, la PHOTO gagne) : type=${roomType}, largeur=${input.widthM} m, longueur=${input.heightM} m.
Utilise CES mètres pour canvas.widthM / heightM. Ne change l’échelle que si un cotes lisible sur l’image la contredit clairement.
${brief ? `Note utilisateur : """${brief}"""` : 'Pas de note utilisateur.'}
Produis le JSON du plan visible.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: visionModel,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt() },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              { type: 'image_url', image_url: { url: input.imageUrl, detail: 'high' } },
            ],
          },
        ],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || 'Échec de la lecture IA du plan.');
    }
    const raw = payload.choices?.[0]?.message?.content || '{}';
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      fail(502, 'L’IA a renvoyé un plan illisible. Réessayez avec une photo vue du dessus.');
    }
    return parseRoomPlanVisionDraft(parsed, { widthM: input.widthM, heightM: input.heightM });
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible d’analyser la photo de la salle.');
  } finally {
    clearTimeout(timer);
  }
}

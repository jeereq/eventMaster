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
const TABLE_SHAPES = new Set(['round', 'rectangular', 'square', 'oval', 'cocktail', 'highTop']);
const ZONE_KINDS = new Set(['dance', 'vip', 'buffet', 'carpet', 'custom']);
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
  | 'flower';

export interface RoomPlanVisionItem {
  kind: RoomPlanVisionItemKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  rotation?: number;
  seats?: number;
  shape?: string;
  label?: string;
  zoneKind?: string;
}

export interface RoomPlanVisionWall {
  start: { x: number; y: number };
  end: { x: number; y: number };
  doors: number[];
  windows: number[];
}

export interface RoomPlanVisionDraft {
  view: RoomPlanVisionView;
  canvas: { widthM: number; heightM: number };
  outline: { shape: string; x: number; y: number; w: number; h: number };
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
- Interdit : inventer des tables, rangées, sièges, une scène, un amphithéâtre ou un fer à cheval « parce que ça ressemble ».
- Si un détail est flou, coupé ou indiscernable : omets-le et ajoute un warning.
- N’invente jamais de numéros de sièges.

Repère :
- Le rectangle de la salle = 0–100 % (origine haut-gauche, y vers le bas), comme un plan 2D vu du dessus.
- Photo verticale / scan / PDF : view="top".
- Photo en perspective : view="perspective", confidence plus basse, approxime le rectangle au sol.

Champs JSON obligatoires :
{
  "view": "top" | "perspective" | "unclear",
  "canvas": { "widthM": number, "heightM": number },
  "outline": { "shape": "rectangle"|"square"|"circle"|"ellipse"|"lShape"|"uShape"|"hexagon"|"octagon"|"trapezoid"|"stadium", "x":0-100, "y":0-100, "w":0-100, "h":0-100 },
  "items": [{ "kind": "table"|"row"|"chair"|"zone"|"stage"|"podium"|"aisle"|"door"|"entrance"|"carpet"|"buffet"|"column"|"stairs"|"balcony"|"chandelier"|"flower", "x":0-100, "y":0-100, "w"?:0-100, "h"?:0-100, "rotation"?:-180-180, "seats"?:number, "shape"?: "round"|"rectangular"|"square"|"oval", "label"?: string, "zoneKind"?: "dance"|"vip"|"buffet"|"carpet"|"custom" }],
  "walls": [{ "start": {"x","y"}, "end": {"x","y"}, "doors": [0-1], "windows": [0-1] }],
  "confidence": 0-1,
  "warnings": ["..."]
}

Règles items :
- table = table isolée (x,y = centre). seats = couverts visibles ou lisibles, sinon omets seats.
- row = rangée de chaises alignées (pas une table ronde).
- chair = fauteuil isolé seulement, pas les chaises collées à une table.
- zone = piste, VIP, buffet au sol, moquette large.
- door / entrance : seulement si clairement une ouverture d’accès (sinon mets-la dans walls.doors).
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

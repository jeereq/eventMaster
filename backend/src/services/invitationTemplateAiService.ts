import { ensureMandatoryRsvpFieldsOnContent } from '../utils/mandatoryRsvpFields';
import { uploadImageBuffer } from './cloudinaryService';
import { getTemplateUploadFolder } from '../config/cloudinaryConfig';

type HttpError = Error & { status?: number };

function fail(status: number, message: string): never {
  const error: HttpError = new Error(message);
  error.status = status;
  throw error;
}

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 4;
const rateBuckets = new Map<string, { count: number; startedAt: number }>();

function rateLimit(userId: string) {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);
  if (!bucket || now - bucket.startedAt > RATE_WINDOW_MS) {
    rateBuckets.set(userId, { count: 1, startedAt: now });
    return;
  }
  if (bucket.count >= RATE_MAX) {
    fail(429, 'Trop de générations d’invitation. Réessayez dans une minute.');
  }
  bucket.count += 1;
}

function requireOpenAiKey(): string {
  const key = String(process.env.OPENAI_API_KEY || '').trim();
  if (!key) {
    fail(503, 'La génération IA n’est pas configurée sur ce serveur (OPENAI_API_KEY manquante).');
  }
  return key;
}

const STRUCTURE_SYSTEM = `Tu es un designer d'invitations EventMaster (RDC / Afrique centrale).
À partir d'images de référence et d'un brief, tu produis UNIQUEMENT un JSON valide (response_format json_object) pour un éditeur de modèles.

Schéma exact :
{
  "global": {
    "bgType": "color" | "pattern",
    "bgColor": "#hex",
    "bgPattern": "none" | "paper" | "watercolor" | "linen" | "marble" | "parchment",
    "frameType": "none" | "double-border" | "gold-border" | "floral-wreath" | "minimal-leaves",
    "fontTheme": "classic" | "modern" | "script" | "elegant",
    "layoutMode": "flow",
    "canvasSizePreset": "standard",
    "palette": { "primary": "#hex", "secondary": "#hex", "accent": "#hex", "background": "#hex", "isDark": false }
  },
  "elements": [
    {
      "id": "string",
      "type": "text" | "button" | "divider" | "rsvp-block" | "image",
      "text": "string",
      "color": "#hex",
      "fontSize": "12px" | "14px" | "16px" | "20px" | "24px" | "28px" | "32px",
      "align": "left" | "center" | "right",
      "width": "full" | "half" | "third",
      "fontFamily": "Cormorant Garamond" | "Great Vibes" | "Montserrat" | "Playfair Display" | "Lora",
      "bold": boolean,
      "italic": boolean,
      "dividerStyle": "solid" | "ornament-flower" | "ornament-diamond",
      "buttonStyle": "filled" | "outline" | "pill",
      "buttonLink": "#rsvp-section",
      "rsvpPlacement": "inline" | "outside",
      "imageUrl": "https://..."
    }
  ],
  "backgroundPrompt": "prompt anglais court pour générer un fond d'invitation print (sans texte lisible)"
}

Règles :
- 6 à 12 éléments max, disposition empilée (flow), centrée, ton mariage / célébration élégant.
- Utilise les variables {{title}}, {{date}}, {{location}}, {{firstName}} dans les textes quand pertinent.
- Inclus exactement un élément type "rsvp-block" avec rsvpPlacement "outside" et text "Confirmer votre présence".
- Les couleurs doivent s'inspirer des images fournies.
- backgroundPrompt : fond décoratif SANS noms ni dates (l'éditeur ajoute le texte). Style paper / floral / luxe selon les refs.
- Ne mets pas de markdown. JSON uniquement.`;

function asHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return fallback;
}

function sanitizeElements(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return [];
  const allowedTypes = new Set(['text', 'button', 'divider', 'rsvp-block', 'image', 'curve', 'triangle']);
  return raw
    .filter((el): el is Record<string, unknown> => Boolean(el) && typeof el === 'object' && !Array.isArray(el))
    .slice(0, 16)
    .map((el, index) => {
      const type = typeof el.type === 'string' && allowedTypes.has(el.type) ? el.type : 'text';
      const id = typeof el.id === 'string' && el.id.trim() ? el.id.trim() : `ai-${Date.now()}-${index}`;
      return {
        ...el,
        id,
        type,
        text: typeof el.text === 'string' ? el.text.slice(0, 500) : type === 'divider' ? '' : 'Texte',
        color: asHex(el.color, '#1e293b'),
        fontSize: typeof el.fontSize === 'string' ? el.fontSize : '16px',
        align: el.align === 'left' || el.align === 'right' ? el.align : 'center',
        width: el.width === 'half' || el.width === 'third' ? el.width : 'full',
        positionMode: 'flow',
      };
    });
}

function sanitizeGlobal(raw: unknown, bgImageUrl: string): Record<string, unknown> {
  const g = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const paletteRaw =
    g.palette && typeof g.palette === 'object' && !Array.isArray(g.palette)
      ? (g.palette as Record<string, unknown>)
      : {};
  const palette = {
    primary: asHex(paletteRaw.primary, '#1e293b'),
    secondary: asHex(paletteRaw.secondary, '#475569'),
    accent: asHex(paletteRaw.accent, '#c5a059'),
    background: asHex(paletteRaw.background, '#faf7f2'),
    isDark: paletteRaw.isDark === true,
  };
  return {
    bgType: bgImageUrl ? 'image' : g.bgType === 'pattern' ? 'pattern' : 'color',
    bgColor: asHex(g.bgColor, palette.background),
    bgImageUrl: bgImageUrl || '',
    bgPattern: typeof g.bgPattern === 'string' ? g.bgPattern : 'paper',
    frameType: typeof g.frameType === 'string' ? g.frameType : 'double-border',
    fontTheme: typeof g.fontTheme === 'string' ? g.fontTheme : 'classic',
    layoutMode: 'flow',
    canvasSizePreset: typeof g.canvasSizePreset === 'string' ? g.canvasSizePreset : 'standard',
    floralColor: asHex(g.floralColor, palette.accent),
    floralType: typeof g.floralType === 'string' ? g.floralType : 'roses',
    floralDensity: typeof g.floralDensity === 'number' ? g.floralDensity : 40,
    palette,
    generatedByAi: true,
  };
}

async function visionStructure(
  key: string,
  prompt: string,
  imageUrls: string[],
): Promise<{ global: unknown; elements: unknown; backgroundPrompt: string }> {
  const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Brief utilisateur (français) :\n${prompt.slice(0, 1500)}\n\nProduis le JSON du modèle d'invitation.`,
    },
    ...imageUrls.slice(0, 4).map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'low' as const },
    })),
  ];

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
        temperature: 0.45,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: STRUCTURE_SYSTEM },
          { role: 'user', content: userContent },
        ],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || 'Échec de l’analyse IA des images.');
    }
    const raw = payload.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const backgroundPrompt =
      typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()
        ? parsed.backgroundPrompt.trim().slice(0, 800)
        : `Elegant luxury invitation background, soft paper texture, floral accents, no text, no letters, inspired by: ${prompt.slice(0, 200)}`;
    return {
      global: parsed.global,
      elements: parsed.elements,
      backgroundPrompt,
    };
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible d’analyser les images avec l’IA.');
  } finally {
    clearTimeout(timer);
  }
}

async function generateBackgroundImage(
  key: string,
  backgroundPrompt: string,
  tenantId: string | null | undefined,
): Promise<string> {
  const imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: imageModel,
        prompt: `${backgroundPrompt}. Vertical invitation card background, print-ready, no readable text, no logos, no watermarks.`,
        n: 1,
        size: '1024x1792',
        response_format: 'b64_json',
        quality: imageModel.includes('dall-e') ? 'standard' : undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    if (!response.ok) {
      // Fallback square size if portrait unsupported
      if (String(payload.error?.message || '').toLowerCase().includes('size')) {
        return generateBackgroundImageSquare(key, backgroundPrompt, tenantId);
      }
      fail(502, payload.error?.message || 'Échec de la génération du fond.');
    }
    const b64 = payload.data?.[0]?.b64_json;
    if (b64) {
      const buffer = Buffer.from(b64, 'base64');
      const uploaded = await uploadImageBuffer(buffer, getTemplateUploadFolder(tenantId), 'ai-bg');
      return uploaded.url;
    }
    const url = payload.data?.[0]?.url;
    if (url) return url;
    fail(502, 'Aucune image de fond renvoyée par l’IA.');
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible de générer le fond.');
  } finally {
    clearTimeout(timer);
  }
}

async function generateBackgroundImageSquare(
  key: string,
  backgroundPrompt: string,
  tenantId: string | null | undefined,
): Promise<string> {
  const imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: imageModel,
      prompt: `${backgroundPrompt}. Invitation card background, soft paper, no text.`,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    data?: Array<{ b64_json?: string; url?: string }>;
  };
  if (!response.ok) {
    fail(502, payload.error?.message || 'Échec de la génération du fond.');
  }
  const b64 = payload.data?.[0]?.b64_json;
  if (b64) {
    const buffer = Buffer.from(b64, 'base64');
    const uploaded = await uploadImageBuffer(buffer, getTemplateUploadFolder(tenantId), 'ai-bg');
    return uploaded.url;
  }
  const url = payload.data?.[0]?.url;
  if (url) return url;
  fail(502, 'Aucune image de fond renvoyée par l’IA.');
}

export type InvitationAiComposeResult = {
  content: {
    global: Record<string, unknown>;
    elements: Record<string, unknown>[];
  };
  stage: { structureReady: boolean; backgroundReady: boolean };
};

export async function composeInvitationTemplateAi(input: {
  userId: string;
  tenantId?: string | null;
  prompt: string;
  imageUrls: string[];
  generateBackground?: boolean;
}): Promise<InvitationAiComposeResult> {
  rateLimit(input.userId);
  const prompt = String(input.prompt || '').trim();
  if (prompt.length < 8) {
    fail(400, 'Décrivez le style d’invitation souhaité (au moins quelques mots).');
  }
  const imageUrls = (input.imageUrls || [])
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim())
    .slice(0, 4);
  if (!imageUrls.length) {
    fail(400, 'Ajoutez au moins une image de référence (URL).');
  }

  const key = requireOpenAiKey();
  const structured = await visionStructure(key, prompt, imageUrls);
  let bgImageUrl = '';
  const wantBg = input.generateBackground !== false;
  if (wantBg) {
    try {
      bgImageUrl = await generateBackgroundImage(key, structured.backgroundPrompt, input.tenantId);
    } catch (err) {
      console.warn('[invitationTemplateAi] background failed, continuing with color:', (err as Error)?.message);
    }
  }

  const global = sanitizeGlobal(structured.global, bgImageUrl);
  const elements = sanitizeElements(structured.elements);
  if (!elements.some((el) => el.type === 'rsvp-block')) {
    elements.push({
      id: `ai-rsvp-${Date.now()}`,
      type: 'rsvp-block',
      text: 'Confirmer votre présence',
      color: (global.palette as { accent: string }).accent,
      fontSize: '16px',
      align: 'center',
      width: 'full',
      rsvpPlacement: 'outside',
      positionMode: 'flow',
    });
  }

  const content = ensureMandatoryRsvpFieldsOnContent({
    global,
    elements,
  }) as { global: Record<string, unknown>; elements: Record<string, unknown>[] };

  return {
    content: {
      global: (content as { global: Record<string, unknown> }).global || global,
      elements: Array.isArray((content as { elements: unknown }).elements)
        ? ((content as { elements: Record<string, unknown>[] }).elements)
        : elements,
    },
    stage: {
      structureReady: true,
      backgroundReady: Boolean(bgImageUrl),
    },
  };
}

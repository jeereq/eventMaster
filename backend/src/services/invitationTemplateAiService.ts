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
Tu ANALYSES les images de référence fournies, puis tu produis UNIQUEMENT un JSON valide (response_format json_object).

Mission image :
1) Observe couleurs, textures, motifs, composition, ambiance des images.
2) Lis le brief utilisateur et applique-le (style, ton, éléments à garder / à changer).
3) Prépare un prompt anglais DÉTAILLÉ pour créer une NOUVELLE image d'invitation (fond print) fidèle aux refs + au brief.

Schéma exact :
{
  "visualAnalysis": {
    "colors": ["#hex", "..."],
    "style": "description courte du style vu dans les images",
    "motifs": "motifs / textures / décor observés",
    "composition": "layout / cadrage observé",
    "briefInterpretation": "comment le brief utilisateur doit transformer ou respecter les refs"
  },
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
  "backgroundPrompt": "English image-generation prompt, 2-4 sentences, must recreate a NEW invitation artwork inspired by the reference photos AND the user brief"
}

Règles :
- Palette et style des éléments = couleurs réelles extraites des images.
- 6 à 12 éléments max, disposition empilée (flow), centrée.
- Variables {{title}}, {{date}}, {{location}}, {{firstName}} dans les textes quand pertinent.
- Exactement un élément "rsvp-block" avec rsvpPlacement "outside" et text "Confirmer votre présence".
- backgroundPrompt OBLIGATOIRE : nouvelle image verticale d'invitation, print-ready, NO readable text, no names, no dates, no logos, no watermarks. Inclure couleurs/motifs des refs + instructions du brief.
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

type VisualAnalysis = {
  colors: string[];
  style: string;
  motifs: string;
  composition: string;
  briefInterpretation: string;
};

type VisionResult = {
  global: unknown;
  elements: unknown;
  backgroundPrompt: string;
  visualAnalysis: VisualAnalysis | null;
};

function parseVisualAnalysis(raw: unknown): VisualAnalysis | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const colors = Array.isArray(v.colors)
    ? v.colors.filter((c): c is string => typeof c === 'string').slice(0, 8)
    : [];
  return {
    colors,
    style: typeof v.style === 'string' ? v.style.slice(0, 300) : '',
    motifs: typeof v.motifs === 'string' ? v.motifs.slice(0, 300) : '',
    composition: typeof v.composition === 'string' ? v.composition.slice(0, 300) : '',
    briefInterpretation:
      typeof v.briefInterpretation === 'string' ? v.briefInterpretation.slice(0, 400) : '',
  };
}

function buildImagePrompt(
  userPrompt: string,
  backgroundPrompt: string,
  analysis: VisualAnalysis | null,
): string {
  const parts = [
    'Create a NEW vertical print-ready invitation card artwork (portrait).',
    'Follow the user brief exactly for mood, style changes, and decorative intent.',
    `User brief: ${userPrompt.slice(0, 600)}`,
    `Design prompt: ${backgroundPrompt.slice(0, 900)}`,
  ];
  if (analysis) {
    if (analysis.style) parts.push(`Reference style: ${analysis.style}`);
    if (analysis.motifs) parts.push(`Reference motifs/textures: ${analysis.motifs}`);
    if (analysis.composition) parts.push(`Reference composition: ${analysis.composition}`);
    if (analysis.colors.length) parts.push(`Keep a palette close to: ${analysis.colors.join(', ')}`);
    if (analysis.briefInterpretation) parts.push(`Brief vs refs: ${analysis.briefInterpretation}`);
  }
  parts.push(
    'Inspired by the reference photo(s), not a copy. Soft paper / luxury print look.',
    'CRITICAL: no readable text, no letters, no names, no dates, no logos, no watermarks.',
  );
  return parts.join(' ').slice(0, 3800);
}

async function visionStructure(
  key: string,
  prompt: string,
  imageUrls: string[],
): Promise<VisionResult> {
  const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `Brief utilisateur (français) — à respecter pour la nouvelle image et le layout :\n${prompt.slice(0, 1500)}\n\n1) Analyse les images.\n2) Interprète le brief par rapport aux images.\n3) Produis le JSON (structure éditeur + backgroundPrompt pour créer une NOUVELLE image).`,
    },
    ...imageUrls.slice(0, 4).map((url) => ({
      type: 'image_url',
      image_url: { url, detail: 'high' as const },
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
        temperature: 0.4,
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
    const visualAnalysis = parseVisualAnalysis(parsed.visualAnalysis);
    const backgroundPrompt =
      typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()
        ? parsed.backgroundPrompt.trim().slice(0, 1200)
        : `Elegant luxury invitation background inspired by the reference photos, following this brief: ${prompt.slice(0, 280)}. Soft paper texture, no text.`;
    return {
      global: parsed.global,
      elements: parsed.elements,
      backgroundPrompt,
      visualAnalysis,
    };
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible d’analyser les images avec l’IA.');
  } finally {
    clearTimeout(timer);
  }
}

async function downloadImageAsPngBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      fail(502, 'Impossible de télécharger l’image de référence pour la génération.');
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength < 100) {
      fail(502, 'Image de référence invalide ou trop petite.');
    }
    if (buffer.byteLength > 4 * 1024 * 1024) {
      // dall-e-2 edits limit ~4MB; keep a smaller payload
      fail(400, 'Image de référence trop lourde pour la génération (max ~4 Mo).');
    }
    return buffer;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadGeneratedB64(
  b64: string,
  tenantId: string | null | undefined,
): Promise<string> {
  const buffer = Buffer.from(b64, 'base64');
  const uploaded = await uploadImageBuffer(buffer, getTemplateUploadFolder(tenantId), 'ai-bg');
  return uploaded.url;
}

/** Image-to-image : part de la 1re référence + prompt (brief + analyse). */
async function generateBackgroundFromReference(
  key: string,
  referenceUrl: string,
  imagePrompt: string,
  tenantId: string | null | undefined,
): Promise<string> {
  const imageBytes = await downloadImageAsPngBuffer(referenceUrl);
  const form = new FormData();
  form.append('model', process.env.OPENAI_IMAGE_EDIT_MODEL || 'dall-e-2');
  form.append('prompt', imagePrompt.slice(0, 1000));
  form.append('n', '1');
  form.append('size', '1024x1024');
  form.append('response_format', 'b64_json');
  form.append('image', new Blob([new Uint8Array(imageBytes)], { type: 'image/png' }), 'reference.png');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    if (!response.ok) {
      fail(502, payload.error?.message || 'Échec de la création d’image à partir des références.');
    }
    const b64 = payload.data?.[0]?.b64_json;
    if (b64) return uploadGeneratedB64(b64, tenantId);
    const url = payload.data?.[0]?.url;
    if (url) return url;
    fail(502, 'Aucune image générée à partir de la référence.');
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible de créer l’image depuis la référence.');
  } finally {
    clearTimeout(timer);
  }
}

async function generateBackgroundFromPrompt(
  key: string,
  imagePrompt: string,
  tenantId: string | null | undefined,
  size: '1024x1792' | '1024x1024' = '1024x1792',
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
        prompt: imagePrompt.slice(0, 3800),
        n: 1,
        size,
        response_format: 'b64_json',
        quality: imageModel.includes('dall-e') ? 'standard' : undefined,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    if (!response.ok) {
      if (size !== '1024x1024' && String(payload.error?.message || '').toLowerCase().includes('size')) {
        return generateBackgroundFromPrompt(key, imagePrompt, tenantId, '1024x1024');
      }
      fail(502, payload.error?.message || 'Échec de la génération de la nouvelle image.');
    }
    const b64 = payload.data?.[0]?.b64_json;
    if (b64) return uploadGeneratedB64(b64, tenantId);
    const url = payload.data?.[0]?.url;
    if (url) return url;
    fail(502, 'Aucune nouvelle image renvoyée par l’IA.');
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible de générer la nouvelle image.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Crée une nouvelle image : d’abord image-à-image depuis la 1re ref,
 * sinon génération text-to-image enrichie par l’analyse Vision + brief.
 */
async function createNewInvitationImage(
  key: string,
  imageUrls: string[],
  imagePrompt: string,
  tenantId: string | null | undefined,
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  const primary = imageUrls[0];
  try {
    const url = await generateBackgroundFromReference(key, primary, imagePrompt, tenantId);
    return { url, mode: 'edit' };
  } catch (editErr) {
    console.warn(
      '[invitationTemplateAi] image edit failed, falling back to generations:',
      (editErr as Error)?.message,
    );
    const url = await generateBackgroundFromPrompt(key, imagePrompt, tenantId);
    return { url, mode: 'generate' };
  }
}

export type InvitationAiComposeResult = {
  content: {
    global: Record<string, unknown>;
    elements: Record<string, unknown>[];
  };
  stage: {
    structureReady: boolean;
    backgroundReady: boolean;
    imageMode?: 'edit' | 'generate' | null;
  };
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
  const imagePrompt = buildImagePrompt(
    prompt,
    structured.backgroundPrompt,
    structured.visualAnalysis,
  );

  let bgImageUrl = '';
  let imageMode: 'edit' | 'generate' | null = null;
  const wantBg = input.generateBackground !== false;
  if (wantBg) {
    try {
      const created = await createNewInvitationImage(key, imageUrls, imagePrompt, input.tenantId);
      bgImageUrl = created.url;
      imageMode = created.mode;
    } catch (err) {
      // La création d’image est centrale : on remonte l’erreur au client.
      if ((err as HttpError)?.status) throw err;
      fail(502, (err as Error)?.message || 'La création de la nouvelle image a échoué.');
    }
  }

  const global = sanitizeGlobal(structured.global, bgImageUrl);
  if (structured.visualAnalysis) {
    (global as Record<string, unknown>).aiVisualAnalysis = structured.visualAnalysis;
  }
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
      imageMode,
    },
  };
}

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

Principe de fidélité et de vérité visuelle (non négociable) :
- DÉTECTE uniquement ce qui est RÉELLEMENT VISIBLE dans les images. Ne déduis pas, n’invente pas, n’idéalise pas, ne blanchis pas.
- Interdit : inventer des traits, une ethnie, un âge, une coiffure, une tenue, une teinte de peau, ou des personnes absentes.
- Carnation & morphologie : analyse avec exactitude le teint de peau (teinte mélanée, sous-tons dorés/chauds/acajou/ébène, échelle Fitzpatrick IV/V/VI), les formes faciales (arête nasale, arc des lèvres, pommettes, mâchoire) et les textures capillaires (crépus naturels 4A/4B/4C, dégradé fondu / taper fade soigné, tresses, locks, chignons, perruques soignées).
- Si un détail est flou / hors cadre / indiscernable : écris "unclear" — ne comble PAS le vide.

Priorité absolue :
1) Les images de référence = VÉRITÉ VISUELLE pour les personnes (visages, teintes de peau exactes, textures de cheveux, habits, posture).
2) Le BRIEF UTILISATEUR = besoins expressément demandés (ambiance, décor d'invitation, couleurs florales, ce qu’il faut changer dans l'environnement).
3) Ne change habits / cheveux / peau / visages QUE si le brief le demande EXPLICITEMENT. Sinon, REPRODUIS à l’identique.

Mission :
1) Détecte : visages précis, points de repère anatomiques (faceLandmarks), teintes de peau réelles, styles de cheveux, styles d’habits, couleurs, motifs, composition.
2) Parse le brief : besoins exprimés (mustKeep / mustChange) — seulement ce qui est écrit, rien d’implicite inventé.
3) Prépare un prompt anglais DÉTAILLÉ pour créer une NOUVELLE image d'invitation d'un luxe exceptionnel, fidèle aux refs + au brief.

Schéma exact :
{
  "visualAnalysis": {
    "colors": ["#hex", "..."],
    "style": "style décoratif observé (papier, luxe, floral…) — sans inventer",
    "motifs": "motifs / textures / décor observés",
    "composition": "layout / cadrage observé",
    "hasPeople": true | false,
    "peopleCount": 0,
    "peopleFaces": "none | per person: age range if visible, precise face shape, eye shape & color, brows, nose contour, lips fullness & cupid bow, jawline, distinctive marks — OBSERVED only",
    "faceLandmarks": "none | detailed likeness landmarks: bone structure, eye spacing & slant, cheekbones, smile/expression, facial hair lines, scars/moles — sufficient to guarantee 100% identity lock",
    "skinTones": "none | precise observed skin tone(s) per person (e.g. rich warm mahogany Fitzpatrick VI, golden warm caramel, deep ebony) — STRICT FIDELITY, NEVER lighten or shift tone",
    "hairStyles": "none | hair length, texture (4C curls, precise taper fade, braids bun, dreadlocks), hairline OBSERVED per person",
    "clothingStyles": "none | garment cuts, fabrics (wax pagne, tailored tux, royal satin, embroidery), colors, accessories OBSERVED — preserve faithfully",
    "briefNeeds": ["besoin explicite 1 du brief", "..."],
    "briefInterpretation": "comment chaque besoin du brief s’applique aux refs, point par point",
    "briefMustKeep": ["à conserver : refs (visages/peau/cheveux/habits) + éléments du brief"],
    "briefMustChange": ["UNIQUEMENT ce que le brief demande explicitement de modifier"]
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
  "backgroundPrompt": "English prompt. If people: start with IDENTITY LOCK + face inventory from refs, THEN USER BRIEF for décor only. If no people: USER BRIEF then décor."
}

Règles brief :
- S’il y a des personnes : backgroundPrompt DOIT commencer par "IDENTITY LOCK:" (anglais) — les photos de référence sont l'unique source de vérité pour l'identité faciale ; puis "FACE INVENTORY:" (traits anatomiques observés, carnation, coiffure) ; puis "USER BRIEF:" (décor/ambiance d'invitation seulement).
- S’il n’y a PAS de personnes : commence par "USER BRIEF:" puis décor somptueux sans présence humaine.
- Applique chaque besoin du brief pour le décor (ambiance, couleurs, fioritures, sobriété, luxe, floral).
- Si le brief et les refs divergent : brief = décor & ambiance ; refs = visages / peau / cheveux / habits (sauf demande EXPLICITE contraire sur habits/cheveux).

Règles personnes (non négociables) :
- Si hasPeople=true : LOCK d’identité absolu — même personne(s) que sur les photos, ressemblance photographique stricte à 100%.
- Interdit : stock models, « couple générique », embellissement IA, lissage excessif, blanchiment de peau, changement d’âge/ethnie/traits, morphing, autre visage « proche ».
- peopleFaces + faceLandmarks doivent être assez détaillés pour verrouiller la géométrie du visage.
- Si hasPeople=false : aucune personne, aucun visage, aucune silhouette. Décor uniquement.

Règles layout :
- Palette et style des éléments = couleurs réelles extraites des images + brief.
- 6 à 12 éléments max, disposition empilée (flow), centrée.
- Variables {{title}}, {{date}}, {{location}}, {{firstName}} dans les textes quand pertinent.
- Exactement un élément "rsvp-block" avec rsvpPlacement "outside" et text "Confirmer votre présence".
- Image print-ready verticale, SANS texte lisible, noms, dates, logos, watermarks (l’éditeur ajoute le texte).
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
  hasPeople: boolean;
  peopleCount: number;
  peopleFaces: string;
  faceLandmarks: string;
  skinTones: string;
  hairStyles: string;
  clothingStyles: string;
  briefNeeds: string[];
  briefInterpretation: string;
  briefMustKeep: string[];
  briefMustChange: string[];
};

type VisionResult = {
  global: unknown;
  elements: unknown;
  backgroundPrompt: string;
  visualAnalysis: VisualAnalysis | null;
};

function parseStringList(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 160))
    .slice(0, max);
}

function parseVisualAnalysis(raw: unknown): VisualAnalysis | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const colors = Array.isArray(v.colors)
    ? v.colors.filter((c): c is string => typeof c === 'string').slice(0, 8)
    : [];
  const peopleFaces =
    typeof v.peopleFaces === 'string' ? v.peopleFaces.slice(0, 700) : '';
  const faceLandmarks =
    typeof v.faceLandmarks === 'string' ? v.faceLandmarks.slice(0, 700) : '';
  const skinTones =
    typeof v.skinTones === 'string' ? v.skinTones.slice(0, 400) : '';
  const hairStyles =
    typeof v.hairStyles === 'string' ? v.hairStyles.slice(0, 400) : '';
  const clothingStyles =
    typeof v.clothingStyles === 'string' ? v.clothingStyles.slice(0, 500) : '';
  const hasPeople =
    v.hasPeople === true ||
    (typeof peopleFaces === 'string' &&
      peopleFaces.length > 0 &&
      !/^none$/i.test(peopleFaces.trim()));
  const peopleCountRaw = Number(v.peopleCount);
  const peopleCount =
    Number.isFinite(peopleCountRaw) && peopleCountRaw >= 0
      ? Math.min(Math.round(peopleCountRaw), 12)
      : hasPeople
        ? 1
        : 0;
  return {
    colors,
    style: typeof v.style === 'string' ? v.style.slice(0, 300) : '',
    motifs: typeof v.motifs === 'string' ? v.motifs.slice(0, 300) : '',
    composition: typeof v.composition === 'string' ? v.composition.slice(0, 300) : '',
    hasPeople,
    peopleCount: hasPeople ? Math.max(peopleCount, 1) : 0,
    peopleFaces: hasPeople ? peopleFaces : 'none',
    faceLandmarks: hasPeople ? faceLandmarks || 'unclear' : 'none',
    skinTones: hasPeople ? skinTones || 'unclear' : 'none',
    hairStyles: hasPeople ? hairStyles || 'unclear' : 'none',
    clothingStyles: hasPeople ? clothingStyles || 'unclear' : 'none',
    briefNeeds: parseStringList(v.briefNeeds, 12),
    briefInterpretation:
      typeof v.briefInterpretation === 'string' ? v.briefInterpretation.slice(0, 600) : '',
    briefMustKeep: parseStringList(v.briefMustKeep),
    briefMustChange: parseStringList(v.briefMustChange),
  };
}

const FACE_POLICY_NO_PEOPLE =
  'FACE POLICY: No people, no faces, no human silhouettes, no invented couples or stock models. Decorative invitation artwork only.';

const FACE_POLICY_KEEP_PEOPLE =
  'IDENTITY LOCK (HIGHEST PRIORITY): The attached reference photo(s) are the ABSOLUTE GROUND TRUTH for who appears. Copy each person\'s exact facial identity — bone structure, eyes, brows, nose, lips, jaw, natural skin tone (rich melanin / bronze / undertones intact — NEVER lighten, bleach, or change ethnicity), age appearance, expression, hairstyle (braids, fade, locs, afro, curls, smooth bun) and attire. Photoreal likeness required. STRICTLY FORBIDDEN: different face, generic stock model, beautify/airbrush plastic filter, face swap, age alteration, ethnicity shift, skin tone correction, anime/illustration face, or "lookalike" substitute. Only the luxury background, invitation card border, lighting ambiance, and florals may follow the user brief.';

function buildImagePrompt(
  userPrompt: string,
  backgroundPrompt: string,
  analysis: VisualAnalysis | null,
): string {
  const brief = userPrompt.trim().slice(0, 800);
  const hasPeople = Boolean(analysis?.hasPeople);
  const parts: string[] = [
    'Create ONE luxury vertical print-ready invitation card artwork (portrait orientation 1024x1536).',
  ];

  if (hasPeople) {
    parts.push(
      '=== STRICT IDENTITY LOCK (ABSOLUTE PRIORITY OVER DÉCOR) ===',
      'The reference image(s) show REAL PEOPLE whose faces MUST be reproduced with 100% photographic likeness and zero alteration.',
      FACE_POLICY_KEEP_PEOPLE,
    );
    if (analysis) {
      parts.push(`People count: ${analysis.peopleCount}`);
      if (analysis.peopleFaces && analysis.peopleFaces !== 'none') {
        parts.push(`Face inventory (match exactly): ${analysis.peopleFaces}`);
      }
      if (analysis.faceLandmarks && analysis.faceLandmarks !== 'none') {
        parts.push(`Likeness landmarks (match exactly): ${analysis.faceLandmarks}`);
      }
      if (analysis.skinTones && analysis.skinTones !== 'none') {
        parts.push(`Skin tones (exact, NEVER lighten): ${analysis.skinTones}`);
      }
      if (analysis.hairStyles && analysis.hairStyles !== 'none') {
        parts.push(`Hair (exact texture & styling): ${analysis.hairStyles}`);
      }
      if (analysis.clothingStyles && analysis.clothingStyles !== 'none') {
        parts.push(`Clothing (exact styling & fabrics): ${analysis.clothingStyles}`);
      }
    }
    parts.push(
      '=== DÉCOR & AMBIANCE (secondary — build luxury invitation setting around the subjects) ===',
      brief,
    );
  } else {
    parts.push(
      'FIDELITY RULE: No people. Detect only what is visible. Do not invent faces.',
      'USER BRIEF:',
      brief,
      FACE_POLICY_NO_PEOPLE,
    );
  }

  if (analysis?.briefNeeds?.length) {
    parts.push(`Brief needs (expressed): ${analysis.briefNeeds.join('; ')}`);
  }
  if (analysis?.briefInterpretation) {
    parts.push(`Brief interpretation: ${analysis.briefInterpretation}`);
  }
  if (analysis?.briefMustKeep?.length) {
    parts.push(`Must keep: ${analysis.briefMustKeep.join('; ')}`);
  }
  if (analysis?.briefMustChange?.length) {
    parts.push(`Must change (brief only — never faces unless explicit): ${analysis.briefMustChange.join('; ')}`);
  }

  parts.push(`Design execution notes: ${backgroundPrompt.slice(0, 1400)}`);

  if (analysis) {
    if (analysis.style) parts.push(`Reference décor style: ${analysis.style}`);
    if (analysis.motifs) parts.push(`Reference motifs/textures: ${analysis.motifs}`);
    if (analysis.composition) parts.push(`Reference composition: ${analysis.composition}`);
    if (analysis.colors.length) parts.push(`Palette close to: ${analysis.colors.join(', ')}`);
  }

  parts.push(
    'Conflict rule: faces/skin/hair/clothing from references ALWAYS win over décor; brief only wins for background, florals, paper, lighting mood.',
    'No readable text, letters, names, dates, logos, or watermarks (text is added later by the editor).',
  );
  return parts.join('\n').slice(0, 5000);
}

async function visionStructure(
  key: string,
  prompt: string,
  imageUrls: string[],
): Promise<VisionResult> {
  const visionModel =
    process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `BRIEF UTILISATEUR (besoins exprimés — analyse-les sans inventer d’intentions) :
"""
${prompt.slice(0, 1500)}
"""

Tâches (fidélité stricte — PRIORITÉ VISAGES) :
1) S’il y a des personnes : inventaire facial DÉTAILLÉ (peopleFaces + faceLandmarks), teinte de peau, cheveux, habits. Ne déduis rien d’invisible.
2) Liste briefNeeds = besoins EXPLICITEMENT écrits ; briefMustKeep / briefMustChange (décor vs personnes).
3) Renseigne hasPeople, peopleCount, peopleFaces, faceLandmarks, skinTones, hairStyles, clothingStyles.
4) Produis le JSON (structure éditeur + backgroundPrompt).
5) backgroundPrompt : si personnes → commence par "IDENTITY LOCK:" + "FACE INVENTORY:" puis "USER BRIEF:" (décor seulement). Sinon → "USER BRIEF:" puis décor.`,
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
        temperature: 0.2,
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
    const faceClause = visualAnalysis?.hasPeople
      ? FACE_POLICY_KEEP_PEOPLE
      : FACE_POLICY_NO_PEOPLE;
    const backgroundPrompt =
      typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()
        ? parsed.backgroundPrompt.trim().slice(0, 1800)
        : `IDENTITY LOCK: Match people in the references exactly (faces, skin, hair, clothing). USER BRIEF: ${prompt.slice(0, 350)}. ${faceClause} Soft print look, no readable text.`;
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

function isDallEModel(model: string): boolean {
  return /^dall-e/i.test(model.trim());
}

function responsesModel(): string {
  return (
    process.env.OPENAI_RESPONSES_MODEL ||
    process.env.OPENAI_IMAGE_AGENT_MODEL ||
    process.env.OPENAI_MODEL ||
    'gpt-5.6-luna'
  );
}

function imagesApiFallbackModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
}

function extractImagesApiPayload(payload: {
  data?: Array<{ b64_json?: string; url?: string }>;
}): string | null {
  const b64 = payload.data?.[0]?.b64_json;
  if (b64) return `b64:${b64}`;
  const url = payload.data?.[0]?.url;
  if (url) return `url:${url}`;
  return null;
}

async function resolveGeneratedImage(
  token: string,
  tenantId: string | null | undefined,
): Promise<string> {
  if (token.startsWith('b64:')) {
    return uploadGeneratedB64(token.slice(4), tenantId);
  }
  if (token.startsWith('url:')) {
    return token.slice(4);
  }
  fail(502, 'Réponse image IA invalide.');
}

function extractResponsesImageB64(payload: {
  output?: Array<{ type?: string; result?: string | null }>;
}): string | null {
  const outputs = Array.isArray(payload.output) ? payload.output : [];
  for (const item of outputs) {
    if (item?.type === 'image_generation_call' && typeof item.result === 'string' && item.result) {
      return item.result;
    }
  }
  return null;
}

async function referenceToDataUrl(url: string): Promise<string> {
  const buffer = await downloadImageAsPngBuffer(url);
  const lower = url.toLowerCase();
  const mime = lower.includes('.jpg') || lower.includes('.jpeg')
    ? 'image/jpeg'
    : lower.includes('.webp')
      ? 'image/webp'
      : 'image/png';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Génération / édition via GPT-5.6 Luna (Responses API + outil image_generation).
 * Les images de référence sont fournies en input_image ; Luna orchestre gpt-image-*.
 */
async function generateImageWithGpt56Luna(
  key: string,
  imagePrompt: string,
  referenceUrls: string[],
  tenantId: string | null | undefined,
  options?: { hasPeople?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  const model = responsesModel();
  const hasRefs = referenceUrls.length > 0;
  const hasPeople = Boolean(options?.hasPeople);

  // Convertir en data URL pour éviter les échecs de téléchargement côté OpenAI.
  const refDataUrls: string[] = [];
  for (const ref of referenceUrls.slice(0, 4)) {
    try {
      refDataUrls.push(await referenceToDataUrl(ref));
    } catch (err) {
      console.warn('[invitationTemplateAi] skip ref download:', (err as Error)?.message);
    }
  }

  const faceBlock = hasPeople ? FACE_POLICY_KEEP_PEOPLE : FACE_POLICY_NO_PEOPLE;
  // Édition prioritaire si des personnes sont présentes (préserve mieux les visages).
  const imageAction = refDataUrls.length
    ? hasPeople
      ? 'edit'
      : 'auto'
    : 'generate';

  const imageQuality =
    process.env.OPENAI_IMAGE_QUALITY ||
    (hasPeople ? 'high' : 'medium');

  // Refs d’abord quand il y a des personnes : ancre mieux l’identité faciale.
  const identityPreamble = hasPeople
    ? `CRITICAL MANDATE: The following reference image(s) show REAL PEOPLE. When you invoke the image_generation tool:
1. You MUST maintain 100% photographic facial likeness and exact facial identity of each subject.
2. NEVER replace the subject(s) with generic models, different faces, altered ethnicities, smoothed/airbrushed faces, or changed skin tones.
3. Keep their exact eye shape, nose shape, lip shape, bone structure, natural melanin skin tone, expression, and hairstyle.
4. Seamlessly integrate the original subject(s) into the luxury vertical invitation card artwork requested in the brief.\n\n${imagePrompt}`
    : imagePrompt;

  const content: Array<Record<string, unknown>> = hasPeople
    ? [
        ...refDataUrls.map((image_url) => ({
          type: 'input_image',
          image_url,
          detail: 'high',
        })),
        {
          type: 'input_text',
          text: `${identityPreamble}

OUTPUT RULES (faces first):
- Edit/compose from the reference image(s) above — keep the SAME faces, not lookalikes.
- ${faceBlock}
- Brief controls décor/ambiance only; never restyle or replace faces to match décor.
- Do not add readable text, names, dates, logos or watermarks.`,
        },
      ]
    : [
        {
          type: 'input_text',
          text: `${identityPreamble}

OUTPUT RULES:
- ${faceBlock}
- Apply USER BRIEF for décor.
- Do not add readable text, names, dates, logos or watermarks.`,
        },
        ...refDataUrls.map((image_url) => ({
          type: 'input_image',
          image_url,
          detail: 'high',
        })),
      ];

  const body: Record<string, unknown> = {
    model,
    tool_choice: { type: 'image_generation' },
    tools: [
      {
        type: 'image_generation',
        action: imageAction,
        size: '1024x1536',
        quality: imageQuality,
      },
    ],
    input: [{ role: 'user', content }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 180_000);
  try {
    let response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    let payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      output?: Array<{ type?: string; result?: string | null }>;
    };

    // Si la taille portrait n’est pas supportée, réessayer en auto size.
    if (!response.ok && /size/i.test(String(payload.error?.message || ''))) {
      const retryTools = [
        {
          type: 'image_generation',
          action: imageAction,
          size: 'auto',
          quality: imageQuality,
        },
      ];
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, tools: retryTools }),
      });
      payload = (await response.json().catch(() => ({}))) as typeof payload;
    }

    // Si action=edit est refusée, retenter en auto (en gardant la FACE POLICY dans le prompt).
    if (!response.ok && imageAction === 'edit') {
      console.warn(
        '[invitationTemplateAi] edit action rejected, retrying auto:',
        payload.error?.message,
      );
      const retryTools = [
        {
          type: 'image_generation',
          action: 'auto',
          size: 'auto',
          quality: imageQuality,
        },
      ];
      response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...body, tools: retryTools }),
      });
      payload = (await response.json().catch(() => ({}))) as typeof payload;
    }

    if (!response.ok) {
      fail(502, payload.error?.message || `Échec Responses API (${model}).`);
    }

    const b64 = extractResponsesImageB64(payload);
    if (!b64) {
      fail(502, `${model} n’a renvoyé aucune image (outil image_generation).`);
    }
    const url = await uploadGeneratedB64(b64, tenantId);
    return { url, mode: hasPeople || hasRefs ? 'edit' : 'generate' };
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || `Impossible de générer l’image avec ${model}.`);
  } finally {
    clearTimeout(timer);
  }
}

/** Repli Images API (gpt-image-2 / dall-e) si Responses échoue. */
async function generateBackgroundFromPrompt(
  key: string,
  imagePrompt: string,
  tenantId: string | null | undefined,
  size: '1024x1536' | '1024x1024' = '1024x1536',
): Promise<string> {
  const imageModel = imagesApiFallbackModel();
  const dallE = isDallEModel(imageModel);
  const resolvedSize = !dallE && size === '1024x1536' ? '1024x1024' : size;

  const body: Record<string, unknown> = {
    model: imageModel,
    prompt: imagePrompt.slice(0, 3800),
    n: 1,
    size: resolvedSize,
  };
  if (dallE) {
    body.response_format = 'b64_json';
    if (/dall-e-3/i.test(imageModel)) {
      body.quality = 'standard';
    }
  }

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
      body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    if (!response.ok) {
      const errMsg = String(payload.error?.message || '');
      if (resolvedSize !== '1024x1024' && errMsg.toLowerCase().includes('size')) {
        return generateBackgroundFromPrompt(key, imagePrompt, tenantId, '1024x1024');
      }
      if (dallE && /response_format/i.test(errMsg)) {
        const retryBody = { ...body };
        delete retryBody.response_format;
        const retry = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(retryBody),
        });
        const retryPayload = (await retry.json().catch(() => ({}))) as typeof payload;
        if (!retry.ok) {
          fail(502, retryPayload.error?.message || 'Échec de la génération de la nouvelle image.');
        }
        const retryToken = extractImagesApiPayload(retryPayload);
        if (!retryToken) fail(502, 'Aucune nouvelle image renvoyée par l’IA.');
        return resolveGeneratedImage(retryToken, tenantId);
      }
      fail(502, errMsg || 'Échec de la génération de la nouvelle image.');
    }
    const token = extractImagesApiPayload(payload);
    if (!token) fail(502, 'Aucune nouvelle image renvoyée par l’IA.');
    return resolveGeneratedImage(token, tenantId);
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible de générer la nouvelle image.');
  } finally {
    clearTimeout(timer);
  }
}

/** Repli image-to-image classique (dall-e-2 / gpt-image edits). */
async function generateBackgroundFromReference(
  key: string,
  referenceUrl: string,
  imagePrompt: string,
  tenantId: string | null | undefined,
): Promise<string> {
  const editModel = process.env.OPENAI_IMAGE_EDIT_MODEL || 'gpt-image-1';
  const imageBytes = await downloadImageAsPngBuffer(referenceUrl);
  const form = new FormData();
  form.append('model', editModel);
  form.append('prompt', imagePrompt.slice(0, 1000));
  form.append('n', '1');
  form.append('size', '1024x1024');
  if (isDallEModel(editModel)) {
    form.append('response_format', 'b64_json');
  }
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
    const token = extractImagesApiPayload(payload);
    if (!token) fail(502, 'Aucune image générée à partir de la référence.');
    return resolveGeneratedImage(token, tenantId);
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible de créer l’image depuis la référence.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 1) GPT-5.6 Luna (Responses + image_generation)
 * 2) Images API générate
 * 3) Images API edits sur la 1re référence
 */
async function createNewInvitationImage(
  key: string,
  imageUrls: string[],
  imagePrompt: string,
  tenantId: string | null | undefined,
  options?: { hasPeople?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  try {
    return await generateImageWithGpt56Luna(key, imagePrompt, imageUrls, tenantId, options);
  } catch (lunaErr) {
    console.warn(
      '[invitationTemplateAi] gpt-5.6-luna image failed, falling back:',
      (lunaErr as Error)?.message,
    );
  }

  // Si des personnes sont présentes dans les références, le repli DOIT conserver l'image
  // via l'API d'édition d'image plutôt que d'inventer une personne à partir du texte seul.
  if (options?.hasPeople && imageUrls.length > 0) {
    try {
      const url = await generateBackgroundFromReference(key, imageUrls[0], imagePrompt, tenantId);
      return { url, mode: 'edit' };
    } catch (editErr) {
      console.warn(
        '[invitationTemplateAi] image edit fallback failed, falling back to text generation:',
        (editErr as Error)?.message,
      );
    }
  }

  try {
    const url = await generateBackgroundFromPrompt(key, imagePrompt, tenantId);
    return { url, mode: 'generate' };
  } catch (genErr) {
    console.warn(
      '[invitationTemplateAi] images/generations failed, trying edits:',
      (genErr as Error)?.message,
    );
  }

  const primary = imageUrls[0];
  if (!primary) {
    fail(502, 'Impossible de créer la nouvelle image (Luna + Images API).');
  }
  const url = await generateBackgroundFromReference(key, primary, imagePrompt, tenantId);
  return { url, mode: 'edit' };
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
      const created = await createNewInvitationImage(
        key,
        imageUrls,
        imagePrompt,
        input.tenantId,
        { hasPeople: Boolean(structured.visualAnalysis?.hasPeople) },
      );
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

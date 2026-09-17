import { ensureMandatoryRsvpFieldsOnContent } from '../utils/mandatoryRsvpFields';
import { uploadImageBuffer } from './cloudinaryService';
import { getTemplateUploadFolder } from '../config/cloudinaryConfig';
import { getGeminiApiKey, requestGeminiJson } from './geminiJsonClient.ts';
import { isOpenAiStudioModel } from './aiStudioModels.ts';
import {
  formatContextForImage,
  hasUsableComposeContext,
  loadInvitationComposeContext,
  parseInvitationContextSource,
} from './invitationComposeContext.ts';
import {
  BRIEF_REFORMULATION_SYSTEM,
  NANO_BANANA_CRITICAL_CONSTRAINT,
  NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE,
  NANO_BANANA_LIGHT_RIG_COHERENCE,
  NANO_BANANA_OPTICAL_BOKEH,
  NANO_BANANA_STYLE_INSTRUCTION,
  applyEnglishSceneBrief,
  buildBriefReformulationUserText,
  buildGeminiSceneSteps,
  buildGenericThematicBackgroundPrompt,
  buildNanoBananaRawDirectives,
  buildVariantImagePrompt,
  isSafetyFilterTriggered,
  optimizeReferenceImageUrl,
  parseEnglishSceneBriefFromJson,
  processUserPromptForHonestFaces,
  COUPLE_FACE_SWAP_DEFAULT_PROMPT,
  type ProcessedInvitationPrompt,
} from './invitationPromptFidelity.ts';
import {
  invitationArtStyleCompositionNote,
  invitationArtStyleCraftNotes,
  invitationArtStyleFaceLockNote,
  invitationArtStyleImageDirective,
  invitationArtStyleLightNote,
  invitationArtStyleScaffoldLine,
  invitationArtStyleStructureRules,
  parseInvitationArtStyle,
  type InvitationArtStyleId,
} from './invitationArtStyle.ts';

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

function getOpenAiKey(): string {
  return String(process.env.OPENAI_API_KEY || '').trim();
}

function requireAiConfigured(): string {
  const key = getOpenAiKey();
  if (!getGeminiApiKey() && !key) {
    fail(503, 'La génération IA n’est pas configurée (GEMINI_API_KEY ou OPENAI_API_KEY).');
  }
  return key;
}

const STRUCTURE_SYSTEM = `You are EventMaster’s invitation designer for Central Africa / RDC.
Analyze any reference images, then return ONLY valid JSON (json_object).

Visual truth (non-negotiable):
- Detect ONLY what is actually visible. Do not invent, idealize, lighten, or guess missing details.
- Forbidden: inventing ethnicity, age, hairstyle, outfit, skin tone, or people who are not in the photos.
- Skin & morphology: record exact melanin tone (golden / warm / mahogany / ebony, Fitzpatrick IV–VI when visible), facial structure, and hair texture (4A–4C, taper fade, braids, locs, bun, wig) as observed.
- If a detail is blurry, cropped, or unclear: write "unclear" — never fill gaps.

{{ART_STYLE_RULES}}

Invitation cloning (when a card is present or the brief says copy / clone / reproduce):
1) Read exact layout: frame, double gold border, floral arch, baroque or Kuba / art-deco ornaments, margins, paper texture.
2) Extract the exact palette (background, type, ornaments, foils).
3) Mirror that structure in JSON (elements, global.frameType, global.palette, fontTheme) and set isInvitationClone=true with clonedCardFeatures filled.
4) If people photos are also attached, place those exact people inside the cloned card frame in the chosen art style, identity locked.

Priority order:
1) Reference images = visual truth for people (faces, skin, hair, clothes, pose) AND for any card to clone (layout, ornaments, palette).
2) User brief = explicit décor / mood / floral / environment requests only.
3) Change clothes / hair / skin / faces ONLY when the brief asks explicitly. Otherwise keep identical.
4) EventMaster / RDC default without people photos: any generated person MUST be a Black African man and/or woman with natural melanin. Forbidden: invented white couples or generic Caucasian “luxury” faces.

Mission:
1) Detect faces, faceLandmarks, real skin tones, hair, clothing, colors, motifs, composition, and whether an invitation card should be cloned.
2) Parse the brief into mustKeep / mustChange — only what is written.
3) Write backgroundPrompt as a detailed ENGLISH décor narrative for a luxury print invitation (Nano Banana style: Subject + Action + Location + Composition + Style).

Exact schema:
{
  "visualAnalysis": {
    "colors": ["#hex", "..."],
    "style": "observed decorative style (paper, luxury, floral…) — do not invent",
    "motifs": "observed motifs / textures / décor",
    "composition": "observed layout / framing",
    "hasPeople": true | false,
    "peopleCount": 0,
    "peopleFaces": "none | PERSON 1 / PERSON 2 (left-to-right): sex if visible, apparent age, face shape, EYES, SMILE, CHEEKS, brows, nose, jaw, marks — OBSERVED pixels only",
    "faceLandmarks": "none | lock list: bone structure, eye spacing & slant, smile geometry, cheek volume, facial hair, scars/moles — refuse lookalikes; unclear if unsure",
    "skinTones": "none | precise observed skin tone(s) per person — NEVER lighten",
    "hairStyles": "none | length, texture, hairline OBSERVED per person",
    "clothingStyles": "none | cuts, fabrics (wax pagne, tux, satin, embroidery), colors, accessories OBSERVED",
    "isInvitationClone": true | false,
    "clonedCardFeatures": "none | borders, frame, ornaments, typography, textures to clone",
    "briefNeeds": ["explicit need 1", "..."],
    "briefInterpretation": "how each brief need applies to the references, point by point",
    "briefMustKeep": ["keep: refs (faces/skin/hair/clothes/card) + brief facts"],
    "briefMustChange": ["ONLY explicit brief change requests"]
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
  "backgroundPrompt": "English décor-only narrative. Card clone: replicate borders/textures. With people: décor only — never rewrite faces. Without people: full scene then décor."
}

Brief rules:
- Card clone: backgroundPrompt MUST replicate reference borders, foils and paper.
- With people: backgroundPrompt = DÉCOR ONLY (paper, florals, light, frame). Do NOT describe faces. Start with "USER BRIEF (décor):".
- Without people: start with "USER BRIEF:" then sumptuous décor without inventing unwanted humans unless the brief implies hosts.
- Apply every brief need for décor (mood, colors, ornaments, sobriety, luxury, florals).
- If brief and refs conflict: brief wins for décor & mood; refs win for faces / skin / hair / clothes (unless explicit wardrobe/hair change).
- Connected organizer context (if provided) may only fill event type, language, names/date/venue and décor taste — never invent a face from it.
- Beautify / smooth / lighten requests may already be stripped. Do not reintroduce facial idealization. Gemini: "face and features remain completely unchanged".

People rules (non-negotiable):
- hasPeople=true: photo pixels are truth. peopleFaces / faceLandmarks are lock lists, not “pretty face” briefs.
- Forbidden: lookalike, celebrity, stock model, beautify, smooth, lighten, wrong age/ethnicity, invented smile.
- hasPeople=false: no people, no faces, no silhouettes unless the English scene brief explicitly asks for hosts — then RDC Black African default applies.

Layout rules:
- Palette and element style = colors from images (or cloned card) + brief.
- 6–12 elements max, stacked flow, centered.
- Use {{title}}, {{date}}, {{location}}, {{firstName}} in text when relevant.
- Exactly one "rsvp-block" with rsvpPlacement "outside" and text "Confirmer votre présence" (or the appropriate Congolese national language equivalent: e.g. "Kondima kozala wana" in Lingala, "Thibitisha uwepo wako" in Swahili, "Tula kimbangi ya kukwiza" in Kikongo, "Jadika dikalapu diebe" in Tshiluba).
- Language fidelity (RDC): If the brief, title or prompt specifies or is written in one of the Congolese national languages (Lingala, Swahili, Kikongo, Tshiluba), generate all invitation text elements in that exact language (e.g. Lingala: "Libyangi ya Libala", "Boya tosepela elongo", "Mokolo : {{date}}", "Esika : {{location}}"; Swahili: "Mwaliko wa Harusi", "Karibuni sana tusherehekee", "Tarehe : {{date}}", "Mahali : {{location}}"; Kikongo: "Mbila ya Nkinsi ya Makwela", "Kwizeno beto sepela kintwadi", "Kilumbu : {{date}}", "Kisika : {{location}}"; Tshiluba: "Dibikila dia Tshibilu tshia Dibaka", "Luayi tusankidile pamue", "Dituku : {{date}}", "Muaba : {{location}}"). Do not revert to French when a national language is requested.
- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).
- No markdown. JSON only.`;

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
  isInvitationClone?: boolean;
  clonedCardFeatures?: string;
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
    typeof v.peopleFaces === 'string' ? v.peopleFaces.slice(0, 1400) : '';
  const faceLandmarks =
    typeof v.faceLandmarks === 'string' ? v.faceLandmarks.slice(0, 1400) : '';
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

  const isInvitationClone =
    Boolean(v.isInvitationClone) ||
    /clone|copi|reprodu/i.test(String(v.style || '')) ||
    /invitation|carte/i.test(String(v.composition || ''));
  const clonedCardFeatures =
    typeof v.clonedCardFeatures === 'string'
      ? v.clonedCardFeatures.slice(0, 600)
      : '';

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
    isInvitationClone,
    clonedCardFeatures,
    briefNeeds: parseStringList(v.briefNeeds, 12),
    briefInterpretation:
      typeof v.briefInterpretation === 'string' ? v.briefInterpretation.slice(0, 600) : '',
    briefMustKeep: parseStringList(v.briefMustKeep),
    briefMustChange: parseStringList(v.briefMustChange),
  };
}

const FACE_POLICY_DEFAULT_BLACK_AFRICAN =
  'REPRESENTATION DEFAULT (EventMaster / RDC — MANDATORY): Any person depicted MUST be a Black African man and/or woman from Central Africa — rich natural melanin (bronze, caramel, mahogany, deep ebony), authentic facial features, natural hair textures (4A–4C, braids, locs, fade, afro, bun). STRICTLY FORBIDDEN: Caucasian / European / white stock-model faces, pale default skin, invented white wedding couples, East Asian substitute faces, or mixed-white “generic luxury” models. If the brief is a wedding, birthday or gala without a reference photo, show Black African hosts (man and/or woman) — never a white couple.';

const FACE_POLICY_NO_PEOPLE =
  'FACE POLICY: Prefer decorative artwork. If any person still appears, they MUST follow the RDC representation default: Black African men and/or women only — never Caucasian stock models.';

const FACE_POLICY_KEEP_PEOPLE =
  'IDENTITY LOCK — PIXELS WIN: The attached photo(s) are the only identity source. Keep EACH person as the SAME individual (not a sibling, celebrity, or beautified lookalike). Unchanged: bone structure, eyes and gaze, exact smile, cheek volume, skin tone (never lighten), age, hair, clothing, moles/scars. Forbidden: face swap, slim/contour, symmetry, doll eyes, invented grin, airbrush, CGI. If any text description conflicts with the photo, obey the photo.';

const FACE_POLICY_COUPLE_SWAP =
  'COUPLE FACE REPLACEMENT — ORGANIZER REQUESTED: Image 1 is the incoming invitation/scene. Keep composition, pose, bodies, wardrobe, décor, lighting, ornaments and typography. Images 2+ are the couple. Replace ONLY the face(s) on Image 1 with these exact people. Honest pixels: bone structure, eyes, smile, skin tone, moles. Forbidden: beautify, skin lightening, celebrity lookalike, inventing a new couple, keeping the original Image 1 faces.';

function buildImagePrompt(
  userPrompt: string,
  backgroundPrompt: string,
  analysis: VisualAnalysis | null,
  options?: {
    embedText?: boolean;
    organizerContext?: string;
    processed?: ProcessedInvitationPrompt;
    artStyle?: InvitationArtStyleId;
    isAlteration?: boolean;
    isPublic?: boolean;
    coupleFaceSwap?: boolean;
  },
): string {
  const processed = options?.processed;
  const coupleFaceSwap = Boolean(options?.coupleFaceSwap || processed?.coupleFaceSwap);
  const brief = (
    processed?.imageBrief ||
    processed?.englishSceneBrief ||
    userPrompt
  ).trim().slice(0, 1200);
  const hasPeople = coupleFaceSwap || Boolean(analysis?.hasPeople);
  const isClone = Boolean(
    analysis?.isInvitationClone ||
    /copi|clon|reprodu/i.test(brief)
  );
  const isAlteration = Boolean(
    options?.isAlteration ||
    /retouch|ajust|refin|altér|réajust|modifier/i.test(brief) ||
    /retouch|ajust|refin|altér|réajust|modifier/i.test(userPrompt),
  );

  const parts: string[] = [];
  if (hasPeople && processed?.identityHeader) {
    parts.push(processed.identityHeader);
    if (processed.referenceRoles) parts.push(processed.referenceRoles);
  }

  const artStyle = parseInvitationArtStyle(options?.artStyle);
  parts.push(
    'Create ONE vertical print-ready invitation artwork (9:16, 1024x1536). Purpose: luxury printed invitation card for a real event in Central Africa / RDC.',
    invitationArtStyleImageDirective(artStyle),
    invitationArtStyleCompositionNote(artStyle),
    invitationArtStyleLightNote(artStyle),
    invitationArtStyleCraftNotes(),
  );
  if (hasPeople) {
    parts.push(invitationArtStyleFaceLockNote(artStyle));
  }

  if (coupleFaceSwap) {
    parts.push(
      '=== COUPLE FACE REPLACEMENT MANDATE ===',
      'Image 1 is the incoming invitation or scene to keep. Images 2+ are the couple identity photos.',
      'CRITICAL CONTEXT PRESERVATION: Keep Image 1’s composition, pose, bodies, wardrobe, décor, lighting, ornaments and typography.',
      'Replace ONLY the face(s) on Image 1 with the exact people from Images 2+. Do not keep the original Image 1 faces.',
    );
  } else if (isAlteration) {
    parts.push(
      '=== TARGETED ALTERATION & REFINEMENT MANDATE ===',
      'The reference image shows the EXISTING INVITATION CARD to be adjusted.',
      'CRITICAL CONTEXT PRESERVATION: You MUST faithfully preserve the existing card’s overall composition, luxury layout, framing, ornamental arches, paper texture, lighting, and color harmony.',
      'If people or faces appear in the card, their facial identity and expressions must remain completely unchanged.',
      'Apply ONLY the specific targeted adjustment requested in the brief. Do NOT replace or redesign the whole card from scratch.',
    );
  } else if (isClone) {
    parts.push(
      '=== INVITATION CARD CLONING & DUPLICATION MANDATE ===',
      'The reference image contains an existing INVITATION CARD. You MUST faithfully duplicate and replicate its architectural composition, ornamental borders, arches, filigree flourishes, paper textures, background gradients, and color harmonies.',
      analysis?.clonedCardFeatures ? `Cloned card layout details: ${analysis.clonedCardFeatures}` : '',
    );
  }

  if (hasPeople) {
    parts.push(
      coupleFaceSwap ? FACE_POLICY_COUPLE_SWAP : FACE_POLICY_KEEP_PEOPLE,
      coupleFaceSwap
        ? 'People count: match the couple photos (Images 2+). Place them on the bodies already posed in Image 1.'
        : `People count (must match refs): ${analysis?.peopleCount ?? 1}. Same people, same relative placement.`,
    );
    if (analysis) {
      if (analysis.peopleFaces && analysis.peopleFaces !== 'none') {
        parts.push(`FACE INVENTORY (lock, do not beautify): ${analysis.peopleFaces}`);
      }
      if (analysis.faceLandmarks && analysis.faceLandmarks !== 'none') {
        parts.push(`LANDMARKS (lock): ${analysis.faceLandmarks}`);
      }
      if (analysis.skinTones && analysis.skinTones !== 'none') {
        parts.push(`Skin (never lighten): ${analysis.skinTones}`);
      }
      if (analysis.hairStyles && analysis.hairStyles !== 'none') {
        parts.push(`Hair: ${analysis.hairStyles}`);
      }
      if (analysis.clothingStyles && analysis.clothingStyles !== 'none') {
        parts.push(`Clothes: ${analysis.clothingStyles}`);
      }
    }
    parts.push(
      brief.startsWith('USER BRIEF')
        ? brief
        : coupleFaceSwap
          ? `USER BRIEF (replace faces on Image 1 with the couple):\n${brief}`
          : `USER BRIEF (décor / card only — never rewrite faces):\n${brief}`,
    );
  } else {
    parts.push(
      'FIDELITY RULE: No reference faces. If the brief implies hosts, a couple or guests, depict Black African men and/or women only.',
      FACE_POLICY_DEFAULT_BLACK_AFRICAN,
      'USER BRIEF:',
      brief,
      FACE_POLICY_NO_PEOPLE,
    );
  }

  if (options?.organizerContext) {
    parts.push(options.organizerContext);
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

  parts.push(`Décor notes: ${backgroundPrompt.slice(0, hasPeople ? 700 : 1400)}`);

  if (analysis) {
    if (analysis.style) parts.push(`Reference décor style: ${analysis.style}`);
    if (analysis.motifs) parts.push(`Reference motifs/textures: ${analysis.motifs}`);
    if (analysis.composition) parts.push(`Reference composition: ${analysis.composition}`);
    if (analysis.colors.length) parts.push(`Palette close to: ${analysis.colors.join(', ')}`);
  }

  parts.push(
    coupleFaceSwap
      ? 'Conflict rule: faces from Images 2+ ALWAYS win; Image 1 ALWAYS wins for card, pose, bodies, clothes and décor.'
      : 'Conflict rule: faces/skin/hair/clothing from references ALWAYS win over décor; brief only wins for background, florals, paper, lighting mood.',
  );
  if (hasPeople) {
    parts.push(buildGeminiSceneSteps(Boolean(options?.embedText), { coupleFaceSwap }));
  }
  if (options?.embedText && !options?.isPublic) {
    parts.push(
      '=== EMBEDDED INVITATION TYPOGRAPHY (MANDATORY) ===',
      'Incrust sharp, correctly spelled luxury invitation lettering ON the artwork itself: names, date, time, venue and greeting extracted from the USER BRIEF (and any cloned card). Elegant serif or script, gold-foil or ink, integrated into the 9:16 layout — not a floating UI overlay, not a watermark.',
      'Keep faces fully visible; place typography in the lower third or in a refined cartouche that does not cover eyes, smile or cheeks.',
    );
  } else {
    if (options?.isPublic) {
      parts.push(
        '=== STRICT MANDATE FOR REUSABLE PUBLIC TEMPLATE ARTWORK ===',
        'This image is a REUSABLE PUBLIC EVENTMASTER SHOWCASE TEMPLATE BACKGROUND.',
        'STRICTLY FORBIDDEN: NEVER write, render, paint, or burn ANY text, letters, names, dates, numbers, words, calligraphy, script, or logos into the image pixels.',
        'The generated image MUST be 100% clean visual artwork (pure background, arches, florals, ambient lighting, paper texture) so dynamic customizable variables ({{title}}, {{date}}, {{location}}, {{firstName}}) can be overlaid cleanly by any user.',
      );
    }
    parts.push(
      NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE,
    );
  }
  if (hasPeople) {
    parts.push(
      NANO_BANANA_CRITICAL_CONSTRAINT,
      NANO_BANANA_STYLE_INSTRUCTION,
      NANO_BANANA_LIGHT_RIG_COHERENCE,
      NANO_BANANA_OPTICAL_BOKEH,
    );
  }
  return parts.join('\n').slice(0, hasPeople ? 6400 : 5400);
}

function structureSystemPrompt(
  embedText: boolean,
  artStyle?: InvitationArtStyleId,
  isPublic = false,
): string {
  const style = parseInvitationArtStyle(artStyle);
  let basePrompt = STRUCTURE_SYSTEM.replace(
    '{{ART_STYLE_RULES}}',
    invitationArtStyleStructureRules(style),
  ).replace(
    '- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).',
    embedText && !isPublic
      ? '- Vertical print-ready image WITH sharp embedded invitation typography (names, date, venue from the brief), correctly spelled, never covering faces.'
      : '- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).',
  );

  if (isPublic) {
    basePrompt += `\n\n=== MANDATORY RULES FOR PUBLIC / SHOWCASE TEMPLATES (VARIABLES-FIRST) ===
1) CLEAN ARTWORK ONLY: The generated background image must NEVER contain any baked-in text, letters, words, names, or dates.
2) DYNAMIC CUSTOMIZATION VARIABLES:
   Because this template is public and will be chosen and customized by multiple organizers and guests, ALL text elements MUST use EventMaster dynamic template variables instead of hardcoded private names or dates:
   - For event title / celebration / couple: use {{title}} (e.g. "{{title}}", or "Mariage de {{title}}", "Célébration de {{title}}")
   - For date and time: use {{date}} (e.g. "Le {{date}}", or "Samedi {{date}}")
   - For venue / address: use {{location}} (e.g. "À {{location}}", or "{{location}}")
   - For guest greeting: use {{firstName}} (e.g. "Cher(e) {{firstName}}")
   - For confirmation of presence: an element of type 'rsvp-block' with text "Confirmer votre présence" and rsvpPlacement "outside"
   DO NOT put hardcoded private names, personal surnames, or fixed calendar dates into text elements. Always use the variables {{title}}, {{date}}, {{location}}, {{firstName}}.`;
  }

  return basePrompt;
}

function visionUserText(
  prompt: string,
  hasRefs: boolean,
  options?: {
    embedText?: boolean;
    organizerContext?: string;
    processed?: ProcessedInvitationPrompt;
    isAlteration?: boolean;
    existingElements?: Record<string, unknown>[];
    coupleFaceSwap?: boolean;
  },
): string {
  const original = options?.processed?.originalBrief || prompt;
  const englishScene = options?.processed?.englishSceneBrief || options?.processed?.decorBrief || prompt;
  const coupleFaceSwap = Boolean(options?.coupleFaceSwap || options?.processed?.coupleFaceSwap);
  const isAlteration = Boolean(
    options?.isAlteration ||
    /retouch|ajust|refin|altér|réajust|modifier/i.test(prompt),
  );
  const existingTexts = Array.isArray(options?.existingElements)
    ? options.existingElements
        .filter((el) => el && typeof el.text === 'string' && (el.text as string).trim().length > 0)
        .map((el) => `${el.type || 'text'}: "${(el.text as string).trim()}"`)
        .join('; ')
    : '';

  const alterationBlock = isAlteration
    ? `\n=== REFINEMENT & ALTERATION MANDATE ===
The user is adjusting an existing luxury invitation design.
${existingTexts ? `EXISTING TEXTS & DETAILS TO PRESERVE: ${existingTexts}` : ''}
PRESERVATION RULE: Do NOT invent new replacement couple names, dates, or venues. Keep the established event hierarchy and names intact unless explicitly instructed to change them.\n`
    : '';

  const honesty = coupleFaceSwap
    ? `REFERENCE PHOTOS ATTACHED: Image 1 = incoming card (keep décor/pose, discard original faces). Images 2+ = couple identity. Replace faces only. ${
        options?.processed?.beautifyStripped
          ? 'The brief asked to beautify / smooth / lighten faces — IGNORE those requests.'
          : 'Do not idealize or beautify the couple photos.'
      }`
    : hasRefs
    ? `REFERENCE PHOTOS ATTACHED: faces = pixel truth (Gemini high-fidelity). ${
        options?.processed?.beautifyStripped
          ? 'The brief asked to beautify / smooth / lighten faces — IGNORE those requests.'
          : 'Do not idealize or beautify.'
      }`
    : 'NO REFERENCE IMAGES: compose from the English scene brief only (décor + text facts). hasPeople=false unless the brief explicitly asks for hosts.';
  const contextBlock = options?.organizerContext
    ? `\n${options.organizerContext}\n`
    : '';
  const roles = options?.processed?.referenceRoles
    ? `\n${options.processed.referenceRoles}\n`
    : '';

  return `ORIGINAL USER BRIEF (facts to preserve — any language):
"""
${original.slice(0, 1500)}
"""

ENGLISH SCENE BRIEF (Nano Banana narrative — use this as the creative brief):
"""
${englishScene.slice(0, 1400)}
"""
${contextBlock}${roles}
${alterationBlock}
${honesty}

Tasks (strict fidelity — faces first):
1) ${coupleFaceSwap
    ? 'Image 1 people are the OLD faces to replace. Inventory NEW identity from Images 2+ (peopleFaces + faceLandmarks). Keep Image 1 pose, bodies, clothes and décor. Do not prettify the couple.'
    : 'If people are present: OBSERVED face inventory (peopleFaces + faceLandmarks) — one card per person, left→right. Eyes, exact smile, cheeks, skin, hair, clothes. Do not infer the invisible. Do not prettify. Gemini: face and features remain completely unchanged.'}
2) briefNeeds = EXPLICITLY written needs; briefMustKeep / briefMustChange (décor vs people). Ignore beautify / smooth / lighten.
3) Fill hasPeople, peopleCount, peopleFaces, faceLandmarks, skinTones, hairStyles, clothingStyles.
4) Produce the JSON (editor structure + backgroundPrompt).
5) backgroundPrompt: ${coupleFaceSwap
    ? 'keep Image 1 card; replace faces with Images 2+ only.'
    : 'with people → DÉCOR ONLY ("USER BRIEF (décor):"). Do NOT rewrite facial identity there. Without people → "USER BRIEF:" then décor. Complete names/date/venue from connected context only if the brief is incomplete.'}
${options?.embedText ? '6) Embed brief text (names, date, venue) in backgroundPrompt as invitation typography.' : ''}`;
}

async function reformulateUserBriefToEnglish(
  processed: ProcessedInvitationPrompt,
  options?: { referenceCount?: number; embedText?: boolean; artStyle?: InvitationArtStyleId; coupleFaceSwap?: boolean },
): Promise<ProcessedInvitationPrompt> {
  if (!getGeminiApiKey()) return processed;
  try {
    const parsed = await requestGeminiJson({
      system: BRIEF_REFORMULATION_SYSTEM,
      userText: buildBriefReformulationUserText(
        processed.originalBrief,
        processed.decorBrief,
        {
          referenceCount: options?.referenceCount,
          embedText: options?.embedText,
          artStyleLine: invitationArtStyleScaffoldLine(parseInvitationArtStyle(options?.artStyle)),
          coupleFaceSwap: options?.coupleFaceSwap,
        },
      ),
      temperature: 0.25,
      timeoutMs: 45_000,
      failMessage: 'Brief reformulation failed.',
    });
    const english = parseEnglishSceneBriefFromJson(parsed);
    if (!english || english.length < 24) return processed;
    return applyEnglishSceneBrief(processed, english);
  } catch (error) {
    console.warn(
      '[invitationTemplateAi] English brief reformulation failed, using local scaffold:',
      (error as Error)?.message,
    );
    return processed;
  }
}

function visionResultFromParsed(
  parsed: Record<string, unknown>,
  prompt: string,
  hasRefs: boolean,
  options?: { embedText?: boolean; coupleFaceSwap?: boolean },
): VisionResult {
  const visualAnalysis = parseVisualAnalysis(parsed.visualAnalysis);
  const coupleFaceSwap = Boolean(options?.coupleFaceSwap);
  const faceClause = coupleFaceSwap
    ? FACE_POLICY_COUPLE_SWAP
    : visualAnalysis?.hasPeople
      ? FACE_POLICY_KEEP_PEOPLE
      : FACE_POLICY_NO_PEOPLE;
  const identityPrefix = coupleFaceSwap
    ? 'COUPLE FACE REPLACEMENT: Keep Image 1 card; replace faces with Images 2+. '
    : hasRefs
      ? 'IDENTITY LOCK: Match people in the references exactly (faces, skin, hair, clothing, eyes, smile, cheeks). '
      : '';
  const backgroundPrompt =
    typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()
      ? parsed.backgroundPrompt.trim().slice(0, 1800)
      : `${identityPrefix}USER BRIEF: ${prompt.slice(0, 350)}. ${faceClause} Soft print look, ${options?.embedText ? 'embed invitation typography from the brief.' : 'no readable text.'}`;
  return {
    global: parsed.global,
    elements: parsed.elements,
    backgroundPrompt,
    visualAnalysis,
  };
}

async function visionStructure(
  key: string,
  prompt: string,
  imageUrls: string[],
  options?: {
    embedText?: boolean;
    organizerContext?: string;
    processed?: ProcessedInvitationPrompt;
    artStyle?: InvitationArtStyleId;
    isAlteration?: boolean;
    existingElements?: Record<string, unknown>[];
    isPublic?: boolean;
    coupleFaceSwap?: boolean;
    preferredModel?: string;
  },
): Promise<VisionResult> {
  const hasRefs = imageUrls.length > 0;
  const preferOpenAi = isOpenAiStudioModel(options?.preferredModel);

  const tryGemini = async (): Promise<VisionResult | null> => {
    if (!getGeminiApiKey()) return null;
    const parsed = await requestGeminiJson({
      system: structureSystemPrompt(Boolean(options?.embedText), options?.artStyle, Boolean(options?.isPublic)),
      userText: visionUserText(prompt, hasRefs, options),
      imageUrls,
      temperature: 0.2,
      failMessage: 'Échec de l’analyse IA des images.',
    });
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return visionResultFromParsed(parsed as Record<string, unknown>, prompt, hasRefs, options);
    }
    return null;
  };

  if (!preferOpenAi) {
    try {
      const gemini = await tryGemini();
      if (gemini) return gemini;
    } catch (error) {
      console.warn(
        '[invitationTemplateAi] Gemini structure failed, falling back to OpenAI:',
        (error as Error)?.message,
      );
    }
  }

  if (!key) {
    if (preferOpenAi) {
      try {
        const gemini = await tryGemini();
        if (gemini) return gemini;
      } catch (error) {
        console.warn(
          '[invitationTemplateAi] Gemini fallback after missing OpenAI key failed:',
          (error as Error)?.message,
        );
      }
    }
    fail(503, 'La génération IA n’est pas configurée (GEMINI_API_KEY ou OPENAI_API_KEY).');
  }

  const visionModel =
    options?.preferredModel &&
    isOpenAiStudioModel(options.preferredModel) &&
    !options.preferredModel.includes('gpt-image')
      ? options.preferredModel
      : process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: visionUserText(prompt, hasRefs, options),
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
          { role: 'system', content: structureSystemPrompt(Boolean(options?.embedText), options?.artStyle, Boolean(options?.isPublic)) },
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
    return visionResultFromParsed(parsed, prompt, hasRefs, options);
  } catch (error) {
    if (preferOpenAi) {
      console.warn(
        '[invitationTemplateAi] OpenAI structure failed, falling back to Gemini:',
        (error as Error)?.message,
      );
      try {
        const gemini = await tryGemini();
        if (gemini) return gemini;
      } catch (geminiErr) {
        console.warn(
          '[invitationTemplateAi] Gemini fallback after OpenAI failed:',
          (geminiErr as Error)?.message,
        );
      }
    }
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || 'Impossible d’analyser les images avec l’IA.');
  } finally {
    clearTimeout(timer);
  }
}

export async function downloadReferenceImage(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const targetUrl = optimizeReferenceImageUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(targetUrl, { signal: controller.signal });
    if (!response.ok) {
      fail(502, 'Impossible de télécharger l’image de référence pour la génération.');
    }
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength < 100) {
      fail(502, 'Image de référence invalide ou trop petite.');
    }
    if (buffer.byteLength > 8 * 1024 * 1024) {
      fail(400, 'Image de référence trop lourde pour la génération (max ~8 Mo).');
    }
    const lower = url.toLowerCase();
    const mimeType = contentType.includes('image/webp') || lower.includes('.webp')
      ? 'image/webp'
      : contentType.includes('image/jpeg') || lower.includes('.jpg') || lower.includes('.jpeg')
        ? 'image/jpeg'
        : 'image/png';
    return { buffer, mimeType };
  } finally {
    clearTimeout(timer);
  }
}

export type PreloadedRefImage = { mimeType: string; base64: string };

/**
 * Télécharge et précharge en mémoire toutes les photos de référence en parallèle via Promise.allSettled.
 * Évite les téléchargements séquentiels et les ré-appels réseau inutiles lors de multiples variantes ou replis.
 */
export async function preloadReferenceImages(urls: string[]): Promise<PreloadedRefImage[]> {
  const validUrls = urls
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .slice(0, 4);
  if (!validUrls.length) return [];

  const results = await Promise.allSettled(
    validUrls.map(async (url) => {
      const { buffer, mimeType } = await downloadReferenceImage(url);
      return {
        mimeType,
        base64: buffer.toString('base64'),
      };
    }),
  );

  const preloaded: PreloadedRefImage[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled') {
      preloaded.push(res.value);
    } else {
      console.warn('[invitationTemplateAi] Skip ref download in parallel preload:', res.reason?.message);
    }
  }
  return preloaded;
}

async function downloadImageAsPngBuffer(url: string): Promise<Buffer> {
  const { buffer } = await downloadReferenceImage(url);
  return buffer;
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
  options?: { hasPeople?: boolean; embedText?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  const model = responsesModel();
  const hasRefs = referenceUrls.length > 0;
  const textRule = options?.embedText
    ? 'Embed sharp invitation typography (names, date, venue from the brief) on the card without covering faces.'
    : NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE;
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
    ? `EDIT the attached photo(s). Keep the SAME faces — pixels win over any text. Do not invent lookalikes.\n\n${imagePrompt}`
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
- ${faceBlock}
- Same person count and left-to-right order as the references.
- Brief = décor / card only.
- ${textRule}`,
        },
      ]
    : [
        {
          type: 'input_text',
          text: `${identityPreamble}

OUTPUT RULES:
- ${faceBlock}
- Apply USER BRIEF for décor.
- ${textRule}`,
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
        ...(hasPeople && refDataUrls.length ? { input_fidelity: 'high' } : {}),
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
          ...(hasPeople && refDataUrls.length ? { input_fidelity: 'high' } : {}),
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

    if (!response.ok && /fidelity/i.test(String(payload.error?.message || ''))) {
      const retryTools = [
        {
          type: 'image_generation',
          action: imageAction,
          size: '1024x1536',
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
  form.append('prompt', imagePrompt.slice(0, 3200));
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

function getNanoBananaApiKey(): string | null {
  const key =
    process.env.NANO_BANANA_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    '';
  return key.trim() || null;
}

const NANO_BANANA_PRO = 'gemini-3-pro-image';
const NANO_BANANA_FLASH = 'gemini-3.1-flash-image';

export type AiSpeedMode = 'fast' | 'quality';

function getNanoBananaProModel(): string {
  return process.env.NANO_BANANA_MODEL || process.env.GEMINI_IMAGE_MODEL || NANO_BANANA_PRO;
}

function getNanoBananaFlashModel(): string {
  return process.env.NANO_BANANA_FLASH_MODEL || NANO_BANANA_FLASH;
}

/**
 * Chaîne de repli des modèles Nano Banana.
 * En mode 'fast', le modèle Flash (gemini-3.1-flash-image) est interrogé en premier pour un rendu en ~4-8s.
 * En mode 'quality', le modèle Pro (gemini-3-pro-image 2K) est privilégié pour un piqué maximal.
 */
function getNanoBananaModelChain(speedMode?: AiSpeedMode, preferredModel?: string): string[] {
  const custom = preferredModel?.trim() && !isOpenAiStudioModel(preferredModel)
    ? preferredModel.trim()
    : '';
  if (custom) {
    if (speedMode === 'fast') {
      return [...new Set([custom, getNanoBananaFlashModel(), getNanoBananaProModel()])];
    }
    return [...new Set([custom, getNanoBananaProModel(), getNanoBananaFlashModel()])];
  }
  if (speedMode === 'fast') {
    return [...new Set([getNanoBananaFlashModel(), getNanoBananaProModel()])];
  }
  return [...new Set([getNanoBananaProModel(), getNanoBananaFlashModel()])];
}

/**
 * Exécute un appel brut synchrone à Nano Banana (Interactions API ou generateContent).
 * Injecte les images de référence en tête de payload (Image Reference Binding)
 * et configure nativement le ratio 9:16 (et haute résolution 2K pour le modèle Pro).
 */
async function executeNanoBananaRawRequest(
  apiKey: string,
  promptText: string,
  refImages: Array<{ mimeType: string; base64: string }>,
  model: string,
): Promise<string> {
  const isFlash = model.toLowerCase().includes('flash');
  const TIMEOUT_MS = isFlash ? 35_000 : 55_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    let b64: string | null = null;
    let safetyTriggered = false;
    let safetyDetail = '';

    // Tentative 1 : Google Interactions API (format 9:16, 2K)
    const interactionInput: Array<{ type: string; text?: string; data?: string; mime_type?: string }> = [];
    // Priorité absolue aux images de référence des hôtes pour ancrer l'identité
    for (const img of refImages) {
      interactionInput.push({
        type: 'image',
        data: img.base64,
        mime_type: img.mimeType,
      });
    }
    interactionInput.push({ type: 'text', text: promptText });

    const interactionPayload = {
      model,
      input: interactionInput,
      response_format: {
        type: 'image',
        aspect_ratio: '9:16',
        image_size: '2K',
      },
    };

    try {
      const interactionsRes = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'x-goog-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionPayload),
      });

      if (interactionsRes.ok) {
        const data = (await interactionsRes.json().catch(() => ({}))) as {
          output_image?: { data?: string };
          steps?: Array<{
            type?: string;
            content?: Array<{ type?: string; data?: string }>;
          }>;
          status?: string;
        };

        // 1. Extraire l'image si elle a été générée avec succès
        if (typeof data.output_image?.data === 'string' && data.output_image.data) {
          b64 = data.output_image.data;
        } else if (Array.isArray(data.steps)) {
          for (const step of data.steps) {
            const imgBlock = step.content?.find((c) => c.type === 'image' && typeof c.data === 'string' && c.data.length > 0);
            if (imgBlock?.data) {
              b64 = imgBlock.data;
              break;
            }
          }
        }

        // 2. Si aucune image n'a été produite, vérifier si un filtre de sécurité a bloqué la génération
        if (!b64 && isSafetyFilterTriggered(null, data)) {
          safetyTriggered = true;
          safetyDetail = 'Interactions API safety filter triggered';
        }
      } else {
        const errText = await interactionsRes.text().catch(() => '');
        if (isSafetyFilterTriggered(errText)) {
          safetyTriggered = true;
          safetyDetail = errText;
        }
        console.warn('[invitationTemplateAi] Nano Banana interactions API non-200:', errText.slice(0, 300));
      }
    } catch (interactErr) {
      if ((interactErr as Error)?.name === 'AbortError') {
        throw new Error(`Timeout: la requête Nano Banana interactions a dépassé ${TIMEOUT_MS / 1000}s.`);
      }
      if (isSafetyFilterTriggered(interactErr)) {
        safetyTriggered = true;
        safetyDetail = (interactErr as Error)?.message;
      }
      console.warn('[invitationTemplateAi] Nano Banana interactions attempt error:', (interactErr as Error)?.message);
    }

    if (safetyTriggered && !b64) {
      const safetyErr: HttpError = new Error(`SafetyFilterTriggered: ${safetyDetail}`);
      safetyErr.status = 400;
      throw safetyErr;
    }

    // Tentative 2 : Standard generateContent API avec responseModalities IMAGE & aspectRatio 9:16
    if (!b64) {
      const generateParts: Array<Record<string, unknown>> = [];
      // 1. Priorité absolue aux images de référence des hôtes pour ancrer l'identité
      for (const img of refImages) {
        generateParts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.base64,
          },
        });
      }
      // 2. Directives textuelles injectées après les références d'image
      generateParts.push({ text: promptText });

      const generatePayload = {
        contents: [
          {
            role: 'user',
            parts: generateParts,
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE'],
          aspectRatio: '9:16',
          imageConfig: {
            aspectRatio: '9:16',
            imageSize: '2K',
          },
        },
      };

      try {
        const generateRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(generatePayload),
          },
        );

        if (generateRes.ok) {
          const genData = (await generateRes.json().catch(() => ({}))) as {
            candidates?: Array<{
              content?: {
                parts?: Array<{
                  inlineData?: { data?: string };
                  inline_data?: { data?: string };
                }>;
              };
              finishReason?: string;
            }>;
            promptFeedback?: {
              blockReason?: string;
            };
          };

          const parts = genData.candidates?.[0]?.content?.parts || [];
          for (const p of parts) {
            const found = p.inlineData?.data || p.inline_data?.data;
            if (typeof found === 'string' && found) {
              b64 = found;
              break;
            }
          }

          if (!b64 && isSafetyFilterTriggered(null, genData)) {
            const blockInfo = genData.promptFeedback?.blockReason || genData.candidates?.[0]?.finishReason || 'SAFETY';
            const safetyErr: HttpError = new Error(`SafetyFilterTriggered: ${blockInfo}`);
            safetyErr.status = 400;
            throw safetyErr;
          }
        } else {
          const genErr = await generateRes.text().catch(() => '');
          if (isSafetyFilterTriggered(genErr)) {
            const safetyErr: HttpError = new Error(`SafetyFilterTriggered: ${genErr}`);
            safetyErr.status = 400;
            throw safetyErr;
          }
          console.warn('[invitationTemplateAi] Nano Banana generateContent API non-200:', genErr.slice(0, 300));
        }
      } catch (genErr) {
        if ((genErr as Error)?.name === 'AbortError') {
          throw new Error(`Timeout: la requête Nano Banana generateContent a dépassé ${TIMEOUT_MS / 1000}s.`);
        }
        if (isSafetyFilterTriggered(genErr)) {
          const safetyErr: HttpError = new Error(`SafetyFilterTriggered: ${(genErr as Error)?.message}`);
          safetyErr.status = 400;
          throw safetyErr;
        }
        throw genErr;
      }
    }

    if (!b64) {
      fail(502, `Nano Banana (${model}) n'a pas renvoyé d'image valide.`);
    }

    return b64;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Génération et composition d'invitation avec Nano Banana Pro (gemini-3-pro-image).
 * Exploite la référence multimodale (Image Reference Binding prioritaire dans contents),
 * les directives RAW candid anti-lissage, et le ratio portrait vertical 9:16 natif.
 * Inclut un fallback automatique vers un arrière-plan thématique générique sans humains en cas de blocage sécurité.
 */
async function generateImageWithNanoBanana(
  apiKey: string,
  imagePrompt: string,
  referenceUrls: string[],
  tenantId: string | null | undefined,
  options?: {
    hasPeople?: boolean;
    embedText?: boolean;
    artStyle?: InvitationArtStyleId;
    preloadedRefImages?: PreloadedRefImage[];
  },
  model: string = getNanoBananaProModel(),
): Promise<{ url: string; mode: 'edit' | 'generate'; safetyFallbackTriggered?: boolean }> {
  const hasRefs = referenceUrls.length > 0;
  const hasPeople = Boolean(options?.hasPeople);

  // Utilisation des images de référence déjà préchargées en mémoire (Levier B) ou téléchargement parallèle
  let refImages: PreloadedRefImage[] = [];
  if (options?.preloadedRefImages && options.preloadedRefImages.length > 0) {
    refImages = options.preloadedRefImages;
  } else if (hasRefs) {
    refImages = await preloadReferenceImages(referenceUrls);
  }

  // Verrouillage anti-lissage : injection des directives de style RAW, lumière et contraintes fermes
  let promptText = imagePrompt;
  if (hasPeople || hasRefs) {
    if (!promptText.includes(NANO_BANANA_STYLE_INSTRUCTION)) {
      promptText = `${promptText}\n\n${NANO_BANANA_CRITICAL_CONSTRAINT}\n${NANO_BANANA_STYLE_INSTRUCTION}\n${NANO_BANANA_LIGHT_RIG_COHERENCE}\n${NANO_BANANA_OPTICAL_BOKEH}`;
    }
  } else {
    promptText = `Vertical 9:16 luxury invitation. ${invitationArtStyleImageDirective(parseInvitationArtStyle(options?.artStyle))} ${invitationArtStyleCraftNotes()} If people appear, Black African hosts only — never Caucasian stock faces.
${options?.embedText ? 'Embed invitation typography from the brief.\n' : `${NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE}\n`}
${imagePrompt}`;
  }

  try {
    const b64 = await executeNanoBananaRawRequest(apiKey, promptText, refImages, model);
    const url = await uploadGeneratedB64(b64, tenantId);
    return { url, mode: hasPeople || hasRefs ? 'edit' : 'generate', safetyFallbackTriggered: false };
  } catch (error) {
    // Gestion du fallback automatique en cas de filtre de sécurité sur visages réels
    if (isSafetyFilterTriggered(error) && (hasPeople || hasRefs)) {
      console.warn(
        `[invitationTemplateAi] Filtre de sécurité Nano Banana déclenché sur photo humaine (${(error as Error)?.message}). Bascule automatique vers arrière-plan thématique générique sans humains...`,
      );
      try {
        const fallbackPrompt = buildGenericThematicBackgroundPrompt(imagePrompt, options);
        const fallbackB64 = await executeNanoBananaRawRequest(
          apiKey,
          fallbackPrompt,
          [], // Aucune photo de référence humaine pour contourner le filtre facial
          model,
        );
        const url = await uploadGeneratedB64(fallbackB64, tenantId);
        return { url, mode: 'generate', safetyFallbackTriggered: true };
      } catch (fallbackErr) {
        console.warn(
          '[invitationTemplateAi] Nano Banana fallback décoratif sans humains a échoué:',
          (fallbackErr as Error)?.message,
        );
        throw fallbackErr;
      }
    }

    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || `Erreur lors de la génération avec Nano Banana (${model}).`);
  }
}

/**
 * 1) Nano Banana Pro (gemini-3-pro-image)
 * 2) Nano Banana 2 / Flash (gemini-3.1-flash-image)
 * 3) GPT-5.6 Luna (Responses + image_generation)
 * 4) Images API edits sur la 1re référence
 * 5) Images API generate classique
 */
async function generateInvitationImageWithOpenAi(
  key: string,
  imageUrls: string[],
  imagePrompt: string,
  tenantId: string | null | undefined,
  options?: {
    hasPeople?: boolean;
    embedText?: boolean;
    artStyle?: InvitationArtStyleId;
    speedMode?: AiSpeedMode;
    preloadedRefImages?: PreloadedRefImage[];
    preferredModel?: string;
  },
): Promise<{ url: string; mode: 'edit' | 'generate'; safetyFallbackTriggered?: boolean }> {
  const preferImageApi = (options?.preferredModel || '').includes('gpt-image');
  const tryLuna = async () => {
    const lunaRes = await generateImageWithGpt56Luna(key, imagePrompt, imageUrls, tenantId, options);
    return { ...lunaRes, safetyFallbackTriggered: false as const };
  };

  if (!preferImageApi) {
    try {
      return await tryLuna();
    } catch (lunaErr) {
      console.warn(
        '[invitationTemplateAi] gpt-5.6-luna image failed, falling back:',
        (lunaErr as Error)?.message,
      );
    }
  }

  if (options?.hasPeople && imageUrls.length > 0) {
    try {
      const url = await generateBackgroundFromReference(key, imageUrls[0], imagePrompt, tenantId);
      return { url, mode: 'edit', safetyFallbackTriggered: false };
    } catch (editErr) {
      console.warn(
        '[invitationTemplateAi] image edit fallback failed, falling back to text generation:',
        (editErr as Error)?.message,
      );
    }
  }

  try {
    const url = await generateBackgroundFromPrompt(key, imagePrompt, tenantId);
    return { url, mode: 'generate', safetyFallbackTriggered: false };
  } catch (genErr) {
    console.warn(
      '[invitationTemplateAi] images/generations failed, trying edits:',
      (genErr as Error)?.message,
    );
  }

  if (preferImageApi) {
    try {
      return await tryLuna();
    } catch (lunaErr) {
      console.warn(
        '[invitationTemplateAi] gpt-5.6-luna after Images API failed:',
        (lunaErr as Error)?.message,
      );
    }
  }

  const primary = imageUrls[0];
  if (!primary) {
    fail(502, 'Impossible de créer la nouvelle image via OpenAI.');
  }
  const url = await generateBackgroundFromReference(key, primary, imagePrompt, tenantId);
  return { url, mode: 'edit', safetyFallbackTriggered: false };
}

async function createNewInvitationImage(
  key: string,
  imageUrls: string[],
  imagePrompt: string,
  tenantId: string | null | undefined,
  options?: {
    hasPeople?: boolean;
    embedText?: boolean;
    artStyle?: InvitationArtStyleId;
    speedMode?: AiSpeedMode;
    preloadedRefImages?: PreloadedRefImage[];
    preferredModel?: string;
  },
): Promise<{ url: string; mode: 'edit' | 'generate'; safetyFallbackTriggered?: boolean }> {
  const nanoKey = getNanoBananaApiKey();
  const prefersOpenAi = isOpenAiStudioModel(options?.preferredModel);

  if (prefersOpenAi && key) {
    try {
      console.log(`[invitationTemplateAi] Generating with OpenAI (${options?.preferredModel}) as principal model...`);
      return await generateInvitationImageWithOpenAi(key, imageUrls, imagePrompt, tenantId, options);
    } catch (openAiErr) {
      console.warn(
        '[invitationTemplateAi] OpenAI principal failed, falling back to Nano Banana:',
        (openAiErr as Error)?.message,
      );
    }
  }

  if (nanoKey) {
    const chain = getNanoBananaModelChain(options?.speedMode, options?.preferredModel);
    for (let i = 0; i < chain.length; i++) {
      const model = chain[i];
      const next = chain[i + 1];
      try {
        console.log(`[invitationTemplateAi] Generating with Nano Banana (${model}, speed=${options?.speedMode || 'quality'})...`);
        return await generateImageWithNanoBanana(
          nanoKey,
          imagePrompt,
          imageUrls,
          tenantId,
          options,
          model,
        );
      } catch (nanoErr) {
        console.warn(
          `[invitationTemplateAi] Nano Banana (${model}) failed, falling back to ${next || 'Luna/OpenAI'}:`,
          (nanoErr as Error)?.message,
        );
      }
    }
  }

  if (key && !prefersOpenAi) {
    try {
      return await generateInvitationImageWithOpenAi(key, imageUrls, imagePrompt, tenantId, options);
    } catch (openAiErr) {
      console.warn(
        '[invitationTemplateAi] OpenAI fallback failed:',
        (openAiErr as Error)?.message,
      );
    }
  }

  if (!imageUrls[0] && nanoKey) {
    try {
      console.warn(
        '[invitationTemplateAi] Filet de sécurité anti-blocage: tentative finale d\'arrière-plan décoratif sans humains via Nano Banana...',
      );
      const fallbackPrompt = buildGenericThematicBackgroundPrompt(imagePrompt, options);
      const fallbackB64 = await executeNanoBananaRawRequest(
        nanoKey,
        fallbackPrompt,
        [],
        getNanoBananaProModel(),
      );
      const url = await uploadGeneratedB64(fallbackB64, tenantId);
      return { url, mode: 'generate', safetyFallbackTriggered: true };
    } catch (finalFallbackErr) {
      console.warn(
        '[invitationTemplateAi] Échec du filet de sécurité décoratif Nano Banana:',
        (finalFallbackErr as Error)?.message,
      );
    }
  }

  if (!key) {
    fail(502, 'Impossible de créer la nouvelle image (Nano Banana). Ajoutez OPENAI_API_KEY pour le repli.');
  }
  fail(502, 'Impossible de créer la nouvelle image (Nano Banana + Luna + Images API).');
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
    variants?: string[];
    safetyFallbackTriggered?: boolean;
    speedMode?: AiSpeedMode;
  };
};

export function ensurePublicTemplateVariables(
  elements: Record<string, unknown>[],
): Record<string, unknown>[] {
  const result = elements.map((el) => ({ ...el }));
  const textEls = result.filter(
    (el) => el.type === 'text' && typeof el.text === 'string' && (el.text as string).trim().length > 0,
  );

  const hasTitleVar = result.some(
    (el) => typeof el.text === 'string' && el.text.includes('{{title}}'),
  );
  const hasDateVar = result.some(
    (el) => typeof el.text === 'string' && el.text.includes('{{date}}'),
  );
  const hasLocationVar = result.some(
    (el) => typeof el.text === 'string' && el.text.includes('{{location}}'),
  );
  const hasFirstNameVar = result.some(
    (el) => typeof el.text === 'string' && el.text.includes('{{firstName}}'),
  );

  // 1. Titre de l'événement (police la plus imposante ou première ligne de texte principale)
  if (!hasTitleVar && textEls.length > 0) {
    const mainTitleEl = [...textEls].sort((a, b) => {
      const fsA = parseInt(String(a.fontSize || '16'), 10) || 16;
      const fsB = parseInt(String(b.fontSize || '16'), 10) || 16;
      return fsB - fsA;
    })[0];

    if (mainTitleEl) {
      const current = String(mainTitleEl.text || '').trim();
      if (/mariage|union|noces/i.test(current)) {
        mainTitleEl.text = 'Mariage de {{title}}';
      } else if (/anniversaire|fête|célébration/i.test(current)) {
        mainTitleEl.text = 'Célébration de {{title}}';
      } else if (/gala|soirée|nuit/i.test(current)) {
        mainTitleEl.text = 'Gala : {{title}}';
      } else {
        mainTitleEl.text = '{{title}}';
      }
    }
  }

  // 2. Date de l'événement
  if (!hasDateVar) {
    const dateEl = textEls.find((el) => {
      const txt = String(el.text || '');
      return (
        !txt.includes('{{title}}') &&
        /\b(202\d|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}h\d{0,2}|date|heure)\b/i.test(
          txt,
        )
      );
    });

    if (dateEl) {
      const txt = String(dateEl.text || '');
      if (txt.includes('\n')) {
        const parts = txt.split('\n');
        dateEl.text = `Le {{date}}\n${parts[1] || '{{location}}'}`;
      } else {
        dateEl.text = 'Le {{date}}';
      }
    } else {
      const candidate = textEls.find((el) => !String(el.text).includes('{{title}}'));
      if (candidate) {
        candidate.text = `${candidate.text} · Le {{date}}`;
      }
    }
  }

  // 3. Lieu de l'événement
  if (!hasLocationVar) {
    const locEl = textEls.find((el) => {
      const txt = String(el.text || '');
      return (
        !txt.includes('{{title}}') &&
        !txt.includes('{{date}}') &&
        /\b(salle|hôtel|palais|domaine|espace|salon|centre|kinshasa|lubumbashi|goma|avenue|boulevard|paris|lieu|adresse|villa|terrasse|rooftop)\b/i.test(
          txt,
        )
      );
    });

    if (locEl) {
      locEl.text = 'À {{location}}';
    } else {
      const dateElWithLoc = textEls.find((el) => String(el.text || '').includes('{{date}}'));
      if (dateElWithLoc && !String(dateElWithLoc.text).includes('{{location}}')) {
        dateElWithLoc.text = `${dateElWithLoc.text}\n{{location}}`;
      }
    }
  }

  // 4. Salutation invité personnalisable ({{firstName}})
  if (!hasFirstNameVar) {
    const introEl = textEls.find((el) => {
      const txt = String(el.text || '');
      return (
        !txt.includes('{{title}}') &&
        !txt.includes('{{date}}') &&
        !txt.includes('{{location}}') &&
        /\b(cher|chère|invité|honneur|bienvenue|joie|prier|convier|invit|convi|présence)\b/i.test(txt)
      );
    });

    if (introEl) {
      const txt = String(introEl.text || '');
      if (!/\{\{firstName\}\}/.test(txt)) {
        introEl.text = `Cher(e) {{firstName}}, ${txt}`;
      }
    } else if (textEls.length > 0) {
      const titleIndex = result.findIndex((el) => typeof el.text === 'string' && el.text.includes('{{title}}'));
      const insertIndex = titleIndex >= 0 ? titleIndex + 1 : 1;
      result.splice(insertIndex, 0, {
        id: `ai-guest-${Date.now()}`,
        type: 'text',
        text: 'Cher(e) {{firstName}}, vous êtes chaleureusement convié(e)',
        color: textEls[0]?.color || '#475569',
        fontSize: '13px',
        align: 'center',
        positionMode: 'flow',
      });
    }
  }

  return result;
}

export async function composeInvitationTemplateAi(input: {
  userId: string;
  tenantId?: string | null;
  isPublic?: boolean;
  prompt: string;
  imageUrls: string[];
  baseImageUrl?: string | null;
  isAlteration?: boolean;
  existingElements?: Record<string, unknown>[];
  generateBackground?: boolean;
  embedText?: boolean;
  deviceId?: string | null;
  authUserId?: string | null;
  contextSource?: string | null;
  artStyle?: string | null;
  variantsCount?: number;
  speedMode?: string | null;
  preferredModel?: string | null;
  coupleFaceSwap?: boolean;
}): Promise<InvitationAiComposeResult> {
  rateLimit(input.userId);
  const coupleFaceSwap = Boolean(input.coupleFaceSwap);
  const promptRaw = String(input.prompt || '').trim();
  const prompt = promptRaw.length >= 8
    ? promptRaw
    : coupleFaceSwap
      ? COUPLE_FACE_SWAP_DEFAULT_PROMPT
      : '';
  if (prompt.length < 8) {
    fail(400, 'Décrivez le style d’invitation souhaité (au moins quelques mots).');
  }
  const isPublic = Boolean(input.isPublic || !input.tenantId);
  // Règle stricte : pour tout modèle public, interdiction d'écrire sur l'image directement
  const embedText = isPublic ? false : Boolean(input.embedText);
  const artStyle = parseInvitationArtStyle(input.artStyle);
  const artStyleLine = invitationArtStyleScaffoldLine(artStyle);
  const isAlteration =
    coupleFaceSwap ||
    Boolean(input.isAlteration) ||
    /retouch|ajust|refin|altér|réajust|modifier/i.test(prompt);

  const rawImageUrls = (input.imageUrls || [])
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim());
  if (input.baseImageUrl && /^https?:\/\//i.test(input.baseImageUrl.trim()) && !rawImageUrls.includes(input.baseImageUrl.trim())) {
    rawImageUrls.unshift(input.baseImageUrl.trim());
  }
  const imageUrls = rawImageUrls.slice(0, 4);
  if (coupleFaceSwap && imageUrls.length < 2) {
    fail(400, 'Ajoutez l’image à modifier et au moins une photo du couple.');
  }

  const existingElements = Array.isArray(input.existingElements) ? input.existingElements : [];
  const existingTextSummaries = existingElements
    .filter((el) => el && typeof el.text === 'string' && (el.text as string).trim().length > 0)
    .map((el) => `${el.type || 'text'}: "${(el.text as string).trim()}"`);

  const enrichedPrompt = isAlteration && existingTextSummaries.length > 0
    ? `${prompt}. PRESERVATION DU CONTEXTE : Le carton existant contient [${existingTextSummaries.join(', ')}]. Conserver impérativement ces informations clés (noms, date, lieu) et la disposition générale, en appliquant avec précision la retouche demandée.`
    : prompt;

  const processedBase = processUserPromptForHonestFaces(enrichedPrompt, {
    referenceCount: imageUrls.length,
    embedText,
    artStyleLine,
    coupleFaceSwap,
  });
  const processed = await reformulateUserBriefToEnglish(processedBase, {
    referenceCount: imageUrls.length,
    embedText,
    artStyle,
    coupleFaceSwap,
  });
  const contextSource = parseInvitationContextSource(input.contextSource);
  const composeContext = await loadInvitationComposeContext({
    userId: input.authUserId || input.userId,
    tenantId: input.tenantId,
    deviceId: input.deviceId,
    currentPrompt: enrichedPrompt,
    source: contextSource,
  });
  const organizerContextEn = formatContextForImage(composeContext, contextSource);

  const key = requireAiConfigured();
      const structured = await visionStructure(key, processed.visionBrief, imageUrls, {
    embedText,
    organizerContext: organizerContextEn,
    processed,
    artStyle,
    isAlteration,
    existingElements,
    isPublic,
    coupleFaceSwap,
    preferredModel: input.preferredModel || undefined,
  });
  if (!imageUrls.length && structured.visualAnalysis) {
    structured.visualAnalysis.hasPeople = false;
    structured.visualAnalysis.peopleCount = 0;
  }
  const imagePrompt = buildImagePrompt(
    processed.imageBrief,
    structured.backgroundPrompt,
    structured.visualAnalysis,
    {
      embedText,
      organizerContext: organizerContextEn,
      processed,
      artStyle,
      isAlteration,
      isPublic,
      coupleFaceSwap,
    },
  );

  let bgImageUrl = '';
  let imageMode: 'edit' | 'generate' | null = null;
  let safetyFallbackTriggered = false;
  const variants: string[] = [];
  const wantBg = input.generateBackground !== false;
  const requestedVariantsCount = Math.min(2, Math.max(1, Number(input.variantsCount) || 1));
  const speedMode: AiSpeedMode = input.speedMode === 'fast' ? 'fast' : 'quality';

  if (wantBg) {
    try {
      // Levier B: Préchargement parallèle des photos de référence une seule fois en mémoire
      const preloadedRefImages = imageUrls.length > 0
        ? await preloadReferenceImages(imageUrls)
        : [];

      const imageOptions = {
        hasPeople: Boolean(structured.visualAnalysis?.hasPeople) && imageUrls.length > 0,
        embedText,
        artStyle,
        speedMode,
        preloadedRefImages,
        preferredModel: input.preferredModel || undefined,
      };

      if (requestedVariantsCount >= 2) {
        // Levier A: Parallélisation simultanée des 2 variantes A et B via Promise.allSettled
        const promptA = imagePrompt;
        const promptB = buildVariantImagePrompt(imagePrompt, imageUrls.length > 0);

        const [resA, resB] = await Promise.allSettled([
          createNewInvitationImage(key, imageUrls, promptA, input.tenantId, imageOptions),
          createNewInvitationImage(key, imageUrls, promptB, input.tenantId, imageOptions),
        ]);

        if (resA.status === 'fulfilled') {
          bgImageUrl = resA.value.url;
          imageMode = resA.value.mode;
          safetyFallbackTriggered = Boolean(resA.value.safetyFallbackTriggered);
          variants.push(bgImageUrl);
        }

        if (resB.status === 'fulfilled') {
          const urlB = resB.value.url;
          if (urlB && urlB !== bgImageUrl) {
            variants.push(urlB);
          }
          if (!bgImageUrl && urlB) {
            bgImageUrl = urlB;
            imageMode = resB.value.mode;
            safetyFallbackTriggered = Boolean(resB.value.safetyFallbackTriggered);
          }
        } else {
          console.warn('[invitationTemplateAi] Échec de la variante B (non-bloquant):', resB.reason?.message);
        }

        if (!bgImageUrl) {
          const errA = resA.status === 'rejected' ? resA.reason : new Error('Échec de la génération des variantes');
          if ((errA as HttpError)?.status) throw errA;
          fail(502, (errA as Error)?.message || 'La création de la nouvelle image a échoué.');
        }
      } else {
        const created = await createNewInvitationImage(
          key,
          imageUrls,
          imagePrompt,
          input.tenantId,
          imageOptions,
        );
        bgImageUrl = created.url;
        imageMode = created.mode;
        safetyFallbackTriggered = Boolean(created.safetyFallbackTriggered);
        if (bgImageUrl) {
          variants.push(bgImageUrl);
        }
      }
    } catch (err) {
      // La création d’image est centrale : on remonte l’erreur au client.
      if ((err as HttpError)?.status) throw err;
      fail(502, (err as Error)?.message || 'La création de la nouvelle image a échoué.');
    }
  }

  const global = sanitizeGlobal(structured.global, bgImageUrl);
  if (variants.length > 0) {
    (global as Record<string, unknown>).aiVariants = variants;
    (global as Record<string, unknown>).variants = variants;
  }
  if (safetyFallbackTriggered) {
    (global as Record<string, unknown>).aiSafetyFallbackTriggered = true;
  }
  (global as Record<string, unknown>).aiSpeedMode = speedMode;
  if (structured.visualAnalysis) {
    (global as Record<string, unknown>).aiVisualAnalysis = structured.visualAnalysis;
  }
  (global as Record<string, unknown>).aiEmbedText = embedText;
  (global as Record<string, unknown>).aiArtStyle = artStyle;
  (global as Record<string, unknown>).aiContextSource = contextSource;
  if (hasUsableComposeContext(composeContext)) {
    (global as Record<string, unknown>).aiOrganizerContext = {
      source: contextSource,
      organizerName: composeContext.organizerName,
      organizationName: composeContext.organizationName,
      accountKind: composeContext.accountKind,
      recentEventTitles: composeContext.recentEvents.map((event) => event.title),
      usedPriorPrompts: composeContext.recentPrompts.length,
    };
  }
  if (processed.beautifyStripped) {
    (global as Record<string, unknown>).aiFaceHonesty = 'beautify-stripped';
  }
  (global as Record<string, unknown>).aiEnglishSceneBrief = processed.englishSceneBrief;
  (global as Record<string, unknown>).aiOriginalBrief = processed.originalBrief;
  let elements = sanitizeElements(structured.elements);
  if (isAlteration && existingElements.length > 0 && !embedText) {
    const textChangeExplicit =
      /texte|nom|prénom|date|lieu|heure|écrit|adresse|titre|rsvp/i.test(prompt);
    if (!textChangeExplicit) {
      // Le réajustement est visuel ou décoratif : préserver fidèlement les éléments personnalisés existants
      elements = existingElements.map((el) => ({ ...el }));
    }
  }
  if (embedText) {
    elements = elements.filter((el) => el.type === 'rsvp-block');
  }
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

  // Règle stricte pour les modèles publics : intégration obligatoire des variables dynamiques pour la personnalisation
  if (isPublic) {
    elements = ensurePublicTemplateVariables(elements);
    (global as Record<string, unknown>).isPublicTemplate = true;
    (global as Record<string, unknown>).hasCustomizableVariables = true;
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
      variants: variants.length > 0 ? variants : (bgImageUrl ? [bgImageUrl] : []),
      safetyFallbackTriggered,
      speedMode,
    },
  };
}

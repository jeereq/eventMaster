import {
  invitationArtStyleCompositionNote,
  invitationArtStyleCraftNotes,
  invitationArtStyleImageDirective,
  invitationArtStyleLightNote,
  parseInvitationArtStyle,
  type InvitationArtStyleId,
} from './invitationArtStyle.ts';

/**
 * Traitement des briefs utilisateur selon les recommandations Gemini Image
 * (Nano Banana) pour un rendu HONNÊTE des visages fournis en référence :
 * - ancre d’identité en tête de prompt
 * - rôle explicite de chaque image (character consistency vs object fidelity)
 * - high-fidelity detail preservation (« face remains completely unchanged »)
 * - scène narrative plutôt que mots-clés ; intention = carte d’invitation
 * - retirer le langage d’embellissement / blanchiment qui fait dériver le visage
 * - reformuler le brief utilisateur en anglais (Subject + Action + Location + Composition + Style)
 */

const FACE_BEAUTIFY_PATTERNS: RegExp[] = [
  /\bembelli[sr]\s+(?:les?\s+)?(?:visages?|photos?|personnes?|traits?)\b/gi,
  /\b(?:visages?|peau|traits?|sourire)\s+(?:plus\s+)?(?:beau(?:x)?|belle|jolie?s?|clair(?:e)?|lisse|parfait(?:e)?s?)\b/gi,
  /\b(?:rendre|faire)\s+(?:les?\s+)?(?:visages?|personnes?|photos?)\s+plus\s+(?:beau(?:x)?|belle|jolie?s?|attirant(?:e)?s?)\b/gi,
  /\blisser?\s+(?:la\s+)?peau\b/gi,
  /\bblanchi[sr]\s+(?:la\s+)?peau\b/gi,
  /\bpeau\s+plus\s+claire\b/gi,
  /\bairbrush(?:ing)?\b/gi,
  /\bphotoshop(?:er)?\b/gi,
  /\bretouche\s+beaut[eé]\b/gi,
  /\bglow[\s-]?up\b/gi,
  /\blookalike\b/gi,
  /\bcomme\s+(?:une?\s+)?(?:c[eé]l[eé]brit[eé]|mannequin|mod[eè]le\s+stock)\b/gi,
  /\baffiner\s+(?:le\s+)?(?:visage|nez|m[aâ]choire|joues)\b/gi,
  /\blighten\s+(?:the\s+)?skin\b/gi,
  /\bskin\s+whitening\b/gi,
  /\bmake\s+(?:the\s+)?(?:face|skin|them|her|him)\s+(?:more\s+)?(?:beautiful|handsome|pretty|perfect)\b/gi,
  /\b(?:beautiful|perfect|handsome)\s+(?:face|skin|smile)\b/gi,
  /\bbeautif(?:y|ul\s+faces?)\b/gi,
];

const EXPLICIT_FACE_CHANGE =
  /\b(?:changer|change|modifier|modifie|couper|raser|teindre|colorer)\b.{0,24}\b(?:cheveux|coiffure|barbe|habits?|tenue|v[eê]tement|costume|robe)\b/i;

/**
 * Directives de style RAW et contraintes strictes anti-lissage spécifiques
 * à l'écosystème Nano Banana pour garantir un rendu non retouché des visages.
 */
export const NANO_BANANA_STYLE_INSTRUCTION =
  'Style instruction: RAW candid photography, unedited, natural skin texture, visible pores, skin blemishes, slight facial asymmetry, harsh flash photography, 8k UHD, dslr, film grain.';

export const NANO_BANANA_CRITICAL_CONSTRAINT =
  'CRITICAL CONSTRAINT: Do NOT apply any beauty filters, do NOT smooth skin, do NOT create perfect symmetry, do NOT use airbrushing. The faces MUST retain the exact natural, unedited texture of the reference images.';

export const NANO_BANANA_LIGHT_RIG_COHERENCE =
  'LIGHT RIG COHERENCE: The environment must cast realistic warm ambient rim light and golden specular highlights matching the natural highlights of the reference photographs, with true physical contact shadows on attire, flooring, and surrounding stationery.';

export const NANO_BANANA_OPTICAL_BOKEH =
  'OPTICAL DEPTH OF FIELD: Shot on 85mm f/2.0 portrait lens feel; the subjects are in tack-sharp focus while the architectural decor and background elements recede into a soft, natural, cinematic optical bokeh. No harsh artificial cutout borders.';

export const NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE =
  'CLEAN ARTWORK MANDATE: Strictly NO readable text, NO letters, NO fake script, NO numbers, NO dates, NO painted watermarks inside the image pixels. Leave pristine, high-contrast negative space in the lower-third or central framing reserved for crisp vector typography.';

export function buildNanoBananaRawDirectives(hasPeople = true): string {
  if (!hasPeople) return '';
  return [
    NANO_BANANA_CRITICAL_CONSTRAINT,
    NANO_BANANA_STYLE_INSTRUCTION,
    NANO_BANANA_LIGHT_RIG_COHERENCE,
    NANO_BANANA_OPTICAL_BOKEH,
  ].join('\n');
}

/**
 * Optimise les URL Cloudinary de référence en appliquant une transformation adaptative
 * (WebP/JPEG automatique, redimensionnement max 1536px, compression sans perte perceptible)
 * pour diviser le payload par 3 à 4 et accélérer considérablement le transfert.
 */
export function optimizeReferenceImageUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/image/upload/')) {
    if (
      !trimmed.includes('/image/upload/f_') &&
      !trimmed.includes('/image/upload/c_') &&
      !trimmed.includes('/image/upload/w_') &&
      !trimmed.includes('/image/upload/q_')
    ) {
      return trimmed.replace('/image/upload/', '/image/upload/f_auto,q_auto:good,w_1536,c_limit/');
    }
  }
  return trimmed;
}

/** System prompt for Gemini brief reformulation (Nano Banana best practices). */
export const BRIEF_REFORMULATION_SYSTEM = `You rewrite invitation design briefs for Gemini Image (Nano Banana).

Rules (non-negotiable):
1) Output ONLY valid JSON: {"englishSceneBrief":"...","preservedFacts":["..."],"intent":"clone|wedding|gala|birthday|other"}
2) Write englishSceneBrief in clear English as a directorial scene narrative — NOT a keyword list.
3) Follow Nano Banana formula: [Subject] + [Action] + [Location/context] + [Composition] + [Style].
4) Start with a strong verb (Compose / Design / Create / Clone / Modernize…).
5) Be specific about paper, florals, lighting, materials, framing, and print finish (one light direction, tactile foil, 9:16 sharpness).
6) Use positive framing (describe what to show, not what to avoid).
7) Preserve every factual detail from the user: names, dates, venues, cities, colors, cultural motifs (Kuba, wax, pagne), event type, and any Congolese national language phrases (Lingala, Swahili, Kikongo, Tshiluba) without translating them into French or English.
8) If reference photos of people will be attached: describe DÉCOR and CARD only — never rewrite faces, skin, smile, age, or ethnicity. Say hosts keep their photographed likeness.
9) If no people photos: for wedding/gala/birthday, Black African hosts from Central Africa / RDC when people are implied; never invent a Caucasian stock couple.
10) Strip any request to beautify, smooth, lighten, airbrush, or swap faces.
11) Keep englishSceneBrief under 450 words. No markdown.`;

export type ProcessedInvitationPrompt = {
  originalBrief: string;
  decorBrief: string;
  /** Brief décor en anglais (scène narrative Gemini), prêt pour vision + image. */
  englishSceneBrief: string;
  visionBrief: string;
  imageBrief: string;
  identityHeader: string;
  referenceRoles: string;
  beautifyStripped: boolean;
  explicitAppearanceChange: boolean;
};

function collapseSpaces(value: string): string {
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function stripFaceBeautifyLanguage(prompt: string): { text: string; stripped: boolean } {
  let text = prompt;
  let stripped = false;
  for (const pattern of FACE_BEAUTIFY_PATTERNS) {
    pattern.lastIndex = 0;
    const next = text.replace(pattern, '');
    if (next !== text) {
      stripped = true;
      text = next;
    }
  }
  text = collapseSpaces(text.replace(/\s+,/g, ',').replace(/,\s*,/g, ','));
  return { text, stripped };
}

export function buildReferenceRoles(referenceCount: number): string {
  if (referenceCount <= 0) return '';
  const lines = [
    'REFERENCE ROLES (Gemini character consistency + object fidelity):',
  ];
  for (let i = 0; i < referenceCount; i += 1) {
    const n = i + 1;
    const side = i === 0 ? 'left / primary position' : i === 1 ? 'right / secondary position' : `position ${n}`;
    lines.push(
      `Image ${n} (${side}): if this photo shows a person, it is a CHARACTER-CONSISTENCY identity lock for that exact individual (or leftmost→rightmost people in that photo). Keep this person's distinct identity completely isolated without blending traits with other images. If this photo is an invitation card / décor sample, it is OBJECT FIDELITY for layout, borders and paper only — do not invent a face from it.`,
    );
  }
  if (referenceCount >= 2) {
    lines.push(
      'SPATIAL CHARACTER BINDING: When multiple hosts are pictured, arrange them with Image 1 on the left and Image 2 on the right, maintaining distinct facial anatomy and bone structure for each person with zero cross-blending.',
    );
  }
  return lines.join('\n');
}

/**
 * En-tête d’identité placé EN PREMIER (Gemini : high-fidelity detail preservation).
 * Les pixels des photos = vérité ; le brief ne réécrit pas le visage.
 */
export function buildHonestFaceIdentityHeader(referenceCount: number): string {
  if (referenceCount <= 0) return '';
  const who =
    referenceCount === 1
      ? 'the person in Image 1'
      : `the real people in Images 1–${referenceCount}`;
  return [
    '=== 1. IDENTITY ANCHOR (Gemini high-fidelity — FIRST) ===',
    `Use the attached reference photograph(s) as the ONLY identity source. These are ${who} — the same individuals, not siblings, celebrities, or beautified lookalikes.`,
    'Render each face as honestly as photographed: keep bone structure, eye spacing and slant, nose width, smile geometry (including asymmetry), cheek volume, skin tone and visible pores, hairline, moles/scars, age, and clothing unless the brief explicitly changes clothes or hair.',
    'Ensure each person\'s face and features remain completely unchanged. Do not enhance, beautify, reshape, symmetrize, slim, lighten, airbrush, or replace with a stock model.',
    NANO_BANANA_CRITICAL_CONSTRAINT,
    NANO_BANANA_STYLE_INSTRUCTION,
    NANO_BANANA_LIGHT_RIG_COHERENCE,
    NANO_BANANA_OPTICAL_BOKEH,
    'If any text in the brief conflicts with the pixels, obey the pixels.',
  ].join('\n');
}

/**
 * Reformulation locale (fallback) : enveloppe le brief nettoyé dans une scène narrative
 * anglaise selon la formule Nano Banana Subject + Action + Location + Composition + Style.
 */
export function buildEnglishSceneBriefScaffold(
  decorBrief: string,
  options?: { referenceCount?: number; embedText?: boolean; artStyleLine?: string },
): string {
  const cleaned = collapseSpaces(decorBrief).slice(0, 900);
  if (!cleaned) return '';

  const referenceCount = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  const looksLikeClone = /copi|clon|reprodu|duplicate|faithful|moderni/i.test(cleaned);
  const verb = looksLikeClone
    ? 'Clone and redesign'
    : 'Compose';

  const subject =
    referenceCount > 0
      ? 'a vertical print-ready luxury invitation card featuring the exact people from the attached reference photos (faces unchanged)'
      : 'a vertical print-ready luxury invitation card for a real Central African / RDC celebration';

  const action = looksLikeClone
    ? 'faithfully echoing the reference card’s layout, ornamental borders, paper texture and visual hierarchy while refreshing the atmosphere to match the brief'
    : 'presenting a refined ceremonial mood that matches the brief’s event type, palette and cultural details';

  const location = 'as a prestige printed stationery piece for Kinshasa / Central Africa hospitality';

  const composition =
    'tall 9:16 portrait frame, centered ceremonial focus, generous margins for lettering, soft depth of field on florals and paper grain';

  const styleParts = [
    options?.artStyleLine
      || 'photoreal 35mm editorial print look; natural materials (cotton paper, gold foil, fresh florals); warm volumetric light; no CGI, no cartoon, no airbrushed beauty faces',
  ];
  if (options?.embedText) {
    styleParts.push('sharp embedded invitation typography for names, date and venue when provided');
  } else {
    styleParts.push('clean negative space reserved for later typography — no readable names or dates yet');
  }
  if (referenceCount > 0) {
    styleParts.push('décor and card only in this narrative — identity locked to reference pixels');
  }

  return collapseSpaces(
    [
      `${verb} this scene.`,
      `[Subject] ${subject}.`,
      `[Action] ${action}.`,
      `[Location/context] ${location}.`,
      `[Composition] ${composition}.`,
      `[Style] ${styleParts.join('; ')}.`,
      `[User intent — preserve every fact] ${cleaned}`,
    ].join(' '),
  ).slice(0, 1400);
}

export function buildBriefReformulationUserText(
  originalBrief: string,
  decorBrief: string,
  options?: { referenceCount?: number; embedText?: boolean; artStyleLine?: string },
): string {
  const refs = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  return `ORIGINAL USER BRIEF (any language — preserve facts):
"""
${originalBrief.slice(0, 1500)}
"""

CLEANED DÉCOR BRIEF (face-beautify language already stripped):
"""
${decorBrief.slice(0, 1200)}
"""

Context flags:
- referencePhotoCount: ${refs}
- embedInvitationTypography: ${options?.embedText ? 'yes' : 'no'}
- artStyle: ${options?.artStyleLine || 'photoreal 35mm editorial print look'}

The [Style] clause of englishSceneBrief MUST follow artStyle. Do not force photoreal if another style is requested.

Rewrite into englishSceneBrief now.`;
}

export function parseEnglishSceneBriefFromJson(raw: unknown): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const value = (raw as Record<string, unknown>).englishSceneBrief;
  if (typeof value !== 'string') return '';
  return collapseSpaces(value).slice(0, 1400);
}

/**
 * Applique une reformulation anglaise (Gemini ou scaffold) sur un brief déjà traité.
 */
export function applyEnglishSceneBrief(
  processed: ProcessedInvitationPrompt,
  englishSceneBrief: string,
): ProcessedInvitationPrompt {
  const narrative = collapseSpaces(englishSceneBrief).slice(0, 1400);
  if (!narrative) return processed;

  const hasRefs = Boolean(processed.identityHeader);
  const imageBrief = hasRefs
    ? [
        'USER BRIEF (English scene — décor / card / mood only — never rewrite faces):',
        narrative,
        processed.explicitAppearanceChange
          ? 'The user explicitly asked to change hair or clothing; apply ONLY that change. Keep the face identical.'
          : 'Do not change hair, clothing, skin or face unless the brief explicitly requests a wardrobe or hair change.',
        NANO_BANANA_CRITICAL_CONSTRAINT,
        NANO_BANANA_STYLE_INSTRUCTION,
        NANO_BANANA_LIGHT_RIG_COHERENCE,
        NANO_BANANA_OPTICAL_BOKEH,
      ].join('\n')
    : narrative;

  const honestyNote = hasRefs
    ? processed.beautifyStripped
      ? ' (face beautify / smooth / lighten requests were ignored — photos remain truth)'
      : ' (faces = reference photo pixels, no idealization)'
    : '';

  return {
    ...processed,
    englishSceneBrief: narrative,
    visionBrief: collapseSpaces(`${narrative}${honestyNote}`),
    imageBrief,
  };
}

export function processUserPromptForHonestFaces(
  prompt: string,
  options?: { referenceCount?: number; embedText?: boolean; artStyleLine?: string },
): ProcessedInvitationPrompt {
  const originalBrief = collapseSpaces(prompt).slice(0, 1500);
  const referenceCount = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  const { text: cleaned, stripped } = stripFaceBeautifyLanguage(originalBrief);
  const explicitAppearanceChange = EXPLICIT_FACE_CHANGE.test(originalBrief);
  const decorBrief = cleaned || originalBrief;
  const englishSceneBrief = buildEnglishSceneBriefScaffold(decorBrief, {
    referenceCount,
    embedText: options?.embedText,
    artStyleLine: options?.artStyleLine,
  });

  const honestyNote = referenceCount
    ? stripped
      ? ' (face beautify / smooth / lighten requests were ignored — photos remain truth)'
      : ' (faces = reference photo pixels, no idealization)'
    : '';

  const visionBrief = collapseSpaces(`${englishSceneBrief}${honestyNote}`);

  const imageBrief = referenceCount
    ? [
        'USER BRIEF (English scene — décor / card / mood only — never rewrite faces):',
        englishSceneBrief,
        explicitAppearanceChange
          ? 'The user explicitly asked to change hair or clothing; apply ONLY that change. Keep the face identical.'
          : 'Do not change hair, clothing, skin or face unless the brief explicitly requests a wardrobe or hair change.',
        NANO_BANANA_CRITICAL_CONSTRAINT,
        NANO_BANANA_STYLE_INSTRUCTION,
        NANO_BANANA_LIGHT_RIG_COHERENCE,
        NANO_BANANA_OPTICAL_BOKEH,
      ].join('\n')
    : englishSceneBrief;

  return {
    originalBrief,
    decorBrief,
    englishSceneBrief,
    visionBrief,
    imageBrief,
    identityHeader: buildHonestFaceIdentityHeader(referenceCount),
    referenceRoles: buildReferenceRoles(referenceCount),
    beautifyStripped: stripped,
    explicitAppearanceChange,
  };
}

export function buildGeminiSceneSteps(embedText: boolean): string {
  return [
    '=== SCENE STEPS (Gemini step-by-step) ===',
    'First, lock every face from the character-consistency references — honest pixels, no idealization.',
    'Then, compose one vertical 9:16 print-ready invitation (paper, florals, frame, lighting) from the English scene brief and organizer context.',
    embedText
      ? 'Finally, embed sharp invitation lettering (names, date, venue from the brief) in the lower third or a cartouche that does not cover eyes, smile or cheeks.'
      : 'Finally, leave clean negative space for later typography — no readable names, dates, logos or watermarks.',
    NANO_BANANA_CRITICAL_CONSTRAINT,
    NANO_BANANA_STYLE_INSTRUCTION,
    NANO_BANANA_LIGHT_RIG_COHERENCE,
    NANO_BANANA_OPTICAL_BOKEH,
  ].join('\n');
}

function isSafetyText(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes('safety') ||
    lower.includes('block_reason') ||
    lower.includes('blockreason') ||
    lower.includes('prohibited_content') ||
    lower.includes('spii') ||
    lower.includes('hate_speech') ||
    lower.includes('harassment') ||
    lower.includes('sexually_explicit') ||
    lower.includes('dangerous_content') ||
    (lower.includes('policy') && (lower.includes('violat') || lower.includes('filter'))) ||
    (lower.includes('filter') && lower.includes('content'))
  );
}

/**
 * Détecte si une erreur ou un corps de réponse Nano Banana provient d'un filtre de sécurité
 * (Safety Filter, blocage d'image de visage réel, biométrie, etc.).
 */
export function isSafetyFilterTriggered(textOrErr: unknown, jsonPayload?: unknown): boolean {
  if (typeof textOrErr === 'string' && isSafetyText(textOrErr)) return true;
  if (textOrErr instanceof Error && isSafetyText(textOrErr.message)) return true;

  if (jsonPayload && typeof jsonPayload === 'object') {
    try {
      const p = jsonPayload as Record<string, unknown>;
      if (p.promptFeedback && typeof p.promptFeedback === 'object') {
        const pf = p.promptFeedback as Record<string, unknown>;
        const br = String(pf.blockReason || '').toUpperCase();
        if (br && br !== 'NONE' && (br.includes('SAFETY') || br.includes('BLOCK') || br.includes('PROHIBITED'))) {
          return true;
        }
      }
      if (Array.isArray(p.candidates) && p.candidates[0] && typeof p.candidates[0] === 'object') {
        const c = p.candidates[0] as Record<string, unknown>;
        const fr = String(c.finishReason || '').toUpperCase();
        if (fr && (fr.includes('SAFETY') || fr.includes('PROHIBITED') || fr.includes('BLOCK') || fr.includes('SPII'))) {
          return true;
        }
      }
      if (typeof p.status === 'string' && p.status.toUpperCase().includes('BLOCK')) {
        return true;
      }
      const raw = JSON.stringify(jsonPayload);
      if (isSafetyText(raw)) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

/**
 * Construit un prompt thématique d'arrière-plan sans aucun être humain,
 * préservant l'ambiance, les couleurs, le style artistique et le ratio 9:16 de l'événement.
 */
export function buildGenericThematicBackgroundPrompt(
  imagePrompt: string,
  options?: { embedText?: boolean; artStyle?: InvitationArtStyleId },
): string {
  const artStyle = parseInvitationArtStyle(options?.artStyle);
  const cleanBrief = imagePrompt
    .replace(/=== 1\. IDENTITY ANCHOR[\s\S]*?===/gi, '')
    .replace(/REFERENCE ROLES[\s\S]*?\n\n/gi, '')
    .replace(/FACE INVENTORY[\s\S]*?\n/gi, '')
    .replace(/LANDMARKS[\s\S]*?\n/gi, '')
    .replace(/People count[\s\S]*?\n/gi, '')
    .replace(/Style instruction: RAW candid photography[\s\S]*?film grain\./gi, '')
    .replace(/CRITICAL CONSTRAINT: Do NOT apply any beauty filters[\s\S]*?reference images\./gi, '')
    .replace(/Use the attached reference photo[\s\S]*?\n/gi, '')
    .replace(/The attached photo\(s\)[\s\S]*?\n/gi, '')
    .trim();

  const lines: string[] = [
    'Create ONE vertical 9:16 luxury invitation card background with rich celebration atmosphere and ABSOLUTELY NO human beings.',
    'STRICT CONSTRAINT: Pure festive décor, environment, florals, architecture and stationery styling only. NO people, NO faces, NO silhouettes, NO portraits, NO hands, NO human figures of any kind.',
    `ART STYLE (${artStyle.toUpperCase()} DÉCOR): Luxurious event stationery and environmental architecture. Tactile textures, rich lighting, impeccable festive ambience.`,
    invitationArtStyleCompositionNote(artStyle),
    invitationArtStyleLightNote(artStyle),
    invitationArtStyleCraftNotes(),
    'Event theme and ambiance details:',
    cleanBrief.slice(0, 1200),
  ];

  if (options?.embedText) {
    lines.push(
      'Embed crisp luxury typographic lettering (names, date, venue) integrated into the 9:16 layout negative space without covering any decorative motifs.',
    );
  } else {
    lines.push(
      NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE,
    );
  }

  return lines.filter(Boolean).join('\n');
}

/**
 * Construit un prompt de variante A/B (Variante 2) à partir du prompt initial,
 * en introduisant une modulation subtile du décor, de l'angle de vue ou de la disposition florale
 * tout en conservant strictement les identités des hôtes et la palette chromatique.
 */
export function buildVariantImagePrompt(basePrompt: string): string {
  const variantDirectives = [
    'ALTERNATIVE COMPOSITION VARIANT (A/B VARIATION 2):',
    '- Provide a fresh, alternative composition with subtle variation in framing, floral arrangement, or decorative accents.',
    '- Maintain identical host facial anatomy, outfits, colors, and lighting temperature.',
    '- Keep the same vertical 9:16 aspect ratio and luxury aesthetic.',
  ].join('\n');

  return `${basePrompt}\n\n${variantDirectives}`;
}


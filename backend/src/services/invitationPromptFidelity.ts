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

/** System prompt for Gemini brief reformulation (Nano Banana best practices). */
export const BRIEF_REFORMULATION_SYSTEM = `You rewrite invitation design briefs for Gemini Image (Nano Banana).

Rules (non-negotiable):
1) Output ONLY valid JSON: {"englishSceneBrief":"...","preservedFacts":["..."],"intent":"clone|wedding|gala|birthday|other"}
2) Write englishSceneBrief in clear English as a directorial scene narrative — NOT a keyword list.
3) Follow Nano Banana formula: [Subject] + [Action] + [Location/context] + [Composition] + [Style].
4) Start with a strong verb (Compose / Design / Create / Clone / Modernize…).
5) Be specific about paper, florals, lighting, materials, and framing.
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
    lines.push(
      `Image ${n}: if this photo shows a person, it is a CHARACTER-CONSISTENCY identity lock for that exact individual (or leftmost→rightmost people in that photo). If this photo is an invitation card / décor sample, it is OBJECT FIDELITY for layout, borders and paper only — do not invent a face from it.`,
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
  ].join('\n');
}

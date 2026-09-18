import {
  invitationArtStyleCompositionNote,
  invitationArtStyleCraftNotes,
  invitationArtStyleImageDirective,
  invitationArtStyleLightNote,
  invitationArtStyleScaffoldLine,
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

export const NANO_BANANA_HARMONIZATION_DIRECTIVE =
  'SEAMLESS ANATOMICAL & SKIN HARMONIZATION (LIFELIKE REALISM): Flawlessly harmonize replacement faces with the host bodies. Naturally blend jawline, chin contours, hairline, and neck transition onto the collar, shoulders, and posture with zero harsh cutout borders or sticker seams. Harmonize skin tones, melanin undertones, subsurface light diffusion, and ambient banquet lighting between face, neck, and hands so the people look physically real and authentic in the photograph.';

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
1) Output ONLY valid JSON: {"englishSceneBrief":"...","preservedFacts":["..."],"intent":"clone|wedding|gala|birthday|refine|other"}
2) Write englishSceneBrief in clear English as a directorial scene narrative — NOT a keyword list.
3) Follow Nano Banana formula: [Subject] + [Action] + [Location/context] + [Composition] + [Style].
4) Start with a strong verb (Compose / Design / Create / Clone / Modernize / Refine…).
5) Be specific about paper, florals, lighting, materials, framing, and print finish (one light direction, tactile foil, 9:16 sharpness).
6) Use positive framing (describe what to show, not what to avoid).
7) Preserve every factual detail from the user: names, dates, venues, cities, colors, cultural motifs (Kuba, wax, pagne), event type, and any Congolese national language phrases (Lingala, Swahili, Kikongo, Tshiluba) without translating them into French or English.
8) If reference photos of people will be attached: describe DÉCOR and CARD only — never rewrite faces, skin, smile, age, or ethnicity. Say hosts keep their photographed likeness.
9) If no people photos: for wedding/gala/birthday, Black African hosts from Central Africa / RDC when people are implied; never invent a Caucasian stock couple.
10) Strip any request to beautify, smooth, lighten, airbrush, or swap faces.
11) Keep englishSceneBrief under 450 words. No markdown.
12) If the brief is an ALTERATION / REFINEMENT (retouche, réajustement, altération, modification ciblée, conserver le carton existant): set intent="refine". Explicitly instruct to PRESERVE the existing card layout, framing, background composition, color harmony, and character identity, applying ONLY the specific targeted adjustment.
13) If context flag coupleFaceSwap=yes: this is an organizer-requested face replacement. Set intent="refine". Image 1 is the incoming card/scene — keep layout, pose, bodies, wardrobe, décor, lighting and typography. Images 2+ are the couple identity. Instruct to replace ONLY the faces on Image 1. Do not strip this swap. Still strip beautify / smooth / lighten.`;

export type InvitationPromptOptions = {
  referenceCount?: number;
  embedText?: boolean;
  artStyleLine?: string;
  coupleFaceSwap?: boolean;
  genderMappingDirective?: string;
};

export type InvitationPipelineIntent = 'create' | 'clone' | 'refine' | 'couple';

export const INVITATION_PIPELINE_INTENTS: readonly InvitationPipelineIntent[] = [
  'create',
  'clone',
  'refine',
  'couple',
];

/** Prompt image cible : ~400–700 mots, jamais un monolithe de 6 000 caractères. */
export const COMPACT_IMAGE_PROMPT_MAX_CHARS = 3800;

const REFINE_BRIEF_RE = /retouch|ajust|refin|altér|réajust|modifier|swap|remplace.{0,24}visage/i;
const CLONE_BRIEF_RE = /copi|clon|reprodu|duplicate/i;

export const NANO_BANANA_COMPACT_FACE_LOCK =
  'RAW candid faces: exact reference texture, visible pores, slight asymmetry. No beauty filter, no smooth skin, no airbrush. One warm light, 85mm feel.';

export type InvitationImageAnalysisHint = {
  hasPeople?: boolean;
  peopleCount?: number;
  isInvitationClone?: boolean;
  clonedCardFeatures?: string;
  briefMustKeep?: string[];
  briefMustChange?: string[];
  colors?: string[];
  coupleFaceMapping?: {
    strictMappingInstructions?: string;
  };
};

export function isInvitationPipelineIntent(value: unknown): value is InvitationPipelineIntent {
  return typeof value === 'string' && (INVITATION_PIPELINE_INTENTS as readonly string[]).includes(value);
}

export function parseInvitationPipelineIntent(
  value: unknown,
  fallback: InvitationPipelineIntent = 'create',
): InvitationPipelineIntent {
  return isInvitationPipelineIntent(value) ? value : fallback;
}

export function resolveInvitationPipelineIntent(input: {
  coupleFaceSwap?: boolean;
  isAlteration?: boolean;
  brief?: string;
  isInvitationClone?: boolean;
}): InvitationPipelineIntent {
  if (input.coupleFaceSwap) return 'couple';
  const brief = String(input.brief || '');
  if (input.isAlteration || REFINE_BRIEF_RE.test(brief)) return 'refine';
  if (input.isInvitationClone || CLONE_BRIEF_RE.test(brief)) return 'clone';
  return 'create';
}

export function resolveFinalInvitationPipelineIntent(input: {
  local: InvitationPipelineIntent;
  vision?: unknown;
  isInvitationClone?: boolean;
}): InvitationPipelineIntent {
  if (input.local === 'couple') return 'couple';
  const vision = parseInvitationPipelineIntent(input.vision, input.local);
  if (vision === 'couple') return input.local;
  if (input.local === 'refine') return 'refine';
  if (vision === 'clone' || input.isInvitationClone) return 'clone';
  return vision;
}

export function invitationPipelineModeSentence(intent: InvitationPipelineIntent): string {
  switch (intent) {
    case 'couple':
      return 'MODE couple: Keep Image 1 card, pose, bodies, wardrobe, décor and lighting. Replace ONLY faces with Images 2+. Honest pixels.';
    case 'clone':
      return 'MODE clone: Duplicate the reference card architecture (borders, foil, paper, ornaments). Place any attached people inside that frame, identity locked.';
    case 'refine':
      return 'MODE refine: Preserve the existing card. Apply ONLY the requested delta. Do not redesign.';
    default:
      return 'MODE create: Compose a new vertical luxury invitation for a real Central Africa / RDC celebration.';
  }
}

export function invitationPipelineVisionMandate(intent: InvitationPipelineIntent): string {
  switch (intent) {
    case 'couple':
      return `PIPELINE couple (non-negotiable):
- Image 1 = incoming card/scene. Keep composition, pose, bodies, clothes, décor, lighting, ornaments.
- Images 2+ = couple identity. Inventory NEW faces only. Discard Image 1 faces.
- Forbidden: beautify, lighten, celebrity lookalike, inventing a new couple.`;
    case 'clone':
      return `PIPELINE clone (non-negotiable):
- Card photo / Image 1 = layout truth: frame, borders, foil, paper, ornaments, palette.
- Set isInvitationClone=true and fill clonedCardFeatures.
- People photos (if any) sit inside that cloned frame, identity locked.
- Do not invent a new card architecture.`;
    case 'refine':
      return `PIPELINE refine (non-negotiable):
- Keep existing card composition, framing, palette, ornaments and identity.
- Apply ONLY explicit brief changes (décor/mood/text if asked).
- Do not replace the whole design.`;
    default:
      return `PIPELINE create (non-negotiable):
- Invent a new luxury card from the brief.
- Photos lock people only — do not clone a card unless a photo is clearly stationery.
- Without people photos: décor-first; if hosts are implied, Black African RDC default.`;
  }
}

function compactLockList(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const locks: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const lock = collapseSpaces(item).slice(0, 140);
    const key = lock.toLowerCase();
    if (!lock || seen.has(key)) continue;
    seen.add(key);
    locks.push(lock);
    if (locks.length >= max) break;
  }
  return locks;
}

export function parseInvitationLocks(raw: unknown, max = 8): string[] {
  return compactLockList(raw, max);
}

export function buildInvitationLocks(input: {
  intent: InvitationPipelineIntent;
  analysis?: InvitationImageAnalysisHint | null;
  embedText?: boolean;
  isPublic?: boolean;
  referenceCount?: number;
  explicitAppearanceChange?: boolean;
}): string[] {
  const analysis = input.analysis || {};
  const hasPeople =
    input.intent === 'couple' ||
    Boolean(analysis.hasPeople) ||
    (input.intent !== 'create' && (input.referenceCount || 0) > 0 && Boolean(analysis.hasPeople));
  const peopleCount = Math.max(1, Number(analysis.peopleCount) || 1);
  const locks: string[] = [];

  if (input.intent === 'couple') {
    locks.push('Image 1 wins for card, pose, bodies, wardrobe, décor and lighting.');
    locks.push('Images 2+ are the only face source. Discard Image 1 faces. No beautify, no lighten.');
    if (analysis.coupleFaceMapping?.strictMappingInstructions) {
      locks.push(collapseSpaces(analysis.coupleFaceMapping.strictMappingInstructions).slice(0, 180));
    } else {
      locks.push('MANDATORY GENDER LOCK: Male host face goes onto male body/suit; female host face goes onto female body/dress. Zero gender inversion.');
    }
    locks.push('LIFELIKE HARMONY: Seamlessly blend skin tones, subsurface scattering, jawline, and neck connection onto the bodies. Zero cutout seams.');
  } else if (hasPeople) {
    locks.push('Attached photos are the only identity source. Same people — no lookalike, no beautify, no skin lightening.');
    locks.push(`People count ${peopleCount}, left-to-right order unchanged.`);
  } else {
    locks.push('No reference faces. If hosts appear, depict Black African men and/or women from Central Africa / RDC only.');
  }

  if (input.intent === 'clone' || analysis.isInvitationClone) {
    locks.push(
      analysis.clonedCardFeatures
        ? `Clone card architecture: ${collapseSpaces(analysis.clonedCardFeatures).slice(0, 120)}`
        : 'Clone the reference card architecture, palette, foil and paper.',
    );
  } else if (input.intent === 'refine') {
    locks.push('Keep the existing card. Change only what the brief names.');
  }

  if (hasPeople && !input.explicitAppearanceChange && input.intent !== 'couple') {
    locks.push('Keep hair, clothes and skin as photographed unless the brief names a wardrobe or hair change.');
  }

  if (input.isPublic || !input.embedText) {
    locks.push('No painted letters, names, dates or logos in the pixels.');
  } else {
    locks.push('Embed brief typography in the lower third without covering faces.');
  }

  if (analysis.briefMustKeep?.length) {
    locks.push(`Keep: ${analysis.briefMustKeep.slice(0, 3).join('; ')}`.slice(0, 140));
  }
  if (analysis.briefMustChange?.length && input.intent !== 'couple') {
    locks.push(`Change only: ${analysis.briefMustChange.slice(0, 3).join('; ')}`.slice(0, 140));
  }

  if (analysis.colors?.length) {
    locks.push(`Stay near palette ${analysis.colors.slice(0, 4).join(', ')}.`);
  }

  return compactLockList(locks, 8);
}

function compactTextRule(embedText?: boolean, isPublic?: boolean): string {
  if (isPublic) {
    return 'FORMAT: Vertical 9:16, 1024x1536. Clean reusable artwork — no painted text. Editor overlays {{title}}, {{date}}, {{location}}, {{firstName}}.';
  }
  if (embedText) {
    return 'FORMAT: Vertical 9:16, 1024x1536. Embed sharp invitation lettering from the brief (names, date, venue) in the lower third or a cartouche. Do not cover faces.';
  }
  return `FORMAT: Vertical 9:16, 1024x1536. ${NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE}`;
}

export function buildCompactImagePrompt(input: {
  intent: InvitationPipelineIntent;
  originalBrief: string;
  decorParagraph: string;
  locks?: string[];
  analysis?: InvitationImageAnalysisHint | null;
  organizerContext?: string;
  artStyle?: InvitationArtStyleId;
  embedText?: boolean;
  isPublic?: boolean;
  coupleFaceSwap?: boolean;
  referenceCount?: number;
  explicitAppearanceChange?: boolean;
}): string {
  const intent = input.coupleFaceSwap ? 'couple' : input.intent;
  const hasPeople = intent === 'couple' || Boolean(input.analysis?.hasPeople);
  const locks = (input.locks && input.locks.length
    ? compactLockList(input.locks, 8)
    : buildInvitationLocks({
        intent,
        analysis: input.analysis,
        embedText: input.embedText,
        isPublic: input.isPublic,
        referenceCount: input.referenceCount,
        explicitAppearanceChange: input.explicitAppearanceChange,
      }));

  const artStyle = parseInvitationArtStyle(input.artStyle);
  const decor = collapseSpaces(input.decorParagraph || input.originalBrief).slice(0, 1100);
  const organizer = collapseSpaces(input.organizerContext || '').slice(0, 360);

  const parts = [
    'Create ONE vertical print-ready invitation (9:16, 1024x1536) for a real event in Central Africa / RDC.',
    invitationPipelineModeSentence(intent),
    'LOCKS:',
    ...locks.map((lock) => `- ${lock}`),
    'DECOR:',
    decor,
    `STYLE: ${invitationArtStyleScaffoldLine(artStyle)} ${invitationArtStyleLightNote(artStyle)}`,
  ];

  if (organizer) {
    parts.push(organizer);
  }

  parts.push(compactTextRule(input.embedText, input.isPublic));

  if (hasPeople) {
    parts.push(NANO_BANANA_COMPACT_FACE_LOCK);
  }

  return collapseSpaces(parts.filter(Boolean).join('\n')).slice(0, COMPACT_IMAGE_PROMPT_MAX_CHARS);
}

export const INVITATION_IMAGE_JUDGE_MIN_SCORE = 7;

export const INVITATION_IMAGE_JUDGE_SYSTEM = `You score ONE generated EventMaster invitation image for Central Africa / RDC.
Return ONLY valid JSON (json_object).

Image 1 is the GENERATED card to score. Any other images are references (people and/or a card to clone).

Be strict on:
- Identity: same people as references, no lookalike, no beautify, no skin lightening.
- Couple mode: Image 1 references after the generated card are the couple; generated faces must match them, not the incoming card faces.
- Couple gender & face alignment: groom/man's face MUST be on male body/suit/tuxedo; bride/woman's face MUST be on female body/dress/gown. Flag "gender_mismatch" if bride and groom faces are inverted or swapped onto wrong bodies!
- People count vs expectedPeople.
- Painted letters / names / dates when textInPixels is "forbidden".
- Invented Caucasian / white luxury hosts when no people refs exist.
- Mode: create vs clone vs refine vs couple.

Be lenient on minor floral density, foil shine, or taste.

Exact schema:
{
  "pass": true | false,
  "score": 0,
  "defects": ["painted_text" | "wrong_faces" | "gender_mismatch" | "wrong_people_count" | "skin_lightened" | "beautified" | "wrong_mode" | "invented_white_hosts" | "kept_original_faces"],
  "retryDirective": "one English sentence: the single fix to apply, positive framing, no redesign"
}

score is 0-10. pass=false if any hard identity / text / ethnicity / gender inversion defect. retryDirective empty only if pass=true.`;

export type InvitationImageJudgeDefect =
  | 'painted_text'
  | 'wrong_faces'
  | 'gender_mismatch'
  | 'wrong_people_count'
  | 'skin_lightened'
  | 'beautified'
  | 'wrong_mode'
  | 'invented_white_hosts'
  | 'kept_original_faces';

export type InvitationImageJudgeVerdict = {
  pass: boolean;
  score: number;
  defects: string[];
  retryDirective: string;
};

const KNOWN_JUDGE_DEFECTS = new Set<string>([
  'painted_text',
  'wrong_faces',
  'gender_mismatch',
  'wrong_people_count',
  'skin_lightened',
  'beautified',
  'wrong_mode',
  'invented_white_hosts',
  'kept_original_faces',
]);

export function parseInvitationImageJudgeVerdict(raw: unknown): InvitationImageJudgeVerdict | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const scoreRaw = Number(v.score);
  const score = Number.isFinite(scoreRaw) ? Math.min(10, Math.max(0, Math.round(scoreRaw))) : 5;
  const defects = (Array.isArray(v.defects) ? v.defects : [])
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => {
      const key = item.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 40);
      return KNOWN_JUDGE_DEFECTS.has(key) ? key : key;
    })
    .slice(0, 8);
  const retryDirective = collapseSpaces(typeof v.retryDirective === 'string' ? v.retryDirective : '').slice(0, 240);
  return {
    pass: v.pass === true && defects.length === 0,
    score,
    defects,
    retryDirective,
  };
}

export function shouldRetryInvitationImage(
  verdict: InvitationImageJudgeVerdict | null | undefined,
  minScore = INVITATION_IMAGE_JUDGE_MIN_SCORE,
): boolean {
  if (!verdict) return false;
  return !verdict.pass || verdict.score < minScore;
}

export function buildInvitationImageJudgeUserText(input: {
  intent: InvitationPipelineIntent;
  originalBrief: string;
  locks: string[];
  expectedPeople: number;
  embedText?: boolean;
  isPublic?: boolean;
}): string {
  const textRule = input.isPublic || !input.embedText
    ? 'textInPixels: forbidden'
    : 'textInPixels: allowed (names, date, venue from the brief)';
  const locks = input.locks.slice(0, 8).map((lock) => `- ${lock}`).join('\n');
  return [
    `MODE: ${input.intent}`,
    `BRIEF: ${collapseSpaces(input.originalBrief).slice(0, 500)}`,
    `LOCKS:\n${locks || '- none'}`,
    `expectedPeople: ${Math.max(0, Math.round(input.expectedPeople))}`,
    textRule,
    'Image 1 is the GENERATED invitation to score. Other images are references only.',
  ].join('\n');
}

export function buildInvitationImageRetryPrompt(
  basePrompt: string,
  verdict: InvitationImageJudgeVerdict,
): string {
  const defect = verdict.defects[0];
  let defaultDirective = 'Restore honest faces, correct people count, and no painted letters unless requested. Do not redesign.';
  if (defect === 'gender_mismatch') {
    defaultDirective = 'GENDER FIX: Groom/male face goes strictly onto male body/suit and bride/female face strictly onto female body/gown. Do NOT invert genders.';
  } else if (defect) {
    defaultDirective = `Fix ${defect.replace(/_/g, ' ')} while keeping every lock.`;
  }
  const directive = verdict.retryDirective || defaultDirective;
  return collapseSpaces(
    [
      basePrompt,
      'RETRY (one pass only): Fix this defect without redesigning.',
      directive,
      'Keep every LOCK. Same people. Same 9:16.',
    ].join('\n'),
  ).slice(0, COMPACT_IMAGE_PROMPT_MAX_CHARS);
}

export const COUPLE_FACE_SWAP_DEFAULT_PROMPT =
  'Remplace uniquement les visages de cette invitation par les visages du couple. Conserve la pose, les tenues, le décor et la mise en page.';

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
  coupleFaceSwap?: boolean;
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

export function buildReferenceRoles(
  referenceCount: number,
  options?: { coupleFaceSwap?: boolean; genderMappingDirective?: string },
): string {
  if (referenceCount <= 0) return '';
  if (options?.coupleFaceSwap) {
    const lines = [
      'REFERENCE ROLES (couple face replacement — organizer requested):',
      'Image 1: INCOMING INVITATION / SCENE — object fidelity. Keep composition, pose, bodies, wardrobe, décor, lighting and ornaments. Do NOT keep the original faces that appear on this card.',
    ];
    for (let i = 1; i < referenceCount; i += 1) {
      const n = i + 1;
      const side = i === 1 ? 'left / primary host' : i === 2 ? 'right / secondary host' : `host ${n - 1}`;
      lines.push(
        `Image ${n} (${side}): COUPLE IDENTITY lock. Replace a face on Image 1 with this exact person (honest pixels only — no beautify, no lighten, no celebrity lookalike).`,
      );
    }
    if (options?.genderMappingDirective) {
      lines.push(options.genderMappingDirective);
    } else {
      lines.push(
        'GENDER & POSITION BINDING (STRICT - DO NOT INVERT): Match reference faces to bodies strictly by apparent gender and wedding attire first. The MAN/GROOM from reference photos MUST replace the MAN/GROOM body on Image 1 (suit/tuxedo). The WOMAN/BRIDE from reference photos MUST replace the WOMAN/BRIDE body on Image 1 (bridal gown/dress). NEVER swap or invert bride and groom faces.',
      );
    }
    return lines.join('\n');
  }
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
export function buildHonestFaceIdentityHeader(
  referenceCount: number,
  options?: { coupleFaceSwap?: boolean; genderMappingDirective?: string },
): string {
  if (referenceCount <= 0) return '';
  if (options?.coupleFaceSwap && referenceCount >= 2) {
    return [
      '=== 1. COUPLE FACE REPLACEMENT (organizer requested — FIRST) ===',
      'Image 1 is the incoming invitation or scene. Keep its layout, pose, bodies, clothes, décor and lighting.',
      `Images 2–${referenceCount} are the couple identity photos. Replace ONLY the face(s) on Image 1 with these exact people.`,
      options?.genderMappingDirective ||
        'GENDER & ATTIRE FIDELITY (MANDATORY): Match each person strictly by gender and ceremonial role. The male face goes on the male body (suit/tuxedo), the female face goes on the female body (gown/dress). NEVER invert bride and groom faces.',
      'Render each replacement face as honestly as photographed: bone structure, eyes, smile, cheek volume, skin tone, pores, moles/scars, age. Do not beautify, symmetrize, slim, lighten or airbrush.',
      NANO_BANANA_HARMONIZATION_DIRECTIVE,
      'Do not invent a new couple. Do not keep the original faces from Image 1.',
      NANO_BANANA_CRITICAL_CONSTRAINT,
      NANO_BANANA_STYLE_INSTRUCTION,
      NANO_BANANA_LIGHT_RIG_COHERENCE,
      NANO_BANANA_OPTICAL_BOKEH,
      'If any text in the brief conflicts with the couple photos, obey the couple photos for faces and Image 1 for the card.',
    ].join('\n');
  }
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
  options?: InvitationPromptOptions,
): string {
  const cleaned = collapseSpaces(decorBrief).slice(0, 900);
  if (!cleaned) return '';

  const referenceCount = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  const coupleFaceSwap = Boolean(options?.coupleFaceSwap) && referenceCount >= 2;
  const looksLikeRefine = /retouch|ajust|refin|altér|réajust|modifier/i.test(cleaned);
  const looksLikeClone = !looksLikeRefine && /copi|clon|reprodu|duplicate|faithful|moderni/i.test(cleaned);
  const verb = coupleFaceSwap
    ? 'Replace'
    : looksLikeRefine
    ? 'Refine and alter'
    : looksLikeClone
    ? 'Clone and redesign'
    : 'Compose';

  const subject = coupleFaceSwap
    ? 'a vertical print-ready luxury invitation card whose incoming layout comes from Image 1 and whose hosts are the exact couple from Images 2+'
    : referenceCount > 0
      ? 'a vertical print-ready luxury invitation card featuring the exact people from the attached reference photos (faces unchanged)'
      : 'a vertical print-ready luxury invitation card for a real Central African / RDC celebration';

  const hasTextModifications =
    /(?:remplace|modifi|chang).{0,50}(?:texte|titre|date|nom|description|écrit)|CARD VARIABLES|Replace on model image|écrits?|nouveaux? noms?/i.test(
      cleaned,
    );
  const action = coupleFaceSwap
    ? hasTextModifications
      ? 'keeping Image 1’s composition, pose, bodies, wardrobe, décor, lighting and ornaments while replacing faces with the couple identity photos (matching groom to suit and bride to gown) and updating typography to match new brief details'
      : 'keeping Image 1’s composition, pose, bodies, wardrobe, décor, lighting and ornaments while replacing only the faces with the couple identity photos (matching groom to suit and bride to gown)'
    : looksLikeRefine
    ? 'faithfully preserving the overall visual composition, layout, color palette, ornaments, framing, and existing typography/people of the reference card, applying precisely the requested targeted adjustment'
    : looksLikeClone
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
  if (coupleFaceSwap) {
    styleParts.push('card and décor locked to Image 1 — faces locked to the couple photos only');
  } else if (referenceCount > 0) {
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
  options?: InvitationPromptOptions,
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
- coupleFaceSwap: ${options?.coupleFaceSwap ? 'yes' : 'no'}

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
  const coupleFaceSwap = Boolean(processed.coupleFaceSwap);
  const imageBrief = coupleFaceSwap
    ? [
        'USER BRIEF (English scene — replace faces on Image 1 with the couple in Images 2+):',
        narrative,
        'Replace ONLY the faces on the incoming card. Keep pose, bodies, wardrobe, décor, lighting and typography.',
        NANO_BANANA_CRITICAL_CONSTRAINT,
        NANO_BANANA_STYLE_INSTRUCTION,
        NANO_BANANA_LIGHT_RIG_COHERENCE,
        NANO_BANANA_OPTICAL_BOKEH,
      ].join('\n')
    : hasRefs
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

  const honestyNote = coupleFaceSwap
    ? processed.beautifyStripped
      ? ' (couple face replacement — beautify/smooth/lighten ignored; couple photos remain truth)'
      : ' (couple face replacement — Image 1 card kept, faces from Images 2+)'
    : hasRefs
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
  options?: InvitationPromptOptions,
): ProcessedInvitationPrompt {
  const originalBrief = collapseSpaces(prompt).slice(0, 1500);
  const referenceCount = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  const coupleFaceSwap = Boolean(options?.coupleFaceSwap) && referenceCount >= 2;
  const { text: cleaned, stripped } = stripFaceBeautifyLanguage(originalBrief);
  const explicitAppearanceChange = EXPLICIT_FACE_CHANGE.test(originalBrief);
  const decorBrief = cleaned || originalBrief;
  const englishSceneBrief = buildEnglishSceneBriefScaffold(decorBrief, {
    referenceCount,
    embedText: options?.embedText,
    artStyleLine: options?.artStyleLine,
    coupleFaceSwap,
  });

  const honestyNote = coupleFaceSwap
    ? stripped
      ? ' (couple face replacement — beautify/smooth/lighten ignored; couple photos remain truth)'
      : ' (couple face replacement — Image 1 card kept, faces from Images 2+)'
    : referenceCount
    ? stripped
      ? ' (face beautify / smooth / lighten requests were ignored — photos remain truth)'
      : ' (faces = reference photo pixels, no idealization)'
    : '';

  const visionBrief = collapseSpaces(`${englishSceneBrief}${honestyNote}`);

  const hasTextModifications =
    /(?:remplace|modifi|chang).{0,50}(?:texte|titre|date|nom|description|écrit)|CARD VARIABLES|Replace on model image|écrits?|nouveaux? noms?/i.test(
      originalBrief,
    );
  const imageBrief = coupleFaceSwap
    ? [
        'USER BRIEF (English scene — replace faces on Image 1 with the couple in Images 2+):',
        englishSceneBrief,
        hasTextModifications
          ? 'Replace the faces on Image 1 (strictly matching groom face to male body/suit, bride face to female body/gown). Harmonize jawline, neck, and skin tones with the lighting. Do NOT keep old names, dates or text from Image 1. Leave clean card space for overlay typography.'
          : 'Replace ONLY the faces on the incoming card (strictly matching groom face to male body/suit, bride face to female body/gown). Harmonize jawline, neck, and skin tones with scene lighting. Keep pose, bodies, wardrobe, décor and lighting. Do not paint old names on clean background.',
        NANO_BANANA_CRITICAL_CONSTRAINT,
        NANO_BANANA_STYLE_INSTRUCTION,
        NANO_BANANA_LIGHT_RIG_COHERENCE,
        NANO_BANANA_OPTICAL_BOKEH,
        NANO_BANANA_HARMONIZATION_DIRECTIVE,
      ].join('\n')
    : referenceCount
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
    identityHeader: buildHonestFaceIdentityHeader(referenceCount, {
      coupleFaceSwap,
      genderMappingDirective: options?.genderMappingDirective,
    }),
    referenceRoles: buildReferenceRoles(referenceCount, {
      coupleFaceSwap,
      genderMappingDirective: options?.genderMappingDirective,
    }),
    beautifyStripped: stripped,
    explicitAppearanceChange,
    coupleFaceSwap,
  };
}

export function buildGeminiSceneSteps(embedText: boolean, options?: { coupleFaceSwap?: boolean }): string {
  return [
    '=== SCENE STEPS (Gemini step-by-step) ===',
    options?.coupleFaceSwap
      ? 'First, keep Image 1’s card, pose, bodies and décor. Then lock replacement faces from Images 2+ — honest pixels, no idealization.'
      : 'First, lock every face from the character-consistency references — honest pixels, no idealization.',
    options?.coupleFaceSwap
      ? 'Then, compose one vertical 9:16 print-ready invitation that is the incoming card with only the couple faces replaced.'
      : 'Then, compose one vertical 9:16 print-ready invitation (paper, florals, frame, lighting) from the English scene brief and organizer context.',
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
 * Important : inspecte UNIQUEMENT les champs structurels de blocage et les messages d'erreur.
 * Ne sérialise JAMAIS le payload brut en chaîne complète pour éviter les faux positifs
 * sur les métadonnées de base64 ou les catégories standards déclarées avec probabilité NEGLIGIBLE.
 */
export function isSafetyFilterTriggered(textOrErr: unknown, jsonPayload?: unknown): boolean {
  if (typeof textOrErr === 'string' && isSafetyText(textOrErr)) return true;
  if (textOrErr instanceof Error && isSafetyText(textOrErr.message)) return true;

  if (jsonPayload && typeof jsonPayload === 'object') {
    try {
      const p = jsonPayload as Record<string, unknown>;

      // 1. promptFeedback (Google Gemini generateContent)
      if (p.promptFeedback && typeof p.promptFeedback === 'object') {
        const pf = p.promptFeedback as Record<string, unknown>;
        const br = String(pf.blockReason || '').toUpperCase();
        if (br && br !== 'NONE' && (br.includes('SAFETY') || br.includes('BLOCK') || br.includes('PROHIBITED') || br.includes('SPII'))) {
          return true;
        }
      }

      // 2. candidates finishReason & safetyRatings (Google Gemini generateContent)
      if (Array.isArray(p.candidates) && p.candidates[0] && typeof p.candidates[0] === 'object') {
        const c = p.candidates[0] as Record<string, unknown>;
        const fr = String(c.finishReason || '').toUpperCase();
        if (fr && (fr.includes('SAFETY') || fr.includes('PROHIBITED') || fr.includes('BLOCK') || fr.includes('SPII'))) {
          return true;
        }
        if (Array.isArray(c.safetyRatings)) {
          for (const rating of c.safetyRatings as Array<Record<string, unknown>>) {
            if (rating?.blocked === true) return true;
          }
        }
      }

      // 3. Statut au niveau racine (Interactions API ou standard)
      if (typeof p.status === 'string') {
        const s = p.status.toUpperCase();
        if (s.includes('BLOCK') || s === 'REJECTED') {
          return true;
        }
      }

      // 4. Objet error de l'API Google
      if (p.error && typeof p.error === 'object') {
        const errObj = p.error as Record<string, unknown>;
        const errMsg = String(errObj.message || '');
        const errStatus = String(errObj.status || '');
        if (isSafetyText(errMsg) || isSafetyText(errStatus)) {
          return true;
        }
      }

      // 5. Steps (Google Interactions API)
      if (Array.isArray(p.steps)) {
        for (const step of p.steps as Array<Record<string, unknown>>) {
          if (typeof step.status === 'string' && step.status.toUpperCase().includes('BLOCK')) {
            return true;
          }
          if (step.error && typeof step.error === 'object') {
            const msg = String((step.error as Record<string, unknown>).message || '');
            if (isSafetyText(msg)) return true;
          }
        }
      }
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

export type InvitationImageVariantRole = 'faithful' | 'ample';

/** Variante A : coller au brief, cadrage serré, aucun extra. */
export function buildFaithfulImagePrompt(basePrompt: string): string {
  return collapseSpaces(
    [
      basePrompt,
      'VARIANT A — FAITHFUL: Follow the brief and locks exactly. Tight ceremonial framing. Do not add extra crowds, extra ornaments, or a wider scene.',
    ].join('\n'),
  ).slice(0, COMPACT_IMAGE_PROMPT_MAX_CHARS);
}

/** Variante B : même événement et mêmes visages, plus d’espace et de matière. */
export function buildAmpleImagePrompt(basePrompt: string, hasReferences = false): string {
  const identity = hasReferences
    ? 'Same hosts as the references — faces, skin, hair and clothes stay locked.'
    : 'Same celebration, same palette, same locks.';
  return collapseSpaces(
    [
      basePrompt,
      'VARIANT B — AMPLE: Same event and same people.',
      identity,
      'Give more breathing room: wider ceremonial space, richer florals and materials, more paper and foil atmosphere.',
      'Do not change faces, people count, or invent a new event.',
    ].join('\n'),
  ).slice(0, COMPACT_IMAGE_PROMPT_MAX_CHARS);
}

export function buildVariantImagePrompt(
  basePrompt: string,
  hasReferences = false,
  role: InvitationImageVariantRole = 'ample',
): string {
  return role === 'faithful'
    ? buildFaithfulImagePrompt(basePrompt)
    : buildAmpleImagePrompt(basePrompt, hasReferences);
}

export type InvitationCopyLanguage = 'fr' | 'ln' | 'sw' | 'kg' | 'lua';
export type InvitationCopyRole =
  | 'greeting'
  | 'kicker'
  | 'title'
  | 'datetime'
  | 'venue'
  | 'body'
  | 'rsvp';

export type InvitationCopyLine = {
  role: InvitationCopyRole;
  text: string;
};

export type InvitationCopyDraft = {
  language: InvitationCopyLanguage;
  lines: InvitationCopyLine[];
};

const COPY_LANGUAGES: readonly InvitationCopyLanguage[] = ['fr', 'ln', 'sw', 'kg', 'lua'];
const COPY_ROLES: readonly InvitationCopyRole[] = [
  'greeting',
  'kicker',
  'title',
  'datetime',
  'venue',
  'body',
  'rsvp',
];

export const INVITATION_COPY_RSVP: Record<InvitationCopyLanguage, string> = {
  fr: 'Confirmer votre présence',
  ln: 'Kondima kozala wana',
  sw: 'Thibitisha uwepo wako',
  kg: 'Tula kimbangi ya kukwiza',
  lua: 'Jadika dikalapu diebe',
};

export const INVITATION_COPY_SYSTEM = `You write EventMaster invitation overlay copy for Central Africa / RDC.
The artwork already exists. You ONLY write editor text layers. Do not describe the image.

Rules:
- Return ONLY valid JSON (json_object).
- One language for every line. If the brief is Lingala, Swahili, Kikongo or Tshiluba, write ALL lines in that language. Do not fall back to French.
- Public templates: never invent private names or fixed calendar dates. Use {{title}}, {{date}}, {{location}}, {{firstName}}.
- Private templates: keep names, date and venue from the brief. Do not invent missing facts.
- 5–7 short ceremonial lines. No hashtags, no emoji, no markdown.
- Include exactly one rsvp line.

Exact schema:
{
  "language": "fr" | "ln" | "sw" | "kg" | "lua",
  "lines": [
    { "role": "greeting" | "kicker" | "title" | "datetime" | "venue" | "body" | "rsvp", "text": "string" }
  ]
}`;

export function detectInvitationCopyLanguage(brief: string): InvitationCopyLanguage {
  const text = String(brief || '');
  if (/\blingala\b|libyangi|boya tosepela|mokolo\s*:|esika\s*:|kondima kozala/i.test(text)) return 'ln';
  if (/\bswahili\b|kiswahili|mwaliko wa|karibuni|tarehe\s*:|mahali\s*:|thibitisha uwepo/i.test(text)) return 'sw';
  if (/\bkikongo\b|mbila ya nkinsi|kwizeno|kilumbu\s*:|kisika\s*:/i.test(text)) return 'kg';
  if (/\btshiluba\b|ciluba|dibikila|luayi tusankidile|dituku\s*:|muaba\s*:/i.test(text)) return 'lua';
  return 'fr';
}

export function parseInvitationCopyLanguage(
  value: unknown,
  fallback: InvitationCopyLanguage = 'fr',
): InvitationCopyLanguage {
  return typeof value === 'string' && (COPY_LANGUAGES as readonly string[]).includes(value)
    ? (value as InvitationCopyLanguage)
    : fallback;
}

export function parseInvitationCopyDraft(
  raw: unknown,
  fallbackLanguage: InvitationCopyLanguage = 'fr',
): InvitationCopyDraft | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const parsed = raw as Record<string, unknown>;
  const language = parseInvitationCopyLanguage(parsed.language, fallbackLanguage);
  const source = Array.isArray(parsed.lines)
    ? parsed.lines
    : Array.isArray(parsed.elements)
      ? parsed.elements
      : [];
  const seen = new Set<InvitationCopyRole>();
  const lines: InvitationCopyLine[] = [];
  for (const item of source) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const role = typeof row.role === 'string' ? row.role.trim() : '';
    const text = collapseSpaces(typeof row.text === 'string' ? row.text : '').slice(0, 220);
    if (!(COPY_ROLES as readonly string[]).includes(role) || !text) continue;
    const typedRole = role as InvitationCopyRole;
    if (seen.has(typedRole)) continue;
    seen.add(typedRole);
    lines.push({ role: typedRole, text });
    if (lines.length >= 7) break;
  }
  if (!seen.has('rsvp')) {
    lines.push({ role: 'rsvp', text: INVITATION_COPY_RSVP[language] });
  }
  if (lines.length < 3) return null;
  return { language, lines };
}

export function buildInvitationCopyUserText(input: {
  originalBrief: string;
  language: InvitationCopyLanguage;
  isPublic?: boolean;
  organizerContext?: string;
  intent?: InvitationPipelineIntent;
}): string {
  return [
    `MODE: ${input.intent || 'create'}`,
    `LANGUAGE: ${input.language}`,
    input.isPublic ? 'TEMPLATE: public — use {{title}}, {{date}}, {{location}}, {{firstName}} only.' : 'TEMPLATE: private — keep brief facts, do not invent missing names.',
    `BRIEF:\n"""\n${collapseSpaces(input.originalBrief).slice(0, 900)}\n"""`,
    input.organizerContext ? input.organizerContext.slice(0, 400) : '',
    'Write the overlay lines now.',
  ]
    .filter(Boolean)
    .join('\n');
}

const COPY_STACK: InvitationCopyRole[] = [
  'greeting',
  'kicker',
  'title',
  'datetime',
  'venue',
  'body',
  'rsvp',
];

export function applyInvitationCopyToElements(
  draft: InvitationCopyDraft,
  palette: { primary: string; secondary: string; accent: string },
): Record<string, unknown>[] {
  const byRole = new Map(draft.lines.map((line) => [line.role, line.text]));
  const elements: Record<string, unknown>[] = [];
  let index = 0;
  for (const role of COPY_STACK) {
    const text = byRole.get(role);
    if (!text) continue;
    if (role === 'rsvp') {
      elements.push({
        id: `ai-copy-rsvp-${index}`,
        type: 'rsvp-block',
        text,
        color: palette.accent,
        fontSize: '16px',
        align: 'center',
        width: 'full',
        rsvpPlacement: 'outside',
        positionMode: 'flow',
      });
      index += 1;
      continue;
    }
    const isTitle = role === 'title';
    const isGreeting = role === 'greeting';
    elements.push({
      id: `ai-copy-${role}-${index}`,
      type: 'text',
      text,
      color: isTitle ? palette.primary : palette.secondary,
      fontSize: isTitle ? '32px' : isGreeting ? '13px' : '16px',
      fontFamily: isTitle ? 'Playfair Display' : isGreeting ? 'Great Vibes' : 'Lora',
      align: 'center',
      width: 'full',
      bold: isTitle,
      italic: isGreeting,
      positionMode: 'flow',
    });
    index += 1;
    if (isTitle) {
      elements.push({
        id: `ai-copy-div-${index}`,
        type: 'divider',
        text: '',
        color: palette.accent,
        dividerStyle: 'ornament-diamond',
        align: 'center',
        width: 'full',
        positionMode: 'flow',
      });
      index += 1;
    }
  }
  return elements;
}


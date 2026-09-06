/**
 * Traitement des briefs utilisateur selon les recommandations Gemini Image
 * (Nano Banana) pour un rendu HONNÊTE des visages fournis en référence :
 * - ancre d’identité en tête de prompt
 * - rôle explicite de chaque image (character consistency vs object fidelity)
 * - high-fidelity detail preservation (« face remains completely unchanged »)
 * - scène narrative plutôt que mots-clés ; intention = carte d’invitation
 * - retirer le langage d’embellissement / blanchiment qui fait dériver le visage
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

export type ProcessedInvitationPrompt = {
  originalBrief: string;
  decorBrief: string;
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

export function processUserPromptForHonestFaces(
  prompt: string,
  options?: { referenceCount?: number },
): ProcessedInvitationPrompt {
  const originalBrief = collapseSpaces(prompt).slice(0, 1500);
  const referenceCount = Math.max(0, Math.min(options?.referenceCount ?? 0, 4));
  const { text: cleaned, stripped } = stripFaceBeautifyLanguage(originalBrief);
  const explicitAppearanceChange = EXPLICIT_FACE_CHANGE.test(originalBrief);
  const decorBrief = cleaned || originalBrief;

  const honestyNote = referenceCount
    ? stripped
      ? ' (les demandes d’embellir / lisser / blanchir les visages ont été ignorées : les photos restent la vérité)'
      : ' (visages = pixels des photos, sans idéalisation)'
    : '';

  const visionBrief = collapseSpaces(
    `${decorBrief}${honestyNote}`,
  );

  const imageBrief = referenceCount
    ? [
        'USER BRIEF (décor / card / mood only — never rewrite faces):',
        decorBrief,
        explicitAppearanceChange
          ? 'The user explicitly asked to change hair or clothing; apply ONLY that change. Keep the face identical.'
          : 'Do not change hair, clothing, skin or face unless the sentence above is an explicit wardrobe/hair request.',
      ].join('\n')
    : decorBrief;

  return {
    originalBrief,
    decorBrief,
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
    'Then, compose one vertical 9:16 print-ready invitation (paper, florals, frame, lighting) from the user brief and organizer context.',
    embedText
      ? 'Finally, embed sharp invitation lettering (names, date, venue from the brief) in the lower third or a cartouche that does not cover eyes, smile or cheeks.'
      : 'Finally, leave clean negative space for later typography — no readable names, dates, logos or watermarks.',
  ].join('\n');
}

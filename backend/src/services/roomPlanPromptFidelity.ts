/**
 * Traitement des briefs de plan de salle selon les recommandations Gemini :
 * - scène narrative plutôt que liste de mots-clés
 * - framing positif, verbe fort, détails concrets (matériaux, axes, focal)
 * - reformulation du brief utilisateur en anglais
 *   [Subject] + [Action] + [Location/context] + [Composition] + [Style]
 */

function collapseSpaces(value: string): string {
  return value.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** System prompt for Gemini room-plan brief reformulation. */
export const ROOM_PLAN_BRIEF_REFORMULATION_SYSTEM = `You rewrite venue floor-plan briefs for Gemini (EventMaster reception architect, Central Africa / RDC).

Rules (non-negotiable):
1) Output ONLY valid JSON: {"englishSceneBrief":"...","preservedFacts":["..."],"intent":"wedding|banquet|conference|cocktail|tent|other"}
2) Write englishSceneBrief in clear English as a directorial layout narrative — NOT a keyword list.
3) Follow: [Subject] + [Action] + [Location/context] + [Composition] + [Style].
4) Start with a strong verb (Compose / Design / Lay out / Arrange…).
5) Be specific about: guest count, table count/shape, rows, doors, aisle, stage/podium, dance floor, DJ/screen, buffet/bar, florals, chandeliers, materials and hex colors when given.
6) Use positive framing (describe the layout to build, not a list of prohibitions).
7) Preserve every factual detail: dimensions, room type, colors (#hex), chair styles, aisle styles, cultural motifs.
8) Prefer staggered / honeycomb round tables for banquets with at least 1.4m edge-to-edge clearance between tables; ceremony aisle toward honor table or stage; clear 1.2m circulation along walls; never stack or overlap chairs (keep at least 0.7m center distance).
9) Do not invent amphitheater seating or a tent roof unless the brief asks for them.
10) Keep englishSceneBrief under 450 words. No markdown.`;

export type ProcessedRoomPlanBrief = {
  originalBrief: string;
  cleanedBrief: string;
  englishSceneBrief: string;
};

/**
 * Local scaffold (fallback): wrap the cleaned brief in an English Nano Banana-style narrative.
 */
export function buildRoomPlanEnglishSceneBriefScaffold(
  brief: string,
  options?: { roomType?: string; widthM?: number; heightM?: number },
): string {
  const cleaned = collapseSpaces(brief).slice(0, 1200);
  if (!cleaned) return '';

  const roomType = (options?.roomType || 'BANQUET').toUpperCase();
  const widthM = options?.widthM;
  const heightM = options?.heightM;
  const sizeBit =
    typeof widthM === 'number' && typeof heightM === 'number'
      ? `${widthM} m × ${heightM} m`
      : 'the declared venue footprint';

  const looksLikeCeremony = /c[eé]r[eé]mon|jardin|all[eé]e nupt|rang[eé]es|autel|officiant/i.test(cleaned);
  const looksLikeConference = /conf[eé]rence|th[eé][aâ]tre|r[eé]union|board|conseil|écran|screen/i.test(cleaned);
  const looksLikeCocktail = /cocktail|mange[- ]?debout|hightop|high[- ]?top|piste/i.test(cleaned);
  const looksLikeTent = /tente|tent|chapiteau|tentSwag/i.test(cleaned);

  let subject =
    'a lived-in banquet reception floor plan with clear circulation and a ceremonial focal point';
  if (looksLikeCeremony) {
    subject = 'a garden or hall ceremony seating plan with aisle, rows and honor podium';
  } else if (looksLikeConference) {
    subject = 'a professional conference / theater seating plan with stage, screen and clear egress';
  } else if (looksLikeCocktail) {
    subject = 'a cocktail reception plan with high-top islands, dance floor and service edges';
  } else if (looksLikeTent || roomType === 'TENT') {
    subject = 'a draped tent reception plan with honeycomb tables and soft outdoor materials';
  } else if (roomType === 'CONFERENCE' || roomType === 'AMPHITHEATER') {
    subject = 'a professional seating plan with stage focus and ordered rows';
  }

  return collapseSpaces(
    [
      'Compose this venue layout.',
      `[Subject] ${subject}.`,
      '[Action] Place doors and service exits first, then the ceremonial axis (aisle / sightline), then the focal stage or honor table, then guest seating in staggered clusters, then dance/DJ/screen, florals at thresholds and chandeliers above activity nodes.',
      `[Location/context] EventMaster reception room type ${roomType}, canvas ${sizeBit}, Central Africa hospitality standards.`,
      '[Composition] Top-down 0–100% box coordinates; keep 1.2–1.8 m clear along walls; continuous path door → aisle → seats → stage; no military grid of identical gaps.',
      '[Style] Coherent materials and real #rrggbb colors from the brief (oak parquet, linen, walnut, crystal or lantern fixtures only when justified).',
      `[User intent — preserve every fact] ${cleaned}`,
    ].join(' '),
  ).slice(0, 1600);
}

export function buildRoomPlanBriefReformulationUserText(
  originalBrief: string,
  options?: { roomType?: string; widthM?: number; heightM?: number },
): string {
  const roomType = options?.roomType || 'BANQUET';
  const size =
    typeof options?.widthM === 'number' && typeof options?.heightM === 'number'
      ? `${options.widthM} m × ${options.heightM} m`
      : 'unspecified';
  return `ORIGINAL USER BRIEF (any language — preserve facts):
"""
${originalBrief.slice(0, 1500)}
"""

Context flags:
- roomType: ${roomType}
- canvas: ${size}

Rewrite into englishSceneBrief now.`;
}

export function parseRoomPlanEnglishSceneBriefFromJson(raw: unknown): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const value = (raw as Record<string, unknown>).englishSceneBrief;
  if (typeof value !== 'string') return '';
  return collapseSpaces(value).slice(0, 1600);
}

export function processRoomPlanBrief(
  brief: string,
  options?: { roomType?: string; widthM?: number; heightM?: number },
): ProcessedRoomPlanBrief {
  const originalBrief = collapseSpaces(brief).slice(0, 1500);
  const cleanedBrief = originalBrief;
  const englishSceneBrief = buildRoomPlanEnglishSceneBriefScaffold(cleanedBrief, options);
  return { originalBrief, cleanedBrief, englishSceneBrief };
}

export function applyRoomPlanEnglishSceneBrief(
  processed: ProcessedRoomPlanBrief,
  englishSceneBrief: string,
): ProcessedRoomPlanBrief {
  const narrative = collapseSpaces(englishSceneBrief).slice(0, 1600);
  if (!narrative) return processed;
  return { ...processed, englishSceneBrief: narrative };
}

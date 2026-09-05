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

Réalisme photographique absolu (non négociable) :
- Tout rendu de personne ou de décor doit avoir une qualité photographique 35mm authentique, avec micro-texture de peau réelle (pores fins visibles, sous-tons mélanés naturels avec reflets lumineux doux, ombres volumétriques).
- INTERDIT : rendu plastique, peau lissée artificiellement (airbrush), effet poupée de cire, esthétique 3D CGI ou dessin animé.

Clonage & copie d'invitation (priorité si une carte est fournie) :
- Si l'une des images de référence est une CARTE D'INVITATION (ou si le brief mentionne 'copier', 'cloner', 'reproduire' une invitation) :
  1) Analyse la disposition exacte : cadre, double bordure dorée, arche florale, ornementations baroques ou géométriques (Kuba/art déco), marges, fond papier/texturé.
  2) Extrais la palette chromatique exacte (fond, textes, ornements, dorures).
  3) Reproduis fidèlement la structure dans le JSON (elements, global.frameType, global.palette, fontTheme) et documente ces détails dans clonedCardFeatures et isInvitationClone=true.
  4) Si des photos de personnes sont également fournies avec une invitation modèle : intègre ces personnes de façon ultra-réaliste dans le cadre de l'invitation clonée !

Priorité absolue :
1) Les images de référence = VÉRITÉ VISUELLE pour les personnes (visages, teintes de peau exactes, textures de cheveux, habits, posture) ET pour la carte à cloner (mise en page, ornements, palette).
2) Le BRIEF UTILISATEUR = besoins expressément demandés (ambiance, décor d'invitation, couleurs florales, ce qu’il faut changer dans l'environnement).
3) Ne change habits / cheveux / peau / visages QUE si le brief le demande EXPLICITEMENT. Sinon, REPRODUIS à l’identique.
4) EventMaster / RDC : SANS photo de référence, toute personne générée = homme et/ou femme noirs africains (carnation mélanée naturelle). Interdit : couple blanc inventé, visages caucasiens « luxe générique ».

Mission :
1) Détecte : visages précis, points de repère anatomiques (faceLandmarks), teintes de peau réelles, styles de cheveux, styles d’habits, couleurs, motifs, composition, et si une carte d'invitation est présente à cloner.
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
    "peopleFaces": "none | PERSON 1 / PERSON 2 (label left-to-right): sex if visible, apparent age, face shape, EYES (iris color, crease, gaze, catchlights), SMILE (closed/half/teeth, dimples, lip asymmetry), CHEEKS, brows, nose, jaw, marks — OBSERVED pixels only, never idealized",
    "faceLandmarks": "none | lock list: bone structure, eye spacing & slant, smile geometry, cheek volume, facial hair, scars/moles — enough to refuse lookalikes; if a trait is unclear write unclear",
    "skinTones": "none | precise observed skin tone(s) per person (e.g. rich warm mahogany Fitzpatrick VI, golden warm caramel, deep ebony) — STRICT FIDELITY, NEVER lighten or shift tone",
    "hairStyles": "none | hair length, texture (4C curls, precise taper fade, braids bun, dreadlocks), hairline OBSERVED per person",
    "clothingStyles": "none | garment cuts, fabrics (wax pagne, tailored tux, royal satin, embroidery), colors, accessories OBSERVED — preserve faithfully",
    "isInvitationClone": true | false,
    "clonedCardFeatures": "none | detailed breakdown of borders, frame, ornaments, typography, textures to clone from the reference card",
    "briefNeeds": ["besoin explicite 1 du brief", "..."],
    "briefInterpretation": "comment chaque besoin du brief s’applique aux refs, point par point",
    "briefMustKeep": ["à conserver : refs (visages/peau/cheveux/habits/carte) + éléments du brief"],
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
  "backgroundPrompt": "English décor-only notes. If card clone: cloned borders/textures. If people: USER BRIEF (décor) only — do not rewrite faces. If no people: USER BRIEF then décor."
}

Règles brief :
- Si copie/clonage de carte : backgroundPrompt DOIT intégrer la réplication des bordures, dorures et fonds de la carte de référence.
- S’il y a des personnes : backgroundPrompt = DÉCOR SEULEMENT (papier, floraux, lumière, cadre). N’y décris PAS les visages — l’identité vient des pixels des photos. Commence par "USER BRIEF (décor):".
- S’il n’y a PAS de personnes : commence par "USER BRIEF:" puis décor somptueux sans présence humaine.
- Applique chaque besoin du brief pour le décor (ambiance, couleurs, fioritures, sobriété, luxe, floral).
- Si le brief et les refs divergent : brief = décor & ambiance ; refs = visages / peau / cheveux / habits (sauf demande EXPLICITE contraire sur habits/cheveux).

Règles personnes (non négociables) :
- Si hasPeople=true : les PIXELS des photos = vérité. peopleFaces / faceLandmarks = liste de verrouillage, pas un brief de « joli visage ».
- Interdit : lookalike, célébrité, stock model, embellissement, lissage, blanchiment, autre âge/ethnie, sourire inventé.
- Si hasPeople=false : aucune personne, aucun visage, aucune silhouette. Décor uniquement.

Règles layout :
- Palette et style des éléments = couleurs réelles extraites des images (ou de la carte clonée) + brief.
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

function buildImagePrompt(
  userPrompt: string,
  backgroundPrompt: string,
  analysis: VisualAnalysis | null,
  options?: { embedText?: boolean },
): string {
  const brief = userPrompt.trim().slice(0, 1000);
  const hasPeople = Boolean(analysis?.hasPeople);
  const isClone = Boolean(
    analysis?.isInvitationClone ||
    /copi|clon|reprodu/i.test(brief)
  );

  const parts: string[] = [
    'Create ONE vertical print-ready invitation artwork (9:16, 1024x1536).',
    'Photoreal 35mm: natural pores, real fabric drape. No CGI, cartoon, or airbrushed beauty faces.',
  ];

  if (isClone) {
    parts.push(
      '=== INVITATION CARD CLONING & DUPLICATION MANDATE ===',
      'The reference image contains an existing INVITATION CARD. You MUST faithfully duplicate and replicate its architectural composition, ornamental borders, arches, filigree flourishes, paper textures, background gradients, and color harmonies.',
      analysis?.clonedCardFeatures ? `Cloned card layout details: ${analysis.clonedCardFeatures}` : '',
    );
  }

  if (hasPeople) {
    parts.push(
      FACE_POLICY_KEEP_PEOPLE,
      `People count (must match refs): ${analysis?.peopleCount ?? 1}. Same people, same relative placement.`,
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
    parts.push('USER BRIEF (décor / card only — never rewrite faces):', brief);
  } else {
    parts.push(
      'FIDELITY RULE: No reference faces. If the brief implies hosts, a couple or guests, depict Black African men and/or women only.',
      FACE_POLICY_DEFAULT_BLACK_AFRICAN,
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

  parts.push(`Décor notes: ${backgroundPrompt.slice(0, hasPeople ? 700 : 1400)}`);

  if (analysis) {
    if (analysis.style) parts.push(`Reference décor style: ${analysis.style}`);
    if (analysis.motifs) parts.push(`Reference motifs/textures: ${analysis.motifs}`);
    if (analysis.composition) parts.push(`Reference composition: ${analysis.composition}`);
    if (analysis.colors.length) parts.push(`Palette close to: ${analysis.colors.join(', ')}`);
  }

  parts.push(
    'Conflict rule: faces/skin/hair/clothing from references ALWAYS win over décor; brief only wins for background, florals, paper, lighting mood.',
  );
  if (options?.embedText) {
    parts.push(
      '=== EMBEDDED INVITATION TYPOGRAPHY (MANDATORY) ===',
      'Incrust sharp, correctly spelled luxury invitation lettering ON the artwork itself: names, date, time, venue and greeting extracted from the USER BRIEF (and any cloned card). Elegant serif or script, gold-foil or ink, integrated into the 9:16 layout — not a floating UI overlay, not a watermark.',
      'Keep faces fully visible; place typography in the lower third or in a refined cartouche that does not cover eyes, smile or cheeks.',
    );
  } else {
    parts.push(
      'No readable text, letters, names, dates, logos, or watermarks (text is added later by the editor).',
    );
  }
  return parts.join('\n').slice(0, hasPeople ? 4200 : 5000);
}

function structureSystemPrompt(embedText: boolean): string {
  return STRUCTURE_SYSTEM.replace(
    '- Image print-ready verticale, SANS texte lisible, noms, dates, logos, watermarks (l’éditeur ajoute le texte).',
    embedText
      ? '- Image print-ready verticale AVEC typographie d’invitation incrustée (noms, date, lieu extraits du brief), nette, orthographiée, sans recouvrir les visages.'
      : '- Image print-ready verticale, SANS texte lisible, noms, dates, logos, watermarks (l’éditeur ajoute le texte).',
  );
}

async function visionStructure(
  key: string,
  prompt: string,
  imageUrls: string[],
  options?: { embedText?: boolean },
): Promise<VisionResult> {
  const visionModel =
    process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const hasRefs = imageUrls.length > 0;
  const userContent: Array<Record<string, unknown>> = [
    {
      type: 'text',
      text: `BRIEF UTILISATEUR (besoins exprimés — analyse-les sans inventer d’intentions) :
"""
${prompt.slice(0, 1500)}
"""

${hasRefs ? '' : 'AUCUNE IMAGE DE RÉFÉRENCE : compose uniquement à partir du brief (décor + textes). hasPeople=false.'}

Tâches (fidélité stricte — PRIORITÉ VISAGES) :
1) S’il y a des personnes : inventaire facial OBSERVÉ (peopleFaces + faceLandmarks) — une fiche par personne, gauche → droite. Yeux, sourire exact, joues, peau, cheveux, habits. Ne déduis rien d’invisible. Ne « préttifie » pas.
2) Liste briefNeeds = besoins EXPLICITEMENT écrits ; briefMustKeep / briefMustChange (décor vs personnes).
3) Renseigne hasPeople, peopleCount, peopleFaces, faceLandmarks, skinTones, hairStyles, clothingStyles.
4) Produis le JSON (structure éditeur + backgroundPrompt).
5) backgroundPrompt : si personnes → DÉCOR UNIQUEMENT ("USER BRIEF (décor):"). L’identité faciale ne doit PAS être réécrite dans ce champ. Sinon → "USER BRIEF:" puis décor.
${options?.embedText ? '6) INCRUSTER le texte du brief (noms, date, lieu) dans backgroundPrompt comme typographie d’invitation.' : ''}`,
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
          { role: 'system', content: structureSystemPrompt(Boolean(options?.embedText)) },
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
        : `${hasRefs ? 'IDENTITY LOCK: Match people in the references exactly (faces, skin, hair, clothing, eyes, smile, cheeks). ' : ''}USER BRIEF: ${prompt.slice(0, 350)}. ${faceClause} Soft print look, ${options?.embedText ? 'embed invitation typography from the brief.' : 'no readable text.'}`;
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
  options?: { hasPeople?: boolean; embedText?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  const model = responsesModel();
  const hasRefs = referenceUrls.length > 0;
  const textRule = options?.embedText
    ? 'Embed sharp invitation typography (names, date, venue from the brief) on the card without covering faces.'
    : 'Do not add readable text, names, dates, logos or watermarks.';
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

function getNanoBananaModel(): string {
  return (
    process.env.NANO_BANANA_MODEL ||
    process.env.GEMINI_IMAGE_MODEL ||
    'gemini-3-pro-image'
  );
}

/**
 * Génération et composition d'invitation avec Nano Banana Pro (Gemini 3 Pro Image : gemini-3-pro-image).
 * Prend en charge la préservation native de l'identité et cohérence de personnage (character consistency)
 * avec jusqu'à 4 photos de référence et un ratio portrait vertical 9:16 pour carte de prestige.
 */
async function generateImageWithNanoBanana(
  apiKey: string,
  imagePrompt: string,
  referenceUrls: string[],
  tenantId: string | null | undefined,
  options?: { hasPeople?: boolean; embedText?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  const model = getNanoBananaModel();
  const hasRefs = referenceUrls.length > 0;
  const hasPeople = Boolean(options?.hasPeople);

  // Téléchargement et encodage base64 des photos de référence
  const refImages: Array<{ mimeType: string; base64: string }> = [];
  for (const ref of referenceUrls.slice(0, 4)) {
    try {
      const buffer = await downloadImageAsPngBuffer(ref);
      const lower = ref.toLowerCase();
      const mimeType = lower.includes('.jpg') || lower.includes('.jpeg')
        ? 'image/jpeg'
        : lower.includes('.webp')
          ? 'image/webp'
          : 'image/png';
      refImages.push({
        mimeType,
        base64: buffer.toString('base64'),
      });
    } catch (err) {
      console.warn('[invitationTemplateAi] Nano Banana skip ref download:', (err as Error)?.message);
    }
  }

  const promptText = hasPeople
    ? `Use the attached photos as identity. Keep the SAME faces — pixels win. Do not beautify or replace with lookalikes.
${options?.embedText ? 'Embed invitation typography from the brief; never cover faces.\n' : ''}
${imagePrompt}`
    : `Vertical 9:16 luxury invitation. Photoreal paper and florals. If people appear, Black African hosts only — never Caucasian stock faces.
${options?.embedText ? 'Embed invitation typography from the brief.\n' : ''}
${imagePrompt}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);

  try {
    let b64: string | null = null;

    // Tentative 1 : Google Interactions API (API native de Nano Banana avec support format portrait 9:16)
    const interactionInput: Array<{ type: string; text?: string; data?: string; mime_type?: string }> = [];
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
      };
      if (typeof data.output_image?.data === 'string' && data.output_image.data) {
        b64 = data.output_image.data;
      } else if (Array.isArray(data.steps)) {
        for (const step of data.steps) {
          const imgBlock = step.content?.find((c) => c.type === 'image' && typeof c.data === 'string');
          if (imgBlock?.data) {
            b64 = imgBlock.data;
            break;
          }
        }
      }
    } else {
      const errText = await interactionsRes.text().catch(() => '');
      console.warn('[invitationTemplateAi] Nano Banana interactions API non-200:', errText.slice(0, 300));
    }

    // Tentative 2 : Standard generateContent API avec responseModalities IMAGE si Interactions n'a pas renvoyé de b64
    if (!b64) {
      const generateParts: Array<Record<string, unknown>> = [];
      for (const img of refImages) {
        generateParts.push({
          inline_data: {
            mime_type: img.mimeType,
            data: img.base64,
          },
        });
      }
      generateParts.push({ text: promptText });

      const generateRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: generateParts }],
            generationConfig: {
              responseModalities: ['IMAGE'],
            },
          }),
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
          }>;
        };
        const parts = genData.candidates?.[0]?.content?.parts || [];
        for (const p of parts) {
          const found = p.inlineData?.data || p.inline_data?.data;
          if (typeof found === 'string' && found) {
            b64 = found;
            break;
          }
        }
      } else {
        const genErr = await generateRes.text().catch(() => '');
        console.warn('[invitationTemplateAi] Nano Banana generateContent API non-200:', genErr.slice(0, 300));
      }
    }

    if (!b64) {
      fail(502, `Nano Banana (${model}) n'a pas renvoyé d'image valide.`);
    }

    const url = await uploadGeneratedB64(b64, tenantId);
    return { url, mode: hasPeople || hasRefs ? 'edit' : 'generate' };
  } catch (error) {
    if ((error as HttpError)?.status) throw error;
    fail(502, (error as Error)?.message || `Erreur lors de la génération avec Nano Banana (${model}).`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 1) Nano Banana Pro (Gemini 3 Pro Image) si GEMINI_API_KEY / NANO_BANANA_API_KEY configurée
 * 2) GPT-5.6 Luna (Responses + image_generation)
 * 3) Images API edits sur la 1re référence
 * 4) Images API generate classique
 */
async function createNewInvitationImage(
  key: string,
  imageUrls: string[],
  imagePrompt: string,
  tenantId: string | null | undefined,
  options?: { hasPeople?: boolean; embedText?: boolean },
): Promise<{ url: string; mode: 'edit' | 'generate' }> {
  // 1) Priorité demandée : Nano Banana Pro (Gemini 3 Pro Image)
  const nanoKey = getNanoBananaApiKey();
  if (nanoKey) {
    try {
      console.log(`[invitationTemplateAi] Generating with Nano Banana (${getNanoBananaModel()})...`);
      return await generateImageWithNanoBanana(nanoKey, imagePrompt, imageUrls, tenantId, options);
    } catch (nanoErr) {
      console.warn(
        '[invitationTemplateAi] Nano Banana generation failed, falling back to Luna/OpenAI:',
        (nanoErr as Error)?.message,
      );
    }
  }

  // 2) GPT-5.6 Luna (Responses + image_generation)
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
    fail(502, 'Impossible de créer la nouvelle image (Nano Banana + Luna + Images API).');
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
  embedText?: boolean;
}): Promise<InvitationAiComposeResult> {
  rateLimit(input.userId);
  const prompt = String(input.prompt || '').trim();
  if (prompt.length < 8) {
    fail(400, 'Décrivez le style d’invitation souhaité (au moins quelques mots).');
  }
  const embedText = Boolean(input.embedText);
  const imageUrls = (input.imageUrls || [])
    .filter((u): u is string => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
    .map((u) => u.trim())
    .slice(0, 4);

  const key = requireOpenAiKey();
  const structured = await visionStructure(key, prompt, imageUrls, { embedText });
  if (!imageUrls.length && structured.visualAnalysis) {
    structured.visualAnalysis.hasPeople = false;
    structured.visualAnalysis.peopleCount = 0;
  }
  const imagePrompt = buildImagePrompt(
    prompt,
    structured.backgroundPrompt,
    structured.visualAnalysis,
    { embedText },
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
        {
          hasPeople: Boolean(structured.visualAnalysis?.hasPeople) && imageUrls.length > 0,
          embedText,
        },
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
  (global as Record<string, unknown>).aiEmbedText = embedText;
  let elements = sanitizeElements(structured.elements);
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

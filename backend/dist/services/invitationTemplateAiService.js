"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeInvitationTemplateAi = composeInvitationTemplateAi;
const mandatoryRsvpFields_1 = require("../utils/mandatoryRsvpFields");
const cloudinaryService_1 = require("./cloudinaryService");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 4;
const rateBuckets = new Map();
function rateLimit(userId) {
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
function requireOpenAiKey() {
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
    "peopleFaces": "none | per person: age range if visible, precise face shape, eye shape & color, brows, nose contour, lips fullness & cupid bow, jawline, distinctive marks — OBSERVED only",
    "faceLandmarks": "none | detailed likeness landmarks: bone structure, eye spacing & slant, cheekbones, smile/expression, facial hair lines, scars/moles — sufficient to guarantee 100% identity lock",
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
  "backgroundPrompt": "English prompt. If card clone: specify CLONED INVITATION CARD LAYOUT with exact borders/textures. If people: start with IDENTITY LOCK + face inventory from refs, THEN USER BRIEF for décor only. If no people: USER BRIEF then décor."
}

Règles brief :
- Si copie/clonage de carte : backgroundPrompt DOIT intégrer la réplication des bordures, dorures et fonds de la carte de référence.
- S’il y a des personnes : backgroundPrompt DOIT commencer par "IDENTITY LOCK & PHOTOREALISM:" (anglais) — les photos de référence sont l'unique source de vérité pour l'identité faciale ; puis "FACE INVENTORY:" (traits anatomiques observés, carnation, coiffure) ; puis "USER BRIEF:" (décor/ambiance d'invitation seulement).
- S’il n’y a PAS de personnes : commence par "USER BRIEF:" puis décor somptueux sans présence humaine.
- Applique chaque besoin du brief pour le décor (ambiance, couleurs, fioritures, sobriété, luxe, floral).
- Si le brief et les refs divergent : brief = décor & ambiance ; refs = visages / peau / cheveux / habits (sauf demande EXPLICITE contraire sur habits/cheveux).

Règles personnes (non négociables) :
- Si hasPeople=true : LOCK d’identité absolu — même personne(s) que sur les photos, ressemblance photographique stricte à 100%.
- Interdit : stock models, « couple générique », embellissement IA, lissage excessif, blanchiment de peau, changement d’âge/ethnie/traits, morphing, autre visage « proche ».
- peopleFaces + faceLandmarks doivent être assez détaillés pour verrouiller la géométrie du visage.
- Si hasPeople=false : aucune personne, aucun visage, aucune silhouette. Décor uniquement.

Règles layout :
- Palette et style des éléments = couleurs réelles extraites des images (ou de la carte clonée) + brief.
- 6 à 12 éléments max, disposition empilée (flow), centrée.
- Variables {{title}}, {{date}}, {{location}}, {{firstName}} dans les textes quand pertinent.
- Exactement un élément "rsvp-block" avec rsvpPlacement "outside" et text "Confirmer votre présence".
- Image print-ready verticale, SANS texte lisible, noms, dates, logos, watermarks (l’éditeur ajoute le texte).
- Ne mets pas de markdown. JSON uniquement.`;
function asHex(value, fallback) {
    if (typeof value !== 'string')
        return fallback;
    const v = value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v))
        return v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
        return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
    }
    return fallback;
}
function sanitizeElements(raw) {
    if (!Array.isArray(raw))
        return [];
    const allowedTypes = new Set(['text', 'button', 'divider', 'rsvp-block', 'image', 'curve', 'triangle']);
    return raw
        .filter((el) => Boolean(el) && typeof el === 'object' && !Array.isArray(el))
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
function sanitizeGlobal(raw, bgImageUrl) {
    const g = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const paletteRaw = g.palette && typeof g.palette === 'object' && !Array.isArray(g.palette)
        ? g.palette
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
function parseStringList(raw, max = 8) {
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 160))
        .slice(0, max);
}
function parseVisualAnalysis(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const v = raw;
    const colors = Array.isArray(v.colors)
        ? v.colors.filter((c) => typeof c === 'string').slice(0, 8)
        : [];
    const peopleFaces = typeof v.peopleFaces === 'string' ? v.peopleFaces.slice(0, 700) : '';
    const faceLandmarks = typeof v.faceLandmarks === 'string' ? v.faceLandmarks.slice(0, 700) : '';
    const skinTones = typeof v.skinTones === 'string' ? v.skinTones.slice(0, 400) : '';
    const hairStyles = typeof v.hairStyles === 'string' ? v.hairStyles.slice(0, 400) : '';
    const clothingStyles = typeof v.clothingStyles === 'string' ? v.clothingStyles.slice(0, 500) : '';
    const hasPeople = v.hasPeople === true ||
        (typeof peopleFaces === 'string' &&
            peopleFaces.length > 0 &&
            !/^none$/i.test(peopleFaces.trim()));
    const peopleCountRaw = Number(v.peopleCount);
    const peopleCount = Number.isFinite(peopleCountRaw) && peopleCountRaw >= 0
        ? Math.min(Math.round(peopleCountRaw), 12)
        : hasPeople
            ? 1
            : 0;
    const isInvitationClone = Boolean(v.isInvitationClone) ||
        /clone|copi|reprodu/i.test(String(v.style || '')) ||
        /invitation|carte/i.test(String(v.composition || ''));
    const clonedCardFeatures = typeof v.clonedCardFeatures === 'string'
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
        briefInterpretation: typeof v.briefInterpretation === 'string' ? v.briefInterpretation.slice(0, 600) : '',
        briefMustKeep: parseStringList(v.briefMustKeep),
        briefMustChange: parseStringList(v.briefMustChange),
    };
}
const FACE_POLICY_NO_PEOPLE = 'FACE POLICY: No people, no faces, no human silhouettes, no invented couples or stock models. Decorative invitation artwork only.';
const FACE_POLICY_KEEP_PEOPLE = 'IDENTITY LOCK & ULTRA-REALISM (HIGHEST PRIORITY): The attached reference photo(s) are the ABSOLUTE GROUND TRUTH for who appears. Copy each person\'s exact facial identity — bone structure, eyes, brows, nose, lips, jaw, natural skin tone (rich melanin / bronze / caramel / mahogany / deep ebony undertones intact with natural skin pores, realistic subsurface scattering — NEVER lighten, bleach, or change ethnicity), age appearance, expression, hairstyle (braids, fade, locs, afro, curls, smooth bun) and attire. Authentic 35mm photograph aesthetic with natural depth of field and warm ambient celebration lighting. STRICTLY FORBIDDEN: plastic AI skin smoothing, airbrushing, beauty filter, CGI/3D render look, doll-like faces, face swap, age alteration, ethnicity shift, skin tone correction, anime/illustration face, or "lookalike" substitute. Only the luxury background, invitation card border, lighting ambiance, and florals may follow the user brief.';
function buildImagePrompt(userPrompt, backgroundPrompt, analysis) {
    const brief = userPrompt.trim().slice(0, 1000);
    const hasPeople = Boolean(analysis?.hasPeople);
    const isClone = Boolean(analysis?.isInvitationClone ||
        /copi|clon|reprodu/i.test(brief));
    const parts = [
        'Create ONE luxury vertical print-ready invitation card artwork (portrait orientation 1024x1536 / 9:16).',
        'PHOTOGRAPHIC REALISM REQUIREMENT: Hyper-realistic 35mm fine-grain photography aesthetic, natural skin micro-textures with visible pores, realistic lighting highlights on melanin skin tones, organic fabric drape (wax, satin, velvet, lace), authentic warm ambient event lighting (candles, chandeliers, golden hour). STRICTLY PROHIBIT 3D CGI plastic rendering, cartoonish styling, doll-like faces, or airbrushed beauty smoothing.',
        'PROPORTIONAL & AUTHENTIC COMPOSITION (NO OVER-REDESIGN): Keep the visual clean, organic, and photographically balanced. Do NOT add artificial cluttered borders, excessive gaudy graphic stickers, fake 3D digital elements, or heavy opaque banners. Maintain natural photographic proportions (aspect ratio 9:16) with generous negative space so the subjects and the real setting remain the centerpiece.',
    ];
    if (isClone) {
        parts.push('=== INVITATION CARD CLONING & DUPLICATION MANDATE ===', 'The reference image contains an existing INVITATION CARD. You MUST faithfully duplicate and replicate its architectural composition, ornamental borders, arches, filigree flourishes, paper textures, background gradients, and color harmonies.', analysis?.clonedCardFeatures ? `Cloned card layout details: ${analysis.clonedCardFeatures}` : '');
    }
    if (hasPeople) {
        parts.push('=== STRICT IDENTITY LOCK (ABSOLUTE PRIORITY OVER DÉCOR) ===', 'The reference image(s) show REAL PEOPLE whose faces MUST be reproduced with 100% photographic likeness and zero alteration.', FACE_POLICY_KEEP_PEOPLE);
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
        parts.push('=== DÉCOR & AMBIANCE (secondary — build luxury invitation setting around the subjects) ===', brief);
    }
    else {
        parts.push('FIDELITY RULE: No people. Detect only what is visible. Do not invent faces.', 'USER BRIEF:', brief, FACE_POLICY_NO_PEOPLE);
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
        if (analysis.style)
            parts.push(`Reference décor style: ${analysis.style}`);
        if (analysis.motifs)
            parts.push(`Reference motifs/textures: ${analysis.motifs}`);
        if (analysis.composition)
            parts.push(`Reference composition: ${analysis.composition}`);
        if (analysis.colors.length)
            parts.push(`Palette close to: ${analysis.colors.join(', ')}`);
    }
    parts.push('Conflict rule: faces/skin/hair/clothing from references ALWAYS win over décor; brief only wins for background, florals, paper, lighting mood.', 'No readable text, letters, names, dates, logos, or watermarks (text is added later by the editor).');
    return parts.join('\n').slice(0, 5000);
}
async function visionStructure(key, prompt, imageUrls) {
    const visionModel = process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
    const userContent = [
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
            image_url: { url, detail: 'high' },
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
        const payload = (await response.json().catch(() => ({})));
        if (!response.ok) {
            fail(502, payload.error?.message || 'Échec de l’analyse IA des images.');
        }
        const raw = payload.choices?.[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        const visualAnalysis = parseVisualAnalysis(parsed.visualAnalysis);
        const faceClause = visualAnalysis?.hasPeople
            ? FACE_POLICY_KEEP_PEOPLE
            : FACE_POLICY_NO_PEOPLE;
        const backgroundPrompt = typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()
            ? parsed.backgroundPrompt.trim().slice(0, 1800)
            : `IDENTITY LOCK: Match people in the references exactly (faces, skin, hair, clothing). USER BRIEF: ${prompt.slice(0, 350)}. ${faceClause} Soft print look, no readable text.`;
        return {
            global: parsed.global,
            elements: parsed.elements,
            backgroundPrompt,
            visualAnalysis,
        };
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || 'Impossible d’analyser les images avec l’IA.');
    }
    finally {
        clearTimeout(timer);
    }
}
async function downloadImageAsPngBuffer(url) {
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
    }
    finally {
        clearTimeout(timer);
    }
}
async function uploadGeneratedB64(b64, tenantId) {
    const buffer = Buffer.from(b64, 'base64');
    const uploaded = await (0, cloudinaryService_1.uploadImageBuffer)(buffer, (0, cloudinaryConfig_1.getTemplateUploadFolder)(tenantId), 'ai-bg');
    return uploaded.url;
}
function isDallEModel(model) {
    return /^dall-e/i.test(model.trim());
}
function responsesModel() {
    return (process.env.OPENAI_RESPONSES_MODEL ||
        process.env.OPENAI_IMAGE_AGENT_MODEL ||
        process.env.OPENAI_MODEL ||
        'gpt-5.6-luna');
}
function imagesApiFallbackModel() {
    return process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
}
function extractImagesApiPayload(payload) {
    const b64 = payload.data?.[0]?.b64_json;
    if (b64)
        return `b64:${b64}`;
    const url = payload.data?.[0]?.url;
    if (url)
        return `url:${url}`;
    return null;
}
async function resolveGeneratedImage(token, tenantId) {
    if (token.startsWith('b64:')) {
        return uploadGeneratedB64(token.slice(4), tenantId);
    }
    if (token.startsWith('url:')) {
        return token.slice(4);
    }
    fail(502, 'Réponse image IA invalide.');
}
function extractResponsesImageB64(payload) {
    const outputs = Array.isArray(payload.output) ? payload.output : [];
    for (const item of outputs) {
        if (item?.type === 'image_generation_call' && typeof item.result === 'string' && item.result) {
            return item.result;
        }
    }
    return null;
}
async function referenceToDataUrl(url) {
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
async function generateImageWithGpt56Luna(key, imagePrompt, referenceUrls, tenantId, options) {
    const model = responsesModel();
    const hasRefs = referenceUrls.length > 0;
    const hasPeople = Boolean(options?.hasPeople);
    // Convertir en data URL pour éviter les échecs de téléchargement côté OpenAI.
    const refDataUrls = [];
    for (const ref of referenceUrls.slice(0, 4)) {
        try {
            refDataUrls.push(await referenceToDataUrl(ref));
        }
        catch (err) {
            console.warn('[invitationTemplateAi] skip ref download:', err?.message);
        }
    }
    const faceBlock = hasPeople ? FACE_POLICY_KEEP_PEOPLE : FACE_POLICY_NO_PEOPLE;
    // Édition prioritaire si des personnes sont présentes (préserve mieux les visages).
    const imageAction = refDataUrls.length
        ? hasPeople
            ? 'edit'
            : 'auto'
        : 'generate';
    const imageQuality = process.env.OPENAI_IMAGE_QUALITY ||
        (hasPeople ? 'high' : 'medium');
    // Refs d’abord quand il y a des personnes : ancre mieux l’identité faciale.
    const identityPreamble = hasPeople
        ? `CRITICAL MANDATE - STRICT IDENTITY LOCK & HYPER-REALISM:
The following reference image(s) show REAL PEOPLE. When you invoke the image_generation tool:
1. 100% PHOTOGRAPHIC FACIAL LIKENESS: Maintain complete photographic likeness and exact facial identity of each subject.
2. RAW 35MM REALISM: True-to-life organic skin texture with fine visible pores, natural melanin undertones (rich caramel, bronze, mahogany, deep ebony) with natural soft highlights, authentic eye reflections, natural hair strand textures, and authentic clothing fabrics (wax, satin, velvet, lace).
3. STRICTLY FORBIDDEN: Airbrushed beauty filters, plastic skin, doll-like faces, CGI 3D looks, face swapping, or ethnicity/age shifting.
4. INVITATION CLONING: If a reference card is provided or requested, faithfully replicate its layout, arches, borders, and decorative filigree.
5. Seamlessly integrate the original subject(s) into the luxury vertical invitation card artwork requested in the brief.\n\n${imagePrompt}`
        : imagePrompt;
    const content = hasPeople
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
    const body = {
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
        let payload = (await response.json().catch(() => ({})));
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
            payload = (await response.json().catch(() => ({})));
        }
        // Si action=edit est refusée, retenter en auto (en gardant la FACE POLICY dans le prompt).
        if (!response.ok && imageAction === 'edit') {
            console.warn('[invitationTemplateAi] edit action rejected, retrying auto:', payload.error?.message);
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
            payload = (await response.json().catch(() => ({})));
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
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || `Impossible de générer l’image avec ${model}.`);
    }
    finally {
        clearTimeout(timer);
    }
}
/** Repli Images API (gpt-image-2 / dall-e) si Responses échoue. */
async function generateBackgroundFromPrompt(key, imagePrompt, tenantId, size = '1024x1536') {
    const imageModel = imagesApiFallbackModel();
    const dallE = isDallEModel(imageModel);
    const resolvedSize = !dallE && size === '1024x1536' ? '1024x1024' : size;
    const body = {
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
        const payload = (await response.json().catch(() => ({})));
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
                const retryPayload = (await retry.json().catch(() => ({})));
                if (!retry.ok) {
                    fail(502, retryPayload.error?.message || 'Échec de la génération de la nouvelle image.');
                }
                const retryToken = extractImagesApiPayload(retryPayload);
                if (!retryToken)
                    fail(502, 'Aucune nouvelle image renvoyée par l’IA.');
                return resolveGeneratedImage(retryToken, tenantId);
            }
            fail(502, errMsg || 'Échec de la génération de la nouvelle image.');
        }
        const token = extractImagesApiPayload(payload);
        if (!token)
            fail(502, 'Aucune nouvelle image renvoyée par l’IA.');
        return resolveGeneratedImage(token, tenantId);
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || 'Impossible de générer la nouvelle image.');
    }
    finally {
        clearTimeout(timer);
    }
}
/** Repli image-to-image classique (dall-e-2 / gpt-image edits). */
async function generateBackgroundFromReference(key, referenceUrl, imagePrompt, tenantId) {
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
        const payload = (await response.json().catch(() => ({})));
        if (!response.ok) {
            fail(502, payload.error?.message || 'Échec de la création d’image à partir des références.');
        }
        const token = extractImagesApiPayload(payload);
        if (!token)
            fail(502, 'Aucune image générée à partir de la référence.');
        return resolveGeneratedImage(token, tenantId);
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || 'Impossible de créer l’image depuis la référence.');
    }
    finally {
        clearTimeout(timer);
    }
}
function getNanoBananaApiKey() {
    const key = process.env.NANO_BANANA_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GOOGLE_API_KEY ||
        process.env.GOOGLE_AI_API_KEY ||
        '';
    return key.trim() || null;
}
function getNanoBananaModel() {
    return (process.env.NANO_BANANA_MODEL ||
        process.env.GEMINI_IMAGE_MODEL ||
        'gemini-3.1-flash-image');
}
/**
 * Génération et composition d'invitation avec Nano Banana (Google Gemini Image : gemini-3.1-flash-image).
 * Prend en charge la préservation native de l'identité et cohérence de personnage (character consistency)
 * avec jusqu'à 4 photos de référence et un ratio portrait vertical 9:16 pour carte de prestige.
 */
async function generateImageWithNanoBanana(apiKey, imagePrompt, referenceUrls, tenantId, options) {
    const model = getNanoBananaModel();
    const hasRefs = referenceUrls.length > 0;
    const hasPeople = Boolean(options?.hasPeople);
    // Téléchargement et encodage base64 des photos de référence
    const refImages = [];
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
        }
        catch (err) {
            console.warn('[invitationTemplateAi] Nano Banana skip ref download:', err?.message);
        }
    }
    const promptText = hasPeople
        ? `CRITICAL MANDATE - NANO BANANA CHARACTER CONSISTENCY & ULTRA-REALISM:
The attached reference photo(s) depict REAL PEOPLE who must appear on this luxury vertical invitation card.
1. ABSOLUTE FACIAL & CHARACTER FIDELITY: Maintain 100% photographic facial likeness and identity of each person.
2. RAW 35mm PHOTOGRAPHY: Hyper-realistic photo quality, natural skin micro-texture, visible pores, lifelike melanin undertones (NEVER lighten, bleach, or change ethnicity), authentic eye catchlights, natural hair strand textures, realistic fabrics (wax, satin, velvet, lace).
3. INVITATION CARD CLONING: If an invitation card sample was provided in the references, faithfully replicate its layout, ornamental borders, arches, paper textures, and aesthetic harmony.
4. PROPORTIONAL COMPOSITION & NO OVER-REDESIGN: Avoid gaudy digital overlays, heavy artificial graphics, fake 3D stickers, or clutter. Let the authentic human subjects and luxury venue shine with clean, proportional 9:16 portrait spatial hierarchy.
5. STRICTLY FORBIDDEN: Generic models, airbrushed plastic skin, face swap, doll-like features, 3D CGI look, or altered bone structure.
6. COMPOSITION: Seamlessly integrate the original subject(s) into the luxury vertical 9:16 invitation card artwork.

${imagePrompt}`
        : `CRITICAL MANDATE - NANO BANANA LUXURY INVITATION ARTWORK & CARD CLONING:
Generate a breathtaking, ultra-high-definition vertical 9:16 luxury invitation artwork.
- REALISTIC TEXTURES: Fine luxury paper grain, metallic gold foil embossing, soft dimensional depth, natural floral arrangements.
- INVITATION CLONING: If reference images contain an existing invitation card, faithfully reproduce its framing, ornaments, color scheme, and aesthetic composition.
- NO OVER-REDESIGN: Clean, refined, high-end photographic print aesthetic without cheap digital artifacts or gaudy fake 3D overlays. Maintain balanced proportional sizes.

${imagePrompt}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
        let b64 = null;
        // Tentative 1 : Google Interactions API (API native de Nano Banana avec support format portrait 9:16)
        const interactionInput = [
            { type: 'text', text: promptText },
        ];
        for (const img of refImages) {
            interactionInput.push({
                type: 'image',
                data: img.base64,
                mime_type: img.mimeType,
            });
        }
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
            const data = (await interactionsRes.json().catch(() => ({})));
            if (typeof data.output_image?.data === 'string' && data.output_image.data) {
                b64 = data.output_image.data;
            }
            else if (Array.isArray(data.steps)) {
                for (const step of data.steps) {
                    const imgBlock = step.content?.find((c) => c.type === 'image' && typeof c.data === 'string');
                    if (imgBlock?.data) {
                        b64 = imgBlock.data;
                        break;
                    }
                }
            }
        }
        else {
            const errText = await interactionsRes.text().catch(() => '');
            console.warn('[invitationTemplateAi] Nano Banana interactions API non-200:', errText.slice(0, 300));
        }
        // Tentative 2 : Standard generateContent API avec responseModalities IMAGE si Interactions n'a pas renvoyé de b64
        if (!b64) {
            const generateParts = [
                { text: promptText },
            ];
            for (const img of refImages) {
                generateParts.push({
                    inline_data: {
                        mime_type: img.mimeType,
                        data: img.base64,
                    },
                });
            }
            const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
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
            });
            if (generateRes.ok) {
                const genData = (await generateRes.json().catch(() => ({})));
                const parts = genData.candidates?.[0]?.content?.parts || [];
                for (const p of parts) {
                    const found = p.inlineData?.data || p.inline_data?.data;
                    if (typeof found === 'string' && found) {
                        b64 = found;
                        break;
                    }
                }
            }
            else {
                const genErr = await generateRes.text().catch(() => '');
                console.warn('[invitationTemplateAi] Nano Banana generateContent API non-200:', genErr.slice(0, 300));
            }
        }
        if (!b64) {
            fail(502, `Nano Banana (${model}) n'a pas renvoyé d'image valide.`);
        }
        const url = await uploadGeneratedB64(b64, tenantId);
        return { url, mode: hasPeople || hasRefs ? 'edit' : 'generate' };
    }
    catch (error) {
        if (error?.status)
            throw error;
        fail(502, error?.message || `Erreur lors de la génération avec Nano Banana (${model}).`);
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * 1) Nano Banana (Google Gemini Image 3.1 Flash Image) si GEMINI_API_KEY / NANO_BANANA_API_KEY configurée
 * 2) GPT-5.6 Luna (Responses + image_generation)
 * 3) Images API edits sur la 1re référence
 * 4) Images API generate classique
 */
async function createNewInvitationImage(key, imageUrls, imagePrompt, tenantId, options) {
    // 1) Priorité demandée : Nano Banana (Gemini 3.1 Flash Image)
    const nanoKey = getNanoBananaApiKey();
    if (nanoKey) {
        try {
            console.log(`[invitationTemplateAi] Generating with Nano Banana (${getNanoBananaModel()})...`);
            return await generateImageWithNanoBanana(nanoKey, imagePrompt, imageUrls, tenantId, options);
        }
        catch (nanoErr) {
            console.warn('[invitationTemplateAi] Nano Banana generation failed, falling back to Luna/OpenAI:', nanoErr?.message);
        }
    }
    // 2) GPT-5.6 Luna (Responses + image_generation)
    try {
        return await generateImageWithGpt56Luna(key, imagePrompt, imageUrls, tenantId, options);
    }
    catch (lunaErr) {
        console.warn('[invitationTemplateAi] gpt-5.6-luna image failed, falling back:', lunaErr?.message);
    }
    // Si des personnes sont présentes dans les références, le repli DOIT conserver l'image
    // via l'API d'édition d'image plutôt que d'inventer une personne à partir du texte seul.
    if (options?.hasPeople && imageUrls.length > 0) {
        try {
            const url = await generateBackgroundFromReference(key, imageUrls[0], imagePrompt, tenantId);
            return { url, mode: 'edit' };
        }
        catch (editErr) {
            console.warn('[invitationTemplateAi] image edit fallback failed, falling back to text generation:', editErr?.message);
        }
    }
    try {
        const url = await generateBackgroundFromPrompt(key, imagePrompt, tenantId);
        return { url, mode: 'generate' };
    }
    catch (genErr) {
        console.warn('[invitationTemplateAi] images/generations failed, trying edits:', genErr?.message);
    }
    const primary = imageUrls[0];
    if (!primary) {
        fail(502, 'Impossible de créer la nouvelle image (Nano Banana + Luna + Images API).');
    }
    const url = await generateBackgroundFromReference(key, primary, imagePrompt, tenantId);
    return { url, mode: 'edit' };
}
async function composeInvitationTemplateAi(input) {
    rateLimit(input.userId);
    const prompt = String(input.prompt || '').trim();
    if (prompt.length < 8) {
        fail(400, 'Décrivez le style d’invitation souhaité (au moins quelques mots).');
    }
    const imageUrls = (input.imageUrls || [])
        .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
        .map((u) => u.trim())
        .slice(0, 4);
    if (!imageUrls.length) {
        fail(400, 'Ajoutez au moins une image de référence (URL).');
    }
    const key = requireOpenAiKey();
    const structured = await visionStructure(key, prompt, imageUrls);
    const imagePrompt = buildImagePrompt(prompt, structured.backgroundPrompt, structured.visualAnalysis);
    let bgImageUrl = '';
    let imageMode = null;
    const wantBg = input.generateBackground !== false;
    if (wantBg) {
        try {
            const created = await createNewInvitationImage(key, imageUrls, imagePrompt, input.tenantId, { hasPeople: Boolean(structured.visualAnalysis?.hasPeople) });
            bgImageUrl = created.url;
            imageMode = created.mode;
        }
        catch (err) {
            // La création d’image est centrale : on remonte l’erreur au client.
            if (err?.status)
                throw err;
            fail(502, err?.message || 'La création de la nouvelle image a échoué.');
        }
    }
    const global = sanitizeGlobal(structured.global, bgImageUrl);
    if (structured.visualAnalysis) {
        global.aiVisualAnalysis = structured.visualAnalysis;
    }
    const elements = sanitizeElements(structured.elements);
    if (!elements.some((el) => el.type === 'rsvp-block')) {
        elements.push({
            id: `ai-rsvp-${Date.now()}`,
            type: 'rsvp-block',
            text: 'Confirmer votre présence',
            color: global.palette.accent,
            fontSize: '16px',
            align: 'center',
            width: 'full',
            rsvpPlacement: 'outside',
            positionMode: 'flow',
        });
    }
    const content = (0, mandatoryRsvpFields_1.ensureMandatoryRsvpFieldsOnContent)({
        global,
        elements,
    });
    return {
        content: {
            global: content.global || global,
            elements: Array.isArray(content.elements)
                ? (content.elements)
                : elements,
        },
        stage: {
            structureReady: true,
            backgroundReady: Boolean(bgImageUrl),
            imageMode,
        },
    };
}

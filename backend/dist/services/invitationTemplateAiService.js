"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReferenceImage = downloadReferenceImage;
exports.preloadReferenceImages = preloadReferenceImages;
exports.ensurePublicTemplateVariables = ensurePublicTemplateVariables;
exports.composeInvitationTemplateAi = composeInvitationTemplateAi;
const mandatoryRsvpFields_1 = require("../utils/mandatoryRsvpFields");
const invitationIdentity_1 = require("../utils/invitationIdentity");
const cloudinaryService_1 = require("./cloudinaryService");
const cloudinaryConfig_1 = require("../config/cloudinaryConfig");
const geminiJsonClient_ts_1 = require("./geminiJsonClient.js");
const openaiJsonClient_ts_1 = require("./openaiJsonClient.js");
const aiStudioModels_ts_1 = require("./aiStudioModels.js");
const invitationComposeContext_ts_1 = require("./invitationComposeContext.js");
const invitationStructuredBrief_ts_1 = require("./invitationStructuredBrief.js");
const invitationStyleRefs_ts_1 = require("./invitationStyleRefs.js");
const invitationPromptFidelity_ts_1 = require("./invitationPromptFidelity.js");
const invitationArtStyle_ts_1 = require("./invitationArtStyle.js");
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
function requireAiConfigured() {
    const key = (0, openaiJsonClient_ts_1.getOpenAiApiKey)();
    if (!(0, geminiJsonClient_ts_1.getGeminiApiKey)() && !key) {
        fail(503, 'La génération IA n’est pas configurée (GEMINI_API_KEY ou OPENAI_API_KEY).');
    }
    return key;
}
const STRUCTURE_SYSTEM = `You are EventMaster’s invitation designer for Central Africa / RDC.
Analyze any reference images, then return ONLY valid JSON (json_object).

{{PIPELINE_MANDATE}}

Visual truth:
- Detect ONLY visible pixels. Never invent ethnicity, age, hair, outfit, skin, or people.
- If a detail is blurry or cropped: write "unclear".
- Photos win for faces / skin / hair / clothes. Brief wins for décor and mood.
- Without people photos: any generated person MUST be a Black African man and/or woman. Forbidden: invented white couples or Caucasian stock faces.
- Beautify / smooth / lighten may already be stripped. Do not reintroduce them.

{{ART_STYLE_RULES}}

Write decorParagraph with Subject + Action + Location + Composition + Style (120–180 English words).
With people photos: décor / card / mood only — never rewrite faces.
Without people: full scene then décor. Clone: replicate borders, foil and paper.

Exact schema:
{
  "intent": "create" | "clone" | "refine" | "couple",
  "locks": ["max 8 short English lock sentences"],
  "decorParagraph": "120-180 words English décor narrative",
  "visualAnalysis": {
    "colors": ["#hex", "..."],
    "style": "observed decorative style — do not invent",
    "motifs": "observed motifs / textures / décor",
    "composition": "observed layout / framing",
    "hasPeople": true | false,
    "peopleCount": 0,
    "peopleFaces": "none | PERSON 1 / PERSON 2 left-to-right: observed eyes, smile, cheeks, marks only",
    "faceLandmarks": "none | observed bone structure, eye spacing, smile, scars — unclear if unsure",
    "skinTones": "none | observed skin — NEVER lighten",
    "hairStyles": "none | observed length, texture, hairline",
    "clothingStyles": "none | observed cuts, fabrics, colors",
    "isInvitationClone": true | false,
    "clonedCardFeatures": "none | borders, frame, ornaments, textures to clone",
    "coupleFaceMapping": {
      "strictMappingInstructions": "none | e.g. Image 1 has the groom on the left in dark suit and bride on the right in white gown. Reference photos: Image 2 is the woman/bride and Image 3 is the man/groom. The MAN from reference photos MUST replace the groom on the left in suit. The WOMAN from reference photos MUST replace the bride on the right in gown. Zero gender inversion."
    },
    "briefNeeds": ["explicit need 1"],
    "briefInterpretation": "how each brief need applies",
    "briefMustKeep": ["refs + brief facts"],
    "briefMustChange": ["ONLY explicit brief changes"]
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
  ]
}

Lock rules: 8 items max, ~20 words each. Always cover identity source, skin honesty if people, mode preservation, and text-in-pixels.
Organizer context may fill event type, language, names/date/venue and décor taste — never invent a face.

People:
- hasPeople=true: pixels are truth. peopleFaces / faceLandmarks are lock lists, not pretty-face briefs.
- Forbidden: lookalike, celebrity, stock model, beautify, smooth, lighten, invented smile.

Layout:
- Overlay copy is written later by a text model. elements may be a short skeleton (title/date placeholders only).
- 4–8 centered flow elements. Use {{title}}, {{date}}, {{location}}, {{firstName}} when relevant.
- Exactly one rsvp-block, rsvpPlacement "outside", text "Confirmer votre présence" or Congolese national-language equivalent (Lingala "Kondima kozala wana", Swahili "Thibitisha uwepo wako", Kikongo "Tula kimbangi ya kukwiza", Tshiluba "Jadika dikalapu diebe").
- Language fidelity: if the brief is Lingala, Swahili, Kikongo or Tshiluba, write ALL text elements in that language. Do not revert to French.
- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).
- No markdown. JSON only.`;
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
    const peopleFaces = typeof v.peopleFaces === 'string' ? v.peopleFaces.slice(0, 1400) : '';
    const faceLandmarks = typeof v.faceLandmarks === 'string' ? v.faceLandmarks.slice(0, 1400) : '';
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
    const rawMapping = v.coupleFaceMapping;
    const coupleFaceMapping = rawMapping && typeof rawMapping === 'object' && typeof rawMapping.strictMappingInstructions === 'string'
        ? { strictMappingInstructions: rawMapping.strictMappingInstructions.slice(0, 500) }
        : undefined;
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
        coupleFaceMapping,
        briefNeeds: parseStringList(v.briefNeeds, 12),
        briefInterpretation: typeof v.briefInterpretation === 'string' ? v.briefInterpretation.slice(0, 600) : '',
        briefMustKeep: parseStringList(v.briefMustKeep),
        briefMustChange: parseStringList(v.briefMustChange),
    };
}
const FACE_POLICY_NO_PEOPLE = 'FACE POLICY: Prefer decorative artwork. If any person still appears, they MUST follow the RDC representation default: Black African men and/or women only — never Caucasian stock models.';
const FACE_POLICY_KEEP_PEOPLE = 'IDENTITY LOCK — PIXELS WIN: The attached photo(s) are the only identity source. Keep EACH person as the SAME individual (not a sibling, celebrity, or beautified lookalike). Unchanged: bone structure, eyes and gaze, exact smile, cheek volume, skin tone (never lighten), age, hair, clothing, moles/scars. Forbidden: face swap, slim/contour, symmetry, doll eyes, invented grin, airbrush, CGI. If any text description conflicts with the photo, obey the photo.';
const FACE_POLICY_COUPLE_SWAP = 'COUPLE FACE REPLACEMENT (ZERO GENDER INVERSION) — ORGANIZER REQUESTED: Image 1 is the incoming invitation/scene. Keep composition, pose, bodies, wardrobe, décor, lighting and ornaments. Images 2+ are the couple. Strictly match genders: place the groom/man face onto the male body (suit/tuxedo) and the bride/woman face onto the female body (bridal gown/dress). Replace ONLY the face(s) on Image 1 with these exact people. If new text/names are requested in the brief, do NOT keep old names from Image 1. Honest pixels: bone structure, eyes, smile, skin tone, moles. Forbidden: beautify, skin lightening, celebrity lookalike, inverting bride/groom genders, keeping the original Image 1 faces.';
function buildImagePrompt(userPrompt, backgroundPrompt, analysis, options) {
    const processed = options?.processed;
    const coupleFaceSwap = Boolean(options?.coupleFaceSwap || processed?.coupleFaceSwap);
    const intent = (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
        coupleFaceSwap,
        isAlteration: options?.isAlteration,
        brief: processed?.originalBrief || userPrompt,
        isInvitationClone: analysis?.isInvitationClone,
    });
    const resolvedIntent = options?.intent || intent;
    const decorParagraph = (options?.decorParagraph ||
        backgroundPrompt ||
        processed?.englishSceneBrief ||
        userPrompt).trim();
    return (0, invitationPromptFidelity_ts_1.buildCompactImagePrompt)({
        intent: resolvedIntent,
        originalBrief: processed?.originalBrief || userPrompt,
        decorParagraph,
        locks: options?.locks,
        analysis: analysis
            ? {
                hasPeople: analysis.hasPeople,
                peopleCount: analysis.peopleCount,
                isInvitationClone: analysis.isInvitationClone,
                clonedCardFeatures: analysis.clonedCardFeatures,
                briefMustKeep: analysis.briefMustKeep,
                briefMustChange: analysis.briefMustChange,
                colors: analysis.colors,
                coupleFaceMapping: analysis.coupleFaceMapping
                    ? {
                        strictMappingInstructions: analysis.coupleFaceMapping.strictMappingInstructions,
                    }
                    : undefined,
            }
            : null,
        organizerContext: options?.organizerContext,
        artStyle: options?.artStyle,
        embedText: options?.embedText,
        isPublic: options?.isPublic,
        coupleFaceSwap,
        referenceCount: options?.referenceCount,
        explicitAppearanceChange: processed?.explicitAppearanceChange,
    });
}
function structureSystemPrompt(embedText, artStyle, isPublic = false, intent = 'create') {
    const style = (0, invitationArtStyle_ts_1.parseInvitationArtStyle)(artStyle);
    let basePrompt = STRUCTURE_SYSTEM.replace('{{PIPELINE_MANDATE}}', (0, invitationPromptFidelity_ts_1.invitationPipelineVisionMandate)(intent)).replace('{{ART_STYLE_RULES}}', (0, invitationArtStyle_ts_1.invitationArtStyleStructureRules)(style)).replace('- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).', embedText && !isPublic
        ? '- Vertical print-ready image WITH sharp embedded invitation typography (names, date, venue from the brief), correctly spelled, never covering faces.'
        : '- Vertical print-ready image, NO readable text, names, dates, logos, watermarks (the editor adds text).');
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
function visionUserText(prompt, hasRefs, options) {
    const original = options?.processed?.originalBrief || prompt;
    const localScaffold = options?.processed?.englishSceneBrief || options?.processed?.decorBrief || prompt;
    const coupleFaceSwap = Boolean(options?.coupleFaceSwap || options?.processed?.coupleFaceSwap);
    const intent = options?.intent ||
        (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
            coupleFaceSwap,
            isAlteration: options?.isAlteration,
            brief: original,
        });
    const existingTexts = Array.isArray(options?.existingElements)
        ? options.existingElements
            .filter((el) => el && typeof el.text === 'string' && el.text.trim().length > 0)
            .map((el) => `${el.type || 'text'}: "${el.text.trim()}"`)
            .join('; ')
        : '';
    const refineBlock = intent === 'refine' && existingTexts
        ? `\nEXISTING TEXTS TO PRESERVE: ${existingTexts}\nDo not invent new names, dates or venues unless the brief says so.\n`
        : '';
    const honesty = coupleFaceSwap
        ? `PHOTOS: Image 1 = incoming card (keep décor/pose, discard original faces). Images 2+ = couple identity. ${options?.processed?.beautifyStripped
            ? 'Ignore beautify / smooth / lighten requests.'
            : 'Do not idealize the couple photos.'}`
        : options?.styleRefsOnly
            ? 'STYLE REFERENCE PHOTOS ONLY: paper, foil, frame and palette taste. hasPeople=false unless the brief explicitly asks for hosts. Do not copy faces from these cards.'
            : hasRefs
                ? `PHOTOS ATTACHED: faces = pixel truth. ${options?.processed?.beautifyStripped
                    ? 'Ignore beautify / smooth / lighten requests.'
                    : 'Do not idealize.'}`
                : 'NO PHOTOS: hasPeople=false unless the brief explicitly asks for hosts.';
    const contextBlock = options?.organizerContext ? `\n${options.organizerContext}\n` : '';
    const roles = options?.processed?.referenceRoles ? `\n${options.processed.referenceRoles}\n` : '';
    const fewshot = options?.styleFewshot ? `\n${options.styleFewshot}\n` : '';
    const coupleGenderAlignment = coupleFaceSwap
        ? `\n=== CRITICAL GENDER ALIGNMENT FOR COUPLE (NO INVERSION) ===
Image 1 is the incoming card / scene with hosts. Images 2+ are the couple identity photos.
1) Examine Image 1: locate the male host (suit/tuxedo) and female host (gown/dress). Note their left/right position.
2) Examine Images 2+: identify the man (groom) and woman (bride).
3) In visualAnalysis.coupleFaceMapping.strictMappingInstructions, explicitly mandate that the MAN from references replaces the MAN on Image 1 (suit), and the WOMAN from references replaces the WOMAN on Image 1 (gown).
4) FORBIDDEN: never invert bride and groom faces (putting female face on suit or male face on gown).\n`
        : '';
    return `MODE: ${intent}

ORIGINAL USER BRIEF (facts to preserve — any language):
"""
${original.slice(0, 1500)}
"""

LOCAL SCENE SCAFFOLD (refine it — do not copy blindly):
"""
${localScaffold.slice(0, 900)}
"""
${contextBlock}${roles}${fewshot}${refineBlock}${coupleGenderAlignment}
${honesty}

Tasks:
1) Confirm intent (${intent} unless images clearly show a card to clone and mode is create).
2) Fill visualAnalysis from pixels only.
3) Write locks (max 8 short sentences).
4) Write decorParagraph (120–180 words). ${coupleFaceSwap
        ? 'Keep Image 1 card; strictly match genders and replace faces with Images 2+ only.'
        : hasRefs
            ? 'Décor / card / mood only — never rewrite faces.'
            : 'Full scene then décor. Complete names/date/venue from connected context only if the brief is incomplete.'}
5) Fill global + elements for the editor.
${options?.embedText ? '6) Mention brief typography (names, date, venue) in decorParagraph.' : ''}`;
}
function visionResultFromParsed(parsed, prompt, hasRefs, options) {
    const visualAnalysis = parseVisualAnalysis(parsed.visualAnalysis);
    const coupleFaceSwap = Boolean(options?.coupleFaceSwap);
    const localIntent = options?.intent ||
        (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
            coupleFaceSwap,
            brief: prompt,
            isInvitationClone: visualAnalysis?.isInvitationClone,
        });
    const intent = (0, invitationPromptFidelity_ts_1.resolveFinalInvitationPipelineIntent)({
        local: localIntent,
        vision: parsed.intent,
        isInvitationClone: visualAnalysis?.isInvitationClone,
    });
    const faceClause = coupleFaceSwap
        ? FACE_POLICY_COUPLE_SWAP
        : visualAnalysis?.hasPeople
            ? FACE_POLICY_KEEP_PEOPLE
            : FACE_POLICY_NO_PEOPLE;
    const identityPrefix = coupleFaceSwap
        ? 'COUPLE FACE REPLACEMENT: Keep Image 1 card; replace faces with Images 2+. '
        : hasRefs
            ? 'IDENTITY LOCK: Match people in the references exactly. '
            : '';
    const decorParagraph = ((typeof parsed.decorParagraph === 'string' && parsed.decorParagraph.trim()) ||
        (typeof parsed.backgroundPrompt === 'string' && parsed.backgroundPrompt.trim()) ||
        `${identityPrefix}USER BRIEF: ${prompt.slice(0, 350)}. ${faceClause} Soft print look, ${options?.embedText ? 'embed invitation typography from the brief.' : 'no readable text.'}`).slice(0, 1400);
    const locks = (0, invitationPromptFidelity_ts_1.parseInvitationLocks)(parsed.locks, 8);
    return {
        global: parsed.global,
        elements: parsed.elements,
        backgroundPrompt: decorParagraph,
        visualAnalysis,
        intent,
        locks,
        decorParagraph,
    };
}
async function visionStructure(key, prompt, imageUrls, options) {
    const hasRefs = imageUrls.length > 0;
    const preferOpenAi = (0, aiStudioModels_ts_1.isOpenAiStudioModel)(options?.preferredModel);
    const intent = options?.intent ||
        (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
            coupleFaceSwap: options?.coupleFaceSwap,
            isAlteration: options?.isAlteration,
            brief: options?.processed?.originalBrief || prompt,
        });
    const tryGemini = async () => {
        if (!(0, geminiJsonClient_ts_1.getGeminiApiKey)())
            return null;
        const parsed = await (0, geminiJsonClient_ts_1.requestGeminiJson)({
            system: structureSystemPrompt(Boolean(options?.embedText), options?.artStyle, Boolean(options?.isPublic), intent),
            userText: visionUserText(prompt, hasRefs, { ...options, intent }),
            imageUrls,
            temperature: 0.2,
            failMessage: 'Échec de l’analyse IA des images.',
        });
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            return visionResultFromParsed(parsed, prompt, hasRefs, {
                embedText: options?.embedText,
                coupleFaceSwap: options?.coupleFaceSwap,
                intent,
            });
        }
        return null;
    };
    if (!preferOpenAi) {
        try {
            const gemini = await tryGemini();
            if (gemini)
                return gemini;
        }
        catch (error) {
            console.warn('[invitationTemplateAi] Gemini structure failed, falling back to OpenAI:', error?.message);
        }
    }
    if (!key) {
        if (preferOpenAi) {
            try {
                const gemini = await tryGemini();
                if (gemini)
                    return gemini;
            }
            catch (error) {
                console.warn('[invitationTemplateAi] Gemini fallback after missing OpenAI key failed:', error?.message);
            }
        }
        fail(503, 'La génération IA n’est pas configurée (GEMINI_API_KEY ou OPENAI_API_KEY).');
    }
    const visionModel = options?.preferredModel &&
        (0, aiStudioModels_ts_1.isOpenAiStudioModel)(options.preferredModel) &&
        !options.preferredModel.includes('gpt-image')
        ? options.preferredModel
        : process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
    try {
        const parsed = await (0, openaiJsonClient_ts_1.requestOpenAiJson)({
            system: structureSystemPrompt(Boolean(options?.embedText), options?.artStyle, Boolean(options?.isPublic), intent),
            userText: visionUserText(prompt, hasRefs, { ...options, intent }),
            imageUrls,
            temperature: 0.2,
            failMessage: 'Échec de l’analyse IA des images.',
            model: visionModel,
        });
        return visionResultFromParsed(parsed, prompt, hasRefs, {
            embedText: options?.embedText,
            coupleFaceSwap: options?.coupleFaceSwap,
            intent,
        });
    }
    catch (error) {
        if (preferOpenAi) {
            console.warn('[invitationTemplateAi] OpenAI structure failed, falling back to Gemini:', error?.message);
            try {
                const gemini = await tryGemini();
                if (gemini)
                    return gemini;
            }
            catch (geminiErr) {
                console.warn('[invitationTemplateAi] Gemini fallback after OpenAI failed:', geminiErr?.message);
            }
        }
        if (error?.status)
            throw error;
        fail(502, error?.message || 'Impossible d’analyser les images avec l’IA.');
    }
}
async function downloadReferenceImage(url) {
    const targetUrl = (0, invitationPromptFidelity_ts_1.optimizeReferenceImageUrl)(url);
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
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Télécharge et précharge en mémoire toutes les photos de référence en parallèle via Promise.allSettled.
 * Évite les téléchargements séquentiels et les ré-appels réseau inutiles lors de multiples variantes ou replis.
 */
async function preloadReferenceImages(urls) {
    const validUrls = urls
        .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
        .slice(0, 4);
    if (!validUrls.length)
        return [];
    const results = await Promise.allSettled(validUrls.map(async (url) => {
        const { buffer, mimeType } = await downloadReferenceImage(url);
        return {
            mimeType,
            base64: buffer.toString('base64'),
        };
    }));
    const preloaded = [];
    for (const res of results) {
        if (res.status === 'fulfilled') {
            preloaded.push(res.value);
        }
        else {
            console.warn('[invitationTemplateAi] Skip ref download in parallel preload:', res.reason?.message);
        }
    }
    return preloaded;
}
async function downloadImageAsPngBuffer(url) {
    const { buffer } = await downloadReferenceImage(url);
    return buffer;
}
async function uploadGeneratedB64(b64, tenantId) {
    const buffer = Buffer.from(b64, 'base64');
    const uploaded = await (0, cloudinaryService_1.uploadImageBuffer)(buffer, (0, cloudinaryConfig_1.getTemplateUploadFolder)(tenantId), 'ai-bg');
    return uploaded.url;
}
function isDallEModel(model) {
    return /^dall-e/i.test(model.trim());
}
function responsesModel(preferred) {
    const id = String(preferred || '').trim();
    if (id && (0, aiStudioModels_ts_1.isOpenAiStudioModel)(id) && !id.includes('gpt-image')) {
        return id;
    }
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
 * Génération / édition via l’agent OpenAI (Responses API + outil image_generation).
 * Les images de référence sont fournies en input_image ; Astra ou Luna orchestre gpt-image-*.
 */
async function generateImageWithGpt56Luna(key, imagePrompt, referenceUrls, tenantId, options) {
    const model = responsesModel(options?.preferredModel);
    const hasRefs = referenceUrls.length > 0;
    const textRule = options?.embedText
        ? 'Embed sharp invitation typography (names, date, venue from the brief) on the card without covering faces.'
        : invitationPromptFidelity_ts_1.NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE;
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
        ? `EDIT the attached photo(s). Keep the SAME faces — pixels win over any text. Do not invent lookalikes.\n\n${imagePrompt}`
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
    const body = {
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
        let payload = (await response.json().catch(() => ({})));
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
            payload = (await response.json().catch(() => ({})));
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
const NANO_BANANA_PRO = 'gemini-3-pro-image';
const NANO_BANANA_FLASH = 'gemini-3.1-flash-image';
function getNanoBananaProModel() {
    return process.env.NANO_BANANA_MODEL || process.env.GEMINI_IMAGE_MODEL || NANO_BANANA_PRO;
}
function getNanoBananaFlashModel() {
    return process.env.NANO_BANANA_FLASH_MODEL || NANO_BANANA_FLASH;
}
/**
 * Chaîne de repli des modèles Nano Banana.
 * En mode 'fast', le modèle Flash (gemini-3.1-flash-image) est interrogé en premier pour un rendu en ~4-8s.
 * En mode 'quality', le modèle Pro (gemini-3-pro-image 2K) est privilégié pour un piqué maximal.
 */
function getNanoBananaModelChain(speedMode, preferredModel) {
    const custom = preferredModel?.trim() && !(0, aiStudioModels_ts_1.isOpenAiStudioModel)(preferredModel)
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
async function executeNanoBananaRawRequest(apiKey, promptText, refImages, model) {
    const isFlash = model.toLowerCase().includes('flash');
    const TIMEOUT_MS = isFlash ? 35_000 : 55_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        let b64 = null;
        let safetyTriggered = false;
        let safetyDetail = '';
        // Tentative 1 : Google Interactions API (format 9:16, 2K)
        const interactionInput = [];
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
                const data = (await interactionsRes.json().catch(() => ({})));
                // 1. Extraire l'image si elle a été générée avec succès
                if (typeof data.output_image?.data === 'string' && data.output_image.data) {
                    b64 = data.output_image.data;
                }
                else if (Array.isArray(data.steps)) {
                    for (const step of data.steps) {
                        const imgBlock = step.content?.find((c) => c.type === 'image' && typeof c.data === 'string' && c.data.length > 0);
                        if (imgBlock?.data) {
                            b64 = imgBlock.data;
                            break;
                        }
                    }
                }
                // 2. Si aucune image n'a été produite, vérifier si un filtre de sécurité a bloqué la génération
                if (!b64 && (0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(null, data)) {
                    safetyTriggered = true;
                    safetyDetail = 'Interactions API safety filter triggered';
                }
            }
            else {
                const errText = await interactionsRes.text().catch(() => '');
                if ((0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(errText)) {
                    safetyTriggered = true;
                    safetyDetail = errText;
                }
                console.warn('[invitationTemplateAi] Nano Banana interactions API non-200:', errText.slice(0, 300));
            }
        }
        catch (interactErr) {
            if (interactErr?.name === 'AbortError') {
                throw new Error(`Timeout: la requête Nano Banana interactions a dépassé ${TIMEOUT_MS / 1000}s.`);
            }
            if ((0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(interactErr)) {
                safetyTriggered = true;
                safetyDetail = interactErr?.message;
            }
            console.warn('[invitationTemplateAi] Nano Banana interactions attempt error:', interactErr?.message);
        }
        if (safetyTriggered && !b64) {
            const safetyErr = new Error(`SafetyFilterTriggered: ${safetyDetail}`);
            safetyErr.status = 400;
            throw safetyErr;
        }
        // Tentative 2 : Standard generateContent API avec responseModalities IMAGE & aspectRatio 9:16
        if (!b64) {
            const generateParts = [];
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
                const generateRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(generatePayload),
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
                    if (!b64 && (0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(null, genData)) {
                        const blockInfo = genData.promptFeedback?.blockReason || genData.candidates?.[0]?.finishReason || 'SAFETY';
                        const safetyErr = new Error(`SafetyFilterTriggered: ${blockInfo}`);
                        safetyErr.status = 400;
                        throw safetyErr;
                    }
                }
                else {
                    const genErr = await generateRes.text().catch(() => '');
                    if ((0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(genErr)) {
                        const safetyErr = new Error(`SafetyFilterTriggered: ${genErr}`);
                        safetyErr.status = 400;
                        throw safetyErr;
                    }
                    console.warn('[invitationTemplateAi] Nano Banana generateContent API non-200:', genErr.slice(0, 300));
                }
            }
            catch (genErr) {
                if (genErr?.name === 'AbortError') {
                    throw new Error(`Timeout: la requête Nano Banana generateContent a dépassé ${TIMEOUT_MS / 1000}s.`);
                }
                if ((0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(genErr)) {
                    const safetyErr = new Error(`SafetyFilterTriggered: ${genErr?.message}`);
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
    }
    finally {
        clearTimeout(timer);
    }
}
/**
 * Génération et composition d'invitation avec Nano Banana Pro (gemini-3-pro-image).
 * Exploite la référence multimodale (Image Reference Binding prioritaire dans contents),
 * les directives RAW candid anti-lissage, et le ratio portrait vertical 9:16 natif.
 * Inclut un fallback automatique vers un arrière-plan thématique générique sans humains en cas de blocage sécurité.
 */
async function generateImageWithNanoBanana(apiKey, imagePrompt, referenceUrls, tenantId, options, model = getNanoBananaProModel()) {
    const hasRefs = referenceUrls.length > 0;
    const hasPeople = Boolean(options?.hasPeople);
    // Utilisation des images de référence déjà préchargées en mémoire (Levier B) ou téléchargement parallèle
    let refImages = [];
    if (options?.preloadedRefImages && options.preloadedRefImages.length > 0) {
        refImages = options.preloadedRefImages;
    }
    else if (hasRefs) {
        refImages = await preloadReferenceImages(referenceUrls);
    }
    let promptText = imagePrompt;
    if (hasPeople || hasRefs) {
        const hasFaceLock = promptText.includes(invitationPromptFidelity_ts_1.NANO_BANANA_COMPACT_FACE_LOCK) ||
            promptText.includes('RAW candid') ||
            promptText.includes(invitationPromptFidelity_ts_1.NANO_BANANA_STYLE_INSTRUCTION);
        if (!hasFaceLock) {
            promptText = `${promptText}\n\n${invitationPromptFidelity_ts_1.NANO_BANANA_COMPACT_FACE_LOCK}`;
        }
    }
    else {
        promptText = `Vertical 9:16 luxury invitation. ${(0, invitationArtStyle_ts_1.invitationArtStyleImageDirective)((0, invitationArtStyle_ts_1.parseInvitationArtStyle)(options?.artStyle))} ${(0, invitationArtStyle_ts_1.invitationArtStyleCraftNotes)()} If people appear, Black African hosts only — never Caucasian stock faces.
${options?.embedText ? 'Embed invitation typography from the brief.\n' : `${invitationPromptFidelity_ts_1.NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE}\n`}
${imagePrompt}`;
    }
    try {
        const b64 = await executeNanoBananaRawRequest(apiKey, promptText, refImages, model);
        const url = await uploadGeneratedB64(b64, tenantId);
        return { url, mode: hasPeople || hasRefs ? 'edit' : 'generate', safetyFallbackTriggered: false };
    }
    catch (error) {
        // Gestion du fallback automatique en cas de filtre de sécurité sur visages réels
        if ((0, invitationPromptFidelity_ts_1.isSafetyFilterTriggered)(error) && (hasPeople || hasRefs)) {
            console.warn(`[invitationTemplateAi] Filtre de sécurité Nano Banana déclenché sur photo humaine (${error?.message}). Bascule automatique vers arrière-plan thématique générique sans humains...`);
            try {
                const fallbackPrompt = (0, invitationPromptFidelity_ts_1.buildGenericThematicBackgroundPrompt)(imagePrompt, options);
                const fallbackB64 = await executeNanoBananaRawRequest(apiKey, fallbackPrompt, [], // Aucune photo de référence humaine pour contourner le filtre facial
                model);
                const url = await uploadGeneratedB64(fallbackB64, tenantId);
                return { url, mode: 'generate', safetyFallbackTriggered: true };
            }
            catch (fallbackErr) {
                console.warn('[invitationTemplateAi] Nano Banana fallback décoratif sans humains a échoué:', fallbackErr?.message);
                throw fallbackErr;
            }
        }
        if (error?.status)
            throw error;
        fail(502, error?.message || `Erreur lors de la génération avec Nano Banana (${model}).`);
    }
}
/**
 * 1) Nano Banana Pro (gemini-3-pro-image)
 * 2) Nano Banana 2 / Flash (gemini-3.1-flash-image)
 * 3) GPT-5.6 Luna (Responses + image_generation)
 * 4) Images API edits sur la 1re référence
 * 5) Images API generate classique
 */
async function generateInvitationImageWithOpenAi(key, imageUrls, imagePrompt, tenantId, options) {
    const preferImageApi = (options?.preferredModel || '').includes('gpt-image');
    const tryLuna = async () => {
        const lunaRes = await generateImageWithGpt56Luna(key, imagePrompt, imageUrls, tenantId, {
            hasPeople: options?.hasPeople,
            embedText: options?.embedText,
            preferredModel: options?.preferredModel,
        });
        return { ...lunaRes, safetyFallbackTriggered: false };
    };
    if (!preferImageApi) {
        try {
            return await tryLuna();
        }
        catch (lunaErr) {
            console.warn('[invitationTemplateAi] gpt-5.6-luna image failed, falling back:', lunaErr?.message);
        }
    }
    if (options?.hasPeople && imageUrls.length > 0) {
        try {
            const url = await generateBackgroundFromReference(key, imageUrls[0], imagePrompt, tenantId);
            return { url, mode: 'edit', safetyFallbackTriggered: false };
        }
        catch (editErr) {
            console.warn('[invitationTemplateAi] image edit fallback failed, falling back to text generation:', editErr?.message);
        }
    }
    try {
        const url = await generateBackgroundFromPrompt(key, imagePrompt, tenantId);
        return { url, mode: 'generate', safetyFallbackTriggered: false };
    }
    catch (genErr) {
        console.warn('[invitationTemplateAi] images/generations failed, trying edits:', genErr?.message);
    }
    if (preferImageApi) {
        try {
            return await tryLuna();
        }
        catch (lunaErr) {
            console.warn('[invitationTemplateAi] gpt-5.6-luna after Images API failed:', lunaErr?.message);
        }
    }
    const primary = imageUrls[0];
    if (!primary) {
        fail(502, 'Impossible de créer la nouvelle image via OpenAI.');
    }
    const url = await generateBackgroundFromReference(key, primary, imagePrompt, tenantId);
    return { url, mode: 'edit', safetyFallbackTriggered: false };
}
async function createNewInvitationImage(key, imageUrls, imagePrompt, tenantId, options) {
    const nanoKey = getNanoBananaApiKey();
    const prefersOpenAi = (0, aiStudioModels_ts_1.isOpenAiStudioModel)(options?.preferredModel);
    if (prefersOpenAi && key) {
        try {
            console.log(`[invitationTemplateAi] Generating with OpenAI (${options?.preferredModel}) as principal model...`);
            return await generateInvitationImageWithOpenAi(key, imageUrls, imagePrompt, tenantId, options);
        }
        catch (openAiErr) {
            console.warn('[invitationTemplateAi] OpenAI principal failed, falling back to Nano Banana:', openAiErr?.message);
        }
    }
    if (nanoKey) {
        const chain = getNanoBananaModelChain(options?.speedMode, options?.preferredModel);
        for (let i = 0; i < chain.length; i++) {
            const model = chain[i];
            const next = chain[i + 1];
            try {
                console.log(`[invitationTemplateAi] Generating with Nano Banana (${model}, speed=${options?.speedMode || 'quality'})...`);
                return await generateImageWithNanoBanana(nanoKey, imagePrompt, imageUrls, tenantId, options, model);
            }
            catch (nanoErr) {
                console.warn(`[invitationTemplateAi] Nano Banana (${model}) failed, falling back to ${next || 'Luna/OpenAI'}:`, nanoErr?.message);
            }
        }
    }
    if (key && !prefersOpenAi) {
        try {
            return await generateInvitationImageWithOpenAi(key, imageUrls, imagePrompt, tenantId, options);
        }
        catch (openAiErr) {
            console.warn('[invitationTemplateAi] OpenAI fallback failed:', openAiErr?.message);
        }
    }
    if (!imageUrls[0] && nanoKey) {
        try {
            console.warn('[invitationTemplateAi] Filet de sécurité anti-blocage: tentative finale d\'arrière-plan décoratif sans humains via Nano Banana...');
            const fallbackPrompt = (0, invitationPromptFidelity_ts_1.buildGenericThematicBackgroundPrompt)(imagePrompt, options);
            const fallbackB64 = await executeNanoBananaRawRequest(nanoKey, fallbackPrompt, [], getNanoBananaProModel());
            const url = await uploadGeneratedB64(fallbackB64, tenantId);
            return { url, mode: 'generate', safetyFallbackTriggered: true };
        }
        catch (finalFallbackErr) {
            console.warn('[invitationTemplateAi] Échec du filet de sécurité décoratif Nano Banana:', finalFallbackErr?.message);
        }
    }
    if (!key) {
        fail(502, 'Impossible de créer la nouvelle image (Nano Banana). Ajoutez OPENAI_API_KEY pour le repli.');
    }
    fail(502, 'Impossible de créer la nouvelle image (Nano Banana + Luna + Images API).');
}
async function judgeInvitationImage(input) {
    const userText = (0, invitationPromptFidelity_ts_1.buildInvitationImageJudgeUserText)({
        intent: input.intent,
        originalBrief: input.originalBrief,
        locks: input.locks,
        expectedPeople: input.expectedPeople,
        embedText: input.embedText,
        isPublic: input.isPublic,
    });
    const refs = input.referenceUrls
        .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url))
        .slice(0, 3);
    const geminiImages = [...refs, input.generatedUrl];
    const openAiImages = [input.generatedUrl, ...refs];
    const tryGemini = async () => {
        if (!(0, geminiJsonClient_ts_1.getGeminiApiKey)())
            return null;
        const parsed = await (0, geminiJsonClient_ts_1.requestGeminiJson)({
            system: invitationPromptFidelity_ts_1.INVITATION_IMAGE_JUDGE_SYSTEM,
            userText,
            imageUrls: geminiImages,
            temperature: 0.1,
            timeoutMs: 25_000,
            failMessage: 'Invitation image judge failed.',
        });
        return (0, invitationPromptFidelity_ts_1.parseInvitationImageJudgeVerdict)(parsed);
    };
    try {
        const gemini = await tryGemini();
        if (gemini)
            return gemini;
    }
    catch (error) {
        console.warn('[invitationTemplateAi] Gemini image judge failed, trying OpenAI:', error?.message);
    }
    if (!input.key)
        return null;
    try {
        const visionModel = input.preferredModel &&
            (0, aiStudioModels_ts_1.isOpenAiStudioModel)(input.preferredModel) &&
            !input.preferredModel.includes('gpt-image')
            ? input.preferredModel
            : process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
        const parsed = await (0, openaiJsonClient_ts_1.requestOpenAiJson)({
            system: invitationPromptFidelity_ts_1.INVITATION_IMAGE_JUDGE_SYSTEM,
            userText,
            imageUrls: openAiImages,
            temperature: 0.1,
            timeoutMs: 25_000,
            failMessage: 'Invitation image judge failed.',
            model: visionModel,
        });
        return (0, invitationPromptFidelity_ts_1.parseInvitationImageJudgeVerdict)(parsed);
    }
    catch (error) {
        console.warn('[invitationTemplateAi] Image judge skipped (fail-open):', error?.message);
        return null;
    }
}
async function generateInvitationImageWithJudge(key, imageUrls, imagePrompt, tenantId, imageOptions, judgeInput) {
    const created = await createNewInvitationImage(key, imageUrls, imagePrompt, tenantId, imageOptions);
    if (created.safetyFallbackTriggered || !created.url) {
        return { ...created, judge: null, retried: false };
    }
    const judge = await judgeInvitationImage({
        key,
        generatedUrl: created.url,
        referenceUrls: imageUrls,
        intent: judgeInput.intent,
        originalBrief: judgeInput.originalBrief,
        locks: judgeInput.locks,
        expectedPeople: judgeInput.expectedPeople,
        embedText: imageOptions.embedText,
        isPublic: judgeInput.isPublic,
        preferredModel: imageOptions.preferredModel,
    });
    if (!(0, invitationPromptFidelity_ts_1.shouldRetryInvitationImage)(judge)) {
        return { ...created, judge, retried: false };
    }
    try {
        const retryPrompt = (0, invitationPromptFidelity_ts_1.buildInvitationImageRetryPrompt)(imagePrompt, judge);
        const retried = await createNewInvitationImage(key, imageUrls, retryPrompt, tenantId, imageOptions);
        if (retried.safetyFallbackTriggered || !retried.url) {
            return { ...created, judge, retried: false };
        }
        return { ...retried, judge, retried: true };
    }
    catch (error) {
        console.warn('[invitationTemplateAi] Image judge retry failed, keeping first image:', error?.message);
        return { ...created, judge, retried: false };
    }
}
async function writeInvitationOverlayCopy(input) {
    const language = input.language || (0, invitationPromptFidelity_ts_1.detectInvitationCopyLanguage)(input.originalBrief);
    const userText = (0, invitationPromptFidelity_ts_1.buildInvitationCopyUserText)({
        originalBrief: input.originalBrief,
        language,
        isPublic: input.isPublic,
        organizerContext: input.organizerContext,
        intent: input.intent,
    });
    const tryGemini = async () => {
        if (!(0, geminiJsonClient_ts_1.getGeminiApiKey)())
            return null;
        const parsed = await (0, geminiJsonClient_ts_1.requestGeminiJson)({
            system: invitationPromptFidelity_ts_1.INVITATION_COPY_SYSTEM,
            userText,
            temperature: 0.35,
            timeoutMs: 25_000,
            failMessage: 'Invitation copy failed.',
        });
        return (0, invitationPromptFidelity_ts_1.parseInvitationCopyDraft)(parsed, language);
    };
    try {
        const gemini = await tryGemini();
        if (gemini)
            return gemini;
    }
    catch (error) {
        console.warn('[invitationTemplateAi] Gemini overlay copy failed, trying OpenAI:', error?.message);
    }
    if (!input.key)
        return null;
    try {
        const model = input.preferredModel &&
            (0, aiStudioModels_ts_1.isOpenAiStudioModel)(input.preferredModel) &&
            !input.preferredModel.includes('gpt-image')
            ? input.preferredModel
            : process.env.OPENAI_VISION_MODEL || process.env.OPENAI_MODEL || 'gpt-5.6-luna';
        const parsed = await (0, openaiJsonClient_ts_1.requestOpenAiJson)({
            system: invitationPromptFidelity_ts_1.INVITATION_COPY_SYSTEM,
            userText,
            temperature: 0.35,
            timeoutMs: 25_000,
            failMessage: 'Invitation copy failed.',
            model,
        });
        return (0, invitationPromptFidelity_ts_1.parseInvitationCopyDraft)(parsed, language);
    }
    catch (error) {
        console.warn('[invitationTemplateAi] Overlay copy skipped (fail-open):', error?.message);
        return null;
    }
}
function ensurePublicTemplateVariables(elements) {
    const result = elements.map((el) => ({ ...el }));
    const textEls = result.filter((el) => el.type === 'text' && typeof el.text === 'string' && el.text.trim().length > 0);
    const hasTitleVar = result.some((el) => typeof el.text === 'string' && el.text.includes('{{title}}'));
    const hasDateVar = result.some((el) => typeof el.text === 'string' && el.text.includes('{{date}}'));
    const hasLocationVar = result.some((el) => typeof el.text === 'string' && el.text.includes('{{location}}'));
    const hasFirstNameVar = result.some((el) => typeof el.text === 'string' && el.text.includes('{{firstName}}'));
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
            }
            else if (/anniversaire|fête|célébration/i.test(current)) {
                mainTitleEl.text = 'Célébration de {{title}}';
            }
            else if (/gala|soirée|nuit/i.test(current)) {
                mainTitleEl.text = 'Gala : {{title}}';
            }
            else {
                mainTitleEl.text = '{{title}}';
            }
        }
    }
    // 2. Date de l'événement
    if (!hasDateVar) {
        const dateEl = textEls.find((el) => {
            const txt = String(el.text || '');
            return (!txt.includes('{{title}}') &&
                /\b(202\d|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}h\d{0,2}|date|heure)\b/i.test(txt));
        });
        if (dateEl) {
            const txt = String(dateEl.text || '');
            if (txt.includes('\n')) {
                const parts = txt.split('\n');
                dateEl.text = `Le {{date}}\n${parts[1] || '{{location}}'}`;
            }
            else {
                dateEl.text = 'Le {{date}}';
            }
        }
        else {
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
            return (!txt.includes('{{title}}') &&
                !txt.includes('{{date}}') &&
                /\b(salle|hôtel|palais|domaine|espace|salon|centre|kinshasa|lubumbashi|goma|avenue|boulevard|paris|lieu|adresse|villa|terrasse|rooftop)\b/i.test(txt));
        });
        if (locEl) {
            locEl.text = 'À {{location}}';
        }
        else {
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
            return (!txt.includes('{{title}}') &&
                !txt.includes('{{date}}') &&
                !txt.includes('{{location}}') &&
                /\b(cher|chère|invité|honneur|bienvenue|joie|prier|convier|invit|convi|présence)\b/i.test(txt));
        });
        if (introEl) {
            const txt = String(introEl.text || '');
            if (!/\{\{firstName\}\}/.test(txt)) {
                introEl.text = `Cher(e) {{firstName}}, ${txt}`;
            }
        }
        else if (textEls.length > 0) {
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
async function composeInvitationTemplateAi(input) {
    rateLimit(input.userId);
    const coupleFaceSwap = Boolean(input.coupleFaceSwap);
    const structuredBrief = (0, invitationStructuredBrief_ts_1.parseInvitationStructuredBrief)(input.structuredBrief);
    const promptRaw = (0, invitationStructuredBrief_ts_1.mergeInvitationStructuredBrief)(String(input.prompt || '').trim(), structuredBrief);
    const prompt = promptRaw.length >= 8
        ? promptRaw
        : coupleFaceSwap
            ? (0, invitationStructuredBrief_ts_1.mergeInvitationStructuredBrief)(invitationPromptFidelity_ts_1.COUPLE_FACE_SWAP_DEFAULT_PROMPT, structuredBrief)
            : '';
    if (prompt.length < 8) {
        fail(400, 'Décrivez le style d’invitation souhaité (au moins quelques mots).');
    }
    const isPublic = Boolean(input.isPublic || !input.tenantId);
    // Règle stricte : pour tout modèle public, interdiction d'écrire sur l'image directement
    const embedText = isPublic ? false : Boolean(input.embedText);
    const artStyle = (0, invitationArtStyle_ts_1.parseInvitationArtStyle)(input.artStyle);
    const artStyleLine = (0, invitationArtStyle_ts_1.invitationArtStyleScaffoldLine)(artStyle);
    const isAlteration = coupleFaceSwap ||
        Boolean(input.isAlteration) ||
        /retouch|ajust|refin|altér|réajust|modifier/i.test(prompt);
    const rawImageUrls = (input.imageUrls || [])
        .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u.trim()))
        .map((u) => u.trim());
    if (input.baseImageUrl && /^https?:\/\//i.test(input.baseImageUrl.trim()) && !rawImageUrls.includes(input.baseImageUrl.trim())) {
        rawImageUrls.unshift(input.baseImageUrl.trim());
    }
    let imageUrls = rawImageUrls.slice(0, 4);
    if (coupleFaceSwap && imageUrls.length < 2) {
        fail(400, 'Ajoutez l’image à modifier et au moins une photo du couple.');
    }
    const pipelineIntentEarly = (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
        coupleFaceSwap,
        isAlteration,
        brief: prompt,
    });
    let styleRefsOnly = false;
    if (pipelineIntentEarly === 'create' && imageUrls.length === 0) {
        const styleRefs = await (0, invitationStyleRefs_ts_1.loadEventMasterStyleRefUrls)(2);
        if (styleRefs.length) {
            imageUrls = styleRefs;
            styleRefsOnly = true;
        }
    }
    const styleFewshot = pipelineIntentEarly === 'create' ? invitationStructuredBrief_ts_1.EVENTMASTER_STYLE_FEWSHOT : '';
    const existingElements = Array.isArray(input.existingElements) ? input.existingElements : [];
    const existingTextSummaries = existingElements
        .filter((el) => el && typeof el.text === 'string' && el.text.trim().length > 0)
        .map((el) => `${el.type || 'text'}: "${el.text.trim()}"`);
    const enrichedPrompt = isAlteration && existingTextSummaries.length > 0
        ? `${prompt}. PRESERVATION DU CONTEXTE : Le carton existant contient [${existingTextSummaries.join(', ')}]. Conserver impérativement ces informations clés (noms, date, lieu) et la disposition générale, en appliquant avec précision la retouche demandée.`
        : prompt;
    const processed = (0, invitationPromptFidelity_ts_1.processUserPromptForHonestFaces)(enrichedPrompt, {
        referenceCount: styleRefsOnly ? 0 : imageUrls.length,
        embedText,
        artStyleLine,
        coupleFaceSwap,
    });
    const pipelineIntent = (0, invitationPromptFidelity_ts_1.resolveInvitationPipelineIntent)({
        coupleFaceSwap,
        isAlteration,
        brief: enrichedPrompt,
    });
    const contextSource = (0, invitationComposeContext_ts_1.parseInvitationContextSource)(input.contextSource);
    const composeContext = await (0, invitationComposeContext_ts_1.loadInvitationComposeContext)({
        userId: input.authUserId || input.userId,
        tenantId: input.tenantId,
        deviceId: input.deviceId,
        currentPrompt: enrichedPrompt,
        source: contextSource,
    });
    const organizerContextEn = (0, invitationComposeContext_ts_1.formatContextForImage)(composeContext, contextSource);
    const organizerContextCopy = (0, invitationComposeContext_ts_1.formatContextForVision)(composeContext, contextSource);
    const key = requireAiConfigured();
    const structured = await visionStructure(key, processed.originalBrief, imageUrls, {
        embedText,
        organizerContext: organizerContextEn,
        processed,
        artStyle,
        isAlteration,
        existingElements,
        isPublic,
        coupleFaceSwap,
        preferredModel: input.preferredModel || undefined,
        intent: pipelineIntent,
        styleRefsOnly,
        styleFewshot,
    });
    if ((!imageUrls.length || styleRefsOnly) && structured.visualAnalysis) {
        structured.visualAnalysis.hasPeople = false;
        structured.visualAnalysis.peopleCount = 0;
    }
    const resolvedIntent = (0, invitationPromptFidelity_ts_1.resolveFinalInvitationPipelineIntent)({
        local: pipelineIntent,
        vision: structured.intent,
        isInvitationClone: structured.visualAnalysis?.isInvitationClone,
    });
    const imageLocks = structured.locks.length
        ? structured.locks
        : (0, invitationPromptFidelity_ts_1.buildInvitationLocks)({
            intent: resolvedIntent,
            analysis: structured.visualAnalysis,
            embedText,
            isPublic,
            referenceCount: imageUrls.length,
            explicitAppearanceChange: processed.explicitAppearanceChange,
        });
    const imagePrompt = buildImagePrompt(processed.originalBrief, structured.decorParagraph || structured.backgroundPrompt, structured.visualAnalysis, {
        embedText,
        organizerContext: [organizerContextEn, styleFewshot].filter(Boolean).join('\n'),
        processed,
        artStyle,
        isAlteration,
        isPublic,
        coupleFaceSwap,
        intent: resolvedIntent,
        locks: imageLocks,
        decorParagraph: structured.decorParagraph,
        referenceCount: imageUrls.length,
    });
    let bgImageUrl = '';
    let imageMode = null;
    let safetyFallbackTriggered = false;
    let imageJudge = null;
    let imageJudgeRetried = false;
    const variants = [];
    const variantRoles = [];
    const wantBg = input.generateBackground !== false;
    const requestedVariantsCount = Math.min(2, Math.max(1, Number(input.variantsCount) || 1));
    const speedMode = input.speedMode === 'fast' ? 'fast' : 'quality';
    if (wantBg) {
        try {
            // Levier B: Préchargement parallèle des photos de référence une seule fois en mémoire
            const preloadedRefImages = imageUrls.length > 0
                ? await preloadReferenceImages(imageUrls)
                : [];
            const imageOptions = {
                hasPeople: (coupleFaceSwap || Boolean(structured.visualAnalysis?.hasPeople)) && imageUrls.length > 0 && !styleRefsOnly,
                embedText,
                artStyle,
                speedMode,
                preloadedRefImages,
                preferredModel: input.preferredModel || undefined,
            };
            const judgeInput = {
                intent: resolvedIntent,
                originalBrief: processed.originalBrief,
                locks: imageLocks,
                expectedPeople: coupleFaceSwap
                    ? Math.max(1, imageUrls.length - 1)
                    : structured.visualAnalysis?.peopleCount || 0,
                isPublic,
            };
            if (requestedVariantsCount >= 2) {
                const promptA = (0, invitationPromptFidelity_ts_1.buildFaithfulImagePrompt)(imagePrompt);
                const promptB = (0, invitationPromptFidelity_ts_1.buildAmpleImagePrompt)(imagePrompt, imageUrls.length > 0);
                const [resA, resB] = await Promise.allSettled([
                    generateInvitationImageWithJudge(key, imageUrls, promptA, input.tenantId, imageOptions, judgeInput),
                    createNewInvitationImage(key, imageUrls, promptB, input.tenantId, imageOptions),
                ]);
                if (resA.status === 'fulfilled') {
                    bgImageUrl = resA.value.url;
                    imageMode = resA.value.mode;
                    safetyFallbackTriggered = Boolean(resA.value.safetyFallbackTriggered);
                    imageJudge = resA.value.judge;
                    imageJudgeRetried = resA.value.retried;
                    variants.push(bgImageUrl);
                    variantRoles.push('faithful');
                }
                if (resB.status === 'fulfilled') {
                    const urlB = resB.value.url;
                    if (urlB && urlB !== bgImageUrl) {
                        variants.push(urlB);
                        variantRoles.push('ample');
                    }
                    if (!bgImageUrl && urlB) {
                        bgImageUrl = urlB;
                        imageMode = resB.value.mode;
                        safetyFallbackTriggered = Boolean(resB.value.safetyFallbackTriggered);
                        if (!variantRoles.includes('ample'))
                            variantRoles.push('ample');
                    }
                }
                else {
                    console.warn('[invitationTemplateAi] Échec de la variante B (non-bloquant):', resB.reason?.message);
                }
                if (!bgImageUrl) {
                    const errA = resA.status === 'rejected' ? resA.reason : new Error('Échec de la génération des variantes');
                    if (errA?.status)
                        throw errA;
                    fail(502, errA?.message || 'La création de la nouvelle image a échoué.');
                }
            }
            else {
                const created = await generateInvitationImageWithJudge(key, imageUrls, imagePrompt, input.tenantId, imageOptions, judgeInput);
                bgImageUrl = created.url;
                imageMode = created.mode;
                safetyFallbackTriggered = Boolean(created.safetyFallbackTriggered);
                imageJudge = created.judge;
                imageJudgeRetried = created.retried;
                if (bgImageUrl) {
                    variants.push(bgImageUrl);
                    variantRoles.push('faithful');
                }
            }
        }
        catch (err) {
            // La création d’image est centrale : on remonte l’erreur au client.
            if (err?.status)
                throw err;
            fail(502, err?.message || 'La création de la nouvelle image a échoué.');
        }
    }
    const global = sanitizeGlobal(structured.global, bgImageUrl);
    if (variants.length > 0) {
        global.aiVariants = variants;
        global.variants = variants;
        global.aiVariantRoles = variantRoles;
    }
    if (safetyFallbackTriggered) {
        global.aiSafetyFallbackTriggered = true;
    }
    global.aiSpeedMode = speedMode;
    if (structured.visualAnalysis) {
        global.aiVisualAnalysis = structured.visualAnalysis;
    }
    global.aiEmbedText = embedText;
    global.aiArtStyle = artStyle;
    global.aiContextSource = contextSource;
    if ((0, invitationComposeContext_ts_1.hasUsableComposeContext)(composeContext)) {
        global.aiOrganizerContext = {
            source: contextSource,
            organizerName: composeContext.organizerName,
            organizationName: composeContext.organizationName,
            accountKind: composeContext.accountKind,
            recentEventTitles: composeContext.recentEvents.map((event) => event.title),
            usedPriorPrompts: composeContext.recentPrompts.length,
        };
    }
    if (processed.beautifyStripped) {
        global.aiFaceHonesty = 'beautify-stripped';
    }
    global.aiEnglishSceneBrief =
        structured.decorParagraph || processed.englishSceneBrief;
    global.aiOriginalBrief = processed.originalBrief;
    global.aiPipelineIntent = resolvedIntent;
    global.aiLocks = imageLocks;
    if ((0, invitationStructuredBrief_ts_1.hasInvitationStructuredBrief)(structuredBrief)) {
        global.aiStructuredBrief = structuredBrief;
    }
    if (styleRefsOnly) {
        global.aiStyleRefsUsed = imageUrls.length;
    }
    if (imageJudge) {
        global.aiJudgeScore = imageJudge.score;
        global.aiJudgePass = imageJudge.pass;
        global.aiJudgeDefects = imageJudge.defects;
        global.aiJudgeRetryDirective = imageJudge.retryDirective;
    }
    global.aiJudgeRetried = imageJudgeRetried;
    let elements = sanitizeElements(structured.elements);
    let preservedExistingCopy = false;
    if (isAlteration && existingElements.length > 0 && !embedText) {
        // Si on modifie un modèle existant, on préserve sa disposition et on applique les écrits
        elements = existingElements.map((el) => ({ ...el }));
        preservedExistingCopy = true;
    }
    let copyWritten = false;
    if (!embedText && !preservedExistingCopy) {
        const copyDraft = await writeInvitationOverlayCopy({
            key,
            originalBrief: processed.originalBrief,
            isPublic,
            intent: resolvedIntent,
            organizerContext: organizerContextCopy || organizerContextEn,
            preferredModel: input.preferredModel || undefined,
            language: structuredBrief.language,
        });
        if (copyDraft) {
            const palette = global.palette;
            elements = (0, invitationPromptFidelity_ts_1.applyInvitationCopyToElements)(copyDraft, palette);
            global.aiCopyLanguage = copyDraft.language;
            global.aiCopyWritten = true;
            copyWritten = true;
        }
    }
    if (!copyWritten) {
        global.aiCopyWritten = false;
    }
    // Application de l'identité et des textes demandés par l'utilisateur (noms des mariés, date, lieu, titre)
    const structuredIdentity = {
        title: structuredBrief.title,
        honorees: structuredBrief.honorees,
        date: structuredBrief.date,
        description: structuredBrief.description,
        applyTitleToCard: Boolean(structuredBrief.title && structuredBrief.honorees && structuredBrief.title !== structuredBrief.honorees),
    };
    if ((0, invitationIdentity_1.hasInvitationIdentity)(structuredIdentity)) {
        const applied = (0, invitationIdentity_1.applyInvitationIdentityToContent)({ global, elements }, structuredIdentity);
        if (Array.isArray(applied.elements)) {
            elements = applied.elements;
        }
        if (applied.global && typeof applied.global === 'object') {
            Object.assign(global, applied.global);
        }
    }
    if (embedText) {
        elements = elements.filter((el) => el.type === 'rsvp-block');
    }
    const RSVP_TEXT_BY_LANGUAGE = {
        ln: 'Kondima kozala wana',
        sw: 'Thibitisha uwepo wako',
        kg: 'Tula kimbangi ya kukwiza',
        lua: 'Jadika dikalapu diebe',
    };
    const targetRsvpText = (structuredBrief.language && RSVP_TEXT_BY_LANGUAGE[structuredBrief.language]) ||
        'Confirmer votre présence';
    if (!elements.some((el) => el.type === 'rsvp-block')) {
        elements.push({
            id: `ai-rsvp-${Date.now()}`,
            type: 'rsvp-block',
            text: targetRsvpText,
            color: global.palette.accent,
            fontSize: '16px',
            align: 'center',
            width: 'full',
            rsvpPlacement: 'outside',
            positionMode: 'flow',
        });
    }
    else if (structuredBrief.language && RSVP_TEXT_BY_LANGUAGE[structuredBrief.language]) {
        const rsvpEl = elements.find((el) => el.type === 'rsvp-block');
        if (rsvpEl && (!rsvpEl.text || rsvpEl.text === 'Confirmer votre présence')) {
            rsvpEl.text = targetRsvpText;
        }
    }
    // Règle stricte pour les modèles publics : intégration obligatoire des variables dynamiques pour la personnalisation
    if (isPublic) {
        elements = ensurePublicTemplateVariables(elements);
        global.isPublicTemplate = true;
        global.hasCustomizableVariables = true;
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
            variants: variants.length > 0 ? variants : (bgImageUrl ? [bgImageUrl] : []),
            safetyFallbackTriggered,
            speedMode,
            judgeRetried: imageJudgeRetried,
            judgeScore: imageJudge?.score ?? null,
            copyWritten,
        },
    };
}

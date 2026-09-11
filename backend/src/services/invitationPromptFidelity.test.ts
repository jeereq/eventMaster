import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatContextForVision,
  formatContextForImage,
  hasUsableComposeContext,
  isPersistedUserId,
  parseInvitationContextSource,
  selectComposeContext,
  type InvitationComposeContext,
} from './invitationComposeContextUtils.ts';
import {
  NANO_BANANA_CLEAN_ARTWORK_DIRECTIVE,
  NANO_BANANA_CRITICAL_CONSTRAINT,
  NANO_BANANA_LIGHT_RIG_COHERENCE,
  NANO_BANANA_OPTICAL_BOKEH,
  NANO_BANANA_STYLE_INSTRUCTION,
  applyEnglishSceneBrief,
  buildEnglishSceneBriefScaffold,
  buildGenericThematicBackgroundPrompt,
  buildHonestFaceIdentityHeader,
  buildNanoBananaRawDirectives,
  buildReferenceRoles,
  buildVariantImagePrompt,
  isSafetyFilterTriggered,
  optimizeReferenceImageUrl,
  parseEnglishSceneBriefFromJson,
  processUserPromptForHonestFaces,
  stripFaceBeautifyLanguage,
} from './invitationPromptFidelity.ts';

const sampleContext = (): InvitationComposeContext => ({
  organizerName: 'Marie Kabila',
  organizationName: 'Salle Royale',
  accountKind: 'VENDOR',
  accountKindLabel: 'salle / prestataire',
  vendorCity: 'Kinshasa',
  recentEvents: [
    {
      title: 'Mariage Jean & Amina',
      kind: 'WEDDING',
      location: 'Gombe',
      date: '2026-10-12',
      clientName: 'Famille Mbuyi',
    },
  ],
  recentPrompts: ['Mariage floral or ivoire'],
});

describe('isPersistedUserId', () => {
  it('accepte un UUID et refuse une IP ou un device', () => {
    assert.equal(isPersistedUserId('3b1f0a2e-4c5d-4e6f-8a9b-0c1d2e3f4a5b'), true);
    assert.equal(isPersistedUserId('127.0.0.1'), false);
    assert.equal(isPersistedUserId('device_abc'), false);
    assert.equal(isPersistedUserId(''), false);
  });
});

describe('formatContextForVision', () => {
  it('injecte l’organisation sans les briefs d’historique', () => {
    const block = formatContextForVision(selectComposeContext(sampleContext(), 'org'), 'org');
    assert.match(block, /CONTEXTE ORGANISATION/);
    assert.match(block, /Marie Kabila/);
    assert.match(block, /Salle Royale/);
    assert.match(block, /Mariage Jean & Amina/);
    assert.doesNotMatch(block, /Mariage floral or ivoire/);
    assert.match(block, /N’invente aucun visage/);
  });

  it('injecte seulement l’historique de recherches', () => {
    const block = formatContextForVision(selectComposeContext(sampleContext(), 'history'), 'history');
    assert.match(block, /HISTORIQUE DE RECHERCHES/);
    assert.match(block, /Mariage floral or ivoire/);
    assert.doesNotMatch(block, /Salle Royale/);
  });

  it('reste vide sans données utiles', () => {
    assert.equal(hasUsableComposeContext({
      organizerName: null,
      organizationName: null,
      accountKind: null,
      accountKindLabel: null,
      vendorCity: null,
      recentEvents: [],
      recentPrompts: [],
    }), false);
    assert.equal(formatContextForVision({
      organizerName: null,
      organizationName: null,
      accountKind: null,
      accountKindLabel: null,
      vendorCity: null,
      recentEvents: [],
      recentPrompts: [],
    }), '');
  });
});

describe('selectComposeContext', () => {
  it('ne garde que l’organisation ou que l’historique', () => {
    const full = sampleContext();
    const org = selectComposeContext(full, 'org');
    assert.equal(org.organizationName, 'Salle Royale');
    assert.equal(org.recentPrompts.length, 0);
    assert.equal(org.recentEvents.length, 1);

    const history = selectComposeContext(full, 'history');
    assert.deepEqual(history.recentPrompts, ['Mariage floral or ivoire']);
    assert.equal(history.organizationName, null);
    assert.equal(history.recentEvents.length, 0);

    assert.equal(hasUsableComposeContext(selectComposeContext(full, 'none')), false);
  });

  it('ignore une valeur inconnue', () => {
    assert.equal(parseInvitationContextSource('both'), 'none');
    assert.equal(parseInvitationContextSource('org'), 'org');
  });
});

describe('formatContextForImage', () => {
  it('expose le contexte en anglais pour le modèle image', () => {
    const block = formatContextForImage(selectComposeContext(sampleContext(), 'org'), 'org');
    assert.match(block, /ORGANIZATION CONTEXT/);
    assert.match(block, /Marie Kabila/);
    assert.match(block, /wedding/);
    assert.match(block, /NEVER invent a face/);
    assert.doesNotMatch(block, /Mariage floral or ivoire/);
  });
});

describe('stripFaceBeautifyLanguage', () => {
  it('retire l’embellissement facial et garde le décor', () => {
    const { text, stripped } = stripFaceBeautifyLanguage(
      'Mariage floral or ivoire, embellir les visages et peau plus claire',
    );
    assert.equal(stripped, true);
    assert.match(text, /Mariage floral or ivoire/i);
    assert.doesNotMatch(text, /embellir/i);
    assert.doesNotMatch(text, /peau plus claire/i);
  });

  it('ne touche pas un brief décoratif sans idéalisation', () => {
    const { text, stripped } = stripFaceBeautifyLanguage(
      'Dot traditionnelle Kuba, tons ocre et cuivre, embellir le cadre doré',
    );
    assert.equal(stripped, false);
    assert.match(text, /embellir le cadre doré/);
  });
});

describe('processUserPromptForHonestFaces', () => {
  it('place l’ancre d’identité Gemini en tête quand des photos sont fournies', () => {
    const processed = processUserPromptForHonestFaces(
      'Intégrer nos photos, visages plus beaux, cadre doré',
      { referenceCount: 2 },
    );
    assert.equal(processed.beautifyStripped, true);
    assert.match(processed.identityHeader, /IDENTITY ANCHOR/);
    assert.match(processed.identityHeader, /completely unchanged/);
    assert.match(processed.referenceRoles, /Image 1/);
    assert.match(processed.referenceRoles, /Image 2/);
    assert.match(processed.imageBrief, /English scene/);
    assert.match(processed.englishSceneBrief, /Compose|Clone|Design|Create/i);
    assert.doesNotMatch(processed.decorBrief, /visages plus beaux/i);
  });

  it('n’ajoute pas de verrou facial sans photo de référence', () => {
    const processed = processUserPromptForHonestFaces('Gala entreprise bleu nuit', {
      referenceCount: 0,
    });
    assert.equal(processed.identityHeader, '');
    assert.equal(processed.referenceRoles, '');
    assert.match(processed.imageBrief, /Gala entreprise bleu nuit|Compose/i);
    assert.match(processed.englishSceneBrief, /\[Subject\]|\[Style\]|Compose/i);
  });

  it('détecte un changement explicite de tenue', () => {
    const processed = processUserPromptForHonestFaces(
      'Garder nos visages et changer la tenue en pagne wax royal',
      { referenceCount: 1 },
    );
    assert.equal(processed.explicitAppearanceChange, true);
    assert.match(processed.imageBrief, /explicitly asked to change hair or clothing/i);
  });

  it('reformule le brief en scène narrative anglaise (scaffold local)', () => {
    const scaffold = buildEnglishSceneBriefScaffold(
      'Mariage floral or ivoire à Kinshasa, Jean & Amina, 12 octobre 2026',
      { referenceCount: 0 },
    );
    assert.match(scaffold, /Compose/);
    assert.match(scaffold, /\[Subject\]/);
    assert.match(scaffold, /\[Style\]/);
    assert.match(scaffold, /Jean & Amina/);
    assert.match(scaffold, /Kinshasa/);
  });

  it('applique le style dessin animé dans le scaffold', () => {
    const scaffold = buildEnglishSceneBriefScaffold('Mariage coutumier Kongo', {
      referenceCount: 0,
      artStyleLine: '2D animated-feature look, clean cel-shading',
    });
    assert.match(scaffold, /2D animated-feature/);
    assert.doesNotMatch(scaffold, /photoreal 35mm/);
  });

  it('applique une reformulation Gemini anglaise sur le brief traité', () => {
    const base = processUserPromptForHonestFaces('Dot Kuba ocre et cuivre', { referenceCount: 0 });
    const next = applyEnglishSceneBrief(
      base,
      'Compose a Kuba Dot invitation. [Subject] Ceremonial stationery. [Action] Presenting warm ochre and copper geometry. [Location/context] Congolese customary celebration. [Composition] Tall 9:16. [Style] Photoreal print.',
    );
    assert.match(next.englishSceneBrief, /Compose a Kuba Dot/);
    assert.equal(next.imageBrief, next.englishSceneBrief);
    assert.match(next.visionBrief, /Compose a Kuba Dot/);
  });

  it('parse le JSON de reformulation Gemini', () => {
    assert.match(
      parseEnglishSceneBriefFromJson({
        englishSceneBrief: '  Compose a gala card. [Subject] Hosts.  ',
      }),
      /Compose a gala card/,
    );
    assert.equal(parseEnglishSceneBriefFromJson(null), '');
  });
});

describe('buildHonestFaceIdentityHeader', () => {
  it('nomme Image 1 pour une seule référence', () => {
    assert.match(buildHonestFaceIdentityHeader(1), /Image 1/);
    assert.equal(buildReferenceRoles(0), '');
  });

  it('génère les rôles spatiaux et character binding pour plusieurs hôtes', () => {
    const roles = buildReferenceRoles(2);
    assert.match(roles, /Image 1 \(left \/ primary position\)/);
    assert.match(roles, /Image 2 \(right \/ secondary position\)/);
    assert.match(roles, /SPATIAL CHARACTER BINDING/);
  });

  it('injecte obligatoirement les directives RAW et contraintes strictes anti-lissage Nano Banana', () => {
    const header = buildHonestFaceIdentityHeader(2);
    assert.match(header, /Style instruction: RAW candid photography/);
    assert.match(header, /natural skin texture, visible pores, skin blemishes/);
    assert.match(header, /CRITICAL CONSTRAINT: Do NOT apply any beauty filters/);
    assert.match(header, /do NOT smooth skin, do NOT create perfect symmetry, do NOT use airbrushing/);
  });
});

describe('optimizeReferenceImageUrl', () => {
  it('injecte la transformation adaptative Cloudinary pour WebP/JPEG et redimensionnement', () => {
    const raw = 'https://res.cloudinary.com/eventmaster/image/upload/v12345/couple.jpg';
    const optimized = optimizeReferenceImageUrl(raw);
    assert.equal(
      optimized,
      'https://res.cloudinary.com/eventmaster/image/upload/f_auto,q_auto:good,w_1536,c_limit/v12345/couple.jpg',
    );
  });

  it('ne ré-injecte pas de transformation si elle est déjà présente', () => {
    const already = 'https://res.cloudinary.com/eventmaster/image/upload/f_auto,q_auto:good,w_1536,c_limit/v12345/couple.jpg';
    assert.equal(optimizeReferenceImageUrl(already), already);
  });

  it('laisse intactes les URL non-Cloudinary', () => {
    const external = 'https://example.com/photos/couple.jpg';
    assert.equal(optimizeReferenceImageUrl(external), external);
  });
});

describe('Nano Banana RAW Directives & Fidelity', () => {
  it('définit fidèlement les directives de style, lumière et contraintes critiques', () => {
    assert.equal(
      NANO_BANANA_STYLE_INSTRUCTION,
      'Style instruction: RAW candid photography, unedited, natural skin texture, visible pores, skin blemishes, slight facial asymmetry, harsh flash photography, 8k UHD, dslr, film grain.',
    );
    assert.equal(
      NANO_BANANA_CRITICAL_CONSTRAINT,
      'CRITICAL CONSTRAINT: Do NOT apply any beauty filters, do NOT smooth skin, do NOT create perfect symmetry, do NOT use airbrushing. The faces MUST retain the exact natural, unedited texture of the reference images.',
    );
    assert.match(NANO_BANANA_LIGHT_RIG_COHERENCE, /LIGHT RIG COHERENCE/);
    assert.match(NANO_BANANA_OPTICAL_BOKEH, /OPTICAL DEPTH OF FIELD/);

    const directives = buildNanoBananaRawDirectives(true);
    assert.match(directives, /CRITICAL CONSTRAINT/);
    assert.match(directives, /RAW candid photography/);
    assert.match(directives, /LIGHT RIG COHERENCE/);
    assert.match(directives, /OPTICAL DEPTH OF FIELD/);
  });

  it('inclut les directives RAW et de lumière dans imageBrief lors de la présence de visages', () => {
    const processed = processUserPromptForHonestFaces('Mariage prestige Kinshasa', { referenceCount: 1 });
    assert.match(processed.imageBrief, /RAW candid photography/);
    assert.match(processed.imageBrief, /CRITICAL CONSTRAINT/);
    assert.match(processed.imageBrief, /LIGHT RIG COHERENCE/);
    assert.match(processed.imageBrief, /OPTICAL DEPTH OF FIELD/);
  });

  it('n’injecte pas les directives de visage si aucune photo de référence n’est fournie', () => {
    const processed = processUserPromptForHonestFaces('Mariage décoratif sans photo', { referenceCount: 0 });
    assert.doesNotMatch(processed.imageBrief, /RAW candid photography/);
    assert.doesNotMatch(processed.imageBrief, /LIGHT RIG COHERENCE/);
    assert.equal(processed.identityHeader, '');
  });
});

describe('Nano Banana Robustesse & Safety Filter Fallback', () => {
  it('détecte correctement les rejets de filtre de sécurité dans les chaînes et erreurs', () => {
    assert.equal(isSafetyFilterTriggered('Safety filter blocked the image generation'), true);
    assert.equal(isSafetyFilterTriggered(new Error('Candidate was blocked due to SAFETY policy')), true);
    assert.equal(isSafetyFilterTriggered('Internal server error 500'), false);
  });

  it('détecte les rejets de sécurité dans les payloads JSON de Gemini', () => {
    const blockedPrompt = {
      promptFeedback: {
        blockReason: 'SAFETY',
      },
    };
    assert.equal(isSafetyFilterTriggered(null, blockedPrompt), true);

    const blockedCandidate = {
      candidates: [
        {
          finishReason: 'SAFETY',
        },
      ],
    };
    assert.equal(isSafetyFilterTriggered(null, blockedCandidate), true);

    const normalPayload = {
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ inlineData: { data: 'b64' } }] },
        },
      ],
    };
    assert.equal(isSafetyFilterTriggered(null, normalPayload), false);

    // Payload réel de Gemini contenant les métadonnées standards de safetyRatings à probabilité NEGLIGIBLE
    const normalPayloadWithRatings = {
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ inlineData: { data: 'iVBORw0KGgoAAAANSUhEUgAASPII_spii_filter_content' } }] },
          safetyRatings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
            { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
          ],
        },
      ],
    };
    assert.equal(isSafetyFilterTriggered(null, normalPayloadWithRatings), false);

    // Interactions API avec étape d'image générée
    const interactionsSuccessPayload = {
      status: 'completed',
      steps: [
        { type: 'thought' },
        {
          type: 'model_output',
          content: [{ type: 'image', data: '4jyQX2PrkIvuDyjzyMjkhZPvJK77zPKpGPxds9iBsPIIKy4orLgme/spii' }],
        },
      ],
    };
    assert.equal(isSafetyFilterTriggered(null, interactionsSuccessPayload), false);

    // Interactions API bloquée
    const interactionsBlockedPayload = {
      status: 'blocked',
      steps: [{ type: 'error', error: { message: 'Image content was blocked by policy' } }],
    };
    assert.equal(isSafetyFilterTriggered(null, interactionsBlockedPayload), true);
  });

  it('génère un prompt de repli thématique sans aucun humain', () => {
    const originalPrompt = [
      '=== 1. IDENTITY ANCHOR ===',
      'Use the attached reference photo.',
      'Style instruction: RAW candid photography, unedited, natural skin texture, visible pores, skin blemishes, slight facial asymmetry, harsh flash photography, 8k UHD, dslr, film grain.',
      'CRITICAL CONSTRAINT: Do NOT apply any beauty filters, do NOT smooth skin, do NOT create perfect symmetry, do NOT use airbrushing. The faces MUST retain the exact natural, unedited texture of the reference images.',
      'Soirée de gala royale, drapés de soie pourpre et chandeliers de cristal à Lubumbashi.',
    ].join('\n');

    const fallbackPrompt = buildGenericThematicBackgroundPrompt(originalPrompt, {
      embedText: false,
      artStyle: 'classique',
    });

    assert.match(fallbackPrompt, /vertical 9:16 luxury invitation/i);
    assert.match(fallbackPrompt, /ABSOLUTELY NO human beings/i);
    assert.match(fallbackPrompt, /STRICT CONSTRAINT: Pure festive décor/i);
    assert.match(fallbackPrompt, /CLEAN ARTWORK MANDATE/);
    assert.match(fallbackPrompt, /drapés de soie pourpre/);
    assert.doesNotMatch(fallbackPrompt, /IDENTITY ANCHOR/);
    assert.doesNotMatch(fallbackPrompt, /visible pores/);
    assert.doesNotMatch(fallbackPrompt, /Do NOT apply any beauty filters/);
  });

  it('génère un prompt de variante A/B préservant l’identité avec une alternative de composition', () => {
    const original = 'Soirée de fiançailles or et vert émeraude au bord du fleuve Congo.';
    const variant = buildVariantImagePrompt(original);

    assert.match(variant, /Soirée de fiançailles or et vert émeraude/);
    assert.match(variant, /ALTERNATIVE COMPOSITION VARIANT \(A\/B VARIATION 2\)/);
    assert.match(variant, /subtle variation in framing/i);
    assert.match(variant, /vertical 9:16/i);
  });
});



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
  applyEnglishSceneBrief,
  buildEnglishSceneBriefScaffold,
  buildHonestFaceIdentityHeader,
  buildReferenceRoles,
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
});

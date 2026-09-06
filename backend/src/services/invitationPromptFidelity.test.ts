import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatContextForVision,
  formatContextForImage,
  hasUsableComposeContext,
  isPersistedUserId,
  type InvitationComposeContext,
} from './invitationComposeContextUtils.ts';
import {
  buildHonestFaceIdentityHeader,
  buildReferenceRoles,
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
  it('injecte organisateur, événements et briefs sans demander un visage', () => {
    const block = formatContextForVision(sampleContext());
    assert.match(block, /Marie Kabila/);
    assert.match(block, /Salle Royale/);
    assert.match(block, /Mariage Jean & Amina/);
    assert.match(block, /Mariage floral or ivoire/);
    assert.match(block, /N’invente aucun visage/);
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

describe('formatContextForImage', () => {
  it('expose le contexte en anglais pour le modèle image', () => {
    const block = formatContextForImage(sampleContext());
    assert.match(block, /Marie Kabila/);
    assert.match(block, /wedding/);
    assert.match(block, /NEVER invent a face/);
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
    assert.match(processed.imageBrief, /décor \/ card/);
    assert.doesNotMatch(processed.decorBrief, /visages plus beaux/i);
  });

  it('n’ajoute pas de verrou facial sans photo de référence', () => {
    const processed = processUserPromptForHonestFaces('Gala entreprise bleu nuit', {
      referenceCount: 0,
    });
    assert.equal(processed.identityHeader, '');
    assert.equal(processed.referenceRoles, '');
    assert.equal(processed.imageBrief, 'Gala entreprise bleu nuit');
  });

  it('détecte un changement explicite de tenue', () => {
    const processed = processUserPromptForHonestFaces(
      'Garder nos visages et changer la tenue en pagne wax royal',
      { referenceCount: 1 },
    );
    assert.equal(processed.explicitAppearanceChange, true);
    assert.match(processed.imageBrief, /explicitly asked to change hair or clothing/i);
  });
});

describe('buildHonestFaceIdentityHeader', () => {
  it('nomme Image 1 pour une seule référence', () => {
    assert.match(buildHonestFaceIdentityHeader(1), /Image 1/);
    assert.equal(buildReferenceRoles(0), '');
  });
});

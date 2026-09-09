import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatPhoneE164 } from '../utils/phone.ts';
import { extractGuestPhone } from '../utils/guestIdentity.ts';

describe('formatPhoneE164', () => {
  it('garde un numéro déjà en E.164 valide', () => {
    assert.equal(formatPhoneE164('+243817125577'), '+243817125577');
    assert.equal(formatPhoneE164('+33612345678'), '+33612345678');
  });

  it('nettoie les espaces, tirets et parenthèses', () => {
    assert.equal(formatPhoneE164('+243 (81) 712-55 77'), '+243817125577');
    assert.equal(formatPhoneE164('+33 6 12 34 56 78'), '+33612345678');
  });

  it('convertit un numéro local RDC commençant par 0 en indicatif +243', () => {
    assert.equal(formatPhoneE164('0817125577'), '+243817125577');
    assert.equal(formatPhoneE164('0991234567'), '+243991234567');
  });

  it('gère les numéros internationaux préfixés par 00', () => {
    assert.equal(formatPhoneE164('00243817125577'), '+243817125577');
    assert.equal(formatPhoneE164('0033612345678'), '+33612345678');
  });

  it('gère un numéro RDC à 9 chiffres sans préfixe 0 ni +243', () => {
    assert.equal(formatPhoneE164('817125577'), '+243817125577');
    assert.equal(formatPhoneE164('998123456'), '+243998123456');
  });

  it('gère un numéro commençant directement par 243', () => {
    assert.equal(formatPhoneE164('243817125577'), '+243817125577');
  });
});

describe('extractGuestPhone', () => {
  it('extrait le numéro depuis guest.phone en priorité', () => {
    const guest = { phone: '+243817125577', email: 'test@example.com' };
    assert.equal(extractGuestPhone(guest), '+243817125577');
  });

  it('associe phoneCountryCode si phone ne contient pas le +', () => {
    const guest = { phone: '817125577', phoneCountryCode: '+243', email: 'test@example.com' };
    assert.equal(extractGuestPhone(guest), '+243817125577');
  });

  it('retombe sur guest.preferences.phone si guest.phone est absent', () => {
    const guest = {
      phone: null,
      email: 'test@example.com',
      preferences: { phone: '+243817125577' },
    };
    assert.equal(extractGuestPhone(guest), '+243817125577');
  });

  it('retombe sur email s’il s’agit d’un numéro de téléphone', () => {
    const guest = {
      phone: null,
      email: '+243817125577',
    };
    assert.equal(extractGuestPhone(guest), '+243817125577');
  });

  it('renvoie null si aucun numéro valide n’est présent', () => {
    const guest = {
      phone: null,
      email: 'contact@example.com',
      preferences: {},
    };
    assert.equal(extractGuestPhone(guest), null);
  });
});

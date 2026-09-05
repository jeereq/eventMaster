import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePendingSignupPlan } from '../config/plansConfig.ts';
import {
  resolveWelcomeOffer,
  welcomeTokenValueFc,
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
  WELCOME_TOKEN_VALUE_ENTERPRISE_FC,
  WELCOME_TOKENS_CATALOG_FAMILY,
  WELCOME_TOKENS_PROTOCOL,
} from './welcomeAiTokensPolicy.ts';

describe('welcomeAiTokens', () => {
  it('offre 10 000 FC aux organisateurs particuliers', () => {
    assert.equal(resolveWelcomeOffer({ accountKind: 'ORGANIZER', intent: 'personal' }).key, 'b2c');
    assert.equal(resolveWelcomeOffer({ planKey: 'PERSONAL_100' }).valueFc, WELCOME_TOKEN_VALUE_B2C_FC);
    assert.equal(welcomeTokenValueFc('B2C'), WELCOME_TOKEN_VALUE_B2C_FC);
  });

  it('offre 20 000 FC aux organisations B2B hors entreprise', () => {
    assert.equal(resolveWelcomeOffer({ accountKind: 'ORGANIZER', intent: 'pro' }).key, 'b2b');
    assert.equal(resolveWelcomeOffer({ planKey: 'STANDARD' }).valueFc, WELCOME_TOKEN_VALUE_B2B_FC);
    assert.equal(welcomeTokenValueFc('B2B'), WELCOME_TOKEN_VALUE_B2B_FC);
  });

  it('offre 50 000 FC aux forfaits entreprise', () => {
    assert.equal(resolveWelcomeOffer({ planKey: 'ENTERPRISE_1' }).key, 'enterprise');
    assert.equal(resolveWelcomeOffer({ planKey: 'ENTERPRISE_2' }).valueFc, WELCOME_TOKEN_VALUE_ENTERPRISE_FC);
    assert.equal(resolveWelcomeOffer({ planKey: 'ENTERPRISE_3' }).valueFc, WELCOME_TOKEN_VALUE_ENTERPRISE_FC);
    assert.equal(welcomeTokenValueFc('ENTERPRISE'), WELCOME_TOKEN_VALUE_ENTERPRISE_FC);
  });

  it('offre 10 jetons aux comptes venue, catalog, service et client', () => {
    assert.deepEqual(resolveWelcomeOffer({ accountKind: 'CLIENT' }), {
      key: 'catalog',
      tokens: WELCOME_TOKENS_CATALOG_FAMILY,
      valueFc: 0,
      shareWithOrg: true,
      fixedTokens: true,
    });
    assert.equal(resolveWelcomeOffer({ accountKind: 'VENDOR' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ planKey: 'VENUE' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ planKey: 'SERVICE' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ planKey: 'CATALOG' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ accountKind: 'BOTH' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ accountKind: 'BOTH', planKey: 'CATALOG' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
  });

  it('mémorise le forfait seulement s’il correspond au type de compte', () => {
    assert.equal(resolvePendingSignupPlan('ENTERPRISE_1', 'ORGANIZER'), 'ENTERPRISE_1');
    assert.equal(resolvePendingSignupPlan('ENTERPRISE_1', 'CLIENT'), null);
    assert.equal(resolvePendingSignupPlan('CATALOG', 'BOTH'), 'CATALOG');
    assert.equal(resolvePendingSignupPlan('FREE', 'ORGANIZER'), null);
  });

  it('ignore un forfait entreprise incompatible avec un compte client', () => {
    assert.equal(
      resolveWelcomeOffer({ accountKind: 'CLIENT', planKey: 'ENTERPRISE_1' }).tokens,
      WELCOME_TOKENS_CATALOG_FAMILY,
    );
  });

  it('n’offre rien au manager (inclus dans le pot de l’organisation)', () => {
    assert.equal(resolveWelcomeOffer({ orgRole: 'MANAGER', intent: 'pro' }).key, 'none');
    assert.equal(resolveWelcomeOffer({ orgRole: 'MANAGER', accountKind: 'VENDOR' }).tokens, 0);
  });

  it('offre 4 jetons au protocole à la création du compte', () => {
    const offer = resolveWelcomeOffer({ orgRole: 'PROTOCOL', accountKind: 'ORGANIZER' });
    assert.equal(offer.key, 'protocol');
    assert.equal(offer.tokens, WELCOME_TOKENS_PROTOCOL);
    assert.equal(offer.shareWithOrg, false);
  });
});

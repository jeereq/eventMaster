import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolvePendingSignupPlan } from '../config/plansConfig.ts';
import {
  DEFAULT_WELCOME_GRANT_RULES,
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

  it('classe le forfait entreprise et le crédite à l’activation, pas à l’inscription', () => {
    assert.equal(resolveWelcomeOffer({ planKey: 'ENTERPRISE_1' }).key, 'enterprise');
    assert.equal(resolveWelcomeOffer({ planKey: 'ENTERPRISE_1' }).moment, 'plan_activation');
    assert.equal(
      resolveWelcomeOffer({ planKey: 'ENTERPRISE_1', accountKind: 'ORGANIZER' }, { moment: 'signup' }).key,
      'b2b',
    );
    assert.equal(
      resolveWelcomeOffer({ planKey: 'ENTERPRISE_1' }, { moment: 'plan_activation' }).key,
      'enterprise',
    );
    assert.equal(welcomeTokenValueFc('ENTERPRISE'), WELCOME_TOKEN_VALUE_ENTERPRISE_FC);
  });

  it('offre 10 jetons aux comptes venue, catalog, service et client', () => {
    const client = resolveWelcomeOffer({ accountKind: 'CLIENT' });
    assert.equal(client.key, 'catalog');
    assert.equal(client.tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(client.moment, 'signup');
    assert.equal(resolveWelcomeOffer({ accountKind: 'VENDOR' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ planKey: 'VENUE' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
    assert.equal(resolveWelcomeOffer({ accountKind: 'BOTH' }).tokens, WELCOME_TOKENS_CATALOG_FAMILY);
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

  it('n’offre rien au manager par défaut', () => {
    assert.equal(resolveWelcomeOffer({ orgRole: 'MANAGER', intent: 'pro' }).key, 'none');
    assert.equal(
      resolveWelcomeOffer({ orgRole: 'MANAGER' }, { moment: 'team_create' }).key,
      'none',
    );
  });

  it('offre 4 jetons au protocole à la création d’équipe', () => {
    const offer = resolveWelcomeOffer({ orgRole: 'PROTOCOL' }, { moment: 'team_create' });
    assert.equal(offer.key, 'protocol');
    assert.equal(offer.tokens, WELCOME_TOKENS_PROTOCOL);
    assert.equal(offer.moment, 'team_create');
  });

  it('respecte un montant et un moment configurés', () => {
    const rules = {
      ...DEFAULT_WELCOME_GRANT_RULES,
      catalog: { enabled: true, amount: 25, unit: 'tokens' as const, moment: 'signup' as const },
    };
    assert.equal(resolveWelcomeOffer({ accountKind: 'VENDOR' }, { rules }).tokens, 25);
  });
});

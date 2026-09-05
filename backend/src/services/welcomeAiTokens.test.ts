import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveWelcomeAudience,
  welcomeTokenValueFc,
  WELCOME_TOKEN_VALUE_B2B_FC,
  WELCOME_TOKEN_VALUE_B2C_FC,
} from './welcomeAiTokensPolicy.ts';

describe('welcomeAiTokens', () => {
  it('classe CLIENT et intent personnel en B2C', () => {
    assert.equal(resolveWelcomeAudience({ accountKind: 'CLIENT' }), 'B2C');
    assert.equal(resolveWelcomeAudience({ accountKind: 'ORGANIZER', intent: 'personal' }), 'B2C');
    assert.equal(resolveWelcomeAudience({ planKey: 'PERSONAL_100' }), 'B2C');
  });

  it('classe prestataire, BOTH et intent pro en B2B', () => {
    assert.equal(resolveWelcomeAudience({ accountKind: 'VENDOR' }), 'B2B');
    assert.equal(resolveWelcomeAudience({ accountKind: 'BOTH' }), 'B2B');
    assert.equal(resolveWelcomeAudience({ accountKind: 'ORGANIZER', intent: 'pro' }), 'B2B');
    assert.equal(resolveWelcomeAudience({ planKey: 'STANDARD' }), 'B2B');
  });

  it('offre 10 000 FC en B2C et 20 000 FC en B2B', () => {
    assert.equal(welcomeTokenValueFc('B2C'), WELCOME_TOKEN_VALUE_B2C_FC);
    assert.equal(welcomeTokenValueFc('B2B'), WELCOME_TOKEN_VALUE_B2B_FC);
  });
});

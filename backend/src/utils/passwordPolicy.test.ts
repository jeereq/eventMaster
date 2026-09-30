import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { passwordPolicyError } from './passwordPolicy.ts';

describe('politique de mot de passe', () => {
  it('exige au moins 8 caractères', () => {
    assert.match(passwordPolicyError('1234567') ?? '', /au moins 8/);
    assert.equal(passwordPolicyError('12345678'), null);
  });

  it('refuse une valeur qui n’est pas une chaîne ou trop longue', () => {
    assert.ok(passwordPolicyError(undefined));
    assert.ok(passwordPolicyError({ $ne: '' }));
    assert.match(passwordPolicyError('x'.repeat(129)) ?? '', /dépasser/);
  });
});

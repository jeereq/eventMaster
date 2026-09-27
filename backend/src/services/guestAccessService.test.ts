import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import {
  buildGuestRsvpUrl,
  signGuestAccessToken,
  verifyGuestAccessToken,
} from './guestAccessService.ts';

const previousSecret = process.env.JWT_SECRET;

describe('guest access tokens', () => {
  before(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('lie cryptographiquement le jeton à un invité', () => {
    const token = signGuestAccessToken('guest-a');
    assert.equal(verifyGuestAccessToken(token).guestId, 'guest-a');
    assert.throws(() => verifyGuestAccessToken(`${token}x`));
  });

  it('ajoute le jeton aux nouveaux liens RSVP', () => {
    const url = new URL(buildGuestRsvpUrl('https://events.example', 'guest-a'));
    assert.equal(url.pathname, '/rsvp/guest-a');
    assert.equal(verifyGuestAccessToken(url.searchParams.get('access') || '').guestId, 'guest-a');
  });
});

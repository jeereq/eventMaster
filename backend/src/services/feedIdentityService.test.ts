import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { signGuestAccessToken } from './guestAccessService.ts';
import { resolveFeedActor, type FeedIdentityDependencies } from './feedIdentityService.ts';

const previousSecret = process.env.JWT_SECRET;

const dependencies: FeedIdentityDependencies = {
  async findUser(id) {
    return id === 'user-a' ? { id, name: 'Alice', email: 'alice@example.com' } : null;
  },
  async findGuestInEvent(id, eventId) {
    return id === 'guest-a' && eventId === 'event-a'
      ? { id, firstName: 'Grace', lastName: 'A' }
      : null;
  },
  async canManageEvent(userId, tenantId, eventId) {
    return userId === 'user-a' && tenantId === 'tenant-a' && eventId === 'event-a';
  },
};

describe('feed identity isolation', () => {
  before(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('refuse un utilisateur authentifié provenant d’un autre tenant', async () => {
    const actor = await resolveFeedActor(
      { eventId: 'event-a', user: { id: 'user-a', tenantId: 'tenant-b' } },
      dependencies,
    );
    assert.equal(actor, null);
  });

  it('refuse un jeton invité valide pour un autre événement', async () => {
    const actor = await resolveFeedActor(
      { eventId: 'event-b', guestToken: signGuestAccessToken('guest-a') },
      dependencies,
    );
    assert.equal(actor, null);
  });

  it('dérive l’identité du jeton plutôt que du corps client', async () => {
    const actor = await resolveFeedActor(
      { eventId: 'event-a', guestToken: signGuestAccessToken('guest-a') },
      dependencies,
    );
    assert.deepEqual(actor, {
      kind: 'guest',
      id: 'guest-a',
      authorName: 'Grace A',
      likerId: 'guest_guest-a',
    });
  });
});

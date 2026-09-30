import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { signGuestAccessToken } from './guestAccessService.ts';
import { decideFeedReadAccess, type FeedReadDependencies } from './feedReadPolicy.ts';

const previousSecret = process.env.JWT_SECRET;

const events: Record<string, { isPublic: boolean }> = {
  'event-public': { isPublic: true },
  'event-private': { isPublic: false },
};

const dependencies: FeedReadDependencies = {
  async findEvent(eventId) {
    return events[eventId] ?? null;
  },
  async canAccessEvent(userId, tenantId, eventId) {
    return userId === 'user-a' && tenantId === 'tenant-a' && eventId === 'event-private';
  },
  async guestBelongsToEvent(guestId, eventId) {
    return guestId === 'guest-a' && eventId === 'event-private';
  },
};

describe('feed read access', () => {
  before(() => {
    process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
  });

  after(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('keeps public events readable by anyone', async () => {
    assert.equal(await decideFeedReadAccess({ eventId: 'event-public' }, dependencies), 'allowed');
  });

  it('refuses anonymous readers on a private event', async () => {
    assert.equal(await decideFeedReadAccess({ eventId: 'event-private' }, dependencies), 'denied');
  });

  it('allows a guest of the private event with their access token', async () => {
    const guestToken = signGuestAccessToken('guest-a');
    assert.equal(await decideFeedReadAccess({ eventId: 'event-private', guestToken }, dependencies), 'allowed');
  });

  it('refuses a guest token issued for another event', async () => {
    const guestToken = signGuestAccessToken('guest-b');
    assert.equal(await decideFeedReadAccess({ eventId: 'event-private', guestToken }, dependencies), 'denied');
  });

  it('refuses a forged or invalid token', async () => {
    assert.equal(
      await decideFeedReadAccess({ eventId: 'event-private', guestToken: 'not-a-token' }, dependencies),
      'denied',
    );
  });

  it('allows an organizer with access to the event', async () => {
    const decision = await decideFeedReadAccess(
      { eventId: 'event-private', user: { id: 'user-a', tenantId: 'tenant-a' } },
      dependencies,
    );
    assert.equal(decision, 'allowed');
  });

  it('refuses a logged-in user from another organization', async () => {
    const decision = await decideFeedReadAccess(
      { eventId: 'event-private', user: { id: 'user-b', tenantId: 'tenant-b' } },
      dependencies,
    );
    assert.equal(decision, 'denied');
  });

  it('reports unknown events as not found', async () => {
    assert.equal(await decideFeedReadAccess({ eventId: 'missing' }, dependencies), 'not_found');
  });
});

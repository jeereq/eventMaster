import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS,
  resolveSubscriptionDiscountAccess,
  sanitizeSubscriptionDiscountAccess,
} from './subscriptionDiscountAccess.ts';

const ORG = 'tenant-a';
const OTHER = 'tenant-b';

describe('subscriptionDiscountAccess', () => {
  it('autorise tout le monde quand activé sans période ni liste', () => {
    const access = sanitizeSubscriptionDiscountAccess({ enabled: true });
    assert.equal(resolveSubscriptionDiscountAccess(ORG, access).allowed, true);
  });

  it('refuse tout le monde quand désactivé', () => {
    const access = sanitizeSubscriptionDiscountAccess({ enabled: false, tenantIds: [ORG] });
    assert.equal(resolveSubscriptionDiscountAccess(ORG, access).allowed, false);
  });

  it('autorise une organisation listée hors période', () => {
    const access = sanitizeSubscriptionDiscountAccess({
      enabled: true,
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      tenantIds: [ORG],
    });
    const now = new Date(Date.UTC(2026, 5, 1));
    assert.equal(resolveSubscriptionDiscountAccess(ORG, access, now).allowed, true);
    assert.equal(resolveSubscriptionDiscountAccess(OTHER, access, now).allowed, false);
  });

  it('autorise tout le monde pendant la période', () => {
    const access = sanitizeSubscriptionDiscountAccess({
      enabled: true,
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
      tenantIds: [],
    });
    const inside = new Date(Date.UTC(2026, 8, 7));
    const outside = new Date(Date.UTC(2026, 10, 1));
    assert.equal(resolveSubscriptionDiscountAccess(OTHER, access, inside).allowed, true);
    assert.equal(resolveSubscriptionDiscountAccess(OTHER, access, outside).allowed, false);
  });

  it('corrige une période inversée', () => {
    const access = sanitizeSubscriptionDiscountAccess({
      enabled: true,
      periodStart: '2026-09-30',
      periodEnd: '2026-09-01',
    });
    assert.equal(access.periodEnd, '2026-09-30');
  });

  it('garde les défauts sûrs', () => {
    assert.equal(DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS.enabled, true);
    assert.deepEqual(DEFAULT_SUBSCRIPTION_DISCOUNT_ACCESS.tenantIds, []);
  });
});

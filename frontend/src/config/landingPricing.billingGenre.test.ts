import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  billingPlanIdsForContext,
  paidPlanIdsForBillingContext,
} from './landingPricing.ts';

describe('billingPlanIdsForContext', () => {
  it('sur FREE organisateur, propose Particulier et B2B', () => {
    const ids = billingPlanIdsForContext({
      accountKind: 'ORGANIZER',
      currentPlan: 'FREE',
    });
    assert.ok(ids.includes('FREE'));
    assert.ok(ids.includes('PERSONAL_50'));
    assert.ok(ids.includes('STANDARD'));
    assert.equal(ids.includes('VENUE'), false);
  });

  it('sur Business, ne propose que le genre B2B', () => {
    const ids = paidPlanIdsForBillingContext({
      accountKind: 'ORGANIZER',
      currentPlan: 'STANDARD',
    });
    assert.deepEqual(
      ids.filter((id) => id.startsWith('PERSONAL')),
      [],
    );
    assert.ok(ids.includes('STANDARD'));
    assert.ok(ids.includes('PREMIUM_1'));
    assert.ok(ids.includes('ENTERPRISE_1'));
    assert.equal(ids.includes('VENUE'), false);
    assert.equal(ids.includes('SERVICE'), false);
  });

  it('sur Particulier, ne propose que le genre B2C', () => {
    const ids = paidPlanIdsForBillingContext({
      accountKind: 'ORGANIZER',
      currentPlan: 'PERSONAL_100',
    });
    assert.ok(ids.every((id) => id.startsWith('PERSONAL')));
    assert.equal(ids.includes('STANDARD'), false);
  });

  it('sur Salle, ne propose que VENUE', () => {
    const ids = paidPlanIdsForBillingContext({
      accountKind: 'VENDOR',
      currentPlan: 'VENUE',
    });
    assert.deepEqual(ids, ['VENUE']);
  });

  it('sur FREE avec pending Particulier, verrouille le genre B2C', () => {
    const ids = paidPlanIdsForBillingContext({
      accountKind: 'ORGANIZER',
      currentPlan: 'FREE',
      pendingPlan: 'PERSONAL_50',
    });
    assert.ok(ids.every((id) => id.startsWith('PERSONAL')));
  });
});

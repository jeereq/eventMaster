import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isB2cTenant, tenantCanPublishEvents } from './plansConfig.ts';

describe('public events by organization type', () => {
  it('forbids public events on Particulier plans', () => {
    for (const plan of ['PERSONAL_50', 'PERSONAL_100', 'PERSONAL_200', 'PERSONAL_PLUS', 'PERSONAL']) {
      assert.equal(tenantCanPublishEvents(plan), false, plan);
    }
  });

  it('forbids public events during a trial opened for a Particulier plan', () => {
    assert.equal(isB2cTenant('FREE', 'PERSONAL_100'), true);
    assert.equal(tenantCanPublishEvents('FREE', 'PERSONAL_100'), false);
  });

  it('keeps public events for B2B plans and B2B trials', () => {
    for (const plan of ['FREE', 'STANDARD', 'PREMIUM_1', 'PREMIUM_2', 'ENTERPRISE_1', 'ENTERPRISE_3']) {
      assert.equal(tenantCanPublishEvents(plan), true, plan);
    }
    assert.equal(tenantCanPublishEvents('FREE', 'STANDARD'), true);
    assert.equal(tenantCanPublishEvents(null, null), true);
  });

  it('follows the active paid plan over an older pending choice', () => {
    assert.equal(tenantCanPublishEvents('STANDARD', 'PERSONAL_50'), true);
  });
});

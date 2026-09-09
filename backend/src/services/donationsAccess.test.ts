import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_DONATIONS_ACCESS,
  resolveDonationsAccess,
  sanitizeDonationsAccess,
} from './donationsAccess.ts';

const ORG_A = 'tenant-prestige';
const ORG_B = 'tenant-other';

describe('donationsAccess policy', () => {
  it('autorise tout le monde sans restrictions en mode "all"', () => {
    const access = sanitizeDonationsAccess({
      enabled: true,
      mode: 'all',
      tenantIds: [],
    });
    assert.equal(resolveDonationsAccess(ORG_A, access).allowed, true);
    assert.equal(resolveDonationsAccess(ORG_B, access).allowed, true);
    assert.equal(resolveDonationsAccess(null, access).allowed, true);
  });

  it('refuse tout le monde quand désactivé', () => {
    const access = sanitizeDonationsAccess({
      enabled: false,
      mode: 'all',
      tenantIds: [ORG_A],
    });
    assert.equal(resolveDonationsAccess(ORG_A, access).allowed, false);
    assert.equal(resolveDonationsAccess(ORG_B, access).allowed, false);
  });

  it('autorise uniquement les organisations spécifiées en mode "restricted"', () => {
    const access = sanitizeDonationsAccess({
      enabled: true,
      mode: 'restricted',
      tenantIds: [ORG_A],
    });
    assert.equal(resolveDonationsAccess(ORG_A, access).allowed, true);
    assert.equal(resolveDonationsAccess(ORG_B, access).allowed, false);
    assert.equal(resolveDonationsAccess(null, access).allowed, false);
  });

  it('nettoie et déduplique la liste des organisations et montants', () => {
    const access = sanitizeDonationsAccess({
      enabled: true,
      mode: 'restricted',
      tenantIds: [' tenant-a ', 'tenant-a', 'tenant-b', ''],
      minAmountFc: 2000,
      defaultSuggestedAmountsFc: [50000, 5000, 10000, 1000, 5000],
    });
    assert.deepEqual(access.tenantIds, ['tenant-a', 'tenant-b']);
    assert.equal(access.minAmountFc, 2000);
    // 1000 est en dessous de 2000, donc exclu ; les autres sont triés et dédupliqués
    assert.deepEqual(access.defaultSuggestedAmountsFc, [5000, 10000, 50000]);
  });

  it('conserve les défauts sécurisés', () => {
    assert.equal(DEFAULT_DONATIONS_ACCESS.enabled, true);
    assert.equal(DEFAULT_DONATIONS_ACCESS.mode, 'all');
    assert.deepEqual(DEFAULT_DONATIONS_ACCESS.tenantIds, []);
    assert.equal(DEFAULT_DONATIONS_ACCESS.minAmountFc, 1000);
  });
});

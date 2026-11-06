import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { autoPayoutDecision, localDateLabel, nextLocalMidnight } from './eventAutoPayoutSchedule.ts';

const base = {
  remainingFc: 50000,
  minFc: 1000,
  timing: 'after_event' as const,
  eventEnded: true,
  isBlockedByAdmin: false,
  hasPendingTransfer: false,
  lastTransfer: null,
  payoutPhone: '243812345678',
};

describe('reversement automatique de minuit', () => {
  it('se cale sur 0h00 heure de Kinshasa (UTC+1)', () => {
    // 22h30 UTC = 23h30 à Kinshasa → minuit local = 23h00 UTC
    assert.equal(nextLocalMidnight(new Date('2026-11-06T22:30:00Z'), 60).toISOString(), '2026-11-06T23:00:00.000Z');
    // 23h30 UTC = 0h30 le 7 → prochain minuit = le 7 à 23h00 UTC
    assert.equal(nextLocalMidnight(new Date('2026-11-06T23:30:00Z'), 60).toISOString(), '2026-11-07T23:00:00.000Z');
    assert.equal(localDateLabel(new Date('2026-11-06T23:00:00Z'), 60), '2026-11-07');
  });

  it('verse un événement terminé avec un numéro', () => {
    assert.deepEqual(autoPayoutDecision(base), { send: true });
  });

  it('attend la fin de l’événement en mode « après l’événement »', () => {
    assert.deepEqual(autoPayoutDecision({ ...base, eventEnded: false }), { send: false, reason: 'EVENT_NOT_ENDED' });
    assert.deepEqual(autoPayoutDecision({ ...base, eventEnded: false, timing: 'daily' }), { send: true });
  });

  it('respecte les garde-fous', () => {
    assert.equal((autoPayoutDecision({ ...base, remainingFc: 0 }) as { reason: string }).reason, 'NOTHING_DUE');
    assert.equal((autoPayoutDecision({ ...base, remainingFc: 500 }) as { reason: string }).reason, 'BELOW_MINIMUM');
    assert.equal((autoPayoutDecision({ ...base, isBlockedByAdmin: true }) as { reason: string }).reason, 'BLOCKED');
    assert.equal((autoPayoutDecision({ ...base, hasPendingTransfer: true }) as { reason: string }).reason, 'PENDING');
    assert.equal((autoPayoutDecision({ ...base, payoutPhone: null }) as { reason: string }).reason, 'MISSING_PHONE');
  });

  it('ne réessaie pas un numéro déjà refusé, mais réessaie un nouveau numéro', () => {
    const failed = { status: 'FAILED', phone: '243812345678' };
    assert.equal(
      (autoPayoutDecision({ ...base, lastTransfer: failed }) as { reason: string }).reason,
      'LAST_FAILED_SAME_PHONE',
    );
    assert.deepEqual(autoPayoutDecision({ ...base, lastTransfer: failed, payoutPhone: '243991112222' }), { send: true });
  });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SMS_PER_GUEST, smsResultConsumesCredit } from './guestSmsCapPolicy.ts';

test('plafond de 3 SMS par invité', () => {
  assert.equal(MAX_SMS_PER_GUEST, 3);
});

test('seul un envoi réel réussi consomme un crédit', () => {
  assert.equal(smsResultConsumesCredit({ success: true, simulated: false, provider: 'dream-digital' }), true);
  assert.equal(smsResultConsumesCredit({ success: false, simulated: false, provider: 'dream-digital' }), false);
  assert.equal(smsResultConsumesCredit({ success: true, simulated: true, provider: 'dream-digital' }), false);
  assert.equal(smsResultConsumesCredit({ success: true, simulated: false, provider: 'dedup' }), false);
});

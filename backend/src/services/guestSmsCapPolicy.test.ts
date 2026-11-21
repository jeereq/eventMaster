import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SMS_PER_GUEST, normalizeSmsPhoneKey, planAllowsGuestSms, smsResultConsumesCredit } from './guestSmsCapPolicy.ts';

test('plafond de 3 SMS par invité', () => {
  assert.equal(MAX_SMS_PER_GUEST, 3);
});

test('seul un envoi réel réussi consomme un crédit', () => {
  assert.equal(smsResultConsumesCredit({ success: true, simulated: false, provider: 'dream-digital' }), true);
  assert.equal(smsResultConsumesCredit({ success: false, simulated: false, provider: 'dream-digital' }), false);
  assert.equal(smsResultConsumesCredit({ success: true, simulated: true, provider: 'dream-digital' }), false);
  assert.equal(smsResultConsumesCredit({ success: true, simulated: false, provider: 'dedup' }), false);
});

test("pas de SMS sur l'essai gratuit", () => {
  assert.equal(planAllowsGuestSms('FREE'), false);
  assert.equal(planAllowsGuestSms(null), false);
  assert.equal(planAllowsGuestSms('STANDARD'), true);
  assert.equal(planAllowsGuestSms('PERSONAL_50'), true);
});

test('le compteur suit le numéro, quel que soit son format', () => {
  assert.equal(normalizeSmsPhoneKey('+243 81 234 5678'), '243812345678');
  assert.equal(normalizeSmsPhoneKey('00243812345678'), '243812345678');
});

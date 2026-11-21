import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  guestUpdateChannels,
  isEventAlertEnabledIn,
  mergeEventNotificationSettings,
  mergeGuestNotificationPrefs,
  sanitizeEventNotificationSettings,
  sanitizeGuestNotificationPrefs,
} from './eventNotificationSettings.ts';

test('un événement sans réglage garde toutes ses alertes', () => {
  assert.deepEqual(sanitizeEventNotificationSettings(null), { rsvp: true, tickets: true, donations: true, guestUpdates: true });
  assert.equal(isEventAlertEnabledIn(undefined, 'tickets'), true);
});

test('les réglages par événement ne prennent que des booléens connus', () => {
  const merged = mergeEventNotificationSettings({ rsvp: false }, { tickets: false, donations: 'non', pirate: true });
  assert.deepEqual(merged, { rsvp: false, tickets: false, donations: true, guestUpdates: true });
  assert.equal(isEventAlertEnabledIn(merged, 'rsvp'), false);
});

test('un invité n’est abonné que s’il l’a activé', () => {
  assert.equal(sanitizeGuestNotificationPrefs(null).enabled, false);
  const now = new Date('2026-11-21T17:00:00Z');
  const on = mergeGuestNotificationPrefs(null, { enabled: true }, now);
  assert.deepEqual(on, { enabled: true, email: true, whatsapp: true, updatedAt: '2026-11-21T17:00:00.000Z' });
});

test('activer sans canal garde l’e-mail', () => {
  const prefs = mergeGuestNotificationPrefs(null, { enabled: true, email: false, whatsapp: false });
  assert.equal(prefs.email, true);
  assert.equal(prefs.whatsapp, false);
});

test('canaux d’envoi : abonnement, réglage de l’événement et coordonnées', () => {
  const contact = { email: 'awa@exemple.cd', phone: '+243 81 234 5678' };
  const prefs = { enabled: true, email: true, whatsapp: true };
  assert.deepEqual(guestUpdateChannels(null, prefs, contact), { email: true, whatsapp: true });
  assert.deepEqual(guestUpdateChannels({ guestUpdates: false }, prefs, contact), { email: false, whatsapp: false });
  assert.deepEqual(guestUpdateChannels(null, { enabled: false }, contact), { email: false, whatsapp: false });
  assert.deepEqual(guestUpdateChannels(null, { ...prefs, whatsapp: false }, { email: 'awa@exemple.cd', phone: null }), {
    email: true,
    whatsapp: false,
  });
  assert.deepEqual(guestUpdateChannels(null, prefs, { email: 'pas-un-mail', phone: '12' }), { email: false, whatsapp: false });
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PENDING_TICKET_HOLD_MS, pendingHoldCutoff, ticketQuotaAllows, ticketsRemainingWithHolds } from './ticketQuotaHoldPolicy.ts';

test('les commandes en attente bloquent le quota', () => {
  // 78 invités sur 80 : un premier achat de 2 passe, un second simultané est refusé avant paiement.
  assert.equal(ticketQuotaAllows({ periodGuests: 78, heldByPendingOrders: 0, quantity: 2, maxGuests: 80 }), true);
  assert.equal(ticketQuotaAllows({ periodGuests: 78, heldByPendingOrders: 2, quantity: 2, maxGuests: 80 }), false);
  assert.equal(ticketQuotaAllows({ periodGuests: 78, heldByPendingOrders: 1, quantity: 1, maxGuests: 80 }), true);
});

test('le stock de billets déduit les commandes en attente', () => {
  assert.equal(ticketsRemainingWithHolds({ ticketsTotal: 100, ticketsSold: 95 }, 3), 2);
  assert.equal(ticketsRemainingWithHolds({ ticketsTotal: 100, ticketsSold: 95 }, 10), 0);
  assert.equal(ticketsRemainingWithHolds({ ticketsTotal: null, ticketsSold: 95 }, 10), null);
});

test('le blocage expire après 30 minutes', () => {
  const now = new Date('2026-11-21T16:00:00Z');
  assert.equal(now.getTime() - pendingHoldCutoff(now).getTime(), PENDING_TICKET_HOLD_MS);
  assert.equal(PENDING_TICKET_HOLD_MS, 30 * 60 * 1000);
});

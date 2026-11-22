import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ADMIN_BULK_DELETE_MAX,
  deleteFailureMessage,
  parseBulkDeleteRequest,
  protectedReason,
} from './adminBulkDeletePolicy.ts';

describe('suppression groupée admin', () => {
  it('refuse un type inconnu ou une liste vide', () => {
    assert.equal(parseBulkDeleteRequest({ type: 'invoice', ids: ['a'] }).ok, false);
    assert.equal(parseBulkDeleteRequest({ type: 'event' }).ok, false);
    assert.equal(parseBulkDeleteRequest({ type: 'event', ids: ['', '  ', 3] }).ok, false);
    assert.equal(parseBulkDeleteRequest(null).ok, false);
  });

  it('dédoublonne et nettoie les identifiants', () => {
    assert.deepEqual(parseBulkDeleteRequest({ type: 'guest', ids: [' a ', 'a', 'b'] }), {
      ok: true,
      type: 'guest',
      ids: ['a', 'b'],
    });
  });

  it('plafonne le nombre d’éléments par requête', () => {
    const ids = Array.from({ length: ADMIN_BULK_DELETE_MAX + 1 }, (_, i) => `id-${i}`);
    assert.equal(parseBulkDeleteRequest({ type: 'user', ids }).ok, false);
    assert.equal(parseBulkDeleteRequest({ type: 'user', ids: ids.slice(1) }).ok, true);
  });

  it('protège le compte et l’organisation de l’admin', () => {
    const actor = { id: 'me', tenantId: 'my-org' };
    assert.ok(protectedReason('user', 'me', actor));
    assert.ok(protectedReason('tenant', 'my-org', actor));
    assert.equal(protectedReason('user', 'other', actor), null);
    assert.equal(protectedReason('event', 'me', actor), null);
    assert.equal(protectedReason('tenant', 'x', { id: 'me', tenantId: null }), null);
  });

  it('traduit les refus de la base', () => {
    assert.match(deleteFailureMessage({ code: 'P2003' }), /liées/);
    assert.match(deleteFailureMessage({ code: 'P2025' }), /introuvable/);
    assert.equal(deleteFailureMessage(new Error('x')), 'Suppression impossible.');
  });
});

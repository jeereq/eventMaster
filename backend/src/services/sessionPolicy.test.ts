import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseSessionClaims, resolveSessionUser } from './sessionPolicy.ts';

const state = { role: 'USER' as const, tenantId: 'tenant-a', tokenVersion: 2 };

describe('sessions révocables', () => {
  it('refuse les jetons à usage spécifique signés avec le même secret', () => {
    assert.equal(parseSessionClaims({ userId: 'u1', purpose: 'password-reset', tv: 0 }), null);
    assert.equal(parseSessionClaims({ guestId: 'g1', purpose: 'guest-access' }), null);
    assert.equal(parseSessionClaims({ role: 'SUPER_ADMIN' }), null);
  });

  it('accepte les anciens jetons sans version comme version 0', () => {
    assert.deepEqual(parseSessionClaims({ userId: 'u1', role: 'USER', tenantId: 't' }), {
      userId: 'u1',
      tokenVersion: 0,
      impersonatedBy: undefined,
    });
  });

  it('rejette une session révoquée ou un utilisateur supprimé', () => {
    assert.equal(resolveSessionUser({ userId: 'u1', tokenVersion: 1 }, state), null);
    assert.equal(resolveSessionUser({ userId: 'u1', tokenVersion: 2 }, null), null);
  });

  it('prend le rôle et l’organisation en base, pas dans le jeton', () => {
    const claims = parseSessionClaims({ userId: 'u1', role: 'SUPER_ADMIN', tenantId: null, tv: 2 });
    assert.ok(claims);
    assert.deepEqual(resolveSessionUser(claims, state), {
      id: 'u1',
      tenantId: 'tenant-a',
      role: 'USER',
      impersonatedBy: undefined,
    });
  });
});

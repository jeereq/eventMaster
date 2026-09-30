import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bodyLimitFor, DEFAULT_BODY_LIMIT, LARGE_BODY_LIMIT } from './bodyLimits.ts';

describe('limites de taille des requêtes', () => {
  it('garde 1 Mo sur les routes publiques ordinaires', () => {
    assert.equal(bodyLimitFor('/api/public/contact', false), DEFAULT_BODY_LIMIT);
    assert.equal(bodyLimitFor('/api/auth/login', true), DEFAULT_BODY_LIMIT);
    assert.equal(bodyLimitFor('/api/rsvp/abc', false), DEFAULT_BODY_LIMIT);
  });

  it('autorise 50 Mo pour les images publiques attendues', () => {
    assert.equal(bodyLimitFor('/api/public/templates/ai/compose', false), LARGE_BODY_LIMIT);
    assert.equal(bodyLimitFor('/api/rsvp/abc/share', false), LARGE_BODY_LIMIT);
  });

  it('réserve 50 Mo des espaces connectés aux requêtes avec jeton', () => {
    assert.equal(bodyLimitFor('/api/templates/ai/compose', true), LARGE_BODY_LIMIT);
    assert.equal(bodyLimitFor('/api/templates/ai/compose', false), DEFAULT_BODY_LIMIT);
    assert.equal(bodyLimitFor('/api/eventsx', true), DEFAULT_BODY_LIMIT);
  });
});

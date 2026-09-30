import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  areBillingMocksEnabled,
  createCorsOptions,
  getJwtSecret,
  getPostgresSslConfig,
  getRateLimitConfig,
} from './security.ts';

describe('security configuration', () => {
  it('refuse un secret JWT absent ou trop court', () => {
    assert.throws(() => getJwtSecret({}), /doit être défini/);
    assert.throws(() => getJwtSecret({ JWT_SECRET: 'trop-court' }), /32 caractères/);
  });

  it('désactive toujours les mocks de facturation en production', () => {
    assert.equal(areBillingMocksEnabled({ NODE_ENV: 'production', ENABLE_BILLING_MOCKS: 'true' }), false);
    assert.equal(areBillingMocksEnabled({ NODE_ENV: 'development', ENABLE_BILLING_MOCKS: 'true' }), true);
    assert.equal(areBillingMocksEnabled({ NODE_ENV: 'test' }), false);
  });

  it('exige une liste CORS en production', () => {
    assert.throws(() => createCorsOptions({ NODE_ENV: 'production' }), /CORS_ALLOWED_ORIGINS/);
  });

  it('refuse de désactiver TLS PostgreSQL en production', () => {
    assert.throws(
      () => getPostgresSslConfig({ NODE_ENV: 'production', DATABASE_SSL: 'disable' }),
      /interdit en production/,
    );
    assert.deepEqual(
      getPostgresSslConfig({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://db.example/app' }),
      { rejectUnauthorized: true },
    );
  });

  it('plafonne les générations IA publiques sans compte', () => {
    assert.equal(getRateLimitConfig({}).anonymousAiDailyMax, 20);
    assert.equal(getRateLimitConfig({ ANONYMOUS_AI_DAILY_MAX: '5' }).anonymousAiDailyMax, 5);
    assert.equal(getRateLimitConfig({ ANONYMOUS_AI_DAILY_MAX: '0' }).anonymousAiDailyMax, 20);
  });
});

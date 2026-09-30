import type { CorsOptions } from 'cors';

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_GLOBAL_RATE_LIMIT_MAX = 300;
const DEFAULT_AUTH_RATE_LIMIT_MAX = 20;
/** Générations IA publiques par IP et par 24 h pour les visiteurs sans compte. */
const DEFAULT_ANONYMOUS_AI_DAILY_MAX = 20;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET doit être défini ; aucun secret JWT par défaut n’est autorisé.');
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET doit contenir au moins 32 caractères.');
  }
  return secret;
}

export function areBillingMocksEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV !== 'production' && env.ENABLE_BILLING_MOCKS === 'true';
}

export function getRateLimitConfig(env: NodeJS.ProcessEnv = process.env) {
  return {
    windowMs: positiveInteger(env.RATE_LIMIT_WINDOW_MS, DEFAULT_RATE_LIMIT_WINDOW_MS),
    globalMax: positiveInteger(env.RATE_LIMIT_MAX, DEFAULT_GLOBAL_RATE_LIMIT_MAX),
    authMax: positiveInteger(env.AUTH_RATE_LIMIT_MAX, DEFAULT_AUTH_RATE_LIMIT_MAX),
    anonymousAiDailyMax: positiveInteger(env.ANONYMOUS_AI_DAILY_MAX, DEFAULT_ANONYMOUS_AI_DAILY_MAX),
  };
}

export function getAllowedCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env.CORS_ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured?.length) return configured;
  if (env.NODE_ENV === 'production') {
    throw new Error('CORS_ALLOWED_ORIGINS doit être défini en production.');
  }
  return ['http://localhost:3000'];
}

export function createCorsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allowedOrigins = new Set(getAllowedCorsOrigins(env));
  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origine CORS non autorisée.'));
    },
  };
}

export function getPostgresSslConfig(env: NodeJS.ProcessEnv = process.env): false | {
  rejectUnauthorized: true;
  ca?: string;
} {
  const mode = env.DATABASE_SSL?.trim().toLowerCase();
  const isLocalDatabase = /@(?:localhost|127\.0\.0\.1|\[::1\])(?::|\/)/.test(env.DATABASE_URL || '');

  if (mode === 'disable') {
    if (env.NODE_ENV === 'production') {
      throw new Error('DATABASE_SSL=disable est interdit en production.');
    }
    return false;
  }
  if (!mode && isLocalDatabase && env.NODE_ENV !== 'production') return false;

  const ca = env.PG_SSL_CA?.replace(/\\n/g, '\n').trim();
  return ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: true };
}

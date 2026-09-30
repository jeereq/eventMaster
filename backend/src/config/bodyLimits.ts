/**
 * Taille maximale des corps JSON / formulaires selon la route.
 *
 * Par défaut 1 Mo. Les routes qui reçoivent des images en base64 ou de gros documents (plans,
 * modèles) montent à 50 Mo ; pour les espaces connectés, seulement si un jeton est présent, afin
 * qu'un anonyme ne puisse pas faire analyser 50 Mo avant d'être refusé par `requireAuth`.
 */
export const DEFAULT_BODY_LIMIT = '1mb';
export const LARGE_BODY_LIMIT = '50mb';

/** Espaces connectés pouvant recevoir des images ou de gros documents. */
const AUTHENTICATED_LARGE_PREFIXES = [
  '/api/events',
  '/api/templates',
  '/api/rooms',
  '/api/uploads',
  '/api/admin',
  '/api/marketplace',
  '/api/beverage-brands',
  '/api/billing/branding',
];

/** Routes publiques recevant des images en base64 (générations IA, partages invités). */
const PUBLIC_LARGE_PATTERNS = [
  /^\/api\/public\/templates\/ai\/compose\/?$/,
  /^\/api\/public\/rooms\/ai\/compose\/?$/,
  /^\/api\/public\/event-plan-ai\/?$/,
  /^\/api\/rsvp\/[^/]+\/share\/?$/,
];

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function bodyLimitFor(path: string, hasBearerToken: boolean): string {
  if (PUBLIC_LARGE_PATTERNS.some((pattern) => pattern.test(path))) return LARGE_BODY_LIMIT;
  if (hasBearerToken && AUTHENTICATED_LARGE_PREFIXES.some((prefix) => matchesPrefix(path, prefix))) {
    return LARGE_BODY_LIMIT;
  }
  return DEFAULT_BODY_LIMIT;
}

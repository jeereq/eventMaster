/**
 * Validation d'une session JWT contre l'état courant de l'utilisateur, sans dépendance à Prisma.
 *
 * Le JWT ne sert qu'à identifier l'utilisateur : le rôle et l'organisation viennent toujours de la
 * base, et `tokenVersion` permet de révoquer d'un coup toutes les sessions (reset ou changement de
 * mot de passe, changement de rôle, suppression).
 */

export type SessionRole = 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';

export type SessionUserState = {
  role: SessionRole;
  tenantId: string | null;
  tokenVersion: number;
};

export type SessionClaims = {
  userId: string;
  tokenVersion: number;
  impersonatedBy?: string;
};

/**
 * Lit les champs utiles d'un JWT vérifié. Refuse les jetons à usage spécifique (réinitialisation
 * de mot de passe, accès invité…) signés avec le même secret : ils ne sont pas des sessions.
 */
export function parseSessionClaims(payload: unknown): SessionClaims | null {
  if (!payload || typeof payload !== 'object') return null;
  const raw = payload as Record<string, unknown>;
  if (raw.purpose !== undefined) return null;
  if (typeof raw.userId !== 'string' || !raw.userId) return null;
  const tokenVersion = raw.tv === undefined ? 0 : raw.tv;
  if (typeof tokenVersion !== 'number' || !Number.isInteger(tokenVersion)) return null;
  return {
    userId: raw.userId,
    tokenVersion,
    impersonatedBy: typeof raw.impersonatedBy === 'string' && raw.impersonatedBy ? raw.impersonatedBy : undefined,
  };
}

/** Utilisateur de la requête, ou null si la session est révoquée ou l'utilisateur supprimé. */
export function resolveSessionUser(claims: SessionClaims, state: SessionUserState | null) {
  if (!state) return null;
  if (claims.tokenVersion !== state.tokenVersion) return null;
  return {
    id: claims.userId,
    tenantId: state.tenantId,
    role: state.role,
    impersonatedBy: claims.impersonatedBy,
  };
}

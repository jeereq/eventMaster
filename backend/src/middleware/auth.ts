import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../db';
import { createTtlCache } from '../utils/ttlCache';
import { getJwtSecret } from '../config/security';
import {
  parseSessionClaims,
  resolveSessionUser,
  type SessionUserState,
} from '../services/sessionPolicy';

const LICENSE_CACHE_TTL_MS = 60_000;
const licenseCache = createTtlCache<{
  accountKind: string;
  licenseActive: boolean;
  licenseExpiresAt: Date | null;
}>(LICENSE_CACHE_TTL_MS);

export function invalidateLicenseCache(tenantId: string) {
  licenseCache.delete(tenantId);
}

export interface AuthTokenPayload {
  userId: string;
  tenantId: string | null;
  role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  /** Version des sessions de l'utilisateur au moment de la signature (voir User.tokenVersion). */
  tv: number;
  impersonatedBy?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | null;
    role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
    impersonatedBy?: string;
  };
}

export function signUserToken(payload: AuthTokenPayload, expiresIn: string = '24h') {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as SignOptions['expiresIn'] });
}

const SESSION_STATE_TTL_MS = 30_000;
const sessionStateCache = createTtlCache<SessionUserState | null>(SESSION_STATE_TTL_MS);

/** À appeler après tout changement de rôle, d'organisation ou de tokenVersion d'un utilisateur. */
export function invalidateSessionCache(userId: string) {
  sessionStateCache.delete(userId);
}

async function loadSessionState(userId: string): Promise<SessionUserState | null> {
  const cached = sessionStateCache.get(userId);
  if (cached !== undefined) return cached;
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true, tokenVersion: true },
  });
  const state = row ? { role: row.role, tenantId: row.tenantId, tokenVersion: row.tokenVersion } : null;
  sessionStateCache.set(userId, state);
  return state;
}

/** Utilisateur authentifié par l'en-tête Bearer, ou null (absent, invalide, expiré ou révoqué). */
async function authenticateRequest(req: Request): Promise<AuthenticatedRequest['user'] | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  let payload: unknown;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
  const claims = parseSessionClaims(payload);
  if (!claims) return null;
  return resolveSessionUser(claims, await loadSessionState(claims.userId));
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  try {
    const user = await authenticateRequest(req);
    if (user) req.user = user;
  } catch (error) {
    /* ignore invalid token on public routes */
    console.warn('[Auth Middleware] Session optionnelle ignorée:', error);
  }
  next();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.headers.authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant ou invalide.' });
  }

  let user: AuthenticatedRequest['user'] | null;
  try {
    user = await authenticateRequest(req);
  } catch (error) {
    console.error('[Auth Middleware] Erreur lors de la vérification de la session:', error);
    return res.status(500).json({ error: 'Erreur interne lors de la vérification de la session.' });
  }
  if (!user) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
  req.user = user;
  next();
}

export function requireRole(roles: ('SUPER_ADMIN' | 'COMMERCIAL' | 'USER')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé. Privilèges insuffisants.' });
    }

    next();
  };
}

export async function requireActiveLicense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Non authentifié.' });
  }

  // SUPER_ADMIN, COMMERCIAL (sans organisation) et session support contournent la licence
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'COMMERCIAL' || req.user.impersonatedBy) {
    return next();
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant non identifié. Accès refusé.' });
  }

  try {
    let tenant = licenseCache.get(tenantId);
    if (!tenant) {
      const row = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { accountKind: true, licenseActive: true, licenseExpiresAt: true },
      });
      if (!row) {
        return res.status(404).json({ error: 'Organisation non trouvée.' });
      }
      tenant = row;
      licenseCache.set(tenantId, row);
    }

    if (tenant.accountKind === 'CLIENT') {
      return next();
    }

    if (!tenant.licenseActive) {
      return res.status(403).json({ 
        error: 'Votre licence est inactive. Veuillez contacter l\'administrateur ou régulariser votre abonnement.',
        licenseError: 'INACTIVE'
      });
    }

    if (tenant.licenseExpiresAt && new Date(tenant.licenseExpiresAt) < new Date()) {
      return res.status(403).json({ 
        error: `Votre licence a expiré le ${new Date(tenant.licenseExpiresAt).toLocaleDateString('fr-FR')}. Veuillez renouveler votre abonnement.`,
        licenseError: 'EXPIRED'
      });
    }

    next();
  } catch (error) {
    console.error('[Auth Middleware] Erreur lors de la vérification de la licence:', error);
    return res.status(500).json({ error: 'Erreur interne lors de la vérification de la licence.' });
  }
}

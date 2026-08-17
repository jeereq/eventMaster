import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | null;
    role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string | null;
      role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
    };
    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  } catch {
    /* ignore invalid token on public routes */
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Accès non autorisé. Token manquant ou invalide.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
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

  // SUPER_ADMIN et COMMERCIAL (sans organisation) contournent la vérification de licence
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'COMMERCIAL') {
    return next();
  }

  const tenantId = req.user.tenantId;
  if (!tenantId) {
    return res.status(403).json({ error: 'Tenant non identifié. Accès refusé.' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Organisation non trouvée.' });
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

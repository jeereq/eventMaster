import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string | null;
    role: 'SUPER_ADMIN' | 'COMMERCIAL' | 'USER';
  };
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

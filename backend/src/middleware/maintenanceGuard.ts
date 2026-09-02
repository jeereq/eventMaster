import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadPlatformSettings } from '../services/platformSettingsService';

const JWT_SECRET = process.env.JWT_SECRET || 'eventmaster-secret-key-12345';

const ALLOWED_PREFIXES = [
  '/health',
  '/api/health',
  '/api/public/site',
  '/api/public/plans',
  '/api/public/templates',
  '/api/public/venues',
  '/api/public/services',
  '/api/public/event-plan-ai',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/billing/webhook',
];

function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Bloque l’API en mode maintenance, sauf santé, site public, login Super Admin
 * et routes RSVP (invités).
 */
export function maintenanceGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = loadPlatformSettings();
    if (!settings.maintenanceMode) return next();

    const path = (req.originalUrl || req.url || req.path).split('?')[0];

    if (isAllowedPath(path) || path.startsWith('/api/rsvp') || path.startsWith('/api/admin')) {
      return next();
    }

    // Auth login déjà autorisé ; laisser Super Admin déjà connecté accéder au reste
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role?: string };
        if (payload.role === 'SUPER_ADMIN') return next();
      } catch {
        /* ignore */
      }
    }

    // Inscription / OTP bloqués pendant maintenance
    return res.status(503).json({
      error: 'maintenance',
      message:
        settings.maintenanceMessage ||
        'La plateforme est temporairement en maintenance.',
      maintenanceMode: true,
    });
  } catch {
    return next();
  }
}

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireRole } from './auth';

export function isPlatformStaff(role?: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'COMMERCIAL';
}

export function isSuperAdmin(role?: string): boolean {
  return role === 'SUPER_ADMIN';
}

export function requirePlatformStaff() {
  return requireRole(['SUPER_ADMIN', 'COMMERCIAL']);
}

export function requireSuperAdmin() {
  return requireRole(['SUPER_ADMIN']);
}

export function assertSuperAdmin(req: AuthenticatedRequest, res: Response): boolean {
  if (req.user?.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    return false;
  }
  return true;
}

export function platformStaffOnly(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!isPlatformStaff(req.user?.role)) {
    return res.status(403).json({ error: 'Accès réservé au personnel plateforme.' });
  }
  next();
}

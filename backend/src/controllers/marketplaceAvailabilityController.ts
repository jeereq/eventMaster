import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { resolveOrgAccess } from '../services/permissionsService';
import { parseBlockedDates, sanitizeVendorUnavailableDates } from '../utils/marketplaceDates';

/** Jours d’indisponibilité du prestataire connecté (toutes ses fiches). */
export async function getVendorUnavailableDates(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const [tenant, access] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId }, select: { marketplaceUnavailableDates: true } }),
      req.user?.id ? resolveOrgAccess(req.user.id, tenantId) : Promise.resolve(null),
    ]);
    return res.json({
      dates: parseBlockedDates(tenant?.marketplaceUnavailableDates),
      canEdit: Boolean(access?.canManageRooms),
    });
  } catch (error) {
    console.error('getVendorUnavailableDates:', error);
    return res.status(500).json({ error: 'Impossible de charger vos indisponibilités.' });
  }
}

export async function updateVendorUnavailableDates(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) return res.status(403).json({ error: 'Organisation non identifiée.' });
    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.canManageRooms) {
      return res.status(403).json({ error: 'Seuls le propriétaire et les managers modifient les indisponibilités.' });
    }
    if (!Array.isArray(req.body?.dates)) {
      return res.status(400).json({ error: 'Liste de dates attendue.' });
    }
    const dates = sanitizeVendorUnavailableDates(req.body.dates);
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { marketplaceUnavailableDates: dates },
    });
    return res.json({
      dates,
      canEdit: true,
      message: dates.length
        ? `${dates.length} jour${dates.length > 1 ? 's' : ''} d’indisponibilité enregistré${dates.length > 1 ? 's' : ''}.`
        : 'Aucun jour d’indisponibilité.',
    });
  } catch (error) {
    console.error('updateVendorUnavailableDates:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer vos indisponibilités.' });
  }
}

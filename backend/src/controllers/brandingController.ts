import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { resolveOrgAccess } from '../services/permissionsService';
import { formatTenantResponse } from '../utils/tenantAccess';
import { parseBranding, normalizeBrandHex } from '../utils/brandingUtils';
import { Prisma } from '@prisma/client';

export async function getMyBranding(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ error: 'Organisation introuvable.' });
    }

    return res.json({
      branding: parseBranding(tenant.branding) || { primary: '#4f46e5', accent: '#6366f1' },
      tenant: formatTenantResponse(tenant),
    });
  } catch (error) {
    console.error('getMyBranding:', error);
    return res.status(500).json({ error: 'Impossible de charger le branding.' });
  }
}

export async function updateMyBranding(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Organisation non identifiée.' });
    }

    const access = await resolveOrgAccess(userId, tenantId);
    if (!access.isOwner && access.level !== 'manager') {
      return res.status(403).json({
        error: 'Seuls le propriétaire et les managers peuvent modifier les couleurs.',
      });
    }

    const { primary, accent, sidebar, reset } = req.body || {};

    if (reset === true) {
      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { branding: Prisma.DbNull },
      });
      return res.json({
        message: 'Couleurs EventMaster restaurées.',
        branding: { primary: '#4f46e5', accent: '#6366f1' },
        tenant: formatTenantResponse(tenant),
      });
    }

    const branding = parseBranding({
      primary: normalizeBrandHex(primary),
      accent: normalizeBrandHex(accent),
      sidebar: normalizeBrandHex(sidebar),
    });
    if (!branding?.primary) {
      return res.status(400).json({ error: 'Couleur primary invalide (hex #RGB ou #RRGGBB).' });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { branding },
    });

    return res.json({
      message: 'Couleurs de marque enregistrées.',
      branding,
      tenant: formatTenantResponse(tenant),
    });
  } catch (error) {
    console.error('updateMyBranding:', error);
    return res.status(500).json({ error: "Impossible d'enregistrer le branding." });
  }
}

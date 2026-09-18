import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';

const MAX_DEVICE_ID_LEN = 120;
const MAX_TEMPLATE_ID_LEN = 120;

function parseDeviceId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_DEVICE_ID_LEN) : '';
}

function parseTemplateId(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, MAX_TEMPLATE_ID_LEN) : '';
}

function isUsableDeviceId(deviceId: string): boolean {
  return Boolean(deviceId) && !deviceId.startsWith('server_') && deviceId !== 'fallback_device_local';
}

/** GET /api/public/invitation-favorites?deviceId= */
export async function listPublicInvitationTemplateFavorites(req: Request, res: Response) {
  try {
    const deviceId = parseDeviceId(req.query.deviceId);
    if (!isUsableDeviceId(deviceId)) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { deviceId, userId: null },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true, createdAt: true },
    });
    return res.json({
      templateIds: rows.map((row) => row.templateId),
      items: rows,
    });
  } catch (error) {
    console.error('listPublicInvitationTemplateFavorites:', error);
    return res.status(500).json({ error: 'Impossible de charger les favoris.' });
  }
}

/** POST /api/public/invitation-favorites { deviceId, templateId } */
export async function addPublicInvitationTemplateFavorite(req: Request, res: Response) {
  try {
    const deviceId = parseDeviceId(req.body?.deviceId);
    const templateId = parseTemplateId(req.body?.templateId);
    if (!isUsableDeviceId(deviceId)) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }
    if (!templateId) {
      return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
    }

    const existing = await prisma.invitationTemplateFavorite.findFirst({
      where: { deviceId, userId: null, templateId },
    });
    if (!existing) {
      await prisma.invitationTemplateFavorite.create({
        data: { deviceId, templateId, userId: null },
      });
    }
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { deviceId, userId: null },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true },
    });
    return res.json({ templateIds: rows.map((row) => row.templateId) });
  } catch (error) {
    console.error('addPublicInvitationTemplateFavorite:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter le favori.' });
  }
}

/** DELETE /api/public/invitation-favorites/:templateId?deviceId= */
export async function removePublicInvitationTemplateFavorite(req: Request, res: Response) {
  try {
    const deviceId = parseDeviceId(req.query.deviceId);
    const templateId = parseTemplateId(req.params.templateId);
    if (!isUsableDeviceId(deviceId)) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }
    if (!templateId) {
      return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
    }
    await prisma.invitationTemplateFavorite.deleteMany({
      where: { deviceId, userId: null, templateId },
    });
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { deviceId, userId: null },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true },
    });
    return res.json({ templateIds: rows.map((row) => row.templateId) });
  } catch (error) {
    console.error('removePublicInvitationTemplateFavorite:', error);
    return res.status(500).json({ error: 'Impossible de retirer le favori.' });
  }
}

/** GET /api/public/invitation-favorites/mine (auth) */
export async function listUserInvitationTemplateFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true, createdAt: true },
    });
    return res.json({
      templateIds: rows.map((row) => row.templateId),
      items: rows,
    });
  } catch (error) {
    console.error('listUserInvitationTemplateFavorites:', error);
    return res.status(500).json({ error: 'Impossible de charger les favoris.' });
  }
}

/** POST /api/public/invitation-favorites/mine { templateId } */
export async function addUserInvitationTemplateFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const templateId = parseTemplateId(req.body?.templateId);
    if (!templateId) {
      return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
    }
    const existing = await prisma.invitationTemplateFavorite.findFirst({
      where: { userId: req.user.id, templateId },
    });
    if (!existing) {
      await prisma.invitationTemplateFavorite.create({
        data: { userId: req.user.id, templateId, deviceId: null },
      });
    }
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true },
    });
    return res.json({ templateIds: rows.map((row) => row.templateId) });
  } catch (error) {
    console.error('addUserInvitationTemplateFavorite:', error);
    return res.status(500).json({ error: 'Impossible d’ajouter le favori.' });
  }
}

/** DELETE /api/public/invitation-favorites/mine/:templateId */
export async function removeUserInvitationTemplateFavorite(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const templateId = parseTemplateId(req.params.templateId);
    if (!templateId) {
      return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
    }
    await prisma.invitationTemplateFavorite.deleteMany({
      where: { userId: req.user.id, templateId },
    });
    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true },
    });
    return res.json({ templateIds: rows.map((row) => row.templateId) });
  } catch (error) {
    console.error('removeUserInvitationTemplateFavorite:', error);
    return res.status(500).json({ error: 'Impossible de retirer le favori.' });
  }
}

/**
 * POST /api/public/invitation-favorites/claim { deviceId }
 * Fusionne les favoris appareil → compte connecté.
 */
export async function claimInvitationTemplateFavorites(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const deviceId = parseDeviceId(req.body?.deviceId);
    if (!isUsableDeviceId(deviceId)) {
      return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
    }

    const deviceRows = await prisma.invitationTemplateFavorite.findMany({
      where: { deviceId, userId: null },
      select: { id: true, templateId: true },
    });

    if (deviceRows.length) {
      const existingUser = await prisma.invitationTemplateFavorite.findMany({
        where: { userId: req.user.id },
        select: { templateId: true },
      });
      const existingIds = new Set(existingUser.map((row) => row.templateId));
      const toCreate = deviceRows.filter((row) => !existingIds.has(row.templateId));

      if (toCreate.length) {
        await prisma.invitationTemplateFavorite.createMany({
          data: toCreate.map((row) => ({
            userId: req.user!.id,
            templateId: row.templateId,
            deviceId: null,
          })),
        });
      }

      await prisma.invitationTemplateFavorite.deleteMany({
        where: { id: { in: deviceRows.map((row) => row.id) } },
      });
    }

    const rows = await prisma.invitationTemplateFavorite.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: { templateId: true },
    });
    return res.json({
      claimed: deviceRows.length,
      templateIds: rows.map((row) => row.templateId),
    });
  } catch (error) {
    console.error('claimInvitationTemplateFavorites:', error);
    return res.status(500).json({ error: 'Impossible de synchroniser les favoris.' });
  }
}

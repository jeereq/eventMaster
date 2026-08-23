import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { resolveOrgAccess } from '../services/permissionsService';

const MAX_USER_AMBIENCES = 24;
const MAX_ORG_AMBIENCES = 48;

function sanitizePreset(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const preset = raw as Record<string, unknown>;
  if (typeof preset.wallTexture !== 'string') return null;
  if (typeof preset.floorType !== 'string') return null;
  if (typeof preset.chairType !== 'string') return null;
  const id = typeof preset.id === 'string' && preset.id.trim() ? preset.id.trim() : `amb-${Date.now().toString(36)}`;
  const label = typeof preset.label === 'string' && preset.label.trim() ? preset.label.trim() : 'Ambiance';
  const description = typeof preset.description === 'string' ? preset.description : label;
  return { ...preset, id, label, description };
}

function serializeAmbience(
  row: {
    id: string;
    name: string;
    preset: unknown;
    createdAt: Date;
    updatedAt: Date;
    description?: string | null;
    createdBy?: { name: string | null; email: string } | null;
  },
  scope: 'user' | 'org' = 'user',
) {
  const preset = (row.preset && typeof row.preset === 'object' && !Array.isArray(row.preset))
    ? row.preset as Record<string, unknown>
    : {};
  const authorName = row.createdBy?.name?.trim()
    || row.createdBy?.email?.split('@')[0]
    || undefined;
  return {
    id: row.id,
    name: row.name,
    preset: { ...preset, id: row.id, label: row.name, description: row.description ?? preset.description ?? row.name },
    scope,
    authorName,
    description: row.description ?? undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listSavedAmbiences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.savedRoomAmbience.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: MAX_USER_AMBIENCES,
    });
    return res.json({ ambiences: rows.map((row) => serializeAmbience(row)) });
  } catch (error) {
    console.error('listSavedAmbiences:', error);
    return res.status(500).json({ error: 'Impossible de charger les ambiances.' });
  }
}

export async function createSavedAmbience(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 48) : '';
    const preset = sanitizePreset(req.body?.preset);
    if (!name) return res.status(400).json({ error: 'Donnez un nom à l’ambiance.' });
    if (!preset) return res.status(400).json({ error: 'Ambiance invalide.' });

    const count = await prisma.savedRoomAmbience.count({ where: { userId: req.user.id } });
    if (count >= MAX_USER_AMBIENCES) {
      return res.status(400).json({ error: `Maximum ${MAX_USER_AMBIENCES} ambiances cloud.` });
    }

    const row = await prisma.savedRoomAmbience.create({
      data: {
        userId: req.user.id,
        name,
        preset: preset as Prisma.InputJsonValue,
      },
    });
    return res.status(201).json({ ambience: serializeAmbience(row) });
  } catch (error) {
    console.error('createSavedAmbience:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer l’ambiance.' });
  }
}

export async function syncSavedAmbiences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const incoming = Array.isArray(req.body?.ambiences) ? req.body.ambiences : [];
    const existing = await prisma.savedRoomAmbience.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });
    const existingIds = new Set(existing.map((row: { id: string }) => row.id));

    for (const raw of incoming.slice(0, MAX_USER_AMBIENCES)) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as { id?: string; name?: string; preset?: unknown };
      const name = typeof item.name === 'string' ? item.name.trim().slice(0, 48) : '';
      const preset = sanitizePreset(item.preset);
      if (!name || !preset) continue;

      const id = typeof item.id === 'string' && existingIds.has(item.id) ? item.id : null;
      if (id) {
        await prisma.savedRoomAmbience.update({
          where: { id },
          data: { name, preset: preset as Prisma.InputJsonValue },
        });
      } else if (existing.length < MAX_USER_AMBIENCES) {
        const created = await prisma.savedRoomAmbience.create({
          data: { userId: req.user!.id, name, preset: preset as Prisma.InputJsonValue },
        });
        existingIds.add(created.id);
      }
    }

    const rows = await prisma.savedRoomAmbience.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: MAX_USER_AMBIENCES,
    });
    return res.json({ ambiences: rows.map((row) => serializeAmbience(row)) });
  } catch (error) {
    console.error('syncSavedAmbiences:', error);
    return res.status(500).json({ error: 'Synchronisation impossible.' });
  }
}

export async function deleteSavedAmbience(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const id = typeof req.params.ambienceId === 'string' ? req.params.ambienceId : '';
    if (!id) return res.status(400).json({ error: 'Ambiance introuvable.' });
    const result = await prisma.savedRoomAmbience.deleteMany({
      where: { id, userId: req.user.id },
    });
    if (!result.count) return res.status(404).json({ error: 'Ambiance introuvable.' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteSavedAmbience:', error);
    return res.status(500).json({ error: 'Impossible de supprimer l’ambiance.' });
  }
}

export async function listOrgAmbiences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.tenantId) return res.status(403).json({ error: 'Organisation requise.' });
    const rows = await prisma.orgRoomAmbience.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: MAX_ORG_AMBIENCES,
      include: { createdBy: { select: { name: true, email: true } } },
    });
    return res.json({ ambiences: rows.map((row) => serializeAmbience(row, 'org')) });
  } catch (error) {
    console.error('listOrgAmbiences:', error);
    return res.status(500).json({ error: 'Impossible de charger les ambiances organisation.' });
  }
}

export async function createOrgAmbience(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id || !req.user.tenantId) return res.status(403).json({ error: 'Organisation requise.' });
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 48) : '';
    const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 160) : null;
    const preset = sanitizePreset(req.body?.preset);
    if (!name) return res.status(400).json({ error: 'Donnez un nom à l’ambiance.' });
    if (!preset) return res.status(400).json({ error: 'Ambiance invalide.' });

    const count = await prisma.orgRoomAmbience.count({ where: { tenantId: req.user.tenantId } });
    if (count >= MAX_ORG_AMBIENCES) {
      return res.status(400).json({ error: `Maximum ${MAX_ORG_AMBIENCES} ambiances organisation.` });
    }

    const row = await prisma.orgRoomAmbience.create({
      data: {
        tenantId: req.user.tenantId,
        createdById: req.user.id,
        name,
        description,
        preset: preset as Prisma.InputJsonValue,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    });
    return res.status(201).json({ ambience: serializeAmbience(row, 'org') });
  } catch (error) {
    console.error('createOrgAmbience:', error);
    return res.status(500).json({ error: 'Impossible de publier l’ambiance.' });
  }
}

export async function deleteOrgAmbience(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id || !req.user.tenantId) return res.status(403).json({ error: 'Organisation requise.' });
    const id = typeof req.params.ambienceId === 'string' ? req.params.ambienceId : '';
    if (!id) return res.status(400).json({ error: 'Ambiance introuvable.' });

    const row = await prisma.orgRoomAmbience.findFirst({
      where: { id, tenantId: req.user.tenantId },
      select: { id: true, createdById: true },
    });
    if (!row) return res.status(404).json({ error: 'Ambiance introuvable.' });

    const access = await resolveOrgAccess(req.user.id, req.user.tenantId);
    const isOwner = row.createdById === req.user.id;
    if (!isOwner && !access.canManageRooms) {
      return res.status(403).json({ error: 'Suppression non autorisée.' });
    }

    await prisma.orgRoomAmbience.delete({ where: { id: row.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteOrgAmbience:', error);
    return res.status(500).json({ error: 'Impossible de supprimer l’ambiance organisation.' });
  }
}

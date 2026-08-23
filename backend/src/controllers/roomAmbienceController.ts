import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';

const MAX_AMBIENCES = 24;

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

function serializeAmbience(row: {
  id: string;
  name: string;
  preset: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  const preset = (row.preset && typeof row.preset === 'object' && !Array.isArray(row.preset))
    ? row.preset as Record<string, unknown>
    : {};
  return {
    id: row.id,
    name: row.name,
    preset: { ...preset, id: row.id, label: row.name },
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
      take: MAX_AMBIENCES,
    });
    return res.json({ ambiences: rows.map(serializeAmbience) });
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
    if (count >= MAX_AMBIENCES) {
      return res.status(400).json({ error: `Maximum ${MAX_AMBIENCES} ambiances cloud.` });
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

    for (const raw of incoming.slice(0, MAX_AMBIENCES)) {
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
      } else if (existing.length < MAX_AMBIENCES) {
        const created = await prisma.savedRoomAmbience.create({
          data: { userId: req.user!.id, name, preset: preset as Prisma.InputJsonValue },
        });
        existingIds.add(created.id);
      }
    }

    const rows = await prisma.savedRoomAmbience.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: MAX_AMBIENCES,
    });
    return res.json({ ambiences: rows.map(serializeAmbience) });
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

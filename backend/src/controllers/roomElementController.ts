import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sanitizeRoomElementDefinition } from '../services/roomElementDefinition';

const MAX_USER_ELEMENTS = 60;

function serializeElement(row: { id: string; name: string; definition: unknown; createdAt: Date; updatedAt: Date }) {
  const definition = (row.definition && typeof row.definition === 'object' && !Array.isArray(row.definition))
    ? row.definition as Record<string, unknown>
    : {};
  return {
    id: row.id,
    name: row.name,
    definition: { ...definition, id: row.id, name: row.name },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** Bibliothèque « Mes éléments » : éléments de salle créés à partir d’une image ou d’une vidéo. */
export async function listSavedElements(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const rows = await prisma.savedRoomElement.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      take: MAX_USER_ELEMENTS,
    });
    return res.json({ elements: rows.map(serializeElement) });
  } catch (error) {
    console.error('listSavedElements:', error);
    return res.status(500).json({ error: 'Impossible de charger vos éléments.' });
  }
}

export async function createSavedElement(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const definition = sanitizeRoomElementDefinition(req.body?.definition);
    if (!definition) return res.status(400).json({ error: 'Élément invalide.' });

    const count = await prisma.savedRoomElement.count({ where: { userId: req.user.id } });
    if (count >= MAX_USER_ELEMENTS) {
      return res.status(400).json({ error: `Maximum ${MAX_USER_ELEMENTS} éléments enregistrés. Supprimez-en un pour continuer.` });
    }

    const row = await prisma.savedRoomElement.create({
      data: {
        userId: req.user.id,
        name: definition.name,
        definition: definition as Prisma.InputJsonValue,
      },
    });
    return res.status(201).json({ element: serializeElement(row) });
  } catch (error) {
    console.error('createSavedElement:', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer l’élément.' });
  }
}

export async function deleteSavedElement(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'Non authentifié.' });
    const elementId = String(req.params.elementId ?? '');
    const result = await prisma.savedRoomElement.deleteMany({
      where: { id: elementId, userId: req.user.id },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Élément introuvable.' });
    return res.json({ ok: true });
  } catch (error) {
    console.error('deleteSavedElement:', error);
    return res.status(500).json({ error: 'Impossible de supprimer l’élément.' });
  }
}

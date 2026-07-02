import { Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  DEFAULT_GUEST_MESSAGE_TEMPLATES,
  type GuestMessageTemplateType,
} from '../config/defaultGuestMessageTemplates';
import { ensureDefaultGuestMessageTemplates } from '../services/messageTemplateService';

const VALID_TYPES = DEFAULT_GUEST_MESSAGE_TEMPLATES.map((t) => t.type);

export async function getGuestMessageTemplates(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    await ensureDefaultGuestMessageTemplates();

    const templates = await prisma.guestMessageTemplate.findMany({
      orderBy: { name: 'asc' },
    });

    return res.json(templates);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des modèles de messages:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des modèles de messages.' });
  }
}

export async function getGuestMessageTemplateById(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const template = await prisma.guestMessageTemplate.findUnique({ where: { id } });

    if (!template) {
      return res.status(404).json({ error: 'Modèle de message introuvable.' });
    }

    return res.json(template);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du modèle de message:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du modèle de message.' });
  }
}

export async function createGuestMessageTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const { type, name, description, channel, subject, body, isActive } = req.body;

    if (!type || !name || !body) {
      return res.status(400).json({ error: 'Le type, le nom et le corps du message sont requis.' });
    }

    if (!VALID_TYPES.includes(type as GuestMessageTemplateType)) {
      return res.status(400).json({
        error: `Type invalide. Types autorisés : ${VALID_TYPES.join(', ')}`,
      });
    }

    const existing = await prisma.guestMessageTemplate.findUnique({ where: { type } });
    if (existing) {
      return res.status(409).json({ error: 'Un modèle existe déjà pour ce type. Utilisez la modification.' });
    }

    const template = await prisma.guestMessageTemplate.create({
      data: {
        type,
        name,
        description: description || null,
        channel: channel || 'WHATSAPP',
        subject: subject || null,
        body,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return res.status(201).json({ message: 'Modèle de message créé avec succès', template });
  } catch (error: any) {
    console.error('Erreur lors de la création du modèle de message:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du modèle de message.' });
  }
}

export async function updateGuestMessageTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const { name, description, channel, subject, body, isActive } = req.body;

    const existing = await prisma.guestMessageTemplate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Modèle de message introuvable.' });
    }

    const template = await prisma.guestMessageTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(channel !== undefined && { channel }),
        ...(subject !== undefined && { subject }),
        ...(body !== undefined && { body }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return res.json({ message: 'Modèle de message mis à jour avec succès', template });
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du modèle de message:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du modèle de message.' });
  }
}

export async function resetGuestMessageTemplate(req: AuthenticatedRequest, res: Response) {
  try {
    if (req.user?.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
    }

    const id = req.params.id as string;
    const existing = await prisma.guestMessageTemplate.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Modèle de message introuvable.' });
    }

    const fallback = DEFAULT_GUEST_MESSAGE_TEMPLATES.find((t) => t.type === existing.type);
    if (!fallback) {
      return res.status(400).json({ error: 'Aucun modèle par défaut disponible pour ce type.' });
    }

    const template = await prisma.guestMessageTemplate.update({
      where: { id },
      data: {
        name: fallback.name,
        description: fallback.description,
        channel: fallback.channel,
        subject: fallback.subject || null,
        body: fallback.body,
        isActive: true,
      },
    });

    return res.json({ message: 'Modèle réinitialisé aux valeurs par défaut', template });
  } catch (error: any) {
    console.error('Erreur lors de la réinitialisation du modèle de message:', error);
    return res.status(500).json({ error: 'Erreur lors de la réinitialisation du modèle de message.' });
  }
}

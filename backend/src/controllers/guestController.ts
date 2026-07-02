import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';
import { normalizePhone } from '../utils/guestIdentity';
import {
  canManageGuests,
  canProtocolGuests,
  canAccessEvent,
} from '../services/permissionsService';

function resolveGuestPhone(body: any, preferences: any): string | null {
  const rawPhone = body?.phone || preferences?.phone || preferences?.telephone;
  return normalizePhone(typeof rawPhone === 'string' ? rawPhone : null);
}

async function assertGuestListAccess(userId: string, tenantId: string, eventId: string) {
  const canManage = await canManageGuests(userId, tenantId, eventId);
  const canProtocol = await canProtocolGuests(userId, tenantId, eventId);
  return { allowed: canManage || canProtocol, canManage, canProtocol };
}

export async function getGuests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const access = await assertGuestListAccess(userId, tenantId, eventId);
    if (!access.allowed) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const guests = await prisma.guest.findMany({
      where: { eventId },
      orderBy: { lastName: 'asc' },
    });

    return res.json(guests);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des invités:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des invités' });
  }
}

export async function createGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const { firstName, lastName, email, category, rsvp, preferences } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de gérer les invités.' });
    }

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Les champs firstName, lastName et email sont requis' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const guestCount = await prisma.guest.count({ where: { event: { tenantId } } });

    if (tenant) {
      const limits = getPlanLimits(tenant.plan);
      if (guestCount >= limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités atteint pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    const existingGuest = await prisma.guest.findUnique({
      where: { eventId_email: { eventId, email } },
    });
    if (existingGuest) {
      return res.status(400).json({ error: 'Un invité avec cet email existe déjà pour cet événement' });
    }

    const guestPreferences = preferences || {};
    const normalizedPhone = resolveGuestPhone(req.body, guestPreferences);

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName,
        lastName,
        email,
        phone: normalizedPhone,
        category: category || 'Général',
        rsvp: rsvp || 'PENDING',
        preferences: guestPreferences,
      },
    });

    return res.status(201).json(guest);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'invité' });
  }
}

export async function updateGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;
    const { firstName, lastName, email, category, rsvp, preferences } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier les invités.' });
    }

    const existingGuest = await prisma.guest.findFirst({ where: { id, eventId } });
    if (!existingGuest) {
      return res.status(404).json({ error: 'Invité non trouvé dans cet événement' });
    }

    const mergedPreferences =
      preferences !== undefined ? preferences : (existingGuest.preferences as any);
    const normalizedPhone =
      req.body.phone !== undefined || preferences !== undefined
        ? resolveGuestPhone(req.body, mergedPreferences)
        : existingGuest.phone;

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : existingGuest.firstName,
        lastName: lastName !== undefined ? lastName : existingGuest.lastName,
        email: email !== undefined ? email : existingGuest.email,
        phone: normalizedPhone,
        category: category !== undefined ? category : existingGuest.category,
        rsvp: rsvp !== undefined ? rsvp : existingGuest.rsvp,
        preferences: mergedPreferences,
      },
    });

    return res.json(updatedGuest);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'invité' });
  }
}

export async function deleteGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer des invités.' });
    }

    const existingGuest = await prisma.guest.findFirst({ where: { id, eventId } });
    if (!existingGuest) {
      return res.status(404).json({ error: 'Invité non trouvé' });
    }

    await prisma.guest.delete({ where: { id } });
    return res.json({ message: 'Invité supprimé de l\'événement avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invité' });
  }
}

export async function importGuests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const eventId = req.params.eventId as string;
    const { guests } = req.body;

    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    if (!(await canManageGuests(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'importer des invités.' });
    }

    if (!guests || !Array.isArray(guests)) {
      return res.status(400).json({ error: 'Le champ guests doit être un tableau d\'invités' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const guestCount = await prisma.guest.count({ where: { event: { tenantId } } });

    if (tenant) {
      const limits = getPlanLimits(tenant.plan);
      if (guestCount + guests.length > limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités dépassé pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (const g of guests) {
      if (!g.firstName || !g.lastName || !g.email) {
        errors.push(`Champs requis manquants pour l'invité: ${JSON.stringify(g)}`);
        continue;
      }

      const guestPrefs: any = g.preferences || {};
      if (g.phone) guestPrefs.phone = g.phone;
      if (g.notes) guestPrefs.notes = g.notes;
      const normalizedPhone = resolveGuestPhone(g, guestPrefs);

      try {
        await prisma.guest.upsert({
          where: { eventId_email: { eventId, email: g.email } },
          update: {
            firstName: g.firstName,
            lastName: g.lastName,
            category: g.category || 'Général',
            phone: normalizedPhone,
            preferences: guestPrefs,
          },
          create: {
            eventId,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email,
            phone: normalizedPhone,
            category: g.category || 'Général',
            preferences: guestPrefs,
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push(`Erreur pour ${g.email}: ${err.message}`);
      }
    }

    return res.status(200).json({
      message: `${importedCount} invités importés/mis à jour avec succès`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'import des invités:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'import des invités' });
  }
}

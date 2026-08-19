import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimitsForTenant } from '../config/plansConfig';
import {
  canManageGuests,
  canProtocolGuests,
  canAccessEvent,
} from '../services/permissionsService';
import { resolvePhoneFields } from '../utils/phone';
import { resolveGuestContactEmail } from '../utils/guestIdentity';

function resolveGuestPhoneFields(body: any, preferences: any): {
  phone: string | null;
  phoneCountryCode: string | null;
} {
  return resolvePhoneFields({
    phone: body?.phone || preferences?.phone || preferences?.telephone,
    phoneCountryCode: body?.phoneCountryCode,
    nationalNumber: body?.nationalNumber,
  });
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

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Le prénom et le nom sont requis.' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const guestCount = await prisma.guest.count({ where: { event: { tenantId } } });

    if (tenant) {
      const limits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
      if (guestCount >= limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités atteint pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    const guestPreferences = { ...(preferences || {}) };
    const { phone: normalizedPhone, phoneCountryCode } = resolveGuestPhoneFields(
      req.body,
      guestPreferences,
    );
    if (normalizedPhone) {
      guestPreferences.phone = normalizedPhone;
    }

    const contact = resolveGuestContactEmail({ email, phone: normalizedPhone });
    if ('error' in contact) {
      return res.status(400).json({ error: contact.error });
    }

    const existingGuest = await prisma.guest.findUnique({
      where: { eventId_email: { eventId, email: contact.email } },
    });
    if (existingGuest) {
      return res.status(400).json({ error: 'Un invité avec cet e-mail ou ce WhatsApp existe déjà pour cet événement' });
    }

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName,
        lastName,
        email: contact.email,
        phone: normalizedPhone,
        phoneCountryCode,
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
      preferences !== undefined
        ? { ...(preferences as object) }
        : { ...((existingGuest.preferences as object) || {}) };

    let normalizedPhone = existingGuest.phone;
    let phoneCountryCode = existingGuest.phoneCountryCode;
    if (
      req.body.phone !== undefined ||
      req.body.phoneCountryCode !== undefined ||
      req.body.nationalNumber !== undefined ||
      preferences !== undefined
    ) {
      const resolved = resolveGuestPhoneFields(req.body, mergedPreferences);
      normalizedPhone = resolved.phone;
      phoneCountryCode = resolved.phoneCountryCode;
      if (normalizedPhone) {
        (mergedPreferences as Record<string, unknown>).phone = normalizedPhone;
      }
    }

    const nextEmail = email !== undefined
      ? resolveGuestContactEmail({ email, phone: normalizedPhone })
      : { email: existingGuest.email };
    if ('error' in nextEmail) {
      return res.status(400).json({ error: nextEmail.error });
    }

    if (nextEmail.email !== existingGuest.email) {
      const clash = await prisma.guest.findUnique({
        where: { eventId_email: { eventId, email: nextEmail.email } },
      });
      if (clash && clash.id !== id) {
        return res.status(400).json({ error: 'Un invité avec cet e-mail ou ce WhatsApp existe déjà pour cet événement' });
      }
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : existingGuest.firstName,
        lastName: lastName !== undefined ? lastName : existingGuest.lastName,
        email: nextEmail.email,
        phone: normalizedPhone,
        phoneCountryCode,
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
      const limits = getPlanLimitsForTenant(tenant.plan, tenant.accountKind);
      if (guestCount + guests.length > limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités dépassé pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    let importedCount = 0;
    const errors: string[] = [];

    for (const g of guests) {
      if (!g.firstName || !g.lastName) {
        errors.push(`Prénom et nom requis pour l'invité: ${JSON.stringify(g)}`);
        continue;
      }

      const guestPrefs: any = g.preferences || {};
      if (g.notes) guestPrefs.notes = g.notes;
      if (g.allergies) guestPrefs.allergies = g.allergies;
      if (g.specialMeal) guestPrefs.specialMeal = g.specialMeal;
      const { phone: normalizedPhone, phoneCountryCode } = resolveGuestPhoneFields(g, guestPrefs);
      if (normalizedPhone) guestPrefs.phone = normalizedPhone;

      const contact = resolveGuestContactEmail({ email: g.email, phone: normalizedPhone || g.phone });
      if ('error' in contact) {
        errors.push(`${g.firstName || ''} ${g.lastName || ''}: ${contact.error}`);
        continue;
      }

      try {
        await prisma.guest.upsert({
          where: { eventId_email: { eventId, email: contact.email } },
          update: {
            firstName: g.firstName,
            lastName: g.lastName,
            category: g.category || 'Général',
            phone: normalizedPhone,
            phoneCountryCode,
            preferences: guestPrefs,
          },
          create: {
            eventId,
            firstName: g.firstName,
            lastName: g.lastName,
            email: contact.email,
            phone: normalizedPhone,
            phoneCountryCode,
            category: g.category || 'Général',
            preferences: guestPrefs,
          },
        });
        importedCount++;
      } catch (err: any) {
        errors.push(`Erreur pour ${g.firstName} ${g.lastName}: ${err.message}`);
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

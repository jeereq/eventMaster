import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../db';
import { getPlanLimits } from '../config/plansConfig';

// Helper function to verify event ownership
async function verifyEventOwner(eventId: string, tenantId: string): Promise<boolean> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
  });
  return !!event;
}

// Get all guests for an event
export async function getGuests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
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

// Create a guest
export async function createGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const { firstName, lastName, email, category, rsvp, preferences } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Les champs firstName, lastName et email sont requis' });
    }

    // Check Plan / Quota before adding guest (will be integrated in Phase 4, but let's add a placeholder or simple check)
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const guestCount = await prisma.guest.count({
      where: { event: { tenantId } },
    });

    if (tenant) {
      const limits = getPlanLimits(tenant.plan);
      if (guestCount >= limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités atteint pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    // Check if guest already exists for this event
    const existingGuest = await prisma.guest.findUnique({
      where: { eventId_email: { eventId, email } },
    });

    if (existingGuest) {
      return res.status(400).json({ error: 'Un invité avec cet email existe déjà pour cet événement' });
    }

    const guest = await prisma.guest.create({
      data: {
        eventId,
        firstName,
        lastName,
        email,
        category: category || 'Général',
        rsvp: rsvp || 'PENDING',
        preferences: preferences || {},
      },
    });

    return res.status(201).json(guest);
  } catch (error: any) {
    console.error('Erreur lors de la création de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la création de l\'invité' });
  }
}

// Update a guest
export async function updateGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;
    const { firstName, lastName, email, category, rsvp, preferences } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const existingGuest = await prisma.guest.findFirst({
      where: { id, eventId },
    });

    if (!existingGuest) {
      return res.status(404).json({ error: 'Invité non trouvé dans cet événement' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id },
      data: {
        firstName: firstName !== undefined ? firstName : existingGuest.firstName,
        lastName: lastName !== undefined ? lastName : existingGuest.lastName,
        email: email !== undefined ? email : existingGuest.email,
        category: category !== undefined ? category : existingGuest.category,
        rsvp: rsvp !== undefined ? rsvp : existingGuest.rsvp,
        preferences: preferences !== undefined ? preferences : (existingGuest.preferences as any),
      },
    });

    return res.json(updatedGuest);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'invité' });
  }
}

// Delete a guest
export async function deleteGuest(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const id = req.params.id as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    const existingGuest = await prisma.guest.findFirst({
      where: { id, eventId },
    });

    if (!existingGuest) {
      return res.status(404).json({ error: 'Invité non trouvé' });
    }

    await prisma.guest.delete({
      where: { id },
    });

    return res.json({ message: 'Invité supprimé de l\'événement avec succès' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invité' });
  }
}

// Import multiple guests
export async function importGuests(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const { guests } = req.body; // Expects array of { firstName, lastName, email, category, preferences }

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié' });
    }

    const isOwner = await verifyEventOwner(eventId, tenantId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
    }

    if (!guests || !Array.isArray(guests)) {
      return res.status(400).json({ error: 'Le champ guests doit être un tableau d\'invités' });
    }

    // Check Plan / Quota
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    const guestCount = await prisma.guest.count({
      where: { event: { tenantId } },
    });

    if (tenant) {
      const limits = getPlanLimits(tenant.plan);
      if (guestCount + guests.length > limits.maxGuests) {
        return res.status(403).json({
          error: `Quota total d'invités dépassé pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
        });
      }
    }

    let importedCount = 0;
    let errors: string[] = [];

    // Use a transaction or sequential inserts to handle duplicate email errors gracefully
    for (const g of guests) {
      if (!g.firstName || !g.lastName || !g.email) {
        errors.push(`Champs requis manquants pour l'invité: ${JSON.stringify(g)}`);
        continue;
      }

      // Construct preferences structure with phone and notes if provided
      const guestPrefs: any = g.preferences || {};
      if (g.phone) {
        guestPrefs.phone = g.phone;
      }
      if (g.notes) {
        guestPrefs.notes = g.notes;
      }

      try {
        await prisma.guest.upsert({
          where: { eventId_email: { eventId, email: g.email } },
          update: {
            firstName: g.firstName,
            lastName: g.lastName,
            category: g.category || 'Général',
            preferences: guestPrefs,
          },
          create: {
            eventId,
            firstName: g.firstName,
            lastName: g.lastName,
            email: g.email,
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

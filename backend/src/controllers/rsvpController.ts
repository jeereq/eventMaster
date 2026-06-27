import { Request, Response } from 'express';
import { prisma } from '../db';

// Public endpoint to get guest and event details
export async function getGuestRsvpDetails(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
      include: {
        event: {
          select: {
            title: true,
            description: true,
            date: true,
            location: true,
            invitations: {
              where: {
                templateId: { not: null }
              },
              select: {
                template: true
              },
              take: 1
            }
          },
        },
      },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    return res.json(guest);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des détails RSVP de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du RSVP' });
  }
}

// Public endpoint to submit RSVP response and preferences
export async function submitRsvp(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { rsvp, preferences } = req.body; // Expects rsvp: 'ACCEPTED' | 'DECLINED' and preferences: object

    if (!rsvp || !['ACCEPTED', 'DECLINED'].includes(rsvp)) {
      return res.status(400).json({ error: 'Le statut RSVP doit être ACCEPTED ou DECLINED.' });
    }

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
    }

    const updatedGuest = await prisma.guest.update({
      where: { id: guestId },
      data: {
        rsvp,
        preferences: preferences || {},
      },
    });

    return res.json({
      message: 'Votre réponse RSVP a été enregistrée avec succès.',
      guest: {
        id: updatedGuest.id,
        firstName: updatedGuest.firstName,
        lastName: updatedGuest.lastName,
        rsvp: updatedGuest.rsvp,
        preferences: updatedGuest.preferences,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la soumission du RSVP:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre réponse RSVP.' });
  }
}

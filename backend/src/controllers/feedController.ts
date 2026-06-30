import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';

// 1. Submit Guest Share (Public - Guest RSVP page)
export async function submitGuestShare(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { message, photo } = req.body;

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé.' });
    }

    const share = await prisma.guestShare.create({
      data: {
        eventId: guest.eventId,
        guestId: guest.id,
        message: message || null,
        photo: photo || null,
      },
    });

    return res.status(201).json({
      message: 'Votre partage a été envoyé avec succès aux organisateurs !',
      share,
    });
  } catch (error: any) {
    console.error('Erreur lors du partage de l\'invité:', error);
    return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre partage.' });
  }
}

// 2. Get Event Shares (Protected - Organizer Dashboard)
export async function getEventShares(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    // Verify event belongs to tenant
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    const shares = await prisma.guestShare.findMany({
      where: { eventId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(shares);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des partages:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération des partages.' });
  }
}

// 3. Get Event Feed (Public - Guest RSVP page and Dashboard)
export async function getEventFeed(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId as string;

    const posts = await prisma.eventPost.findMany({
      where: { eventId },
      include: {
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(posts);
  } catch (error: any) {
    console.error('Erreur lors de la récupération du feed:', error);
    return res.status(500).json({ error: 'Erreur lors de la récupération du feed.' });
  }
}

// 4. Create Event Post (Protected - Organizer Dashboard)
export async function createEventPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const { content, mediaUrl, mediaType } = req.body;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    // Verify event belongs to tenant
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    const post = await prisma.eventPost.create({
      data: {
        eventId,
        content: content || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || 'TEXT',
      },
    });

    return res.status(201).json(post);
  } catch (error: any) {
    console.error('Erreur lors de la création du post:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du post.' });
  }
}

// 5. Delete Event Post (Protected - Organizer Dashboard)
export async function deleteEventPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const postId = req.params.postId as string;

    if (!tenantId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    // Verify event and post belong to tenant
    const event = await prisma.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) {
      return res.status(404).json({ error: 'Événement non trouvé.' });
    }

    const post = await prisma.eventPost.findFirst({
      where: { id: postId, eventId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post non trouvé.' });
    }

    await prisma.eventPost.delete({
      where: { id: postId },
    });

    return res.json({ message: 'Post supprimé avec succès.' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du post:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du post.' });
  }
}

// 6. Create Event Comment (Public - Guest RSVP page and Dashboard)
export async function createEventComment(req: Request, res: Response) {
  try {
    const postId = req.params.postId as string;
    const { content, guestId, userId } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Le contenu du commentaire est requis.' });
    }

    const post = await prisma.eventPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    let authorName = 'Anonyme';

    if (userId) {
      // Comment from Organizer
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (user) {
        authorName = (user.name || user.email) + ' (Organisateur)';
      }
    } else if (guestId) {
      // Comment from Guest
      const guest = await prisma.guest.findUnique({
        where: { id: guestId },
      });
      if (guest) {
        authorName = `${guest.firstName} ${guest.lastName}`;
      }
    }

    const comment = await prisma.eventComment.create({
      data: {
        postId,
        authorName,
        guestId: guestId || null,
        userId: userId || null,
        content,
      },
    });

    return res.status(201).json(comment);
  } catch (error: any) {
    console.error('Erreur lors de la création du commentaire:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du commentaire.' });
  }
}

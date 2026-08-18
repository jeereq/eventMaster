import { Request, Response } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth';
import { canManageEvent } from '../services/permissionsService';

// 1. Submit Guest Share (Public - Guest RSVP page)
export async function submitGuestShare(req: Request, res: Response) {
  try {
    const guestId = req.params.guestId as string;
    const { message, photo, photos } = req.body; // photos is an array of Base64 strings

    const guest = await prisma.guest.findUnique({
      where: { id: guestId },
    });

    if (!guest) {
      return res.status(404).json({ error: 'Invité non trouvé.' });
    }

    // Determine photo and photos values
    const finalPhotos = photos && Array.isArray(photos) ? photos : (photo ? [photo] : []);
    const legacyPhoto = finalPhotos.length > 0 ? finalPhotos[0] : null;

    const share = await prisma.guestShare.create({
      data: {
        eventId: guest.eventId,
        guestId: guest.id,
        message: message || null,
        photo: legacyPhoto,
        photos: finalPhotos.length > 0 ? (finalPhotos as any) : undefined,
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

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
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

// 2b. Get Public Event Shares (Public - Guest RSVP page)
export async function getPublicEventShares(req: Request, res: Response) {
  try {
    const eventId = req.params.eventId as string;

    const shares = await prisma.guestShare.findMany({
      where: { eventId },
      include: {
        guest: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(shares);
  } catch (error: any) {
    console.error('Erreur lors de la récupération des partages publics:', error);
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
    const { content, mediaUrl, mediaType, mediaUrls } = req.body; // mediaUrls is [{ url: string, type: 'IMAGE' | 'VIDEO' }]

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    // Determine legacy and rich media values
    let finalMediaUrls = mediaUrls && Array.isArray(mediaUrls) ? mediaUrls : [];
    if (finalMediaUrls.length === 0 && mediaUrl) {
      finalMediaUrls = [{ url: mediaUrl, type: mediaType || 'IMAGE' }];
    }

    const legacyMediaUrl = finalMediaUrls.length > 0 ? finalMediaUrls[0].url : null;
    const legacyMediaType = finalMediaUrls.length > 0 ? finalMediaUrls[0].type : 'TEXT';

    const post = await prisma.eventPost.create({
      data: {
        eventId,
        content: content || null,
        mediaUrl: legacyMediaUrl,
        mediaType: legacyMediaType,
        mediaUrls: finalMediaUrls.length > 0 ? (finalMediaUrls as any) : undefined,
        publishedOnListing: req.body.publishedOnListing === true || req.body.publishedOnListing === 'true',
      },
    });

    return res.status(201).json(post);
  } catch (error: any) {
    console.error('Erreur lors de la création du post:', error);
    return res.status(500).json({ error: 'Erreur lors de la création du post.' });
  }
}

export async function updateEventPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const postId = req.params.postId as string;
    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const existing = await prisma.eventPost.findFirst({
      where: { id: postId, eventId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Publication introuvable.' });
    }

    const post = await prisma.eventPost.update({
      where: { id: postId },
      data: {
        publishedOnListing: req.body.publishedOnListing === true || req.body.publishedOnListing === 'true',
      },
    });

    return res.json(post);
  } catch (error: any) {
    console.error('Erreur lors de la mise à jour du post:', error);
    return res.status(500).json({ error: 'Erreur lors de la mise à jour du post.' });
  }
}

// 5. Delete Event Post (Protected - Organization members)
export async function deleteEventPost(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const postId = req.params.postId as string;

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
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

// 5b. Delete Guest Share (Protected - Organization members)
export async function deleteGuestShare(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const eventId = req.params.eventId as string;
    const shareId = req.params.shareId as string;

    const userId = req.user?.id;
    if (!tenantId || !userId) {
      return res.status(403).json({ error: 'Tenant non identifié.' });
    }

    if (!(await canManageEvent(userId, tenantId, eventId))) {
      return res.status(403).json({ error: 'Accès refusé à cet événement.' });
    }

    const share = await prisma.guestShare.findFirst({
      where: { id: shareId, eventId },
    });

    if (!share) {
      return res.status(404).json({ error: 'Message du livre d\'or introuvable.' });
    }

    await prisma.guestShare.delete({
      where: { id: shareId },
    });

    return res.json({ message: 'Message du livre d\'or supprimé avec succès.' });
  } catch (error: any) {
    console.error('Erreur lors de la suppression du partage:', error);
    return res.status(500).json({ error: 'Erreur lors de la suppression du message.' });
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

// 7. Toggle Like on Event Post (Public - Guest RSVP page and Dashboard)
export async function toggleLikeEventPost(req: Request, res: Response) {
  try {
    const postId = req.params.postId as string;
    const { guestId, userId } = req.body;

    if (!guestId && !userId) {
      return res.status(400).json({ error: 'Identifiant requis (guestId ou userId).' });
    }

    const post = await prisma.eventPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({ error: 'Publication non trouvée.' });
    }

    const likerId = userId ? `user_${userId}` : `guest_${guestId}`;
    let currentLikes: string[] = [];

    if (post.likes && Array.isArray(post.likes)) {
      currentLikes = post.likes as string[];
    }

    const hasLiked = currentLikes.includes(likerId);
    let updatedLikes: string[];

    if (hasLiked) {
      // Unlike
      updatedLikes = currentLikes.filter(id => id !== likerId);
    } else {
      // Like
      updatedLikes = [...currentLikes, likerId];
    }

    const updatedPost = await prisma.eventPost.update({
      where: { id: postId },
      data: {
        likes: updatedLikes as any,
      },
    });

    return res.json({
      liked: !hasLiked,
      likesCount: updatedLikes.length,
      likes: updatedLikes,
    });
  } catch (error: any) {
    console.error('Erreur lors du toggle like:', error);
    return res.status(500).json({ error: 'Erreur lors du traitement du j\'aime.' });
  }
}

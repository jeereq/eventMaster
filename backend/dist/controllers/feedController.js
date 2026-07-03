"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitGuestShare = submitGuestShare;
exports.getEventShares = getEventShares;
exports.getPublicEventShares = getPublicEventShares;
exports.getEventFeed = getEventFeed;
exports.createEventPost = createEventPost;
exports.deleteEventPost = deleteEventPost;
exports.deleteGuestShare = deleteGuestShare;
exports.createEventComment = createEventComment;
exports.toggleLikeEventPost = toggleLikeEventPost;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
// 1. Submit Guest Share (Public - Guest RSVP page)
async function submitGuestShare(req, res) {
    try {
        const guestId = req.params.guestId;
        const { message, photo, photos } = req.body; // photos is an array of Base64 strings
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
        });
        if (!guest) {
            return res.status(404).json({ error: 'Invité non trouvé.' });
        }
        // Determine photo and photos values
        const finalPhotos = photos && Array.isArray(photos) ? photos : (photo ? [photo] : []);
        const legacyPhoto = finalPhotos.length > 0 ? finalPhotos[0] : null;
        const share = await db_1.prisma.guestShare.create({
            data: {
                eventId: guest.eventId,
                guestId: guest.id,
                message: message || null,
                photo: legacyPhoto,
                photos: finalPhotos.length > 0 ? finalPhotos : undefined,
            },
        });
        return res.status(201).json({
            message: 'Votre partage a été envoyé avec succès aux organisateurs !',
            share,
        });
    }
    catch (error) {
        console.error('Erreur lors du partage de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre partage.' });
    }
}
// 2. Get Event Shares (Protected - Organizer Dashboard)
async function getEventShares(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const shares = await db_1.prisma.guestShare.findMany({
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
    }
    catch (error) {
        console.error('Erreur lors de la récupération des partages:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des partages.' });
    }
}
// 2b. Get Public Event Shares (Public - Guest RSVP page)
async function getPublicEventShares(req, res) {
    try {
        const eventId = req.params.eventId;
        const shares = await db_1.prisma.guestShare.findMany({
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
    }
    catch (error) {
        console.error('Erreur lors de la récupération des partages publics:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des partages.' });
    }
}
// 3. Get Event Feed (Public - Guest RSVP page and Dashboard)
async function getEventFeed(req, res) {
    try {
        const eventId = req.params.eventId;
        const posts = await db_1.prisma.eventPost.findMany({
            where: { eventId },
            include: {
                comments: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(posts);
    }
    catch (error) {
        console.error('Erreur lors de la récupération du feed:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du feed.' });
    }
}
// 4. Create Event Post (Protected - Organizer Dashboard)
async function createEventPost(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const { content, mediaUrl, mediaType, mediaUrls } = req.body; // mediaUrls is [{ url: string, type: 'IMAGE' | 'VIDEO' }]
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        // Determine legacy and rich media values
        let finalMediaUrls = mediaUrls && Array.isArray(mediaUrls) ? mediaUrls : [];
        if (finalMediaUrls.length === 0 && mediaUrl) {
            finalMediaUrls = [{ url: mediaUrl, type: mediaType || 'IMAGE' }];
        }
        const legacyMediaUrl = finalMediaUrls.length > 0 ? finalMediaUrls[0].url : null;
        const legacyMediaType = finalMediaUrls.length > 0 ? finalMediaUrls[0].type : 'TEXT';
        const post = await db_1.prisma.eventPost.create({
            data: {
                eventId,
                content: content || null,
                mediaUrl: legacyMediaUrl,
                mediaType: legacyMediaType,
                mediaUrls: finalMediaUrls.length > 0 ? finalMediaUrls : undefined,
            },
        });
        return res.status(201).json(post);
    }
    catch (error) {
        console.error('Erreur lors de la création du post:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du post.' });
    }
}
// 5. Delete Event Post (Protected - Organization members)
async function deleteEventPost(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const postId = req.params.postId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const post = await db_1.prisma.eventPost.findFirst({
            where: { id: postId, eventId },
        });
        if (!post) {
            return res.status(404).json({ error: 'Post non trouvé.' });
        }
        await db_1.prisma.eventPost.delete({
            where: { id: postId },
        });
        return res.json({ message: 'Post supprimé avec succès.' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du post:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du post.' });
    }
}
// 5b. Delete Guest Share (Protected - Organization members)
async function deleteGuestShare(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const shareId = req.params.shareId;
        const userId = req.user?.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié.' });
        }
        if (!(await (0, permissionsService_1.canManageEvent)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const share = await db_1.prisma.guestShare.findFirst({
            where: { id: shareId, eventId },
        });
        if (!share) {
            return res.status(404).json({ error: 'Message du livre d\'or introuvable.' });
        }
        await db_1.prisma.guestShare.delete({
            where: { id: shareId },
        });
        return res.json({ message: 'Message du livre d\'or supprimé avec succès.' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression du partage:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression du message.' });
    }
}
// 6. Create Event Comment (Public - Guest RSVP page and Dashboard)
async function createEventComment(req, res) {
    try {
        const postId = req.params.postId;
        const { content, guestId, userId } = req.body;
        if (!content || content.trim() === '') {
            return res.status(400).json({ error: 'Le contenu du commentaire est requis.' });
        }
        const post = await db_1.prisma.eventPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            return res.status(404).json({ error: 'Publication non trouvée.' });
        }
        let authorName = 'Anonyme';
        if (userId) {
            // Comment from Organizer
            const user = await db_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (user) {
                authorName = (user.name || user.email) + ' (Organisateur)';
            }
        }
        else if (guestId) {
            // Comment from Guest
            const guest = await db_1.prisma.guest.findUnique({
                where: { id: guestId },
            });
            if (guest) {
                authorName = `${guest.firstName} ${guest.lastName}`;
            }
        }
        const comment = await db_1.prisma.eventComment.create({
            data: {
                postId,
                authorName,
                guestId: guestId || null,
                userId: userId || null,
                content,
            },
        });
        return res.status(201).json(comment);
    }
    catch (error) {
        console.error('Erreur lors de la création du commentaire:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du commentaire.' });
    }
}
// 7. Toggle Like on Event Post (Public - Guest RSVP page and Dashboard)
async function toggleLikeEventPost(req, res) {
    try {
        const postId = req.params.postId;
        const { guestId, userId } = req.body;
        if (!guestId && !userId) {
            return res.status(400).json({ error: 'Identifiant requis (guestId ou userId).' });
        }
        const post = await db_1.prisma.eventPost.findUnique({
            where: { id: postId },
        });
        if (!post) {
            return res.status(404).json({ error: 'Publication non trouvée.' });
        }
        const likerId = userId ? `user_${userId}` : `guest_${guestId}`;
        let currentLikes = [];
        if (post.likes && Array.isArray(post.likes)) {
            currentLikes = post.likes;
        }
        const hasLiked = currentLikes.includes(likerId);
        let updatedLikes;
        if (hasLiked) {
            // Unlike
            updatedLikes = currentLikes.filter(id => id !== likerId);
        }
        else {
            // Like
            updatedLikes = [...currentLikes, likerId];
        }
        const updatedPost = await db_1.prisma.eventPost.update({
            where: { id: postId },
            data: {
                likes: updatedLikes,
            },
        });
        return res.json({
            liked: !hasLiked,
            likesCount: updatedLikes.length,
            likes: updatedLikes,
        });
    }
    catch (error) {
        console.error('Erreur lors du toggle like:', error);
        return res.status(500).json({ error: 'Erreur lors du traitement du j\'aime.' });
    }
}

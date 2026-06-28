"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuestRsvpDetails = getGuestRsvpDetails;
exports.submitRsvp = submitRsvp;
const db_1 = require("../db");
// Public endpoint to get guest and event details
async function getGuestRsvpDetails(req, res) {
    try {
        const guestId = req.params.guestId;
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
            include: {
                event: {
                    select: {
                        title: true,
                        description: true,
                        date: true,
                        location: true,
                        latitude: true,
                        longitude: true,
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
    }
    catch (error) {
        console.error('Erreur lors de la récupération des détails RSVP de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du RSVP' });
    }
}
// Public endpoint to submit RSVP response and preferences
async function submitRsvp(req, res) {
    try {
        const guestId = req.params.guestId;
        const { rsvp, preferences } = req.body; // Expects rsvp: 'ACCEPTED' | 'DECLINED' and preferences: object
        if (!rsvp || !['ACCEPTED', 'DECLINED'].includes(rsvp)) {
            return res.status(400).json({ error: 'Le statut RSVP doit être ACCEPTED ou DECLINED.' });
        }
        const guest = await db_1.prisma.guest.findUnique({
            where: { id: guestId },
        });
        if (!guest) {
            return res.status(404).json({ error: 'Invité non trouvé ou lien RSVP invalide.' });
        }
        const updatedGuest = await db_1.prisma.guest.update({
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
    }
    catch (error) {
        console.error('Erreur lors de la soumission du RSVP:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'enregistrement de votre réponse RSVP.' });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvitations = getInvitations;
exports.createInvitation = createInvitation;
exports.sendInvitation = sendInvitation;
const db_1 = require("../db");
// Helper function to verify event ownership
async function verifyEventOwner(eventId, tenantId) {
    const event = await db_1.prisma.event.findFirst({
        where: { id: eventId, tenantId },
    });
    return !!event;
}
// Get all invitations for an event
async function getInvitations(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const isOwner = await verifyEventOwner(eventId, tenantId);
        if (!isOwner) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        const invitations = await db_1.prisma.invitation.findMany({
            where: { eventId },
            include: { template: true },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(invitations);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des invitations:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des invitations' });
    }
}
// Create an invitation
async function createInvitation(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const { templateId, subject, body, channel } = req.body;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const isOwner = await verifyEventOwner(eventId, tenantId);
        if (!isOwner) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        if (!subject || !body || !channel) {
            return res.status(400).json({ error: 'Les champs subject, body et channel sont requis' });
        }
        const invitation = await db_1.prisma.invitation.create({
            data: {
                eventId,
                templateId: templateId || null,
                subject,
                body,
                channel, // EMAIL, LINK, QR
            },
        });
        return res.status(201).json(invitation);
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'invitation:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'invitation' });
    }
}
// Send invitation (simulated sending)
async function sendInvitation(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const eventId = req.params.eventId;
        const id = req.params.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const isOwner = await verifyEventOwner(eventId, tenantId);
        if (!isOwner) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        const invitation = await db_1.prisma.invitation.findFirst({
            where: { id, eventId },
        });
        if (!invitation) {
            return res.status(404).json({ error: 'Invitation non trouvée' });
        }
        // Retrieve all guests for this event
        const guests = await db_1.prisma.guest.findMany({
            where: { eventId },
        });
        if (guests.length === 0) {
            return res.status(400).json({ error: 'Aucun invité trouvé pour cet événement. Veuillez d\'abord ajouter des invités.' });
        }
        // Simulate sending email and generating RSVP links
        const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
        const sentInvitations = guests.map(guest => {
            // Dynamic variables replacement
            let subject = invitation.subject
                .replace('{{firstName}}', guest.firstName)
                .replace('{{lastName}}', guest.lastName);
            let body = invitation.body
                .replace('{{firstName}}', guest.firstName)
                .replace('{{lastName}}', guest.lastName)
                .replace('{{rsvpLink}}', `${FRONTEND_URL}/rsvp/${guest.id}`);
            return {
                guestId: guest.id,
                guestEmail: guest.email,
                subject,
                body,
                rsvpUrl: `${FRONTEND_URL}/rsvp/${guest.id}`,
                status: 'SENT_SIMULATED',
            };
        });
        return res.json({
            message: `Envoi simulé réussi pour ${guests.length} invités.`,
            invitationsSent: sentInvitations,
        });
    }
    catch (error) {
        console.error('Erreur lors de la diffusion de l\'invitation:', error);
        return res.status(500).json({ error: 'Erreur lors de la diffusion de l\'invitation' });
    }
}

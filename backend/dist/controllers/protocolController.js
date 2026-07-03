"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanGuest = scanGuest;
exports.checkInGuest = checkInGuest;
exports.verifyGuestSeat = verifyGuestSeat;
exports.addGuestProtocolNote = addGuestProtocolNote;
exports.getGuestProtocolNotes = getGuestProtocolNotes;
exports.listProtocolGuests = listProtocolGuests;
const db_1 = require("../db");
const permissionsService_1 = require("../services/permissionsService");
const commercialService_1 = require("../services/commercialService");
const guestSeatNotificationService_1 = require("../services/guestSeatNotificationService");
const planFeaturesService_1 = require("../services/planFeaturesService");
async function ensureProtocolPlan(tenantId) {
    await (0, planFeaturesService_1.assertPlanFeature)(tenantId, 'protocolQr');
}
function handlePlanError(res, error) {
    if (error instanceof planFeaturesService_1.PlanFeatureError) {
        return res.status(403).json({ error: error.message });
    }
    return null;
}
async function loadGuestForEvent(eventId, tenantId, guestId) {
    const guest = await db_1.prisma.guest.findFirst({
        where: { id: guestId, eventId, event: { tenantId } },
        include: {
            protocolNotes: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
            },
        },
    });
    return guest;
}
function buildGuestProtocolResponse(guest, tablePlan) {
    const assignedSeat = (0, commercialService_1.findGuestSeatInTablePlan)(tablePlan, guest.id);
    return {
        ...guest,
        assignedSeat,
    };
}
async function scanGuest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const { payload, guestId: rawGuestId } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        try {
            await ensureProtocolPlan(tenantId);
        }
        catch (err) {
            const handled = handlePlanError(res, err);
            if (handled)
                return handled;
            throw err;
        }
        if (!(await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès protocole refusé pour cet événement.' });
        }
        const guestId = rawGuestId || (0, commercialService_1.extractGuestIdFromScanPayload)(payload || '');
        if (!guestId) {
            return res.status(400).json({ error: 'QR code ou identifiant invité invalide.' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { id: eventId, tenantId },
            select: { id: true, title: true, tablePlan: true },
        });
        if (!event) {
            return res.status(404).json({ error: 'Événement introuvable.' });
        }
        const guest = await loadGuestForEvent(eventId, tenantId, guestId);
        if (!guest) {
            return res.status(404).json({ error: 'Invité introuvable pour cet événement.' });
        }
        return res.json({
            event: { id: event.id, title: event.title },
            guest: buildGuestProtocolResponse(guest, event.tablePlan),
        });
    }
    catch (error) {
        console.error('scanGuest:', error);
        return res.status(500).json({ error: 'Erreur lors du scan invité.' });
    }
}
async function checkInGuest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const guestId = req.params.guestId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        try {
            await ensureProtocolPlan(tenantId);
        }
        catch (err) {
            const handled = handlePlanError(res, err);
            if (handled)
                return handled;
            throw err;
        }
        if (!(await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès protocole refusé.' });
        }
        const guest = await loadGuestForEvent(eventId, tenantId, guestId);
        if (!guest) {
            return res.status(404).json({ error: 'Invité introuvable.' });
        }
        if (guest.rsvp !== 'ACCEPTED') {
            return res.status(400).json({
                error: 'Cet invité n\'a pas confirmé sa présence (RSVP non accepté).',
                guest: { id: guest.id, rsvp: guest.rsvp },
            });
        }
        const updated = await db_1.prisma.guest.update({
            where: { id: guestId },
            data: {
                checkedInAt: new Date(),
                checkedInByUserId: userId,
            },
        });
        return res.json({
            message: `${guest.firstName} ${guest.lastName} authentifié avec succès.`,
            guest: updated,
        });
    }
    catch (error) {
        console.error('checkInGuest:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'émargement.' });
    }
}
async function verifyGuestSeat(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const guestId = req.params.guestId;
        const { tableId, seatIndex } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        try {
            await ensureProtocolPlan(tenantId);
        }
        catch (err) {
            const handled = handlePlanError(res, err);
            if (handled)
                return handled;
            throw err;
        }
        if (!(await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès protocole refusé.' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { id: eventId, tenantId },
            select: { title: true, date: true, location: true, tablePlan: true },
        });
        if (!event) {
            return res.status(404).json({ error: 'Événement introuvable.' });
        }
        const guest = await loadGuestForEvent(eventId, tenantId, guestId);
        if (!guest) {
            return res.status(404).json({ error: 'Invité introuvable.' });
        }
        const wasAlreadyVerified = guest.seatVerified;
        const assigned = (0, commercialService_1.findGuestSeatInTablePlan)(event.tablePlan, guestId);
        let seatMatch = true;
        let mismatchReason = null;
        if (!assigned) {
            seatMatch = false;
            mismatchReason = 'Aucun siège assigné à cet invité dans le plan de table.';
        }
        else if (tableId !== undefined && assigned.tableId !== tableId) {
            seatMatch = false;
            mismatchReason = `Siège attendu : ${assigned.tableName}, pas la table scannée.`;
        }
        else if (seatIndex !== undefined && assigned.seatIndex !== Number(seatIndex)) {
            seatMatch = false;
            mismatchReason = `Siège attendu n°${assigned.seatIndex + 1}, pas le n°${Number(seatIndex) + 1}.`;
        }
        const updated = await db_1.prisma.guest.update({
            where: { id: guestId },
            data: {
                seatVerified: seatMatch,
                seatVerifiedAt: new Date(),
                seatVerifiedByUserId: userId,
            },
        });
        let notification = null;
        if (seatMatch && assigned && !wasAlreadyVerified) {
            const snapshot = await (0, planFeaturesService_1.getTenantPlanSnapshot)(tenantId);
            if (snapshot?.features.seatNotifications) {
                notification = await (0, guestSeatNotificationService_1.notifyGuestSeatConfirmed)({
                    guest: {
                        id: guest.id,
                        firstName: guest.firstName,
                        lastName: guest.lastName,
                        email: guest.email,
                        phone: guest.phone,
                        preferences: guest.preferences,
                    },
                    event: {
                        title: event.title,
                        date: event.date,
                        location: event.location,
                    },
                    assignedSeat: assigned,
                });
                if (!notification.sent) {
                    console.warn('[Protocol] Notification placement non envoyée:', notification.errors);
                }
                else {
                    console.log('[Protocol] Notification placement envoyée:', notification.channels.join(', '));
                }
            }
        }
        const baseMessage = seatMatch
            ? 'Siège confirmé : l\'invité est bien à sa place.'
            : mismatchReason || 'Siège non conforme.';
        const notificationHint = seatMatch && notification?.sent
            ? ` Notification envoyée (${notification.channels.join(', ')}).`
            : seatMatch && notification && !notification.sent
                ? ' Notification non envoyée (coordonnées invité manquantes ou erreur d\'envoi).'
                : '';
        return res.json({
            message: baseMessage + notificationHint,
            seatMatch,
            assignedSeat: assigned,
            guest: updated,
            notification: notification
                ? { sent: notification.sent, channels: notification.channels, errors: notification.errors }
                : undefined,
        });
    }
    catch (error) {
        console.error('verifyGuestSeat:', error);
        return res.status(500).json({ error: 'Erreur lors de la vérification du siège.' });
    }
}
async function addGuestProtocolNote(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const guestId = req.params.guestId;
        const { content } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        try {
            await ensureProtocolPlan(tenantId);
        }
        catch (err) {
            const handled = handlePlanError(res, err);
            if (handled)
                return handled;
            throw err;
        }
        if (!(await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès protocole refusé.' });
        }
        if (!content || !String(content).trim()) {
            return res.status(400).json({ error: 'Le commentaire est requis.' });
        }
        const guest = await loadGuestForEvent(eventId, tenantId, guestId);
        if (!guest) {
            return res.status(404).json({ error: 'Invité introuvable.' });
        }
        const note = await db_1.prisma.guestProtocolNote.create({
            data: {
                guestId,
                userId,
                content: String(content).trim(),
            },
            include: { user: { select: { id: true, name: true } } },
        });
        return res.status(201).json({ message: 'Commentaire enregistré.', note });
    }
    catch (error) {
        console.error('addGuestProtocolNote:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }
}
async function getGuestProtocolNotes(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const guestId = req.params.guestId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        const canRead = (await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId)) ||
            (await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId));
        if (!canRead) {
            return res.status(403).json({ error: 'Accès refusé.' });
        }
        const notes = await db_1.prisma.guestProtocolNote.findMany({
            where: { guestId, guest: { eventId, event: { tenantId } } },
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json(notes);
    }
    catch (error) {
        console.error('getGuestProtocolNotes:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des commentaires.' });
    }
}
async function listProtocolGuests(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Organisation non identifiée.' });
        }
        try {
            await ensureProtocolPlan(tenantId);
        }
        catch (err) {
            const handled = handlePlanError(res, err);
            if (handled)
                return handled;
            throw err;
        }
        if (!(await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Accès protocole refusé.' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { id: eventId, tenantId },
            select: { tablePlan: true },
        });
        if (!event) {
            return res.status(404).json({ error: 'Événement introuvable.' });
        }
        const guests = await db_1.prisma.guest.findMany({
            where: { eventId },
            include: {
                protocolNotes: {
                    include: { user: { select: { id: true, name: true } } },
                    orderBy: { createdAt: 'desc' },
                    take: 3,
                },
            },
            orderBy: { lastName: 'asc' },
        });
        return res.json(guests.map((g) => ({
            ...g,
            assignedSeat: (0, commercialService_1.findGuestSeatInTablePlan)(event.tablePlan, g.id),
        })));
    }
    catch (error) {
        console.error('listProtocolGuests:', error);
        return res.status(500).json({ error: 'Erreur lors du chargement des invités.' });
    }
}

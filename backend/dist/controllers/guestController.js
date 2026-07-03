"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuests = getGuests;
exports.createGuest = createGuest;
exports.updateGuest = updateGuest;
exports.deleteGuest = deleteGuest;
exports.importGuests = importGuests;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const guestIdentity_1 = require("../utils/guestIdentity");
const permissionsService_1 = require("../services/permissionsService");
function resolveGuestPhone(body, preferences) {
    const rawPhone = body?.phone || preferences?.phone || preferences?.telephone;
    return (0, guestIdentity_1.normalizePhone)(typeof rawPhone === 'string' ? rawPhone : null);
}
async function assertGuestListAccess(userId, tenantId, eventId) {
    const canManage = await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId);
    const canProtocol = await (0, permissionsService_1.canProtocolGuests)(userId, tenantId, eventId);
    return { allowed: canManage || canProtocol, canManage, canProtocol };
}
async function getGuests(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const access = await assertGuestListAccess(userId, tenantId, eventId);
        if (!access.allowed) {
            return res.status(403).json({ error: 'Accès refusé à cet événement.' });
        }
        const guests = await db_1.prisma.guest.findMany({
            where: { eventId },
            orderBy: { lastName: 'asc' },
        });
        return res.json(guests);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des invités:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des invités' });
    }
}
async function createGuest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const { firstName, lastName, email, category, rsvp, preferences } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de gérer les invités.' });
        }
        if (!firstName || !lastName || !email) {
            return res.status(400).json({ error: 'Les champs firstName, lastName et email sont requis' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        const guestCount = await db_1.prisma.guest.count({ where: { event: { tenantId } } });
        if (tenant) {
            const limits = (0, plansConfig_1.getPlanLimits)(tenant.plan);
            if (guestCount >= limits.maxGuests) {
                return res.status(403).json({
                    error: `Quota total d'invités atteint pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        const existingGuest = await db_1.prisma.guest.findUnique({
            where: { eventId_email: { eventId, email } },
        });
        if (existingGuest) {
            return res.status(400).json({ error: 'Un invité avec cet email existe déjà pour cet événement' });
        }
        const guestPreferences = preferences || {};
        const normalizedPhone = resolveGuestPhone(req.body, guestPreferences);
        const guest = await db_1.prisma.guest.create({
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
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'invité' });
    }
}
async function updateGuest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const id = req.params.id;
        const { firstName, lastName, email, category, rsvp, preferences } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de modifier les invités.' });
        }
        const existingGuest = await db_1.prisma.guest.findFirst({ where: { id, eventId } });
        if (!existingGuest) {
            return res.status(404).json({ error: 'Invité non trouvé dans cet événement' });
        }
        const mergedPreferences = preferences !== undefined ? preferences : existingGuest.preferences;
        const normalizedPhone = req.body.phone !== undefined || preferences !== undefined
            ? resolveGuestPhone(req.body, mergedPreferences)
            : existingGuest.phone;
        const updatedGuest = await db_1.prisma.guest.update({
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
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'invité' });
    }
}
async function deleteGuest(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const id = req.params.id;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission de supprimer des invités.' });
        }
        const existingGuest = await db_1.prisma.guest.findFirst({ where: { id, eventId } });
        if (!existingGuest) {
            return res.status(404).json({ error: 'Invité non trouvé' });
        }
        await db_1.prisma.guest.delete({ where: { id } });
        return res.json({ message: 'Invité supprimé de l\'événement avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'invité:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'invité' });
    }
}
async function importGuests(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const userId = req.user?.id;
        const eventId = req.params.eventId;
        const { guests } = req.body;
        if (!tenantId || !userId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        if (!(await (0, permissionsService_1.canManageGuests)(userId, tenantId, eventId))) {
            return res.status(403).json({ error: 'Vous n\'avez pas la permission d\'importer des invités.' });
        }
        if (!guests || !Array.isArray(guests)) {
            return res.status(400).json({ error: 'Le champ guests doit être un tableau d\'invités' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        const guestCount = await db_1.prisma.guest.count({ where: { event: { tenantId } } });
        if (tenant) {
            const limits = (0, plansConfig_1.getPlanLimits)(tenant.plan);
            if (guestCount + guests.length > limits.maxGuests) {
                return res.status(403).json({
                    error: `Quota total d'invités dépassé pour le plan ${tenant.plan} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        let importedCount = 0;
        const errors = [];
        for (const g of guests) {
            if (!g.firstName || !g.lastName || !g.email) {
                errors.push(`Champs requis manquants pour l'invité: ${JSON.stringify(g)}`);
                continue;
            }
            const guestPrefs = g.preferences || {};
            if (g.phone)
                guestPrefs.phone = g.phone;
            if (g.notes)
                guestPrefs.notes = g.notes;
            const normalizedPhone = resolveGuestPhone(g, guestPrefs);
            try {
                await db_1.prisma.guest.upsert({
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
            }
            catch (err) {
                errors.push(`Erreur pour ${g.email}: ${err.message}`);
            }
        }
        return res.status(200).json({
            message: `${importedCount} invités importés/mis à jour avec succès`,
            errors: errors.length > 0 ? errors : undefined,
        });
    }
    catch (error) {
        console.error('Erreur lors de l\'import des invités:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'import des invités' });
    }
}

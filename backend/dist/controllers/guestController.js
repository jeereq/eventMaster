"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuests = getGuests;
exports.createGuest = createGuest;
exports.updateGuest = updateGuest;
exports.deleteGuest = deleteGuest;
exports.importGuests = importGuests;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
const permissionsService_1 = require("../services/permissionsService");
const phone_1 = require("../utils/phone");
const guestIdentity_1 = require("../utils/guestIdentity");
function resolveGuestPhoneFields(body, preferences) {
    return (0, phone_1.resolvePhoneFields)({
        phone: body?.phone || preferences?.phone || preferences?.telephone,
        phoneCountryCode: body?.phoneCountryCode,
        nationalNumber: body?.nationalNumber,
    });
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
        if (!firstName || !lastName) {
            return res.status(400).json({ error: 'Le prénom et le nom sont requis.' });
        }
        const tenant = await db_1.prisma.tenant.findUnique({ where: { id: tenantId } });
        const guestCount = await db_1.prisma.guest.count({ where: { event: { tenantId } } });
        if (tenant) {
            const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
            if (limits.maxGuests <= 0 || guestCount >= limits.maxGuests) {
                return res.status(403).json({
                    error: limits.maxGuests <= 0
                        ? `La gestion des invités n’est pas incluse dans votre forfait ${limits.name}. Choisissez un forfait organisateur.`
                        : `Quota total d'invités atteint pour votre forfait ${limits.name} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        const guestPreferences = { ...(preferences || {}) };
        const { phone: normalizedPhone, phoneCountryCode } = resolveGuestPhoneFields(req.body, guestPreferences);
        if (normalizedPhone) {
            guestPreferences.phone = normalizedPhone;
        }
        const contact = (0, guestIdentity_1.resolveGuestContactEmail)({ email, phone: normalizedPhone });
        if ('error' in contact) {
            return res.status(400).json({ error: contact.error });
        }
        const existingGuest = await db_1.prisma.guest.findUnique({
            where: { eventId_email: { eventId, email: contact.email } },
        });
        if (existingGuest) {
            return res.status(400).json({ error: 'Un invité avec cet e-mail ou ce WhatsApp existe déjà pour cet événement' });
        }
        const guest = await db_1.prisma.guest.create({
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
        const mergedPreferences = preferences !== undefined
            ? { ...preferences }
            : { ...(existingGuest.preferences || {}) };
        let normalizedPhone = existingGuest.phone;
        let phoneCountryCode = existingGuest.phoneCountryCode;
        if (req.body.phone !== undefined ||
            req.body.phoneCountryCode !== undefined ||
            req.body.nationalNumber !== undefined ||
            preferences !== undefined) {
            const resolved = resolveGuestPhoneFields(req.body, mergedPreferences);
            normalizedPhone = resolved.phone;
            phoneCountryCode = resolved.phoneCountryCode;
            if (normalizedPhone) {
                mergedPreferences.phone = normalizedPhone;
            }
        }
        const nextEmail = email !== undefined
            ? (0, guestIdentity_1.resolveGuestContactEmail)({ email, phone: normalizedPhone })
            : { email: existingGuest.email };
        if ('error' in nextEmail) {
            return res.status(400).json({ error: nextEmail.error });
        }
        if (nextEmail.email !== existingGuest.email) {
            const clash = await db_1.prisma.guest.findUnique({
                where: { eventId_email: { eventId, email: nextEmail.email } },
            });
            if (clash && clash.id !== id) {
                return res.status(400).json({ error: 'Un invité avec cet e-mail ou ce WhatsApp existe déjà pour cet événement' });
            }
        }
        const updatedGuest = await db_1.prisma.guest.update({
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
            const limits = (0, plansConfig_1.getPlanLimitsForTenant)(tenant.plan, tenant.accountKind);
            if (limits.maxGuests <= 0 || guestCount + guests.length > limits.maxGuests) {
                return res.status(403).json({
                    error: limits.maxGuests <= 0
                        ? `La gestion des invités n’est pas incluse dans votre forfait ${limits.name}. Choisissez un forfait organisateur.`
                        : `Quota total d'invités dépassé pour votre forfait ${limits.name} (Max ${limits.maxGuests >= 9999 ? 'illimité' : limits.maxGuests}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        let importedCount = 0;
        const errors = [];
        for (const g of guests) {
            if (!g.firstName || !g.lastName) {
                errors.push(`Prénom et nom requis pour l'invité: ${JSON.stringify(g)}`);
                continue;
            }
            const guestPrefs = g.preferences || {};
            if (g.notes)
                guestPrefs.notes = g.notes;
            if (g.allergies)
                guestPrefs.allergies = g.allergies;
            if (g.specialMeal)
                guestPrefs.specialMeal = g.specialMeal;
            const { phone: normalizedPhone, phoneCountryCode } = resolveGuestPhoneFields(g, guestPrefs);
            if (normalizedPhone)
                guestPrefs.phone = normalizedPhone;
            const contact = (0, guestIdentity_1.resolveGuestContactEmail)({ email: g.email, phone: normalizedPhone || g.phone });
            if ('error' in contact) {
                errors.push(`${g.firstName || ''} ${g.lastName || ''}: ${contact.error}`);
                continue;
            }
            try {
                await db_1.prisma.guest.upsert({
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
            }
            catch (err) {
                errors.push(`Erreur pour ${g.firstName} ${g.lastName}: ${err.message}`);
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

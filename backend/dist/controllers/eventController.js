"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvents = getEvents;
exports.createEvent = createEvent;
exports.getEventById = getEventById;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
const db_1 = require("../db");
const plansConfig_1 = require("../config/plansConfig");
// List all events for the current tenant
async function getEvents(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const events = await db_1.prisma.event.findMany({
            where: { tenantId },
            orderBy: { date: 'asc' },
        });
        return res.json(events);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des événements:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des événements' });
    }
}
// Create an event under the current tenant
async function createEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const { title, description, date, location, reminderFrequency, latitude, longitude } = req.body;
        if (!title || !date || !location) {
            return res.status(400).json({ error: 'Les champs title, date et location sont requis' });
        }
        // Check Plan / Quota before creating event (will be integrated in Phase 4, but let's add a placeholder or simple check)
        const tenant = await db_1.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { _count: { select: { events: true } } },
        });
        if (tenant) {
            const limits = (0, plansConfig_1.getPlanLimits)(tenant.plan);
            if (tenant._count.events >= limits.maxEvents) {
                return res.status(403).json({
                    error: `Quota d'événements atteint pour le plan ${tenant.plan} (Max ${limits.maxEvents === 9999 ? 'illimité' : limits.maxEvents}). Veuillez passer à un forfait supérieur.`,
                });
            }
        }
        const event = await db_1.prisma.event.create({
            data: {
                tenantId,
                title,
                description,
                date: new Date(date),
                location,
                reminderFrequency: reminderFrequency || 'NONE',
                latitude: latitude !== undefined && latitude !== null ? parseFloat(latitude) : null,
                longitude: longitude !== undefined && longitude !== null ? parseFloat(longitude) : null,
            },
        });
        return res.status(201).json(event);
    }
    catch (error) {
        console.error('Erreur lors de la création de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la création de l\'événement' });
    }
}
// Get a single event details
async function getEventById(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const event = await db_1.prisma.event.findFirst({
            where: { id, tenantId },
        });
        if (!event) {
            return res.status(404).json({ error: 'Événement non trouvé' });
        }
        return res.json(event);
    }
    catch (error) {
        console.error('Erreur lors de la récupération de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération de l\'événement' });
    }
}
// Update an event
async function updateEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        const { title, description, date, location, reminderFrequency, latitude, longitude, tablePlan } = req.body;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        // Ensure the event belongs to this tenant first
        const existingEvent = await db_1.prisma.event.findFirst({
            where: { id, tenantId },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        const updatedEvent = await db_1.prisma.event.update({
            where: { id },
            data: {
                title: title !== undefined ? title : existingEvent.title,
                description: description !== undefined ? description : existingEvent.description,
                date: date !== undefined ? new Date(date) : existingEvent.date,
                location: location !== undefined ? location : existingEvent.location,
                reminderFrequency: reminderFrequency !== undefined ? reminderFrequency : existingEvent.reminderFrequency,
                latitude: latitude !== undefined ? (latitude !== null ? parseFloat(latitude) : null) : existingEvent.latitude,
                longitude: longitude !== undefined ? (longitude !== null ? parseFloat(longitude) : null) : existingEvent.longitude,
                tablePlan: tablePlan !== undefined ? tablePlan : existingEvent.tablePlan,
            },
        });
        return res.json(updatedEvent);
    }
    catch (error) {
        console.error('Erreur lors de la modification de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la modification de l\'événement' });
    }
}
// Delete an event
async function deleteEvent(req, res) {
    try {
        const tenantId = req.user?.tenantId;
        const id = req.params.id;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant non identifié' });
        }
        const existingEvent = await db_1.prisma.event.findFirst({
            where: { id, tenantId },
        });
        if (!existingEvent) {
            return res.status(404).json({ error: 'Événement non trouvé ou non autorisé' });
        }
        await db_1.prisma.event.delete({
            where: { id },
        });
        return res.json({ message: 'Événement supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'événement:', error);
        return res.status(500).json({ error: 'Erreur lors de la suppression de l\'événement' });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGuestMessageTemplates = getGuestMessageTemplates;
exports.getGuestMessageTemplateById = getGuestMessageTemplateById;
exports.createGuestMessageTemplate = createGuestMessageTemplate;
exports.updateGuestMessageTemplate = updateGuestMessageTemplate;
exports.resetGuestMessageTemplate = resetGuestMessageTemplate;
const db_1 = require("../db");
const defaultGuestMessageTemplates_1 = require("../config/defaultGuestMessageTemplates");
const messageTemplateService_1 = require("../services/messageTemplateService");
const VALID_TYPES = defaultGuestMessageTemplates_1.DEFAULT_GUEST_MESSAGE_TEMPLATES.map((t) => t.type);
async function getGuestMessageTemplates(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        await (0, messageTemplateService_1.ensureDefaultGuestMessageTemplates)();
        const templates = await db_1.prisma.guestMessageTemplate.findMany({
            orderBy: { name: 'asc' },
        });
        return res.json(templates);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des modèles de messages:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération des modèles de messages.' });
    }
}
async function getGuestMessageTemplateById(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const template = await db_1.prisma.guestMessageTemplate.findUnique({ where: { id } });
        if (!template) {
            return res.status(404).json({ error: 'Modèle de message introuvable.' });
        }
        return res.json(template);
    }
    catch (error) {
        console.error('Erreur lors de la récupération du modèle de message:', error);
        return res.status(500).json({ error: 'Erreur lors de la récupération du modèle de message.' });
    }
}
async function createGuestMessageTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const { type, name, description, channel, subject, body, isActive } = req.body;
        if (!type || !name || !body) {
            return res.status(400).json({ error: 'Le type, le nom et le corps du message sont requis.' });
        }
        if (!VALID_TYPES.includes(type)) {
            return res.status(400).json({
                error: `Type invalide. Types autorisés : ${VALID_TYPES.join(', ')}`,
            });
        }
        const existing = await db_1.prisma.guestMessageTemplate.findUnique({ where: { type } });
        if (existing) {
            return res.status(409).json({ error: 'Un modèle existe déjà pour ce type. Utilisez la modification.' });
        }
        const template = await db_1.prisma.guestMessageTemplate.create({
            data: {
                type,
                name,
                description: description || null,
                channel: channel || 'WHATSAPP',
                subject: subject || null,
                body,
                isActive: isActive !== undefined ? Boolean(isActive) : true,
            },
        });
        return res.status(201).json({ message: 'Modèle de message créé avec succès', template });
    }
    catch (error) {
        console.error('Erreur lors de la création du modèle de message:', error);
        return res.status(500).json({ error: 'Erreur lors de la création du modèle de message.' });
    }
}
async function updateGuestMessageTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const { name, description, channel, subject, body, isActive } = req.body;
        const existing = await db_1.prisma.guestMessageTemplate.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Modèle de message introuvable.' });
        }
        const template = await db_1.prisma.guestMessageTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(description !== undefined && { description }),
                ...(channel !== undefined && { channel }),
                ...(subject !== undefined && { subject }),
                ...(body !== undefined && { body }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
        });
        return res.json({ message: 'Modèle de message mis à jour avec succès', template });
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour du modèle de message:', error);
        return res.status(500).json({ error: 'Erreur lors de la mise à jour du modèle de message.' });
    }
}
async function resetGuestMessageTemplate(req, res) {
    try {
        if (req.user?.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Accès refusé. Privilèges Super Admin requis.' });
        }
        const id = req.params.id;
        const existing = await db_1.prisma.guestMessageTemplate.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: 'Modèle de message introuvable.' });
        }
        const fallback = defaultGuestMessageTemplates_1.DEFAULT_GUEST_MESSAGE_TEMPLATES.find((t) => t.type === existing.type);
        if (!fallback) {
            return res.status(400).json({ error: 'Aucun modèle par défaut disponible pour ce type.' });
        }
        const template = await db_1.prisma.guestMessageTemplate.update({
            where: { id },
            data: {
                name: fallback.name,
                description: fallback.description,
                channel: fallback.channel,
                subject: fallback.subject || null,
                body: fallback.body,
                isActive: true,
            },
        });
        return res.json({ message: 'Modèle réinitialisé aux valeurs par défaut', template });
    }
    catch (error) {
        console.error('Erreur lors de la réinitialisation du modèle de message:', error);
        return res.status(500).json({ error: 'Erreur lors de la réinitialisation du modèle de message.' });
    }
}

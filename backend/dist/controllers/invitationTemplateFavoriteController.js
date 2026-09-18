"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPublicInvitationTemplateFavorites = listPublicInvitationTemplateFavorites;
exports.addPublicInvitationTemplateFavorite = addPublicInvitationTemplateFavorite;
exports.removePublicInvitationTemplateFavorite = removePublicInvitationTemplateFavorite;
exports.listUserInvitationTemplateFavorites = listUserInvitationTemplateFavorites;
exports.addUserInvitationTemplateFavorite = addUserInvitationTemplateFavorite;
exports.removeUserInvitationTemplateFavorite = removeUserInvitationTemplateFavorite;
exports.claimInvitationTemplateFavorites = claimInvitationTemplateFavorites;
const db_1 = require("../db");
const MAX_DEVICE_ID_LEN = 120;
const MAX_TEMPLATE_ID_LEN = 120;
function parseDeviceId(value) {
    return typeof value === 'string' ? value.trim().slice(0, MAX_DEVICE_ID_LEN) : '';
}
function parseTemplateId(value) {
    return typeof value === 'string' ? value.trim().slice(0, MAX_TEMPLATE_ID_LEN) : '';
}
function isUsableDeviceId(deviceId) {
    return Boolean(deviceId) && !deviceId.startsWith('server_') && deviceId !== 'fallback_device_local';
}
/** GET /api/public/invitation-favorites?deviceId= */
async function listPublicInvitationTemplateFavorites(req, res) {
    try {
        const deviceId = parseDeviceId(req.query.deviceId);
        if (!isUsableDeviceId(deviceId)) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
        }
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { deviceId, userId: null },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true, createdAt: true },
        });
        return res.json({
            templateIds: rows.map((row) => row.templateId),
            items: rows,
        });
    }
    catch (error) {
        console.error('listPublicInvitationTemplateFavorites:', error);
        return res.status(500).json({ error: 'Impossible de charger les favoris.' });
    }
}
/** POST /api/public/invitation-favorites { deviceId, templateId } */
async function addPublicInvitationTemplateFavorite(req, res) {
    try {
        const deviceId = parseDeviceId(req.body?.deviceId);
        const templateId = parseTemplateId(req.body?.templateId);
        if (!isUsableDeviceId(deviceId)) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
        }
        if (!templateId) {
            return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
        }
        const existing = await db_1.prisma.invitationTemplateFavorite.findFirst({
            where: { deviceId, userId: null, templateId },
        });
        if (!existing) {
            await db_1.prisma.invitationTemplateFavorite.create({
                data: { deviceId, templateId, userId: null },
            });
        }
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { deviceId, userId: null },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true },
        });
        return res.json({ templateIds: rows.map((row) => row.templateId) });
    }
    catch (error) {
        console.error('addPublicInvitationTemplateFavorite:', error);
        return res.status(500).json({ error: 'Impossible d’ajouter le favori.' });
    }
}
/** DELETE /api/public/invitation-favorites/:templateId?deviceId= */
async function removePublicInvitationTemplateFavorite(req, res) {
    try {
        const deviceId = parseDeviceId(req.query.deviceId);
        const templateId = parseTemplateId(req.params.templateId);
        if (!isUsableDeviceId(deviceId)) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
        }
        if (!templateId) {
            return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
        }
        await db_1.prisma.invitationTemplateFavorite.deleteMany({
            where: { deviceId, userId: null, templateId },
        });
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { deviceId, userId: null },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true },
        });
        return res.json({ templateIds: rows.map((row) => row.templateId) });
    }
    catch (error) {
        console.error('removePublicInvitationTemplateFavorite:', error);
        return res.status(500).json({ error: 'Impossible de retirer le favori.' });
    }
}
/** GET /api/public/invitation-favorites/mine (auth) */
async function listUserInvitationTemplateFavorites(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true, createdAt: true },
        });
        return res.json({
            templateIds: rows.map((row) => row.templateId),
            items: rows,
        });
    }
    catch (error) {
        console.error('listUserInvitationTemplateFavorites:', error);
        return res.status(500).json({ error: 'Impossible de charger les favoris.' });
    }
}
/** POST /api/public/invitation-favorites/mine { templateId } */
async function addUserInvitationTemplateFavorite(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const templateId = parseTemplateId(req.body?.templateId);
        if (!templateId) {
            return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
        }
        const existing = await db_1.prisma.invitationTemplateFavorite.findFirst({
            where: { userId: req.user.id, templateId },
        });
        if (!existing) {
            await db_1.prisma.invitationTemplateFavorite.create({
                data: { userId: req.user.id, templateId, deviceId: null },
            });
        }
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true },
        });
        return res.json({ templateIds: rows.map((row) => row.templateId) });
    }
    catch (error) {
        console.error('addUserInvitationTemplateFavorite:', error);
        return res.status(500).json({ error: 'Impossible d’ajouter le favori.' });
    }
}
/** DELETE /api/public/invitation-favorites/mine/:templateId */
async function removeUserInvitationTemplateFavorite(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const templateId = parseTemplateId(req.params.templateId);
        if (!templateId) {
            return res.status(400).json({ error: 'Identifiant de modèle manquant.' });
        }
        await db_1.prisma.invitationTemplateFavorite.deleteMany({
            where: { userId: req.user.id, templateId },
        });
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true },
        });
        return res.json({ templateIds: rows.map((row) => row.templateId) });
    }
    catch (error) {
        console.error('removeUserInvitationTemplateFavorite:', error);
        return res.status(500).json({ error: 'Impossible de retirer le favori.' });
    }
}
/**
 * POST /api/public/invitation-favorites/claim { deviceId }
 * Fusionne les favoris appareil → compte connecté.
 */
async function claimInvitationTemplateFavorites(req, res) {
    try {
        if (!req.user)
            return res.status(401).json({ error: 'Non authentifié.' });
        const deviceId = parseDeviceId(req.body?.deviceId);
        if (!isUsableDeviceId(deviceId)) {
            return res.status(400).json({ error: 'Identifiant d’appareil manquant.' });
        }
        const deviceRows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { deviceId, userId: null },
            select: { id: true, templateId: true },
        });
        if (deviceRows.length) {
            const existingUser = await db_1.prisma.invitationTemplateFavorite.findMany({
                where: { userId: req.user.id },
                select: { templateId: true },
            });
            const existingIds = new Set(existingUser.map((row) => row.templateId));
            const toCreate = deviceRows.filter((row) => !existingIds.has(row.templateId));
            if (toCreate.length) {
                await db_1.prisma.invitationTemplateFavorite.createMany({
                    data: toCreate.map((row) => ({
                        userId: req.user.id,
                        templateId: row.templateId,
                        deviceId: null,
                    })),
                });
            }
            await db_1.prisma.invitationTemplateFavorite.deleteMany({
                where: { id: { in: deviceRows.map((row) => row.id) } },
            });
        }
        const rows = await db_1.prisma.invitationTemplateFavorite.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            select: { templateId: true },
        });
        return res.json({
            claimed: deviceRows.length,
            templateIds: rows.map((row) => row.templateId),
        });
    }
    catch (error) {
        console.error('claimInvitationTemplateFavorites:', error);
        return res.status(500).json({ error: 'Impossible de synchroniser les favoris.' });
    }
}

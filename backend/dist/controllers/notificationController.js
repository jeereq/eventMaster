"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
exports.registerPushToken = registerPushToken;
exports.getPreferences = getPreferences;
exports.updatePreferences = updatePreferences;
exports.unregisterPushToken = unregisterPushToken;
const platformNotificationService_1 = require("../services/platformNotificationService");
const notificationPreferenceService_1 = require("../services/notificationPreferenceService");
const platformNotificationTypes_1 = require("../config/platformNotificationTypes");
const pushDeviceTokenService_1 = require("../services/pushDeviceTokenService");
async function listNotifications(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
        const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
        const unread = req.query.unread === '1' || req.query.unread === 'true';
        const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
        const family = typeof req.query.family === 'string' && req.query.family ? req.query.family : undefined;
        const eventId = typeof req.query.eventId === 'string' && req.query.eventId ? req.query.eventId : undefined;
        const result = await (0, platformNotificationService_1.getUserNotifications)(req.user.id, {
            limit,
            page,
            unread: unread || undefined,
            type,
            family,
            eventId,
        });
        return res.json(result);
    }
    catch (error) {
        console.error('[listNotifications]', error);
        return res.status(500).json({ error: 'Impossible de charger les notifications.' });
    }
}
async function readNotification(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const notificationId = String(req.params.id);
        const notification = await (0, platformNotificationService_1.markNotificationRead)(req.user.id, notificationId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification introuvable.' });
        }
        return res.json(notification);
    }
    catch (error) {
        console.error('[readNotification]', error);
        return res.status(500).json({ error: 'Impossible de marquer la notification comme lue.' });
    }
}
async function readAllNotifications(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const count = await (0, platformNotificationService_1.markAllNotificationsRead)(req.user.id);
        return res.json({ count });
    }
    catch (error) {
        console.error('[readAllNotifications]', error);
        return res.status(500).json({ error: 'Impossible de marquer les notifications comme lues.' });
    }
}
async function registerPushToken(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const { token, platform } = req.body;
        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Token push requis.' });
        }
        if (!platform || typeof platform !== 'string') {
            return res.status(400).json({ error: 'Plateforme requise (ios, android, web).' });
        }
        const record = await (0, pushDeviceTokenService_1.upsertPushDeviceToken)(req.user.id, token.trim(), platform.trim());
        return res.json({ id: record.id, token: record.token, platform: record.platform });
    }
    catch (error) {
        console.error('[registerPushToken]', error);
        return res.status(500).json({ error: 'Impossible d\'enregistrer le token push.' });
    }
}
async function getPreferences(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const prefs = await (0, notificationPreferenceService_1.getNotificationPreferences)(req.user.id);
        return res.json(prefs);
    }
    catch (error) {
        console.error('[getPreferences]', error);
        return res.status(500).json({ error: 'Impossible de charger les préférences.' });
    }
}
async function updatePreferences(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const raw = req.body?.families;
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return res.status(400).json({ error: 'families est requis.' });
        }
        const input = {};
        for (const [family, value] of Object.entries(raw)) {
            if (!(0, platformNotificationTypes_1.isNotificationPrefFamily)(family) || !value || typeof value !== 'object')
                continue;
            const row = value;
            input[family] = {
                ...(typeof row.email === 'boolean' ? { email: row.email } : {}),
                ...(typeof row.whatsapp === 'boolean' ? { whatsapp: row.whatsapp } : {}),
                ...(typeof row.push === 'boolean' ? { push: row.push } : {}),
            };
        }
        const prefs = await (0, notificationPreferenceService_1.saveNotificationPreferences)(req.user.id, input);
        return res.json(prefs);
    }
    catch (error) {
        console.error('[updatePreferences]', error);
        return res.status(500).json({ error: 'Impossible d’enregistrer les préférences.' });
    }
}
async function unregisterPushToken(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const token = String(req.body?.token ?? req.query.token ?? '');
        if (!token) {
            return res.status(400).json({ error: 'Token push requis.' });
        }
        const count = await (0, pushDeviceTokenService_1.removePushDeviceToken)(req.user.id, token.trim());
        return res.json({ removed: count });
    }
    catch (error) {
        console.error('[unregisterPushToken]', error);
        return res.status(500).json({ error: 'Impossible de supprimer le token push.' });
    }
}

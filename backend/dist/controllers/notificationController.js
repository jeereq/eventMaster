"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
const platformNotificationService_1 = require("../services/platformNotificationService");
async function listNotifications(req, res) {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ error: 'Non authentifié.' });
        }
        const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
        const result = await (0, platformNotificationService_1.getUserNotifications)(req.user.id, limit);
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

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/platformNotificationService';

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
    const result = await getUserNotifications(req.user.id, limit);
    return res.json(result);
  } catch (error: any) {
    console.error('[listNotifications]', error);
    return res.status(500).json({ error: 'Impossible de charger les notifications.' });
  }
}

export async function readNotification(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const notificationId = String(req.params.id);
    const notification = await markNotificationRead(req.user.id, notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification introuvable.' });
    }

    return res.json(notification);
  } catch (error: any) {
    console.error('[readNotification]', error);
    return res.status(500).json({ error: 'Impossible de marquer la notification comme lue.' });
  }
}

export async function readAllNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const count = await markAllNotificationsRead(req.user.id);
    return res.json({ count });
  } catch (error: any) {
    console.error('[readAllNotifications]', error);
    return res.status(500).json({ error: 'Impossible de marquer les notifications comme lues.' });
  }
}

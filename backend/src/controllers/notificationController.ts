import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import {
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/platformNotificationService';
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  type ChannelPreference,
} from '../services/notificationPreferenceService';
import { isNotificationPrefFamily, type NotificationPrefFamily } from '../config/platformNotificationTypes';
import {
  removePushDeviceToken,
  upsertPushDeviceToken,
} from '../services/pushDeviceTokenService';

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const limit = Math.min(parseInt(String(req.query.limit ?? '30'), 10) || 30, 100);
    const page = Math.max(parseInt(String(req.query.page ?? '1'), 10) || 1, 1);
    const unread = req.query.unread === '1' || req.query.unread === 'true';
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
    const family = typeof req.query.family === 'string' && req.query.family ? req.query.family : undefined;
    const result = await getUserNotifications(req.user.id, {
      limit,
      page,
      unread: unread || undefined,
      type,
      family,
    });
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

export async function registerPushToken(req: AuthenticatedRequest, res: Response) {
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

    const record = await upsertPushDeviceToken(req.user.id, token.trim(), platform.trim());
    return res.json({ id: record.id, token: record.token, platform: record.platform });
  } catch (error: any) {
    console.error('[registerPushToken]', error);
    return res.status(500).json({ error: 'Impossible d\'enregistrer le token push.' });
  }
}

export async function getPreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }
    const prefs = await getNotificationPreferences(req.user.id);
    return res.json(prefs);
  } catch (error: unknown) {
    console.error('[getPreferences]', error);
    return res.status(500).json({ error: 'Impossible de charger les préférences.' });
  }
}

export async function updatePreferences(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const raw = req.body?.families;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return res.status(400).json({ error: 'families est requis.' });
    }

    const input: Partial<Record<NotificationPrefFamily, Partial<ChannelPreference>>> = {};
    for (const [family, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isNotificationPrefFamily(family) || !value || typeof value !== 'object') continue;
      const row = value as Record<string, unknown>;
      input[family] = {
        ...(typeof row.email === 'boolean' ? { email: row.email } : {}),
        ...(typeof row.whatsapp === 'boolean' ? { whatsapp: row.whatsapp } : {}),
        ...(typeof row.push === 'boolean' ? { push: row.push } : {}),
      };
    }

    const prefs = await saveNotificationPreferences(req.user.id, input);
    return res.json(prefs);
  } catch (error: unknown) {
    console.error('[updatePreferences]', error);
    return res.status(500).json({ error: 'Impossible d’enregistrer les préférences.' });
  }
}

export async function unregisterPushToken(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const token = String(req.body?.token ?? req.query.token ?? '');
    if (!token) {
      return res.status(400).json({ error: 'Token push requis.' });
    }

    const count = await removePushDeviceToken(req.user.id, token.trim());
    return res.json({ removed: count });
  } catch (error: any) {
    console.error('[unregisterPushToken]', error);
    return res.status(500).json({ error: 'Impossible de supprimer le token push.' });
  }
}

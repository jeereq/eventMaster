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
import { fetchExpoPushReceipts, sendExpoPushToUser } from '../services/expoPushService';

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
    const eventId = typeof req.query.eventId === 'string' && req.query.eventId ? req.query.eventId : undefined;
    const result = await getUserNotifications(req.user.id, {
      limit,
      page,
      unread: unread || undefined,
      type,
      family,
      eventId,
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
        ...(typeof row.sms === 'boolean' ? { sms: row.sms } : {}),
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

const RECEIPT_HINTS: Record<string, string> = {
  DeviceNotRegistered: 'Appareil désinscrit : relancez l’app et reconnectez-vous.',
  InvalidCredentials: 'Identifiants FCM (Android) ou APNs (iOS) absents du projet Expo : à ajouter avec « eas credentials ».',
  MessageTooBig: 'Message trop volumineux.',
  MessageRateExceeded: 'Trop de notifications envoyées à cet appareil, réessayez plus tard.',
  MismatchSenderId: 'Le google-services.json de l’app ne correspond pas à la clé FCM du projet Expo.',
};

/**
 * Envoie une notification push de test sur les appareils de l'utilisateur
 * connecté et renvoie le diagnostic (tickets + reçus Expo).
 */
export async function sendTestPush(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Non authentifié.' });
    }

    const result = await sendExpoPushToUser(req.user.id, {
      title: 'Test EventMaster',
      body: 'Les notifications push fonctionnent sur cet appareil.',
      data: { type: 'PUSH_TEST' },
    });

    if (result.tickets.length === 0) {
      return res.json({
        ok: false,
        devices: 0,
        hint: 'Aucun appareil enregistré : ouvrez l’app mobile (build EAS, pas Expo Go), connectez-vous et acceptez les notifications.',
        tickets: [],
      });
    }

    const ticketIds = result.tickets.map((t) => t.id).filter((id): id is string => Boolean(id));
    let receipts: Awaited<ReturnType<typeof fetchExpoPushReceipts>> = {};
    let receiptsError: string | undefined;
    if (ticketIds.length > 0) {
      // Les reçus ne sont disponibles qu'après la remise à FCM/APNs.
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        receipts = await fetchExpoPushReceipts(ticketIds);
      } catch (err) {
        receiptsError = err instanceof Error ? err.message : String(err);
      }
    }

    const devices = result.tickets.map((ticket) => {
      const receipt = ticket.id ? receipts[ticket.id] : undefined;
      const errorCode = ticket.status === 'error'
        ? ticket.details?.error
        : receipt?.status === 'error' ? receipt.details?.error : undefined;
      const status = ticket.status === 'error' || receipt?.status === 'error'
        ? 'error'
        : receipt?.status === 'ok' ? 'delivered' : 'pending';
      return {
        token: `${ticket.token.slice(0, 24)}…`,
        status,
        error: errorCode ?? (status === 'error' ? receipt?.message ?? ticket.message : undefined),
        hint: errorCode ? RECEIPT_HINTS[errorCode] : undefined,
      };
    });

    return res.json({
      ok: devices.some((d) => d.status !== 'error'),
      devices: devices.length,
      results: devices,
      ...(receiptsError ? { receiptsError } : {}),
    });
  } catch (error: unknown) {
    console.error('[sendTestPush]', error);
    return res.status(500).json({ error: 'Impossible d’envoyer la notification de test.' });
  }
}

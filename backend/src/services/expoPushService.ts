import { getPushTokensForUser, removeInvalidPushTokens } from './pushDeviceTokenService';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  priority?: 'default' | 'normal' | 'high';
}

export interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export type ExpoPushResult = {
  sent: number;
  failed: number;
  /** Un ticket par appareil (même ordre que `tokens`). */
  tickets: Array<{ token: string } & ExpoPushTicket>;
  /** Première erreur rencontrée, pour le journal de livraison. */
  error?: string;
};

function expoHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }
  return headers;
}

export async function sendExpoPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<ExpoPushResult> {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, tickets: [] };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
    priority: 'high',
  }));

  const headers = expoHeaders();

  let sent = 0;
  let failed = 0;
  let firstError: string | undefined;
  const invalidTokens: string[] = [];
  const allTickets: ExpoPushResult['tickets'] = [];

  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        failed += chunk.length;
        const text = await response.text().catch(() => '');
        firstError ??= `Expo HTTP ${response.status} ${text.slice(0, 200)}`.trim();
        chunk.forEach((m) => allTickets.push({ token: m.to, status: 'error', message: firstError }));
        continue;
      }

      const result = (await response.json()) as { data?: ExpoPushTicket[] };
      const tickets = result.data ?? [];

      tickets.forEach((ticket, idx) => {
        allTickets.push({ token: chunk[idx].to, ...ticket });
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          firstError ??= ticket.details?.error || ticket.message || 'Erreur Expo';
          const errorCode = ticket.details?.error;
          // InvalidCredentials = clé FCM/APNs manquante côté projet Expo :
          // l'appareil est valide, on garde le jeton.
          if (errorCode === 'DeviceNotRegistered') {
            invalidTokens.push(chunk[idx].to);
          }
        }
      });
    } catch (err) {
      console.warn('[ExpoPush] Envoi échoué:', err);
      failed += chunk.length;
      firstError ??= err instanceof Error ? err.message : String(err);
      chunk.forEach((m) => allTickets.push({ token: m.to, status: 'error', message: firstError }));
    }
  }

  if (invalidTokens.length > 0) {
    await removeInvalidPushTokens(invalidTokens);
  }

  return { sent, failed, tickets: allTickets, error: firstError };
}

export interface ExpoPushReceipt {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

/**
 * Récupère les reçus Expo : un ticket « ok » veut seulement dire qu'Expo a
 * accepté le message. Les erreurs FCM/APNs (identifiants manquants, etc.)
 * n'apparaissent que dans les reçus, quelques secondes plus tard.
 */
export async function fetchExpoPushReceipts(ids: string[]): Promise<Record<string, ExpoPushReceipt>> {
  if (ids.length === 0) return {};
  const response = await fetch(EXPO_RECEIPTS_URL, {
    method: 'POST',
    headers: expoHeaders(),
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) {
    throw new Error(`Expo receipts HTTP ${response.status}`);
  }
  const result = (await response.json()) as { data?: Record<string, ExpoPushReceipt> };
  return result.data ?? {};
}

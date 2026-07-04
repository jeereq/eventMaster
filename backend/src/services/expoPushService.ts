import { getPushTokensForUser, removeInvalidPushTokens } from './pushDeviceTokenService';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendExpoPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, unknown>;
  },
): Promise<{ sent: number; failed: number }> {
  const tokens = await getPushTokensForUser(userId);
  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: payload.data,
    sound: 'default',
  }));

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (process.env.EXPO_ACCESS_TOKEN) {
    headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

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
        continue;
      }

      const result = (await response.json()) as { data?: ExpoPushTicket[] };
      const tickets = result.data ?? [];

      tickets.forEach((ticket, idx) => {
        if (ticket.status === 'ok') {
          sent += 1;
        } else {
          failed += 1;
          const errorCode = ticket.details?.error;
          if (errorCode === 'DeviceNotRegistered' || errorCode === 'InvalidCredentials') {
            invalidTokens.push(chunk[idx].to);
          }
        }
      });
    } catch (err) {
      console.warn('[ExpoPush] Envoi échoué:', err);
      failed += chunk.length;
    }
  }

  if (invalidTokens.length > 0) {
    await removeInvalidPushTokens(invalidTokens);
  }

  return { sent, failed };
}

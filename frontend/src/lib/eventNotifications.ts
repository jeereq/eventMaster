/** Notifications d’un événement : réglages de l’organisateur et abonnement des invités. */

export type EventNotificationSettings = {
  rsvp: boolean;
  tickets: boolean;
  donations: boolean;
  guestUpdates: boolean;
};

export const DEFAULT_EVENT_NOTIFICATION_SETTINGS: EventNotificationSettings = {
  rsvp: true,
  tickets: true,
  donations: true,
  guestUpdates: true,
};

export function resolveEventNotificationSettings(raw: unknown): EventNotificationSettings {
  const out = { ...DEFAULT_EVENT_NOTIFICATION_SETTINGS };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  (Object.keys(out) as Array<keyof EventNotificationSettings>).forEach((key) => {
    if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean;
  });
  return out;
}

export type GuestNotificationPrefs = {
  enabled: boolean;
  email: boolean;
  whatsapp: boolean;
  updatedAt?: string | null;
};

export const DEFAULT_GUEST_NOTIFICATION_PREFS: GuestNotificationPrefs = {
  enabled: false,
  email: true,
  whatsapp: true,
  updatedAt: null,
};

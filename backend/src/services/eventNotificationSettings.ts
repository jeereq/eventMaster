/**
 * Notifications propres à un événement :
 * - côté organisateur, quelles alertes cet événement déclenche (réponses, billets, dons)
 *   et s’il envoie ses nouvelles aux invités abonnés ;
 * - côté invité, l’abonnement aux nouvelles de l’événement et les canaux choisis.
 * Module pur (sans base de données) pour être testé seul.
 */

export type EventNotificationSettings = {
  /** Réponses des invités (présent / absent). */
  rsvp: boolean;
  /** Billets vendus et paiements de places en échec. */
  tickets: boolean;
  /** Dons reçus. */
  donations: boolean;
  /** Les invités peuvent s’abonner et recevoir les publications de l’organisateur. */
  guestUpdates: boolean;
};

export type EventAlertKind = keyof EventNotificationSettings;

export const DEFAULT_EVENT_NOTIFICATION_SETTINGS: EventNotificationSettings = {
  rsvp: true,
  tickets: true,
  donations: true,
  guestUpdates: true,
};

const EVENT_KEYS: EventAlertKind[] = ['rsvp', 'tickets', 'donations', 'guestUpdates'];

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null;
}

export function sanitizeEventNotificationSettings(raw: unknown): EventNotificationSettings {
  const obj = asRecord(raw);
  const out = { ...DEFAULT_EVENT_NOTIFICATION_SETTINGS };
  if (!obj) return out;
  for (const key of EVENT_KEYS) {
    if (typeof obj[key] === 'boolean') out[key] = obj[key] as boolean;
  }
  return out;
}

/** Applique une modification partielle : seules les clés booléennes connues sont prises. */
export function mergeEventNotificationSettings(current: unknown, input: unknown): EventNotificationSettings {
  const base = sanitizeEventNotificationSettings(current);
  const patch = asRecord(input);
  if (!patch) return base;
  for (const key of EVENT_KEYS) {
    if (typeof patch[key] === 'boolean') base[key] = patch[key] as boolean;
  }
  return base;
}

export function isEventAlertEnabledIn(raw: unknown, kind: EventAlertKind): boolean {
  return sanitizeEventNotificationSettings(raw)[kind];
}

export type GuestNotificationPrefs = {
  /** L’invité a activé les nouvelles de l’événement (désactivé tant qu’il ne l’a pas choisi). */
  enabled: boolean;
  email: boolean;
  whatsapp: boolean;
  updatedAt: string | null;
};

export const DEFAULT_GUEST_NOTIFICATION_PREFS: GuestNotificationPrefs = {
  enabled: false,
  email: true,
  whatsapp: true,
  updatedAt: null,
};

export function sanitizeGuestNotificationPrefs(raw: unknown): GuestNotificationPrefs {
  const obj = asRecord(raw);
  if (!obj) return { ...DEFAULT_GUEST_NOTIFICATION_PREFS };
  return {
    enabled: typeof obj.enabled === 'boolean' ? obj.enabled : false,
    email: typeof obj.email === 'boolean' ? obj.email : true,
    whatsapp: typeof obj.whatsapp === 'boolean' ? obj.whatsapp : true,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : null,
  };
}

export function mergeGuestNotificationPrefs(current: unknown, input: unknown, now = new Date()): GuestNotificationPrefs {
  const base = sanitizeGuestNotificationPrefs(current);
  const patch = asRecord(input);
  if (patch) {
    if (typeof patch.enabled === 'boolean') base.enabled = patch.enabled;
    if (typeof patch.email === 'boolean') base.email = patch.email;
    if (typeof patch.whatsapp === 'boolean') base.whatsapp = patch.whatsapp;
  }
  // Activer sans aucun canal n’aurait aucun effet : on garde au moins l’e-mail.
  if (base.enabled && !base.email && !base.whatsapp) base.email = true;
  base.updatedAt = now.toISOString();
  return base;
}

/** Canaux à utiliser pour envoyer une nouvelle de l’événement à un invité. */
export function guestUpdateChannels(
  eventSettings: unknown,
  guestPrefs: unknown,
  contact: { email?: string | null; phone?: string | null },
): { email: boolean; whatsapp: boolean } {
  const none = { email: false, whatsapp: false };
  if (!isEventAlertEnabledIn(eventSettings, 'guestUpdates')) return none;
  const prefs = sanitizeGuestNotificationPrefs(guestPrefs);
  if (!prefs.enabled) return none;
  const email = Boolean(contact.email && /.+@.+\..+/.test(contact.email));
  const phone = Boolean(contact.phone && contact.phone.replace(/\D/g, '').length >= 8);
  return { email: prefs.email && email, whatsapp: prefs.whatsapp && phone };
}

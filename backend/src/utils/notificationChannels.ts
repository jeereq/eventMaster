export type DeliveryChannel = 'EMAIL' | 'WHATSAPP' | 'SMS';

/**
 * Résout les canaux actifs de diffusion (e-mail, WhatsApp et/ou SMS).
 * Supporte les sélections unitaires, combinées ou multi-canaux.
 */
export function resolveDeliveryChannels(channel: string | string[] | null | undefined): DeliveryChannel[] {
  let raw: string[] = [];

  if (Array.isArray(channel)) {
    raw = channel.map((c) => String(c).trim().toUpperCase());
  } else if (typeof channel === 'string' && channel.trim()) {
    const normalized = channel.trim().toUpperCase();
    if (normalized === 'EMAIL_AND_WHATSAPP' || normalized === 'WHATSAPP_AND_EMAIL') {
      raw = ['EMAIL', 'WHATSAPP'];
    } else if (normalized === 'EMAIL_AND_SMS' || normalized === 'SMS_AND_EMAIL') {
      raw = ['EMAIL', 'SMS'];
    } else if (normalized === 'WHATSAPP_AND_SMS' || normalized === 'SMS_AND_WHATSAPP') {
      raw = ['WHATSAPP', 'SMS'];
    } else if (normalized === 'ALL_CHANNELS') {
      raw = ['EMAIL', 'WHATSAPP', 'SMS'];
    } else if (normalized === 'SMS') {
      raw = ['SMS'];
    } else {
      raw = normalized.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    }
  } else {
    raw = ['EMAIL'];
  }

  const resolved = new Set<DeliveryChannel>();
  for (const entry of raw) {
    if (entry === 'EMAIL') resolved.add('EMAIL');
    else if (entry === 'WHATSAPP') resolved.add('WHATSAPP');
    else if (entry === 'SMS') resolved.add('SMS');
  }

  if (resolved.size === 0) resolved.add('EMAIL');
  return [...resolved];
}

const INVITATION_METHOD_ORDER: DeliveryChannel[] = ['EMAIL', 'WHATSAPP', 'SMS'];

/** Canaux d’invitation parmi ceux activés par le superadmin (le push ne concerne pas les invitations). */
export function invitationMethodsFromPlatform(
  channels: readonly string[] | null | undefined,
): DeliveryChannel[] {
  const enabled = new Set((channels || []).map((item) => String(item).trim().toUpperCase()));
  return INVITATION_METHOD_ORDER.filter((method) => enabled.has(method));
}

export function authorizedDeliveryChannels(
  channel: string | string[] | null | undefined,
  allowed: readonly DeliveryChannel[],
): DeliveryChannel[] {
  const permitted = new Set(allowed);
  return resolveDeliveryChannels(channel).filter((method) => permitted.has(method));
}

/** Code canal stocké pour un ensemble de moyens (e-mail, WhatsApp, SMS). */
export function encodeInvitationChannel(methods: readonly DeliveryChannel[]): string | null {
  const set = new Set(methods);
  const email = set.has('EMAIL');
  const whatsapp = set.has('WHATSAPP');
  const sms = set.has('SMS');
  if (email && whatsapp && sms) return 'ALL_CHANNELS';
  if (email && whatsapp) return 'EMAIL_AND_WHATSAPP';
  if (email && sms) return 'EMAIL_AND_SMS';
  if (whatsapp && sms) return 'WHATSAPP_AND_SMS';
  if (email) return 'EMAIL';
  if (whatsapp) return 'WHATSAPP';
  if (sms) return 'SMS';
  return null;
}

/**
 * Conserve uniquement les moyens autorisés.
 * Retourne null si plus aucun moyen de l’invitation ne reste autorisé.
 */
export function clampInvitationChannel(
  channel: string | string[] | null | undefined,
  allowed: readonly DeliveryChannel[],
): string | null {
  return encodeInvitationChannel(authorizedDeliveryChannels(channel, allowed));
}

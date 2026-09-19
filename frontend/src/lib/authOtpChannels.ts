export type AuthOtpChannels = 'EMAIL' | 'WHATSAPP' | 'SMS' | 'BOTH' | 'ALL';
export type AuthOtpMethod = 'EMAIL' | 'WHATSAPP' | 'SMS';

export function sanitizeAuthOtpChannels(value: unknown): AuthOtpChannels {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'EMAIL' || raw === 'WHATSAPP' || raw === 'SMS' || raw === 'BOTH' || raw === 'ALL') return raw;
  return 'BOTH';
}

export function defaultAuthOtpMethod(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod {
  if (channels === 'WHATSAPP') return 'WHATSAPP';
  if (channels === 'SMS') return 'SMS';
  return 'EMAIL';
}

export function authOtpMethodOptions(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod[] {
  if (channels === 'EMAIL') return ['EMAIL'];
  if (channels === 'WHATSAPP') return ['WHATSAPP'];
  if (channels === 'SMS') return ['SMS'];
  if (channels === 'ALL') return ['EMAIL', 'WHATSAPP', 'SMS'];
  return ['EMAIL', 'WHATSAPP'];
}

export function allowsAuthOtpChoice(channels: AuthOtpChannels = 'BOTH'): boolean {
  return channels === 'BOTH' || channels === 'ALL';
}

export function resolveAuthOtpMethodFromSite(
  requested: unknown,
  channels: AuthOtpChannels = 'BOTH',
): AuthOtpMethod {
  if (channels === 'EMAIL') return 'EMAIL';
  if (channels === 'WHATSAPP') return 'WHATSAPP';
  if (channels === 'SMS') return 'SMS';
  const req = String(requested || '').trim().toUpperCase();
  if (req === 'WHATSAPP') return 'WHATSAPP';
  if (req === 'SMS' && channels === 'ALL') return 'SMS';
  return 'EMAIL';
}

export function otpMethodFromIdentifierMode(
  mode: 'email' | 'phone',
  channels: AuthOtpChannels = 'BOTH',
): AuthOtpMethod {
  if (channels === 'EMAIL') return 'EMAIL';
  if (channels === 'WHATSAPP') return 'WHATSAPP';
  if (channels === 'SMS') return 'SMS';
  if (mode === 'phone') {
    return 'WHATSAPP';
  }
  return 'EMAIL';
}

export function authOtpChannelsLabel(channels: AuthOtpChannels): string {
  if (channels === 'EMAIL') return 'E-mail uniquement';
  if (channels === 'WHATSAPP') return 'WhatsApp uniquement';
  if (channels === 'SMS') return 'SMS uniquement';
  if (channels === 'ALL') return 'E-mail, WhatsApp ou SMS (au choix)';
  return 'E-mail ou WhatsApp (au choix)';
}

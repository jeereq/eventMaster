export type AuthOtpChannels = 'EMAIL' | 'WHATSAPP' | 'BOTH';
export type AuthOtpMethod = 'EMAIL' | 'WHATSAPP';

export function sanitizeAuthOtpChannels(value: unknown): AuthOtpChannels {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === 'EMAIL' || raw === 'WHATSAPP' || raw === 'BOTH') return raw;
  return 'BOTH';
}

export function defaultAuthOtpMethod(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod {
  return channels === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}

export function authOtpMethodOptions(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod[] {
  if (channels === 'EMAIL') return ['EMAIL'];
  if (channels === 'WHATSAPP') return ['WHATSAPP'];
  return ['EMAIL', 'WHATSAPP'];
}

export function allowsAuthOtpChoice(channels: AuthOtpChannels = 'BOTH'): boolean {
  return channels === 'BOTH';
}

export function resolveAuthOtpMethodFromSite(
  requested: unknown,
  channels: AuthOtpChannels = 'BOTH',
): AuthOtpMethod {
  if (channels === 'EMAIL') return 'EMAIL';
  if (channels === 'WHATSAPP') return 'WHATSAPP';
  return String(requested || '').trim().toUpperCase() === 'WHATSAPP' ? 'WHATSAPP' : 'EMAIL';
}

export function authOtpChannelsLabel(channels: AuthOtpChannels): string {
  if (channels === 'EMAIL') return 'E-mail uniquement';
  if (channels === 'WHATSAPP') return 'WhatsApp uniquement';
  return 'E-mail ou WhatsApp (au choix)';
}

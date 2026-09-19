export type AuthOtpChannels =
  | 'EMAIL'
  | 'WHATSAPP'
  | 'SMS'
  | 'BOTH'
  | 'EMAIL_WHATSAPP'
  | 'EMAIL_SMS'
  | 'WHATSAPP_SMS'
  | 'ALL';
export type AuthOtpMethod = 'EMAIL' | 'WHATSAPP' | 'SMS';

export function authOtpMethodOptions(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod[] {
  if (channels === 'EMAIL') return ['EMAIL'];
  if (channels === 'WHATSAPP') return ['WHATSAPP'];
  if (channels === 'SMS') return ['SMS'];
  if (channels === 'EMAIL_SMS') return ['EMAIL', 'SMS'];
  if (channels === 'WHATSAPP_SMS') return ['WHATSAPP', 'SMS'];
  if (channels === 'ALL') return ['EMAIL', 'WHATSAPP', 'SMS'];
  return ['EMAIL', 'WHATSAPP'];
}

export function methodsToAuthOtpChannels(methods: AuthOtpMethod[]): AuthOtpChannels {
  const set = new Set(methods);
  const hasEmail = set.has('EMAIL');
  const hasWa = set.has('WHATSAPP');
  const hasSms = set.has('SMS');

  if (hasEmail && hasWa && hasSms) return 'ALL';
  if (hasEmail && hasWa) return 'BOTH';
  if (hasEmail && hasSms) return 'EMAIL_SMS';
  if (hasWa && hasSms) return 'WHATSAPP_SMS';
  if (hasEmail) return 'EMAIL';
  if (hasWa) return 'WHATSAPP';
  if (hasSms) return 'SMS';
  return 'BOTH';
}

export function sanitizeAuthOtpChannels(value: unknown): AuthOtpChannels {
  if (Array.isArray(value)) {
    const methods = value
      .map((item) => String(item || '').trim().toUpperCase())
      .filter((item): item is AuthOtpMethod => item === 'EMAIL' || item === 'WHATSAPP' || item === 'SMS');
    return methodsToAuthOtpChannels(methods);
  }
  const raw = String(value || '').trim().toUpperCase();
  if (
    raw === 'EMAIL' ||
    raw === 'WHATSAPP' ||
    raw === 'SMS' ||
    raw === 'BOTH' ||
    raw === 'EMAIL_WHATSAPP' ||
    raw === 'EMAIL_SMS' ||
    raw === 'WHATSAPP_SMS' ||
    raw === 'ALL'
  ) {
    if (raw === 'EMAIL_WHATSAPP') return 'BOTH';
    return raw as AuthOtpChannels;
  }
  return 'BOTH';
}

export function defaultAuthOtpMethod(channels: AuthOtpChannels = 'BOTH'): AuthOtpMethod {
  const opts = authOtpMethodOptions(channels);
  if (opts.includes('WHATSAPP')) return 'WHATSAPP';
  if (opts.includes('SMS')) return 'SMS';
  return opts[0] || 'EMAIL';
}

export function allowsAuthOtpChoice(channels: AuthOtpChannels = 'BOTH'): boolean {
  return authOtpMethodOptions(channels).length > 1;
}

export function resolveAuthOtpMethodFromSite(
  requested: unknown,
  channels: AuthOtpChannels = 'BOTH',
): AuthOtpMethod {
  const opts = authOtpMethodOptions(channels);
  if (opts.length === 1) return opts[0];
  const req = String(requested || '').trim().toUpperCase();
  if (opts.includes(req as AuthOtpMethod)) return req as AuthOtpMethod;
  return defaultAuthOtpMethod(channels);
}

export function otpMethodFromIdentifierMode(
  mode: 'email' | 'phone',
  channels: AuthOtpChannels = 'BOTH',
): AuthOtpMethod {
  const opts = authOtpMethodOptions(channels);
  if (opts.length === 1) return opts[0];
  if (mode === 'phone') {
    if (opts.includes('WHATSAPP')) return 'WHATSAPP';
    if (opts.includes('SMS')) return 'SMS';
  }
  if (opts.includes('EMAIL')) return 'EMAIL';
  return opts[0] || 'EMAIL';
}

export function authOtpChannelsLabel(channels: AuthOtpChannels): string {
  const opts = authOtpMethodOptions(channels);
  if (opts.length === 3) return 'Tous les canaux (E-mail, WhatsApp, SMS)';
  if (opts.length === 1) {
    if (opts[0] === 'EMAIL') return 'E-mail uniquement';
    if (opts[0] === 'WHATSAPP') return 'WhatsApp uniquement';
    if (opts[0] === 'SMS') return 'SMS uniquement';
  }
  const labels: Record<AuthOtpMethod, string> = {
    EMAIL: 'E-mail',
    WHATSAPP: 'WhatsApp',
    SMS: 'SMS',
  };
  return opts.map((m) => labels[m]).join(' ou ') + ' (au choix)';
}

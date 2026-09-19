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

export type PhoneAuthOtpMethod = 'WHATSAPP' | 'SMS';

export function phoneAuthOtpMethods(channels: AuthOtpChannels = 'BOTH'): PhoneAuthOtpMethod[] {
  const opts = authOtpMethodOptions(channels);
  return opts.filter((m): m is PhoneAuthOtpMethod => m === 'WHATSAPP' || m === 'SMS');
}

export function defaultPhoneAuthOtpMethod(channels: AuthOtpChannels = 'BOTH'): PhoneAuthOtpMethod {
  const methods = phoneAuthOtpMethods(channels);
  if (methods.includes('WHATSAPP')) return 'WHATSAPP';
  if (methods.includes('SMS')) return 'SMS';
  return 'WHATSAPP';
}

export function phoneFieldLabel(channels: AuthOtpChannels = 'BOTH', method?: AuthOtpMethod): string {
  if (method === 'WHATSAPP') return 'Téléphone WhatsApp';
  if (method === 'SMS') return 'Téléphone SMS';
  const phoneMethods = phoneAuthOtpMethods(channels);
  if (phoneMethods.length === 1) {
    return phoneMethods[0] === 'WHATSAPP' ? 'Téléphone WhatsApp' : 'Téléphone SMS';
  }
  if (phoneMethods.length > 1) {
    return 'Téléphone (WhatsApp ou SMS)';
  }
  return 'Téléphone';
}

export function phoneFieldHint(channels: AuthOtpChannels = 'BOTH', method?: AuthOtpMethod): string {
  if (method === 'WHATSAPP') {
    return 'Indicatif pays + numéro national (sans le 0). Code / lien envoyé sur WhatsApp.';
  }
  if (method === 'SMS') {
    return 'Indicatif pays + numéro national (sans le 0). Code / lien envoyé par SMS.';
  }
  const phoneMethods = phoneAuthOtpMethods(channels);
  if (phoneMethods.length === 1) {
    return phoneMethods[0] === 'WHATSAPP'
      ? 'Indicatif pays + numéro national (sans le 0). Envoi sur WhatsApp.'
      : 'Indicatif pays + numéro national (sans le 0). Envoi par SMS.';
  }
  if (phoneMethods.length > 1) {
    return 'Indicatif pays + numéro national (sans le 0). Envoi via WhatsApp ou SMS selon votre choix.';
  }
  return 'Indicatif pays + numéro national (sans le 0).';
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

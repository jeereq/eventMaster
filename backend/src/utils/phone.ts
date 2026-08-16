/** Compose / normalise téléphone côté API */

export function normalizeCountryCode(raw?: string | null, fallback = '+243'): string {
  if (!raw?.trim()) return fallback;
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : fallback;
}

export function normalizeNationalNumber(raw?: string | null): string {
  if (!raw) return '';
  let digits = raw.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function composeE164(countryCode?: string | null, national?: string | null): string | null {
  const nat = normalizeNationalNumber(national);
  if (!nat) return null;
  const cc = normalizeCountryCode(countryCode).replace(/^\+/, '');
  if (nat.startsWith(cc)) return `+${nat}`;
  // Si national est déjà un E.164 collé
  if (national?.trim().startsWith('+')) {
    return `+${nat}`;
  }
  return `+${cc}${nat}`;
}

/**
 * Résout phone + phoneCountryCode depuis le body.
 * - phone stocké en E.164 complet
 * - phoneCountryCode stocké tel quel (+243)
 */
export function resolvePhoneFields(input: {
  phone?: string | null;
  phoneCountryCode?: string | null;
  nationalNumber?: string | null;
}): { phone: string | null; phoneCountryCode: string | null } {
  const cc = input.phoneCountryCode
    ? normalizeCountryCode(input.phoneCountryCode)
    : null;

  // Nouveau flux : indicatif + numéro national séparés
  if (cc && (input.nationalNumber || input.phone)) {
    const national = input.nationalNumber || input.phone;
    // Si phone commence déjà par +, c’est un E.164
    if (typeof national === 'string' && national.trim().startsWith('+') && !input.nationalNumber) {
      return { phone: national.trim(), phoneCountryCode: cc };
    }
    const e164 = composeE164(cc, national);
    return { phone: e164, phoneCountryCode: cc };
  }

  // Legacy : un seul champ phone
  if (input.phone?.trim()) {
    const raw = input.phone.trim();
    if (raw.startsWith('+')) {
      return { phone: raw, phoneCountryCode: cc };
    }
    if (cc) {
      return { phone: composeE164(cc, raw), phoneCountryCode: cc };
    }
    return { phone: raw, phoneCountryCode: null };
  }

  return { phone: null, phoneCountryCode: cc };
}

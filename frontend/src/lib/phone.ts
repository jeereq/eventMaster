/** Indicatifs téléphoniques courants (Afrique centrale + internationaux utiles). */
export const PHONE_COUNTRY_CODES = [
  { code: '+243', iso: 'CD', label: 'RDC (+243)' },
  { code: '+242', iso: 'CG', label: 'Congo (+242)' },
  { code: '+33', iso: 'FR', label: 'France (+33)' },
  { code: '+32', iso: 'BE', label: 'Belgique (+32)' },
  { code: '+41', iso: 'CH', label: 'Suisse (+41)' },
  { code: '+1', iso: 'US', label: 'USA/Canada (+1)' },
  { code: '+44', iso: 'GB', label: 'Royaume-Uni (+44)' },
  { code: '+49', iso: 'DE', label: 'Allemagne (+49)' },
  { code: '+237', iso: 'CM', label: 'Cameroun (+237)' },
  { code: '+225', iso: 'CI', label: 'Côte d’Ivoire (+225)' },
  { code: '+221', iso: 'SN', label: 'Sénégal (+221)' },
  { code: '+250', iso: 'RW', label: 'Rwanda (+250)' },
  { code: '+256', iso: 'UG', label: 'Ouganda (+256)' },
  { code: '+254', iso: 'KE', label: 'Kenya (+254)' },
  { code: '+27', iso: 'ZA', label: 'Afrique du Sud (+27)' },
  { code: '+212', iso: 'MA', label: 'Maroc (+212)' },
] as const;

export const DEFAULT_PHONE_COUNTRY_CODE = '+243';

/** Normalise un indicatif (+243). */
export function normalizeCountryCode(raw?: string | null): string {
  if (!raw?.trim()) return DEFAULT_PHONE_COUNTRY_CODE;
  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : DEFAULT_PHONE_COUNTRY_CODE;
}

/** Chiffres nationaux uniquement (sans 0 initial ni indicatif). */
export function normalizeNationalNumber(raw?: string | null): string {
  if (!raw) return '';
  let digits = raw.replace(/[^\d]/g, '');
  // Retire un 0 de trunking local
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** Compose un numéro E.164 : +243817125577 */
export function composeE164(countryCode?: string | null, national?: string | null): string | null {
  const nat = normalizeNationalNumber(national);
  if (!nat) return null;
  const cc = normalizeCountryCode(countryCode).replace(/^\+/, '');
  // Évite de doubler l’indicatif si l’utilisateur a collé le numéro complet
  if (nat.startsWith(cc)) return `+${nat}`;
  return `+${cc}${nat}`;
}

/**
 * Décompose un numéro stocké (E.164 ou libre) en indicatif + national.
 */
export function splitPhone(
  full?: string | null,
  fallbackCountry: string = DEFAULT_PHONE_COUNTRY_CODE,
): { countryCode: string; national: string } {
  if (!full?.trim()) {
    return { countryCode: fallbackCountry, national: '' };
  }
  const cleaned = full.trim().replace(/[^\d+]/g, '');
  const withPlus = cleaned.startsWith('+') ? cleaned : `+${cleaned.replace(/\D/g, '')}`;
  const sorted = [...PHONE_COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const entry of sorted) {
    if (withPlus.startsWith(entry.code)) {
      return {
        countryCode: entry.code,
        national: withPlus.slice(entry.code.length).replace(/\D/g, ''),
      };
    }
  }
  return {
    countryCode: fallbackCountry,
    national: normalizeNationalNumber(full),
  };
}

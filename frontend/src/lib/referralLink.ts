/** Construit l'URL d'inscription avec code parrainage pré-rempli (?ref=). */
export function buildReferralRegisterUrl(referralCode: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  const code = referralCode.trim().toUpperCase();
  return `${base}/register?ref=${encodeURIComponent(code)}`;
}

/** Lit le code depuis ?ref= ou ?referral= (insensible à la casse). */
export function parseReferralFromSearchParams(params: URLSearchParams): string {
  const raw = params.get('ref') || params.get('referral') || '';
  return raw.trim().toUpperCase();
}

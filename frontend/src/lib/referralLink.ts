import { appOrigin, canonicalShareUrl } from '@/lib/share';

/** Construit l'URL d'inscription avec code parrainage pré-rempli (?ref=). */
export function buildReferralRegisterUrl(referralCode: string, origin?: string): string {
  const base = origin ?? appOrigin();
  const code = referralCode.trim().toUpperCase();
  return canonicalShareUrl(`${base}/register?ref=${encodeURIComponent(code)}`);
}

/** Lit le code depuis ?ref= ou ?referral= (insensible à la casse). */
export function parseReferralFromSearchParams(params: URLSearchParams): string {
  const raw = params.get('ref') || params.get('referral') || '';
  return raw.trim().toUpperCase();
}

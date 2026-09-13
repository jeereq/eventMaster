import {
  PRIVACY_VERSION,
  REFUND_VERSION,
  TERMS_VERSION,
} from '@/config/legalConfig';

export interface CollectionTermsAcceptance {
  acceptedAt: string;
  termsVersion: string;
  privacyVersion: string;
  refundVersion: string;
}

export function hasValidCollectionTermsAcceptance(
  stored?: CollectionTermsAcceptance | null,
): boolean {
  if (!stored) return false;
  return (
    stored.termsVersion === TERMS_VERSION &&
    stored.privacyVersion === PRIVACY_VERSION &&
    stored.refundVersion === REFUND_VERSION
  );
}

export const TERMS_VERSION = '1.7';
export const PRIVACY_VERSION = '1.7';
export const REFUND_VERSION = '1.2';

/** Commission plateforme sur le montant global collecté (billets + dons), en plus de l’abonnement. */
export const COLLECTION_COMMISSION_MIN_PERCENT = 3;
export const COLLECTION_COMMISSION_MAX_PERCENT = 5;

export function collectionCommissionRangeLabel() {
  return `${COLLECTION_COMMISSION_MIN_PERCENT} % à ${COLLECTION_COMMISSION_MAX_PERCENT} %`;
}

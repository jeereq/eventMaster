export const TERMS_VERSION = '2.0';
export const PRIVACY_VERSION = '1.9';
export const REFUND_VERSION = '1.3';
export const LEGAL_LAST_UPDATED = '18 septembre 2026';

/** Commission plateforme sur le montant global collecté (billets + dons), en plus de l’abonnement. */
export const COLLECTION_COMMISSION_MIN_PERCENT = 3;
export const COLLECTION_COMMISSION_MAX_PERCENT = 5;

/** Taux de retenue contractuelle par défaut par type de collecte */
export const TICKETING_RETENTION_PERCENT = 5;
export const DONATIONS_RETENTION_PERCENT = 4;

export function collectionCommissionRangeLabel() {
  return `${COLLECTION_COMMISSION_MIN_PERCENT} % à ${COLLECTION_COMMISSION_MAX_PERCENT} %`;
}

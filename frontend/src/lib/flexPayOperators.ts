/** Opérateurs Mobile Money FlexPay (doc API Paiement v1.5 — champ channel). */
export const FLEXPAY_MOBILE_OPERATORS = [
  'M-Pesa',
  'Orange Money',
  'Airtel Money',
  'Afrimoney',
] as const;

export const FLEXPAY_MOBILE_OPERATORS_LABEL = FLEXPAY_MOBILE_OPERATORS.join(' · ');

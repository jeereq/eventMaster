/** Opérateurs Mobile Money FlexPay (doc API Paiement v1.5 — champ channel). */
export const FLEXPAY_MOBILE_OPERATORS = [
  'M-Pesa',
  'Orange Money',
  'Airtel Money',
  'Afrimoney',
] as const;

export const FLEXPAY_MOBILE_OPERATORS_LABEL = FLEXPAY_MOBILE_OPERATORS.join(' · ');

export type FlexPayMobileOperatorId = 'orange' | 'mpesa' | 'airtel' | 'afrimoney';

export const FLEXPAY_MOBILE_ACCOUNTS: Array<{
  id: FlexPayMobileOperatorId;
  label: string;
  channel: string;
  prefixes: string[];
}> = [
  { id: 'orange', label: 'Orange Money', channel: 'orange', prefixes: ['084', '085', '089', '080'] },
  { id: 'mpesa', label: 'M-Pesa', channel: 'mpesa', prefixes: ['081', '082', '083'] },
  { id: 'airtel', label: 'Airtel Money', channel: 'airtel', prefixes: ['097', '098', '099'] },
  { id: 'afrimoney', label: 'Afrimoney', channel: 'afrimoney', prefixes: ['090', '091'] },
];

export function nationalMobilePrefix(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  let national = digits;
  if (national.startsWith('243') && national.length >= 12) {
    national = `0${national.slice(3)}`;
  } else if (national.startsWith('0') === false && national.length >= 9) {
    national = `0${national}`;
  }
  return national.length >= 3 ? national.slice(0, 3) : null;
}

/** Compte Mobile Money probable selon le préfixe RDC (disponibilité du numéro). */
export function suggestMobileOperator(phone: string): FlexPayMobileOperatorId | null {
  const prefix = nationalMobilePrefix(phone);
  if (!prefix) return null;
  const match = FLEXPAY_MOBILE_ACCOUNTS.find((account) => account.prefixes.includes(prefix));
  return match?.id ?? null;
}

export function flexPayChannelForOperator(operator: FlexPayMobileOperatorId): string {
  return FLEXPAY_MOBILE_ACCOUNTS.find((account) => account.id === operator)?.channel || operator;
}

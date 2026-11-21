/**
 * Nombre maximal de SMS envoyés à un même invité (invitation, relances, placement confondus).
 * Au-delà, l'invité reste joignable par WhatsApp et e-mail, qui ne coûtent presque rien.
 */
export const MAX_SMS_PER_GUEST = 3;

export const GUEST_SMS_CAP_ERROR = `Limite de ${MAX_SMS_PER_GUEST} SMS atteinte pour cet invité.`;

/** Un envoi « réel » consomme un crédit ; un échec, une simulation ou un doublon le rend. */
export function smsResultConsumesCredit(result: { success?: boolean; simulated?: boolean; provider?: string }): boolean {
  return Boolean(result.success) && !result.simulated && result.provider !== 'dedup';
}


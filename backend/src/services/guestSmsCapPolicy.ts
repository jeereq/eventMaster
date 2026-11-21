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


export const GUEST_SMS_FREE_PLAN_ERROR =
  "Les SMS ne sont pas inclus dans l'essai gratuit : l'invitation part par WhatsApp et e-mail.";

/** L'essai gratuit n'envoie pas de SMS (coût réel par message) ; WhatsApp et e-mail restent actifs. */
export function planAllowsGuestSms(plan?: string | null): boolean {
  return Boolean(plan) && String(plan).toUpperCase() !== 'FREE';
}

/** Clé de compteur : chiffres seulement (« +243 81… », « 0024381… » et « 24381… » comptent ensemble). */
export function normalizeSmsPhoneKey(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.replace(/^00/, '');
}

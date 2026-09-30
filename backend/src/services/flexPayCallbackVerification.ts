import type { FlexPayCheckResult } from './flexPayCardService.ts';

/**
 * Issue d'un callback FlexPay. Le callback est public : on ne croit jamais le statut qu'il
 * transporte. Seule compte la vérification serveur (`checkFlexPayCardOrder`) faite sur le
 * numéro FlexPay enregistré sur notre propre commande à l'initialisation du paiement.
 *
 * - `paid`       : FlexPay confirme le paiement.
 * - `failed`     : FlexPay confirme l'échec.
 * - `unverified` : impossible de conclure (pas de numéro enregistré, vérification
 *                  indisponible, transaction inconnue ou encore en attente). On ne change rien.
 */
export type FlexPayCallbackOutcome = 'paid' | 'failed' | 'unverified';

export function decideFlexPayCallbackOutcome(
  checked: Pick<FlexPayCheckResult, 'found' | 'status'> | null,
): FlexPayCallbackOutcome {
  if (!checked || !checked.found) return 'unverified';
  if (checked.status === 'success') return 'paid';
  if (checked.status === 'failed') return 'failed';
  return 'unverified';
}

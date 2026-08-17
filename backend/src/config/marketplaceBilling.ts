/** Commission marketplace (vendeur → plateforme), indépendante de l’abonnement SaaS. */
export const MARKETPLACE_COMMISSION_RATE = 0.08;

/** Acompte demandé à l’organisateur, versé hors plateforme puis marqué reçu. */
export const MARKETPLACE_DEPOSIT_RATE = 0.3;

export function computeMarketplaceAmounts(amountFc: number) {
  const amount = Math.max(0, Math.round(amountFc));
  const depositFc = Math.round(amount * MARKETPLACE_DEPOSIT_RATE);
  const commissionFc = Math.round(amount * MARKETPLACE_COMMISSION_RATE);
  return {
    amountFc: amount,
    depositFc,
    commissionFc,
    commissionRate: MARKETPLACE_COMMISSION_RATE,
  };
}

/**
 * Une commande de billets en attente de paiement « bloque » ses places (quota d'invités de
 * l'organisation et stock de billets) pendant ce délai. Sans cela, deux acheteurs simultanés
 * passaient tous deux la vérification et le second était refusé… après avoir payé.
 */
export const PENDING_TICKET_HOLD_MS = 30 * 60 * 1000;

export function pendingHoldCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - PENDING_TICKET_HOLD_MS);
}

/** Vrai si la commande tient dans le quota en comptant les places déjà bloquées par d'autres commandes. */
export function ticketQuotaAllows(input: {
  periodGuests: number;
  heldByPendingOrders: number;
  quantity: number;
  maxGuests: number;
}): boolean {
  return input.periodGuests + Math.max(0, input.heldByPendingOrders) + input.quantity <= input.maxGuests;
}

/** Billets restants une fois déduites les commandes en attente (null = stock illimité). */
export function ticketsRemainingWithHolds(
  event: { ticketsTotal: number | null; ticketsSold: number },
  heldForEvent: number,
): number | null {
  if (event.ticketsTotal == null) return null;
  return Math.max(0, event.ticketsTotal - event.ticketsSold - Math.max(0, heldForEvent));
}

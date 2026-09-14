/**
 * Utilitaires purs pour le calcul des commandes de billets et noms d'acheteurs.
 */

export function splitBuyerName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: 'Invité', lastName: 'Billet' };
  if (parts.length === 1) return { firstName: parts[0], lastName: 'Billet' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function companionTicketEmail(baseEmail: string, index: number, orderId: string): string {
  const at = baseEmail.lastIndexOf('@');
  if (at < 1) return `billet-${orderId.slice(0, 8)}-${index}@tickets.eventmaster.local`;
  const local = baseEmail.slice(0, at);
  const domain = baseEmail.slice(at + 1);
  return `${local}+billet${index}-${orderId.slice(0, 8)}@${domain}`;
}

export function ticketsRemaining(event: { ticketsTotal: number | null; ticketsSold: number }): number | null {
  if (event.ticketsTotal == null) return null;
  return Math.max(0, event.ticketsTotal - event.ticketsSold);
}

/** Plafond de sécurité par commande si l’organisateur n’a pas fixé de limite. */
export const FALLBACK_TICKETS_PER_CHECKOUT = 50;

export function parseTicketsPerBuyerLimit(raw: unknown): number | null {
  if (raw === '' || raw == null || raw === undefined) return null;
  const parsed = Math.round(Number(raw));
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}

export function checkoutQuantityCap(params: {
  ticketsPerBuyerLimit: number | null;
  alreadyBought: number;
  ticketsRemaining: number | null;
}): number {
  const remainingPersonal =
    params.ticketsPerBuyerLimit == null
      ? FALLBACK_TICKETS_PER_CHECKOUT
      : Math.max(0, params.ticketsPerBuyerLimit - params.alreadyBought);
  const remainingEvent =
    params.ticketsRemaining == null ? remainingPersonal : params.ticketsRemaining;
  return Math.max(0, Math.min(remainingPersonal, remainingEvent, FALLBACK_TICKETS_PER_CHECKOUT));
}

export function buyerTicketsLimitMessage(
  limit: number,
  alreadyBought: number,
): string {
  const remaining = Math.max(0, limit - alreadyBought);
  if (remaining === 0) {
    return `Vous avez déjà atteint la limite de ${limit} billet${limit > 1 ? 's' : ''} par personne fixée par l’organisateur.`;
  }
  return `L’organisateur autorise au plus ${limit} billet${limit > 1 ? 's' : ''} par personne. Il vous reste ${remaining} place${remaining > 1 ? 's' : ''}.`;
}

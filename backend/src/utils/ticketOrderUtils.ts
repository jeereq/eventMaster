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

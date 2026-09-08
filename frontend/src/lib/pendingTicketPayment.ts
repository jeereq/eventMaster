const STORAGE_KEY = 'em-pending-ticket';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type PendingTicketPayment = {
  orderId: string;
  slug: string;
  method: 'card' | 'mobile';
  eventTitle?: string;
  createdAt: number;
};

function isPendingTicket(value: unknown): value is PendingTicketPayment {
  if (!value || typeof value !== 'object') return false;
  const row = value as PendingTicketPayment;
  return Boolean(row.orderId && row.slug && (row.method === 'card' || row.method === 'mobile'));
}

export function readPendingTicketPayment(slug?: string): PendingTicketPayment | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPendingTicket(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.createdAt > MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (slug && parsed.slug !== slug) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingTicketPayment(entry: Omit<PendingTicketPayment, 'createdAt'> & { createdAt?: number }) {
  if (typeof window === 'undefined') return;
  const payload: PendingTicketPayment = {
    ...entry,
    createdAt: entry.createdAt || Date.now(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearPendingTicketPayment(orderId?: string) {
  if (typeof window === 'undefined') return;
  if (orderId) {
    const current = readPendingTicketPayment();
    if (current && current.orderId !== orderId) return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
}

export const CLOSE_PAYMENT_CONFIRM =
  'Un paiement est en cours. Fermer ne l’annule pas : la demande continue chez FlexPay / sur votre téléphone. Vous pourrez le reprendre. Fermer quand même ?';

export const CANCEL_PAYMENT_CONFIRM =
  'Annuler cette commande ? Si vous n’avez pas encore validé sur le téléphone, rien ne sera débité. Si l’opérateur a déjà confirmé, contactez l’organisateur.';

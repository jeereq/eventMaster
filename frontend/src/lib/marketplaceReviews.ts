import { api } from '@/lib/api';

export interface MarketplaceReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  vendorReply: string | null;
  vendorRepliedAt: string | null;
  createdAt: string;
  subject: { kind: 'venue' | 'service'; slug: string; title: string; category: string | null } | null;
}

export interface RatingSummary {
  count: number;
  average: number | null;
}

/** Avis attaché à une réservation (liste des réservations). */
export interface BookingReviewSnippet {
  id: string;
  rating: number;
  comment: string | null;
  vendorReply: string | null;
  createdAt: string;
}

export function ratingLabel(summary: RatingSummary | null | undefined): string {
  if (!summary || !summary.count || summary.average == null) return 'Pas encore d’avis';
  const avg = summary.average.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${avg}/5 · ${summary.count} avis`;
}

/** Une vue par fiche et par session de navigation (les visites de l'organisation ne comptent pas). */
export function trackListingView(kind: 'venue' | 'service', slug: string | null | undefined) {
  if (!slug || typeof window === 'undefined') return;
  const key = `em-view:${kind}:${slug}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Stockage indisponible (navigation privée) : on compte quand même une fois par chargement.
  }
  void api.post('/public/views', { kind, slug }).catch(() => undefined);
}

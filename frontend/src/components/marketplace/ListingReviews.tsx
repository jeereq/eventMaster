'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquareQuote, Star, Store } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { ratingLabel, type MarketplaceReview, type RatingSummary } from '@/lib/marketplaceReviews';
import { ReviewStars } from '@/components/marketplace/ReviewStars';

function formatDay(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

/**
 * Avis vérifiés (laissés après une réservation terminée) d'une salle, d'une prestation
 * ou de tout un prestataire, avec lien vers la vitrine du prestataire.
 */
export default function ListingReviews({
  kind,
  slug,
  vendorSlug,
  vendorName,
  showSubject = false,
  prominent = false,
  id,
}: {
  kind: 'venue' | 'service' | 'vendor';
  slug: string;
  vendorSlug?: string | null;
  vendorName?: string | null;
  showSubject?: boolean;
  /** Section de page (vitrine) : titre plus grand et état vide illustré. */
  prominent?: boolean;
  id?: string;
}) {
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [reviews, setReviews] = useState<MarketplaceReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/public/reviews?kind=${kind}&slug=${encodeURIComponent(slug)}`)
      .then((data: { summary?: RatingSummary; reviews?: MarketplaceReview[] }) => {
        if (cancelled) return;
        setSummary(data.summary ?? null);
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, slug]);

  const vitrineLink = vendorSlug && kind !== 'vendor' ? (
    <Link
      href={`/marketplace/vitrine/${encodeURIComponent(vendorSlug)}`}
      className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
    >
      <Store className="h-4 w-4" aria-hidden />
      Voir toutes les offres de {vendorName || 'ce prestataire'}
    </Link>
  ) : null;

  if (!loaded) return vitrineLink;

  return (
    <section id={id} aria-labelledby={`reviews-${kind}-${slug}`} className={cn('space-y-3', id && 'scroll-mt-32')}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id={`reviews-${kind}-${slug}`}
            className={cn('font-semibold text-foreground', prominent ? 'font-display text-lg sm:text-xl' : 'text-sm')}
          >
            Avis clients
          </h2>
          {summary?.average != null ? <ReviewStars rating={summary.average} /> : null}
          {prominent && !summary?.count ? null : <span className="text-xs text-muted">{ratingLabel(summary)}</span>}
        </div>
        {vitrineLink}
      </div>
      {reviews.length === 0 ? (
        prominent ? (
          <div className="space-y-2 rounded-2xl border border-dashed border-border bg-surface/30 px-4 py-10 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Star className="h-5 w-5" aria-hidden />
            </div>
            <p className="text-sm font-bold text-foreground">Pas encore d’avis</p>
            <p className="mx-auto max-w-sm text-xs text-muted">
              Les avis sont laissés par des clients après une réservation terminée sur EventMaster : ils sont tous vérifiés.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Les avis sont laissés par des clients après une réservation terminée sur EventMaster.
          </p>
        )
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <ReviewStars rating={review.rating} />
                <span className="text-sm font-semibold text-foreground">{review.authorName}</span>
                <span className="text-xs text-muted">{formatDay(review.createdAt)}</span>
              </div>
              {showSubject && review.subject ? (
                <p className="mt-1 text-xs text-muted">{review.subject.title}</p>
              ) : null}
              {review.comment ? (
                <p className="mt-2 whitespace-pre-line text-sm text-foreground/90">{review.comment}</p>
              ) : null}
              {review.vendorReply ? (
                <div className="mt-3 flex gap-2 rounded-xl bg-surface-muted p-3">
                  <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{vendorName ? `Réponse de ${vendorName}` : 'Réponse du prestataire'}</p>
                    <p className="mt-0.5 whitespace-pre-line text-xs text-foreground/80">{review.vendorReply}</p>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

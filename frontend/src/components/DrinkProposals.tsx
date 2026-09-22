'use client';

import React from 'react';
import Link from 'next/link';
import { Wine } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { BEVERAGE_SALE_UNIT_LABELS, formatBeverageSale, type PublicBeverageOffer } from '@/lib/beverageBrands';

const GRID_BUTTON = 'inline-flex items-center justify-center min-h-[44px] shrink-0 px-3 rounded-[var(--radius-button)] border border-border text-sm font-semibold text-foreground hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export default function DrinkProposals({
  offers,
  layout,
  gridClass,
}: {
  offers: PublicBeverageOffer[];
  layout: 'grid' | 'list';
  gridClass: string;
}) {
  return (
    <ul className={layout === 'list' ? 'space-y-2' : gridClass}>
      {offers.map((offer) => {
        const href = offer.vendorSlug
          ? `/marketplace/boissons/${offer.vendorSlug}?offre=${encodeURIComponent(offer.id)}`
          : null;
        return (
          <li key={offer.id}>
            <article className={cn(
              'h-full rounded-[var(--radius-card)] border border-border bg-surface',
              layout === 'list' ? 'flex flex-wrap items-center gap-3 p-3' : 'flex flex-col',
            )}>
              <div className={cn(
                'bg-surface-muted shrink-0 overflow-hidden',
                layout === 'list' ? 'w-20 h-16 sm:w-28 sm:h-20 rounded-md' : 'aspect-[4/3] rounded-t-[var(--radius-card)]',
              )}>
                {offer.imageUrl ? (
                  <img
                    src={offer.imageUrl}
                    alt=""
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted">
                    <Wine className="w-6 h-6" aria-hidden="true" />
                  </div>
                )}
              </div>
              <div className={cn('min-w-0', layout === 'list' ? 'flex-1 basis-40' : 'p-3 space-y-1 flex-1')}>
                <p className="text-sm font-semibold text-muted">{offer.brandName} · {offer.kindLabel}</p>
                <h2 className="text-base font-semibold text-foreground truncate">{offer.vendorName}</h2>
                <p className="text-sm text-muted truncate">
                  {formatBeverageSale(offer)} · {BEVERAGE_SALE_UNIT_LABELS[offer.unitKind]}
                </p>
              </div>
              <div className={cn(
                'flex flex-wrap items-center gap-2',
                layout === 'list' ? 'w-full sm:w-auto' : 'mt-auto w-full px-3 pb-3',
              )}>
                <p className="min-w-0 text-base font-semibold tabular-nums text-foreground">
                  <span className="sr-only">Prix actuel </span>
                  {formatFc(offer.payableFc)}
                  {offer.promoPriceFc != null ? (
                    <span className="ml-2 text-sm text-muted line-through">
                      <span className="sr-only">, tarif habituel </span>
                      {formatFc(offer.priceFc)}
                    </span>
                  ) : null}
                </p>
                {href ? (
                  <Link
                    href={href}
                    aria-label={`Voir les marques de ${offer.vendorName}, à partir de ${offer.brandName}`}
                    className={GRID_BUTTON}
                  >
                    Détail
                  </Link>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}

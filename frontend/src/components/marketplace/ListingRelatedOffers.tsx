'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, KeyRound, Sparkles } from '@/components/icons';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  isServiceRentalCategory,
  listingSrcSet,
  sizedMediaUrl,
  type PublicService,
  type PublicVenue,
} from '@/lib/marketplace';

export type RelatedOfferKind = 'service' | 'rental' | 'venue';

export function splitRelatedServices(services?: PublicService[] | null) {
  const list = services || [];
  return {
    prestations: list.filter((item) => !isServiceRentalCategory(item.category)),
    rentals: list.filter((item) => isServiceRentalCategory(item.category)),
  };
}

export function relatedServiceHref(service: PublicService, embedded?: boolean) {
  const rental = isServiceRentalCategory(service.category);
  if (embedded) {
    return rental
      ? `/dashboard/catalogue/locations/${service.slug}`
      : `/dashboard/catalogue/prestataires/${service.slug}`;
  }
  return rental
    ? `/marketplace/locations/${service.slug}`
    : `/marketplace/prestataires/${service.slug}`;
}

export function relatedVenueHref(venue: PublicVenue, embedded?: boolean) {
  return embedded
    ? `/dashboard/catalogue/salles/${venue.slug}`
    : `/marketplace/salles/${venue.slug}`;
}

function OfferIcon({ kind }: { kind: RelatedOfferKind }) {
  if (kind === 'venue') return <Building2 className="w-5 h-5 text-primary" aria-hidden />;
  if (kind === 'rental') return <KeyRound className="w-5 h-5 text-primary" aria-hidden />;
  return <Sparkles className="w-5 h-5 text-festive-accent" aria-hidden />;
}

const PLACEHOLDER_LABEL: Record<RelatedOfferKind, string> = {
  venue: 'Photos de la salle bientôt en ligne',
  service: 'Photos bientôt en ligne',
  rental: 'Photos du matériel bientôt en ligne',
};

/** Visuel de remplacement quand l’offre n’a pas encore de photo : jamais un grand bloc vide. */
function OfferCoverPlaceholder({ kind }: { kind: RelatedOfferKind }) {
  return (
    <div className="relative flex h-full min-h-[8rem] w-full flex-col items-center justify-center gap-2 overflow-hidden bg-gradient-to-br from-primary/15 via-surface-muted to-surface sm:absolute sm:inset-0">
      <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-surface/80 shadow-[var(--shadow-soft)]">
        <OfferIcon kind={kind} />
      </span>
      <span className="relative text-xs font-medium text-muted">{PLACEHOLDER_LABEL[kind]}</span>
    </div>
  );
}

function priceLine(priceFromFc?: number | null, priceUnitLabel?: string | null) {
  const amount = priceFromFc != null ? formatFc(priceFromFc) : 'Sur devis';
  return { amount, unit: priceUnitLabel || '' };
}

export function RelatedOfferCard({
  href,
  cover,
  title,
  meta,
  priceFromFc,
  priceUnitLabel,
  kind,
  cta,
  wide = false,
}: {
  href: string;
  cover?: string | null;
  title: string;
  meta?: string | null;
  priceFromFc?: number | null;
  priceUnitLabel?: string | null;
  kind: RelatedOfferKind;
  cta: string;
  /** Offre seule dans sa section : photo à gauche, texte à droite dès la tablette. */
  wide?: boolean;
}) {
  const price = priceLine(priceFromFc, priceUnitLabel);
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)] transition-colors hover:border-primary/40',
        wide && 'sm:flex-row',
      )}
    >
      <div className={cn('relative aspect-[16/10] overflow-hidden bg-surface-muted', wide && 'sm:aspect-auto sm:min-h-[13rem] sm:w-[46%] sm:shrink-0')}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedMediaUrl(cover, wide ? 720 : 360)}
            srcSet={listingSrcSet(cover, [360, 720])}
            sizes={wide ? '(min-width: 640px) 46vw, 100vw' : '(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw'}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:absolute sm:inset-0"
          />
        ) : (
          <OfferCoverPlaceholder kind={kind} />
        )}
      </div>
      <div className={cn('flex flex-1 flex-col gap-3 p-4', wide && 'sm:p-6')}>
        <div className="min-w-0 space-y-1">
          <h3 className={cn('font-semibold text-foreground line-clamp-2', wide ? 'text-base sm:text-lg' : 'text-sm')}>{title}</h3>
          {meta ? <p className="text-xs text-muted truncate">{meta}</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="min-w-0 text-xs font-semibold tabular-nums text-foreground">
            {price.amount}
            {price.unit ? <span className="font-normal text-muted"> {price.unit}</span> : null}
          </p>
          <Link
            href={href}
            aria-label={`${cta} : ${title}`}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--radius-button)] bg-primary-solid px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 after:absolute after:inset-0 after:content-['']"
          >
            <span>{cta}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function RelatedOfferRow({
  href,
  cover,
  title,
  meta,
  priceFromFc,
  kind,
}: {
  href: string;
  cover?: string | null;
  title: string;
  meta?: string | null;
  priceFromFc?: number | null;
  kind: RelatedOfferKind;
}) {
  const price = priceLine(priceFromFc);
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-2.5 shadow-[var(--shadow-soft)] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[var(--radius-button)] bg-surface-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedMediaUrl(cover, 160)}
            srcSet={listingSrcSet(cover, [160, 280])}
            sizes="56px"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <OfferIcon kind={kind} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="truncate text-xs text-muted">
          {[meta, price.amount].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}

export function RelatedOffersSection({
  title,
  subtitle,
  onViewAll,
  children,
  className,
  id,
  count,
  prominent = false,
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Nombre affiché en pastille à côté du titre. */
  count?: number;
  /** Titre de section de page (vitrine) plutôt que d’encart. */
  prominent?: boolean;
}) {
  return (
    <section id={id} className={cn('space-y-3', id && 'scroll-mt-32', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className={cn('flex items-center gap-2 font-semibold text-foreground', prominent ? 'font-display text-lg sm:text-xl' : 'text-sm')}>
            {title}
            {count != null ? (
              <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 font-sans text-xs font-semibold tabular-nums text-primary">
                {count}
              </span>
            ) : null}
          </h2>
          {subtitle ? <p className="text-xs text-muted">{subtitle}</p> : null}
        </div>
        {onViewAll ? (
          <button
            type="button"
            onClick={onViewAll}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--radius-button)] px-2.5 text-xs font-semibold text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Tout voir
            <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

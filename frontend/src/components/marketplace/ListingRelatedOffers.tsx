'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, KeyRound, Sparkles } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  isServiceRentalCategory,
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
}: {
  href: string;
  cover?: string | null;
  title: string;
  meta?: string | null;
  priceFromFc?: number | null;
  priceUnitLabel?: string | null;
  kind: RelatedOfferKind;
  cta: string;
}) {
  const price = priceLine(priceFromFc, priceUnitLabel);
  return (
    <article className="flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)]">
      <div className="relative aspect-[16/10] overflow-hidden bg-stage">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sizedMediaUrl(cover, 360)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <OfferIcon kind={kind} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2">{title}</h3>
          {meta ? <p className="text-xs text-muted truncate">{meta}</p> : null}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
          <p className="min-w-0 text-xs font-semibold tabular-nums text-foreground">
            {price.amount}
            {price.unit ? <span className="font-normal text-muted"> {price.unit}</span> : null}
          </p>
          <Link
            href={href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--radius-button)] bg-primary-solid px-3 text-xs font-semibold text-primary-foreground hover:bg-primary-solid-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
          <img src={sizedMediaUrl(cover, 160)} alt="" className="h-full w-full object-cover" />
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
}: {
  title: string;
  subtitle?: string;
  onViewAll?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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

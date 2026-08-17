'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Sparkles, Users } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { listStackClass } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDistanceKm, formatQuotaLabel, type CatalogueItem, type CatalogueViewMode } from '@/lib/marketplace';

function Cover({ item, className }: { item: CatalogueItem; className?: string }) {
  if (item.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.coverUrl} alt="" className={cn('object-cover transition duration-500 group-hover:scale-105', className)} />
    );
  }
  const Icon = item.kind === 'venue' ? Building2 : Sparkles;
  return (
    <div className={cn('flex items-center justify-center bg-surface-muted text-muted', className)}>
      <Icon className="w-7 h-7" />
    </div>
  );
}

function Price({ item }: { item: CatalogueItem }) {
  return (
    <span className="text-sm font-semibold text-foreground">
      {item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis'}
      <span className="block text-[11px] font-normal text-muted">{item.priceUnitLabel}</span>
    </span>
  );
}

function KindBadge({ item }: { item: CatalogueItem }) {
  const Icon = item.kind === 'venue' ? Building2 : Sparkles;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full bg-background/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-border',
      item.kind === 'service' ? 'text-[color:var(--festive-accent)]' : 'text-primary',
    )}>
      <Icon className="w-3 h-3" />
      {item.kind === 'venue' ? 'Salle' : 'Prestataire'}
    </span>
  );
}

function GridCard({ item }: { item: CatalogueItem }) {
  return (
    <Link
      href={item.href}
      className="group bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/35 hover:shadow-[var(--shadow-soft)] transition duration-200"
    >
      <div className="relative aspect-[16/10] bg-surface-muted overflow-hidden">
        <Cover item={item} className="w-full h-full" />
        <div className="absolute top-2.5 left-2.5">
          <KindBadge item={item} />
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <h2 className="font-display font-semibold text-sm text-foreground group-hover:text-primary transition leading-snug line-clamp-2">
          {item.title}
        </h2>
        <p className="text-xs text-muted truncate">{item.orgName}{item.categoryLabel ? ` · ${item.categoryLabel}` : ''}</p>
        {item.location ? (
          <p className="text-xs text-muted inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
          {formatDistanceKm(item.distanceKm) ? <span className="font-semibold text-primary">{formatDistanceKm(item.distanceKm)}</span> : null}
          {item.capacity ? (
            <span className="inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {item.capacity} places
            </span>
          ) : null}
          {formatQuotaLabel(item.quotaMin, item.quotaMax) ? <span>{formatQuotaLabel(item.quotaMin, item.quotaMax)}</span> : null}
          {item.kind === 'service' && item.coverageRadiusKm ? <span>Rayon {item.coverageRadiusKm} km</span> : null}
        </div>
        <div className="pt-2 border-t border-border">
          <Price item={item} />
        </div>
      </div>
    </Link>
  );
}

function ListRow({ item }: { item: CatalogueItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 sm:gap-4 bg-surface border border-border rounded-2xl p-3 hover:border-primary/35 hover:shadow-[var(--shadow-soft)] transition"
    >
      <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl overflow-hidden bg-surface-muted shrink-0">
        <Cover item={item} className="w-full h-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <KindBadge item={item} />
        <h2 className="font-semibold text-sm text-foreground group-hover:text-primary transition truncate">
          {item.title}
        </h2>
        <p className="text-xs text-muted truncate">
          {[item.orgName, item.categoryLabel, item.location].filter(Boolean).join(' · ')}
        </p>
        {formatDistanceKm(item.distanceKm) ? (
          <p className="text-[11px] font-semibold text-primary">{formatDistanceKm(item.distanceKm)}</p>
        ) : null}
      </div>
      <div className="shrink-0 text-right">
        <Price item={item} />
      </div>
    </Link>
  );
}

export default function CatalogueResults({
  items,
  mode,
  emptyTitle,
  emptyDescription,
}: {
  items: CatalogueItem[];
  mode: Exclude<CatalogueViewMode, 'map' | 'focus'>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-dashed border-border rounded-2xl bg-surface">
        <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
        <h2 className="font-semibold text-foreground">{emptyTitle}</h2>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">{emptyDescription}</p>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className={listStackClass}>
        {items.map((item) => (
          <ListRow key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => (
        <GridCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function CatalogueGridCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="pt-2 border-t border-border">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

function CatalogueListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-surface border border-border rounded-2xl p-3" aria-hidden>
      <Skeleton className="w-20 h-16 sm:w-28 sm:h-20 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="shrink-0 space-y-1.5">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-14 ml-auto" />
      </div>
    </div>
  );
}

export function CatalogueResultsSkeleton({
  mode = 'grid',
  count = 9,
}: {
  mode?: CatalogueViewMode;
  count?: number;
}) {
  if (mode === 'map' || mode === 'focus') {
    return (
      <div
        className="space-y-2"
        role="status"
        aria-live="polite"
        aria-label="Chargement de la carte"
      >
        <Skeleton
          className={cn(
            'w-full rounded-[var(--radius-card)] border border-border',
            mode === 'focus' ? 'min-h-[420px] h-[calc(100dvh-10.5rem)]' : 'h-[480px]',
          )}
        />
        <span className="sr-only">Chargement du catalogue…</span>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className={listStackClass} role="status" aria-live="polite" aria-label="Chargement du catalogue">
        {Array.from({ length: count }).map((_, i) => (
          <CatalogueListRowSkeleton key={i} />
        ))}
        <span className="sr-only">Chargement du catalogue…</span>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
      role="status"
      aria-live="polite"
      aria-label="Chargement du catalogue"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CatalogueGridCardSkeleton key={i} />
      ))}
      <span className="sr-only">Chargement du catalogue…</span>
    </div>
  );
}

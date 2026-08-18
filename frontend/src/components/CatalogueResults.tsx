'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Calendar, KeyRound, MapPin, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { listStackClass } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import FavoriteHeart from '@/components/FavoriteHeart';
import { catalogueItemDisplayKind, catalogueKindLabel, cataloguePriceCaption, formatDistanceKm, formatQuotaLabel, serviceMobilityLabel, type CatalogueItem, type CatalogueViewMode } from '@/lib/marketplace';

export const CATALOGUE_GRID_COLS = [2, 3, 4, 5] as const;
export type CatalogueGridCols = (typeof CATALOGUE_GRID_COLS)[number];

const GRID_CLASS: Record<CatalogueGridCols, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5',
  3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4',
  5: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3',
};

function Cover({ item, className }: { item: CatalogueItem; className?: string }) {
  if (item.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.coverUrl} alt="" className={cn('object-cover transition duration-500 group-hover:scale-110', className)} />
    );
  }
  const displayKind = catalogueItemDisplayKind(item);
  const Icon = displayKind === 'venue' ? Building2 : displayKind === 'event' ? Calendar : displayKind === 'rental' ? KeyRound : Sparkles;
  return (
    <div className={cn('flex items-center justify-center bg-surface-muted text-muted', className)}>
      <Icon className="w-8 h-8" />
    </div>
  );
}

function KindBadge({ item }: { item: CatalogueItem }) {
  const displayKind = catalogueItemDisplayKind(item);
  const Icon = displayKind === 'venue' ? Building2 : displayKind === 'event' ? Calendar : displayKind === 'rental' ? KeyRound : Sparkles;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm',
      displayKind === 'rental' ? 'text-teal-700' : displayKind === 'service' ? 'text-[color:var(--festive-accent)]' : displayKind === 'event' ? 'text-emerald-700' : 'text-primary',
    )}>
      <Icon className="w-3 h-3" />
      {catalogueKindLabel(displayKind)}
    </span>
  );
}

function GridCard({
  item,
  compact,
  favorited,
  onToggleFavorite,
}: {
  item: CatalogueItem;
  compact?: boolean;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
}) {
  const isService = item.kind === 'service';
  return (
    <Link
      href={item.href}
      className="group relative flex flex-col bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-soft)] hover:border-primary/40 hover:shadow-[0_22px_44px_-24px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 transition duration-200"
    >
      <div className={cn('relative overflow-hidden bg-surface-muted', compact ? 'aspect-[5/4]' : 'aspect-[4/3]')}>
        <Cover item={item} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
        <div className="absolute top-2.5 left-2.5">
          <KindBadge item={item} />
        </div>
        {onToggleFavorite && item.kind !== 'event' ? (
          <div className="absolute top-2.5 right-2.5 z-10">
            <FavoriteHeart active={Boolean(favorited)} onToggle={() => onToggleFavorite(item)} />
          </div>
        ) : formatDistanceKm(item.distanceKm) ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-black/55 text-white text-[10px] font-semibold px-2 py-0.5">
            {formatDistanceKm(item.distanceKm)}
          </span>
        ) : null}
        {onToggleFavorite && formatDistanceKm(item.distanceKm) ? (
          <span className="absolute bottom-[3.4rem] right-2.5 rounded-full bg-black/55 text-white text-[10px] font-semibold px-2 py-0.5">
            {formatDistanceKm(item.distanceKm)}
          </span>
        ) : null}
        <div className="absolute left-3 right-3 bottom-2.5 text-white">
          <p className="font-display font-semibold text-sm leading-snug line-clamp-2 drop-shadow">
            {item.title}
          </p>
          <p className="text-[11px] text-white/85 mt-0.5">
            {cataloguePriceCaption(item)}
            <span className="text-white/70"> · {item.priceUnitLabel}</span>
          </p>
        </div>
      </div>
      <div className="p-3 space-y-2 flex-1 flex flex-col">
        <p className="text-xs text-muted truncate">{item.orgName}{item.categoryLabel ? ` · ${item.categoryLabel}` : ''}</p>
        {item.location ? (
          <p className="text-xs text-muted inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted">
          {item.capacity ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted border border-border px-2 py-0.5">
              <Users className="w-3 h-3" /> {item.capacity} places
            </span>
          ) : null}
          {formatQuotaLabel(item.quotaMin, item.quotaMax) ? (
            <span className="rounded-full bg-surface-muted border border-border px-2 py-0.5">
              {formatQuotaLabel(item.quotaMin, item.quotaMax)}
            </span>
          ) : null}
          {isService ? (
            <span className="rounded-full bg-surface-muted border border-border px-2 py-0.5">
              {serviceMobilityLabel(Boolean(item.travels ?? (item.coverageRadiusKm && item.coverageRadiusKm > 0)), item.coverageRadiusKm)}
            </span>
          ) : null}
        </div>
        <span className="mt-auto pt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
          Voir la fiche <ArrowRight className="w-3 h-3 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function ListRow({
  item,
  favorited,
  onToggleFavorite,
}: {
  item: CatalogueItem;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
}) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 sm:gap-4 bg-surface border border-border rounded-[var(--radius-card)] p-2.5 sm:p-3 hover:border-primary/35 hover:shadow-[var(--shadow-soft)] transition"
    >
      <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
        <Cover item={item} className="w-full h-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <KindBadge item={item} />
        <h2 className="font-semibold text-sm text-foreground group-hover:text-primary transition truncate">
          {item.title}
        </h2>
        <p className="text-xs text-muted truncate">
          {[
            item.orgName,
            item.categoryLabel,
            item.location,
            item.kind === 'service'
              ? serviceMobilityLabel(Boolean(item.travels ?? (item.coverageRadiusKm && item.coverageRadiusKm > 0)), item.coverageRadiusKm)
              : null,
          ].filter(Boolean).join(' · ')}
        </p>
        {formatDistanceKm(item.distanceKm) ? (
          <p className="text-[11px] font-semibold text-primary">{formatDistanceKm(item.distanceKm)}</p>
        ) : null}
      </div>
      <div className="shrink-0 flex items-center gap-2">
        {onToggleFavorite && item.kind !== 'event' ? (
          <FavoriteHeart active={Boolean(favorited)} onToggle={() => onToggleFavorite(item)} />
        ) : null}
        <div className="text-right">
          <span className="text-sm font-semibold text-foreground">
            {cataloguePriceCaption(item)}
          </span>
          <span className="block text-[11px] text-muted">{item.priceUnitLabel}</span>
        </div>
      </div>
    </Link>
  );
}

export default function CatalogueResults({
  items,
  mode,
  emptyTitle,
  emptyDescription,
  gridCols = 4,
  isFavorite,
  onToggleFavorite,
}: {
  items: CatalogueItem[];
  mode: Exclude<CatalogueViewMode, 'map' | 'focus'>;
  emptyTitle: string;
  emptyDescription: string;
  gridCols?: CatalogueGridCols;
  isFavorite?: (item: CatalogueItem) => boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
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
          <ListRow
            key={item.id}
            item={item}
            favorited={isFavorite?.(item)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    );
  }

  const cols = CATALOGUE_GRID_COLS.includes(gridCols as CatalogueGridCols) ? gridCols : 4;

  return (
    <div className={GRID_CLASS[cols]}>
      {items.map((item) => (
        <GridCard
          key={item.id}
          item={item}
          compact={cols >= 5}
          favorited={isFavorite?.(item)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}

function CatalogueGridCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

function CatalogueListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-surface border border-border rounded-[var(--radius-card)] p-2.5 sm:p-3" aria-hidden>
      <Skeleton className="w-20 h-16 sm:w-28 sm:h-20 rounded-md shrink-0" />
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
  gridCols = 4,
}: {
  mode?: CatalogueViewMode;
  count?: number;
  gridCols?: CatalogueGridCols;
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
        <span className="sr-only">Chargement du marketplace…</span>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className={listStackClass} role="status" aria-live="polite" aria-label="Chargement du marketplace">
        {Array.from({ length: count }).map((_, i) => (
          <CatalogueListRowSkeleton key={i} />
        ))}
        <span className="sr-only">Chargement du marketplace…</span>
      </div>
    );
  }

  const cols = CATALOGUE_GRID_COLS.includes(gridCols as CatalogueGridCols) ? gridCols : 4;

  return (
    <div
      className={GRID_CLASS[cols]}
      role="status"
      aria-live="polite"
      aria-label="Chargement du marketplace"
    >
      {Array.from({ length: count }).map((_, i) => (
        <CatalogueGridCardSkeleton key={i} />
      ))}
      <span className="sr-only">Chargement du marketplace…</span>
    </div>
  );
}

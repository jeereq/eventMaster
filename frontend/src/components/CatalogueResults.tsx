'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Calendar, KeyRound, MapPin, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { listStackClass } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import FavoriteHeart from '@/components/FavoriteHeart';
import { catalogueItemDisplayKind, catalogueKindAccent, catalogueKindFilterLabel, catalogueKindLabel, cataloguePriceCaption, formatDistanceKm, formatQuotaLabel, groupCatalogueItemsByDisplayKind, serviceMobilityLabel, type CatalogueDisplayKind, type CatalogueItem, type CatalogueViewMode } from '@/lib/marketplace';
import { rememberCurrentCatalogueList } from '@/lib/catalogueQuery';
import useIsMobile from '@/hooks/useIsMobile';

export const CATALOGUE_GRID_COLS = [2, 3, 4, 5] as const;
export type CatalogueGridCols = (typeof CATALOGUE_GRID_COLS)[number];

const GRID_CLASS: Record<CatalogueGridCols, string> = {
  2: 'grid grid-cols-2 gap-2.5 sm:gap-5',
  3: 'grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4',
  4: 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4',
  5: 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-4',
};

function kindIcon(kind: CatalogueDisplayKind) {
  if (kind === 'event') return Calendar;
  if (kind === 'rental') return KeyRound;
  if (kind === 'service') return Sparkles;
  return Building2;
}

function Cover({ item, className }: { item: CatalogueItem; className?: string }) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = kindIcon(displayKind);
  if (item.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.coverUrl}
        alt={item.title || "Visuel de l'établissement"}
        loading="lazy"
        decoding="async"
        className={cn('object-cover transition duration-500 group-hover:scale-110', className)}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center', accent.cover, className)}>
      <Icon className="w-10 h-10" strokeWidth={2.2} />
    </div>
  );
}

function KindMark({ item, size = 'md' }: { item: CatalogueItem; size?: 'sm' | 'md' }) {
  const displayKind = catalogueItemDisplayKind(item);
  const Icon = kindIcon(displayKind);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold shadow-sm">
      <Icon className="w-3 h-3 text-white" strokeWidth={2.4} />
      <span className="hidden sm:inline">{catalogueKindLabel(displayKind)}</span>
    </span>
  );
}

function GroupHeading({ kind, count }: { kind: CatalogueDisplayKind; count: number }) {
  const Icon = kindIcon(kind);
  const accent = catalogueKindAccent(kind);
  return (
    <h2 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
      <span className={cn('inline-flex h-7 w-7 items-center justify-center rounded-lg', accent.iconBox)}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
      </span>
      {catalogueKindFilterLabel(kind)}
      <span className="text-muted font-medium"> · {count}</span>
    </h2>
  );
}

function GridCard({
  item,
  compact,
  favorited,
  onToggleFavorite,
  onNavigate,
}: {
  item: CatalogueItem;
  compact?: boolean;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
  onNavigate?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className="group relative flex flex-col bg-surface border border-border/80 rounded-[var(--radius-card)] overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300"
    >
      {/* Photo avec mise en valeur maximale */}
      <div className={cn('relative overflow-hidden bg-surface-muted', compact ? 'aspect-[5/4]' : 'aspect-[4/3]')}>
        <Cover item={item} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />

        {/* Badge catégorie discret & moderne en verre dépoli */}
        <div className="absolute top-2.5 left-2.5 z-[1]">
          <KindMark item={item} size="sm" />
        </div>

        {/* Favori ou distance en haut à droite */}
        {onToggleFavorite && item.kind !== 'event' ? (
          <div className="absolute top-2.5 right-2.5 z-10">
            <FavoriteHeart active={Boolean(favorited)} onToggle={() => onToggleFavorite(item)} />
          </div>
        ) : formatDistanceKm(item.distanceKm) ? (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-semibold px-2.5 py-0.5 border border-white/10 shadow-xs">
            {formatDistanceKm(item.distanceKm)}
          </span>
        ) : null}
      </div>

      {/* Informations textuelles épurées & lisibles (Design photo-first aéré) */}
      <div className="p-2.5 sm:p-4 space-y-1.5 sm:space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1">
          <h3 className="font-bold text-xs sm:text-[15px] text-foreground leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {item.location ? (
            <p className="text-xs text-muted inline-flex items-center gap-1 truncate w-full">
              <MapPin className="w-3.5 h-3.5 text-muted/80 shrink-0" />
              <span className="truncate">{item.location}</span>
            </p>
          ) : (
            <p className="text-xs text-muted truncate">
              {item.orgName || item.categoryLabel || 'Événementiel'}
            </p>
          )}

          {/* Attribut clé unique & lisible sans accumulation de chips */}
          <div className="text-[11px] text-muted pt-0.5 flex items-center gap-1.5">
            {item.capacity ? (
              <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
                <Users className="w-3 h-3 text-muted" /> Jusqu&apos;à {item.capacity} pers.
              </span>
            ) : item.categoryLabel ? (
              <span className="font-medium text-foreground/80 truncate">{item.categoryLabel}</span>
            ) : null}
          </div>
        </div>

        {/* Prix mis en valeur simplement */}
        <div className="pt-2 border-t border-border/50 flex items-baseline justify-between text-xs">
          <div>
            <span className="font-bold text-sm sm:text-[15px] text-foreground">
              {cataloguePriceCaption(item)}
            </span>
            <span className="text-muted text-[11px] ml-1">
              · {item.priceUnitLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ListRow({
  item,
  favorited,
  onToggleFavorite,
  onNavigate,
}: {
  item: CatalogueItem;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
  onNavigate?: (e: React.MouseEvent) => void;
}) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = kindIcon(displayKind);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center gap-3 sm:gap-4 bg-surface border rounded-[var(--radius-card)] p-2.5 sm:p-3 hover:shadow-[var(--shadow-soft)] transition',
        accent.border,
      )}
    >
      <div className="relative w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
        <Cover item={item} className="w-full h-full" />
        <span className={cn(
          'absolute bottom-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-md shadow-sm',
          accent.iconBox,
        )}>
          <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <KindMark item={item} size="sm" />
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
  groupByKind = false,
  isFavorite,
  onToggleFavorite,
}: {
  items: CatalogueItem[];
  mode: Exclude<CatalogueViewMode, 'map' | 'focus'>;
  emptyTitle: string;
  emptyDescription: string;
  gridCols?: CatalogueGridCols;
  groupByKind?: boolean;
  isFavorite?: (item: CatalogueItem) => boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
}) {
  const isMobile = useIsMobile();
  const resolvedMode = isMobile ? 'grid' : mode;
  const rememberListOnNavigate = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    rememberCurrentCatalogueList();
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
        <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
        <h2 className="font-semibold text-foreground">{emptyTitle}</h2>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">{emptyDescription}</p>
      </div>
    );
  }

  const cols = CATALOGUE_GRID_COLS.includes(gridCols as CatalogueGridCols) ? gridCols : 4;

  if (groupByKind) {
    const groups = groupCatalogueItemsByDisplayKind(items);
    const showHeadings = groups.length > 1;

    if (resolvedMode === 'list') {
      return (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.kind} className="space-y-2">
              {showHeadings ? <GroupHeading kind={group.kind} count={group.items.length} /> : null}
              <div className={listStackClass}>
                {group.items.map((item) => (
                  <ListRow
                    key={item.id}
                    item={item}
                    favorited={isFavorite?.(item)}
                    onToggleFavorite={onToggleFavorite}
                    onNavigate={rememberListOnNavigate}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.kind} className="space-y-3">
            {showHeadings ? <GroupHeading kind={group.kind} count={group.items.length} /> : null}
            <div className={GRID_CLASS[cols]}>
              {group.items.map((item) => (
                <GridCard
                  key={item.id}
                  item={item}
                  compact={cols >= 5}
                  favorited={isFavorite?.(item)}
                  onToggleFavorite={onToggleFavorite}
                  onNavigate={rememberListOnNavigate}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // Vue directe / tous mélangés
  if (resolvedMode === 'list') {
    return (
      <div className={listStackClass}>
        {items.map((item) => (
          <ListRow
            key={item.id}
            item={item}
            favorited={isFavorite?.(item)}
            onToggleFavorite={onToggleFavorite}
            onNavigate={rememberListOnNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID_CLASS[cols]}>
      {items.map((item) => (
        <GridCard
          key={item.id}
          item={item}
          compact={cols >= 5}
          favorited={isFavorite?.(item)}
          onToggleFavorite={onToggleFavorite}
          onNavigate={rememberListOnNavigate}
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
  const isMobile = useIsMobile();
  const resolvedMode = isMobile ? 'grid' : mode;
  if (resolvedMode === 'map' || resolvedMode === 'focus') {
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
            resolvedMode === 'focus' ? 'min-h-[420px] h-[calc(100dvh-10.5rem)]' : 'h-[480px]',
          )}
        />
        <span className="sr-only">Chargement du marketplace…</span>
      </div>
    );
  }

  if (resolvedMode === 'list') {
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

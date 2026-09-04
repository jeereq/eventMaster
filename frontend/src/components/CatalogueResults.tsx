'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, Calendar, KeyRound, MapPin, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { listStackClass, StatusPill } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import FavoriteHeart from '@/components/FavoriteHeart';
import { catalogueItemDisplayKind, catalogueKindAccent, catalogueKindFilterLabel, catalogueKindLabel, cataloguePriceCaption, formatDistanceKm, formatQuotaLabel, groupCatalogueItemsByDisplayKind, listingSrcSet, serviceMobilityLabel, sizedMediaUrl, type CatalogueDisplayKind, type CatalogueItem, type CatalogueViewMode } from '@/lib/marketplace';
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

const GRID_COVER_WIDTHS = [360, 480, 640, 800, 960] as const;
const COMPACT_COVER_WIDTHS = [320, 480, 640, 800] as const;
const LIST_COVER_WIDTHS = [160, 224, 320] as const;

function Cover({
  item,
  className,
  sizes,
  widths,
  fallbackWidth,
  eager = false,
}: {
  item: CatalogueItem;
  className?: string;
  sizes: string;
  widths: readonly number[];
  fallbackWidth: number;
  eager?: boolean;
}) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = kindIcon(displayKind);
  if (item.coverUrl) {
    const srcSet = listingSrcSet(item.coverUrl, [...widths]);
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/Unsplash srcset, pas de hop next/image
      <img
        src={sizedMediaUrl(item.coverUrl, fallbackWidth)}
        srcSet={srcSet}
        sizes={sizes}
        alt={item.title || "Visuel de l'établissement"}
        width={fallbackWidth}
        height={Math.round(fallbackWidth * 0.75)}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={eager ? 'high' : 'auto'}
        decoding="async"
        className={cn('object-cover transition duration-500 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100', className)}
      />
    );
  }
  return (
    <div className={cn('flex items-center justify-center', accent.cover, className)}>
      <Icon className="w-10 h-10" strokeWidth={2.2} />
    </div>
  );
}

function VisibilityMark({ item }: { item: CatalogueItem }) {
  if (item.isBlockedByAdmin) return <StatusPill tone="rose">Bloqué</StatusPill>;
  if (item.isPublic === true) return <StatusPill tone="emerald">Public</StatusPill>;
  if (item.isPublic === false) return <StatusPill tone="slate">Masqué</StatusPill>;
  return null;
}

function KindMark({ item, size = 'md' }: { item: CatalogueItem; size?: 'sm' | 'md' }) {
  const displayKind = catalogueItemDisplayKind(item);
  const Icon = kindIcon(displayKind);
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stage border border-stage-foreground/20 text-stage-foreground text-[11px] font-bold shadow-sm">
      <Icon className="w-3 h-3 text-stage-foreground" strokeWidth={2.4} />
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
  eager,
  actions,
}: {
  item: CatalogueItem;
  compact?: boolean;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
  onNavigate?: (e: React.MouseEvent) => void;
  eager?: boolean;
  actions?: React.ReactNode;
}) {
  const distance = formatDistanceKm(item.distanceKm);
  return (
    <article className="group relative flex flex-col bg-surface border border-border/80 rounded-[var(--radius-card)] overflow-hidden shadow-2xs hover:shadow-xl hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 motion-reduce:translate-y-0 motion-reduce:transition-none motion-reduce:hover:-translate-y-0">
      {onToggleFavorite && item.kind !== 'event' ? (
        <div className="absolute top-2.5 right-2.5 z-10">
          <FavoriteHeart active={Boolean(favorited)} onToggle={() => onToggleFavorite(item)} />
        </div>
      ) : distance ? (
        <span className="absolute top-2.5 right-2.5 z-10 rounded-full bg-stage text-stage-foreground text-[10px] font-semibold px-2.5 py-0.5 border border-stage-foreground/20 shadow-xs">
          {distance}
        </span>
      ) : null}

      <Link
        href={item.href}
        onClick={onNavigate}
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset"
      >
        <div className={cn('relative overflow-hidden bg-surface-muted', compact ? 'aspect-[5/4]' : 'aspect-[4/3]')}>
          <Cover
            item={item}
            eager={eager}
            fallbackWidth={compact ? 480 : 640}
            widths={compact ? COMPACT_COVER_WIDTHS : GRID_COVER_WIDTHS}
            sizes={compact
              ? '(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 20vw'
              : '(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
          <div className="absolute top-2.5 left-2.5 z-[1] flex flex-col items-start gap-1">
            <KindMark item={item} size="sm" />
            <VisibilityMark item={item} />
          </div>
        </div>

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
      {actions ? (
        <div className="flex flex-wrap gap-1.5 border-t border-border/50 px-2.5 py-2.5 sm:px-4">
          {actions}
        </div>
      ) : null}
    </article>
  );
}

function ListRow({
  item,
  favorited,
  onToggleFavorite,
  onNavigate,
  actions,
}: {
  item: CatalogueItem;
  favorited?: boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
  onNavigate?: (e: React.MouseEvent) => void;
  actions?: React.ReactNode;
}) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = kindIcon(displayKind);
  return (
    <article
      className={cn(
        'group bg-surface border rounded-[var(--radius-card)] p-2.5 sm:p-3 hover:shadow-[var(--shadow-soft)] transition',
        accent.border,
      )}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href={item.href}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-[var(--radius-button)]"
        >
          <div className="relative w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
            <Cover
              item={item}
              fallbackWidth={224}
              widths={LIST_COVER_WIDTHS}
              sizes="112px"
              className="w-full h-full"
            />
            <span className={cn(
              'absolute bottom-1 left-1 inline-flex h-6 w-6 items-center justify-center rounded-md shadow-sm',
              accent.iconBox,
            )}>
              <Icon className="w-3.5 h-3.5" strokeWidth={2.4} />
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <KindMark item={item} size="sm" />
              <VisibilityMark item={item} />
            </div>
            <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition truncate">
              {item.title}
            </h3>
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
          <div className="shrink-0 text-right">
            <span className="text-sm font-semibold text-foreground">
              {cataloguePriceCaption(item)}
            </span>
            <span className="block text-[11px] text-muted">{item.priceUnitLabel}</span>
          </div>
        </Link>
        {onToggleFavorite && item.kind !== 'event' ? (
          <FavoriteHeart active={Boolean(favorited)} onToggle={() => onToggleFavorite(item)} />
        ) : null}
      </div>
      {actions ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/50 pt-2.5">
          {actions}
        </div>
      ) : null}
    </article>
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
  renderActions,
}: {
  items: CatalogueItem[];
  mode: Exclude<CatalogueViewMode, 'map' | 'focus'>;
  emptyTitle: string;
  emptyDescription: string;
  gridCols?: CatalogueGridCols;
  groupByKind?: boolean;
  isFavorite?: (item: CatalogueItem) => boolean;
  onToggleFavorite?: (item: CatalogueItem) => void;
  renderActions?: (item: CatalogueItem) => React.ReactNode;
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
                    actions={renderActions?.(item)}
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
        {groups.map((group, groupIndex) => (
          <section key={group.kind} className="space-y-3">
            {showHeadings ? <GroupHeading kind={group.kind} count={group.items.length} /> : null}
            <div className={GRID_CLASS[cols]}>
              {group.items.map((item, index) => (
                <GridCard
                  key={item.id}
                  item={item}
                  compact={cols >= 5}
                  eager={groupIndex === 0 && index < 2}
                  favorited={isFavorite?.(item)}
                  onToggleFavorite={onToggleFavorite}
                  onNavigate={rememberListOnNavigate}
                  actions={renderActions?.(item)}
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
            actions={renderActions?.(item)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID_CLASS[cols]}>
      {items.map((item, index) => (
        <GridCard
          key={item.id}
          item={item}
          compact={cols >= 5}
          eager={index < 2}
          favorited={isFavorite?.(item)}
          onToggleFavorite={onToggleFavorite}
          onNavigate={rememberListOnNavigate}
          actions={renderActions?.(item)}
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

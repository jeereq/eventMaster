'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, Calendar, KeyRound, ChevronUp, LayoutGrid, Locate, Navigation, Sparkles, X } from 'lucide-react';
import MarketplaceLocationsMap, {
  type MarketplaceMapHandle,
  type MarketplaceMapMarker,
} from '@/components/MarketplaceLocationsMap';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { catalogueItemDisplayKind, catalogueKindAccent, catalogueKindLabel, formatDistanceKm, type CatalogueItem } from '@/lib/marketplace';

type SheetSnap = 'peek' | 'mid' | 'full';

const PEEK = 228;
const HEADER_GAP = 8;
const HEADER_FALLBACK = 132;

function snapHeights(vh: number, headerPx: number) {
  const reserved = Math.max(HEADER_FALLBACK, headerPx) + HEADER_GAP;
  const maxFull = Math.max(PEEK, vh - reserved);
  return {
    peek: Math.min(PEEK, maxFull),
    mid: Math.min(Math.round(vh * 0.38), maxFull),
    full: maxFull,
  };
}

function nearestSnap(height: number, vh: number, headerPx: number): SheetSnap {
  const snaps = snapHeights(vh, headerPx);
  const entries = Object.entries(snaps) as Array<[SheetSnap, number]>;
  return entries.reduce((best, [name, value]) =>
    Math.abs(value - height) < Math.abs(snaps[best] - height) ? name : best, 'peek' as SheetSnap);
}

function StoryCard({
  item,
  selected,
  onSelect,
  onDirections,
}: {
  item: CatalogueItem;
  selected: boolean;
  onSelect: () => void;
  onDirections: () => void;
}) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = displayKind === 'service' ? Sparkles : displayKind === 'rental' ? KeyRound : displayKind === 'event' ? Calendar : Building2;
  const distance = formatDistanceKm(item.distanceKm);

  return (
    <article
      data-card-id={item.id}
      className={cn(
        'em-snap-card relative overflow-hidden rounded-[var(--radius-card)] border bg-surface shadow-lg transition-transform',
        selected ? 'ring-2 ring-primary/40 scale-[1.02]' : '',
        accent.border,
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-1 z-10', accent.bar)} aria-hidden />
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative h-16 bg-surface-muted">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.coverUrl}
              alt={item.title || "Visuel de l'établissement"}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={cn('w-full h-full flex items-center justify-center', accent.cover)}>
              <Icon className="w-7 h-7" strokeWidth={2.2} />
            </div>
          )}
          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1">
            <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-button)] shadow-sm', accent.iconBox)}>
              <Icon className="w-3 h-3" strokeWidth={2.4} />
            </span>
            <span className={cn('rounded-[var(--radius-button)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm', accent.badge)}>
              {catalogueKindLabel(displayKind)}
            </span>
          </span>
          {distance ? (
            <span className="absolute top-1.5 right-1.5 rounded-[var(--radius-button)] bg-black/55 text-white text-[10px] font-semibold px-1.5 py-0.5">
              {distance}
            </span>
          ) : null}
        </div>
        <div className="px-2.5 pt-2 min-w-0">
          <p className="font-semibold text-sm leading-snug text-foreground truncate">{item.title}</p>
          <p className="text-[11px] text-muted truncate mt-0.5">
            {item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis'}
            {item.location ? ` · ${item.location}` : ''}
          </p>
        </div>
      </button>
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          onClick={onDirections}
          className="flex-1 h-8 rounded-[var(--radius-button)] bg-primary text-white text-[11px] font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5" />
          Y aller
        </button>
        <Link
          href={item.href}
          className="flex-1 h-8 rounded-[var(--radius-button)] border border-border bg-surface-muted text-foreground text-[11px] font-semibold inline-flex items-center justify-center"
        >
          Voir
        </Link>
      </div>
    </article>
  );
}

function SheetRow({
  item,
  selected,
  onSelect,
}: {
  item: CatalogueItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const displayKind = catalogueItemDisplayKind(item);
  const accent = catalogueKindAccent(displayKind);
  const Icon = displayKind === 'service' ? Sparkles : displayKind === 'rental' ? KeyRound : displayKind === 'event' ? Calendar : Building2;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 rounded-[var(--radius-card)] p-2 text-left border transition',
        selected ? 'bg-primary/5' : 'bg-surface-muted/60',
        accent.border,
      )}
    >
      <div className="relative w-[4.5rem] h-14 rounded-md overflow-hidden bg-surface-muted shrink-0">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={item.title || "Visuel de l'établissement"}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center', accent.cover)}>
            <Icon className="w-5 h-5" strokeWidth={2.2} />
          </div>
        )}
        <span className={cn(
          'absolute bottom-1 left-1 inline-flex h-5 w-5 items-center justify-center rounded shadow-sm',
          accent.iconBox,
        )}>
          <Icon className="w-3 h-3" strokeWidth={2.4} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[10px] font-semibold uppercase tracking-wider', displayKind === 'service' ? 'text-[color:var(--festive-accent)]' : displayKind === 'rental' ? 'text-cyan-800' : displayKind === 'event' ? 'text-emerald-700' : 'text-primary')}>
          {catalogueKindLabel(displayKind)}
        </p>
        <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
        <p className="text-[11px] text-muted truncate">
          {[formatDistanceKm(item.distanceKm), item.location, item.capacity ? `${item.capacity} places` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <p className="text-xs font-semibold text-foreground shrink-0 text-right">
        {item.priceFromFc != null ? formatFc(item.priceFromFc) : 'Devis'}
      </p>
    </button>
  );
}

export default function CatalogueMobileExplore({
  items,
  markers,
  loading,
  error,
  nav,
  filters,
  emptyTitle,
  emptyDescription,
  searchCenter,
  radiusKm,
  city,
  searchOriginLabel,
  onExit,
}: {
  items: CatalogueItem[];
  markers: MarketplaceMapMarker[];
  loading?: boolean;
  error?: string;
  nav?: React.ReactNode;
  filters?: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  searchCenter?: { lat: number; lng: number } | null;
  radiusKm?: number;
  city?: string | null;
  searchOriginLabel?: string;
  onExit?: () => void;
}) {
  const mapApi = useRef<MarketplaceMapHandle>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const chromeRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startY: number; startH: number; lastY: number; lastT: number } | null>(null);
  const skipRailRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [sheetH, setSheetH] = useState(PEEK);
  const [dragging, setDragging] = useState(false);
  const [vh, setVh] = useState(800);
  const [headerH, setHeaderH] = useState(HEADER_FALLBACK);

  useEffect(() => {
    const sync = () => setVh(window.innerHeight);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    const node = chromeRef.current;
    if (!node || typeof ResizeObserver === 'undefined') {
      setHeaderH(node?.getBoundingClientRect().height || HEADER_FALLBACK);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height || node.getBoundingClientRect().height;
      if (height > 0) setHeaderH(height);
    });
    observer.observe(node);
    setHeaderH(node.getBoundingClientRect().height || HEADER_FALLBACK);
    return () => observer.disconnect();
  }, [nav, filters]);

  useEffect(() => {
    if (!dragging) setSheetH(snapHeights(vh, headerH)[snap]);
  }, [snap, vh, headerH, dragging]);

  useEffect(() => {
    const first = items.find((item) => item.latitude != null && item.longitude != null) || items[0];
    setSelectedId((current) => {
      if (current && items.some((item) => item.id === current)) return current;
      return first?.id ?? null;
    });
  }, [items]);

  useEffect(() => {
    if (!selectedId) return;
    skipRailRef.current = true;
    const node = railRef.current?.querySelector(`[data-card-id="${CSS.escape(selectedId)}"]`);
    node?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    const timer = window.setTimeout(() => {
      skipRailRef.current = false;
    }, 420);
    return () => window.clearTimeout(timer);
  }, [selectedId, snap]);

  const select = (id: string, opts?: { fromRail?: boolean; keepSheet?: boolean }) => {
    skipRailRef.current = Boolean(opts?.fromRail);
    setSelectedId(id);
    if (snap === 'full' && !opts?.keepSheet) setSnap('mid');
  };

  const onRailScroll = () => {
    const rail = railRef.current;
    if (!rail || snap === 'full' || skipRailRef.current) return;
    const center = rail.scrollLeft + rail.clientWidth / 2;
    let bestId = selectedId;
    let best = Infinity;
    rail.querySelectorAll<HTMLElement>('[data-card-id]').forEach((card) => {
      const mid = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < best) {
        best = dist;
        bestId = card.dataset.cardId || bestId;
      }
    });
    if (bestId && bestId !== selectedId) {
      skipRailRef.current = true;
      setSelectedId(bestId);
    }
  };

  const endDrag = (clientY: number) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    if (!drag) return;
    const dt = Math.max(16, Date.now() - drag.lastT);
    const velocity = (drag.lastY - clientY) / dt;
    const nextH = Math.min(snapHeights(vh, headerH).full, Math.max(PEEK, drag.startH + (drag.startY - clientY)));
    let next = nearestSnap(nextH, vh, headerH);
    if (velocity > 0.35) next = next === 'peek' ? 'mid' : 'full';
    if (velocity < -0.35) next = next === 'full' ? 'mid' : 'peek';
    setSnap(next);
    setSheetH(snapHeights(vh, headerH)[next]);
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startH: sheetH, lastY: event.clientY, lastT: Date.now() };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.lastY = event.clientY;
    drag.lastT = Date.now();
    const next = Math.min(snapHeights(vh, headerH).full, Math.max(PEEK, drag.startH + (drag.startY - event.clientY)));
    setSheetH(next);
  };

  const selected = items.find((item) => item.id === selectedId) || null;

  return (
    <div className="relative isolate h-full min-h-0 overflow-hidden bg-background overscroll-none">
      <div className="absolute inset-0 z-0">
        <MarketplaceLocationsMap
          ref={mapApi}
          markers={markers}
          immersive
          selectedId={selectedId}
          onMarkerSelect={(marker) => select(marker.id)}
          searchCenter={searchCenter}
          radiusKm={radiusKm}
          city={city}
          searchOriginLabel={searchOriginLabel}
        />
      </div>

      <div className="absolute z-30 top-0 left-0 right-0 px-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 bg-gradient-to-b from-background/85 via-background/40 to-transparent pointer-events-none">
        <div ref={chromeRef} className="space-y-1.5">
        <div className="pointer-events-auto flex items-center gap-1.5">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="h-9 px-2.5 rounded-[var(--radius-button)] bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg inline-flex items-center gap-1 text-xs font-semibold text-foreground shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              Quitter
            </button>
          ) : null}
          {nav ? <div className="min-w-0 flex-1">{nav}</div> : null}
        </div>
        {filters ? <div className="pointer-events-auto">{filters}</div> : null}
        </div>
      </div>

      {snap !== 'full' ? (
        <button
          type="button"
          onClick={() => mapApi.current?.recenter()}
          className="absolute z-10 right-3 bottom-3 h-10 w-10 rounded-full bg-surface/90 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg inline-flex items-center justify-center text-foreground touch-manipulation active:scale-95"
          style={{
            transform: `translateY(-${sheetH}px)`,
            transition: dragging ? 'none' : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: dragging ? 'transform' : 'auto',
          }}
          aria-label="Recentrer la carte"
        >
          <Locate className="w-4 h-4" />
        </button>
      ) : null}

      <section
        ref={sheetRef}
        className="absolute z-20 left-0 right-0 bottom-0 rounded-t-[var(--radius-card)] border border-border bg-surface/95 backdrop-blur-xl shadow-[0_-12px_40px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden"
        style={{
          height: sheetH,
          paddingBottom: 'env(safe-area-inset-bottom)',
          /* impeccable-disable-next-line layout-transition */
          transition: dragging ? 'none' : 'height 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
          contain: 'layout style',
          willChange: dragging ? 'height' : 'auto',
        }}
      >
        <div
          className="shrink-0 pt-1.5 pb-1 px-3 touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e.clientY)}
          onPointerCancel={(e) => endDrag(e.clientY)}
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-muted/50" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {loading ? 'Recherche…' : `${items.length} résultat${items.length > 1 ? 's' : ''}`}
              </p>
              {selected ? (
                <p className="text-[11px] text-muted truncate">{selected.title}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {onExit ? (
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grille
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSnap(snap === 'full' ? 'peek' : 'full')}
                className="inline-flex items-center gap-1 rounded-[var(--radius-button)] border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
              >
                <ChevronUp className={cn('w-3.5 h-3.5 transition', snap === 'full' && 'rotate-180')} />
                {snap === 'full' ? 'Réduire' : 'Plus'}
              </button>
            </div>
          </div>
          {error ? <p className="text-xs text-rose-600 mt-1">{error}</p> : null}
        </div>

        {snap === 'full' ? (
          <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 overscroll-contain">
            {items.length === 0 && !loading ? (
              <div className="text-center py-10 px-4">
                <p className="font-semibold text-foreground">{emptyTitle}</p>
                <p className="text-sm text-muted mt-1">{emptyDescription}</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id}>
                  <SheetRow
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={() => select(item.id, { keepSheet: true })}
                  />
                  {item.id === selectedId ? (
                    <div className="flex gap-2 px-2 pb-1 pt-1">
                      <Button size="sm" className="flex-1" onClick={() => mapApi.current?.startDirectionsFor(item.id)} leftIcon={<Navigation className="w-3.5 h-3.5" />}>
                        Y aller
                      </Button>
                      <Link href={item.href} className="flex-1">
                        <Button size="sm" variant="secondary" className="w-full">Voir la fiche</Button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        ) : (
          <div
            ref={railRef}
            className="em-snap-rail flex-1"
            onScroll={onRailScroll}
          >
            {loading && items.length === 0 ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="em-snap-card h-[9.5rem] rounded-[var(--radius-card)] bg-surface-muted animate-pulse" />
              ))
            ) : items.length === 0 ? (
              <div className="px-2 py-6 text-center w-full">
                <p className="font-semibold text-foreground">{emptyTitle}</p>
                <p className="text-sm text-muted mt-1">{emptyDescription}</p>
              </div>
            ) : (
              items.map((item) => (
                <StoryCard
                  key={item.id}
                  item={item}
                  selected={item.id === selectedId}
                  onSelect={() => select(item.id, { fromRail: true })}
                  onDirections={() => {
                    select(item.id, { fromRail: true });
                    mapApi.current?.startDirectionsFor(item.id);
                    setSnap('peek');
                  }}
                />
              ))
            )}
          </div>
        )}
      </section>
    </div>
  );
}

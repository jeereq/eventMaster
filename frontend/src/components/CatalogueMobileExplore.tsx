'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Building2, ChevronUp, LayoutGrid, Locate, Navigation, Sparkles, X } from 'lucide-react';
import MarketplaceLocationsMap, {
  type MarketplaceMapHandle,
  type MarketplaceMapMarker,
} from '@/components/MarketplaceLocationsMap';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import { formatDistanceKm, type CatalogueItem } from '@/lib/marketplace';

type SheetSnap = 'peek' | 'mid' | 'full';

const PEEK = 268;

function snapHeights(vh: number) {
  return {
    peek: PEEK,
    mid: Math.round(vh * 0.46),
    full: Math.round(vh * 0.9),
  };
}

function nearestSnap(height: number, vh: number): SheetSnap {
  const snaps = snapHeights(vh);
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
  const isService = item.kind === 'service';
  const Icon = isService ? Sparkles : Building2;
  const distance = formatDistanceKm(item.distanceKm);

  return (
    <article
      data-card-id={item.id}
      className={cn(
        'em-snap-card relative overflow-hidden rounded-[1.35rem] border bg-surface shadow-lg transition-transform',
        selected ? 'border-primary ring-2 ring-primary/40 scale-[1.02]' : 'border-border',
      )}
    >
      <button type="button" onClick={onSelect} className="block w-full text-left">
        <div className="relative h-[7.5rem] bg-surface-muted">
          {item.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={cn(
              'w-full h-full flex items-center justify-center',
              isService ? 'bg-[color:var(--festive-accent)]/15 text-[color:var(--festive-accent)]' : 'bg-primary/10 text-primary',
            )}>
              <Icon className="w-8 h-8" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <span className={cn(
            'absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-white/90 text-foreground',
          )}>
            <Icon className="w-3 h-3" />
            {isService ? 'Prestataire' : 'Salle'}
          </span>
          {distance ? (
            <span className="absolute top-2.5 right-2.5 rounded-full bg-black/55 text-white text-[10px] font-semibold px-2 py-0.5">
              {distance}
            </span>
          ) : null}
          <div className="absolute left-3 right-3 bottom-2.5 text-white">
            <p className="font-semibold text-sm leading-snug line-clamp-2">{item.title}</p>
            <p className="text-[11px] text-white/80 truncate mt-0.5">
              {item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis'}
              {item.location ? ` · ${item.location}` : ''}
            </p>
          </div>
        </div>
      </button>
      <div className="flex items-center gap-2 p-2.5">
        <button
          type="button"
          onClick={onDirections}
          className="flex-1 h-9 rounded-full bg-primary text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
        >
          <Navigation className="w-3.5 h-3.5" />
          Y aller
        </button>
        <Link
          href={item.href}
          className="flex-1 h-9 rounded-full border border-border bg-surface-muted text-foreground text-xs font-semibold inline-flex items-center justify-center"
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
  const isService = item.kind === 'service';
  const Icon = isService ? Sparkles : Building2;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 rounded-2xl p-2 text-left border transition',
        selected ? 'border-primary bg-primary/5' : 'border-transparent bg-surface-muted/60',
      )}
    >
      <div className="w-[4.5rem] h-14 rounded-xl overflow-hidden bg-surface-muted shrink-0">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className={cn(
            'w-full h-full flex items-center justify-center',
            isService ? 'text-[color:var(--festive-accent)]' : 'text-primary',
          )}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {isService ? 'Prestataire' : 'Salle'}
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
  header,
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
  header: React.ReactNode;
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
  const dragRef = useRef<{ startY: number; startH: number; lastY: number; lastT: number } | null>(null);
  const skipRailRef = useRef(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snap, setSnap] = useState<SheetSnap>('peek');
  const [sheetH, setSheetH] = useState(PEEK);
  const [dragging, setDragging] = useState(false);
  const [vh, setVh] = useState(800);

  useEffect(() => {
    const sync = () => setVh(window.innerHeight);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  useEffect(() => {
    if (!dragging) setSheetH(snapHeights(vh)[snap]);
  }, [snap, vh, dragging]);

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
    const nextH = Math.min(snapHeights(vh).full, Math.max(PEEK, drag.startH + (drag.startY - clientY)));
    let next = nearestSnap(nextH, vh);
    if (velocity > 0.35) next = next === 'peek' ? 'mid' : 'full';
    if (velocity < -0.35) next = next === 'full' ? 'mid' : 'peek';
    setSnap(next);
    setSheetH(snapHeights(vh)[next]);
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
    const next = Math.min(snapHeights(vh).full, Math.max(PEEK, drag.startH + (drag.startY - event.clientY)));
    setSheetH(next);
  };

  const selected = items.find((item) => item.id === selectedId) || null;

  return (
    <div className="relative isolate h-[calc(100dvh-3.5rem)] overflow-hidden bg-background overscroll-none">
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

      <div className="absolute z-10 top-0 left-0 right-0 p-3 space-y-2 bg-gradient-to-b from-background/90 via-background/50 to-transparent pointer-events-none">
        <div className="pointer-events-auto space-y-2">
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              className="h-11 px-3.5 rounded-full bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg inline-flex items-center gap-1.5 text-sm font-semibold text-foreground"
            >
              <X className="w-4 h-4" />
              Quitter la carte
            </button>
          ) : null}
          {header}
        </div>
      </div>

      {snap !== 'full' ? (
        <button
          type="button"
          onClick={() => mapApi.current?.recenter()}
          className="absolute z-10 right-3 h-11 w-11 rounded-full bg-surface/90 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg inline-flex items-center justify-center text-foreground"
          style={{ bottom: sheetH + 16, transition: dragging ? 'none' : 'bottom 0.32s cubic-bezier(0.22, 1, 0.36, 1)' }}
          aria-label="Recentrer la carte"
        >
          <Locate className="w-4 h-4" />
        </button>
      ) : null}

      <section
        ref={sheetRef}
        className="absolute z-20 left-0 right-0 bottom-0 rounded-t-[1.75rem] border border-border bg-surface/95 backdrop-blur-xl shadow-[0_-12px_40px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden"
        style={{
          height: sheetH,
          paddingBottom: 'env(safe-area-inset-bottom)',
          transition: dragging ? 'none' : 'height 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="shrink-0 pt-2 pb-1 px-4 touch-none"
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
                  className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grille
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setSnap(snap === 'full' ? 'peek' : 'full')}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground"
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
                <div key={i} className="em-snap-card h-[12.5rem] rounded-[1.35rem] bg-surface-muted animate-pulse" />
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

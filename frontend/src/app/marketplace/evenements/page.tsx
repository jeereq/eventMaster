'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemMatchesGeo,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  eventToCatalogueItem,
  resolveCatalogueGeo,
  sortCatalogueByDistance,
  withCatalogueDistance,
  type CatalogueGeoState,
  type PublicEventCard,
} from '@/lib/marketplace';
import { useCatalogueQueryState } from '@/lib/catalogueQuery';
import { EMPTY_CATALOGUE_EXTRAS, appendCatalogueEntityParams, clearCatalogueExtraChip } from '@/lib/catalogueEntityFilters';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import CatalogueSearchLayout from '@/components/CatalogueSearchLayout';
import MarketplaceCatalogueSkeleton from '@/components/MarketplaceCatalogueSkeleton';
import { usePageSize } from '@/components/ui';
import EventTicketCard from '@/components/marketplace/EventTicketCard';
import { cn } from '@/lib/cn';
import { CreditCard } from 'lucide-react';
import type { CatalogueItem } from '@/lib/marketplace';
import CatalogueFilterBar, {
  CatalogueEntityFilterFields,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';

type EventFilters = CatalogueGeoState & { entry: '' | 'paid' | 'free' };

/** Raccourcis de date au-dessus des résultats. */
type WhenFilter = '' | 'tonight' | 'weekend' | 'month';
const WHEN_OPTIONS: Array<{ id: Exclude<WhenFilter, ''>; label: string }> = [
  { id: 'tonight', label: 'Ce soir' },
  { id: 'weekend', label: 'Ce week-end' },
  { id: 'month', label: 'Ce mois-ci' },
];

const QUICK_CHIP_CLASS =
  'shrink-0 min-h-11 px-4 rounded-full border-[1.5px] text-sm font-semibold transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function quickChipTone(active: boolean) {
  return active
    ? 'border-primary-solid bg-[#e3f3ec] text-[#065f46] dark:bg-primary/15 dark:text-primary'
    : 'border-border bg-surface text-foreground hover:border-primary/40';
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function matchesWhen(iso: string | null | undefined, when: WhenFilter, now: Date) {
  if (!when) return true;
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = startOfDay(now);
  if (when === 'tonight') return startOfDay(d).getTime() === today.getTime();
  if (when === 'month') return d >= today && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  // Week-end : du vendredi au dimanche qui viennent (ou en cours).
  const day = now.getDay();
  const friday = new Date(today);
  friday.setDate(today.getDate() + (day === 0 ? -2 : day === 6 ? -1 : 5 - day));
  const mondayAfter = new Date(friday);
  mondayAfter.setDate(friday.getDate() + 3);
  return d >= (friday < today ? today : friday) && d < mondayAfter;
}

/** Regroupe par période : « Cette semaine », puis par mois. */
function groupByPeriod(items: CatalogueItem[], now: Date) {
  const weekEnd = startOfDay(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const groups: Array<{ title: string; items: CatalogueItem[] }> = [];
  for (const item of items) {
    const d = item.eventDate ? new Date(item.eventDate) : null;
    const title = !d || Number.isNaN(d.getTime())
      ? 'Date à venir'
      : d < startOfDay(now)
        ? 'Déjà passés'
        : d < weekEnd
        ? 'Cette semaine'
        : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.items.push(item);
    else groups.push({ title, items: [item] });
  }
  return groups;
}

const emptyFilters: EventFilters = {
  ...EMPTY_CATALOGUE_GEO,
  entry: '',
};

const QUERY_OPTS = {
  extraKeys: ['entry'],
  emptyExtra: { entry: '' },
  merge: (geo: CatalogueGeoState, extra: Record<string, string>): EventFilters => ({
    ...geo,
    entry: extra.entry === 'paid' || extra.entry === 'free' ? extra.entry : '',
  }),
  split: (filters: EventFilters) => ({ entry: filters.entry }),
};

function MarketplaceEventsPageInner() {
  const { mode, setView, gridCols, setGridCols } = useCatalogueView();
  const { q, setQ, searchQ, applied, draft, setDraft, page, applyFilters, setPage } = useCatalogueQueryState(QUERY_OPTS);
  const [events, setEvents] = useState<PublicEventCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterError, setFilterError] = useState('');
  const [pageSize, setPageSize] = usePageSize('marketplace-events', 8);
  const [when, setWhen] = useState<WhenFilter>('');

  const load = useCallback(async (filters: EventFilters, search: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('q', search.trim());
      appendCatalogueGeoParams(params, filters);
      appendCatalogueEntityParams(params, { ...EMPTY_CATALOGUE_EXTRAS, entry: filters.entry }, 'event');
      const data = await api.get(`/public/events${params.toString() ? `?${params}` : ''}`);
      setEvents(data.events || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les événements.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const items = useMemo(
    () =>
      sortCatalogueByDistance(
        events
          .map(eventToCatalogueItem)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .filter((item) => {
            if (applied.entry === 'paid') return item.priceFromFc != null;
            if (applied.entry === 'free') return item.priceFromFc == null;
            return true;
          })
          .map((item) => withCatalogueDistance(item, applied.lat, applied.lng))
          .filter((item) => catalogueItemMatchesGeo(item, applied))
          .filter((item) => matchesWhen(item.eventDate, when, new Date())),
      ),
    [events, applied, when],
  );

  const eventsBySlug = useMemo(() => new Map(events.map((event) => [event.slug, event])), [events]);

  const markers = useMemo(
    () =>
      items
        .filter((item) => item.latitude != null && item.longitude != null)
        .map(catalogueItemToMapMarker),
    [items],
  );

  const chips: CatalogueFilterChip[] = useMemo(() => {
    const extra: CatalogueFilterChip[] = [];
    if (applied.entry === 'paid') extra.push({ id: 'entry', label: 'Entrée', value: 'Payant' });
    if (applied.entry === 'free') extra.push({ id: 'entry', label: 'Entrée', value: 'Libre' });
    return catalogueGeoChips(applied, extra);
  }, [applied]);

  useEffect(() => {
    void load(applied, searchQ);
  }, [applied, searchQ, load]);

  const searchCenter = applied.proximity && applied.lat != null && applied.lng != null
    ? { lat: applied.lat, lng: applied.lng }
    : null;

  return (
    <CatalogueSearchLayout
      activeNav="events"
      heroTitle="Sortir près de chez vous"
      heroDescription="Concerts, conférences et galas. Payez en Mobile Money et présentez votre pass QR à l’entrée."
      heroAside={(
        <span className="inline-flex items-center gap-2 rounded-full bg-[#0b5e48] px-3.5 py-2 text-sm text-white">
          <CreditCard className="w-4 h-4 text-[#6ee7b7]" aria-hidden />
          M-Pesa, Orange, Airtel, carte
        </span>
      )}
      aboveResults={mode === 'grid' || mode === 'list' ? (
        <div role="group" aria-label="Quand" className="flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
          {WHEN_OPTIONS.map((option) => {
            const active = when === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setWhen(active ? '' : option.id);
                  setPage(1);
                }}
                className={cn(QUICK_CHIP_CLASS, quickChipTone(active))}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={applied.entry === 'free'}
            onClick={() => applyFilters({ ...applied, entry: applied.entry === 'free' ? '' : 'free' })}
            className={cn(QUICK_CHIP_CLASS, quickChipTone(applied.entry === 'free'))}
          >
            Gratuit
          </button>
        </div>
      ) : null}
      renderGrid={(visible) => (
        <div className="space-y-8">
          {groupByPeriod(visible, new Date()).map((group) => (
            <section key={group.title} className="space-y-3 sm:space-y-4" aria-label={group.title}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.01em] text-foreground">{group.title}</h2>
                <span className="text-sm text-muted">
                  {group.items.length} événement{group.items.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
                {group.items.map((item, index) => (
                  <EventTicketCard key={item.id} item={item} event={eventsBySlug.get(item.slug)} eager={index < 2} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      mode={mode}
      onViewChange={setView}
      gridCols={gridCols}
      items={items}
      markers={markers}
      loading={loading}
      error={error}
      emptyTitle="Aucun événement"
      emptyDescription={when ? 'Rien sur cette période. Essayez une autre date.' : 'Élargissez la ville ou la date.'}
      page={page}
      pageSize={pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      itemLabel="événements"
      searchCenter={searchCenter}
      radiusKm={searchCenter ? applied.radiusKm : 0}
      city={applied.city}
      searchOriginLabel={applied.proximity === 'around' ? 'Vous êtes ici' : 'Lieu de recherche'}
      cta={{
        title: 'Vous organisez un événement public ?',
        description: 'Publiez la fiche et les billets.',
        primaryHref: '/register?kind=ORGANIZER&intent=pro',
        primaryLabel: 'Créer un compte organisateur',
        secondaryHref: '/contact',
        secondaryLabel: 'Nous contacter',
      }}
      renderFilters={(variant) => (
        <CatalogueFilterBar
          variant={variant}
          hideViewToggle={variant === 'float'}
          compactToggle={variant === 'float'}
          search={q}
          onSearchChange={setQ}
          searchPlaceholder="Titre, lieu, organisateur…"
          view={mode}
          onViewChange={setView}
          gridCols={gridCols}
          onGridColsChange={setGridCols}
          chips={chips}
          resultLabel={!loading ? `${items.length} événement${items.length > 1 ? 's' : ''}` : undefined}
          onRemoveChip={(id) => applyFilters(clearCatalogueExtraChip(clearCatalogueGeoChip(applied, id), id))}
          onClearChips={() => applyFilters(emptyFilters)}
          onOpen={() => {
            setDraft(applied);
            setFilterError('');
          }}
          onApply={async () => {
            try {
              const next = { ...await resolveCatalogueGeo(draft), entry: draft.entry };
              applyFilters(next);
            } catch (err: unknown) {
              setFilterError(err instanceof Error ? err.message : 'Filtre de proximité impossible.');
              throw err;
            }
          }}
          modalTitle="Filtrer les événements"
          filters={
            <CatalogueEntityFilterFields
              entity="event"
              value={draft}
              extras={{ ...EMPTY_CATALOGUE_EXTRAS, kind: 'event', entry: draft.entry }}
              error={filterError}
              onChange={(geo, extras) => setDraft({ ...geo, entry: extras.entry })}
            />
          }
        />
      )}
    />
  );
}

export default function MarketplaceEventsPage() {
  return (
    <Suspense fallback={(
      <MarketplaceCatalogueSkeleton
        active="events"
        title="Événements ouverts au public"
        description="Concerts, galas, conférences… Inscrivez-vous ou achetez un billet. Vue grille, liste ou carte — comme les salles et prestataires."
        label="Chargement des événements"
      />
    )}>
      <MarketplaceEventsPageInner />
    </Suspense>
  );
}

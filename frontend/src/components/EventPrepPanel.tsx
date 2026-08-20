'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  Check,
  ChevronDown,
  Eye,
  Filter,
  KeyRound,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Inbox,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Card, CardHeader, EmptyState, Input } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  formatLocationLine,
  type PublicService,
  type PublicVenue,
  type ServiceMobility,
} from '@/lib/marketplace';
import { ROOM_TYPE_FILTER_OPTIONS } from '@/lib/catalogueEntityFilters';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import {
  emptyEventPrep,
  eventDateKey,
  eventPrepEstimateFc,
  eventPrepFromAiRecommendation,
  eventPrepFromSavedPack,
  parseEventPrep,
  splitEventPrepVendors,
  type EventPrep,
  type EventPrepVendor,
  type EventPrepVenue,
} from '@/lib/eventPrep';
import { seedBriefFromEvent, type SavedEventPack } from '@/lib/eventPlan';
import EventPrepListingModal, { type EventPrepPreviewTarget } from '@/components/EventPrepListingModal';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';

type OrgRoomOption = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
};

type PrepLaneId = 'venue' | 'trade' | 'rental';

const LANE_TONE: Record<PrepLaneId, { selected: string; icon: string; check: string }> = {
  venue: {
    selected: 'border-primary/30 bg-primary/5',
    icon: 'text-primary',
    check: 'text-primary',
  },
  trade: {
    selected: 'border-[color:color-mix(in_srgb,var(--festive-accent)_35%,var(--border))] bg-[var(--festive-accent-soft)]',
    icon: 'text-[color:var(--festive-accent)]',
    check: 'text-[color:var(--festive-accent)]',
  },
  rental: {
    selected: 'border-cyan-700/25 bg-cyan-700/5',
    icon: 'text-cyan-700 dark:text-cyan-400',
    check: 'text-cyan-700 dark:text-cyan-400',
  },
};

function inferPrepCity(location?: string): string {
  const raw = String(location || '').toLowerCase();
  if (raw.includes('lubumbashi') || raw.includes('l’shi') || raw.includes("l'shi") || raw.includes('lshi')) {
    return 'Lubumbashi';
  }
  if (raw.includes('kinshasa')) return 'Kinshasa';
  return normalizeRdcCity(location) || '';
}

function venueFromPublic(venue: PublicVenue): EventPrepVenue {
  return {
    slug: venue.slug,
    name: venue.name || venue.headline,
    headline: venue.headline,
    city: venue.city,
    address: venue.address,
    coverUrl: venue.coverUrl,
    orgName: venue.orgName,
    priceFromFc: venue.priceFromFc,
    capacity: venue.capacity,
  };
}

function vendorFromPublic(service: PublicService): EventPrepVendor {
  return {
    slug: service.slug,
    title: service.title,
    category: service.category,
    categoryLabel: service.categoryLabel,
    city: service.city,
    coverUrl: service.coverUrl,
    orgName: service.orgName,
    priceFromFc: service.priceFromFc,
  };
}

function Cover({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-[var(--radius-card)] overflow-hidden bg-surface-muted shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted">{fallback}</div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 min-w-0">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function FilterPills({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.id || 'all'}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'px-2.5 py-1 rounded-[var(--radius-button)] text-[11px] font-semibold border transition',
              value === option.id
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted hover:text-foreground hover:border-primary/40',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PrepLane({
  lane,
  dateKey,
  guestCount,
  defaultCity,
  selectedSlugs,
  onOpen,
  onRetainVenue,
  onRetainService,
}: {
  lane: PrepLaneId;
  dateKey: string;
  guestCount: number;
  defaultCity: string;
  selectedSlugs: string[];
  onOpen: (target: EventPrepPreviewTarget) => void;
  onRetainVenue: (venue: PublicVenue) => void;
  onRetainService: (service: PublicService) => void;
}) {
  const isVenue = lane === 'venue';
  const group = lane === 'rental' ? 'rental' : 'trade';
  const categories = lane === 'rental' ? SERVICE_RENTAL_CATEGORIES : SERVICE_TRADE_CATEGORIES;
  const Icon = isVenue ? Building2 : lane === 'rental' ? KeyRound : Sparkles;

  const [query, setQuery] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [commune, setCommune] = useState('');
  const [category, setCategory] = useState('');
  const [roomType, setRoomType] = useState('');
  const [mobility, setMobility] = useState<ServiceMobility>('');
  const [minCapacity, setMinCapacity] = useState(guestCount > 0 ? String(guestCount) : '');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [searching, setSearching] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    setCity(defaultCity);
  }, [defaultCity]);

  const communes = useMemo(() => communesForCity(city), [city]);
  const filterActive = Boolean(
    query.trim() || city || commune || category || roomType || mobility || minCapacity.trim(),
  );

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams();
        const q = query.trim();
        if (q) params.set('q', q);
        if (city) params.set('city', city);
        if (commune) params.set('commune', commune);
        if (dateKey) {
          params.set('availableFrom', dateKey);
          params.set('availableTo', dateKey);
        }
        if (isVenue) {
          if (roomType) params.set('roomType', roomType);
          if (minCapacity.trim()) params.set('minCapacity', minCapacity.trim());
          const data = (await api.get(`/public/venues${params.toString() ? `?${params}` : ''}`)) as { venues?: PublicVenue[] };
          setVenues(Array.isArray(data.venues) ? data.venues.slice(0, 12) : []);
          setServices([]);
        } else {
          params.set('group', group);
          if (category) params.set('category', category);
          if (mobility) params.set('mobility', mobility);
          const data = (await api.get(`/public/services?${params.toString()}`)) as { services?: PublicService[] };
          setServices(Array.isArray(data.services) ? data.services.slice(0, 12) : []);
          setVenues([]);
        }
      } catch {
        setVenues([]);
        setServices([]);
      } finally {
        setSearching(false);
      }
    }, query.trim() ? 280 : 60);
    return () => window.clearTimeout(handle);
  }, [query, city, commune, category, roomType, mobility, minCapacity, dateKey, group, isVenue]);

  const clearFilters = () => {
    setQuery('');
    setCity('');
    setCommune('');
    setCategory('');
    setRoomType('');
    setMobility('');
    setMinCapacity('');
  };

  const emptySearch = isVenue
    ? 'Aucune salle publique pour ces filtres.'
    : lane === 'rental'
      ? 'Aucune location publique pour ces filtres.'
      : 'Aucun métier public pour ces filtres.';

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isVenue
                ? 'Nom, quartier, organisation…'
                : lane === 'rental'
                  ? 'Habits, voiture, sono…'
                  : 'Traiteur, DJ, photo…'
            }
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant={showFilters ? 'secondary' : 'ghost'}
          leftIcon={<Filter className="w-3.5 h-3.5" />}
          onClick={() => setShowFilters((value) => !value)}
          className="shrink-0 self-start sm:self-auto"
        >
          Filtres
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showFilters && 'rotate-180')} />
        </Button>
      </div>

      <FilterPills
        label="Ville"
        value={city}
        onChange={(next) => {
          setCity(next);
          setCommune('');
        }}
        options={[
          { id: '', label: 'Toutes' },
          { id: 'Kinshasa', label: 'Kinshasa' },
          { id: 'Lubumbashi', label: 'Lubumbashi' },
        ]}
      />

      {showFilters ? (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3">
        <FilterSelect
          label="Commune"
          value={commune}
          onChange={setCommune}
        >
          <option value="">Toutes</option>
          {communes.map((item) => (
            <option key={item.name} value={item.name}>{item.name}</option>
          ))}
        </FilterSelect>
        {isVenue ? (
          <>
            <FilterSelect label="Type de salle" value={roomType} onChange={setRoomType}>
              <option value="">Tous</option>
              {ROOM_TYPE_FILTER_OPTIONS.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </FilterSelect>
            <label className="space-y-1 min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">Capacité min.</span>
              <Input
                type="number"
                min={1}
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder={guestCount > 0 ? String(guestCount) : 'Invités'}
              />
            </label>
          </>
        ) : (
          <>
            <FilterSelect label={lane === 'rental' ? 'Type de location' : 'Métier'} value={category} onChange={setCategory}>
              <option value="">{lane === 'rental' ? 'Tous les types' : 'Tous les métiers'}</option>
              {categories.map((item) => (
                <option key={item} value={item}>{SERVICE_CATEGORY_LABELS[item]}</option>
              ))}
            </FilterSelect>
            <FilterPills
              label={lane === 'rental' ? 'Livraison' : 'Intervention'}
              value={mobility}
              onChange={(next) => setMobility(next as ServiceMobility)}
              options={SERVICE_MOBILITY_OPTIONS.map((item) => ({
                id: item.id,
                label: lane === 'rental'
                  ? item.id === 'travels'
                    ? 'Livraison'
                    : item.id === 'on_site'
                      ? 'À récupérer'
                      : 'Tous'
                  : item.label,
              }))}
            />
          </>
        )}
      </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted">
          {searching
            ? 'Recherche…'
            : `${isVenue ? venues.length : services.length} résultat${(isVenue ? venues.length : services.length) > 1 ? 's' : ''}`}
          {dateKey ? ' · disponibles à la date de l’événement' : ''}
        </p>
        {filterActive ? (
          <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-primary hover:underline">
            Réinitialiser les filtres
          </button>
        ) : null}
      </div>

      <ul className="space-y-1.5 max-h-[28rem] overflow-y-auto">
        {searching ? (
          <li className="text-xs text-muted px-1 py-3 inline-flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Chargement du marketplace…
          </li>
        ) : (isVenue ? venues : services).length === 0 ? (
          <li>
            <EmptyState
              className="py-8"
              title={emptySearch}
              description="Élargissez la ville ou réinitialisez les filtres."
            />
          </li>
        ) : isVenue ? (
          venues.map((venue) => {
            const already = selectedSlugs.includes(venue.slug);
            return (
              <li key={venue.slug}>
                <ResultRow
                  tone={lane}
                  cover={venue.coverUrl}
                  icon={<Icon className="w-4 h-4" />}
                  title={venue.name || venue.headline}
                  meta={[venue.orgName, formatLocationLine(venue) || venue.city, venue.capacity ? `${venue.capacity} places` : null]}
                  price={venue.priceFromFc}
                  already={already}
                  onDetails={() => onOpen({ kind: 'venue', slug: venue.slug })}
                  onRetain={() => onRetainVenue(venue)}
                />
              </li>
            );
          })
        ) : (
          services.map((service) => {
            const already = selectedSlugs.includes(service.slug);
            return (
              <li key={service.slug}>
                <ResultRow
                  tone={lane}
                  cover={service.coverUrl}
                  icon={<Icon className="w-4 h-4" />}
                  title={service.title}
                  meta={[service.categoryLabel, service.orgName, formatLocationLine(service) || service.city]}
                  price={service.priceFromFc}
                  already={already}
                  onDetails={() => onOpen({ kind: 'service', slug: service.slug })}
                  onRetain={() => onRetainService(service)}
                />
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function ResultRow({
  tone,
  cover,
  icon,
  title,
  meta,
  price,
  already,
  onDetails,
  onRetain,
}: {
  tone: PrepLaneId;
  cover?: string | null;
  icon: React.ReactNode;
  title: string;
  meta: Array<string | null | undefined>;
  price?: number | null;
  already: boolean;
  onDetails: () => void;
  onRetain: () => void;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-[var(--radius-card)] border px-2.5 py-2',
        already ? LANE_TONE[tone].selected : 'border-border bg-surface',
      )}
    >
      <Cover src={cover} fallback={icon} />
      <button type="button" onClick={onDetails} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted truncate">{meta.filter(Boolean).join(' · ')}</p>
      </button>
      {already ? (
        <Check className={cn('w-4 h-4 shrink-0', LANE_TONE[tone].check)} />
      ) : price != null ? (
        <span className="text-[11px] font-semibold shrink-0 hidden sm:inline">{formatFc(price)}</span>
      ) : null}
      <button
        type="button"
        onClick={onDetails}
        className="p-1.5 rounded-[var(--radius-button)] text-muted hover:text-primary hover:bg-primary/5"
        title="Voir les détails"
      >
        <Eye className="w-4 h-4" />
      </button>
      <Button size="sm" variant={already ? 'secondary' : 'primary'} disabled={already} onClick={onRetain}>
        {already ? 'Retenu' : 'Retenir'}
      </Button>
    </div>
  );
}

export default function EventPrepPanel({
  eventId,
  value,
  eventLocation,
  eventDate,
  eventTitle,
  guestCount = 0,
  orgRooms,
  currentRoomId,
  onSaved,
}: {
  eventId: string;
  value: unknown;
  eventLocation?: string;
  eventDate?: string;
  eventTitle?: string;
  guestCount?: number;
  orgRooms: OrgRoomOption[];
  currentRoomId?: string | null;
  onSaved: (event: { eventPrep?: unknown; roomId?: string | null; location?: string }) => void;
}) {
  const [prep, setPrep] = useState<EventPrep>(() => parseEventPrep(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lane, setLane] = useState<PrepLaneId>('venue');
  const [preview, setPreview] = useState<EventPrepPreviewTarget | null>(null);
  const [savedPacks, setSavedPacks] = useState<SavedEventPack[]>([]);
  const persistSeq = useRef(0);
  const notesTimer = useRef<number | null>(null);
  const dateKey = eventDateKey(eventDate);
  const defaultCity = inferPrepCity(eventLocation);
  const { trades, rentals } = splitEventPrepVendors(prep.vendors);

  useEffect(() => {
    setPrep(parseEventPrep(value));
    setLane('venue');
    setPreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const persist = useCallback(
    async (next: EventPrep, extra?: { roomId?: string | null; location?: string }) => {
      if (notesTimer.current) {
        window.clearTimeout(notesTimer.current);
        notesTimer.current = null;
      }
      const seq = ++persistSeq.current;
      setPrep(next);
      setSaving(true);
      setError('');
      try {
        const updated = await api.put(`/events/${eventId}`, {
          eventPrep: next,
          ...extra,
        });
        if (seq !== persistSeq.current) return;
        onSaved(updated);
      } catch (err: unknown) {
        if (seq !== persistSeq.current) return;
        const message = err instanceof Error ? err.message : 'Impossible d’enregistrer la préparation.';
        setError(message);
      } finally {
        if (seq === persistSeq.current) setSaving(false);
      }
    },
    [eventId, onSaved],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = (await api.get('/marketplace/event-packs')) as { packs?: SavedEventPack[] };
        if (!cancelled) setSavedPacks(Array.isArray(data.packs) ? data.packs : []);
      } catch {
        if (!cancelled) setSavedPacks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onNotesChange = (notes: string) => {
    const next = { ...prep, notes: notes.slice(0, 2000) };
    setPrep(next);
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => {
      void persist(next);
    }, 600);
  };

  useEffect(() => () => {
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
  }, []);

  const retainVenue = (venue: PublicVenue) => {
    void persist({ ...prep, venue: venueFromPublic(venue) });
    setPreview(null);
  };

  const retainService = (service: PublicService) => {
    if (prep.vendors.some((item) => item.slug === service.slug)) {
      setPreview(null);
      return;
    }
    void persist({ ...prep, vendors: [...prep.vendors, vendorFromPublic(service)] });
    setPreview(null);
  };

  const removeVendor = (slug: string) => {
    void persist({ ...prep, vendors: prep.vendors.filter((item) => item.slug !== slug) });
    if (preview?.slug === slug) setPreview(null);
  };

  const previewSelected = Boolean(
    preview
      && (preview.kind === 'venue'
        ? prep.venue?.slug === preview.slug
        : prep.vendors.some((item) => item.slug === preview.slug)),
  );

  const tabs: Array<{ id: PrepLaneId; label: string; count: number; icon: typeof Building2; hint: string }> = [
    { id: 'venue', label: 'Salle', count: prep.venue ? 1 : 0, icon: Building2, hint: 'Le lieu — 1 choix' },
    { id: 'trade', label: 'Métiers', count: trades.length, icon: Sparkles, hint: 'Le savoir-faire' },
    { id: 'rental', label: 'Locations', count: rentals.length, icon: KeyRound, hint: 'Le bien loué' },
  ];
  const estimate = eventPrepEstimateFc(prep);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Préparation</h2>
          <p className="text-sm text-muted">
            Filtrez salles, métiers et locations, ouvrez la fiche, retenez, puis demandez un devis rattaché à cet événement.
            {dateKey ? ` Date : ${new Date(`${dateKey}T12:00:00`).toLocaleDateString('fr-FR')}.` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saving ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Enregistrement…
            </span>
          ) : (
            <span className="text-xs text-muted">Enregistré automatiquement</span>
          )}
          <Link
            href={`/dashboard/bookings?event=${encodeURIComponent(eventId)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[var(--radius-button)] border border-border hover:border-primary/40 hover:bg-primary/5 transition"
          >
            <Inbox className="w-3.5 h-3.5" />
            Devis & résas
          </Link>
          <Link
            href="/dashboard/catalogue?hub=plan"
            onClick={() =>
              seedBriefFromEvent({
                eventDate,
                location: eventLocation,
                guestCount,
              })
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-[var(--radius-button)] border border-border hover:border-primary/40 hover:bg-primary/5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Composer un pack
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-[var(--radius-card)] px-4 py-3">{error}</p>
      ) : null}

      <EventPrepAiSimulator
        defaults={{
          city: defaultCity,
          guestCount,
          eventDate: dateKey,
          eventTitle,
          keepVenueSlug: prep.venue?.slug,
          keepServiceSlugs: prep.vendors.map((item) => item.slug),
        }}
        onApply={(result) => void persist(eventPrepFromAiRecommendation(result, prep))}
      />

      <Card>
        <CardHeader
          title="Retenus pour cet événement"
          description={
            estimate.totalItems === 0
              ? 'Parcourez le catalogue ci-dessous et retenez une salle, des métiers et des locations.'
              : estimate.priced > 0
                ? `À partir de ${formatFc(estimate.total)} · ${estimate.totalItems} fiche${estimate.totalItems > 1 ? 's' : ''}`
                : `${estimate.totalItems} fiche${estimate.totalItems > 1 ? 's' : ''} retenue${estimate.totalItems > 1 ? 's' : ''}`
          }
          action={
            (prep.venue || prep.vendors.length > 0 || prep.notes) ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => void persist(emptyEventPrep())}>
                Tout vider
              </Button>
            ) : null
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RetainedColumn
            tone="venue"
            label="Salle"
            icon={<Building2 className="w-3.5 h-3.5" />}
            empty="Aucune salle retenue"
            onBrowse={() => setLane('venue')}
          >
            {prep.venue ? (
              <SelectedCard
                tone="venue"
                cover={prep.venue.coverUrl}
                icon={<Building2 className="w-4 h-4" />}
                title={prep.venue.name}
                meta={[prep.venue.orgName, prep.venue.city, prep.venue.capacity ? `${prep.venue.capacity} places` : null]}
                price={prep.venue.priceFromFc}
                onDetails={() => {
                  setLane('venue');
                  setPreview({ kind: 'venue', slug: prep.venue!.slug });
                }}
                onRemove={() => void persist({ ...prep, venue: null })}
              />
            ) : null}
          </RetainedColumn>
          <RetainedColumn
            tone="trade"
            label="Métiers"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            empty="Aucun métier retenu"
            onBrowse={() => setLane('trade')}
          >
            {trades.map((vendor) => (
              <SelectedCard
                key={vendor.slug}
                tone="trade"
                cover={vendor.coverUrl}
                icon={<Sparkles className="w-4 h-4" />}
                title={vendor.title}
                meta={[vendor.categoryLabel, vendor.orgName, vendor.city]}
                price={vendor.priceFromFc}
                onDetails={() => {
                  setLane('trade');
                  setPreview({ kind: 'service', slug: vendor.slug });
                }}
                onRemove={() => removeVendor(vendor.slug)}
              />
            ))}
          </RetainedColumn>
          <RetainedColumn
            tone="rental"
            label="Locations"
            icon={<KeyRound className="w-3.5 h-3.5" />}
            empty="Aucune location retenue"
            onBrowse={() => setLane('rental')}
          >
            {rentals.map((vendor) => (
              <SelectedCard
                key={vendor.slug}
                tone="rental"
                cover={vendor.coverUrl}
                icon={<KeyRound className="w-4 h-4" />}
                title={vendor.title}
                meta={[vendor.categoryLabel, vendor.orgName, vendor.city]}
                price={vendor.priceFromFc}
                onDetails={() => {
                  setLane('rental');
                  setPreview({ kind: 'service', slug: vendor.slug });
                }}
                onRemove={() => removeVendor(vendor.slug)}
              />
            ))}
          </RetainedColumn>
        </div>
        {prep.venue || prep.vendors.length > 0 ? (
          <p className="text-xs text-muted flex items-start gap-1.5 mt-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Pistes uniquement : ouvrez une fiche, retenez, puis demandez un devis. Rien n’est réservé automatiquement.
          </p>
        ) : null}
      </Card>

      {savedPacks.length > 0 ? (
        <details className="group bg-surface border border-border rounded-[var(--radius-card)]">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground tracking-tight">
              <Bookmark className="w-4 h-4 text-primary" />
              Packs enregistrés
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{savedPacks.length}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-5 pb-4 space-y-2">
            <p className="text-xs text-muted">Appliquez un pack déjà simulé : salle, métiers et locations se remplissent ici, sans réserver.</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {savedPacks.slice(0, 6).map((pack) => (
                <li key={pack.id}>
                  <button
                    type="button"
                    onClick={() => void persist(eventPrepFromSavedPack(pack, prep))}
                    className="w-full text-left rounded-[var(--radius-card)] border border-border px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition"
                  >
                    <p className="text-sm font-semibold truncate">{pack.name}</p>
                    <p className="text-[11px] text-muted truncate">
                      {formatFc(pack.totalFc)}
                      {pack.venue ? ` · ${pack.venue.title}` : ''}
                      {pack.services.length ? ` · ${pack.services.length} fiche${pack.services.length > 1 ? 's' : ''}` : ''}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      <Card padding="none">
        <div className="flex flex-wrap gap-1 p-2 border-b border-border bg-surface-muted/50">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const active = lane === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setLane(tab.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] text-sm font-semibold transition',
                  active ? 'bg-surface text-foreground shadow-sm border border-border' : 'text-muted hover:text-foreground',
                )}
              >
                <TabIcon className={cn('w-4 h-4', active ? LANE_TONE[tab.id].icon : '')} />
                {tab.label}
                <span className={cn(
                  'min-w-5 h-5 px-1 rounded-full text-[10px] inline-flex items-center justify-center',
                  tab.count > 0 ? 'bg-primary text-white' : 'bg-surface-muted text-muted',
                )}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-muted">{tabs.find((tab) => tab.id === lane)?.hint}</p>

          <div className={lane === 'venue' ? 'space-y-4' : 'hidden'}>
            {orgRooms.length > 0 ? (
              <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/40 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Salle de l’organisation</p>
                <p className="text-xs text-muted">Liez une de vos salles pour importer le plan 2D. Indépendant du choix marketplace.</p>
                <select
                  value={currentRoomId || ''}
                  onChange={(e) => {
                    const roomId = e.target.value || null;
                    void persist(prep, { roomId });
                  }}
                  className="w-full sm:max-w-md rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="">Aucune salle liée</option>
                  {orgRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                      {room.capacity ? ` · ${room.capacity} places` : ''}
                      {room.location ? ` · ${room.location}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <PrepLane
              lane="venue"
              dateKey={dateKey}
              guestCount={guestCount}
              defaultCity={defaultCity}
              selectedSlugs={prep.venue ? [prep.venue.slug] : []}
              onOpen={setPreview}
              onRetainVenue={retainVenue}
              onRetainService={retainService}
            />
          </div>

          <div className={lane === 'trade' ? 'space-y-4' : 'hidden'}>
            <PrepLane
              lane="trade"
              dateKey={dateKey}
              guestCount={guestCount}
              defaultCity={defaultCity}
              selectedSlugs={prep.vendors.map((item) => item.slug)}
              onOpen={setPreview}
              onRetainVenue={retainVenue}
              onRetainService={retainService}
            />
          </div>

          <div className={lane === 'rental' ? 'space-y-4' : 'hidden'}>
            <PrepLane
              lane="rental"
              dateKey={dateKey}
              guestCount={guestCount}
              defaultCity={defaultCity}
              selectedSlugs={prep.vendors.map((item) => item.slug)}
              onOpen={setPreview}
              onRetainVenue={retainVenue}
              onRetainService={retainService}
            />
          </div>
        </div>
      </Card>

      <Card>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="event-prep-notes">
          Notes de préparation
        </label>
        <textarea
          id="event-prep-notes"
          value={prep.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Budget visé, horaires, contraintes logistiques… (optionnel)"
          className="mt-2 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[4.5rem]"
        />
      </Card>

      <EventPrepListingModal
        target={preview}
        selected={previewSelected}
        dateKey={dateKey}
        guestCount={guestCount}
        eventTitle={eventTitle}
        eventId={eventId}
        onClose={() => setPreview(null)}
        onRetainVenue={retainVenue}
        onRetainService={retainService}
        onRemove={() => {
          if (!preview) return;
          if (preview.kind === 'venue') void persist({ ...prep, venue: null });
          else removeVendor(preview.slug);
        }}
      />
    </div>
  );
}

function RetainedColumn({
  tone,
  label,
  icon,
  empty,
  onBrowse,
  children,
}: {
  tone: PrepLaneId;
  label: string;
  icon: React.ReactNode;
  empty: string;
  onBrowse: () => void;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted/30 p-3 space-y-2 min-h-[7.5rem]">
      <p className={cn('text-[10px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5', LANE_TONE[tone].icon)}>
        {icon}
        {label}
        <span className="text-muted font-semibold">· {items.length}</span>
      </p>
      {items.length > 0 ? (
        <div className="space-y-1.5">{children}</div>
      ) : (
        <button
          type="button"
          onClick={onBrowse}
          className="w-full text-left text-xs text-muted hover:text-foreground rounded-[var(--radius-button)] border border-dashed border-border px-3 py-4 transition"
        >
          {empty}
          <span className="block mt-0.5 font-semibold text-primary">Parcourir</span>
        </button>
      )}
    </div>
  );
}

function SelectedCard({
  tone,
  cover,
  icon,
  title,
  meta,
  price,
  onDetails,
  onRemove,
}: {
  tone: PrepLaneId;
  cover?: string | null;
  icon: React.ReactNode;
  title: string;
  meta: Array<string | null | undefined>;
  price?: number | null;
  onDetails: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn('flex items-center gap-2.5 rounded-[var(--radius-card)] border px-2 py-1.5', LANE_TONE[tone].selected)}>
      <Cover src={cover} fallback={icon} />
      <button type="button" onClick={onDetails} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted truncate">
          {meta.filter(Boolean).join(' · ')}
          {price != null ? ` · ${formatFc(price)}` : ''}
        </p>
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 rounded-[var(--radius-button)] text-muted hover:text-rose-600"
        title="Retirer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

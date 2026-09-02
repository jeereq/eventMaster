'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Bookmark,
  Building2,
  CalendarCheck,
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
import { Button, Card, CardHeader, EmptyState, Input, StatusPill } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  formatLocationLine,
  matchPrepListingPipeline,
  prepListingCanBook,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type PrepListingPipeline,
  type PublicService,
  type PublicVenue,
  type ServiceMobility,
} from '@/lib/marketplace';
import { ROOM_TYPE_FILTER_OPTIONS } from '@/lib/catalogueEntityFilters';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import {
  applyPackToEventPrepBasket,
  emptyEventPrepBasket,
  eventDateKey,
  eventPrepBasket,
  eventPrepBasketCount,
  eventPrepEstimateFc,
  eventPrepFromAiRecommendation,
  groupEventPrepBasketByVendor,
  parseEventPrep,
  splitEventPrepVendors,
  withEventPrepBasket,
  type EventPrep,
  type EventPrepBasket,
  type EventPrepVendor,
  type EventPrepVendorGroup,
  type EventPrepVenue,
  type EventPrepViewId,
} from '@/lib/eventPrep';
import { seedBriefFromEvent, type SavedEventPack } from '@/lib/eventPlan';
import EventPrepListingModal, {
  type EventPrepListingView,
  type EventPrepPreviewTarget,
} from '@/components/EventPrepListingModal';
import EventPrepVendorSheet from '@/components/EventPrepVendorSheet';
import EventPrepAiSimulator from '@/components/EventPrepAiSimulator';
import EventPlanMethodPicker from '@/components/EventPlanMethodPicker';

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
    orgSlug: venue.orgSlug || null,
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
    orgSlug: service.orgSlug || null,
    priceFromFc: service.priceFromFc,
  };
}

function Cover({ src, fallback, alt = 'Visuel' }: { src?: string | null; fallback: React.ReactNode; alt?: string }) {
  return (
    <div className="w-12 h-12 rounded-[var(--radius-card)] overflow-hidden bg-surface-muted shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
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
      : 'Aucun prestataire public pour ces filtres.';

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
            <FilterSelect label={lane === 'rental' ? 'Type de location' : 'Prestataire'} value={category} onChange={setCategory}>
              <option value="">{lane === 'rental' ? 'Tous les types' : 'Tous les prestataires'}</option>
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
  const [previewView, setPreviewView] = useState<EventPrepListingView>('details');
  const [vendorSheet, setVendorSheet] = useState<EventPrepVendorGroup | null>(null);
  const [savedPacks, setSavedPacks] = useState<SavedEventPack[]>([]);
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const persistSeq = useRef(0);
  const notesTimer = useRef<number | null>(null);
  const dateKey = eventDateKey(eventDate);
  const defaultCity = inferPrepCity(eventLocation);
  const view: EventPrepViewId = prep.activeView === 'ai' || prep.activeView === 'final' ? prep.activeView : 'manual';
  const working = eventPrepBasket(prep, view);
  const { trades, rentals } = splitEventPrepVendors(working.vendors);
  const vendorGroups = useMemo(() => groupEventPrepBasketByVendor(working), [working]);
  const manualCount = eventPrepBasketCount(eventPrepBasket(prep, 'manual'));
  const aiCount = eventPrepBasketCount(eventPrepBasket(prep, 'ai'));
  const finalCount = eventPrepBasketCount(eventPrepBasket(prep, 'final'));
  const router = useRouter();
  const searchParams = useSearchParams();

  const pipelineFor = useCallback(
    (slug: string, kind: 'venue' | 'service') => matchPrepListingPipeline(slug, kind, inquiries, bookings),
    [inquiries, bookings],
  );

  const openPreview = (target: EventPrepPreviewTarget, view: EventPrepListingView = 'details') => {
    setPreviewView(view);
    setPreview(target);
  };

  useEffect(() => {
    setPrep(parseEventPrep(value));
    setLane('venue');
    setPreview(null);
    setPreviewView('details');
    setVendorSheet(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const reloadPipeline = useCallback(async () => {
    try {
      const [inq, book] = await Promise.all([
        api.get('/marketplace/inquiries?role=organizer') as Promise<{ inquiries?: MarketplaceInquiryItem[] }>,
        api.get('/marketplace/bookings?role=organizer') as Promise<{ bookings?: MarketplaceBookingItem[] }>,
      ]);
      setInquiries((inq.inquiries || []).filter((item) => item.event?.id === eventId));
      setBookings((book.bookings || []).filter((item) => item.event?.id === eventId));
    } catch {
      setInquiries([]);
      setBookings([]);
    }
  }, [eventId]);

  useEffect(() => {
    void reloadPipeline();
  }, [reloadPipeline]);

  useEffect(() => {
    const listing = searchParams.get('listing');
    const offer = searchParams.get('offer');
    const action = searchParams.get('action');
    if (!listing && !offer) return;
    openPreview(
      listing ? { kind: 'venue', slug: listing } : { kind: 'service', slug: offer! },
      action === 'book' || action === 'inquire' ? action : 'details',
    );
    const next = new URLSearchParams(searchParams.toString());
    next.delete('listing');
    next.delete('offer');
    next.delete('action');
    if (!next.get('tab')) next.set('tab', 'prep');
    router.replace(`?${next.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, searchParams]);

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

  const persistBasket = (target: EventPrepViewId, basket: EventPrepBasket) => {
    void persist(withEventPrepBasket(prep, target, basket));
  };

  const retainTarget = (): Exclude<EventPrepViewId, 'final'> => (view === 'ai' ? 'ai' : 'manual');

  const onNotesChange = (notes: string) => {
    const next = withEventPrepBasket(prep, view, { ...working, notes: notes.slice(0, 2000) });
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
    const target = retainTarget();
    persistBasket(target, { ...eventPrepBasket(prep, target), venue: venueFromPublic(venue) });
    setPreview(null);
  };

  const retainService = (service: PublicService) => {
    const target = retainTarget();
    const basket = eventPrepBasket(prep, target);
    if (basket.vendors.some((item) => item.slug === service.slug)) {
      setPreview(null);
      return;
    }
    persistBasket(target, { ...basket, vendors: [...basket.vendors, vendorFromPublic(service)] });
    setPreview(null);
  };

  const removeVendor = (slug: string) => {
    persistBasket(view, { ...working, vendors: working.vendors.filter((item) => item.slug !== slug) });
    if (preview?.slug === slug) setPreview(null);
  };

  const previewSelected = Boolean(
    preview
      && (preview.kind === 'venue'
        ? working.venue?.slug === preview.slug
        : working.vendors.some((item) => item.slug === preview.slug)),
  );

  const tabs: Array<{ id: PrepLaneId; label: string; count: number; icon: typeof Building2; hint: string }> = [
    { id: 'venue', label: 'Salle', count: working.venue ? 1 : 0, icon: Building2, hint: 'Le lieu — 1 choix' },
    { id: 'trade', label: 'Métiers', count: trades.length, icon: Sparkles, hint: 'Le savoir-faire' },
    { id: 'rental', label: 'Locations', count: rentals.length, icon: KeyRound, hint: 'Le bien loué' },
  ];
  const estimate = eventPrepEstimateFc(working);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Préparation</h2>
          <p className="text-sm text-muted">
            Choisissez comment simuler (par critères ou avec l’IA), puis composez la solution finale pour les devis.
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

      <EventPlanMethodPicker
        value={view}
        onChange={(next) => void persist({ ...prep, activeView: next })}
        counts={{ manual: manualCount, ai: aiCount, final: finalCount }}
      />

      <div className="space-y-5">
      {view === 'ai' ? (
        <EventPrepAiSimulator
          defaultOpen
          applyLabel="Retenir dans la simulation IA"
          defaults={{
            city: defaultCity,
            guestCount,
            eventDate: dateKey,
            eventTitle,
            keepVenueSlug: eventPrepBasket(prep, 'ai').venue?.slug || eventPrepBasket(prep, 'manual').venue?.slug,
            keepServiceSlugs: [
              ...eventPrepBasket(prep, 'ai').vendors,
              ...eventPrepBasket(prep, 'manual').vendors,
            ].map((item) => item.slug),
          }}
          onApply={(pack) => void persist(eventPrepFromAiRecommendation({
            summary: pack.summary || pack.label,
            venue: pack.venue,
            services: pack.services,
          }, prep))}
          onOpenListing={(target) => openPreview(target)}
        />
      ) : null}

      {view === 'final' ? (
        <PrepFinalComposer
          prep={prep}
          onApply={(basket) => persistBasket('final', basket)}
        />
      ) : null}

      <Card>
        <CardHeader
          title={
            view === 'ai'
              ? 'Retenus — simulation IA'
              : view === 'final'
                ? 'Solution finale'
                : 'Retenus — sans IA'
          }
          description={
            estimate.totalItems === 0
              ? view === 'final'
                ? 'Choisissez ci-dessus les options des deux simulations, puis appliquez.'
                : view === 'ai'
                  ? 'Lancez une simulation IA, puis retenez le mix proposé.'
                  : 'Parcourez le catalogue et retenez une salle, des prestataires et des locations.'
              : estimate.priced > 0
                ? `À partir de ${formatFc(estimate.total)} · ${estimate.totalItems} fiche${estimate.totalItems > 1 ? 's' : ''}`
                : `${estimate.totalItems} fiche${estimate.totalItems > 1 ? 's' : ''} retenue${estimate.totalItems > 1 ? 's' : ''}`
          }
          action={
            (working.venue || working.vendors.length > 0 || working.notes) ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => persistBasket(view, emptyEventPrepBasket())}>
                Vider cette vue
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
            onBrowse={() => {
              if (view === 'final') void persist({ ...prep, activeView: 'manual' });
              setLane('venue');
            }}
          >
            {working.venue ? (
              <SelectedCard
                tone="venue"
                cover={working.venue.coverUrl}
                icon={<Building2 className="w-4 h-4" />}
                title={working.venue.name}
                meta={[working.venue.orgName, working.venue.city, working.venue.capacity ? `${working.venue.capacity} places` : null]}
                price={working.venue.priceFromFc}
                pipeline={pipelineFor(working.venue.slug, 'venue')}
                onDetails={() => {
                  setLane('venue');
                  openPreview({ kind: 'venue', slug: working.venue!.slug });
                }}
                onBook={() => {
                  setLane('venue');
                  openPreview({ kind: 'venue', slug: working.venue!.slug }, 'book');
                }}
                onRemove={() => persistBasket(view, { ...working, venue: null })}
              />
            ) : null}
          </RetainedColumn>
          <RetainedColumn
            tone="trade"
            label="Prestataires"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            empty="Aucun prestataire retenu"
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
                pipeline={pipelineFor(vendor.slug, 'service')}
                onDetails={() => {
                  setLane('trade');
                  openPreview({ kind: 'service', slug: vendor.slug });
                }}
                onBook={() => {
                  setLane('trade');
                  openPreview({ kind: 'service', slug: vendor.slug }, 'book');
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
                pipeline={pipelineFor(vendor.slug, 'service')}
                onDetails={() => {
                  setLane('rental');
                  openPreview({ kind: 'service', slug: vendor.slug });
                }}
                onBook={() => {
                  setLane('rental');
                  openPreview({ kind: 'service', slug: vendor.slug }, 'book');
                }}
                onRemove={() => removeVendor(vendor.slug)}
              />
            ))}
          </RetainedColumn>
        </div>
        {vendorGroups.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Par prestataire</p>
            <ul className="space-y-2">
              {vendorGroups.map((group) => {
                const offers = [
                  ...(group.venue
                    ? [{
                        key: `venue:${group.venue.slug}`,
                        kind: 'venue' as const,
                        lane: 'venue' as PrepLaneId,
                        slug: group.venue.slug,
                        title: group.venue.name,
                        price: group.venue.priceFromFc,
                      }]
                    : []),
                  ...group.vendors.map((vendor) => ({
                    key: vendor.slug,
                    kind: 'service' as const,
                    lane: (vendor.category.startsWith('RENTAL_') ? 'rental' : 'trade') as PrepLaneId,
                    slug: vendor.slug,
                    title: vendor.title,
                    price: vendor.priceFromFc,
                  })),
                ];
                const pipelines = offers.map((offer) => pipelineFor(offer.slug, offer.kind));
                const missing = pipelines.filter((item) => item.stage === 'none').length;
                const booked = pipelines.filter((item) => item.stage === 'booking').length;
                return (
                  <li key={group.key} className="rounded-[var(--radius-card)] border border-border px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setVendorSheet(group)}
                        className="min-w-0 text-left"
                      >
                        <p className="text-sm font-semibold truncate">{group.orgName}</p>
                        <p className="text-[11px] text-muted">
                          {offers.length} offre{offers.length > 1 ? 's' : ''}
                          {booked ? ` · ${booked} résa` : ''}
                          {missing ? ` · ${missing} sans devis` : ''}
                        </p>
                      </button>
                      <Button size="sm" variant="secondary" onClick={() => setVendorSheet(group)}>
                        Fiche
                      </Button>
                    </div>
                    {offers.map((offer) => {
                      const pipeline = pipelineFor(offer.slug, offer.kind);
                      return (
                        <button
                          key={offer.key}
                          type="button"
                          onClick={() => {
                            setLane(offer.lane);
                            openPreview({ kind: offer.kind, slug: offer.slug });
                          }}
                          className="w-full flex items-center justify-between gap-2 text-left text-xs hover:text-primary"
                        >
                          <span className="truncate">{offer.title}</span>
                          {pipeline.stage !== 'none' ? (
                            <StatusPill tone={pipeline.tone} className="shrink-0">{pipeline.label}</StatusPill>
                          ) : offer.price != null ? (
                            <span className="text-muted shrink-0">{formatFc(offer.price)}</span>
                          ) : (
                            <span className="text-muted shrink-0">Sur devis</span>
                          )}
                        </button>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
        {working.venue || working.vendors.length > 0 ? (
          <p className="text-xs text-muted flex items-start gap-1.5 mt-3">
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {view === 'final'
              ? 'Cette solution alimente les devis, réservations et tâches générées.'
              : 'Ces retenus appartiennent à cette simulation. Composez la solution finale dans l’onglet dédié.'}
          </p>
        ) : null}
      </Card>

      {view === 'manual' && savedPacks.length > 0 ? (
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
            <p className="text-xs text-muted">Appliquez un pack déjà simulé : salle, prestataires et locations se remplissent ici, sans réserver.</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {savedPacks.slice(0, 6).map((pack) => (
                <li key={pack.id} className="rounded-[var(--radius-card)] border border-border px-3 py-2.5 space-y-2">
                  <div>
                    <p className="text-sm font-semibold truncate">{pack.name}</p>
                    <p className="text-[11px] text-muted truncate">{formatFc(pack.totalFc)}</p>
                  </div>
                  {pack.items.length > 0 ? (
                    <ul className="space-y-1">
                      {pack.items.slice(0, 6).map((item) => (
                        <li key={`${pack.id}:${item.kind}:${item.slug}`}>
                          <button
                            type="button"
                            onClick={() => openPreview({ kind: item.kind, slug: item.slug })}
                            className="w-full text-left text-xs font-medium truncate hover:text-primary"
                          >
                            {item.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => persistBasket('manual', applyPackToEventPrepBasket(pack, eventPrepBasket(prep, 'manual')))}
                  >
                    Appliquer ce pack
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      {view === 'manual' ? (
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
              selectedSlugs={working.venue ? [working.venue.slug] : []}
              onOpen={(target) => openPreview(target)}
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
              selectedSlugs={working.vendors.map((item) => item.slug)}
              onOpen={(target) => openPreview(target)}
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
              selectedSlugs={working.vendors.map((item) => item.slug)}
              onOpen={(target) => openPreview(target)}
              onRetainVenue={retainVenue}
              onRetainService={retainService}
            />
          </div>
        </div>
      </Card>
      ) : null}

      <Card>
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted" htmlFor="event-prep-notes">
          Notes {view === 'final' ? 'de la solution' : view === 'ai' ? 'de la simulation IA' : 'de la simulation'}
        </label>
        <textarea
          id="event-prep-notes"
          value={working.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Budget visé, horaires, contraintes logistiques… (optionnel)"
          className="mt-2 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[4.5rem]"
        />
      </Card>
      </div>

      <EventPrepListingModal
        target={preview}
        selected={previewSelected}
        dateKey={dateKey}
        guestCount={guestCount}
        eventTitle={eventTitle}
        eventId={eventId}
        initialView={previewView}
        pipeline={preview ? pipelineFor(preview.slug, preview.kind) : null}
        onClose={() => {
          setPreview(null);
          setPreviewView('details');
        }}
        onRetainVenue={retainVenue}
        onRetainService={retainService}
        onRemove={() => {
          if (!preview) return;
          if (preview.kind === 'venue') persistBasket(view, { ...working, venue: null });
          else removeVendor(preview.slug);
        }}
        onPipelineChange={() => void reloadPipeline()}
      />
      <EventPrepVendorSheet
        group={vendorSheet}
        eventId={eventId}
        eventTitle={eventTitle}
        dateKey={dateKey}
        guestCount={guestCount}
        inquiries={inquiries}
        bookings={bookings}
        onClose={() => setVendorSheet(null)}
        onOpenListing={(target, view) => {
          if (target.kind === 'venue') setLane('venue');
          else {
            const vendor = working.vendors.find((item) => item.slug === target.slug);
            setLane(vendor?.category.startsWith('RENTAL_') ? 'rental' : 'trade');
          }
          setVendorSheet(null);
          openPreview(target, view);
        }}
        onPipelineChange={() => void reloadPipeline()}
      />
    </div>
  );
}

function PrepFinalComposer({
  prep,
  onApply,
}: {
  prep: EventPrep;
  onApply: (basket: EventPrepBasket) => void;
}) {
  const manual = eventPrepBasket(prep, 'manual');
  const ai = eventPrepBasket(prep, 'ai');
  const current = eventPrepBasket(prep, 'final');
  const [venueSource, setVenueSource] = useState<'none' | 'manual' | 'ai' | 'current'>(() => {
    if (current.venue) {
      if (manual.venue?.slug === current.venue.slug) return 'manual';
      if (ai.venue?.slug === current.venue.slug) return 'ai';
      return 'current';
    }
    if (manual.venue) return 'manual';
    if (ai.venue) return 'ai';
    return 'none';
  });
  const vendorOptions = useMemo(() => {
    const map = new Map<string, { slug: string; manual?: EventPrepVendor; ai?: EventPrepVendor }>();
    for (const vendor of manual.vendors) {
      map.set(vendor.slug, { slug: vendor.slug, manual: vendor });
    }
    for (const vendor of ai.vendors) {
      const existing = map.get(vendor.slug) || { slug: vendor.slug };
      existing.ai = vendor;
      map.set(vendor.slug, existing);
    }
    return [...map.values()];
  }, [manual.vendors, ai.vendors]);
  const [vendorPicks, setVendorPicks] = useState<Record<string, 'none' | 'manual' | 'ai'>>(() => {
    const next: Record<string, 'none' | 'manual' | 'ai'> = {};
    const currentSlugs = new Set(current.vendors.map((item) => item.slug));
    const options: Array<{ slug: string; manual?: EventPrepVendor; ai?: EventPrepVendor }> = [];
    const map = new Map<string, { slug: string; manual?: EventPrepVendor; ai?: EventPrepVendor }>();
    for (const vendor of manual.vendors) map.set(vendor.slug, { slug: vendor.slug, manual: vendor });
    for (const vendor of ai.vendors) {
      const existing = map.get(vendor.slug) || { slug: vendor.slug };
      existing.ai = vendor;
      map.set(vendor.slug, existing);
    }
    options.push(...map.values());
    for (const option of options) {
      if (currentSlugs.has(option.slug)) {
        next[option.slug] = option.manual ? 'manual' : 'ai';
      } else {
        next[option.slug] = 'none';
      }
    }
    return next;
  });

  const compose = (source: 'manual' | 'ai') => {
    onApply(source === 'ai' ? { ...ai } : { ...manual });
  };

  const applyMix = () => {
    const venue =
      venueSource === 'manual' ? manual.venue
        : venueSource === 'ai' ? ai.venue
          : venueSource === 'current' ? current.venue
            : null;
    const vendors: EventPrepVendor[] = [];
    const seen = new Set<string>();
    for (const option of vendorOptions) {
      const pick = vendorPicks[option.slug] || 'none';
      const vendor = pick === 'manual' ? option.manual : pick === 'ai' ? option.ai : undefined;
      if (!vendor || seen.has(vendor.slug)) continue;
      seen.add(vendor.slug);
      vendors.push(vendor);
    }
    const notes = [manual.notes, ai.notes].filter(Boolean).join('\n').slice(0, 2000) || current.notes;
    onApply({ venue, vendors, notes });
  };

  const empty = eventPrepBasketCount(manual) === 0 && eventPrepBasketCount(ai) === 0;

  return (
    <Card>
      <CardHeader
        title="Composer la solution finale"
        description="Reprenez toute une simulation, ou mélangez salle et prestataires des deux vues."
      />
      {empty ? (
        <p className="text-sm text-muted">Retenez d’abord des options dans la simulation sans IA ou avec IA.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={eventPrepBasketCount(manual) === 0} onClick={() => compose('manual')}>
              Reprendre toute la simulation sans IA
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={eventPrepBasketCount(ai) === 0} onClick={() => compose('ai')}>
              Reprendre toute la simulation IA
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Salle</p>
            <div className="flex flex-wrap gap-2">
              {([
                { id: 'none' as const, label: 'Aucune' },
                ...(manual.venue ? [{ id: 'manual' as const, label: `Sans IA · ${manual.venue.name}` }] : []),
                ...(ai.venue ? [{ id: 'ai' as const, label: `IA · ${ai.venue.name}` }] : []),
                ...(current.venue && current.venue.slug !== manual.venue?.slug && current.venue.slug !== ai.venue?.slug
                  ? [{ id: 'current' as const, label: `Actuelle · ${current.venue.name}` }]
                  : []),
              ]).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVenueSource(option.id)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-[var(--radius-button)] text-[11px] font-semibold border transition',
                    venueSource === option.id
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-muted hover:text-foreground',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {vendorOptions.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Métiers & locations</p>
              <ul className="space-y-1.5">
                {vendorOptions.map((option) => {
                  const pick = vendorPicks[option.slug] || 'none';
                  const label = option.manual?.title || option.ai?.title || option.slug;
                  return (
                    <li key={option.slug} className="flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-border px-3 py-2">
                      <span className="text-sm font-semibold min-w-0 flex-1 truncate">{label}</span>
                      {(['none', 'manual', 'ai'] as const).map((id) => {
                        if (id === 'manual' && !option.manual) return null;
                        if (id === 'ai' && !option.ai) return null;
                        const caption = id === 'none' ? 'Ignorer' : id === 'manual' ? 'Sans IA' : 'IA';
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setVendorPicks((prev) => ({ ...prev, [option.slug]: id }))}
                            className={cn(
                              'px-2 py-1 rounded-[var(--radius-button)] text-[10px] font-semibold border',
                              pick === id ? 'bg-primary text-white border-primary' : 'border-border text-muted',
                            )}
                          >
                            {caption}
                          </button>
                        );
                      })}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <Button type="button" onClick={applyMix}>
            Appliquer ce mix à la solution finale
          </Button>
        </div>
      )}
    </Card>
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
  pipeline,
  onDetails,
  onBook,
  onRemove,
}: {
  tone: PrepLaneId;
  cover?: string | null;
  icon: React.ReactNode;
  title: string;
  meta: Array<string | null | undefined>;
  price?: number | null;
  pipeline?: PrepListingPipeline;
  onDetails: () => void;
  onBook?: () => void;
  onRemove: () => void;
}) {
  const canBook = onBook && prepListingCanBook(price, pipeline);
  return (
    <div className={cn('flex items-center gap-2.5 rounded-[var(--radius-card)] border px-2 py-1.5', LANE_TONE[tone].selected)}>
      <Cover src={cover} fallback={icon} />
      <button type="button" onClick={onDetails} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold truncate">{title}</p>
        <p className="text-[11px] text-muted truncate">
          {meta.filter(Boolean).join(' · ')}
          {price != null ? ` · ${formatFc(price)}` : ''}
        </p>
        {pipeline && pipeline.stage !== 'none' ? (
          <StatusPill tone={pipeline.tone} className="mt-1">{pipeline.label}</StatusPill>
        ) : null}
      </button>
      {canBook ? (
        <button
          type="button"
          onClick={onBook}
          className="p-1.5 rounded-[var(--radius-button)] text-muted hover:text-primary hover:bg-primary/5"
          title="Réserver"
        >
          <CalendarCheck className="w-4 h-4" />
        </button>
      ) : null}
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

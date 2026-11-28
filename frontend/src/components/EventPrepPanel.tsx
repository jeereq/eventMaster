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
  KeyRound,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Sparkles,
  Inbox,
  Store,
  X,
} from '@/components/icons';
import { api } from '@/lib/api';
import { Button, EmptyState, Input, Modal, StatusPill } from '@/components/ui';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import { CARD_SHADOW } from '@/components/dashboard/KpiCard';
import OverflowMenu from '@/components/ui/OverflowMenu';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  SERVICE_CATEGORY_LABELS,
  RENTAL_DELIVERY_OPTIONS,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  formatLocationLine,
  matchPrepListingPipeline,
  prepListingCanBook,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type PublicService,
  type PublicVenue,
  type RentalDeliveryFilter,
  type ServiceMobility,
} from '@/lib/marketplace';
import { ROOM_TYPE_FILTER_OPTIONS } from '@/lib/catalogueEntityFilters';
import type { ListingEventTypeId } from '@/lib/listingDetails';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import {
  applyPackToEventPrepBasket,
  emptyEventPrep,
  emptyEventPrepBasket,
  eventDateKey,
  eventPrepBasket,
  eventPrepEstimateFc,
  eventPrepFromAiRecommendation,
  eventPrepVendorKey,
  groupEventPrepBasketByVendor,
  parseEventPrep,
  splitEventPrepVendors,
  withEventPrepBasket,
  type EventPrep,
  type EventPrepBasket,
  type EventPrepVendor,
  type EventPrepVendorGroup,
  type EventPrepVenue,
} from '@/lib/eventPrep';
import { seedBriefFromEvent, type SavedEventPack } from '@/lib/eventPlan';
import EventPrepListingModal, {
  type EventPrepListingView,
  type EventPrepPreviewTarget,
} from '@/components/EventPrepListingModal';
import EventPrepVendorSheet from '@/components/EventPrepVendorSheet';
import dynamic from 'next/dynamic';

const EventPrepAiSimulator = dynamic(() => import('@/components/EventPrepAiSimulator'), {
  ssr: false,
});

type OrgRoomOption = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
};

type PrepLaneId = 'venue' | 'trade' | 'rental';

/** Carte blanche arrondie, comme sur la vue d’ensemble et le tableau de bord. */
const PANEL = cn('rounded-[20px] bg-surface', CARD_SHADOW);

const SELECT_CLASS = 'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm';

const PILL_BUTTON =
  'inline-flex min-h-11 sm:min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-surface px-3 sm:px-4 text-sm font-semibold transition hover:border-primary/40';

/** Type de l’événement → type attendu par le simulateur. */
const LISTING_TYPE_BY_KIND: Record<string, ListingEventTypeId> = {
  WEDDING: 'wedding',
  BIRTHDAY: 'birthday',
  BAPTISM: 'religious',
  CORPORATE: 'corporate',
  CONFERENCE: 'corporate',
  GALA: 'gala',
  OTHER: 'private',
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

function Cover({ src, fallback, className }: { src?: string | null; fallback: React.ReactNode; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  return (
    <div className={cn('w-14 h-14 rounded-2xl overflow-hidden bg-surface-muted shrink-0', className)}>
      {src && broken !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setBroken(src)}
          // L’image peut avoir échoué avant que React n’écoute.
          ref={(img) => {
            if (img?.complete && img.naturalWidth === 0) setBroken(src);
          }}
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
      <span className="block text-xs font-semibold text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={SELECT_CLASS}
      >
        {children}
      </select>
    </label>
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
  const [delivery, setDelivery] = useState<RentalDeliveryFilter>('');
  const [minCapacity, setMinCapacity] = useState(guestCount > 0 ? String(guestCount) : '');
  const [venues, setVenues] = useState<PublicVenue[]>([]);
  const [services, setServices] = useState<PublicService[]>([]);
  const [searching, setSearching] = useState(true);

  useEffect(() => {
    setCity(defaultCity);
  }, [defaultCity]);

  const communes = useMemo(() => communesForCity(city), [city]);
  const filterActive = Boolean(
    query.trim() || city || commune || category || roomType || mobility || delivery || minCapacity.trim(),
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
          if (lane === 'rental') {
            if (delivery) params.set('delivery', delivery);
          } else if (mobility) params.set('mobility', mobility);
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
  }, [query, city, commune, category, roomType, mobility, delivery, minCapacity, dateKey, group, isVenue, lane]);

  const clearFilters = () => {
    setQuery('');
    setCity('');
    setCommune('');
    setCategory('');
    setRoomType('');
    setMobility('');
    setDelivery('');
    setMinCapacity('');
  };

  const emptySearch = isVenue
    ? 'Aucune salle publique pour ces filtres.'
    : lane === 'rental'
      ? 'Aucun matériel / équipement public pour ces filtres.'
      : 'Aucun prestataire public pour ces filtres.';

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="flex-1 min-w-0">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher"
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
        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label="Ville" className={cn('flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] lg:flex-none', SEGMENTED_TRACK)}>
            {['', 'Kinshasa', 'Lubumbashi'].map((item) => (
              <button
                key={item || 'all'}
                type="button"
                aria-pressed={city === item}
                onClick={() => {
                  setCity(item);
                  setCommune('');
                }}
                className={segmentedItem(city === item, 'flex-1 whitespace-nowrap !px-2 sm:!px-3')}
              >
                {item || 'Toutes'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 [&>*:nth-child(3)]:col-span-2 sm:[&>*:nth-child(3)]:col-span-1">
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
              <span className="block text-xs font-semibold text-muted">Capacité min.</span>
              <input
                type="number"
                min={1}
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                placeholder={guestCount > 0 ? String(guestCount) : 'Invités'}
                className={SELECT_CLASS}
              />
            </label>
          </>
        ) : (
          <>
            <FilterSelect label={lane === 'rental' ? 'Type de matériel' : 'Prestataire'} value={category} onChange={setCategory}>
              <option value="">Tous</option>
              {categories.map((item) => (
                <option key={item} value={item}>{SERVICE_CATEGORY_LABELS[item]}</option>
              ))}
            </FilterSelect>
            {lane === 'rental' ? (
              <FilterSelect
                label="Livraison"
                value={delivery}
                onChange={(next) => setDelivery((next as RentalDeliveryFilter) || '')}
              >
                <option value="">Toutes</option>
                {RENTAL_DELIVERY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </FilterSelect>
            ) : (
              <FilterSelect label="Intervention" value={mobility} onChange={(next) => setMobility(next as ServiceMobility)}>
                {SERVICE_MOBILITY_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </FilterSelect>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {searching
            ? 'Recherche…'
            : `${isVenue ? venues.length : services.length} résultat${(isVenue ? venues.length : services.length) > 1 ? 's' : ''}`}
          {dateKey ? ' · disponibles à la date de l’événement' : ''}
        </p>
        {filterActive ? (
          <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary hover:underline">
            Réinitialiser
          </button>
        ) : null}
      </div>

      <ul className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {searching ? (
          <li className="col-span-full inline-flex items-center gap-2 px-1 py-3 text-xs text-muted">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Chargement du marketplace…
          </li>
        ) : (isVenue ? venues : services).length === 0 ? (
          <li className="col-span-full">
            <EmptyState illustration="search"
              className="py-8"
              title={emptySearch}
              description="Élargissez la ville ou réinitialisez les filtres."
            />
          </li>
        ) : isVenue ? (
          venues.map((venue) => {
            const already = selectedSlugs.includes(venue.slug);
            return (
              <li key={venue.slug} className="min-w-0">
                <ResultRow
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
              <li key={service.slug} className="min-w-0">
                <ResultRow
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
  cover,
  icon,
  title,
  meta,
  price,
  already,
  onDetails,
  onRetain,
}: {
  cover?: string | null;
  icon: React.ReactNode;
  title: string;
  meta: Array<string | null | undefined>;
  price?: number | null;
  already: boolean;
  onDetails: () => void;
  onRetain: () => void;
}) {
  // Le nom de l’organisation répète souvent celui de la fiche.
  const details = meta.filter((item) => item && item !== title).join(' · ');
  return (
    <div
      className={cn(
        'flex h-full items-center gap-3 rounded-2xl border p-3',
        already ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface',
      )}
    >
      <Cover src={cover} fallback={icon} className="h-11 w-11 rounded-xl sm:h-14 sm:w-14 sm:rounded-2xl" />
      <button type="button" onClick={onDetails} className="min-w-0 flex-1 text-left">
        <p className="line-clamp-2 text-[15px] font-semibold leading-snug">{title}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{details}</p>
        {price != null ? <p className="mt-0.5 text-[13px] font-semibold tabular-nums">{formatFc(price)}</p> : null}
      </button>
      <button
        type="button"
        onClick={onDetails}
        aria-label={`Voir les détails de ${title}`}
        title="Voir les détails"
        className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-primary/5 hover:text-primary sm:inline-flex"
      >
        <Eye className="w-4 h-4" />
      </button>
      <Button
        size="sm"
        variant={already ? 'secondary' : 'primary'}
        disabled={already}
        onClick={onRetain}
        leftIcon={already ? <Check className="w-4 h-4" /> : undefined}
        className="shrink-0 rounded-full px-3 sm:px-4"
      >
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
  eventKind,
  eventCommune,
  eventNeighborhood,
  estimatedGuests,
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
  eventKind?: string | null;
  eventCommune?: string | null;
  eventNeighborhood?: string | null;
  estimatedGuests?: number | null;
  onSaved: (event: { eventPrep?: unknown; roomId?: string | null; location?: string }) => void;
}) {
  const [prep, setPrep] = useState<EventPrep>(() => parseEventPrep(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  /** Besoin dont la recherche est ouverte. */
  const [search, setSearch] = useState<PrepLaneId | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  /** Proposition de l’IA à comparer avec la liste ; rien n’est retenu sans un clic. */
  const [proposal, setProposal] = useState<EventPrepBasket | null>(null);
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
  /** La liste unique de l’événement (celle que lit la vue d’ensemble). */
  const selection = eventPrepBasket(prep, 'final');
  const { trades, rentals } = splitEventPrepVendors(selection.vendors);
  const vendorGroups = useMemo(() => groupEventPrepBasketByVendor(selection), [selection]);
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
    setSearch(null);
    setAiOpen(false);
    setProposal(null);
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

  const saveSelection = (basket: EventPrepBasket) => {
    void persist(withEventPrepBasket(prep, 'final', basket));
  };

  const onNotesChange = (notes: string) => {
    const next = withEventPrepBasket(prep, 'final', { ...selection, notes: notes.slice(0, 2000) });
    setPrep(next);
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
    notesTimer.current = window.setTimeout(() => {
      void persist(next);
    }, 600);
  };

  useEffect(() => () => {
    if (notesTimer.current) window.clearTimeout(notesTimer.current);
  }, []);

  const closeAfterChoice = () => {
    setPreview(null);
    setSearch(null);
  };

  const retainVenue = (venue: PublicVenue) => {
    saveSelection({ ...selection, venue: venueFromPublic(venue) });
    closeAfterChoice();
  };

  const retainService = (service: PublicService) => {
    if (!selection.vendors.some((item) => item.slug === service.slug)) {
      saveSelection({ ...selection, vendors: [...selection.vendors, vendorFromPublic(service)] });
    }
    closeAfterChoice();
  };

  const removeItem = (kind: 'venue' | 'service', slug: string) => {
    if (kind === 'venue') saveSelection({ ...selection, venue: null });
    else saveSelection({ ...selection, vendors: selection.vendors.filter((item) => item.slug !== slug) });
    if (preview?.slug === slug) setPreview(null);
  };

  const previewSelected = Boolean(
    preview
      && (preview.kind === 'venue'
        ? selection.venue?.slug === preview.slug
        : selection.vendors.some((item) => item.slug === preview.slug)),
  );

  const venueItem = (venue: EventPrepVenue): PrepItem => ({
    slug: venue.slug,
    kind: 'venue',
    title: venue.name,
    cover: venue.coverUrl,
    orgName: venue.orgName,
    orgSlug: venue.orgSlug,
    meta: [venue.orgName, venue.city, venue.capacity ? `${venue.capacity} places` : null],
    price: venue.priceFromFc,
  });
  const serviceItem = (vendor: EventPrepVendor): PrepItem => ({
    slug: vendor.slug,
    kind: 'service',
    title: vendor.title,
    cover: vendor.coverUrl,
    orgName: vendor.orgName,
    orgSlug: vendor.orgSlug,
    meta: [vendor.categoryLabel, vendor.orgName, vendor.city],
    price: vendor.priceFromFc,
  });

  const proposalSplit = splitEventPrepVendors(proposal?.vendors ?? []);
  const needs: Array<{
    id: PrepLaneId;
    label: string;
    icon: typeof Building2;
    items: PrepItem[];
    proposed: PrepItem[];
  }> = [
    {
      id: 'venue',
      label: 'Salle',
      icon: Building2,
      items: selection.venue ? [venueItem(selection.venue)] : [],
      proposed: proposal?.venue && proposal.venue.slug !== selection.venue?.slug ? [venueItem(proposal.venue)] : [],
    },
    {
      id: 'trade',
      label: 'Prestataires',
      icon: Sparkles,
      items: trades.map(serviceItem),
      proposed: proposalSplit.trades.filter((v) => !trades.some((own) => own.slug === v.slug)).map(serviceItem),
    },
    {
      id: 'rental',
      label: 'Matériel',
      icon: KeyRound,
      items: rentals.map(serviceItem),
      proposed: proposalSplit.rentals.filter((v) => !rentals.some((own) => own.slug === v.slug)).map(serviceItem),
    },
  ];
  const proposedCount = needs.reduce((total, need) => total + need.proposed.length, 0);

  const takeProposed = (item: PrepItem) => {
    if (!proposal) return;
    if (item.kind === 'venue') {
      saveSelection({ ...selection, venue: proposal.venue });
      return;
    }
    const vendor = proposal.vendors.find((v) => v.slug === item.slug);
    if (vendor) saveSelection({ ...selection, vendors: [...selection.vendors, vendor] });
  };

  const takeAllProposed = () => {
    if (!proposal) return;
    const own = new Set(selection.vendors.map((v) => v.slug));
    saveSelection({
      ...selection,
      venue: proposal.venue ?? selection.venue,
      vendors: [...selection.vendors, ...proposal.vendors.filter((v) => !own.has(v.slug))],
    });
    setProposal(null);
  };

  const estimate = eventPrepEstimateFc(selection);
  const bookingsHref = `/dashboard/bookings?event=${encodeURIComponent(eventId)}`;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Préparation</h2>
        <div className="flex items-center gap-2">
          {saving ? (
            <span role="status" className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="sr-only sm:not-sr-only">Enregistrement…</span>
            </span>
          ) : null}
          <Button
            type="button"
            leftIcon={<Sparkles className="w-4 h-4" />}
            aria-haspopup="dialog"
            onClick={() => setAiOpen(true)}
            className="rounded-full px-5"
          >
            Proposer avec l’IA
          </Button>
          <OverflowMenu
            align="right"
            triggerLabel="Autres actions"
            triggerClassName="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full border border-border bg-surface text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            trigger={<MoreHorizontal className="w-5 h-5" aria-hidden />}
            items={[
              { id: 'bookings', label: 'Devis & résas', icon: Inbox, onSelect: () => router.push(bookingsHref) },
              {
                id: 'pack',
                label: 'Composer un pack',
                icon: Sparkles,
                onSelect: () => {
                  seedBriefFromEvent({ eventDate, location: eventLocation, guestCount });
                  router.push('/dashboard/catalogue?hub=plan');
                },
              },
              ...(selection.venue || selection.vendors.length > 0
                ? [{
                    id: 'clear',
                    label: 'Vider la liste',
                    icon: X,
                    danger: true,
                    separatorBefore: true,
                    onSelect: () => saveSelection({ ...emptyEventPrepBasket(), notes: selection.notes }),
                  }]
                : []),
            ]}
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl px-4 py-3">{error}</p>
      ) : null}

      <section aria-label="Ma liste" className="em-header-wash space-y-3 rounded-[26px] p-3 sm:space-y-4 sm:p-5">
        {proposal ? (
          <div role="status" className={cn(PANEL, 'flex flex-wrap items-center justify-between gap-2 p-4')}>
            <p className="text-[15px] font-semibold">
              {proposedCount > 0
                ? `Proposition de l’IA : ${proposedCount} choix à voir`
                : 'La proposition de l’IA est déjà dans la liste'}
            </p>
            <div className="flex gap-2">
              {proposedCount > 0 ? (
                <Button type="button" size="sm" onClick={takeAllProposed} className="rounded-full px-4">
                  Tout prendre
                </Button>
              ) : null}
              <Button type="button" size="sm" variant="ghost" onClick={() => setProposal(null)} className="rounded-full">
                Ignorer
              </Button>
            </div>
          </div>
        ) : null}

        <ul className="space-y-3 sm:space-y-4">
          {needs.map((need) => {
            const NeedIcon = need.icon;
            const searching = search === need.id;
            const addLabel = need.items.length === 0 ? 'Choisir' : need.id === 'venue' ? 'Changer' : 'Ajouter';
            return (
              <li key={need.id} className={cn(PANEL, 'min-w-0 p-4 sm:p-5', searching && 'ring-2 ring-primary/40')}>
                <div className="flex items-center gap-3">
                  <span aria-hidden className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-primary">
                    <NeedIcon className="w-[18px] h-[18px]" />
                  </span>
                  <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold">{need.label}</h3>
                  <button
                    type="button"
                    aria-expanded={searching}
                    onClick={() => setSearch(searching ? null : need.id)}
                    className={cn(PILL_BUTTON, 'text-primary')}
                  >
                    {searching ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {searching ? 'Fermer' : addLabel}
                    <span className="sr-only"> : {need.label}</span>
                  </button>
                </div>

                {need.items.length > 0 ? (
                  <ul className="mt-3 divide-y divide-border border-t border-border">
                    {need.items.map((item) => {
                      const pipeline = pipelineFor(item.slug, item.kind);
                      const group = vendorGroups.find((entry) => entry.key === eventPrepVendorKey(item));
                      return (
                        <PrepItemRow key={item.slug} item={item} icon={<NeedIcon className="w-4 h-4" />} onOpen={() => openPreview(item)}>
                          {pipeline.stage !== 'none' ? (
                            <>
                              <StatusPill tone={pipeline.tone}>{pipeline.label}</StatusPill>
                              <Link href={bookingsHref} className={PILL_BUTTON}>Suivre</Link>
                            </>
                          ) : (
                            <button type="button" onClick={() => openPreview(item, 'inquire')} className={PILL_BUTTON}>
                              Demander un devis
                            </button>
                          )}
                          <OverflowMenu
                            align="right"
                            triggerLabel={`Actions pour ${item.title}`}
                            triggerClassName="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            trigger={<MoreHorizontal className="w-5 h-5" aria-hidden />}
                            items={[
                              { id: 'details', label: 'Voir la fiche', icon: Eye, onSelect: () => openPreview(item) },
                              ...(prepListingCanBook(item.price, pipeline)
                                ? [{ id: 'book', label: 'Réserver', icon: CalendarCheck, onSelect: () => openPreview(item, 'book') }]
                                : []),
                              ...(group
                                ? [{ id: 'vendor', label: 'Fiche du prestataire', icon: Store, onSelect: () => setVendorSheet(group) }]
                                : []),
                              { id: 'remove', label: 'Retirer', icon: X, danger: true, separatorBefore: true, onSelect: () => removeItem(item.kind, item.slug) },
                            ]}
                          />
                        </PrepItemRow>
                      );
                    })}
                  </ul>
                ) : null}

                {need.proposed.length > 0 ? (
                  <ul aria-label={`Proposé par l’IA : ${need.label}`} className="mt-3 divide-y divide-border rounded-2xl border border-dashed border-primary/50 bg-primary/5 px-3">
                    {need.proposed.map((item) => (
                      <PrepItemRow key={item.slug} item={item} icon={<NeedIcon className="w-4 h-4" />} onOpen={() => openPreview(item)}>
                        <StatusPill tone="sky">IA</StatusPill>
                        <Button type="button" size="sm" onClick={() => takeProposed(item)} className="rounded-full px-4">
                          {item.kind === 'venue' && selection.venue ? 'Remplacer' : 'Prendre'}
                        </Button>
                      </PrepItemRow>
                    ))}
                  </ul>
                ) : null}

                {searching ? (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    {need.id === 'venue' && orgRooms.length > 0 ? (
                      <label className="flex flex-col gap-2 rounded-2xl bg-surface-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-sm font-semibold">Salle de l’organisation (plan 2D)</span>
                        <select
                          value={currentRoomId || ''}
                          onChange={(e) => {
                            const roomId = e.target.value || null;
                            void persist(prep, { roomId });
                          }}
                          className={cn(SELECT_CLASS, 'sm:max-w-sm')}
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
                      </label>
                    ) : null}
                    <PrepLane
                      key={need.id}
                      lane={need.id}
                      dateKey={dateKey}
                      guestCount={guestCount}
                      defaultCity={defaultCity}
                      selectedSlugs={need.items.map((item) => item.slug)}
                      onOpen={(target) => openPreview(target)}
                      onRetainVenue={retainVenue}
                      onRetainService={retainService}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {estimate.priced > 0 ? (
          <p className="px-1 text-sm font-semibold tabular-nums">Total à partir de {formatFc(estimate.total)}</p>
        ) : null}
      </section>

      <details className={cn(PANEL, 'group')}>
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 truncate text-[15px] font-semibold">
            Notes
            {selection.notes ? <span className="ml-2 text-[13px] font-normal text-muted">{selection.notes}</span> : null}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <textarea
            aria-label="Notes"
            value={selection.notes}
            onChange={(e) => onNotesChange(e.target.value)}
            rows={3}
            placeholder="Budget visé, horaires, contraintes logistiques…"
            className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[4.5rem]"
          />
        </div>
      </details>

      {savedPacks.length > 0 ? (
        <details className={cn(PANEL, 'group')}>
          <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
              <Bookmark className="w-4 h-4 text-primary" />
              Packs enregistrés
              <span className="text-xs font-semibold text-muted">{savedPacks.length}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <ul className="grid grid-cols-1 gap-3 px-4 pb-4 sm:px-5 sm:pb-5 md:grid-cols-2">
            {savedPacks.slice(0, 6).map((pack) => (
              <li key={pack.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                <div>
                  <p className="text-sm font-semibold truncate">{pack.name}</p>
                  <p className="text-xs text-muted truncate">{formatFc(pack.totalFc)}</p>
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
                  className="mt-auto self-start rounded-full px-4"
                  onClick={() => saveSelection(applyPackToEventPrepBasket(pack, selection))}
                >
                  Appliquer ce pack
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Modal open={aiOpen} onClose={() => setAiOpen(false)} title="Proposer avec l’IA">
        {aiOpen ? (
          <EventPrepAiSimulator
            short
            preferDefaults
            applyLabel="Comparer avec ma liste"
            defaults={{
              eventType: eventKind ? LISTING_TYPE_BY_KIND[eventKind] : undefined,
              city: defaultCity,
              commune: eventCommune || '',
              neighborhood: eventNeighborhood || '',
              guestCount: estimatedGuests || guestCount,
              eventDate: dateKey,
              keepVenueSlug: selection.venue?.slug,
              keepServiceSlugs: selection.vendors.map((item) => item.slug),
              // Les besoins encore vides sont cochés ; si tout est rempli, on les propose tous.
              ...(selection.venue && trades.length > 0 && rentals.length > 0
                ? {}
                : {
                    includeVenue: !selection.venue,
                    includeTrades: trades.length === 0,
                    includeRentals: rentals.length === 0,
                  }),
            }}
            onApply={(pack) => {
              setProposal(eventPrepFromAiRecommendation({
                summary: pack.summary || pack.label,
                venue: pack.venue,
                services: pack.services,
              }, emptyEventPrep()).ai ?? null);
              setAiOpen(false);
              setSearch(null);
            }}
            onOpenListing={(target) => openPreview(target)}
          />
        ) : null}
      </Modal>
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
          if (preview) removeItem(preview.kind, preview.slug);
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
          setVendorSheet(null);
          openPreview(target, view);
        }}
        onPipelineChange={() => void reloadPipeline()}
      />
    </div>
  );
}

type PrepItem = {
  slug: string;
  kind: 'venue' | 'service';
  title: string;
  cover?: string | null;
  orgName?: string | null;
  orgSlug?: string | null;
  meta: Array<string | null | undefined>;
  price?: number | null;
};

/** Une ligne de la liste : la fiche à gauche, son état et ses actions à droite. */
function PrepItemRow({
  item,
  icon,
  onOpen,
  children,
}: {
  item: PrepItem;
  icon: React.ReactNode;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Cover src={item.cover} fallback={icon} className="h-12 w-12 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-semibold leading-snug">{item.title}</span>
          <span className="block truncate text-[13px] text-muted">
            {item.meta.filter((part) => part && part !== item.title).join(' · ')}
          </span>
          {item.price != null ? <span className="block text-[13px] font-semibold tabular-nums">{formatFc(item.price)}</span> : null}
        </span>
      </button>
      <div className="flex shrink-0 items-center justify-end gap-2">{children}</div>
    </li>
  );
}

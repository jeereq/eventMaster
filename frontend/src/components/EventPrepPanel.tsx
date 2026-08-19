'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Building2,
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  MapPin,
  Search,
  Send,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button, Input, Modal } from '@/components/ui';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  dashboardServiceHref,
  dashboardVenueHref,
  SERVICE_CATEGORY_LABELS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  type PublicService,
  type PublicVenue,
  type ServiceCategory,
} from '@/lib/marketplace';
import {
  emptyEventPrep,
  eventDateKey,
  eventPrepFromSavedPack,
  parseEventPrep,
  splitEventPrepVendors,
  type EventPrep,
  type EventPrepVendor,
  type EventPrepVenue,
} from '@/lib/eventPrep';
import { seedBriefFromEvent, type SavedEventPack } from '@/lib/eventPlan';
import MarketplaceInquiryForm from '@/components/MarketplaceInquiryForm';

type OrgRoomOption = {
  id: string;
  name: string;
  location: string | null;
  capacity: number | null;
};

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

function VendorLane({
  title,
  hint,
  icon,
  group,
  categories,
  placeholder,
  emptySelected,
  emptySearch,
  searchingLabel,
  selected,
  allSelected,
  dateKey,
  onAdd,
  onRemove,
  onInquire,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  group: 'trade' | 'rental';
  categories: ServiceCategory[];
  placeholder: string;
  emptySelected: string;
  emptySearch: string;
  searchingLabel: string;
  selected: EventPrepVendor[];
  allSelected: EventPrepVendor[];
  dateKey: string;
  onAdd: (service: PublicService) => void;
  onRemove: (slug: string) => void;
  onInquire: (vendor: EventPrepVendor) => void;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<PublicService[]>([]);
  const [searching, setSearching] = useState(false);
  const Icon = group === 'rental' ? KeyRound : Store;

  useEffect(() => {
    const q = query.trim();
    const cat = category.trim();
    if (!q && !cat) {
      setResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ group });
        if (q) params.set('q', q);
        if (cat) params.set('category', cat);
        if (dateKey) {
          params.set('availableFrom', dateKey);
          params.set('availableTo', dateKey);
        }
        const data = (await api.get(`/public/services?${params.toString()}`)) as { services?: PublicService[] };
        setResults(Array.isArray(data.services) ? data.services.slice(0, 8) : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, category, dateKey, group]);

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">plusieurs</span>
      </div>
      <p className="text-xs text-muted">{hint}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          leftIcon={<Search className="w-4 h-4" />}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">{group === 'rental' ? 'Tous les types' : 'Tous les métiers'}</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {SERVICE_CATEGORY_LABELS[item]}
            </option>
          ))}
        </select>
      </div>

      {selected.length > 0 ? (
        <ul className="space-y-1.5">
          {selected.map((vendor) => (
            <li
              key={vendor.slug}
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 px-2.5 py-2"
            >
              <Cover src={vendor.coverUrl} fallback={<Icon className="w-4 h-4" />} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{vendor.title}</p>
                <p className="text-[11px] text-muted truncate">
                  {[vendor.categoryLabel, vendor.orgName, vendor.city].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link
                href={dashboardServiceHref(vendor.slug, vendor.category)}
                className="text-muted hover:text-primary"
                title="Fiche"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => onInquire(vendor)}
                className="text-muted hover:text-primary"
                title="Demander un devis"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(vendor.slug)}
                className="p-1 text-muted hover:text-rose-600"
                title="Retirer"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">{emptySelected}</p>
      )}

      {searching || results.length > 0 || query.trim() || category ? (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {searching ? (
            <li className="text-xs text-muted px-1 py-2">{searchingLabel}</li>
          ) : results.length === 0 ? (
            <li className="text-xs text-muted px-1 py-2">{emptySearch}</li>
          ) : (
            results.map((service) => {
              const already = allSelected.some((item) => item.slug === service.slug);
              return (
                <li key={service.slug}>
                  <button
                    type="button"
                    disabled={already}
                    onClick={() => onAdd(service)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition',
                      already
                        ? 'border-emerald-200 bg-emerald-50/70 cursor-default'
                        : 'border-border hover:border-primary/40 hover:bg-primary/5',
                    )}
                  >
                    <Cover src={service.coverUrl} fallback={<Icon className="w-4 h-4" />} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">{service.title}</p>
                      <p className="text-[11px] text-muted truncate">
                        {[service.categoryLabel, service.orgName, service.city].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {already ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : service.priceFromFc != null ? (
                      <span className="text-[11px] font-semibold shrink-0">{formatFc(service.priceFromFc)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </section>
  );
}

function Cover({ src, fallback }: { src?: string | null; fallback: React.ReactNode }) {
  return (
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-surface-muted shrink-0">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted">{fallback}</div>
      )}
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
  const [venueQ, setVenueQ] = useState('');
  const [venueResults, setVenueResults] = useState<PublicVenue[]>([]);
  const [searchingVenues, setSearchingVenues] = useState(false);
  const [savedPacks, setSavedPacks] = useState<SavedEventPack[]>([]);
  const [inquire, setInquire] = useState<{ kind: 'venue' | 'service'; slug: string; title: string; category?: string } | null>(null);
  const persistSeq = useRef(0);
  const notesTimer = useRef<number | null>(null);
  const dateKey = eventDateKey(eventDate);

  useEffect(() => {
    setPrep(parseEventPrep(value));
    // Recharger uniquement au changement d’événement, pas après chaque save.
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

  useEffect(() => {
    const q = venueQ.trim();
    if (!q) {
      setVenueResults([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setSearchingVenues(true);
      try {
        const params = new URLSearchParams({ q });
        if (dateKey) {
          params.set('availableFrom', dateKey);
          params.set('availableTo', dateKey);
        }
        const data = (await api.get(`/public/venues?${params.toString()}`)) as { venues?: PublicVenue[] };
        setVenueResults(Array.isArray(data.venues) ? data.venues.slice(0, 8) : []);
      } catch {
        setVenueResults([]);
      } finally {
        setSearchingVenues(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [venueQ, dateKey]);

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

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground tracking-tight">Préparation</h2>
          <p className="text-sm text-muted">
            Recherchez une salle, des métiers et des locations au même endroit. Rien n’est obligatoire : le parcours invitations continue sans ça.
            {dateKey ? ` Les recherches tiennent compte de la date (${new Date(`${dateKey}T12:00:00`).toLocaleDateString('fr-FR')}).` : ''}
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
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>
      ) : null}

      {savedPacks.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Packs enregistrés</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">optionnel</span>
          </div>
          <p className="text-xs text-muted">Appliquez un pack déjà simulé : salle, métiers et locations se remplissent ici, sans réserver.</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {savedPacks.slice(0, 6).map((pack) => (
              <li key={pack.id}>
                <button
                  type="button"
                  onClick={() => void persist(eventPrepFromSavedPack(pack, prep))}
                  className="w-full text-left rounded-xl border border-border px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition"
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
      ) : null}

      {orgRooms.length > 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Salle de l’organisation</p>
          <p className="text-xs text-muted">
            Liez une de vos salles pour importer le plan 2D. Indépendant du choix marketplace.
          </p>
          <select
            value={currentRoomId || ''}
            onChange={(e) => {
              const roomId = e.target.value || null;
              void persist(prep, { roomId });
            }}
            className="w-full sm:max-w-md rounded-xl border border-border bg-surface px-3 py-2 text-sm"
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

      <section className="rounded-2xl border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Salle marketplace</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">1 choix</span>
          </div>

          {prep.venue ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <Cover src={prep.venue.coverUrl} fallback={<Building2 className="w-4 h-4" />} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{prep.venue.name}</p>
                <p className="text-xs text-muted truncate">
                  {[prep.venue.orgName, prep.venue.city, prep.venue.capacity ? `${prep.venue.capacity} places` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Link
                    href={dashboardVenueHref(prep.venue.slug)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    Fiche
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => setInquire({ kind: 'venue', slug: prep.venue!.slug, title: prep.venue!.name })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Send className="w-3 h-3" />
                    Demander un devis
                  </button>
                  {prep.venue.address && prep.venue.address !== eventLocation ? (
                    <button
                      type="button"
                      onClick={() => void persist(prep, { location: prep.venue?.address || undefined })}
                      className="text-[11px] font-semibold text-muted hover:text-foreground"
                    >
                      Utiliser comme lieu
                    </button>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void persist({ ...prep, venue: null })}
                className="p-1.5 text-muted hover:text-rose-600 rounded-lg"
                title="Retirer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Input
              value={venueQ}
              onChange={(e) => setVenueQ(e.target.value)}
              placeholder="Nom, ville, quartier…"
              leftIcon={<Search className="w-4 h-4" />}
            />
          )}

          {!prep.venue && (searchingVenues || venueResults.length > 0 || venueQ.trim()) ? (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {searchingVenues ? (
                <li className="text-xs text-muted px-1 py-2">Recherche des salles…</li>
              ) : venueResults.length === 0 ? (
                <li className="text-xs text-muted px-1 py-2">Aucune salle publique pour cette recherche.</li>
              ) : (
                venueResults.map((venue) => (
                  <li key={venue.slug}>
                    <button
                      type="button"
                      onClick={() => {
                        void persist({ ...prep, venue: venueFromPublic(venue) });
                        setVenueQ('');
                        setVenueResults([]);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl border border-border px-2.5 py-2 text-left hover:border-primary/40 hover:bg-primary/5 transition"
                    >
                      <Cover src={venue.coverUrl} fallback={<Building2 className="w-4 h-4" />} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{venue.name || venue.headline}</p>
                        <p className="text-[11px] text-muted truncate">
                          {[venue.orgName, venue.city, venue.capacity ? `${venue.capacity} places` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      {venue.priceFromFc != null ? (
                        <span className="text-[11px] font-semibold shrink-0">{formatFc(venue.priceFromFc)}</span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <VendorLane
            title="Métiers"
            hint="Traiteur, photo, DJ, décor… le savoir-faire."
            icon={<Store className="w-4 h-4 text-primary" />}
            group="trade"
            categories={SERVICE_TRADE_CATEGORIES}
            placeholder="Traiteur, DJ, photo…"
            emptySelected="Aucun métier retenu pour le moment."
            emptySearch="Aucun métier public pour cette recherche."
            searchingLabel="Recherche des métiers…"
            selected={splitEventPrepVendors(prep.vendors).trades}
            allSelected={prep.vendors}
            dateKey={dateKey}
            onAdd={(service) => void persist({ ...prep, vendors: [...prep.vendors, vendorFromPublic(service)] })}
            onRemove={(slug) => void persist({ ...prep, vendors: prep.vendors.filter((item) => item.slug !== slug) })}
            onInquire={(vendor) => setInquire({ kind: 'service', slug: vendor.slug, title: vendor.title, category: vendor.category })}
          />
          <VendorLane
            title="Locations"
            hint="Habits, voiture, moto, matériel — le bien loué, pas le métier."
            icon={<KeyRound className="w-4 h-4 text-primary" />}
            group="rental"
            categories={SERVICE_RENTAL_CATEGORIES}
            placeholder="Habits, voiture, sono…"
            emptySelected="Aucune location retenue pour le moment."
            emptySearch="Aucune location publique pour cette recherche."
            searchingLabel="Recherche des locations…"
            selected={splitEventPrepVendors(prep.vendors).rentals}
            allSelected={prep.vendors}
            dateKey={dateKey}
            onAdd={(service) => void persist({ ...prep, vendors: [...prep.vendors, vendorFromPublic(service)] })}
            onRemove={(slug) => void persist({ ...prep, vendors: prep.vendors.filter((item) => item.slug !== slug) })}
            onInquire={(vendor) => setInquire({ kind: 'service', slug: vendor.slug, title: vendor.title, category: vendor.category })}
          />
        </div>

      <div className="rounded-2xl border border-border bg-surface p-4 space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted" htmlFor="event-prep-notes">
          Notes de préparation
        </label>
        <textarea
          id="event-prep-notes"
          value={prep.notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Budget visé, horaires, contraintes logistiques… (optionnel)"
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm resize-y min-h-[4.5rem]"
        />
      </div>

      {prep.venue || prep.vendors.length > 0 ? (
        <p className="text-xs text-muted flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          Les fiches restent des pistes : demandez un devis depuis ici. Rien n’est réservé automatiquement.
        </p>
      ) : null}

      {(prep.venue || prep.vendors.length > 0 || prep.notes) && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => void persist(emptyEventPrep())}
        >
          Vider la préparation
        </Button>
      )}

      <Modal
        open={Boolean(inquire)}
        onClose={() => setInquire(null)}
        title={inquire ? `Devis — ${inquire.title}` : 'Demander un devis'}
        description="Le professionnel reçoit votre message. Aucune réservation n’est créée."
        size="md"
      >
        {inquire ? (
          <MarketplaceInquiryForm
            key={`${inquire.kind}:${inquire.slug}`}
            endpoint={
              inquire.kind === 'venue'
                ? `/public/venues/${encodeURIComponent(inquire.slug)}/inquire`
                : `/public/services/${encodeURIComponent(inquire.slug)}/inquire`
            }
            eventDate={dateKey || undefined}
            defaultGuestCount={guestCount > 0 ? guestCount : undefined}
            defaultMessage={
              eventTitle
                ? `Demande pour l’événement « ${eventTitle} ».`
                : undefined
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}

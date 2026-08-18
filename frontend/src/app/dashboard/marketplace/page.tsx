'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getQuotaLockMessage, getQuotaActionMessage } from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import {
  PageHeader, Button, Breadcrumbs, Alert, Input, Modal, EmptyState, StatusPill,
  Pagination, paginateItems, usePageSize, ViewModeToggle, useViewMode, listStackClass,
} from '@/components/ui';
import CatalogueFilterBar, { CatalogueChoicePills, CatalogueFilterField, type CatalogueFilterChip } from '@/components/CatalogueFilterBar';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  isServiceRentalCategory,
  mediaPosterUrl,
  missingPublishLocation,
  parseBlockedDates,
  defaultUnitForServiceCategory,
  unitsForServiceCategory,
  SERVICE_CATEGORY_META,
  dashboardServiceHref,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type ServiceCategory,
  type ServiceMobility,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import { EMPTY_LISTING_DETAILS, parseListingDetails, type ListingDetails } from '@/lib/listingDetails';
import ListingDetailsFields from '@/components/ListingDetailsFields';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  Globe, GlobeLock, KeyRound, Loader2, Plus, Sparkles, Trash2,
} from 'lucide-react';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import LocationPickerMap from '@/components/LocationPickerMap';
import CityLocationFields from '@/components/CityLocationFields';
import MarketplaceBookingsPanel from '@/components/MarketplaceBookingsPanel';
import MarketplaceInquiriesPanel from '@/components/MarketplaceInquiriesPanel';
import { useRememberListReturn } from '@/lib/catalogueQuery';

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: ServiceCategory;
  city: string | null;
  commune?: string | null;
  neighborhood?: string | null;
  coverageRadiusKm: number | null;
  travels?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: unknown;
  blockedDates?: unknown;
  bookedDates?: string[];
  isPublic: boolean;
  details?: unknown;
}

type DeskTab = 'services' | 'rentals' | 'inquiries' | 'bookings';

const fieldClass =
  'w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm';

export default function MarketplaceDeskPage() {
  useRememberListReturn();
  const { access, refreshProfile, planQuota, tenant } = useAuth();
  const router = useRouter();
  const canManage = Boolean(access?.canManageRooms);
  const [tab, setTab] = useState<DeskTab>('services');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBookingItem[]>([]);
  const [commissionDueFc, setCommissionDueFc] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesPageSize, setServicesPageSize] = usePageSize('marketplace-desk-services', 8);
  const [svcQuery, setSvcQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'hidden'>('all');
  const [filterMobility, setFilterMobility] = useState<ServiceMobility>('');
  const {
    mode: servicesViewMode,
    setViewMode: setServicesViewMode,
    columns: servicesColumns,
    setGridColumns: setServicesColumns,
    gridClassName: servicesGridClass,
  } = useViewMode('em-view-marketplace-services', 'grid', 2);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<MarketplaceFormTab>('details');
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: 'CATERING' as ServiceCategory,
    city: '',
    commune: '',
    neighborhood: '',
    coverageRadiusKm: '',
    travels: true,
    latitude: '',
    longitude: '',
    priceFromFc: '',
    priceUnit: 'EVENT' as VenuePriceUnit,
    quotaMin: '',
    quotaMax: '',
    photos: [] as string[],
    blockedDates: [] as string[],
    bookedDates: [] as string[],
    isPublic: true,
    details: EMPTY_LISTING_DETAILS,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [svc, leads, books] = await Promise.all([
        api.get('/marketplace/services'),
        api.get('/marketplace/inquiries'),
        api.get('/marketplace/bookings'),
      ]);
      setServices(svc.services || []);
      setInquiries(leads.inquiries || []);
      setBookings(books.bookings || []);
      setCommissionDueFc(books.commissionDueFc || 0);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger le marketplace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (access?.level === 'client') {
      router.replace('/dashboard/catalogue');
    }
  }, [access?.level, router]);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage]);

  useEffect(() => {
    setServicesPage(1);
  }, [servicesPageSize, svcQuery, filterCategory, filterCity, filterVisibility, filterMobility, tab]);

  useEffect(() => {
    if (tab === 'services' && isServiceRentalCategory(filterCategory)) setFilterCategory('');
    if (tab === 'rentals' && filterCategory && !isServiceRentalCategory(filterCategory)) setFilterCategory('');
  }, [tab, filterCategory]);

  const photosOf = (item: ServiceItem) =>
    Array.isArray(item.photos) ? item.photos.filter((p): p is string => typeof p === 'string') : [];

  const servicesAtLimit = Boolean(getQuotaLockMessage('services', planQuota));

  const openCreate = (mode: 'trade' | 'rental' = 'trade') => {
    const lock = getQuotaLockMessage('services', planQuota);
    if (lock) {
      setError(getQuotaActionMessage('services', planQuota, tenant?.plan));
      return;
    }
    const category: ServiceCategory = mode === 'rental' ? 'RENTAL_EQUIPMENT' : 'CATERING';
    setEditing(null);
    setDraft({
      title: '',
      description: '',
      category,
      city: '',
      commune: '',
      neighborhood: '',
      coverageRadiusKm: '',
      travels: mode !== 'rental',
      latitude: '',
      longitude: '',
      priceFromFc: '',
      priceUnit: defaultUnitForServiceCategory(category),
      quotaMin: '',
      quotaMax: '',
      photos: [],
      blockedDates: [],
      bookedDates: [],
      isPublic: true,
      details: EMPTY_LISTING_DETAILS,
    });
    setEditorTab('details');
    setEditorOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setDraft({
      title: item.title,
      description: item.description || '',
      category: item.category,
      city: item.city || '',
      commune: item.commune || '',
      neighborhood: item.neighborhood || '',
      coverageRadiusKm: item.coverageRadiusKm != null ? String(item.coverageRadiusKm) : '',
      travels: item.travels ?? Boolean(item.coverageRadiusKm && item.coverageRadiusKm > 0),
      latitude: item.latitude != null ? String(item.latitude) : '',
      longitude: item.longitude != null ? String(item.longitude) : '',
      priceFromFc: item.priceFromFc != null ? String(item.priceFromFc) : '',
      priceUnit: item.priceUnit,
      quotaMin: item.quotaMin != null ? String(item.quotaMin) : '',
      quotaMax: item.quotaMax != null ? String(item.quotaMax) : '',
      photos: photosOf(item),
      blockedDates: parseBlockedDates(item.blockedDates),
      bookedDates: parseBlockedDates(item.bookedDates),
      isPublic: item.isPublic,
      details: parseListingDetails(item.details),
    });
    setEditorTab('details');
    setEditorOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    if (publish) {
      const missing = missingPublishLocation(draft);
      if (missing === 'city') {
        setEditorTab('details');
        setError('Choisissez Kinshasa ou Lubumbashi, puis la commune et le quartier.');
        return;
      }
      if (missing === 'map') {
        setEditorTab('map');
        setError('Ville, commune, quartier et position GPS sont obligatoires pour publier.');
        return;
      }
      if (missing) {
        setEditorTab('details');
        setError('Ville, commune et quartier sont obligatoires pour publier.');
        return;
      }
      if (draft.travels && !(Number(draft.coverageRadiusKm) > 0)) {
        setEditorTab('details');
        setError('Indiquez le rayon d’intervention si vous vous déplacez.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        city: draft.city,
        commune: draft.commune,
        neighborhood: draft.neighborhood,
        coverageRadiusKm: draft.travels && draft.coverageRadiusKm ? Number(draft.coverageRadiusKm) : null,
        travels: draft.travels,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
        priceFromFc: draft.priceFromFc ? Number(draft.priceFromFc) : null,
        priceUnit: draft.priceUnit,
        quotaMin: draft.quotaMin ? Number(draft.quotaMin) : null,
        quotaMax: draft.quotaMax ? Number(draft.quotaMax) : null,
        photos: draft.photos,
        blockedDates: draft.blockedDates,
        isPublic: publish,
        details: { ...draft.details, description: draft.description || draft.details.description },
      };
      if (editing) await api.put(`/marketplace/services/${editing.id}`, payload);
      else await api.post('/marketplace/services', payload);
      setSuccess(publish
        ? (isServiceRentalCategory(draft.category) ? 'Location publiée.' : 'Prestation publiée.')
        : (isServiceRentalCategory(draft.category) ? 'Location enregistrée.' : 'Prestation enregistrée.'));
      setEditorOpen(false);
      await load();
      await refreshProfile?.();
    } catch (err: any) {
      setError(err.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`Supprimer « ${item.title} » ?`)) return;
    try {
      await api.delete(`/marketplace/services/${item.id}`);
      setSuccess(isServiceRentalCategory(item.category) ? 'Location supprimée.' : 'Prestation supprimée.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    }
  };

  const convertInquiry = async (id: string) => {
    try {
      const data = await api.post(`/marketplace/inquiries/${id}/book`);
      setSuccess(data.message || 'Demande convertie en réservation.');
      setTab('bookings');
      await load();
    } catch (err: any) {
      setError(err.message || 'Conversion impossible.');
    }
  };

  const markContacted = async (id: string) => {
    try {
      await api.patch(`/marketplace/inquiries/${id}`, { status: 'CONTACTED' });
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'CONTACTED' } : i)));
    } catch (err: any) {
      setError(err.message || 'Mise à jour impossible.');
    }
  };

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Marketplace" description="Réservé aux propriétaires et managers de l’organisation." />
      </div>
    );
  }

  const newCount = inquiries.filter((i) => i.status === 'NEW').length;

  const listingTab = tab === 'services' || tab === 'rentals';
  const listingIsRental = tab === 'rentals';
  const listingPool = services.filter((item) => (
    listingIsRental ? isServiceRentalCategory(item.category) : !isServiceRentalCategory(item.category)
  ));

  const filteredServices = listingPool.filter((item) => {
    const q = svcQuery.trim().toLowerCase();
    const hay = [item.title, item.description, item.city, item.commune, item.neighborhood].filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesCategory = !filterCategory || item.category === filterCategory;
    const matchesCity = !filterCity || (item.city || '').toLowerCase() === filterCity.toLowerCase();
    const matchesVisibility = filterVisibility === 'all'
      || (filterVisibility === 'public' && item.isPublic)
      || (filterVisibility === 'hidden' && !item.isPublic);
    const travels = item.travels ?? Boolean(item.coverageRadiusKm && item.coverageRadiusKm > 0);
    const matchesMobility = !filterMobility
      || (filterMobility === 'on_site' && travels === false)
      || (filterMobility === 'travels' && travels !== false);
    return matchesSearch && matchesCategory && matchesCity && matchesVisibility && matchesMobility;
  });

  const serviceChips: CatalogueFilterChip[] = [
    ...(filterCategory ? [{ id: 'category', label: 'Catégorie', value: SERVICE_CATEGORY_LABELS[filterCategory as ServiceCategory] || filterCategory }] : []),
    ...(filterCity ? [{ id: 'city', label: 'Ville', value: filterCity }] : []),
    ...(filterVisibility !== 'all' ? [{ id: 'visibility', label: 'Visibilité', value: filterVisibility === 'public' ? 'Publiées' : 'Brouillons' }] : []),
    ...(filterMobility ? [{ id: 'mobility', label: 'Intervention', value: filterMobility === 'on_site' ? 'Sur place' : 'Se déplace' }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Prestations, locations, devis, réservations de dates. Acompte hors plateforme · commission vendeur 8 % (≠ abo SaaS)."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Marketplace' }]} />
        }
        action={
          listingTab ? (
            <div className="flex flex-wrap items-center gap-2">
              {listingPool.length > 0 && (
                <ViewModeToggle
                  storageKey="em-view-marketplace-services"
                  value={servicesViewMode}
                  onChange={setServicesViewMode}
                  columns={servicesColumns}
                  onColumnsChange={setServicesColumns}
                />
              )}
              <Button
                size="sm"
                onClick={() => openCreate(listingIsRental ? 'rental' : 'trade')}
                disabled={servicesAtLimit}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {listingIsRental ? 'Nouvelle location' : 'Nouvelle prestation'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {planQuota && listingTab && (
        <p className="text-xs text-muted">
          Fiches : {planQuota.usage.services ?? 0} /{' '}
          {(planQuota.limits.maxServices ?? 0) >= 9999 ? '∞' : planQuota.limits.maxServices}
        </p>
      )}
      {servicesAtLimit && (
        <PlanLimitCallout kind="services" planQuota={planQuota} planName={tenant?.plan} />
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setTab('services')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border',
            tab === 'services' ? 'bg-primary text-white border-primary' : 'border-border text-muted',
          )}
        >
          Prestations
        </button>
        <button
          type="button"
          onClick={() => setTab('rentals')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border',
            tab === 'rentals' ? 'bg-primary text-white border-primary' : 'border-border text-muted',
          )}
        >
          Locations
        </button>
        <button
          type="button"
          onClick={() => setTab('inquiries')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border',
            tab === 'inquiries' ? 'bg-primary text-white border-primary' : 'border-border text-muted',
          )}
        >
          Demandes{newCount > 0 ? ` (${newCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('bookings')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold border',
            tab === 'bookings' ? 'bg-primary text-white border-primary' : 'border-border text-muted',
          )}
        >
          Réservations{bookings.length > 0 ? ` (${bookings.length})` : ''}
        </button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {listingTab && listingPool.length > 0 && (
        <CatalogueFilterBar
          search={svcQuery}
          onSearchChange={setSvcQuery}
          searchPlaceholder="Titre, ville, commune…"
          view={servicesViewMode}
          onViewChange={(mode) => {
            if (mode === 'grid' || mode === 'list') setServicesViewMode(mode);
          }}
          hideViewToggle
          chips={serviceChips}
          onRemoveChip={(id) => {
            if (id === 'category') setFilterCategory('');
            if (id === 'city') setFilterCity('');
            if (id === 'visibility') setFilterVisibility('all');
            if (id === 'mobility') setFilterMobility('');
          }}
          onClearChips={() => {
            setSvcQuery('');
            setFilterCategory('');
            setFilterCity('');
            setFilterVisibility('all');
            setFilterMobility('');
          }}
          resultLabel={`${filteredServices.length} ${listingIsRental
            ? `location${filteredServices.length > 1 ? 's' : ''}`
            : `prestation${filteredServices.length > 1 ? 's' : ''}`}`}
          modalTitle={listingIsRental ? 'Filtrer les locations' : 'Filtrer les prestations'}
          filters={
            <>
              <CatalogueFilterField label={listingIsRental ? 'Type de location' : 'Métier'}>
                <CatalogueChoicePills
                  options={(listingIsRental ? SERVICE_RENTAL_CATEGORIES : SERVICE_TRADE_CATEGORIES).map((id) => ({
                    id,
                    label: SERVICE_CATEGORY_LABELS[id],
                  }))}
                  value={filterCategory}
                  onChange={setFilterCategory}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Ville">
                <CatalogueChoicePills
                  options={[
                    { id: 'Kinshasa', label: 'Kinshasa' },
                    { id: 'Lubumbashi', label: 'Lubumbashi' },
                  ]}
                  value={filterCity}
                  onChange={setFilterCity}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Publication">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Toutes' },
                    { id: 'public', label: 'Publiées' },
                    { id: 'hidden', label: 'Brouillons' },
                  ]}
                  value={filterVisibility}
                  onChange={(id) => setFilterVisibility((id as 'all' | 'public' | 'hidden') || 'all')}
                />
              </CatalogueFilterField>
              <CatalogueFilterField label="Intervention">
                <CatalogueChoicePills
                  options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                  value={filterMobility}
                  onChange={(id) => setFilterMobility((id as ServiceMobility) || '')}
                />
              </CatalogueFilterField>
            </>
          }
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : tab === 'bookings' ? (
        <MarketplaceBookingsPanel bookings={bookings} commissionDueFc={commissionDueFc} onChanged={load} />
      ) : tab === 'inquiries' ? (
        <MarketplaceInquiriesPanel
          inquiries={inquiries}
          onMarkContacted={markContacted}
          onConvert={convertInquiry}
        />
      ) : listingPool.length === 0 ? (
          <EmptyState
            icon={listingIsRental ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            title={listingIsRental ? 'Aucune location' : 'Aucune prestation'}
            description={listingIsRental
              ? 'Ajoutez une location d’habits, de véhicule ou de matériel, puis publiez la fiche.'
              : 'Ajoutez un traiteur, un DJ, un photographe… puis publiez la fiche.'}
            action={
              <Button
                size="sm"
                onClick={() => openCreate(listingIsRental ? 'rental' : 'trade')}
                disabled={servicesAtLimit}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {listingIsRental ? 'Créer une location' : 'Créer une prestation'}
              </Button>
            }
          />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            icon={listingIsRental ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            title={listingIsRental ? 'Aucune location pour ces filtres' : 'Aucune prestation pour ces filtres'}
            description={listingIsRental
              ? 'Élargissez le type de location, la ville ou la visibilité.'
              : 'Élargissez le métier, la ville ou la visibilité.'}
          />
        ) : (
          <>
          <div className={servicesViewMode === 'grid' ? servicesGridClass : listStackClass}>
            {paginateItems(filteredServices, servicesPage, servicesPageSize).map((item) => {
              const photos = photosOf(item);
              const cover = photos[0] ? mediaPosterUrl(photos[0]) : null;
              const meta = [
                item.city,
                item.travels === false
                  ? 'Sur place'
                  : item.coverageRadiusKm
                    ? `Se déplace · ${item.coverageRadiusKm} km`
                    : 'Se déplace',
                item.priceFromFc != null ? `dès ${formatFc(item.priceFromFc)}` : null,
              ].filter(Boolean).join(' · ');
              const actions = (
                <div className={cn('flex gap-2', servicesViewMode === 'list' && 'flex-wrap justify-end')}>
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                    Modifier
                  </Button>
                  {item.isPublic && (
                    <Link href={dashboardServiceHref(item.slug, item.category)} className="inline-flex">
                      <Button size="sm" variant="ghost" leftIcon={<Globe className="w-3.5 h-3.5" />}>
                        Voir
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                    Supprimer
                  </Button>
                </div>
              );
              if (servicesViewMode === 'list') {
                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-3 border border-border rounded-[var(--radius-card)] bg-surface p-3 sm:p-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-surface-muted">
                        {cover ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-muted">
                            {listingIsRental ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                          {SERVICE_CATEGORY_LABELS[item.category]}
                        </p>
                        <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
                        <p className="text-xs text-muted mt-0.5 truncate">{meta}</p>
                      </div>
                      <StatusPill tone={item.isPublic ? 'emerald' : 'slate'}>
                        {item.isPublic ? 'Publiée' : 'Brouillon'}
                      </StatusPill>
                    </div>
                    {actions}
                  </div>
                );
              }
              return (
                <div key={item.id} className="border border-border rounded-[var(--radius-card)] bg-surface overflow-hidden flex flex-col">
                  <div className="relative aspect-[16/10] bg-surface-muted">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted">
                        {listingIsRental ? <KeyRound className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <StatusPill tone={item.isPublic ? 'emerald' : 'slate'}>
                        {item.isPublic ? 'Publiée' : 'Brouillon'}
                      </StatusPill>
                    </div>
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {SERVICE_CATEGORY_LABELS[item.category]}
                      </p>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="text-xs text-muted mt-0.5">{meta}</p>
                    </div>
                    <div className="pt-1 mt-auto">{actions}</div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={servicesPage}
            pageSize={servicesPageSize}
            total={filteredServices.length}
            onPageChange={setServicesPage}
            onPageSizeChange={setServicesPageSize}
            itemLabel={listingIsRental ? 'locations' : 'prestations'}
          />
          </>
        )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing
          ? `${isServiceRentalCategory(editing.category) ? 'Location' : 'Prestation'} — ${editing.title}`
          : isServiceRentalCategory(draft.category)
            ? 'Nouvelle location'
            : 'Nouvelle prestation'}
        description="Visible sur le marketplace uniquement après publication."
        size="xl"
        footer={
          <div className="flex w-full justify-between gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setEditorOpen(false)}>
              Annuler
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" loading={saving} onClick={() => handleSave(false)} leftIcon={<GlobeLock className="w-4 h-4" />}>
                Brouillon
              </Button>
              <Button type="button" variant="success" size="sm" loading={saving} onClick={() => handleSave(true)} leftIcon={<Globe className="w-4 h-4" />}>
                Publier
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <MarketplaceFormTabs value={editorTab} onChange={setEditorTab} />
          {editorTab === 'details' && (
            <>
          <Input label="Titre" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          <label>
            <span className="block text-xs font-medium text-muted mb-1.5">Catégorie</span>
            <select
              value={draft.category}
              onChange={(e) => {
                const category = e.target.value as ServiceCategory;
                setDraft((d) => ({
                  ...d,
                  category,
                  priceUnit: unitsForServiceCategory(category).includes(d.priceUnit)
                    ? d.priceUnit
                    : defaultUnitForServiceCategory(category),
                }));
              }}
              className={fieldClass}
            >
              {isServiceRentalCategory(draft.category) ? (
                SERVICE_RENTAL_CATEGORIES.map((id) => (
                  <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
                ))
              ) : (
                SERVICE_TRADE_CATEGORIES.map((id) => (
                  <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
                ))
              )}
            </select>
          </label>
          {isServiceRentalCategory(draft.category) ? (
            <p className="text-[11px] text-muted -mt-1">
              {SERVICE_CATEGORY_META[draft.category].hint} Indiquez le parc, les tailles / modèles et la caution dans la fiche.
            </p>
          ) : (
            <p className="text-[11px] text-muted -mt-1">{SERVICE_CATEGORY_META[draft.category].hint}</p>
          )}
          <label>
            <span className="block text-xs font-medium text-muted mb-1.5">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <ListingDetailsFields
            kind="service"
            hideDescription
            category={draft.category}
            value={draft.details}
            onChange={(details: ListingDetails) => setDraft((d) => ({ ...d, details }))}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <CityLocationFields
                city={draft.city}
                commune={draft.commune}
                neighborhood={draft.neighborhood}
                onChange={({ city, commune, neighborhood }) =>
                  setDraft((d) => ({ ...d, city, commune, neighborhood }))
                }
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <span className="block text-xs font-medium text-muted">Zone d’intervention</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: false, label: 'Sur place uniquement' },
                  { id: true, label: 'Je me déplace' },
                ].map((opt) => (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() => setDraft((d) => ({
                      ...d,
                      travels: opt.id,
                      coverageRadiusKm: opt.id ? d.coverageRadiusKm : '',
                    }))}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                      draft.travels === opt.id
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-surface text-muted border-border hover:text-foreground',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {draft.travels ? (
                <Input
                  label="Rayon d’intervention (km)"
                  type="number"
                  min={1}
                  value={draft.coverageRadiusKm}
                  onChange={(e) => setDraft((d) => ({ ...d, coverageRadiusKm: e.target.value }))}
                />
              ) : (
                <p className="text-[11px] text-muted">
                  Les clients viennent à votre adresse. Aucun rayon n’est affiché sur la carte.
                </p>
              )}
            </div>
            <Input
              label="Tarif de départ (FC)"
              type="number"
              min={0}
              value={draft.priceFromFc}
              onChange={(e) => setDraft((d) => ({ ...d, priceFromFc: e.target.value }))}
            />
            <label>
              <span className="block text-xs font-medium text-muted mb-1.5">Unité</span>
              <select
                value={draft.priceUnit}
                onChange={(e) => setDraft((d) => ({ ...d, priceUnit: e.target.value as VenuePriceUnit }))}
                className={fieldClass}
              >
                {unitsForServiceCategory(draft.category).map((id) => {
                  const opt = PRICE_UNIT_OPTIONS.find((item) => item.id === id);
                  return (
                    <option key={id} value={id}>
                      {opt?.label || id}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-muted mt-1">
                {PRICE_UNIT_OPTIONS.find((opt) => opt.id === draft.priceUnit)?.hint
                  || 'Choisissez l’unité affichée aux clients.'}
              </p>
            </label>
            <Input
              label="Quota min. invités"
              type="number"
              min={0}
              value={draft.quotaMin}
              onChange={(e) => setDraft((d) => ({ ...d, quotaMin: e.target.value }))}
            />
            <Input
              label="Quota max. invités"
              type="number"
              min={0}
              value={draft.quotaMax}
              onChange={(e) => setDraft((d) => ({ ...d, quotaMax: e.target.value }))}
            />
          </div>
          <BlockedDatesField
            value={draft.blockedDates}
            bookedDates={draft.bookedDates}
            onChange={(blockedDates) => setDraft((d) => ({ ...d, blockedDates }))}
          />
            </>
          )}
          {editorTab === 'map' && (
            <LocationPickerMap
              latitude={draft.latitude}
              longitude={draft.longitude}
              city={draft.city}
              commune={draft.commune}
              required
              onChange={({ latitude, longitude }) => setDraft((d) => ({ ...d, latitude, longitude }))}
            />
          )}
          {editorTab === 'medias' && (
            <MarketplaceMediaField
              urls={draft.photos}
              onChange={(photos) => setDraft((d) => ({ ...d, photos }))}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

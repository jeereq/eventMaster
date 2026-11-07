'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getQuotaLockMessage, getQuotaActionMessage, getWorkspaceModules, isUnlimitedQuota } from '@/lib/planAccess';
import PlanLimitCallout from '@/components/PlanLimitCallout';
import {
  PageHeader, Button, Breadcrumbs, Alert, Modal, EmptyState, StatusPill,
  Pagination, usePaginateItems, usePageSize, ViewModeToggle, useViewMode, listStackClass,
} from '@/components/ui';
import CatalogueFilterBar, { CatalogueChoicePills, CatalogueFilterField, type CatalogueFilterChip } from '@/components/CatalogueFilterBar';
import {
  SERVICE_CATEGORY_LABELS,
  RENTAL_DELIVERY_OPTIONS,
  SERVICE_MOBILITY_OPTIONS,
  rentalDeliveryFilterLabel,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  isServiceRentalCategory,
  mediaPosterUrl,
  parseBlockedDates,
  defaultUnitForServiceCategory,
  dashboardServiceHref,
  type MarketplaceInquiryItem,
  type ServiceCategory,
  type RentalDeliveryFilter,
  type ServiceMobility,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import { EMPTY_LISTING_DETAILS, parseListingDetails } from '@/lib/listingDetails';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commissionPercent } from '@/lib/platformRates';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  AlertTriangle, CalendarCheck, Globe, GlobeLock, Inbox, KeyRound, Loader2, Plus, Sparkles, Trash2,
} from 'lucide-react';
import { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import ServiceOfferingForm, {
  focusOfferingField,
  getOfferingPublishGaps,
  OFFERING_PROMO_FIELD_ID,
  offeringPromoMessage,
  type ServiceOfferingDraft,
} from '@/components/ServiceOfferingForm';
import { useRememberListReturn } from '@/lib/catalogueQuery';
import VendorBeveragePrices from '@/components/VendorBeveragePrices';

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
  deliveryMode?: string | null;
  deliveryPriceFc?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  priceFromFc: number | null;
  promoPriceFc?: number | null;
  promoLabel?: string | null;
  promoEndsAt?: string | null;
  priceUnit: VenuePriceUnit;
  quotaMin?: number | null;
  quotaMax?: number | null;
  photos: unknown;
  blockedDates?: unknown;
  bookedDates?: string[];
  isPublic: boolean;
  isBlockedByAdmin?: boolean;
  adminBlockReason?: string | null;
  details?: unknown;
}

type DeskTab = 'services' | 'rentals' | 'beverages';

/** Métiers qui vendent aussi des boissons (onglet Boissons). */
const BEVERAGE_SELLER_CATEGORIES: ServiceCategory[] = ['CATERING', 'EVENT_PLANNER', 'OTHER'];

function offeringStatus(item: ServiceItem): { tone: 'emerald' | 'slate' | 'rose'; label: string } {
  if (item.isBlockedByAdmin) return { tone: 'rose', label: 'Suspendue' };
  return item.isPublic ? { tone: 'emerald', label: 'Publiée' } : { tone: 'slate', label: 'Brouillon' };
}

function deskAskingPrice(item: ServiceItem): string | null {
  if (item.priceFromFc == null) return null;
  const ended = item.promoEndsAt ? new Date(item.promoEndsAt).getTime() < Date.now() : false;
  if (item.promoPriceFc != null && item.promoPriceFc < item.priceFromFc && !ended) {
    return `promo ${formatFc(item.promoPriceFc)}`;
  }
  return `dès ${formatFc(item.priceFromFc)}`;
}

export default function MarketplaceDeskPage() {
  useRememberListReturn();
  const { access, refreshProfile, planQuota, planFeatures, tenant, planName } = useAuth();
  /** Nom commercial du forfait (base) ; l'identifiant brut seulement si le nom n'est pas chargé. */
  const planLabel = planName || tenant?.plan || null;
  const { site } = usePlatformSite();
  const router = useRouter();
  const canManage = Boolean(access?.canManageRooms);
  const servicesNotIncluded = Boolean(
    planQuota && !isUnlimitedQuota(planQuota.limits.maxServices ?? 0) && (planQuota.limits.maxServices ?? 0) <= 0,
  );
  const [tabChoice, setTab] = useState<DeskTab | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [inquiries, setInquiries] = useState<MarketplaceInquiryItem[]>([]);
  const [sellsBeverages, setSellsBeverages] = useState(false);
  const venueAccount = getWorkspaceModules({ accountKind: tenant?.accountKind, access, planQuota, planFeatures }).showRooms;
  // Boissons : traiteurs, organisateurs, salles, ou vendeur qui a déjà des tarifs boissons.
  const showBeverages = sellsBeverages
    || venueAccount
    || services.some((item) => BEVERAGE_SELLER_CATEGORIES.includes(item.category));
  const tab: DeskTab = tabChoice === 'beverages' && !showBeverages
    ? 'services'
    : tabChoice ?? (servicesNotIncluded && showBeverages ? 'beverages' : 'services');
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
  const [filterDelivery, setFilterDelivery] = useState<RentalDeliveryFilter>('');
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
  const [mediaUploading, setMediaUploading] = useState(false);
  const [editorTab, setEditorTab] = useState<MarketplaceFormTab>('details');
  const [draft, setDraft] = useState<ServiceOfferingDraft>({
    title: '',
    description: '',
    category: 'CATERING' as ServiceCategory,
    city: '',
    commune: '',
    neighborhood: '',
    coverageRadiusKm: '',
    travels: true,
    deliveryMode: '',
    deliveryPriceFc: '',
    latitude: '',
    longitude: '',
    priceFromFc: '',
    priceUnit: 'EVENT' as VenuePriceUnit,
    promoPriceFc: '',
    promoLabel: '',
    promoEndsAt: '',
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
      const [svc, leads, drinks] = await Promise.all([
        api.get('/marketplace/services'),
        // Compteur des nouvelles demandes (le traitement se fait dans « Demandes de devis »).
        api.get('/marketplace/inquiries?role=vendor').catch(() => ({ inquiries: [] })),
        api.get('/marketplace/beverage-catalog').catch(() => ({ brands: [] })),
      ]);
      setServices(svc.services || []);
      setInquiries(leads.inquiries || []);
      const brands: Array<{ myPrices?: unknown[] }> = Array.isArray(drinks?.brands) ? drinks.brands : [];
      setSellsBeverages(brands.some((brand) => Array.isArray(brand.myPrices) && brand.myPrices.length > 0));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le marketplace.');
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
  }, [servicesPageSize, svcQuery, filterCategory, filterCity, filterVisibility, filterMobility, filterDelivery, tab]);

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
      setError(getQuotaActionMessage('services', planQuota, planLabel));
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
      deliveryMode: '',
      deliveryPriceFc: '',
      latitude: '',
      longitude: '',
      priceFromFc: '',
      priceUnit: defaultUnitForServiceCategory(category),
      promoPriceFc: '',
      promoLabel: '',
      promoEndsAt: '',
      quotaMin: '',
      quotaMax: '',
      photos: [],
      blockedDates: [],
      bookedDates: [],
      isPublic: true,
      details: EMPTY_LISTING_DETAILS,
    });
    setEditorTab('details');
    setError('');
    setEditorOpen(true);
  };

  // `?new=1` (bouton « Nouvelle offre » de l’accueil) : ouvre directement le formulaire.
  const newRequested = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') !== '1') return;
    newRequested.current = true;
    params.delete('new');
    const qs = params.toString();
    window.history.replaceState(null, '', `/dashboard/marketplace${qs ? `?${qs}` : ''}`);
  }, []);
  useEffect(() => {
    if (!newRequested.current || loading || !canManage) return;
    newRequested.current = false;
    openCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, canManage]);

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    const details = parseListingDetails(item.details);
    const deliveryMode = item.deliveryMode === 'included' || item.deliveryMode === 'extra_fee'
      ? item.deliveryMode
      : details.deliveryMode === 'included' || details.deliveryMode === 'extra_fee'
        ? details.deliveryMode
        : '';
    setDraft({
      title: item.title,
      description: item.description || '',
      category: item.category,
      city: item.city || '',
      commune: item.commune || '',
      neighborhood: item.neighborhood || '',
      coverageRadiusKm: item.coverageRadiusKm != null ? String(item.coverageRadiusKm) : '',
      travels: item.travels ?? Boolean(item.coverageRadiusKm && item.coverageRadiusKm > 0),
      deliveryMode,
      deliveryPriceFc: item.deliveryPriceFc != null ? String(item.deliveryPriceFc) : details.deliveryPriceFc,
      latitude: item.latitude != null ? String(item.latitude) : '',
      longitude: item.longitude != null ? String(item.longitude) : '',
      priceFromFc: item.priceFromFc != null ? String(item.priceFromFc) : '',
      priceUnit: item.priceUnit,
      promoPriceFc: item.promoPriceFc != null ? String(item.promoPriceFc) : '',
      promoLabel: item.promoLabel || '',
      promoEndsAt: item.promoEndsAt ? String(item.promoEndsAt).slice(0, 10) : '',
      quotaMin: item.quotaMin != null ? String(item.quotaMin) : '',
      quotaMax: item.quotaMax != null ? String(item.quotaMax) : '',
      photos: photosOf(item),
      blockedDates: parseBlockedDates(item.blockedDates),
      bookedDates: parseBlockedDates(item.bookedDates),
      isPublic: item.isPublic,
      details,
    });
    setEditorTab('details');
    setError('');
    setEditorOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    if (mediaUploading) {
      setEditorTab('medias');
      setError('Patientez : vos photos sont encore en cours d’envoi.');
      return;
    }
    const promoMessage = offeringPromoMessage(draft);
    if (promoMessage) {
      setEditorTab('details');
      setError(promoMessage);
      focusOfferingField(OFFERING_PROMO_FIELD_ID);
      return;
    }
    if (publish) {
      const gaps = getOfferingPublishGaps(draft);
      if (gaps.length) {
        const first = gaps[0];
        setEditorTab(first.tab);
        setError(first.message);
        focusOfferingField(first.fieldId);
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
        deliveryMode: isServiceRentalCategory(draft.category)
          ? (draft.travels ? draft.deliveryMode : 'pickup')
          : null,
        deliveryPriceFc: isServiceRentalCategory(draft.category) && draft.travels && draft.deliveryPriceFc
          ? Number(draft.deliveryPriceFc)
          : null,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
        priceFromFc: draft.priceFromFc ? Number(draft.priceFromFc) : null,
        priceUnit: draft.priceUnit,
        promoPriceFc: draft.promoPriceFc ? Number(draft.promoPriceFc) : null,
        promoLabel: draft.promoLabel,
        promoEndsAt: draft.promoEndsAt || null,
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
        ? (isServiceRentalCategory(draft.category) ? 'Matériel / équipement publié.' : 'Prestation publiée.')
        : (isServiceRentalCategory(draft.category) ? 'Matériel / équipement enregistré.' : 'Prestation enregistrée.'));
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
      setSuccess(isServiceRentalCategory(item.category) ? 'Matériel / équipement supprimé.' : 'Prestation supprimée.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Suppression impossible.');
    }
  };

  const newCount = inquiries.filter((i) => i.status === 'NEW' && !i.closedAt).length;

  const deskTabs: Array<{ id: DeskTab; label: string; locked?: boolean }> = [
    { id: 'services', label: 'Prestations', locked: servicesNotIncluded },
    { id: 'rentals', label: 'Matériel & Équipements', locked: servicesNotIncluded },
    ...(showBeverages ? [{ id: 'beverages' as const, label: 'Boissons' }] : []),
  ];
  // Forfait Salle sans fiches : ne pas ouvrir sur un onglet verrouillé.
  const orderedDeskTabs = servicesNotIncluded
    ? [...deskTabs.filter((item) => !item.locked), ...deskTabs.filter((item) => item.locked)]
    : deskTabs;

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
    const matchesMobility = listingIsRental || !filterMobility
      || (filterMobility === 'on_site' && travels === false)
      || (filterMobility === 'travels' && travels !== false);
    const matchesDelivery = !listingIsRental || !filterDelivery
      || (filterDelivery === 'pickup' && (item.deliveryMode === 'pickup' || travels === false))
      || item.deliveryMode === filterDelivery;
    return matchesSearch && matchesCategory && matchesCity && matchesVisibility && matchesMobility && matchesDelivery;
  });
  const pagedServices = usePaginateItems(filteredServices, servicesPage, servicesPageSize);

  const publishGaps = getOfferingPublishGaps(draft);

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Marketplace" description="Réservé aux propriétaires et managers de l’organisation." />
      </div>
    );
  }

  const serviceChips: CatalogueFilterChip[] = [
    ...(filterCategory ? [{ id: 'category', label: 'Catégorie', value: SERVICE_CATEGORY_LABELS[filterCategory as ServiceCategory] || filterCategory }] : []),
    ...(filterCity ? [{ id: 'city', label: 'Ville', value: filterCity }] : []),
    ...(filterVisibility !== 'all' ? [{ id: 'visibility', label: 'Visibilité', value: filterVisibility === 'public' ? 'Publiées' : 'Brouillons' }] : []),
    ...(listingIsRental && filterDelivery ? [{ id: 'delivery', label: 'Livraison', value: rentalDeliveryFilterLabel(filterDelivery) }] : []),
    ...(!listingIsRental && filterMobility ? [{ id: 'mobility', label: 'Intervention', value: filterMobility === 'on_site' ? 'Sur place' : 'Se déplace' }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mes offres"
        description={`Vos fiches publiées au catalogue${showBeverages ? ' et vos tarifs boissons' : ''}. Commission ${commissionPercent(site)} %.`}
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Mes offres' }]} />
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
                {listingIsRental ? 'Nouveau matériel' : 'Nouvelle prestation'}
              </Button>
            </div>
          ) : undefined
        }
      />

      {planQuota && listingTab && !servicesNotIncluded && (
        <p className="text-xs text-muted">
          Fiches : {planQuota.usage.services ?? 0} /{' '}
          {(planQuota.limits.maxServices ?? 0) >= 9999 ? '∞' : planQuota.limits.maxServices}
        </p>
      )}
      {servicesAtLimit && listingTab && (
        <PlanLimitCallout kind="services" planQuota={planQuota} planName={planLabel} />
      )}

      <div role="tablist" aria-label="Mes offres" className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
        {orderedDeskTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            title={item.locked ? 'Non inclus dans votre forfait' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 shrink-0 min-h-11 px-3 py-2 rounded-full text-xs font-semibold border whitespace-nowrap touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              tab === item.id ? 'bg-primary-solid text-primary-foreground border-primary-solid' : 'border-border text-muted hover:text-foreground',
            )}
          >
            {item.locked ? <KeyRound className="w-3.5 h-3.5" aria-hidden /> : null}
            {item.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 w-px shrink-0 self-stretch bg-border" />
        <Link
          href="/dashboard/bookings?tab=quotes"
          className="inline-flex items-center gap-1.5 shrink-0 min-h-11 px-3 py-2 rounded-full text-xs font-semibold border border-border text-muted hover:text-foreground whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <Inbox className="w-3.5 h-3.5" aria-hidden />
          Demandes de devis{newCount > 0 ? ` (${newCount})` : ''}
        </Link>
        <Link
          href="/dashboard/bookings?tab=bookings"
          className="inline-flex items-center gap-1.5 shrink-0 min-h-11 px-3 py-2 rounded-full text-xs font-semibold border border-border text-muted hover:text-foreground whitespace-nowrap touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <CalendarCheck className="w-3.5 h-3.5" aria-hidden />
          Réservations
        </Link>
      </div>

      {services.some((item) => item.isBlockedByAdmin) ? (
        <Alert variant="error">
          {services.filter((item) => item.isBlockedByAdmin).length > 1
            ? 'Certaines fiches sont suspendues par EventMaster et ne sont plus visibles au catalogue.'
            : 'Une fiche est suspendue par EventMaster et n’est plus visible au catalogue.'}{' '}
          Le motif est indiqué sur la fiche. Corrigez-la puis contactez le support pour la remettre en ligne.
        </Alert>
      ) : null}

      {error && !editorOpen ? <Alert variant="error">{error}</Alert> : null}
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
            if (id === 'delivery') setFilterDelivery('');
          }}
          onClearChips={() => {
            setSvcQuery('');
            setFilterCategory('');
            setFilterCity('');
            setFilterVisibility('all');
            setFilterMobility('');
            setFilterDelivery('');
          }}
          resultLabel={`${filteredServices.length} ${listingIsRental
            ? `matériel${filteredServices.length > 1 ? 's' : ''}`
            : `prestation${filteredServices.length > 1 ? 's' : ''}`}`}
          modalTitle={listingIsRental ? 'Filtrer le matériel & équipements' : 'Filtrer les prestations'}
          filters={
            <>
              <CatalogueFilterField label={listingIsRental ? 'Type de matériel' : 'Prestataire'}>
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
              {listingIsRental ? (
                <CatalogueFilterField label="Livraison" hint="Le prix inclus est déjà compris dans le tarif.">
                  <CatalogueChoicePills
                    options={RENTAL_DELIVERY_OPTIONS}
                    value={filterDelivery}
                    onChange={(id) => setFilterDelivery((id as RentalDeliveryFilter) || '')}
                  />
                </CatalogueFilterField>
              ) : (
                <CatalogueFilterField label="Intervention">
                  <CatalogueChoicePills
                    options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
                    value={filterMobility}
                    onChange={(id) => setFilterMobility((id as ServiceMobility) || '')}
                  />
                </CatalogueFilterField>
              )}
            </>
          }
        />
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : tab === 'beverages' ? (
        <VendorBeveragePrices />
      ) : listingPool.length === 0 ? (
          <EmptyState
            icon={listingIsRental ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            title={listingIsRental ? 'Aucun matériel / équipement' : 'Aucune prestation'}
            description={listingIsRental
              ? 'Ajoutez du matériel (mobilier, véhicule, sonorisation, tentes…), puis publiez la fiche.'
              : 'Ajoutez un traiteur, un DJ, un photographe… puis publiez la fiche.'}
            action={
              <Button
                size="sm"
                onClick={() => openCreate(listingIsRental ? 'rental' : 'trade')}
                disabled={servicesAtLimit}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                {listingIsRental ? 'Créer un équipement' : 'Créer une prestation'}
              </Button>
            }
          />
        ) : filteredServices.length === 0 ? (
          <EmptyState
            icon={listingIsRental ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            title={listingIsRental ? 'Aucun matériel pour ces filtres' : 'Aucune prestation pour ces filtres'}
            description={listingIsRental
              ? 'Élargissez le type de matériel, la ville ou la visibilité.'
              : 'Élargissez la catégorie, la ville ou la visibilité.'}
          />
        ) : (
          <>
          <div className={servicesViewMode === 'grid' ? servicesGridClass : listStackClass}>
            {pagedServices.map((item) => {
              const photos = photosOf(item);
              const cover = photos[0] ? mediaPosterUrl(photos[0]) : null;
              const place = [item.neighborhood, item.commune, item.city].filter(Boolean).join(', ');
              const meta = [
                place || 'Lieu non renseigné',
                item.latitude != null && item.longitude != null ? 'GPS' : 'Sans GPS',
                item.travels === false
                  ? 'Sur place'
                  : item.coverageRadiusKm
                    ? `Se déplace · ${item.coverageRadiusKm} km`
                    : 'Se déplace',
                deskAskingPrice(item),
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
                          <img src={cover} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
                        {item.isBlockedByAdmin ? (
                          <p className="mt-0.5 text-xs text-danger truncate" title={item.adminBlockReason || undefined}>
                            Suspendue par EventMaster{item.adminBlockReason ? ` : ${item.adminBlockReason}` : ''}
                          </p>
                        ) : null}
                      </div>
                      <StatusPill tone={offeringStatus(item).tone}>
                        {offeringStatus(item).label}
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
                      <img src={cover} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted">
                        {listingIsRental ? <KeyRound className="w-8 h-8" /> : <Sparkles className="w-8 h-8" />}
                      </div>
                    )}
                    <div className="absolute top-2.5 right-2.5">
                      <StatusPill tone={offeringStatus(item).tone}>
                        {offeringStatus(item).label}
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
                      {item.isBlockedByAdmin ? (
                        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-danger">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden />
                          Suspendue par EventMaster{item.adminBlockReason ? ` : ${item.adminBlockReason}` : '.'}
                        </p>
                      ) : null}
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
            itemLabel={listingIsRental ? 'équipements' : 'prestations'}
          />
          </>
        )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing
          ? `${isServiceRentalCategory(editing.category) ? 'Matériel & Équipement' : 'Prestation'} — ${editing.title}`
          : isServiceRentalCategory(draft.category)
            ? 'Nouveau matériel & équipement'
            : 'Nouvelle prestation'}
        description="Brouillon : visible par vous seul. Publiée : visible par les clients."
        size="xl"
        footer={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted" role="status">
              {mediaUploading
                ? 'Envoi des photos en cours…'
                : publishGaps.length
                  ? `Pour publier : ${publishGaps[0].message}`
                  : 'Tout est prêt.'}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditorOpen(false)}>
                Annuler
              </Button>
              <Button type="button" variant="secondary" size="sm" loading={saving} disabled={mediaUploading} onClick={() => handleSave(false)} leftIcon={<GlobeLock className="w-4 h-4" />}>
                Enregistrer en brouillon
              </Button>
              <Button type="button" variant="success" size="sm" loading={saving} disabled={mediaUploading} onClick={() => handleSave(true)} leftIcon={<Globe className="w-4 h-4" />}>
                Publier
              </Button>
            </div>
          </div>
        }
      >
        <ServiceOfferingForm
          draft={draft}
          onChange={setDraft}
          tab={editorTab}
          onTabChange={setEditorTab}
          error={error}
          onUploadingChange={setMediaUploading}
        />
      </Modal>
    </div>
  );
}

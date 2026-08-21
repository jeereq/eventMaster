'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, Clock, CreditCard, FileText, Loader2, LogIn, Store, Users, Wallet, Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Button, Badge, Modal, StatusPill, usePageSize,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import CatalogueFilterBar, {
  CatalogueChoicePills,
  CatalogueEntityFilterFields,
  CatalogueFilterField,
  type CatalogueFilterChip,
} from '@/components/CatalogueFilterBar';
import {
  ACCOUNT_KIND_LABELS,
  EMPTY_CATALOGUE_GEO,
  appendCatalogueGeoParams,
  catalogueGeoChips,
  catalogueItemToMapMarker,
  clearCatalogueGeoChip,
  isCatalogueMapView,
  type CatalogueItem,
  type CatalogueViewMode,
  type TenantAccountKind,
} from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { commissionPercent, depositPercent } from '@/lib/platformRates';
import {
  EMPTY_CATALOGUE_EXTRAS,
  appendCatalogueEntityParams,
  catalogueEntityExtraChips,
  clearCatalogueExtraChip,
  type CatalogueEntityExtras,
} from '@/lib/catalogueEntityFilters';
import CatalogueResults, { CatalogueResultsSkeleton } from '@/components/CatalogueResults';
import { useCatalogueView } from '@/components/CatalogueViewToggle';
import MarketplaceLocationsMap from '@/components/MarketplaceLocationsMap';
import { useRememberListReturn } from '@/lib/catalogueQuery';

type CatalogTab = 'venues' | 'offerings' | 'rentals' | 'inquiries' | 'bookings' | 'commissions';

interface Overview {
  venues: { total: number; publicCount: number };
  offerings: { total: number; publicCount: number };
  trades?: { total: number; publicCount: number };
  rentals?: { total: number; publicCount: number };
  inquiries: { total: number; newCount: number };
  bookings: { total: number; requestedCount: number };
  commissions?: { dueCount: number; dueFc: number; paidCount: number; paidFc: number };
  engagement?: { favorites: number; packs: number };
  gmv?: {
    venueFc: number;
    venueCount: number;
    tradeFc: number;
    tradeCount: number;
    rentalFc: number;
    rentalCount: number;
  };
}

interface VenueRow {
  id: string;
  slug: string;
  isPublic: boolean;
  headline: string;
  roomName: string;
  roomType?: string;
  capacity?: number | null;
  city: string | null;
  commune: string | null;
  neighborhood?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverUrl?: string | null;
  photos?: string[];
  priceFromFc: number | null;
  priceUnit?: string;
  priceUnitLabel: string;
  publishedAt: string | null;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  href: string;
}

interface OfferingRow {
  id: string;
  slug: string;
  isPublic: boolean;
  title: string;
  category: string;
  categoryLabel: string;
  city: string | null;
  commune: string | null;
  neighborhood?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  coverUrl?: string | null;
  photos?: string[];
  priceFromFc: number | null;
  priceUnit?: string;
  priceUnitLabel: string;
  travels?: boolean;
  publishedAt: string | null;
  createdAt: string;
  tenantId: string;
  tenantName: string;
  href: string;
}

interface InquiryRow {
  id: string;
  kind: 'venue' | 'offering';
  title: string;
  status: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string | null;
  message: string;
  eventDate: string | null;
  guestCount: number | null;
  createdAt: string;
  vendorTenantId: string | null;
  vendorName: string | null;
  href: string | null;
}

interface BookingRow {
  id: string;
  kind: 'venue' | 'offering';
  title: string;
  status: string;
  eventDate: string;
  eventEndDate: string | null;
  amountFc: number;
  depositFc: number;
  commissionFc: number;
  createdAt: string;
  vendorTenantId: string;
  vendorName: string;
  organizerTenantId: string | null;
  organizerName: string | null;
  href: string | null;
}

interface CommissionRow {
  id: string;
  kind: 'venue' | 'offering';
  title: string;
  status: string;
  eventDate: string;
  amountFc: number;
  commissionRate: number;
  commissionFc: number;
  commissionSettledAt: string | null;
  createdAt: string;
  vendorTenantId: string;
  vendorName: string;
  organizerName: string | null;
  href: string | null;
}

interface ListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface TenantOps {
  tenant: {
    id: string;
    name: string;
    plan: string;
    accountKind: TenantAccountKind;
    licenseActive: boolean;
    licenseExpiresAt: string | null;
    managerName: string;
    managerEmail: string;
    manager?: { name: string | null; email: string } | null;
    vendorProfile?: { id: string; isBlockedByAdmin: boolean } | null;
  };
  counts: {
    users: number;
    events: number;
    rooms: number;
    venueListings: number;
    serviceOfferings: number;
  };
  canImpersonate: boolean;
}

const BOOKING_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Demandée',
  ACCEPTED: 'Acceptée',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function place(city: string | null, commune: string | null) {
  return [commune, city].filter(Boolean).join(', ') || 'Lieu non renseigné';
}

function venueToItem(row: VenueRow): CatalogueItem {
  return {
    kind: 'venue',
    id: `venue:${row.slug}`,
    slug: row.slug,
    href: row.href,
    title: row.headline,
    orgName: row.tenantName,
    categoryLabel: 'Salle',
    location: place(row.city, row.commune),
    coverUrl: row.coverUrl || null,
    photos: row.photos || [],
    priceFromFc: row.priceFromFc,
    priceUnitLabel: row.priceUnitLabel,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    address: row.address || null,
    roomType: row.roomType as CatalogueItem['roomType'],
    capacity: row.capacity ?? null,
    priceUnit: row.priceUnit as CatalogueItem['priceUnit'],
  };
}

function offeringToItem(row: OfferingRow): CatalogueItem {
  return {
    kind: 'service',
    id: `service:${row.slug}`,
    slug: row.slug,
    href: row.href,
    title: row.title,
    orgName: row.tenantName,
    categoryLabel: row.categoryLabel,
    location: place(row.city, row.commune),
    coverUrl: row.coverUrl || null,
    photos: row.photos || [],
    priceFromFc: row.priceFromFc,
    priceUnitLabel: row.priceUnitLabel,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    category: row.category as CatalogueItem['category'],
    priceUnit: row.priceUnit as CatalogueItem['priceUnit'],
    travels: row.travels,
  };
}

export default function AdminCataloguePage() {
  useRememberListReturn();
  const router = useRouter();
  const { user, loading: authLoading, enterSupportSession } = useAuth();
  const { site } = usePlatformSite();
  const commissionPct = commissionPercent(site);
  const depositPct = depositPercent(site);
  const [tab, setTab] = useState<CatalogTab>('venues');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'hidden'>('all');
  const [geo, setGeo] = useState({ ...EMPTY_CATALOGUE_GEO });
  const [extras, setExtras] = useState<CatalogueEntityExtras>({ ...EMPTY_CATALOGUE_EXTRAS });
  const [inquiryStatus, setInquiryStatus] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [settlement, setSettlement] = useState<'due' | 'paid' | 'all'>('due');
  const { mode: view, setView, gridCols, setGridCols } = useCatalogueView('list');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize('admin-catalogue', 20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [venues, setVenues] = useState<ListResponse<VenueRow> | null>(null);
  const [offerings, setOfferings] = useState<ListResponse<OfferingRow> | null>(null);
  const [inquiries, setInquiries] = useState<ListResponse<InquiryRow> | null>(null);
  const [bookings, setBookings] = useState<ListResponse<BookingRow> | null>(null);
  const [commissions, setCommissions] = useState<(ListResponse<CommissionRow> & { sumCommissionFc?: number }) | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [moderation, setModeration] = useState<{
    kind: 'venues' | 'offerings' | 'vendors';
    id: string;
    label: string;
    publish: boolean;
    isBlocking?: boolean;
  } | null>(null);
  const [moderationReason, setModerationReason] = useState('');

  const [ficheOpen, setFicheOpen] = useState(false);
  const [fiche, setFiche] = useState<TenantOps | null>(null);
  const [ficheLoading, setFicheLoading] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== 'SUPER_ADMIN') router.replace('/dashboard');
  }, [authLoading, user, router]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [qInput]);

  const loadOverview = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    try {
      setOverview(await api.get('/admin/catalog/overview'));
    } catch {
      /* compteurs facultatifs */
    }
  }, [user?.role]);

  const load = useCallback(async () => {
    if (user?.role !== 'SUPER_ADMIN') return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('limit', String(pageSize));
      params.set('page', String(page));
      if (q) params.set('q', q);
      if (tab === 'venues' || tab === 'offerings' || tab === 'rentals') {
        appendCatalogueGeoParams(params, geo);
        appendCatalogueEntityParams(
          params,
          { ...extras, kind: tab === 'venues' ? 'venue' : tab === 'rentals' ? 'rental' : 'service' },
          tab === 'venues' ? 'venue' : 'service',
        );
        if (visibility === 'public') params.set('isPublic', '1');
        if (visibility === 'hidden') params.set('isPublic', '0');
      }
      if (tab === 'inquiries' && inquiryStatus) params.set('status', inquiryStatus);
      if (tab === 'bookings' && bookingStatus) params.set('status', bookingStatus);
      if (tab === 'commissions') params.set('settlement', settlement);
      if ((tab === 'venues' || tab === 'offerings' || tab === 'rentals') && isCatalogueMapView(view)) {
        params.set('limit', '100');
        params.set('page', '1');
      }

      if (tab === 'venues') setVenues(await api.get(`/admin/catalog/venues?${params}`));
      if (tab === 'offerings' || tab === 'rentals') setOfferings(await api.get(`/admin/catalog/offerings?${params}`));
      if (tab === 'inquiries') setInquiries(await api.get(`/admin/catalog/inquiries?${params}`));
      if (tab === 'bookings') setBookings(await api.get(`/admin/catalog/bookings?${params}`));
      if (tab === 'commissions') setCommissions(await api.get(`/admin/catalog/commissions?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, tab, page, pageSize, q, visibility, extras, inquiryStatus, bookingStatus, settlement, geo, view]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  const openFiche = async (tenantId: string) => {
    setFicheOpen(true);
    setFicheLoading(true);
    setFiche(null);
    try {
      setFiche(await api.get(`/admin/tenants/${tenantId}/ops`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger la fiche.');
      setFicheOpen(false);
    } finally {
      setFicheLoading(false);
    }
  };

  const openWorkspace = async (tenantId: string) => {
    try {
      setOpeningId(tenantId);
      const payload = await api.post(`/admin/tenants/${tenantId}/impersonate`);
      enterSupportSession(payload);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’ouvrir l’espace.');
      setOpeningId(null);
    }
  };

  const openModeration = (kind: 'venues' | 'offerings' | 'vendors', id: string, label: string, publish: boolean, isBlocking: boolean = false) => {
    setModeration({ kind, id, label, publish, isBlocking });
    setModerationReason('');
    setError('');
  };

  const submitModeration = async () => {
    if (!moderation) return;
    if (!moderation.publish && moderationReason.trim().length < 8) {
      setError('Indiquez un motif d’au moins 8 caractères pour justifier.');
      return;
    }
    setBusyId(moderation.id);
    setError('');
    try {
      if (moderation.isBlocking) {
        await api.patch(`/admin/catalog/${moderation.kind}/${moderation.id}/block`, {
          isBlocked: !moderation.publish,
          reason: moderationReason.trim() || undefined,
        });
      } else {
        await api.patch(`/admin/catalog/${moderation.kind}/${moderation.id}/visibility`, {
          isPublic: moderation.publish,
          reason: moderationReason.trim() || undefined,
        });
      }
      setModeration(null);
      setModerationReason('');
      await Promise.all([load(), loadOverview()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de mettre à jour le statut.');
    } finally {
      setBusyId(null);
    }
  };

  const settleCommission = async (id: string, settled: boolean, vendorName: string) => {
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/admin/catalog/bookings/${id}/commission`, { settled });
      await Promise.all([load(), loadOverview()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Impossible de ${settled ? 'encaisser' : 'remettre due'} la commission de ${vendorName}.`);
    } finally {
      setBusyId(null);
    }
  };

  const exportCommissions = async () => {
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      params.set('settlement', settlement);
      params.set('export', 'csv');
      await api.download(`/admin/catalog/commissions?${params}`, 'commissions-marketplace.csv');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible d’exporter les commissions.');
    } finally {
      setExporting(false);
    }
  };

  if (authLoading || user?.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const tabs: Array<{ id: CatalogTab; label: string; count?: number }> = [
    { id: 'venues', label: 'Salles', count: overview?.venues.total },
    { id: 'offerings', label: 'Prestataires', count: overview?.trades?.total ?? overview?.offerings.total },
    { id: 'rentals', label: 'Locations', count: overview?.rentals?.total },
    { id: 'inquiries', label: 'Demandes', count: overview?.inquiries.total },
    { id: 'bookings', label: 'Réservations', count: overview?.bookings.total },
    { id: 'commissions', label: `Commissions ${commissionPct} %`, count: overview?.commissions?.dueCount },
  ];

  const currentTotal =
    tab === 'venues'
      ? venues?.total ?? 0
      : tab === 'offerings' || tab === 'rentals'
        ? offerings?.total ?? 0
        : tab === 'inquiries'
          ? inquiries?.total ?? 0
          : tab === 'commissions'
            ? commissions?.total ?? 0
            : bookings?.total ?? 0;

  const catalogItems: CatalogueItem[] =
    tab === 'venues'
      ? (venues?.items || []).map(venueToItem)
      : tab === 'offerings' || tab === 'rentals'
        ? (offerings?.items || []).map(offeringToItem)
        : [];
  const catalogMarkers = catalogItems
    .filter((item) => item.latitude != null && item.longitude != null)
    .map(catalogueItemToMapMarker);
  const mapMode = (tab === 'venues' || tab === 'offerings' || tab === 'rentals') && isCatalogueMapView(view);

  const listingTab = tab === 'venues' || tab === 'offerings' || tab === 'rentals';
  const listingExtras: CatalogueEntityExtras = {
    ...extras,
    kind: tab === 'venues' ? 'venue' : tab === 'rentals' ? 'rental' : tab === 'offerings' ? 'service' : 'all',
  };
  const chips: CatalogueFilterChip[] = [
    ...(listingTab && visibility !== 'all' ? [{ id: 'visibility', label: 'Visibilité', value: visibility === 'public' ? 'Publiques' : 'Dépubliées' }] : []),
    ...(listingTab ? catalogueGeoChips(geo, catalogueEntityExtraChips(listingExtras)) : []),
    ...(tab === 'inquiries' && inquiryStatus ? [{ id: 'inquiry', label: 'Statut', value: inquiryStatus === 'NEW' ? 'Nouveau' : 'Contacté' }] : []),
    ...(tab === 'bookings' && bookingStatus ? [{ id: 'booking', label: 'Statut', value: BOOKING_STATUS_LABELS[bookingStatus] || bookingStatus }] : []),
    ...(tab === 'commissions' && settlement !== 'due' ? [{ id: 'settlement', label: 'Encaissement', value: settlement === 'paid' ? 'Payées' : 'Toutes' }] : []),
  ];

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Catalogue"
        description={`Modération des fiches (motif + audit), devis, réservations, GMV et commissions vendeur ${commissionPct} %.`}
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Catalogue' }]} />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          { label: 'Salles publiques', value: overview?.venues.publicCount ?? 0 },
          { label: 'Prestataires publics', value: overview?.trades?.publicCount ?? overview?.offerings.publicCount ?? 0 },
          { label: 'Locations publiques', value: overview?.rentals?.publicCount ?? 0 },
          { label: 'Devis nouveaux', value: overview?.inquiries.newCount ?? 0 },
          { label: 'Réservations demandées', value: overview?.bookings.requestedCount ?? 0 },
          { label: 'Commissions dues', value: formatFc(overview?.commissions?.dueFc ?? 0) },
        ].map((card) => (
          <div key={card.label} className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground">{card.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          { label: 'Favoris', value: overview?.engagement?.favorites ?? 0 },
          { label: 'Packs enregistrés', value: overview?.engagement?.packs ?? 0 },
          { label: 'GMV salles', value: formatFc(overview?.gmv?.venueFc ?? 0) },
          { label: 'GMV métiers', value: formatFc(overview?.gmv?.tradeFc ?? 0) },
          { label: 'GMV locations', value: formatFc(overview?.gmv?.rentalFc ?? 0) },
        ].map((card) => (
          <div key={card.label} className="bg-surface px-4 py-3">
            <div className="text-lg font-semibold text-foreground">{card.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setTab(item.id);
              setPage(1);
              if (item.id === 'venues' || item.id === 'offerings' || item.id === 'rentals') {
                setExtras({ ...EMPTY_CATALOGUE_EXTRAS });
              }
            }}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium border transition',
              tab === item.id
                ? 'bg-surface text-foreground border-border shadow-[var(--shadow-soft)]'
                : 'text-muted border-transparent hover:text-foreground',
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? ` (${item.count})` : ''}
          </button>
        ))}
      </div>

      <CatalogueFilterBar
        search={qInput}
        onSearchChange={setQInput}
        searchPlaceholder={tab === 'inquiries' ? 'Nom, e-mail…' : 'Titre, organisation, ville…'}
        view={view as CatalogueViewMode}
        onViewChange={(mode) => {
          setView(mode);
          setPage(1);
        }}
        hideViewToggle={tab === 'inquiries' || tab === 'bookings' || tab === 'commissions'}
        compactToggle
        gridCols={gridCols}
        onGridColsChange={setGridCols}
        chips={chips}
        onRemoveChip={(id) => {
          if (id === 'visibility') setVisibility('all');
          else if (id === 'inquiry') setInquiryStatus('');
          else if (id === 'booking') setBookingStatus('');
          else if (id === 'settlement') setSettlement('due');
          else {
            setGeo((prev) => clearCatalogueGeoChip(prev, id));
            setExtras((prev) => clearCatalogueExtraChip(prev, id));
          }
          setPage(1);
        }}
        onClearChips={() => {
          setVisibility('all');
          setGeo({ ...EMPTY_CATALOGUE_GEO });
          setExtras({ ...EMPTY_CATALOGUE_EXTRAS });
          setInquiryStatus('');
          setBookingStatus('');
          setSettlement('due');
          setPage(1);
        }}
        resultLabel={`${currentTotal} résultat${currentTotal > 1 ? 's' : ''}`}
        modalTitle="Filtres catalogue"
        filters={
          <>
            {(tab === 'venues' || tab === 'offerings' || tab === 'rentals') && (
              <CatalogueFilterField label="Visibilité">
                <CatalogueChoicePills
                  options={[
                    { id: 'all', label: 'Toutes' },
                    { id: 'public', label: 'Publiques' },
                    { id: 'hidden', label: 'Dépubliées' },
                  ]}
                  value={visibility}
                  onChange={(id) => { setVisibility((id as 'all' | 'public' | 'hidden') || 'all'); setPage(1); }}
                />
              </CatalogueFilterField>
            )}
            {(tab === 'venues' || tab === 'offerings' || tab === 'rentals') && (
              <CatalogueEntityFilterFields
                entity={tab === 'venues' ? 'venue' : tab === 'rentals' ? 'rental' : 'service'}
                value={geo}
                extras={listingExtras}
                showProximity={false}
                showAvailability={false}
                onChange={(nextGeo, nextExtras) => {
                  setGeo(nextGeo);
                  setExtras({ ...nextExtras, kind: 'all' });
                  setPage(1);
                }}
              />
            )}
            {tab === 'inquiries' && (
              <CatalogueFilterField label="Statut">
                <CatalogueChoicePills
                  options={[
                    { id: 'NEW', label: 'Nouveau' },
                    { id: 'CONTACTED', label: 'Contacté' },
                  ]}
                  value={inquiryStatus}
                  onChange={(id) => { setInquiryStatus(id); setPage(1); }}
                />
              </CatalogueFilterField>
            )}
            {tab === 'bookings' && (
              <CatalogueFilterField label="Statut">
                <CatalogueChoicePills
                  options={Object.entries(BOOKING_STATUS_LABELS).map(([id, label]) => ({ id, label }))}
                  value={bookingStatus}
                  onChange={(id) => { setBookingStatus(id); setPage(1); }}
                />
              </CatalogueFilterField>
            )}
            {tab === 'commissions' && (
              <CatalogueFilterField label="Encaissement">
                <CatalogueChoicePills
                  options={[
                    { id: 'due', label: 'Dues' },
                    { id: 'paid', label: 'Payées' },
                    { id: 'all', label: 'Toutes' },
                  ]}
                  value={settlement}
                  onChange={(id) => { setSettlement((id as 'due' | 'paid' | 'all') || 'due'); setPage(1); }}
                />
              </CatalogueFilterField>
            )}
          </>
        }
      />

      {tab === 'commissions' && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm text-muted">
            {settlement === 'paid' ? 'Encaissé' : settlement === 'all' ? 'Total filtré' : 'Dû'} :{' '}
            <span className="font-semibold text-foreground">{formatFc(commissions?.sumCommissionFc ?? 0)}</span>
            {' · '}commission {commissionPct} % (acompte {depositPct} %) sur réservations confirmées, versée hors plateforme.
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="sm:ml-auto"
            loading={exporting}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => void exportCommissions()}
          >
            Exporter CSV
          </Button>
        </div>
      )}

      {loading ? (
        (tab === 'venues' || tab === 'offerings' || tab === 'rentals') ? (
          <CatalogueResultsSkeleton mode={mapMode ? 'map' : view === 'list' ? 'list' : 'grid'} count={8} gridCols={gridCols} />
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )
      ) : tab === 'venues' || tab === 'offerings' || tab === 'rentals' ? (
        mapMode ? (
          catalogMarkers.length === 0 ? (
            <EmptyState icon={<Store className="w-5 h-5" />} title="Aucune position" description="Aucune fiche géolocalisée ne correspond aux filtres." />
          ) : (
            <MarketplaceLocationsMap
              markers={catalogMarkers}
              listingSearch
              navigateOnClick
              height={480}
              city={geo.city || null}
            />
          )
        ) : (
          <div className="space-y-3">
            <CatalogueResults
              items={catalogItems}
              mode={view === 'list' ? 'list' : 'grid'}
              gridCols={gridCols}
              emptyTitle={tab === 'venues' ? 'Aucune salle' : tab === 'rentals' ? 'Aucune location' : 'Aucun prestataire'}
              emptyDescription={tab === 'venues'
                ? 'Les fiches salles apparaîtront ici.'
                : tab === 'rentals'
                  ? 'Les locations publiées apparaîtront ici.'
                  : 'Les prestations publiées apparaîtront ici.'}
            />
            {catalogItems.length > 0 && (
              <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
                {(tab === 'venues' ? venues?.items : offerings?.items)?.map((row) => {
                  const isBlocked = (row as any).isBlockedByAdmin;
                  return (
                  <li key={`mod-${row.id}`} className="px-4 py-2.5 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant={isBlocked ? 'danger' : row.isPublic ? 'success' : 'default'}>
                      {isBlocked ? 'Bloqué' : row.isPublic ? 'Public' : 'Masqué'}
                    </Badge>
                    <span className="font-medium text-foreground truncate">
                      {'headline' in row ? row.headline : row.title}
                    </span>
                    <button type="button" className="text-primary hover:underline" onClick={() => void openFiche(row.tenantId)}>
                      {row.tenantName}
                    </button>
                    
                    <div className="ml-auto flex items-center gap-2">
                      {!isBlocked ? (
                        <Button
                          variant="danger"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => openModeration(
                            tab === 'venues' ? 'venues' : 'offerings',
                            row.id,
                            'headline' in row ? row.headline : row.title,
                            false,
                            true
                          )}
                        >
                          Bloquer
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => openModeration(
                            tab === 'venues' ? 'venues' : 'offerings',
                            row.id,
                            'headline' in row ? row.headline : row.title,
                            true,
                            true
                          )}
                        >
                          Débloquer
                        </Button>
                      )}
                      
                      {!isBlocked && row.isPublic && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => openModeration(
                            tab === 'venues' ? 'venues' : 'offerings',
                            row.id,
                            'headline' in row ? row.headline : row.title,
                            false,
                          )}
                        >
                          Dépublier
                        </Button>
                      )}
                      {!isBlocked && !row.isPublic && (
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={busyId === row.id}
                          onClick={() => openModeration(
                            tab === 'venues' ? 'venues' : 'offerings',
                            row.id,
                            'headline' in row ? row.headline : row.title,
                            true,
                          )}
                        >
                          Republier
                        </Button>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )
      ) : tab === 'inquiries' && !inquiries?.items.length ? (
        <EmptyState icon={<FileText className="w-5 h-5" />} title="Aucune demande" description="Les devis marketplace apparaîtront ici." />
      ) : tab === 'bookings' && !bookings?.items.length ? (
        <EmptyState icon={<Clock className="w-5 h-5" />} title="Aucune réservation" description="Les demandes de dates apparaîtront ici." />
      ) : tab === 'commissions' && !commissions?.items.length ? (
        <EmptyState
          icon={<Wallet className="w-5 h-5" />}
          title={settlement === 'paid' ? 'Aucune commission encaissée' : 'Aucune commission due'}
          description={`Les commissions ${commissionPct} % des réservations confirmées apparaissent ici.`}
        />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
          {tab === 'inquiries' &&
            inquiries?.items.map((row) => (
              <li key={row.id} className="px-4 py-4 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={row.status === 'NEW' ? 'warning' : 'default'}>
                    {row.status === 'NEW' ? 'Nouveau' : 'Contacté'}
                  </Badge>
                  <span className="text-[10px] text-muted">{formatWhen(row.createdAt)}</span>
                  <span className="text-[10px] text-muted">{row.kind === 'offering' ? 'Prestation' : 'Salle'}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{row.title}</p>
                <p className="text-xs text-muted">
                  {row.fromName} · {row.fromEmail}
                  {row.eventDate ? ` · ${formatDate(row.eventDate)}` : ''}
                  {row.guestCount ? ` · ${row.guestCount} invités` : ''}
                </p>
                <p className="text-sm text-muted leading-relaxed">{row.message}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {row.vendorTenantId && (
                    <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void openFiche(row.vendorTenantId!)}>
                      {row.vendorName || 'Organisation'}
                    </button>
                  )}
                  {row.href && (
                    <Link href={row.href} className="text-xs font-medium text-primary hover:underline">
                      Voir la fiche
                    </Link>
                  )}
                </div>
              </li>
            ))}

          {tab === 'bookings' &&
            bookings?.items.map((row) => (
              <li key={row.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={row.status === 'CANCELLED' ? 'danger' : row.status === 'CONFIRMED' ? 'success' : 'warning'}>
                      {BOOKING_STATUS_LABELS[row.status] || row.status}
                    </Badge>
                    <span className="text-[10px] text-muted">{formatDate(row.eventDate)}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
                  <p className="text-xs text-muted">
                    {formatFc(row.amountFc)} · acompte {formatFc(row.depositFc)}
                    {row.organizerName ? ` · ${row.organizerName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void openFiche(row.vendorTenantId)}>
                    {row.vendorName}
                  </button>
                  {row.href && (
                    <Link href={row.href} className="inline-flex">
                      <Button variant="secondary" size="sm">
                        Fiche
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}

          {tab === 'commissions' &&
            commissions?.items.map((row) => (
              <li key={row.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={row.commissionSettledAt ? 'success' : 'warning'}>
                      {row.commissionSettledAt ? 'Payée' : 'Due'}
                    </Badge>
                    <span className="text-[10px] text-muted">{formatDate(row.eventDate)}</span>
                    <span className="text-[10px] text-muted">{BOOKING_STATUS_LABELS[row.status] || row.status}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
                  <p className="text-xs text-muted">
                    {formatFc(row.commissionFc)} ({Math.round((row.commissionRate || 0) * 100)} %) sur {formatFc(row.amountFc)}
                    {row.organizerName ? ` · ${row.organizerName}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void openFiche(row.vendorTenantId)}>
                    {row.vendorName}
                  </button>
                  <Button
                    size="sm"
                    variant={row.commissionSettledAt ? 'secondary' : 'primary'}
                    loading={busyId === row.id}
                    onClick={() => void settleCommission(row.id, !row.commissionSettledAt, row.vendorName)}
                  >
                    {row.commissionSettledAt ? 'Remettre due' : 'Marquer payée'}
                  </Button>
                </div>
              </li>
            ))}
        </ul>
      )}

      {currentTotal > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={currentTotal}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          itemLabel="éléments"
        />
      )}

      <Modal
        open={ficheOpen}
        onClose={() => setFicheOpen(false)}
        title={
          <span className="inline-flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            {fiche?.tenant.name || 'Organisation'}
          </span>
        }
        description="Fiche support : forfait, équipe et catalogue."
        size="lg"
        footer={
          <div className="flex w-full justify-between items-center gap-2">
            <div className="flex-1">
              {fiche?.tenant.vendorProfile && (
                <Button
                  type="button"
                  variant={fiche.tenant.vendorProfile.isBlockedByAdmin ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => {
                    setFicheOpen(false);
                    openModeration(
                      'vendors', 
                      fiche!.tenant.vendorProfile!.id, 
                      `Prestataire ${fiche!.tenant.name}`, 
                      fiche!.tenant.vendorProfile!.isBlockedByAdmin, 
                      true
                    );
                  }}
                >
                  {fiche.tenant.vendorProfile.isBlockedByAdmin ? 'Débloquer prestataire' : 'Bloquer prestataire'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setFicheOpen(false)}>
                Fermer
              </Button>
              {fiche?.canImpersonate && (
                <Button
                  type="button"
                  size="sm"
                  loading={openingId === fiche.tenant.id}
                  leftIcon={<LogIn className="w-4 h-4" />}
                  onClick={() => void openWorkspace(fiche.tenant.id)}
                >
                  Ouvrir l’espace
                </Button>
              )}
            </div>
          </div>
        }
      >
        {ficheLoading || !fiche ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={fiche.tenant.plan === 'FREE' ? 'slate' : 'primary'}>{fiche.tenant.plan}</StatusPill>
              <StatusPill tone={fiche.tenant.licenseActive ? 'emerald' : 'rose'}>
                {fiche.tenant.licenseActive ? 'Licence active' : 'Licence désactivée'}
              </StatusPill>
              {fiche.tenant.vendorProfile?.isBlockedByAdmin && (
                <StatusPill tone="rose">Prestataire Bloqué</StatusPill>
              )}
              <span className="text-xs text-muted">
                {ACCOUNT_KIND_LABELS[fiche.tenant.accountKind] || fiche.tenant.accountKind}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Membres', value: fiche.counts.users, icon: Users },
                { label: 'Événements', value: fiche.counts.events, icon: Clock },
                { label: 'Salles', value: fiche.counts.rooms, icon: Building2 },
                { label: 'Annonces salles', value: fiche.counts.venueListings, icon: FileText },
                { label: 'Prestations', value: fiche.counts.serviceOfferings, icon: CreditCard },
              ].map((item) => (
                <div key={item.label} className="border border-border px-3 py-2.5 text-center">
                  <item.icon className="w-3.5 h-3.5 text-muted mx-auto mb-1" />
                  <div className="text-lg font-semibold text-foreground">{item.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">{item.label}</div>
                </div>
              ))}
            </div>
            <p className="text-sm text-foreground">
              {fiche.tenant.manager?.name || fiche.tenant.managerName} · {fiche.tenant.manager?.email || fiche.tenant.managerEmail}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(moderation)}
        onClose={() => {
          setModeration(null);
          setModerationReason('');
        }}
        title={moderation?.isBlocking 
          ? (moderation?.publish ? 'Débloquer la fiche' : 'Bloquer la fiche')
          : (moderation?.publish ? 'Republier la fiche' : 'Dépublier la fiche')
        }
        description={
          moderation
            ? moderation.isBlocking
              ? (moderation.publish
                ? `« ${moderation.label} » redeviendra visible selon son statut de publication.`
                : `« ${moderation.label} » sera masquée du catalogue public et bloquée.`)
              : (moderation.publish
                ? `« ${moderation.label} » redevient visible sur le marketplace public.`
                : `« ${moderation.label} » disparaît du marketplace. Le motif est journalisé.`)
            : undefined
        }
        size="sm"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setModeration(null);
                setModerationReason('');
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              variant={moderation?.publish ? 'primary' : 'danger'}
              loading={Boolean(moderation && busyId === moderation.id)}
              disabled={!moderation?.publish && moderationReason.trim().length < 8}
              onClick={() => void submitModeration()}
            >
              Confirmer
            </Button>
          </div>
        }
      >
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted">
            {moderation?.publish ? 'Commentaire (optionnel)' : 'Motif (obligatoire)'}
          </span>
          <textarea
            value={moderationReason}
            onChange={(e) => setModerationReason(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder={moderation?.publish ? 'Ex. fiche corrigée par le vendeur' : 'Ex. non-respect des règles, photos inappropriées…'}
            className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          {!moderation?.publish && (
            <span className="text-[11px] text-muted">{moderationReason.trim().length}/8 caractères min.</span>
          )}
        </label>
      </Modal>
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, Clock, CreditCard, ExternalLink, FileText, Loader2, LogIn, Store, Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Breadcrumbs, Alert, EmptyState, Pagination, Input, Button, Badge, Modal, StatusPill,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { ACCOUNT_KIND_LABELS, SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type TenantAccountKind } from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';

const PAGE_SIZE = 20;

type CatalogTab = 'venues' | 'offerings' | 'inquiries' | 'bookings';

interface Overview {
  venues: { total: number; publicCount: number };
  offerings: { total: number; publicCount: number };
  inquiries: { total: number; newCount: number };
  bookings: { total: number; requestedCount: number };
}

interface VenueRow {
  id: string;
  slug: string;
  isPublic: boolean;
  headline: string;
  roomName: string;
  city: string | null;
  commune: string | null;
  priceFromFc: number | null;
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
  priceFromFc: number | null;
  priceUnitLabel: string;
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

export default function AdminCataloguePage() {
  const router = useRouter();
  const { user, loading: authLoading, enterSupportSession } = useAuth();
  const [tab, setTab] = useState<CatalogTab>('venues');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'hidden'>('all');
  const [category, setCategory] = useState('');
  const [inquiryStatus, setInquiryStatus] = useState('');
  const [bookingStatus, setBookingStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [venues, setVenues] = useState<ListResponse<VenueRow> | null>(null);
  const [offerings, setOfferings] = useState<ListResponse<OfferingRow> | null>(null);
  const [inquiries, setInquiries] = useState<ListResponse<InquiryRow> | null>(null);
  const [bookings, setBookings] = useState<ListResponse<BookingRow> | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(page));
      if (q) params.set('q', q);
      if (tab === 'venues' || tab === 'offerings') {
        if (visibility === 'public') params.set('isPublic', '1');
        if (visibility === 'hidden') params.set('isPublic', '0');
      }
      if (tab === 'offerings' && category) params.set('category', category);
      if (tab === 'inquiries' && inquiryStatus) params.set('status', inquiryStatus);
      if (tab === 'bookings' && bookingStatus) params.set('status', bookingStatus);

      if (tab === 'venues') setVenues(await api.get(`/admin/catalog/venues?${params}`));
      if (tab === 'offerings') setOfferings(await api.get(`/admin/catalog/offerings?${params}`));
      if (tab === 'inquiries') setInquiries(await api.get(`/admin/catalog/inquiries?${params}`));
      if (tab === 'bookings') setBookings(await api.get(`/admin/catalog/bookings?${params}`));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger le catalogue.');
    } finally {
      setLoading(false);
    }
  }, [user?.role, tab, page, q, visibility, category, inquiryStatus, bookingStatus]);

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

  const unpublish = async (kind: 'venues' | 'offerings', id: string, label: string) => {
    if (!window.confirm(`Dépublier « ${label} » du marketplace public ?`)) return;
    setBusyId(id);
    setError('');
    try {
      await api.patch(`/admin/catalog/${kind}/${id}/unpublish`, {});
      await Promise.all([load(), loadOverview()]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de dépublier.');
    } finally {
      setBusyId(null);
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
    { id: 'offerings', label: 'Prestataires', count: overview?.offerings.total },
    { id: 'inquiries', label: 'Demandes', count: overview?.inquiries.total },
    { id: 'bookings', label: 'Réservations', count: overview?.bookings.total },
  ];

  const currentTotal =
    tab === 'venues'
      ? venues?.total ?? 0
      : tab === 'offerings'
        ? offerings?.total ?? 0
        : tab === 'inquiries'
          ? inquiries?.total ?? 0
          : bookings?.total ?? 0;

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Catalogue"
        description="Modération des fiches publiques, demandes de devis et réservations marketplace."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard?tab=overview' }, { label: 'Catalogue' }]} />
        }
      />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border rounded-[var(--radius-card)] overflow-hidden">
        {[
          { label: 'Salles publiques', value: overview?.venues.publicCount ?? 0 },
          { label: 'Prestations publiques', value: overview?.offerings.publicCount ?? 0 },
          { label: 'Devis nouveaux', value: overview?.inquiries.newCount ?? 0 },
          { label: 'Réservations demandées', value: overview?.bookings.requestedCount ?? 0 },
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Input
          label="Recherche"
          placeholder={tab === 'inquiries' ? 'Nom, e-mail…' : 'Titre, org, ville…'}
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
        />
        {(tab === 'venues' || tab === 'offerings') && (
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted">Visibilité</span>
            <select
              value={visibility}
              onChange={(e) => {
                setVisibility(e.target.value as 'all' | 'public' | 'hidden');
                setPage(1);
              }}
              className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
            >
              <option value="all">Toutes</option>
              <option value="public">Publiques</option>
              <option value="hidden">Dépubliées</option>
            </select>
          </label>
        )}
        {tab === 'offerings' && (
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted">Catégorie</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
            >
              <option value="">Toutes</option>
              {SERVICE_CATEGORIES.map((id) => (
                <option key={id} value={id}>
                  {SERVICE_CATEGORY_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
        )}
        {tab === 'inquiries' && (
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted">Statut</span>
            <select
              value={inquiryStatus}
              onChange={(e) => {
                setInquiryStatus(e.target.value);
                setPage(1);
              }}
              className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
            >
              <option value="">Tous</option>
              <option value="NEW">Nouveau</option>
              <option value="CONTACTED">Contacté</option>
            </select>
          </label>
        )}
        {tab === 'bookings' && (
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold text-muted">Statut</span>
            <select
              value={bookingStatus}
              onChange={(e) => {
                setBookingStatus(e.target.value);
                setPage(1);
              }}
              className="block w-full py-2.5 px-3.5 bg-surface-muted border border-border rounded-xl text-sm text-foreground"
            >
              <option value="">Tous</option>
              {Object.entries(BOOKING_STATUS_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : tab === 'venues' && !venues?.items.length ? (
        <EmptyState icon={<Store className="w-5 h-5" />} title="Aucune salle" description="Les fiches salles apparaîtront ici." />
      ) : tab === 'offerings' && !offerings?.items.length ? (
        <EmptyState icon={<Store className="w-5 h-5" />} title="Aucun prestataire" description="Les prestations publiées apparaîtront ici." />
      ) : tab === 'inquiries' && !inquiries?.items.length ? (
        <EmptyState icon={<FileText className="w-5 h-5" />} title="Aucune demande" description="Les devis marketplace apparaîtront ici." />
      ) : tab === 'bookings' && !bookings?.items.length ? (
        <EmptyState icon={<Clock className="w-5 h-5" />} title="Aucune réservation" description="Les demandes de dates apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-border border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface">
          {tab === 'venues' &&
            venues?.items.map((row) => (
              <li key={row.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={row.isPublic ? 'success' : 'default'}>{row.isPublic ? 'Public' : 'Masqué'}</Badge>
                    <span className="text-[10px] text-muted">{formatWhen(row.publishedAt || row.createdAt)}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{row.headline}</p>
                  <p className="text-xs text-muted truncate">
                    {place(row.city, row.commune)}
                    {row.priceFromFc != null ? ` · Dès ${formatFc(row.priceFromFc)} / ${row.priceUnitLabel}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void openFiche(row.tenantId)}>
                    {row.tenantName}
                  </button>
                  <Link href={row.href} target="_blank" className="inline-flex">
                    <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                      Fiche
                    </Button>
                  </Link>
                  {row.isPublic && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={busyId === row.id}
                      onClick={() => void unpublish('venues', row.id, row.headline)}
                    >
                      Dépublier
                    </Button>
                  )}
                </div>
              </li>
            ))}

          {tab === 'offerings' &&
            offerings?.items.map((row) => (
              <li key={row.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant={row.isPublic ? 'success' : 'default'}>{row.isPublic ? 'Public' : 'Masqué'}</Badge>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{row.categoryLabel}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{row.title}</p>
                  <p className="text-xs text-muted truncate">
                    {place(row.city, row.commune)}
                    {row.priceFromFc != null ? ` · Dès ${formatFc(row.priceFromFc)} / ${row.priceUnitLabel}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => void openFiche(row.tenantId)}>
                    {row.tenantName}
                  </button>
                  <Link href={row.href} target="_blank" className="inline-flex">
                    <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                      Fiche
                    </Button>
                  </Link>
                  {row.isPublic && (
                    <Button
                      variant="danger"
                      size="sm"
                      loading={busyId === row.id}
                      onClick={() => void unpublish('offerings', row.id, row.title)}
                    >
                      Dépublier
                    </Button>
                  )}
                </div>
              </li>
            ))}

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
                    <Link href={row.href} target="_blank" className="text-xs font-medium text-primary hover:underline">
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
                    <Link href={row.href} target="_blank" className="inline-flex">
                      <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                        Fiche
                      </Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}

      {currentTotal > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={currentTotal} onPageChange={setPage} itemLabel="éléments" />
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
          <div className="flex w-full justify-end gap-2">
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
    </div>
  );
}

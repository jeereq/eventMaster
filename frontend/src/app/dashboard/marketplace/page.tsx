'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getQuotaLockMessage } from '@/lib/planAccess';
import {
  PageHeader, Button, Breadcrumbs, Alert, Input, Modal, EmptyState, StatusPill,
} from '@/components/ui';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  missingPublishLocation,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type ServiceCategory,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import {
  Globe, GlobeLock, Loader2, Plus, Sparkles, Trash2, Inbox, CheckCircle2, CalendarCheck,
} from 'lucide-react';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceMediaField from '@/components/MarketplaceMediaField';
import MarketplaceFormTabs, { type MarketplaceFormTab } from '@/components/MarketplaceFormTabs';
import LocationPickerMap from '@/components/LocationPickerMap';
import MarketplaceBookingsPanel from '@/components/MarketplaceBookingsPanel';

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
}

type DeskTab = 'services' | 'inquiries' | 'bookings';

const fieldClass =
  'w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm';

export default function MarketplaceDeskPage() {
  const { access, refreshProfile, planQuota } = useAuth();
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
      router.replace('/dashboard/bookings');
    }
  }, [access?.level, router]);

  useEffect(() => {
    if (canManage) load();
    else setLoading(false);
  }, [canManage]);

  const photosOf = (item: ServiceItem) =>
    Array.isArray(item.photos) ? item.photos.filter((p): p is string => typeof p === 'string') : [];

  const servicesAtLimit = Boolean(getQuotaLockMessage('services', planQuota));

  const openCreate = () => {
    const lock = getQuotaLockMessage('services', planQuota);
    if (lock) {
      setError(lock);
      return;
    }
    setEditing(null);
    setDraft({
      title: '',
      description: '',
      category: 'CATERING',
      city: '',
      commune: '',
      neighborhood: '',
      coverageRadiusKm: '',
      latitude: '',
      longitude: '',
      priceFromFc: '',
      priceUnit: 'EVENT',
      quotaMin: '',
      quotaMax: '',
      photos: [],
      blockedDates: [],
      bookedDates: [],
      isPublic: true,
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
    });
    setEditorTab('details');
    setEditorOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    if (publish) {
      const missing = missingPublishLocation(draft);
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
        coverageRadiusKm: draft.coverageRadiusKm ? Number(draft.coverageRadiusKm) : null,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
        priceFromFc: draft.priceFromFc ? Number(draft.priceFromFc) : null,
        priceUnit: draft.priceUnit,
        quotaMin: draft.quotaMin ? Number(draft.quotaMin) : null,
        quotaMax: draft.quotaMax ? Number(draft.quotaMax) : null,
        photos: draft.photos,
        blockedDates: draft.blockedDates,
        isPublic: publish,
      };
      if (editing) await api.put(`/marketplace/services/${editing.id}`, payload);
      else await api.post('/marketplace/services', payload);
      setSuccess(publish ? 'Prestation publiée.' : 'Prestation enregistrée.');
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
      setSuccess('Prestation supprimée.');
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Prestations, devis, réservations de dates. Acompte hors plateforme · commission vendeur 8 % (≠ abo SaaS)."
        breadcrumbs={
          <Breadcrumbs items={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Marketplace' }]} />
        }
        action={
          tab === 'services' ? (
            <Button size="sm" onClick={openCreate} disabled={servicesAtLimit} leftIcon={<Plus className="w-4 h-4" />}>
              Nouvelle prestation
            </Button>
          ) : undefined
        }
      />

      {planQuota && tab === 'services' && (
        <p className="text-xs text-muted">
          Prestations : {planQuota.usage.services ?? 0} /{' '}
          {(planQuota.limits.maxServices ?? 0) >= 9999 ? '∞' : planQuota.limits.maxServices}
          {servicesAtLimit ? ' — quota atteint, passez au forfait Prestataire ou Salle & presta.' : ''}
        </p>
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

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : tab === 'bookings' ? (
        <MarketplaceBookingsPanel bookings={bookings} commissionDueFc={commissionDueFc} onChanged={load} />
      ) : tab === 'services' ? (
        services.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-5 h-5" />}
            title="Aucune prestation"
            description="Ajoutez un traiteur, un DJ, un photographe… puis publiez la fiche."
            action={
              <Button size="sm" onClick={openCreate} disabled={servicesAtLimit} leftIcon={<Plus className="w-4 h-4" />}>
                Créer une prestation
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {services.map((item) => (
              <div key={item.id} className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                      {SERVICE_CATEGORY_LABELS[item.category]}
                    </p>
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {[item.city, item.priceFromFc != null ? `dès ${formatFc(item.priceFromFc)}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <StatusPill tone={item.isPublic ? 'emerald' : 'slate'}>
                    {item.isPublic ? 'Publiée' : 'Brouillon'}
                  </StatusPill>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>
                    Modifier
                  </Button>
                  {item.isPublic && (
                    <Link href={`/marketplace/prestataires/${item.slug}`} className="inline-flex">
                      <Button size="sm" variant="ghost" leftIcon={<Globe className="w-3.5 h-3.5" />}>
                        Voir
                      </Button>
                    </Link>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(item)} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                    Supprimer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : inquiries.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title="Aucune demande"
          description="Les devis salles et prestataires arriveront ici."
        />
      ) : (
        <div className="space-y-3">
          {inquiries.map((item) => (
            <div key={item.id} className="border border-border rounded-[var(--radius-card)] bg-surface p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {item.kind === 'venue' ? 'Salle' : 'Prestation'} · {item.title}
                  </p>
                  <h3 className="font-semibold text-sm">{item.fromName}</h3>
                  <p className="text-xs text-muted">
                    {item.fromEmail}
                    {item.fromPhone ? ` · ${item.fromPhone}` : ''}
                  </p>
                </div>
                <StatusPill tone={item.status === 'NEW' ? 'amber' : 'emerald'}>
                  {item.status === 'NEW' ? 'Nouveau' : 'Contacté'}
                </StatusPill>
              </div>
              <p className="text-sm text-muted whitespace-pre-line">{item.message}</p>
              <p className="text-[11px] text-muted">
                {new Date(item.createdAt).toLocaleString('fr-FR')}
                {item.eventDate ? ` · date souhaitée ${new Date(item.eventDate).toLocaleDateString('fr-FR')}` : ''}
                {item.guestCount ? ` · ${item.guestCount} invités` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.status === 'NEW' && (
                  <Button size="sm" variant="secondary" onClick={() => markContacted(item.id)} leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                    Marquer comme contacté
                  </Button>
                )}
                {item.eventDate && !item.hasBooking && (
                  <Button size="sm" onClick={() => convertInquiry(item.id)} leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}>
                    Convertir en réservation
                  </Button>
                )}
                {item.hasBooking && (
                  <StatusPill tone="slate">Déjà réservée</StatusPill>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editing ? `Prestation — ${editing.title}` : 'Nouvelle prestation'}
        description="Visible dans le catalogue public uniquement après publication."
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
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as ServiceCategory }))}
              className={fieldClass}
            >
              {SERVICE_CATEGORIES.map((id) => (
                <option key={id} value={id}>{SERVICE_CATEGORY_LABELS[id]}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="block text-xs font-medium text-muted mb-1.5">Description</span>
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={fieldClass}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Ville / zone" value={draft.city} required onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
            <Input label="Commune" value={draft.commune} required onChange={(e) => setDraft((d) => ({ ...d, commune: e.target.value }))} />
            <Input label="Quartier" value={draft.neighborhood} required onChange={(e) => setDraft((d) => ({ ...d, neighborhood: e.target.value }))} />
            <Input
              label="Rayon d’intervention (km)"
              type="number"
              min={0}
              value={draft.coverageRadiusKm}
              onChange={(e) => setDraft((d) => ({ ...d, coverageRadiusKm: e.target.value }))}
            />
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
                {PRICE_UNIT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
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

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
  PageHeader, Button, Breadcrumbs, Alert, Input, Modal, EmptyState, StatusPill,
} from '@/components/ui';
import {
  PRICE_UNIT_OPTIONS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  parseBlockedDates,
  type MarketplaceBookingItem,
  type MarketplaceInquiryItem,
  type ServiceCategory,
  type VenuePriceUnit,
} from '@/lib/marketplace';
import { formatFc } from '@/config/landingPricing';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
import { cn } from '@/lib/cn';
import {
  Globe, GlobeLock, Loader2, Plus, Sparkles, Trash2, Upload, Inbox, CheckCircle2, CalendarCheck,
} from 'lucide-react';
import BlockedDatesField from '@/components/BlockedDatesField';
import MarketplaceBookingsPanel from '@/components/MarketplaceBookingsPanel';

interface ServiceItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: ServiceCategory;
  city: string | null;
  coverageRadiusKm: number | null;
  priceFromFc: number | null;
  priceUnit: VenuePriceUnit;
  photos: unknown;
  blockedDates?: unknown;
  isPublic: boolean;
}

type DeskTab = 'services' | 'inquiries' | 'bookings';

const fieldClass =
  'w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm';

export default function MarketplaceDeskPage() {
  const { access, refreshProfile } = useAuth();
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: 'CATERING' as ServiceCategory,
    city: '',
    coverageRadiusKm: '',
    priceFromFc: '',
    priceUnit: 'EVENT' as VenuePriceUnit,
    photos: [] as string[],
    blockedDates: [] as string[],
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
    if (canManage) load();
    else setLoading(false);
  }, [canManage]);

  const photosOf = (item: ServiceItem) =>
    Array.isArray(item.photos) ? item.photos.filter((p): p is string => typeof p === 'string') : [];

  const openCreate = () => {
    setEditing(null);
    setDraft({
      title: '',
      description: '',
      category: 'CATERING',
      city: '',
      coverageRadiusKm: '',
      priceFromFc: '',
      priceUnit: 'EVENT',
      photos: [],
      blockedDates: [],
      isPublic: true,
    });
    setEditorOpen(true);
  };

  const openEdit = (item: ServiceItem) => {
    setEditing(item);
    setDraft({
      title: item.title,
      description: item.description || '',
      category: item.category,
      city: item.city || '',
      coverageRadiusKm: item.coverageRadiusKm != null ? String(item.coverageRadiusKm) : '',
      priceFromFc: item.priceFromFc != null ? String(item.priceFromFc) : '',
      priceUnit: item.priceUnit,
      photos: photosOf(item),
      blockedDates: parseBlockedDates(item.blockedDates),
      isPublic: item.isPublic,
    });
    setEditorOpen(true);
  };

  const handleSave = async (publish: boolean) => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: draft.title,
        description: draft.description,
        category: draft.category,
        city: draft.city,
        coverageRadiusKm: draft.coverageRadiusKm ? Number(draft.coverageRadiusKm) : null,
        priceFromFc: draft.priceFromFc ? Number(draft.priceFromFc) : null,
        priceUnit: draft.priceUnit,
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

  const handlePhoto = async (file?: File) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const uploaded = await uploadImageFile(file);
      setDraft((d) => ({ ...d, photos: [...d.photos, uploaded.url].slice(0, 8) }));
    } catch (err: any) {
      setError(err.message || 'Upload impossible.');
    } finally {
      setUploadingPhoto(false);
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
            <Button size="sm" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
              Nouvelle prestation
            </Button>
          ) : undefined
        }
      />

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
              <Button size="sm" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
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
        size="lg"
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
            <Input label="Ville / zone" value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
            <Input
              label="Rayon (km)"
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
          </div>
          <BlockedDatesField
            value={draft.blockedDates}
            onChange={(blockedDates) => setDraft((d) => ({ ...d, blockedDates }))}
          />
          <div>
            <span className="block text-xs font-medium text-muted mb-1.5">Photos (max. 8)</span>
            <div className="flex flex-wrap gap-2 mb-2">
              {draft.photos.map((url) => (
                <div key={url} className="relative w-16 h-16 rounded-md overflow-hidden border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    className="absolute top-0 right-0 bg-surface/90 text-[10px] px-1"
                    onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((p) => p !== url) }))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              {uploadingPhoto ? 'Upload…' : 'Ajouter une photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                disabled={uploadingPhoto || draft.photos.length >= 8}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void handlePhoto(file);
                }}
              />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}

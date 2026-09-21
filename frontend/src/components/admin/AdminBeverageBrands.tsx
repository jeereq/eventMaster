'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Beer, Loader2, Plus, Trash2 } from 'lucide-react';
import { uploadImageFile } from '@/lib/cloudinaryUpload';
import { api } from '@/lib/api';
import { Alert, Badge, Button, EmptyState, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatFc } from '@/config/landingPricing';
import {
  BEVERAGE_KINDS,
  BEVERAGE_KIND_LABELS,
  type BeverageBrandRow,
  type BeverageKind,
} from '@/lib/beverageBrands';

const EMPTY_DRAFT = {
  name: '',
  kind: 'BEER' as BeverageKind,
  producer: '',
  country: '',
  volumeLabel: '',
  description: '',
  imageUrl: '',
  isActive: true,
};

export default function AdminBeverageBrands() {
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [kindFilter, setKindFilter] = useState<BeverageKind | 'ALL'>('ALL');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [uploadingImage, setUploadingImage] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.get('/admin/beverage-brands');
      setBrands(Array.isArray(data.brands) ? data.brands : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les marques.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => brands.filter((brand) => kindFilter === 'ALL' || brand.kind === kindFilter),
    [brands, kindFilter],
  );

  const resetDraft = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: draft.name,
        kind: draft.kind,
        producer: draft.producer,
        country: draft.country,
        volumeLabel: draft.volumeLabel,
        description: draft.description,
        imageUrl: draft.imageUrl,
        isActive: draft.isActive,
      };
      if (editingId) {
        await api.put(`/admin/beverage-brands/${editingId}`, payload);
        setSuccess('Marque mise à jour.');
      } else {
        await api.post('/admin/beverage-brands', payload);
        setSuccess('Marque ajoutée au catalogue.');
      }
      resetDraft();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (brand: BeverageBrandRow) => {
    const verb = brand.vendorCount ? 'retirer du catalogue actif' : 'supprimer';
    if (!confirm(`${brand.name} : ${verb} ?`)) return;
    setError('');
    setSuccess('');
    try {
      const result = await api.delete(`/admin/beverage-brands/${brand.id}`);
      setSuccess(result.archived
        ? 'Marque retirée. Les tarifs prestataires déjà saisis sont conservés, mais elle n’apparaît plus dans les invitations.'
        : 'Marque supprimée.');
      if (editingId === brand.id) resetDraft();
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-foreground">Marques de boissons</h2>
        <p className="text-sm text-muted leading-relaxed">
          Bières, boissons, vins et champagnes du catalogue. Chaque prestataire qui les vend définit son prix. Les organisateurs peuvent ensuite les proposer dans le champ Boissons des invitations.
        </p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {success ? <Alert variant="success">{success}</Alert> : null}

      <form onSubmit={save} className="rounded-2xl border border-border bg-surface p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          {editingId ? 'Modifier la marque' : 'Ajouter une marque'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Nom" value={draft.name} onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))} required placeholder="Primus" />
          <div className="space-y-1">
            <span className="text-xs font-semibold text-foreground">Image</span>
            <div className="flex flex-wrap items-center gap-2">
              {draft.imageUrl ? (
                <img src={draft.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-border" />
              ) : (
                <span className="w-14 h-14 rounded-lg border border-dashed border-border bg-surface-muted" />
              )}
              <label className="inline-flex items-center min-h-11 px-3 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-foreground cursor-pointer">
                {uploadingImage ? 'Envoi…' : draft.imageUrl ? 'Changer l’image' : 'Ajouter une image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingImage}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file) return;
                    setUploadingImage(true);
                    setError('');
                    try {
                      const uploaded = await uploadImageFile(file);
                      setDraft((prev) => ({ ...prev, imageUrl: uploaded.url }));
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Image impossible à envoyer.');
                    } finally {
                      setUploadingImage(false);
                    }
                  }}
                />
              </label>
              {draft.imageUrl ? (
                <button type="button" className="inline-flex items-center min-h-11 px-3 text-xs font-semibold text-muted underline" onClick={() => setDraft((prev) => ({ ...prev, imageUrl: '' }))}>
                  Retirer
                </button>
              ) : null}
            </div>
          </div>
          <label className="space-y-1 block">
            <span className="text-xs font-semibold text-foreground">Famille</span>
            <select
              value={draft.kind}
              onChange={(e) => setDraft((prev) => ({ ...prev, kind: e.target.value as BeverageKind }))}
              className="w-full min-h-11 px-3 rounded-[var(--radius-button)] border border-border bg-surface text-sm"
            >
              {BEVERAGE_KINDS.map((kind) => (
                <option key={kind} value={kind}>{BEVERAGE_KIND_LABELS[kind]}</option>
              ))}
            </select>
          </label>
          <Input label="Producteur (optionnel)" value={draft.producer} onChange={(e) => setDraft((prev) => ({ ...prev, producer: e.target.value }))} placeholder="Bralima" />
          <Input label="Pays (optionnel)" value={draft.country} onChange={(e) => setDraft((prev) => ({ ...prev, country: e.target.value }))} placeholder="RDC" />
          <Input label="Contenant (optionnel)" value={draft.volumeLabel} onChange={(e) => setDraft((prev) => ({ ...prev, volumeLabel: e.target.value }))} placeholder="65 cl" />
          <label className="flex items-center justify-between gap-3 min-h-11">
            <span className="text-xs font-semibold text-foreground">Visible dans les invitations</span>
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(e) => setDraft((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="rounded text-primary focus:ring-primary"
            />
          </label>
        </div>
        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-foreground">Description (optionnel)</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
            className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface text-sm resize-none"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={saving} leftIcon={<Plus className="w-4 h-4" />}>
            {editingId ? 'Enregistrer' : 'Ajouter'}
          </Button>
          {editingId ? (
            <Button type="button" variant="secondary" onClick={resetDraft}>Annuler</Button>
          ) : null}
        </div>
      </form>

      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="Familles de marques">
        <FilterPill active={kindFilter === 'ALL'} onClick={() => setKindFilter('ALL')} label="Toutes" />
        {BEVERAGE_KINDS.map((kind) => (
          <FilterPill
            key={kind}
            active={kindFilter === kind}
            onClick={() => setKindFilter(kind)}
            label={BEVERAGE_KIND_LABELS[kind]}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="sr-only">Chargement des marques</span>
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<Beer className="w-5 h-5" />}
          title="Aucune marque"
          description="Ajoutez une bière, une boisson, un vin ou un champagne pour que les prestataires puissent le tarifer."
        />
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {visible.map((brand) => (
            <li key={brand.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1 flex items-start gap-3">
                {brand.imageUrl ? (
                  <img src={brand.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                ) : null}
                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{brand.name}</p>
                  <Badge variant="default">{brand.kindLabel}</Badge>
                  {!brand.isActive ? <Badge variant="warning">Masquée</Badge> : null}
                </div>
                <p className="text-xs text-muted mt-1">
                  {[brand.producer, brand.country, brand.volumeLabel].filter(Boolean).join(' · ') || 'Sans détail'}
                  {typeof brand.vendorCount === 'number' ? ` · ${brand.vendorCount} prestataire${brand.vendorCount > 1 ? 's' : ''}` : ''}
                  {brand.priceFromFc != null ? ` · à partir de ${formatFc(brand.priceFromFc)}` : ''}
                </p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setEditingId(brand.id);
                    setDraft({
                      name: brand.name,
                      kind: brand.kind,
                      producer: brand.producer || '',
                      country: brand.country || '',
                      volumeLabel: brand.volumeLabel || '',
                      description: brand.description || '',
                      imageUrl: brand.imageUrl || '',
                      isActive: brand.isActive,
                    });
                  }}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  onClick={() => void remove(brand)}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  Retirer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterPill({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 px-3 rounded-full text-xs font-semibold border shrink-0',
        active ? 'bg-primary-solid text-primary-foreground border-primary-solid' : 'border-border text-muted',
      )}
    >
      {label}
    </button>
  );
}

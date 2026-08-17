'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  RADIUS_KM_OPTIONS,
  clampRadiusKm,
  type CatalogueGeoState,
  type CatalogueProximity,
  type CatalogueViewMode,
} from '@/lib/marketplace';
import { communesForCity, neighborhoodsFor, normalizeRdcCity } from '@/lib/rdcCities';
import CatalogueViewToggle from '@/components/CatalogueViewToggle';

export type CatalogueFilterChip = {
  id: string;
  label: string;
  value: string;
};

export function CatalogueFilterField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-1.5 min-w-0">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {hint ? <p className="text-[11px] text-muted -mt-0.5">{hint}</p> : null}
      {children}
    </div>
  );
}

export function CatalogueChoicePills({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id || 'all'}
            type="button"
            onClick={() => onChange(active && opt.id ? '' : opt.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition',
              active
                ? 'bg-primary text-white border-primary'
                : 'bg-surface-muted text-muted border-border hover:text-foreground hover:border-primary/30',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function CatalogueFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  view,
  onViewChange,
  chips = [],
  onRemoveChip,
  onClearChips,
  modalTitle = 'Filtres',
  modalDescription = 'Les choix actifs restent visibles sous la recherche, sans rouvrir cette fenêtre.',
  filters,
  onApply,
  onOpen,
  resultLabel,
  modalSize = 'lg',
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  view: CatalogueViewMode;
  onViewChange: (mode: CatalogueViewMode) => void;
  chips?: CatalogueFilterChip[];
  onRemoveChip?: (id: string) => void;
  onClearChips?: () => void;
  modalTitle?: string;
  modalDescription?: string;
  filters?: React.ReactNode;
  onApply?: () => void | Promise<void>;
  onOpen?: () => void;
  resultLabel?: string;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const hasFilters = Boolean(filters);
  const count = chips.length;

  const openModal = () => {
    onOpen?.();
    setOpen(true);
  };

  const apply = async () => {
    setApplying(true);
    try {
      await onApply?.();
      setOpen(false);
    } catch {
      /* Le parent affiche l’erreur et garde la fenêtre ouverte. */
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-3 sm:p-4 space-y-3 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button
              type="button"
              variant={count ? 'primary' : 'secondary'}
              size="sm"
              onClick={openModal}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Filtres
              {count > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold">
                  {count}
                </span>
              ) : null}
            </Button>
          )}
          <CatalogueViewToggle
            value={view}
            onChange={onViewChange}
            className="flex-1 sm:flex-none justify-between sm:justify-start"
          />
        </div>
      </div>

      {(count > 0 || resultLabel) && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <span
              key={chip.id}
              className="inline-flex items-center gap-1.5 max-w-full pl-2.5 pr-1 py-1 rounded-full border border-primary/20 bg-primary/10 text-xs"
            >
              <button
                type="button"
                onClick={openModal}
                className="inline-flex items-center gap-1.5 min-w-0 text-left"
              >
                <span className="text-muted shrink-0">{chip.label}</span>
                <span className="font-semibold text-foreground truncate">{chip.value}</span>
              </button>
              {onRemoveChip ? (
                <button
                  type="button"
                  onClick={() => onRemoveChip(chip.id)}
                  className="p-0.5 rounded-full text-muted hover:text-foreground hover:bg-primary/15 transition"
                  aria-label={`Retirer ${chip.label} ${chip.value}`}
                >
                  <X className="w-3 h-3" />
                </button>
              ) : null}
            </span>
          ))}
          {count > 0 && onClearChips ? (
            <button
              type="button"
              onClick={onClearChips}
              className="text-[11px] font-semibold text-muted hover:text-foreground px-1"
            >
              Tout effacer
            </button>
          ) : null}
          {resultLabel ? (
            <span className="ml-auto text-[11px] text-muted font-medium">{resultLabel}</span>
          ) : null}
        </div>
      )}

      {hasFilters && (
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title={modalTitle}
          description={modalDescription}
          size={modalSize}
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={() => void apply()} loading={applying}>
                Voir les résultats
              </Button>
            </>
          }
        >
          <div className="space-y-5">{filters}</div>
        </Modal>
      )}
    </div>
  );
}

export function CatalogueGeoFields({
  value,
  onChange,
  error,
}: {
  value: CatalogueGeoState;
  onChange: (next: CatalogueGeoState) => void;
  error?: string;
}) {
  const set = (patch: Partial<CatalogueGeoState>) => onChange({ ...value, ...patch });

  return (
    <>
      <CatalogueFilterField label="Ville" hint="Catalogue limité à Kinshasa et Lubumbashi.">
        <CatalogueChoicePills
          options={[
            { id: 'Kinshasa', label: 'Kinshasa' },
            { id: 'Lubumbashi', label: 'Lubumbashi' },
          ]}
          value={normalizeRdcCity(value.city) || ''}
          onChange={(id) => set({ city: id, commune: '', neighborhood: '', nearPlace: '' })}
        />
      </CatalogueFilterField>
      {value.proximity !== 'near' ? (
        <>
          <CatalogueFilterField label="Commune">
            <CatalogueChoicePills
              options={communesForCity(value.city).map((item) => ({ id: item.name, label: item.name }))}
              value={value.commune}
              onChange={(id) => set({ commune: id, neighborhood: '', nearPlace: '' })}
            />
            {!normalizeRdcCity(value.city) ? (
              <p className="text-[11px] text-muted mt-1">Choisissez d’abord Kinshasa ou Lubumbashi.</p>
            ) : null}
          </CatalogueFilterField>
          <CatalogueFilterField label="Quartier">
            <CatalogueChoicePills
              options={neighborhoodsFor(value.city, value.commune).map((name) => ({ id: name, label: name }))}
              value={value.neighborhood}
              onChange={(id) => set({ neighborhood: id, nearPlace: '' })}
            />
            {normalizeRdcCity(value.city) && !value.commune ? (
              <p className="text-[11px] text-muted mt-1">Choisissez une commune pour voir les quartiers.</p>
            ) : null}
          </CatalogueFilterField>
        </>
      ) : null}
      <CatalogueFilterField label="Avenue / rue" hint="Filtre le texte d’adresse (ex. avenue de la Libération).">
        <Input
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          placeholder="Nom d’avenue"
        />
      </CatalogueFilterField>
      <CatalogueFilterField label="Prix (FC)">
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            value={value.minPrice}
            onChange={(e) => set({ minPrice: e.target.value })}
            placeholder="Min"
          />
          <Input
            type="number"
            min={0}
            value={value.maxPrice}
            onChange={(e) => set({ maxPrice: e.target.value })}
            placeholder="Max"
          />
        </div>
      </CatalogueFilterField>
      <CatalogueFilterField
        label="Proximité"
        hint="Autour de vous, ou autour d’une commune / un quartier de Kinshasa ou Lubumbashi."
      >
        <CatalogueChoicePills
          options={[
            { id: '', label: 'Peu importe' },
            { id: 'around', label: 'Autour de moi' },
            { id: 'near', label: 'Près d’un lieu' },
          ]}
          value={value.proximity}
          onChange={(id) => set({
            proximity: (id as CatalogueProximity) || '',
            lat: null,
            lng: null,
            nearPlace: '',
          })}
        />
        {value.proximity === 'around' ? (
          <p className="text-[11px] text-muted mt-2">
            Nous lirons votre GPS (Kinshasa ou Lubumbashi uniquement), puis filtrerons à la distance choisie.
          </p>
        ) : null}
        {value.proximity === 'near' ? (
          <div className="mt-3 space-y-3">
            <p className="text-[11px] text-muted">
              Choisissez uniquement une commune, puis un quartier, dans la liste. Le rayon part du centre de la commune.
            </p>
            {!normalizeRdcCity(value.city) ? (
              <p className="text-xs text-rose-600 font-medium">Choisissez d’abord Kinshasa ou Lubumbashi en haut.</p>
            ) : (
              <>
                <div>
                  <span className="block text-[11px] text-muted mb-1.5">Commune</span>
                  <CatalogueChoicePills
                    options={communesForCity(value.city).map((item) => ({ id: item.name, label: item.name }))}
                    value={value.commune}
                    onChange={(id) => set({ commune: id, neighborhood: '', nearPlace: '', lat: null, lng: null })}
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-muted mb-1.5">Quartier</span>
                  <CatalogueChoicePills
                    options={neighborhoodsFor(value.city, value.commune).map((name) => ({ id: name, label: name }))}
                    value={value.neighborhood}
                    onChange={(id) => set({ neighborhood: id, nearPlace: '', lat: null, lng: null })}
                  />
                  {!value.commune ? (
                    <p className="text-[11px] text-muted mt-1">Choisissez une commune pour voir les quartiers.</p>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}
        {value.proximity ? (
          <div className="mt-3 space-y-2">
            <span className="text-[11px] text-muted">Rayon autour du point ({clampRadiusKm(value.radiusKm)} km)</span>
            <CatalogueChoicePills
              options={RADIUS_KM_OPTIONS.map((km) => ({ id: String(km), label: `${km} km` }))}
              value={(RADIUS_KM_OPTIONS as readonly number[]).includes(value.radiusKm) ? String(value.radiusKm) : ''}
              onChange={(id) => set({ radiusKm: Number(id) || 10 })}
            />
            <Input
              type="number"
              min={1}
              max={80}
              step={1}
              value={value.radiusKm}
              onChange={(e) => set({ radiusKm: clampRadiusKm(e.target.value) })}
              placeholder="Distance en km"
            />
          </div>
        ) : null}
        {error ? <p className="text-xs text-rose-600 font-medium">{error}</p> : null}
      </CatalogueFilterField>
    </>
  );
}

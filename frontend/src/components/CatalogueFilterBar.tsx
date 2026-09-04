'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  PRICE_UNIT_OPTIONS,
  RADIUS_KM_OPTIONS,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_META,
  SERVICE_MOBILITY_OPTIONS,
  SERVICE_RENTAL_CATEGORIES,
  SERVICE_TRADE_CATEGORIES,
  clampRadiusKm,
  isServiceRentalCategory,
  unitsForServiceCategory,
  type CatalogueGeoState,
  type CatalogueProximity,
  type CatalogueViewMode,
} from '@/lib/marketplace';
import { pauseCatalogueDraftSync, resumeCatalogueDraftSync } from '@/lib/catalogueQuery';
import ShareButton from '@/components/ShareButton';
import {
  EVENT_ENTRY_OPTIONS,
  KIND_FILTER_OPTIONS,
  ROOM_TYPE_FILTER_OPTIONS,
  pickCatalogueExtras,
  type CatalogueEntityExtras,
  type CatalogueKind,
} from '@/lib/catalogueEntityFilters';
import { communesForCity, neighborhoodsFor, normalizeRdcCity } from '@/lib/rdcCities';
import CatalogueViewToggle, { CatalogueGridColsToggle, type CatalogueGridCols } from '@/components/CatalogueViewToggle';

export type CatalogueFilterChip = {
  id: string;
  label: string;
  value: string;
  tone?: 'venue' | 'service' | 'event' | 'neutral';
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
        const isSentinel = !opt.id || opt.id === 'all';
        const active = value === opt.id || (isSentinel && (!value || value === 'all'));
        return (
          <button
            key={opt.id || 'all'}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (active) {
                if (isSentinel) return;
                onChange('');
                return;
              }
              onChange(opt.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className={cn(
              'px-3 py-1.5 rounded-[var(--radius-button)] text-xs font-medium border transition touch-manipulation',
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
  modalDescription = 'Cliquez une seconde fois sur un choix pour le retirer. Annuler ignore les changements. Tout effacer retire tous les filtres.',
  filters,
  onApply,
  onOpen,
  resultLabel,
  modalSize = 'lg',
  variant = 'card',
  hideViewToggle = false,
  compactToggle = false,
  hideMap = false,
  hideShare = false,
  actions,
  gridCols,
  onGridColsChange,
  gridColOptions,
  shareUrl,
  shareTitle,
  topSlot,
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
  variant?: 'card' | 'float';
  hideViewToggle?: boolean;
  compactToggle?: boolean;
  hideMap?: boolean;
  hideShare?: boolean;
  /** Actions à droite (ex. ViewModeToggle dashboard), à côté de Filtres. */
  actions?: React.ReactNode;
  gridCols?: CatalogueGridCols;
  onGridColsChange?: (cols: CatalogueGridCols) => void;
  gridColOptions?: CatalogueGridCols[];
  shareUrl?: string;
  shareTitle?: string;
  topSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const openTimerRef = useRef<number>(0);
  const pausedDraftRef = useRef(false);
  const hasFilters = Boolean(filters);
  const count = chips.length;

  const pauseDraft = () => {
    if (pausedDraftRef.current) return;
    pausedDraftRef.current = true;
    pauseCatalogueDraftSync();
  };

  const resumeDraft = () => {
    if (!pausedDraftRef.current) return;
    pausedDraftRef.current = false;
    resumeCatalogueDraftSync();
  };

  useEffect(() => () => {
    window.clearTimeout(openTimerRef.current);
    resumeDraft();
    // resumeDraft reads a ref; unmount-only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    window.clearTimeout(openTimerRef.current);
    resumeDraft();
    setOpen(false);
  };

  const openModal = () => {
    pauseDraft();
    onOpen?.();
    window.clearTimeout(openTimerRef.current);
    // Après le clic/tap « Filtres », laisser l’événement se terminer avant d’afficher le fond.
    openTimerRef.current = window.setTimeout(() => setOpen(true), 50);
  };

  const apply = async () => {
    setApplying(true);
    try {
      await onApply?.();
      resumeDraft();
      setOpen(false);
    } catch {
      /* Le parent affiche l’erreur et garde la fenêtre ouverte. */
    } finally {
      setApplying(false);
    }
  };

  const clearAll = () => {
    onClearChips?.();
    resumeDraft();
    setOpen(false);
  };

  const chipsRow = (count > 0 || resultLabel) ? (
    <div className={cn(
      'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full',
      variant === 'float' ? 'overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]' : 'flex-wrap',
    )}>
      {chips.map((chip, index) => (
        <span
          key={chip.id}
          style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
          className={cn(
            'em-filter-chip inline-flex items-center gap-1 max-w-[11rem] shrink-0',
            variant === 'float' ? 'em-filter-chip-sm' : 'em-filter-chip-md',
            chip.tone === 'venue' && 'em-filter-chip-venue',
            chip.tone === 'service' && 'em-filter-chip-service',
            chip.tone === 'event' && 'em-filter-chip-event',
            (!chip.tone || chip.tone === 'neutral') && 'em-filter-chip-neutral',
          )}
        >
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-1 min-w-0 text-left"
          >
            <span className="text-muted shrink-0">{chip.label}</span>
            <span className="font-semibold text-foreground truncate">{chip.value}</span>
          </button>
          {onRemoveChip ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemoveChip(chip.id);
              }}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full text-muted hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
              aria-label={`Retirer ${chip.label} ${chip.value}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </span>
      ))}
      {count > 0 && onClearChips ? (
        <button
          type="button"
          onClick={onClearChips}
          className="text-[10px] font-semibold text-muted hover:text-foreground px-1 shrink-0"
        >
          Tout effacer
        </button>
      ) : null}
      {resultLabel && variant !== 'float' ? (
        <span className="ml-auto text-[10px] text-muted font-medium w-full sm:w-auto shrink-0">{resultLabel}</span>
      ) : null}
    </div>
  ) : null;

  const filterModal = hasFilters ? (
    <Modal
      open={open}
      onClose={closeModal}
      title={modalTitle}
      description={modalDescription}
      size={modalSize}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={closeModal}>
            Annuler
          </Button>
          {onClearChips ? (
            <Button type="button" variant="ghost" onClick={clearAll} disabled={applying}>
              Tout effacer
            </Button>
          ) : null}
          <Button type="button" onClick={() => void apply()} loading={applying}>
            Voir les résultats
          </Button>
        </>
      }
    >
      <div className="space-y-5">{filters}</div>
    </Modal>
  ) : null;

  if (variant === 'float') {
    return (
      <div className="space-y-1.5">
        {topSlot ? (
          <div className="pointer-events-auto overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none]">
            {topSlot}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-9 pr-3 rounded-[var(--radius-button)] bg-surface/95 backdrop-blur-xl border border-white/25 dark:border-white/10 shadow-lg text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={openModal}
              className={cn(
                'relative h-10 shrink-0 px-3 rounded-[var(--radius-button)] border shadow-lg backdrop-blur-xl inline-flex items-center justify-center gap-1.5 text-xs font-bold transition touch-manipulation',
                count
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface/95 text-foreground border-white/25 dark:border-white/10',
              )}
              aria-label="Ouvrir les filtres"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filtres</span>
              {count > 0 ? (
                <span className="inline-flex h-4 min-w-4 px-1 rounded-full bg-white text-primary text-[10px] font-bold leading-4 items-center justify-center">
                  {count}
                </span>
              ) : null}
            </button>
          )}
          {!hideShare ? (
          <ShareButton
            variant="fab"
            title={shareTitle || 'Recherche EventMaster'}
            text="Salles, prestataires, matériel & équipements et événements filtrés sur EventMaster."
            label="Partager la recherche"
            url={shareUrl}
            className="!h-10 !w-10 !rounded-[var(--radius-button)]"
          />
          ) : null}
        </div>
        {!hideViewToggle ? (
            <CatalogueViewToggle
              value={view}
              onChange={onViewChange}
              compact={compactToggle}
              hideMap={hideMap}
              className="inline-flex w-full justify-between bg-surface/95 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
            />
        ) : null}
        {view === 'grid' && gridCols && onGridColsChange ? (
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted">Colonnes</span>
            <CatalogueGridColsToggle
              value={gridCols}
              onChange={onGridColsChange}
              options={gridColOptions}
              className="bg-surface/95 backdrop-blur-xl border-white/25 dark:border-white/10 shadow-lg"
            />
          </div>
        ) : null}
        {count > 0 ? chipsRow : null}
        {filterModal}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3 shadow-[var(--shadow-soft)] overflow-hidden">
      {topSlot ? (
        <div className="pb-2 border-b border-border/70">
          {topSlot}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 min-w-0 sm:flex-row sm:items-center">
        <div className="flex-1 min-w-0">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {hasFilters && (
            <Button
              type="button"
              variant={count ? 'primary' : 'secondary'}
              size="sm"
              onClick={openModal}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
              className="shrink-0"
            >
              Filtres
              {count > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-semibold">
                  {count}
                </span>
              ) : null}
            </Button>
          )}
          {!hideShare ? (
          <ShareButton
            variant="button"
            title={shareTitle || 'Recherche EventMaster'}
            text="Salles, prestataires, matériel & équipements et événements filtrés sur EventMaster."
            label="Partager"
            url={shareUrl}
            className="shrink-0 px-2.5 sm:px-3"
          />
          ) : null}
          {actions}
          {!hideViewToggle ? (
            <CatalogueViewToggle
              value={view}
              onChange={onViewChange}
              compact={compactToggle}
              hideMap={hideMap}
              className="min-w-0 basis-full flex-1 justify-between overflow-hidden sm:basis-auto sm:flex-none sm:justify-start"
            />
          ) : null}
          {view === 'grid' && gridCols && onGridColsChange ? (
            <div className="hidden sm:block shrink-0">
              <CatalogueGridColsToggle value={gridCols} onChange={onGridColsChange} options={gridColOptions} />
            </div>
          ) : null}
        </div>
      </div>

      {chipsRow}

      {filterModal}
    </div>
  );
}

export function CatalogueGeoFields({
  value,
  onChange,
  error,
  showCapacity = false,
  showAvailability = true,
  showProximity = true,
  availabilityHint,
  capacityHint,
}: {
  value: CatalogueGeoState;
  onChange: (next: CatalogueGeoState) => void;
  error?: string;
  showCapacity?: boolean;
  showAvailability?: boolean;
  showProximity?: boolean;
  availabilityHint?: string;
  capacityHint?: string;
}) {
  const set = (patch: Partial<CatalogueGeoState>) => onChange({ ...value, ...patch });

  return (
    <>
      <CatalogueFilterField label="Ville" hint="Marketplace limité à Kinshasa et Lubumbashi.">
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
      {showCapacity ? (
        <CatalogueFilterField label="Nombre de places" hint={capacityHint || 'Capacité de la salle (invités).'}>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              min={1}
              value={value.minCapacity}
              onChange={(e) => set({ minCapacity: e.target.value })}
              placeholder="Min"
            />
            <Input
              type="number"
              min={1}
              value={value.maxCapacity}
              onChange={(e) => set({ maxCapacity: e.target.value })}
              placeholder="Max"
            />
          </div>
        </CatalogueFilterField>
      ) : null}
      {showAvailability ? (
      <CatalogueFilterField
        label="Disponibilités"
        hint={availabilityHint || 'N’affiche que les fiches libres sur toute la période (un jour ou du… au…).'}
      >
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="date"
            label="Du"
            value={value.availableFrom}
            onChange={(e) => set({ availableFrom: e.target.value })}
          />
          <Input
            type="date"
            label="Au"
            value={value.availableTo}
            onChange={(e) => set({ availableTo: e.target.value })}
          />
        </div>
      </CatalogueFilterField>
      ) : null}
      {showProximity ? (
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
      ) : null}
    </>
  );
}

export function CatalogueEntityFilterFields({
  value,
  extras,
  onChange,
  error,
  showKind = false,
  entity = 'all',
  showProximity = true,
  showAvailability = true,
}: {
  value: CatalogueGeoState;
  extras: import('@/lib/catalogueEntityFilters').CatalogueEntityExtras;
  onChange: (geo: CatalogueGeoState, extras: import('@/lib/catalogueEntityFilters').CatalogueEntityExtras) => void;
  error?: string;
  showKind?: boolean;
  entity?: import('@/lib/catalogueEntityFilters').CatalogueKind;
  showProximity?: boolean;
  showAvailability?: boolean;
}) {
  const kind = showKind ? extras.kind : entity;
  const showVenue = kind === 'venue';
  const showTrade = kind === 'service';
  const showRental = kind === 'rental';
  const showEvent = kind === 'event';
  const showOffering = showTrade || showRental;
  const emit = (geo: CatalogueGeoState, nextExtras: CatalogueEntityExtras) => {
    onChange(geo, pickCatalogueExtras(nextExtras));
  };
  const setExtras = (patch: Partial<CatalogueEntityExtras>) => {
    emit(value, { ...extras, ...patch });
  };

  return (
    <>
      {showKind ? (
        <CatalogueFilterField
          label="Type de fiche"
          hint={kind === 'all' ? 'Choisissez salles, prestataires, matériel & équipements ou événements pour afficher les filtres correspondants.' : undefined}
        >
          <CatalogueChoicePills
            options={KIND_FILTER_OPTIONS}
            value={extras.kind}
            onChange={(id) => {
              const nextKind = (id as CatalogueKind) || 'all';
              const keepTrade = nextKind === 'service' && extras.category && !isServiceRentalCategory(extras.category);
              const keepRental = nextKind === 'rental' && isServiceRentalCategory(extras.category);
              setExtras({
                kind: nextKind,
                roomType: nextKind === 'venue' ? extras.roomType : '',
                category: keepTrade || keepRental ? extras.category : '',
                mobility: nextKind === 'service' || nextKind === 'rental' ? extras.mobility : '',
                priceUnit: nextKind === 'service' || nextKind === 'rental' ? extras.priceUnit : '',
                entry: nextKind === 'event' ? extras.entry : '',
              });
            }}
          />
        </CatalogueFilterField>
      ) : null}
      <CatalogueGeoFields
        value={value}
        onChange={(next) => emit(next, extras)}
        error={error}
        showCapacity={showVenue || showEvent}
        showProximity={showProximity}
        showAvailability={showAvailability}
        availabilityHint={showEvent
          ? 'Date de l’événement (un jour ou du… au…).'
          : showRental
            ? 'N’affiche que le matériel libre sur toute la période.'
            : showTrade
              ? 'N’affiche que les prestataires libres sur toute la période.'
              : showVenue
                ? 'N’affiche que les salles libres sur toute la période.'
                : undefined}
        capacityHint={showEvent ? 'Places / billets restants.' : showVenue ? 'Capacité de la salle (invités).' : undefined}
      />
      {showVenue ? (
        <CatalogueFilterField label="Type de salle">
          <CatalogueChoicePills
            options={ROOM_TYPE_FILTER_OPTIONS}
            value={extras.roomType}
            onChange={(id) => setExtras({ roomType: id })}
          />
        </CatalogueFilterField>
      ) : null}
      {showOffering ? (
        <>
          {showTrade ? (
          <CatalogueFilterField label="Spécialité / Prestataire">
                <CatalogueChoicePills
                  options={SERVICE_TRADE_CATEGORIES.map((id) => ({ id, label: SERVICE_CATEGORY_LABELS[id] }))}
                  value={extras.category}
                  onChange={(id) => {
                    const allowed = unitsForServiceCategory(id);
                    setExtras({
                      category: id,
                      priceUnit: extras.priceUnit && allowed.includes(extras.priceUnit as (typeof allowed)[number])
                        ? extras.priceUnit
                        : '',
                    });
                  }}
                />
          </CatalogueFilterField>
          ) : null}
          {showRental ? (
          <CatalogueFilterField label="Type de matériel / équipement">
                <CatalogueChoicePills
                  options={SERVICE_RENTAL_CATEGORIES.map((id) => ({ id, label: SERVICE_CATEGORY_LABELS[id] }))}
                  value={extras.category}
                  onChange={(id) => {
                    const allowed = unitsForServiceCategory(id);
                    setExtras({
                      category: id,
                      priceUnit: extras.priceUnit && allowed.includes(extras.priceUnit as (typeof allowed)[number])
                        ? extras.priceUnit
                        : '',
                    });
                  }}
                />
          </CatalogueFilterField>
          ) : null}
          <CatalogueFilterField label="Intervention">
            <CatalogueChoicePills
              options={SERVICE_MOBILITY_OPTIONS.filter((opt) => opt.id)}
              value={extras.mobility}
              onChange={(id) => setExtras({ mobility: (id as import('@/lib/marketplace').ServiceMobility) || '' })}
            />
          </CatalogueFilterField>
          <CatalogueFilterField
            label="Unité tarifaire"
            hint={
              extras.category && extras.category in SERVICE_CATEGORY_META
                ? SERVICE_CATEGORY_META[extras.category as import('@/lib/marketplace').ServiceCategory].hint
                : 'Filtre les fiches selon l’unité affichée (événement, jour, personne…).'
            }
          >
            <CatalogueChoicePills
              options={(extras.category ? unitsForServiceCategory(extras.category) : PRICE_UNIT_OPTIONS.map((o) => o.id)).map((id) => ({
                id,
                label: PRICE_UNIT_OPTIONS.find((opt) => opt.id === id)?.label || id,
              }))}
              value={extras.priceUnit}
              onChange={(id) => setExtras({ priceUnit: id })}
            />
          </CatalogueFilterField>
        </>
      ) : null}
      {showEvent ? (
        <CatalogueFilterField label="Entrée">
          <CatalogueChoicePills
            options={EVENT_ENTRY_OPTIONS}
            value={extras.entry}
            onChange={(id) => setExtras({ entry: id === 'paid' || id === 'free' ? id : '' })}
          />
        </CatalogueFilterField>
      ) : null}
    </>
  );
}

'use client';

import PriceSourcePicker from '@/components/PriceSourcePicker';
import React, { useId, useMemo, useState } from 'react';
import { ChevronDown, Loader2, Save, Sparkles } from '@/components/icons';
import { Alert, Button, Input } from '@/components/ui';
import BudgetSimulationCriteria, { BudgetScopeTabs, CHOICE_CHIP, choiceChipTone, GROUP_LABEL } from '@/components/BudgetSimulationCriteria';
import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import { formatFc } from '@/config/landingPricing';
import { communesForCity, normalizeRdcCity } from '@/lib/rdcCities';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { enabledMarketplaceCities } from '@/lib/platformCities';
import { LISTING_EVENT_TYPES, VENUE_AMENITIES, eventTypeLabel, type ListingEventTypeId } from '@/lib/listingDetails';
import { SERVICE_CATEGORY_LABELS, SERVICE_RENTAL_CATEGORIES, SERVICE_TRADE_CATEGORIES, type ServiceCategory } from '@/lib/marketplace';
import {
  briefMarginFc,
  briefSpendableFc,
  briefWithEventType,
  cycleSlotPriority,
  defaultShares,
  shareRows,
  type AmenityMode,
  type EventPlanBrief,
  type FavoriteMode,
  type IncludeVenue,
  type MarginPct,
  type MatchMode,
  type MissingStrategy,
  type SavedEventBrief,
  type SlotPriority,
} from '@/lib/eventPlan';

const SLOT_HINT: Record<SlotPriority, string> = {
  required: 'obligatoire — le pack doit proposer ce prestataire',
  optional: 'si le budget reste — ajouté seulement s’il y a de la place',
  excluded: 'exclu — ce prestataire n’est pas cherché',
};

const SLOT_SHORT: Record<SlotPriority, string> = {
  required: 'obligatoire',
  optional: 'si ça rentre',
  excluded: 'exclu',
};

function FieldSelect({
  label,
  hint,
  value,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className={cn('block', GROUP_LABEL)}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm"
      >
        {children}
      </select>
      {hint ? <span className="block text-xs text-muted leading-relaxed">{hint}</span> : null}
    </label>
  );
}

/** Liste de métiers ou de matériel : une ligne de résumé, les pastilles ne s’ouvrent qu’au clic sur « Modifier ». */
function SlotGroup({
  label,
  all,
  suggested,
  slots,
  onCycle,
}: {
  label: string;
  all: readonly ServiceCategory[];
  suggested: readonly ServiceCategory[];
  slots: Record<string, SlotPriority | undefined>;
  onCycle: (category: ServiceCategory) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const required = all.filter((category) => slots[category] === 'required');
  const optionalCount = all.filter((category) => slots[category] === 'optional').length;
  const visible = showAll ? all : suggested.length ? suggested : all;
  const summary = required.length
    ? `${required.map((category) => SERVICE_CATEGORY_LABELS[category]).join(', ')}${optionalCount ? ` · ${optionalCount} si ça rentre` : ''}`
    : optionalCount
      ? `${optionalCount} si ça rentre`
      : 'Aucun';

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-x-3 gap-y-1">
      <p className={cn(GROUP_LABEL, 'w-28 shrink-0 sm:pt-3')}>{label}</p>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-3 min-h-11">
          <p className="min-w-0 text-sm text-foreground">{summary}</p>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
            className="shrink-0 min-h-11 px-2 text-sm font-semibold text-primary rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {open ? 'Fermer' : 'Modifier'}
          </button>
        </div>
        {open ? (
          <div className="flex flex-wrap gap-1.5 items-center">
            {visible.map((category) => {
              const priority = slots[category] || 'excluded';
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onCycle(category)}
                  title={`${SLOT_HINT[priority]} · cliquer pour changer`}
                  className={cn(
                    CHOICE_CHIP,
                    priority === 'required' && choiceChipTone(true),
                    priority === 'optional' && 'border-dashed border-primary/50 text-primary',
                    priority === 'excluded' && 'border-border text-muted line-through decoration-muted/60 hover:bg-surface-muted',
                  )}
                >
                  {SERVICE_CATEGORY_LABELS[category]}
                  <span className="opacity-70"> · {SLOT_SHORT[priority]}</span>
                </button>
              );
            })}
            {suggested.length < all.length ? (
              <button
                type="button"
                className="min-h-11 sm:min-h-9 px-2 text-[13px] font-semibold text-primary rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                onClick={() => setShowAll((value) => !value)}
              >
                {showAll ? 'Moins' : 'Tous'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function EventPlanBriefForm({
  brief,
  onChange,
  planning,
  error,
  onSubmit,
  briefs,
  onSaveBrief,
  onLoadBrief,
  onDeleteBrief,
}: {
  brief: EventPlanBrief;
  onChange: (next: EventPlanBrief) => void;
  planning: boolean;
  error: string;
  onSubmit: () => void;
  briefs: SavedEventBrief[];
  onSaveBrief: (name: string) => Promise<void>;
  onLoadBrief: (item: SavedEventBrief) => void;
  onDeleteBrief: (id: string) => Promise<void>;
}) {
  const { site } = usePlatformSite();
  const marketplaceCities = enabledMarketplaceCities(site);
  const [advanced, setAdvanced] = useState(false);
  const refineId = useId();
  const [briefName, setBriefName] = useState('');
  const [scopeError, setScopeError] = useState('');
  const [saving, setSaving] = useState(false);
  const communes = communesForCity(brief.city);
  const rows = useMemo(() => shareRows(brief), [brief]);
  const shareSum = rows.reduce((sum, row) => sum + row.pct, 0);
  const spendable = briefSpendableFc(brief);
  const reserved = briefMarginFc(brief);
  const suggestedTrades = SERVICE_TRADE_CATEGORIES.filter(
    (category) => brief.slots[category] === 'required' || brief.slots[category] === 'optional',
  );
  const suggestedRentals = SERVICE_RENTAL_CATEGORIES.filter(
    (category) => brief.slots[category] === 'required' || brief.slots[category] === 'optional',
  );

  const patch = (partial: Partial<EventPlanBrief>) => onChange({ ...brief, ...partial });

  const setIncludeVenue = (includeVenue: IncludeVenue) => {
    patch({ includeVenue, shares: defaultShares(brief.eventType, includeVenue, brief.slots) });
  };

  const setSlot = (category: ServiceCategory) => {
    const slots = { ...brief.slots, [category]: cycleSlotPriority(brief.slots[category] || 'excluded') };
    const shares = { ...defaultShares(brief.eventType, brief.includeVenue, slots), ...brief.shares };
    onChange({ ...brief, slots, shares });
  };

  const scope = brief.budgetScope || 'complete';

  const launch = () => {
    if (scope === 'drinks' && !(brief.guestCount > 0) && !(brief.wantedDrinkLines || []).length) {
      setScopeError('Indiquez le nombre d’invités pour chiffrer les boissons.');
      return;
    }
    setScopeError('');
    onSubmit();
  };

  const saveBrief = async () => {
    setSaving(true);
    try {
      await onSaveBrief(briefName.trim() || `Brief · ${eventTypeLabel(brief.eventType)}`);
      setBriefName('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-5">
      <BudgetScopeTabs
        value={scope}
        onChange={(budgetScope) => {
          setScopeError('');
          patch({ budgetScope });
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <FieldSelect
          label="Type d’événement"
          value={brief.eventType}
          onChange={(value) => onChange(briefWithEventType(brief, value as ListingEventTypeId))}
        >
          {LISTING_EVENT_TYPES.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </FieldSelect>
        <Input
          label="Budget maximum (FC)"
          type="number"
          min={50000}
          step={50000}
          value={brief.budgetMaxFc}
          onChange={(e) => patch({ budgetMaxFc: Number(e.target.value) || 0 })}
          required
          hint={reserved > 0 ? `Recherche sur ${formatFc(spendable)}, ${formatFc(reserved)} en réserve` : undefined}
        />
        <Input
          label="Nombre d’invités"
          type="number"
          min={1}
          required={scope === 'drinks'}
          value={brief.guestCount || ''}
          onChange={(e) => {
            setScopeError('');
            patch({ guestCount: Number(e.target.value) || 0 });
          }}
        />
        {scope !== 'drinks' ? (
          <>
            <FieldSelect
              label="Ville"
              value={brief.city}
              onChange={(value) => patch({ city: normalizeRdcCity(value) || '', commune: '' })}
            >
              <option value="">Toutes les villes</option>
              {marketplaceCities.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </FieldSelect>
            <FieldSelect
              label="Commune"
              value={brief.commune}
              onChange={(value) => patch({ commune: value })}
            >
              <option value="">Toutes les communes</option>
              {communes.map((item) => (
                <option key={item.name} value={item.name}>{item.name}</option>
              ))}
            </FieldSelect>
          </>
        ) : null}
        <Input
          label="Date"
          type="date"
          value={brief.eventDate}
          onChange={(e) => patch({ eventDate: e.target.value })}
        />
      </div>

      {scope === 'drinks' ? (
        <BudgetSimulationCriteria
          scope={scope}
          selectedBrandIds={brief.wantedBrandIds || []}
          onToggleBrand={(id) => {
            const current = brief.wantedBrandIds || [];
            patch({
              wantedBrandIds: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
            });
          }}
          selectedSaleUnits={brief.wantedSaleUnits || []}
          onToggleSaleUnit={(unit) => {
            const current = brief.wantedSaleUnits || [];
            patch({
              wantedSaleUnits: current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit],
            });
          }}
          orderLines={brief.wantedDrinkLines || []}
          onChangeOrderLines={(wantedDrinkLines) => patch({ wantedDrinkLines })}
          onClearCatalog={() => patch({ wantedBrandIds: [], wantedSaleUnits: [] })}
        />
      ) : null}

      {scope === 'complete' ? (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className={cn(GROUP_LABEL, 'w-28 shrink-0')}>Salle</p>
        <div className={cn('inline-flex', SEGMENTED_TRACK)} role="group" aria-label="Salle">
          {([
            ['yes', 'Obligatoire', 'Chaque pack contient une salle.'],
            ['if_fits', 'Si ça rentre', 'Salle ajoutée seulement s’il reste du budget.'],
            ['no', 'Sans salle', 'Vous avez déjà un lieu.'],
          ] as Array<[IncludeVenue, string, string]>).map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              title={hint}
              aria-pressed={brief.includeVenue === id}
              onClick={() => setIncludeVenue(id)}
              className={segmentedItem(brief.includeVenue === id, 'min-h-9 sm:min-h-9 px-3 text-xs')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      ) : null}

      {scope === 'complete' || scope === 'services' ? (
      <SlotGroup
        label="Prestataires"
        all={SERVICE_TRADE_CATEGORIES}
        suggested={suggestedTrades}
        slots={brief.slots}
        onCycle={setSlot}
      />
      ) : null}

      {scope === 'complete' || scope === 'rentals' ? (
      <SlotGroup
        label="Matériel"
        all={SERVICE_RENTAL_CATEGORIES}
        suggested={suggestedRentals}
        slots={brief.slots}
        onCycle={setSlot}
      />
      ) : null}

      <div className="border-t border-border pt-2 space-y-4">
        <button
          type="button"
          onClick={() => setAdvanced((value) => !value)}
          aria-expanded={advanced}
          aria-controls={refineId}
          className="inline-flex items-center gap-1.5 min-h-11 text-sm font-semibold text-primary rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Affiner le calcul
          <ChevronDown className={cn('w-4 h-4 transition', advanced && 'rotate-180')} aria-hidden />
        </button>
        {advanced ? (
          <div id={refineId} className="space-y-5">
            <PriceSourcePicker
              value={brief.priceSource || 'all'}
              onChange={(priceSource) => patch({ priceSource })}
            />
            {scope !== 'drinks' ? (
              <BudgetSimulationCriteria
                scope={scope}
                selectedBrandIds={brief.wantedBrandIds || []}
                onToggleBrand={(id) => {
                  const current = brief.wantedBrandIds || [];
                  patch({
                    wantedBrandIds: current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
                  });
                }}
                selectedSaleUnits={brief.wantedSaleUnits || []}
                onToggleSaleUnit={(unit) => {
                  const current = brief.wantedSaleUnits || [];
                  patch({
                    wantedSaleUnits: current.includes(unit) ? current.filter((item) => item !== unit) : [...current, unit],
                  });
                }}
                orderLines={brief.wantedDrinkLines || []}
                onChangeOrderLines={(wantedDrinkLines) => patch({ wantedDrinkLines })}
                onClearCatalog={() => patch({ wantedBrandIds: [], wantedSaleUnits: [] })}
              />
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldSelect
                label="Réserve pour imprévus"
                value={String(brief.marginPct)}
                onChange={(value) => patch({ marginPct: Number(value) as MarginPct })}
              >
                <option value="0">Aucune</option>
                <option value="5">5 % · {formatFc(Math.round(brief.budgetMaxFc * 0.05))}</option>
                <option value="10">10 % · {formatFc(Math.round(brief.budgetMaxFc * 0.10))}</option>
              </FieldSelect>
              {scope === 'complete' ? (
                <Input
                  label="Budget minimum (FC)"
                  type="number"
                  min={0}
                  step={50000}
                  value={brief.budgetMinFc || ''}
                  onChange={(e) => patch({ budgetMinFc: Number(e.target.value) || 0 })}
                  placeholder="Aucun"
                />
              ) : null}
            </div>

            {scope === 'complete' ? (
            <>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className={GROUP_LABEL}>
                  Répartition de {formatFc(spendable)}
                  {shareSum !== 100 ? ` · ${shareSum} % (ramené à 100 % au lancement)` : ''}
                </p>
                <button
                  type="button"
                  className="min-h-11 sm:min-h-9 px-1 text-xs font-semibold text-primary rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  onClick={() => patch({ shares: defaultShares(brief.eventType, brief.includeVenue, brief.slots) })}
                >
                  Réinitialiser
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {rows.map((row) => (
                  <label key={row.key} className="space-y-1">
                    <span className={cn('flex justify-between gap-2', GROUP_LABEL)}>
                      <span>{row.label}</span>
                      <span className="tabular-nums">{row.pct} % · {formatFc(row.amountFc)}</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={70}
                      value={row.pct}
                      onChange={(e) => patch({ shares: { ...brief.shares, [row.key]: Number(e.target.value) } })}
                      className="w-full"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldSelect
                label="Favoris"
                value={brief.favoriteMode}
                onChange={(value) => patch({ favoriteMode: value as FavoriteMode })}
              >
                <option value="bonus">Bonus si égalité</option>
                <option value="force">Forcer s’ils tiennent dans le poste</option>
                <option value="ignore">Ignorer les favoris</option>
              </FieldSelect>
              <FieldSelect
                label="Catalogue"
                value={brief.matchMode}
                onChange={(value) => patch({ matchMode: value as MatchMode })}
              >
                <option value="widen">Élargir s’il n’y a pas assez d’offres</option>
                <option value="exact">Uniquement adapté au type</option>
              </FieldSelect>
              <FieldSelect
                label="Prestataire introuvable"
                value={brief.missingStrategy}
                onChange={(value) => patch({ missingStrategy: value as MissingStrategy })}
              >
                <option value="reallocate">Réallouer le poste aux autres lignes</option>
                <option value="gap">Laisser un trou explicite</option>
                <option value="widen_city">Élargir la ville / commune</option>
              </FieldSelect>
              <FieldSelect
                label="Équipements de salle"
                value={brief.amenityMode}
                onChange={(value) => patch({ amenityMode: value as AmenityMode })}
              >
                <option value="preferred">Préférés (bonus)</option>
                <option value="blocking">Obligatoires</option>
              </FieldSelect>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Équipements de salle">
              {VENUE_AMENITIES.map((item) => {
                const active = brief.venueAmenities.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => patch({
                      venueAmenities: active
                        ? brief.venueAmenities.filter((id) => id !== item.id)
                        : [...brief.venueAmenities, item.id],
                    })}
                    className={cn(CHOICE_CHIP, choiceChipTone(active))}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <label className="flex items-center gap-2 min-h-11 text-sm text-foreground">
              <input
                className="size-4 accent-primary shrink-0"
                type="checkbox"
                checked={brief.distinctVenues}
                onChange={(e) => patch({ distinctVenues: e.target.checked })}
              />
              Une salle différente dans chaque pack
            </label>
            </>
            ) : null}
          </div>
        ) : null}
      </div>

      {scopeError || error ? <Alert variant="error">{scopeError || error}</Alert> : null}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <Button onClick={launch} disabled={planning} leftIcon={planning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}>
          {planning ? 'Recherche…' : 'Lancer la recherche'}
        </Button>
        <div className="flex flex-1 min-w-[12rem] items-center gap-1 sm:justify-end">
          <div className="min-w-0 flex-1 sm:max-w-[16rem]">
            <Input
              value={briefName}
              onChange={(e) => setBriefName(e.target.value)}
              placeholder="Nom du brief"
              aria-label="Nom du brief"
            />
          </div>
          <Button variant="ghost" loading={saving} onClick={() => void saveBrief()} leftIcon={<Save className="w-4 h-4" />}>
            Sauver
          </Button>
        </div>
      </div>

      {briefs.length > 0 ? (
        <div className="space-y-2">
          <p className={GROUP_LABEL}>Briefs enregistrés</p>
          <ul className="flex flex-wrap gap-1.5">
            {briefs.map((item) => (
              <li key={item.id} className="inline-flex max-w-full items-center rounded-full border border-border">
                <button
                  type="button"
                  onClick={() => onLoadBrief(item)}
                  className="min-h-11 sm:min-h-9 min-w-0 text-left break-words pl-3 pr-1 text-[13px] font-medium text-foreground hover:text-primary rounded-l-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {item.name}
                </button>
                <button
                  type="button"
                  onClick={() => void onDeleteBrief(item.id)}
                  className="min-h-11 sm:min-h-9 px-2.5 text-sm text-muted hover:text-danger rounded-r-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  aria-label={`Supprimer ${item.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

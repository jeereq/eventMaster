'use client';

import React, { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';
import { BEVERAGE_KINDS, BEVERAGE_KIND_LABELS, BEVERAGE_SALE_UNITS, BEVERAGE_SALE_UNIT_LABELS, type BeverageBrandRow, type BeverageKind, type BeverageSaleUnit, type DrinkOrderLine } from '@/lib/beverageBrands';
import { BUDGET_SCOPE_OPTIONS, type BudgetSimulationScope } from '@/lib/budgetSimulation';
import { SERVICE_CATEGORY_LABELS, SERVICE_RENTAL_CATEGORIES, SERVICE_TRADE_CATEGORIES, type ServiceCategory } from '@/lib/marketplace';

/** Pastille de choix du simulateur : claire au repos, teintée une fois choisie. */
export const CHOICE_CHIP =
  'inline-flex items-center justify-center gap-1 max-w-full min-h-11 sm:min-h-9 px-3 rounded-full border text-[13px] font-medium text-center transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

export function choiceChipTone(active: boolean) {
  return active
    ? 'border-primary/50 bg-primary/10 text-primary'
    : 'border-border text-foreground hover:bg-surface-muted';
}

/** Libellé court posé au-dessus d’un groupe de pastilles. */
export const GROUP_LABEL = 'text-xs font-semibold text-muted';

/**
 * Ce que la simulation chiffre : onglets soulignés, plus discrets que le sélecteur de méthode au-dessus.
 * `inactive` retire le soulignement quand une autre vue (historique, exemples) occupe le panneau.
 */
export function BudgetScopeTabs({
  value,
  onChange,
  inactive = false,
  bordered = true,
  action,
  className,
}: {
  value: BudgetSimulationScope;
  onChange: (next: BudgetSimulationScope) => void;
  inactive?: boolean;
  bordered?: boolean;
  action?: React.ReactNode;
  className?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const count = BUDGET_SCOPE_OPTIONS.length;

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    else return;
    event.preventDefault();
    onChange(BUDGET_SCOPE_OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-1 xl:flex-row xl:items-end xl:justify-between xl:gap-4',
        bordered && action && 'xl:border-b xl:border-border',
        className,
      )}
    >
      <div
        role="radiogroup"
        aria-label="À chiffrer"
        className={cn(
          'flex min-w-0 max-w-full gap-5 overflow-x-auto scrollbar-none',
          bordered && 'border-b border-border',
          bordered && action && 'xl:border-b-0 xl:-mb-px',
        )}
      >
        {BUDGET_SCOPE_OPTIONS.map((option, index) => {
          const selected = value === option.id;
          const marked = selected && !inactive;
          return (
            <button
              key={option.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              title={option.hint}
              onClick={() => onChange(option.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                'relative shrink-0 whitespace-nowrap min-h-11 text-sm transition-colors touch-manipulation rounded-t-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
                marked
                  ? 'font-semibold text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
                  : 'font-medium text-muted hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-1 xl:pb-1">{action}</div> : null}
    </div>
  );
}

export default function BudgetSimulationCriteria({
  scope,
  selectedBrandIds,
  onToggleBrand,
  selectedSaleUnits,
  onToggleSaleUnit,
  orderLines,
  onChangeOrderLines,
  onClearCatalog,
  selectedCategories,
  onToggleCategory,
}: {
  scope: BudgetSimulationScope;
  selectedBrandIds: string[];
  onToggleBrand: (id: string) => void;
  selectedSaleUnits: BeverageSaleUnit[];
  onToggleSaleUnit: (unit: BeverageSaleUnit) => void;
  orderLines: DrinkOrderLine[];
  onChangeOrderLines: (lines: DrinkOrderLine[]) => void;
  onClearCatalog?: () => void;
  selectedCategories?: ServiceCategory[];
  onToggleCategory?: (id: ServiceCategory) => void;
}) {
  const showBrands = scope === 'complete' || scope === 'drinks';
  const showServices = Boolean(onToggleCategory) && (scope === 'complete' || scope === 'services');
  const showRentals = Boolean(onToggleCategory) && (scope === 'complete' || scope === 'rentals');
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [brandState, setBrandState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [drinkMode, setDrinkMode] = useState<'catalog' | 'order'>(orderLines.length ? 'order' : 'catalog');

  useEffect(() => {
    if (orderLines.length > 0) setDrinkMode('order');
  }, [orderLines.length]);

  const chooseDrinkMode = (next: 'catalog' | 'order') => {
    if (next === drinkMode) return;
    if (next === 'order') {
      if (onClearCatalog) onClearCatalog();
      else {
        selectedBrandIds.forEach(onToggleBrand);
        selectedSaleUnits.forEach(onToggleSaleUnit);
      }
    } else {
      onChangeOrderLines([]);
    }
    setDrinkMode(next);
  };

  useEffect(() => {
    let cancelled = false;
    api.get('/public/beverage-brands')
      .then((data: { brands?: BeverageBrandRow[] } | BeverageBrandRow[]) => {
        if (cancelled) return;
        const rows = Array.isArray(data) ? data : Array.isArray(data?.brands) ? data.brands : [];
        setBrands(rows.filter((brand) => brand.isActive !== false));
        setBrandState('ready');
      })
      .catch(() => {
        if (!cancelled) setBrandState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!showBrands && !showServices && !showRentals) return null;

  return (
    <div className="space-y-5">
      {showBrands ? (
        <CriteriaGroup label="Boissons">
          <div role="group" aria-label="Façon de chiffrer les boissons" className={cn('inline-flex max-w-full', SEGMENTED_TRACK)}>
            {([
              ['catalog', 'Selon les invités'],
              ['order', 'Commande précise'],
            ] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={drinkMode === mode}
                onClick={() => chooseDrinkMode(mode)}
                className={segmentedItem(drinkMode === mode, 'min-h-11 sm:min-h-8 px-3 text-[13px] whitespace-nowrap')}
              >
                {label}
              </button>
            ))}
          </div>
        </CriteriaGroup>
      ) : null}

      {showBrands && drinkMode === 'catalog' ? (
        <CriteriaGroup label="Marques">
          <div aria-live="polite">
            {brandState === 'error' ? (
              <p className="text-xs text-danger" role="alert">Marques indisponibles pour le moment.</p>
            ) : null}
            {brandState === 'loading' ? <p className="text-xs text-muted">Chargement des marques…</p> : null}
            {brandState === 'ready' && brands.length === 0 ? (
              <p className="text-xs text-muted">Aucune marque publiée.</p>
            ) : null}
          </div>
          {BEVERAGE_KINDS.map((kind) => {
            const rows = brands.filter((brand) => brand.kind === kind);
            if (!rows.length) return null;
            return (
              <BrandFamily
                key={kind}
                kind={kind}
                brands={rows}
                selectedBrandIds={selectedBrandIds}
                onToggleBrand={onToggleBrand}
              />
            );
          })}
        </CriteriaGroup>
      ) : null}

      {showBrands && drinkMode === 'catalog' ? (
        <CriteriaGroup label="Quantités">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quantités">
            {BEVERAGE_SALE_UNITS.map((unit) => {
              const active = selectedSaleUnits.includes(unit);
              return (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleSaleUnit(unit)}
                  className={cn(CHOICE_CHIP, choiceChipTone(active))}
                >
                  {BEVERAGE_SALE_UNIT_LABELS[unit]}
                </button>
              );
            })}
          </div>
        </CriteriaGroup>
      ) : null}

      {showBrands && drinkMode === 'order' ? (
        <DrinkOrderEditor brands={brands} lines={orderLines} onChange={onChangeOrderLines} disabled={brandState !== 'ready' || brands.length === 0} />
      ) : null}

      {drinkMode !== 'order' && showServices && onToggleCategory && selectedCategories ? (
        <CriteriaGroup label="Services">
          <ChoiceRow
            label="Services"
            ids={SERVICE_TRADE_CATEGORIES}
            selected={selectedCategories}
            onToggle={onToggleCategory}
          />
        </CriteriaGroup>
      ) : null}

      {drinkMode !== 'order' && showRentals && onToggleCategory && selectedCategories ? (
        <CriteriaGroup label="Locations">
          <ChoiceRow
            label="Locations"
            ids={SERVICE_RENTAL_CATEGORIES}
            selected={selectedCategories}
            onToggle={onToggleCategory}
          />
        </CriteriaGroup>
      ) : null}
    </div>
  );
}

function CriteriaGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className={GROUP_LABEL}>{label}</p>
      {children}
    </div>
  );
}

function BrandFamily({
  kind,
  brands,
  selectedBrandIds,
  onToggleBrand,
}: {
  kind: BeverageKind;
  brands: BeverageBrandRow[];
  selectedBrandIds: string[];
  onToggleBrand: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted">{BEVERAGE_KIND_LABELS[kind]}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Marques · ${BEVERAGE_KIND_LABELS[kind]}`}>
        {brands.map((brand) => {
          const active = selectedBrandIds.includes(brand.id);
          return (
            <button
              key={brand.id}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleBrand(brand.id)}
              className={cn(CHOICE_CHIP, choiceChipTone(active))}
            >
              {brand.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DrinkOrderEditor({
  brands,
  lines,
  onChange,
  disabled,
}: {
  brands: BeverageBrandRow[];
  lines: DrinkOrderLine[];
  onChange: (lines: DrinkOrderLine[]) => void;
  disabled: boolean;
}) {
  const [brandId, setBrandId] = React.useState('');
  const [unitKind, setUnitKind] = React.useState<BeverageSaleUnit>('CRATE');
  const [packs, setPacks] = React.useState('10');
  const field = 'w-full min-h-11 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  const add = () => {
    const count = Math.round(Number(packs));
    if (!brandId || !Number.isFinite(count) || count < 1) return;
    const next = lines.filter((line) => !(line.brandId === brandId && line.unitKind === unitKind));
    onChange([...next, { brandId, unitKind, packs: Math.min(500, count) }].slice(0, 20));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 items-end xl:grid-cols-[minmax(0,1fr)_auto_5.5rem_auto]">
        <label className="space-y-1 block col-span-2 xl:col-span-1">
          <span className={GROUP_LABEL}>Marque</span>
          <select className={field} value={brandId} disabled={disabled} onChange={(event) => setBrandId(event.target.value)} aria-label="Marque de la commande">
            <option value="">Choisir</option>
            {BEVERAGE_KINDS.map((kind) => {
              const rows = brands.filter((brand) => brand.kind === kind);
              if (!rows.length) return null;
              return (
                <optgroup key={kind} label={BEVERAGE_KIND_LABELS[kind]}>
                  {rows.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </optgroup>
              );
            })}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className={GROUP_LABEL}>Conditionnement</span>
          <select className={field} value={unitKind} onChange={(event) => setUnitKind(event.target.value as BeverageSaleUnit)} aria-label="Conditionnement">
            {BEVERAGE_SALE_UNITS.map((unit) => <option key={unit} value={unit}>{BEVERAGE_SALE_UNIT_LABELS[unit]}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className={GROUP_LABEL}>Nombre</span>
          <input className={field} inputMode="numeric" min={1} max={500} value={packs} onChange={(event) => setPacks(event.target.value)} aria-label="Nombre de conditionnements" />
        </label>
        <button
          type="button"
          onClick={add}
          disabled={disabled || !brandId}
          className="col-span-2 xl:col-span-1 min-h-11 px-4 rounded-[var(--radius-button)] border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          Ajouter
        </button>
      </div>
      {lines.length ? (
        <ul className="divide-y divide-border border-y border-border">
          {lines.map((line) => {
            const brand = brands.find((item) => item.id === line.brandId);
            return (
              <li key={`${line.brandId}-${line.unitKind}`} className="flex items-center justify-between gap-2 min-h-11">
                <span className="text-sm text-foreground tabular-nums">{brand?.name || 'Marque'} · {line.packs} × {BEVERAGE_SALE_UNIT_LABELS[line.unitKind].toLowerCase()}</span>
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs font-semibold text-muted hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                  onClick={() => onChange(lines.filter((item) => !(item.brandId === line.brandId && item.unitKind === line.unitKind)))}
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function ChoiceRow({
  label,
  ids,
  selected,
  onToggle,
}: {
  label: string;
  ids: ServiceCategory[];
  selected: ServiceCategory[];
  onToggle: (id: ServiceCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {ids.map((id) => {
        const active = selected.includes(id);
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(id)}
            className={cn(CHOICE_CHIP, choiceChipTone(active))}
          >
            {SERVICE_CATEGORY_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

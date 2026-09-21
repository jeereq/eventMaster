'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { BEVERAGE_KINDS, BEVERAGE_KIND_LABELS, BEVERAGE_SALE_UNITS, BEVERAGE_SALE_UNIT_LABELS, type BeverageBrandRow, type BeverageKind, type BeverageSaleUnit, type DrinkOrderLine } from '@/lib/beverageBrands';
import type { BudgetSimulationScope } from '@/lib/budgetSimulation';
import { SERVICE_CATEGORY_LABELS, SERVICE_RENTAL_CATEGORIES, SERVICE_TRADE_CATEGORIES, type ServiceCategory } from '@/lib/marketplace';

const CHIP =
  'inline-flex items-center justify-center min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function chipTone(active: boolean) {
  return active
    ? 'bg-primary-solid text-primary-foreground border-primary-solid'
    : 'border-border text-muted hover:text-foreground';
}

export default function BudgetSimulationCriteria({
  scope,
  selectedBrandIds,
  onToggleBrand,
  selectedSaleUnits,
  onToggleSaleUnit,
  orderLines,
  onChangeOrderLines,
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
  selectedCategories?: ServiceCategory[];
  onToggleCategory?: (id: ServiceCategory) => void;
}) {
  const showBrands = scope === 'complete' || scope === 'drinks';
  const showServices = Boolean(onToggleCategory) && (scope === 'complete' || scope === 'services');
  const showRentals = Boolean(onToggleCategory) && (scope === 'complete' || scope === 'rentals');
  const [brands, setBrands] = useState<BeverageBrandRow[]>([]);
  const [brandState, setBrandState] = useState<'loading' | 'ready' | 'error'>('loading');

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

  const selectionSummary = () => {
    const parts: string[] = [];
    if (showBrands && selectedBrandIds.length) {
      parts.push(`${selectedBrandIds.length} marque${selectedBrandIds.length > 1 ? 's' : ''}`);
    }
    if (showBrands && orderLines.length) {
      parts.push(`${orderLines.length} commande${orderLines.length > 1 ? 's' : ''}`);
    } else if (showBrands && selectedSaleUnits.length) {
      parts.push(selectedSaleUnits.map((unit) => BEVERAGE_SALE_UNIT_LABELS[unit]).join(', '));
    }
    if (showServices && selectedCategories) {
      const count = selectedCategories.filter((id) => SERVICE_TRADE_CATEGORIES.includes(id)).length;
      if (count) parts.push(`${count} service${count > 1 ? 's' : ''}`);
    }
    if (showRentals && selectedCategories) {
      const count = selectedCategories.filter((id) => SERVICE_RENTAL_CATEGORIES.includes(id)).length;
      if (count) parts.push(`${count} location${count > 1 ? 's' : ''}`);
    }
    if (!parts.length) return 'Aucun filtre : la simulation suit le type d’événement.';
    return `Sélection : ${parts.join(' · ')}.`;
  };

  if (!showBrands && !showServices && !showRentals) return null;

  const groups = [
    showBrands ? 'marques' : '',
    showBrands ? 'quantités' : '',
    showServices ? 'services' : '',
    showRentals ? 'locations' : '',
  ].filter(Boolean);
  const groupList = groups.length <= 1
    ? groups[0] || ''
    : `${groups.slice(0, -1).join(', ')} et ${groups[groups.length - 1]}`;

  return (
    <div className="space-y-3 rounded-xl border border-border px-3 py-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted">Critères</p>
        <p className="text-xs text-muted leading-relaxed">
          {onToggleCategory
            ? `Sans choix, la simulation suit le type d’événement. Un choix limite le pack à ces ${groupList}.`
            : 'Sans choix, chaque famille prend la marque et le conditionnement les moins chers. Un choix ne chiffre que ces marques et ces quantités.'}
        </p>
        <p className="text-xs text-foreground leading-relaxed" aria-live="polite">{selectionSummary()}</p>
      </div>

      {showBrands ? (
        <CriteriaGroup label="Marques" hint="Chaque marque cochée a sa ligne, avec une quantité adaptée aux invités.">
          <div aria-live="polite">
            {brandState === 'error' ? (
              <p className="text-xs text-danger" role="alert">
                Les marques ne sont pas joignables pour le moment. Sans marque, chaque famille prend la moins chère.
              </p>
            ) : null}
            {brandState === 'loading' ? <p className="text-xs text-muted">Chargement des marques…</p> : null}
            {brandState === 'ready' && brands.length === 0 ? (
              <p className="text-xs text-muted">Aucune marque publiée. Chaque famille prendra la moins chère.</p>
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

      {showBrands ? (
        <CriteriaGroup label="Quantités" hint="Un ou plusieurs conditionnements. La quantité suit les invités. S’il y en a plusieurs, le moins cher de ceux-là est retenu.">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quantités">
            {BEVERAGE_SALE_UNITS.map((unit) => {
              const active = selectedSaleUnits.includes(unit);
              return (
                <button
                  key={unit}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggleSaleUnit(unit)}
                  className={cn(CHIP, chipTone(active))}
                >
                  {BEVERAGE_SALE_UNIT_LABELS[unit]}
                </button>
              );
            })}
          </div>
        </CriteriaGroup>
      ) : null}

      {showBrands ? (
        <DrinkOrderEditor brands={brands} lines={orderLines} onChange={onChangeOrderLines} disabled={brandState !== 'ready' || brands.length === 0} />
      ) : null}

      {showServices && onToggleCategory && selectedCategories ? (
        <CriteriaGroup label="Services" hint="Traiteur, photo, DJ et les autres métiers.">
          <ChoiceRow
            label="Services"
            ids={SERVICE_TRADE_CATEGORIES}
            selected={selectedCategories}
            onToggle={onToggleCategory}
          />
        </CriteriaGroup>
      ) : null}

      {showRentals && onToggleCategory && selectedCategories ? (
        <CriteriaGroup label="Locations" hint="Chaises, tentes, sono, véhicules et le reste du matériel.">
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
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="text-xs text-muted leading-relaxed">{hint}</p>
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
    <div className="space-y-1">
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
              className={cn(CHIP, chipTone(active))}
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
    <CriteriaGroup label="Commande précise" hint="Exemple : 10 casiers de Tembo et 5 casiers de Coca. Cette commande remplace l’estimation par invité.">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_5.5rem_auto] gap-2 items-end">
        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-muted">Marque</span>
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
          <span className="text-xs font-semibold text-muted">Conditionnement</span>
          <select className={field} value={unitKind} onChange={(event) => setUnitKind(event.target.value as BeverageSaleUnit)} aria-label="Conditionnement">
            {BEVERAGE_SALE_UNITS.map((unit) => <option key={unit} value={unit}>{BEVERAGE_SALE_UNIT_LABELS[unit]}</option>)}
          </select>
        </label>
        <label className="space-y-1 block">
          <span className="text-xs font-semibold text-muted">Nombre</span>
          <input className={field} inputMode="numeric" min={1} max={500} value={packs} onChange={(event) => setPacks(event.target.value)} aria-label="Nombre de conditionnements" />
        </label>
        <button type="button" onClick={add} disabled={disabled || !brandId} className="min-h-11 px-3 rounded-[var(--radius-button)] bg-primary-solid text-primary-foreground text-xs font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
          Ajouter
        </button>
      </div>
      {lines.length ? (
        <ul className="space-y-1.5">
          {lines.map((line) => {
            const brand = brands.find((item) => item.id === line.brandId);
            return (
              <li key={`${line.brandId}-${line.unitKind}`} className="flex items-center justify-between gap-2 min-h-11">
                <span className="text-sm text-foreground">{brand?.name || 'Marque'} · {line.packs} × {BEVERAGE_SALE_UNIT_LABELS[line.unitKind].toLowerCase()}</span>
                <button
                  type="button"
                  className="min-h-11 px-2 text-xs font-semibold text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
                  onClick={() => onChange(lines.filter((item) => !(item.brandId === line.brandId && item.unitKind === line.unitKind)))}
                >
                  Retirer
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </CriteriaGroup>
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
            className={cn(CHIP, chipTone(active))}
          >
            {SERVICE_CATEGORY_LABELS[id]}
          </button>
        );
      })}
    </div>
  );
}

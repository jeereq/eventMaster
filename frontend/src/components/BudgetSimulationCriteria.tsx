'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { BEVERAGE_KINDS, BEVERAGE_KIND_LABELS, BEVERAGE_SALE_UNITS, BEVERAGE_SALE_UNIT_LABELS, type BeverageBrandRow, type BeverageKind, type BeverageSaleUnit } from '@/lib/beverageBrands';
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
  selectedCategories,
  onToggleCategory,
}: {
  scope: BudgetSimulationScope;
  selectedBrandIds: string[];
  onToggleBrand: (id: string) => void;
  selectedSaleUnits: BeverageSaleUnit[];
  onToggleSaleUnit: (unit: BeverageSaleUnit) => void;
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
      </div>

      {showBrands ? (
        <CriteriaGroup label="Marques" hint="Chaque marque cochée a sa ligne, avec une quantité adaptée aux invités.">
          {brandState === 'error' ? <p className="text-xs text-rose-700 dark:text-rose-300" role="alert">Les marques ne sont pas joignables pour le moment.</p> : null}
          {brandState === 'loading' ? <p className="text-xs text-muted">Chargement des marques…</p> : null}
          {brandState === 'ready' && brands.length === 0 ? <p className="text-xs text-muted">Aucune marque publiée.</p> : null}
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
        <CriteriaGroup label="Quantités" hint="Le conditionnement choisi fixe l’unité. La quantité suit le nombre d’invités. Sans choix, le moins cher est retenu.">
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

'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CatalogueViewMode } from '@/lib/marketplace';
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
  onApply?: () => void;
  onOpen?: () => void;
  resultLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = Boolean(filters);
  const count = chips.length;

  const openModal = () => {
    onOpen?.();
    setOpen(true);
  };

  const apply = () => {
    onApply?.();
    setOpen(false);
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
          size="md"
          footer={
            <>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={apply}>
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

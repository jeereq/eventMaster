'use client';

import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CatalogueViewMode } from '@/lib/marketplace';
import CatalogueViewToggle from '@/components/CatalogueViewToggle';

export const catalogueSelectClass =
  'w-full px-3 py-2.5 rounded-[var(--radius-button)] border border-border bg-surface-muted text-sm text-foreground';

export function CatalogueFilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block space-y-1 min-w-0">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      {children}
    </div>
  );
}

export default function CatalogueFilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  view,
  onViewChange,
  onSubmit,
  filters,
  filterCount = 0,
  showSubmit = false,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  view: CatalogueViewMode;
  onViewChange: (mode: CatalogueViewMode) => void;
  onSubmit?: () => void;
  filters?: React.ReactNode;
  filterCount?: number;
  showSubmit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = Boolean(filters);

  const body = (
    <>
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
              variant="secondary"
              size="sm"
              className="sm:hidden"
              onClick={() => setOpen((v) => !v)}
              leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            >
              Filtres
              {filterCount > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                  {filterCount}
                </span>
              ) : null}
            </Button>
          )}
          <CatalogueViewToggle value={view} onChange={onViewChange} className="flex-1 sm:flex-none justify-between sm:justify-start" />
        </div>
      </div>
      {hasFilters && (
        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-2.5',
            open ? 'grid' : 'hidden sm:grid',
          )}
        >
          {filters}
          {showSubmit && (
            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button type="submit" className="w-full">
                Filtrer
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );

  const shell = 'rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-4 space-y-3';

  if (onSubmit) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
          setOpen(false);
        }}
        className={shell}
      >
        {body}
      </form>
    );
  }

  return <div className={shell}>{body}</div>;
}

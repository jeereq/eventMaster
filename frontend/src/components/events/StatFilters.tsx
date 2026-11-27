'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { CARD_SHADOW } from '@/components/dashboard/KpiCard';

export interface StatFilter<T extends string> {
  id: T;
  label: string;
  count: number;
}

/** Chiffres clés qui servent aussi de filtres : même bandeau que la vue d’ensemble. */
export default function StatFilters<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: T;
  onChange: (next: T) => void;
  options: Array<StatFilter<T>>;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn('em-header-wash rounded-[26px] p-3 sm:p-5', className)}>
      <div className={cn('grid grid-cols-2 gap-2.5 sm:gap-4', options.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                'min-w-0 rounded-[20px] bg-surface p-3.5 text-left transition sm:p-4',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                CARD_SHADOW,
                selected ? 'ring-2 ring-primary/50' : 'hover:-translate-y-0.5',
              )}
            >
              <span className="block truncate text-[13px] text-foreground/80">{option.label}</span>
              <span className="mt-1.5 block text-2xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
                {option.count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

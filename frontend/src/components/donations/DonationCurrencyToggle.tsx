'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import type { DonationCurrency } from '@/lib/donationCurrency';

const OPTIONS: Array<{ id: DonationCurrency; label: string; hint: string; symbol: string }> = [
  { id: 'CDF', label: 'Francs congolais', hint: 'CDF', symbol: 'FC' },
  { id: 'USD', label: 'Dollars US', hint: 'USD', symbol: '$' },
];

/** Choix de la devise d’un don (FC ou $). */
export default function DonationCurrencyToggle({
  value,
  onChange,
  rate,
  className,
}: {
  value: DonationCurrency;
  onChange: (currency: DonationCurrency) => void;
  /** Taux du jour (FC pour 1 $), affiché en aide. */
  rate?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="block text-sm font-semibold text-foreground" id="donation-currency-label">
        Devise du don
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="donation-currency-label">
        {OPTIONS.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(opt.id)}
              className={cn(
                'min-h-12 px-3 py-2 rounded-xl border text-left flex items-center gap-2.5 transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50',
                selected
                  ? 'border-rose-600 bg-rose-500/10 ring-1 ring-rose-600 text-foreground dark:border-rose-500 dark:ring-rose-500'
                  : 'border-border bg-surface text-muted hover:text-foreground hover:bg-surface-muted',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black',
                  selected ? 'bg-rose-700 text-white dark:bg-rose-600' : 'bg-surface-muted text-muted',
                )}
              >
                {opt.symbol}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground leading-tight">{opt.label}</span>
                <span className="block text-xs text-muted leading-tight">{opt.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {rate && rate > 0 ? (
        <p className="text-xs text-muted">
          Vous êtes débité dans la devise choisie. Taux indicatif : 1 $ = {rate.toLocaleString('fr-FR').replace(/ /g, ' ')} FC.
        </p>
      ) : null}
    </div>
  );
}

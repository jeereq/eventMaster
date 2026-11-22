'use client';

import { cn } from '@/lib/cn';

/**
 * Source des prix du simulateur :
 * - all : catalogue EventMaster, complété par les prix réels et les prix web/Facebook validés ;
 * - app : base EventMaster seulement (catalogue, réservations et devis réels) ;
 * - web : prix trouvés sur internet, validés par EventMaster ;
 * - facebook : prix trouvés sur des pages Facebook publiques, validés par EventMaster.
 */
export type PriceSource = 'all' | 'app' | 'web' | 'facebook';

export const PRICE_SOURCE_OPTIONS: Array<{ id: PriceSource; label: string; hint: string }> = [
  { id: 'all', label: 'Tout', hint: 'Catalogue EventMaster d’abord. Les lignes sans offre sont estimées avec les prix réels, du web ou de Facebook.' },
  { id: 'app', label: 'EventMaster', hint: 'Uniquement la base EventMaster : offres du catalogue et prix réels des réservations et devis.' },
  { id: 'web', label: 'Web', hint: 'Uniquement des prix trouvés sur internet et vérifiés par EventMaster. Chaque ligne cite ses sources.' },
  { id: 'facebook', label: 'Facebook', hint: 'Uniquement des prix publiés sur des pages Facebook publiques et vérifiés par EventMaster.' },
];

export function parsePriceSource(value: unknown): PriceSource {
  return PRICE_SOURCE_OPTIONS.some((option) => option.id === value) ? (value as PriceSource) : 'all';
}

export default function PriceSourcePicker({
  value,
  onChange,
}: {
  value: PriceSource;
  onChange: (next: PriceSource) => void;
}) {
  const current = PRICE_SOURCE_OPTIONS.find((option) => option.id === value) || PRICE_SOURCE_OPTIONS[0];
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-muted">Prix depuis</span>
        <div
          role="radiogroup"
          aria-label="Source des prix"
          className="flex max-w-full overflow-x-auto scrollbar-none gap-0.5 rounded-[10px] bg-surface-muted p-[3px]"
        >
          {PRICE_SOURCE_OPTIONS.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                title={option.hint}
                onClick={() => onChange(option.id)}
                className={cn(
                  'shrink-0 whitespace-nowrap min-h-11 sm:min-h-9 px-3 rounded-lg text-sm font-semibold transition-colors touch-manipulation',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  selected
                    ? 'bg-surface text-foreground shadow-[0_1px_3px_rgba(23,22,20,0.12)]'
                    : 'text-muted hover:text-foreground',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted leading-relaxed">{current.hint}</p>
    </div>
  );
}

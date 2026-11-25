'use client';

import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';

/**
 * Source des prix du simulateur :
 * - all : catalogue EventMaster, complété par les prix réels et les prix trouvés sur internet ;
 * - app : base EventMaster seulement (catalogue, réservations et devis réels) ;
 * - web : prix trouvés sur internet ;
 * - facebook : prix trouvés sur des pages Facebook publiques ;
 * - instagram : prix trouvés sur des comptes Instagram publics.
 * Les lignes sans prix sont cherchées en direct au moment de la simulation.
 */
export type PriceSource = 'all' | 'app' | 'web' | 'facebook' | 'instagram';

export const PRICE_SOURCE_OPTIONS: Array<{ id: PriceSource; label: string; hint: string }> = [
  { id: 'all', label: 'Tout', hint: 'Catalogue EventMaster d’abord. Les lignes sans offre sont estimées avec les prix réels ou cherchées sur internet.' },
  { id: 'app', label: 'EventMaster', hint: 'Uniquement la base EventMaster : offres du catalogue et prix réels des réservations et devis.' },
  { id: 'web', label: 'Web', hint: 'Uniquement des prix trouvés sur internet, cherchés en direct si besoin. Chaque ligne cite ses sources.' },
  { id: 'facebook', label: 'Facebook', hint: 'Uniquement des prix publiés sur des pages Facebook publiques. Chaque ligne renvoie vers les pages.' },
  { id: 'instagram', label: 'Instagram', hint: 'Uniquement des prix publiés sur des comptes Instagram publics. Chaque ligne renvoie vers les publications.' },
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
  return (
    <div className="min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <span className="text-xs font-semibold text-muted">Prix depuis</span>
      <div
        role="radiogroup"
        aria-label="Source des prix"
        className={cn('flex max-w-full overflow-x-auto scrollbar-none', SEGMENTED_TRACK, 'gap-0.5 p-[3px]')}
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
              className={segmentedItem(selected, 'shrink-0 whitespace-nowrap min-h-11 sm:min-h-8 px-2.5 text-xs')}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

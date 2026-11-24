'use client';

import React from 'react';
import { Check } from '@/components/icons';
import { cn } from '@/lib/cn';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';

export type EventPlanMethodId = 'manual' | 'ai' | 'final';

const METHODS: Array<{ id: EventPlanMethodId; label: string }> = [
  { id: 'manual', label: 'Par critères' },
  { id: 'ai', label: 'Avec l’IA' },
  { id: 'final', label: 'Pack final' },
];

export default function EventPlanMethodPicker({
  value,
  onChange,
  counts,
  finalLocked = false,
  packs,
}: {
  value: EventPlanMethodId;
  onChange: (next: EventPlanMethodId) => void;
  counts: { manual: number; ai: number; final: number };
  /** Désactive « Pack final » tant qu’aucune simulation n’a produit de pack. */
  finalLocked?: boolean;
  /** Ajoute « Mes packs » à la même rangée (page Simulateur du dashboard). */
  packs?: { active: boolean; count: number; onOpen: () => void };
}) {
  const { site } = usePlatformSite();
  const isBudgetBlocked = site?.studioVisibility?.budget === false;
  const simReady = counts.manual > 0 || counts.ai > 0;

  return (
    <div
      role="group"
      aria-label="Méthode de simulation"
      className={cn('inline-flex max-w-full overflow-x-auto', SEGMENTED_TRACK)}
    >
      {METHODS.map((item) => {
        const selected = !packs?.active && value === item.id;
        const disabled =
          (item.id === 'final' && finalLocked && !simReady && counts.final === 0)
          || (item.id === 'ai' && isBudgetBlocked && !selected);
        const done = item.id === 'final' ? counts.final > 0 : counts[item.id] > 0;
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            title={
              item.id === 'final' && disabled
                ? 'Lancez d’abord une simulation'
                : item.id === 'ai' && isBudgetBlocked
                  ? 'À venir'
                  : undefined
            }
            onClick={() => onChange(item.id)}
            className={segmentedItem(
              selected,
              'inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:text-muted',
            )}
          >
            {item.label}
            {done ? <Check className="w-3.5 h-3.5 text-primary-solid" strokeWidth={3} aria-label="fait" /> : null}
          </button>
        );
      })}
      {packs ? (
        <button
          type="button"
          aria-pressed={packs.active}
          onClick={packs.onOpen}
          className={segmentedItem(packs.active, 'inline-flex items-center gap-1.5 whitespace-nowrap')}
        >
          Mes packs
          {packs.count > 0 ? <span className="text-xs tabular-nums text-muted">{packs.count}</span> : null}
        </button>
      ) : null}
    </div>
  );
}

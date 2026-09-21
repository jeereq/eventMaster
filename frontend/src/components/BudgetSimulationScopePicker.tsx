'use client';

import { cn } from '@/lib/cn';
import { BUDGET_SCOPE_OPTIONS, type BudgetSimulationScope } from '@/lib/budgetSimulation';

const SCOPE_NOTE: Partial<Record<BudgetSimulationScope, string>> = {
  drinks: 'Catalogue national, sans filtre de ville. Le nombre d’invités est obligatoire.',
  rentals: 'Chaises et vaisselle : une pièce par invité. Les autres locations restent un lot. La ville filtre le catalogue.',
  services: 'Uniquement les métiers de la ville choisie. Locations, salle et boissons restent de côté.',
};

export default function BudgetSimulationScopePicker({
  value,
  onChange,
}: {
  value: BudgetSimulationScope;
  onChange: (next: BudgetSimulationScope) => void;
}) {
  const [complete, ...specialized] = BUDGET_SCOPE_OPTIONS;
  const note = SCOPE_NOTE[value];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted">Type de simulation</p>
      <div role="group" aria-label="Type de simulation" className="space-y-2">
        <button
          type="button"
          aria-pressed={value === complete.id}
          onClick={() => onChange(complete.id)}
          className={cn(
            'w-full text-left rounded-xl border-2 px-3 py-3 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            value === complete.id
              ? 'border-primary-solid bg-primary-solid text-primary-foreground'
              : 'border-primary-solid bg-primary/5 text-foreground',
          )}
        >
          <span className="block text-sm font-semibold">{complete.label}</span>
          <span className={cn(
            'block text-xs mt-0.5 leading-relaxed',
            value === complete.id ? 'text-primary-foreground' : 'text-muted',
          )}
          >
            {complete.hint}
          </span>
        </button>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          {specialized.map((option, index) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(option.id)}
                className={cn(
                  'text-left rounded-xl border px-3 py-2.5 min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  index === specialized.length - 1 && 'col-span-2 lg:col-span-1',
                  selected
                    ? 'border-primary-solid bg-primary-solid text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/40',
                )}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className={cn(
                  'block text-xs mt-0.5 leading-relaxed line-clamp-3',
                  selected ? 'text-primary-foreground' : 'text-muted',
                )}
                >
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      {note ? <p className="text-xs text-muted leading-relaxed">{note}</p> : null}
    </div>
  );
}

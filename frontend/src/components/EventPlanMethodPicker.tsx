'use client';

import React from 'react';
import { Check, ListChecks, MousePointerClick, Wand2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EventPlanMethodId = 'manual' | 'ai' | 'final';

const SIM_METHODS: Array<{
  id: Exclude<EventPlanMethodId, 'final'>;
  label: string;
  description: string;
  icon: typeof MousePointerClick;
}> = [
  {
    id: 'manual',
    label: 'Par critères, sans IA',
    description: 'Vous fixez le budget, la ville, la date et les prestataires. EventMaster calcule 3 packs budget dans l’enveloppe.',
    icon: MousePointerClick,
  },
  {
    id: 'ai',
    label: 'Assisté par l’IA',
    description: 'Vous décrivez l’événement. L’IA propose un mix salle, prestataires et matériel — un pack budget, pas un plan de salle.',
    icon: Wand2,
  },
];

const cardFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function EventPlanMethodPicker({
  value,
  onChange,
  counts,
  finalLocked = false,
}: {
  value: EventPlanMethodId;
  onChange: (next: EventPlanMethodId) => void;
  counts: { manual: number; ai: number; final: number };
  /** Désactive l’étape 2 tant qu’aucune simulation n’a produit de pack. */
  finalLocked?: boolean;
}) {
  const simReady = counts.manual > 0 || counts.ai > 0;

  return (
    <section className="space-y-4" aria-label="Choix de la méthode de simulation">
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">1. Composer le pack budget</h2>
        <p className="text-xs text-muted leading-relaxed max-w-2xl">
          Un pack budget assemble salle, prestataires et matériel pour les devis. Ce n’est pas le plan de salle 3D.
          Vous pouvez lancer les deux méthodes, puis retenir un mix.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SIM_METHODS.map((item) => {
            const Icon = item.icon;
            const selected = value === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange(item.id)}
                className={cn(
                  'text-left rounded-2xl border p-4 transition touch-manipulation cursor-pointer min-h-[7.5rem] flex flex-col gap-2',
                  cardFocus,
                  selected
                    ? 'border-primary bg-primary/8 shadow-[var(--shadow-soft)] ring-1 ring-primary/30'
                    : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted/50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    'w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
                  )}>
                    <Icon className="w-4 h-4" aria-hidden />
                  </span>
                  <span className="flex items-center gap-1.5">
                    {count > 0 ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/15 text-primary-solid">
                        {count} pack{count > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {selected ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-border bg-surface" aria-hidden />
                    )}
                  </span>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted leading-relaxed">{item.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3" aria-hidden>
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold text-muted">puis</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-foreground">2. Retenir le pack budget final</h2>
        <button
          type="button"
          onClick={() => onChange('final')}
          aria-pressed={value === 'final'}
          disabled={finalLocked && !simReady && counts.final === 0}
          className={cn(
            'w-full text-left rounded-2xl border p-4 transition touch-manipulation flex items-start gap-3',
            cardFocus,
            value === 'final'
              ? 'border-primary bg-primary/8 ring-1 ring-primary/25 shadow-[var(--shadow-soft)]'
              : 'border-border bg-surface hover:border-primary/35 hover:bg-primary/5',
            finalLocked && !simReady && counts.final === 0 && 'opacity-60 cursor-not-allowed hover:border-border hover:bg-surface',
          )}
        >
          <span className={cn(
            'w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0',
            value === 'final' ? 'bg-primary text-primary-foreground' : 'bg-surface-muted text-muted',
          )}>
            <ListChecks className="w-4 h-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">Pack budget final</span>
              {counts.final > 0 ? (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary/15 text-primary-solid">
                  Pack retenu
                </span>
              ) : null}
            </span>
            <span className="block text-xs text-muted leading-relaxed">
              {simReady || counts.final > 0
                ? 'Choisissez le pack budget utilisé pour les devis et les réservations — issu des critères, de l’IA, ou d’un mix. Le plan de salle se crée à part, dans Salles.'
                : 'Lancez d’abord une simulation (critères ou IA) pour retenir un pack budget.'}
            </span>
          </span>
          {value === 'final' ? (
            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3" strokeWidth={3} aria-hidden />
            </span>
          ) : (
            <span className="w-5 h-5 rounded-full border border-border bg-surface shrink-0 mt-0.5" aria-hidden />
          )}
        </button>
      </div>
    </section>
  );
}

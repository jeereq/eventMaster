'use client';

import React from 'react';
import { Check, ListChecks, MousePointerClick, Wand2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type EventPlanMethodId = 'manual' | 'ai' | 'final';

const SIM_METHODS: Array<{
  id: Exclude<EventPlanMethodId, 'final'>;
  label: string;
  kicker: string;
  description: string;
  icon: typeof MousePointerClick;
}> = [
  {
    id: 'manual',
    label: 'Par critères',
    kicker: 'Sans IA',
    description: 'Vous fixez le budget, la ville, la date et les métiers. EventMaster calcule 3 packs dans l’enveloppe.',
    icon: MousePointerClick,
  },
  {
    id: 'ai',
    label: 'Assisté par l’IA',
    kicker: 'Recommandation',
    description: 'Vous décrivez l’événement en quelques phrases. L’IA propose un mix salle, prestataires et locations.',
    icon: Wand2,
  },
];

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
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Étape 1</span>
          <h2 className="text-sm font-bold text-foreground">Comment simuler votre pack ?</h2>
        </div>
        <p className="text-xs text-muted leading-relaxed max-w-2xl">
          Choisissez une méthode. Vous pouvez en lancer les deux, puis retenir un mix dans la solution finale.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Méthode de simulation">
          {SIM_METHODS.map((item) => {
            const Icon = item.icon;
            const selected = value === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(item.id)}
                className={cn(
                  'text-left rounded-2xl border p-4 transition touch-manipulation cursor-pointer min-h-[7.5rem] flex flex-col gap-2',
                  selected
                    ? 'border-primary bg-primary/8 shadow-[var(--shadow-soft)] ring-1 ring-primary/30'
                    : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted/50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    'w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0',
                    selected ? 'bg-primary text-white' : 'bg-surface-muted text-muted',
                  )}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    {count > 0 ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/15 text-primary">
                        {count} pack{count > 1 ? 's' : ''}
                      </span>
                    ) : null}
                    {selected ? (
                      <span className="w-5 h-5 rounded-full bg-primary text-white inline-flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full border border-border bg-surface" aria-hidden />
                    )}
                  </span>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{item.kicker}</p>
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
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted">puis</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Étape 2</span>
          <h2 className="text-sm font-bold text-foreground">Retenir la solution finale</h2>
        </div>
        <button
          type="button"
          onClick={() => onChange('final')}
          disabled={finalLocked && !simReady && counts.final === 0}
          className={cn(
            'w-full text-left rounded-2xl border p-4 transition touch-manipulation flex items-start gap-3',
            value === 'final'
              ? 'border-emerald-500/50 bg-emerald-500/8 ring-1 ring-emerald-500/25 shadow-[var(--shadow-soft)]'
              : 'border-border bg-surface hover:border-emerald-500/35 hover:bg-emerald-500/5',
            finalLocked && !simReady && counts.final === 0 && 'opacity-60 cursor-not-allowed hover:border-border hover:bg-surface',
          )}
        >
          <span className={cn(
            'w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0',
            value === 'final' ? 'bg-emerald-600 text-white' : 'bg-surface-muted text-muted',
          )}>
            <ListChecks className="w-4 h-4" />
          </span>
          <span className="min-w-0 flex-1 space-y-0.5">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">Solution finale</span>
              {counts.final > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-600/15 text-emerald-700 dark:text-emerald-300">
                  Pack retenu
                </span>
              ) : null}
            </span>
            <span className="block text-xs text-muted leading-relaxed">
              {simReady || counts.final > 0
                ? 'Choisissez le pack que vous utiliserez pour les devis et les réservations — issu d’une simulation par critères, de l’IA, ou d’un mix des deux.'
                : 'Lancez d’abord une simulation (par critères ou avec l’IA) pour pouvoir retenir un pack.'}
            </span>
          </span>
          {value === 'final' ? (
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white inline-flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          ) : (
            <span className="w-5 h-5 rounded-full border border-border bg-surface shrink-0 mt-0.5" aria-hidden />
          )}
        </button>
      </div>
    </section>
  );
}

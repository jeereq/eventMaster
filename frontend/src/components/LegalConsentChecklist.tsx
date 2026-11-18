'use client';

import React from 'react';
import { Check, CheckCircle2, ChevronRight, Eye, Scale } from '@/components/icons';
import { cn } from '@/lib/cn';

export type LegalConsentItem = {
  id: 'terms' | 'privacy' | 'refund';
  /** Fin de la phrase « J’accepte … ». */
  label: string;
  version: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * Engagements à accepter (conditions, confidentialité, remboursement) : une liste
 * groupée, libellés complets sans troncature, compteur d’avancement et lecture du texte.
 */
export default function LegalConsentChecklist({
  items,
  onRead,
  onReadAll,
}: {
  items: LegalConsentItem[];
  onRead: (id: LegalConsentItem['id']) => void;
  onReadAll: () => void;
}) {
  const done = items.filter((it) => it.checked).length;
  const all = done === items.length;

  return (
    <div role="group" aria-labelledby="legal-consent-title" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p id="legal-consent-title" className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Scale className="h-4 w-4 text-primary" aria-hidden />
          Engagements
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              all ? 'bg-primary/15 text-primary' : 'bg-surface-muted text-muted',
            )}
            aria-label={`${done} sur ${items.length} acceptés`}
          >
            {done}/{items.length}
          </span>
        </p>
        {all ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Tout est accepté
          </span>
        ) : (
          <button
            type="button"
            onClick={onReadAll}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] px-2 text-xs font-bold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 touch-manipulation"
          >
            <Eye className="h-4 w-4" aria-hidden />
            Tout lire & accepter
          </button>
        )}
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        {items.map((it) => (
          <li key={it.id} className={cn('flex items-center gap-2 pl-3 pr-1.5 transition-colors', it.checked && 'bg-primary/5')}>
            <label className="flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 py-2">
              <input
                type="checkbox"
                checked={it.checked}
                onChange={(e) => it.onChange(e.target.checked)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface',
                  it.checked ? 'border-primary bg-primary-solid' : 'border-foreground/30 bg-background',
                )}
              >
                {it.checked ? <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} /> : null}
              </span>
              <span className="min-w-0 text-sm leading-snug text-foreground">
                J’accepte {it.label}
                <span className="ml-1.5 whitespace-nowrap text-xs text-muted">v{it.version}</span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => onRead(it.id)}
              aria-label={`${it.checked ? 'Relire' : 'Lire'} ${it.label}`}
              className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-[var(--radius-button)] px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 touch-manipulation"
            >
              {it.checked ? 'Relire' : 'Lire'}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

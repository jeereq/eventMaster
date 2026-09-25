'use client';

import React, { useRef } from 'react';
import { Check, Clock, Coins, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { aiTokenBalanceLabel, type AiAllowance } from '@/lib/aiTokens';

export type StudioAiTabId = 'create' | 'history' | 'prompts';

const TABS: Array<{
  id: StudioAiTabId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'create', label: 'Composer', icon: Wand2 },
  { id: 'history', label: 'Historique', icon: Clock },
  { id: 'prompts', label: 'Exemples', icon: Sparkles },
];

export function studioAiTabPanelId(prefix: string, tab: StudioAiTabId) {
  return `${prefix}-panel-${tab}`;
}

export function StudioAiTabs({
  value,
  onChange,
  historyCount = 0,
  disabled = false,
  className,
  idPrefix,
}: {
  value: StudioAiTabId;
  onChange: (id: StudioAiTabId) => void;
  historyCount?: number;
  disabled?: boolean;
  className?: string;
  idPrefix?: string;
}) {
  const tabRefs = useRef<Partial<Record<StudioAiTabId, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    const ids = TABS.map((tab) => tab.id);
    const current = Math.max(0, ids.indexOf(value));
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (current + 1) % ids.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (current - 1 + ids.length) % ids.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = ids.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    onChange(ids[next]);
    requestAnimationFrame(() => tabRefs.current[ids[next]]?.focus());
  };

  return (
    <div
      className={cn(
        'flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border',
        className,
      )}
      role="tablist"
      aria-label="Sections du studio"
      onKeyDown={handleKeyDown}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.id;
        const badge = tab.id === 'history' && historyCount > 0 ? historyCount : null;
        return (
          <button
            key={tab.id}
            type="button"
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            role="tab"
            aria-selected={selected}
            aria-controls={idPrefix ? studioAiTabPanelId(idPrefix, tab.id) : undefined}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            ref={(node) => {
              tabRefs.current[tab.id] = node;
            }}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 min-h-11 px-2 sm:px-3 rounded-[var(--radius-button)] text-xs font-semibold transition',
              'inline-flex items-center justify-center gap-1.5 touch-manipulation',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              selected
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-muted hover:text-foreground',
              disabled && 'opacity-60',
            )}
          >
            <Icon className={cn('w-3.5 h-3.5', selected ? 'text-primary-solid' : '')} aria-hidden />
            <span>{tab.label}</span>
            {badge != null ? (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums',
                  selected ? 'bg-primary/15 text-primary-solid' : 'bg-surface border border-border text-muted',
                )}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function StudioHowTo({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-col sm:flex-row sm:flex-wrap gap-1.5 sm:gap-x-4 sm:gap-y-1 text-xs text-muted leading-relaxed">
      {steps.map((step, index) => (
        <li key={step} className="inline-flex items-start gap-1.5 min-w-0">
          <span className="font-semibold text-foreground tabular-nums shrink-0">{index + 1}.</span>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function StudioAiEmpty({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-10 px-4 text-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface-muted/30 space-y-3">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <Icon className="w-5 h-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">{hint}</p>
      </div>
      {action}
    </div>
  );
}

/**
 * Étapes du studio (brief → génération → résultat) avec l’étape courante mise en avant.
 * `current` est l’index 0-based de l’étape en cours.
 */
export function StudioStepper({
  steps,
  current,
  className,
}: {
  steps: string[];
  current: number;
  className?: string;
}) {
  return (
    <ol className={cn('flex items-center gap-1.5 sm:gap-2 min-w-0', className)} aria-label="Étapes">
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li
            key={step}
            className="flex items-center gap-1.5 sm:gap-2 min-w-0"
            aria-current={active ? 'step' : undefined}
          >
            {index > 0 ? (
              <span
                aria-hidden
                className={cn('h-px w-3 sm:w-5 shrink-0', done || active ? 'bg-primary/50' : 'bg-border')}
              />
            ) : null}
            <span
              className={cn(
                'font-display w-6 h-6 rounded-full text-xs font-semibold inline-flex items-center justify-center shrink-0 transition-colors',
                done && 'bg-primary/15 text-primary-solid',
                active && 'bg-primary-solid text-primary-foreground',
                !done && !active && 'bg-surface-muted text-muted border border-border',
              )}
            >
              {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.6} aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'text-xs truncate',
                active ? 'font-semibold text-foreground' : 'text-muted',
                !active && 'max-sm:hidden',
              )}
            >
              {step}
              {done ? <span className="sr-only"> (terminé)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Pastille du solde de jetons IA, identique dans les trois studios. */
export function StudioTokenPill({
  allowance,
  className,
}: {
  allowance: Pick<AiAllowance, 'totalRemaining' | 'unlimited'>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-foreground px-3 py-1.5 rounded-full bg-surface-muted border border-border tabular-nums',
        className,
      )}
      title="Jetons IA disponibles"
    >
      <Coins className="w-3.5 h-3.5 text-primary-solid" aria-hidden />
      {allowance.unlimited
        ? 'Illimité'
        : `${aiTokenBalanceLabel(allowance)} jeton${allowance.totalRemaining === 1 ? '' : 's'}`}
    </span>
  );
}

/**
 * Barre haute d’un studio ouvert : étapes à gauche, solde et actions à droite.
 * `sticky` la garde visible en haut d’une modale ; à désactiver quand le studio est posé dans la page.
 */
export function StudioToolbar({
  steps,
  current,
  allowance,
  sticky = true,
  children,
}: {
  steps: string[];
  current: number;
  allowance: Pick<AiAllowance, 'totalRemaining' | 'unlimited'>;
  sticky?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'px-4 sm:px-6 py-3 border-b border-border bg-surface flex flex-wrap items-center justify-between gap-2',
        sticky && 'sticky top-0 z-20',
      )}
    >
      <StudioStepper steps={steps} current={current} />
      <div className="flex items-center gap-2 shrink-0">
        <StudioTokenPill allowance={allowance} />
        {children}
      </div>
    </div>
  );
}

/**
 * Barre d’action collée en bas de la colonne de saisie.
 * Posée dans la page (`inline`), elle se cale au-dessus de la barre de navigation mobile.
 */
export function studioActionBarClass(inline: boolean) {
  return cn(
    'sticky z-30 mt-auto -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-t border-border',
    'bg-surface shadow-[0_-10px_28px_-16px_rgba(0,0,0,0.2)]',
    inline
      ? 'bottom-[calc(var(--em-site-bottom-nav)+var(--em-site-install-bar))] md:bottom-0'
      : 'bottom-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
  );
}

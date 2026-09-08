'use client';

import React, { useRef } from 'react';
import { Clock, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StudioAiTabId = 'create' | 'history' | 'prompts';

const TABS: Array<{
  id: StudioAiTabId;
  label: string;
  icon: LucideIcon;
}> = [
  { id: 'create', label: 'Création', icon: Wand2 },
  { id: 'history', label: 'Historique', icon: Clock },
  { id: 'prompts', label: 'Prompts', icon: Sparkles },
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
            <Icon className={cn('w-3.5 h-3.5', selected ? 'text-primary' : '')} aria-hidden />
            <span>{tab.label}</span>
            {badge != null ? (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold tabular-nums',
                  selected ? 'bg-primary/15 text-primary' : 'bg-surface border border-border text-muted',
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
    <div className="py-10 px-4 text-center rounded-xl border border-dashed border-border bg-surface-muted/30 space-y-3">
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

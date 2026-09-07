'use client';

import React from 'react';
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

export function StudioAiTabs({
  value,
  onChange,
  historyCount = 0,
  disabled = false,
  className,
}: {
  value: StudioAiTabId;
  onChange: (id: StudioAiTabId) => void;
  historyCount?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border',
        className,
      )}
      role="tablist"
      aria-label="Sections du studio"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.id;
        const badge = tab.id === 'history' && historyCount > 0 ? historyCount : null;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={disabled}
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
                  'px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums',
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

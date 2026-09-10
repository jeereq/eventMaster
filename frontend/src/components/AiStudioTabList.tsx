'use client';

import React from 'react';
import { Building2, Mail, Wand2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AiStudioId = 'budget' | 'invite' | 'room';

export const AI_STUDIO_TABS: Array<{
  id: AiStudioId;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { id: 'budget', label: 'Budget', hint: '3 formules dans l’enveloppe', icon: Wand2 },
  { id: 'invite', label: 'Invitation', hint: 'Carte 9:16 éditable', icon: Mail },
  { id: 'room', label: 'Plan de salle', hint: 'Brief ou photo → 2D / 3D', icon: Building2 },
];

export function aiStudioTabId(prefix: string, id: AiStudioId) {
  return `${prefix}-${id}`;
}

export function aiStudioPanelId(prefix: string, id: AiStudioId) {
  return `${prefix}-panel-${id}`;
}

export default function AiStudioTabList({
  value,
  onChange,
  tabs = AI_STUDIO_TABS,
  idPrefix,
  className,
}: {
  value: AiStudioId;
  onChange: (id: AiStudioId) => void;
  tabs?: typeof AI_STUDIO_TABS;
  idPrefix: string;
  className?: string;
}) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const ids = tabs.map((tab) => tab.id);
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
    requestAnimationFrame(() => document.getElementById(aiStudioTabId(idPrefix, ids[next]))?.focus());
  };

  return (
    <div
      role="tablist"
      aria-label="Studios IA"
      className={cn(
        'flex flex-col sm:flex-row gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border',
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            id={aiStudioTabId(idPrefix, tab.id)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={aiStudioPanelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 min-h-11 px-3 py-2 rounded-[var(--radius-button)] text-left transition touch-manipulation',
              'inline-flex items-center gap-2.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              selected
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)] ring-1 ring-primary/30'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Icon className={cn('w-4 h-4 shrink-0', selected ? 'text-primary-solid' : '')} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold">{tab.label}</span>
              <span className="block text-xs text-muted truncate">{tab.hint}</span>
            </span>
            {selected ? (
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Actif
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

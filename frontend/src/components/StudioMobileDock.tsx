'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type StudioMobilePane = string;

export function StudioMobileDock<T extends string>({
  panes,
  value,
  onChange,
  className,
}: {
  panes: Array<{ id: T; label: string; icon: LucideIcon; hint?: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        'border-t border-border bg-surface/95 backdrop-blur-md',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
      aria-label="Navigation du studio"
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${panes.length}, minmax(0, 1fr))` }}>
        {panes.map((pane) => {
          const Icon = pane.icon;
          const selected = value === pane.id;
          return (
            <button
              key={pane.id}
              type="button"
              aria-current={selected ? 'page' : undefined}
              aria-label={pane.hint || pane.label}
              onClick={() => onChange(pane.id)}
              className={cn(
                'min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                selected ? 'text-primary' : 'text-muted',
              )}
            >
              <Icon className="w-5 h-5" aria-hidden />
              {pane.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

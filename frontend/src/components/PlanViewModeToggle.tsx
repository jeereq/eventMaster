'use client';

import React from 'react';
import { Box, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function PlanViewModeToggle({
  force2d,
  onChange,
  className,
}: {
  force2d: boolean;
  onChange: (force2d: boolean) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Mode d’affichage du plan"
      className={cn(
        'inline-flex items-center rounded-[var(--radius-button)] border border-border bg-surface-muted p-1',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!force2d}
        className={cn(
          'min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center gap-1.5 touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          !force2d ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted hover:text-foreground',
        )}
      >
        <Box className="w-3.5 h-3.5" aria-hidden />
        Vue 3D
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        aria-pressed={force2d}
        className={cn(
          'min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center gap-1.5 touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          force2d ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]' : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        Plan 2D
      </button>
    </div>
  );
}

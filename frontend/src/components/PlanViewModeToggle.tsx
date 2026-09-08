'use client';

import React from 'react';
import { Box, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function PlanViewModeToggle({
  force2d,
  onChange,
  tone = 'default',
  className,
}: {
  force2d: boolean;
  onChange: (force2d: boolean) => void;
  tone?: 'default' | 'stage';
  className?: string;
}) {
  const onStage = tone === 'stage';

  return (
    <div
      role="group"
      aria-label="Mode d’affichage du plan"
      className={cn(
        'inline-flex items-center rounded-[var(--radius-button)] p-1',
        onStage
          ? 'border border-stage-foreground/20 bg-stage-elevated'
          : 'border border-border bg-surface-muted',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        aria-pressed={!force2d}
        className={cn(
          'min-h-11 px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center gap-1.5 touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2',
          onStage ? 'focus-visible:ring-festive-on-stage/50' : 'focus-visible:ring-primary/50',
          !force2d
            ? onStage
              ? 'bg-stage text-stage-foreground shadow-[var(--shadow-soft)]'
              : 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
            : onStage
              ? 'text-stage-foreground/70 hover:text-stage-foreground'
              : 'text-muted hover:text-foreground',
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
          'focus-visible:outline-none focus-visible:ring-2',
          onStage ? 'focus-visible:ring-festive-on-stage/50' : 'focus-visible:ring-primary/50',
          force2d
            ? onStage
              ? 'bg-stage text-stage-foreground shadow-[var(--shadow-soft)]'
              : 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
            : onStage
              ? 'text-stage-foreground/70 hover:text-stage-foreground'
              : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="w-3.5 h-3.5" aria-hidden />
        Plan 2D
      </button>
    </div>
  );
}

'use client';

import React from 'react';
import { Box, LayoutGrid, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/cn';

export type PlanViewMode = '2d' | '3d';

export function PlanViewToggle({
  value,
  onChange,
  disabled3d = false,
  className,
}: {
  value: PlanViewMode;
  onChange: (next: PlanViewMode) => void;
  disabled3d?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-1 rounded-[var(--radius-button)] border border-border bg-surface p-0.5 shadow-sm',
        className,
      )}
      role="group"
      aria-label="Vue du plan de table"
    >
      <button
        type="button"
        onClick={() => onChange('2d')}
        className={cn(
          'inline-flex items-center gap-1 min-h-9 px-2.5 rounded-[var(--radius-button)] text-[10px] font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          value === '2d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="w-3 h-3" />
        2D
      </button>
      <button
        type="button"
        onClick={() => onChange('3d')}
        disabled={disabled3d}
        className={cn(
          'inline-flex items-center gap-1 min-h-9 px-2.5 rounded-[var(--radius-button)] text-[10px] font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          disabled3d && 'opacity-40 cursor-not-allowed',
          !disabled3d && (value === '3d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground'),
        )}
      >
        <Box className="w-3 h-3" />
        3D
      </button>
    </div>
  );
}

export function PlanZoomControls({
  zoom,
  onZoomOut,
  onZoomIn,
  onReset,
  className,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  className?: string;
}) {
  const btn =
    'p-2 sm:p-1.5 min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-[34px] flex items-center justify-center rounded-[var(--radius-button)] border border-border text-muted hover:text-foreground hover:bg-surface-muted transition active:scale-95 touch-manipulation cursor-pointer';

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button type="button" onClick={onZoomOut} className={btn} aria-label="Zoom arrière" title="Zoom arrière">
        <ZoomOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
      <span className="text-[11px] text-muted font-mono w-10 text-center select-none tabular-nums">
        {Math.round(zoom * 100)}%
      </span>
      <button type="button" onClick={onZoomIn} className={btn} aria-label="Zoom avant" title="Zoom avant">
        <ZoomIn className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
      <button type="button" onClick={onReset} className={btn} aria-label="Recentrer le plan" title="Recentrer le plan">
        <RotateCcw className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
      </button>
    </div>
  );
}

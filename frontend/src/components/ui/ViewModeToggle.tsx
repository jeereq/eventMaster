'use client';

import React, { useEffect, useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ViewMode = 'grid' | 'list';

interface ViewModeToggleProps {
  /** Clé localStorage, ex. em-view-events */
  storageKey: string;
  value?: ViewMode;
  onChange?: (mode: ViewMode) => void;
  className?: string;
  /** Défaut Asana : grille */
  defaultMode?: ViewMode;
}

function readStored(key: string, fallback: ViewMode): ViewMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'grid' || raw === 'list') return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function useViewMode(storageKey: string, defaultMode: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(readStored(storageKey, defaultMode));
    setReady(true);
  }, [storageKey, defaultMode]);

  const setViewMode = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  };

  return { mode: ready ? mode : defaultMode, setViewMode, ready };
}

export function ViewModeToggle({
  storageKey,
  value,
  onChange,
  className,
  defaultMode = 'grid',
}: ViewModeToggleProps) {
  const internal = useViewMode(storageKey, defaultMode);
  const mode = value ?? internal.mode;
  const setMode = onChange ?? internal.setViewMode;

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-surface-muted p-0.5',
        className,
      )}
      role="group"
      aria-label="Mode d'affichage"
    >
      <button
        type="button"
        onClick={() => setMode('grid')}
        aria-pressed={mode === 'grid'}
        title="Vue grille"
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition-colors',
          mode === 'grid'
            ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
            : 'text-muted hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="ml-1.5 hidden text-xs font-semibold sm:inline">Grille</span>
      </button>
      <button
        type="button"
        onClick={() => setMode('list')}
        aria-pressed={mode === 'list'}
        title="Vue liste"
        className={cn(
          'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 transition-colors',
          mode === 'list'
            ? 'bg-surface text-foreground shadow-sm ring-1 ring-border'
            : 'text-muted hover:text-foreground',
        )}
      >
        <List className="h-4 w-4" />
        <span className="ml-1.5 hidden text-xs font-semibold sm:inline">Liste</span>
      </button>
    </div>
  );
}

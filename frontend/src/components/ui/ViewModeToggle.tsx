'use client';

import React, { useEffect, useState } from 'react';
import { Columns2, Columns3, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ViewMode = 'grid' | 'list';
export type GridColumns = 2 | 3 | 4;

interface ViewModeToggleProps {
  /** Clé localStorage, ex. em-view-events */
  storageKey: string;
  value?: ViewMode;
  onChange?: (mode: ViewMode) => void;
  columns?: GridColumns;
  onColumnsChange?: (cols: GridColumns) => void;
  className?: string;
  /** Défaut Asana : grille */
  defaultMode?: ViewMode;
  defaultColumns?: GridColumns;
  /** Afficher le sélecteur de colonnes (uniquement utile en grille) */
  showColumnPicker?: boolean;
}

function readStoredMode(key: string, fallback: ViewMode): ViewMode {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === 'grid' || raw === 'list') return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

function readStoredColumns(key: string, fallback: GridColumns): GridColumns {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(`${key}-cols`);
    const n = Number(raw);
    if (n === 2 || n === 3 || n === 4) return n;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function gridColsClass(columns: GridColumns): string {
  switch (columns) {
    case 2:
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5';
    case 4:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';
    case 3:
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  }
}

/** Empilement des lignes liste (style activité récente). */
export const listStackClass = 'em-list-stack';

export function useViewMode(
  storageKey: string,
  defaultMode: ViewMode = 'grid',
  defaultColumns: GridColumns = 3,
) {
  const [mode, setMode] = useState<ViewMode>(defaultMode);
  const [columns, setColumns] = useState<GridColumns>(defaultColumns);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setMode(readStoredMode(storageKey, defaultMode));
    setColumns(readStoredColumns(storageKey, defaultColumns));
    setReady(true);
  }, [storageKey, defaultMode, defaultColumns]);

  const setViewMode = (next: ViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  };

  const setGridColumns = (next: GridColumns) => {
    setColumns(next);
    try {
      localStorage.setItem(`${storageKey}-cols`, String(next));
    } catch {
      /* ignore */
    }
  };

  return {
    mode: ready ? mode : defaultMode,
    columns: ready ? columns : defaultColumns,
    setViewMode,
    setGridColumns,
    ready,
    gridClassName: gridColsClass(ready ? columns : defaultColumns),
  };
}

const COLUMN_OPTIONS: Array<{ value: GridColumns; label: string; icon: typeof LayoutGrid }> = [
  { value: 2, label: '2 colonnes', icon: Columns2 },
  { value: 3, label: '3 colonnes', icon: Columns3 },
  { value: 4, label: '4 colonnes', icon: LayoutGrid },
];

export function ViewModeToggle({
  storageKey,
  value,
  onChange,
  columns: columnsProp,
  onColumnsChange,
  className,
  defaultMode = 'grid',
  defaultColumns = 3,
  showColumnPicker = true,
}: ViewModeToggleProps) {
  const internal = useViewMode(storageKey, defaultMode, defaultColumns);
  const mode = value ?? internal.mode;
  const setMode = onChange ?? internal.setViewMode;
  const columns = columnsProp ?? internal.columns;
  const setColumns = onColumnsChange ?? internal.setGridColumns;

  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
      <div
        className="inline-flex items-center rounded-lg border border-border bg-surface-muted p-0.5"
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
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground',
          )}
        >
          <List className="h-4 w-4" />
          <span className="ml-1.5 hidden text-xs font-semibold sm:inline">Liste</span>
        </button>
      </div>

      {showColumnPicker && mode === 'grid' && (
        <div
          className="inline-flex items-center rounded-lg border border-border bg-surface-muted p-0.5"
          role="group"
          aria-label="Nombre de colonnes"
        >
          {COLUMN_OPTIONS.map(({ value: cols, label, icon: Icon }) => (
            <button
              key={cols}
              type="button"
              onClick={() => setColumns(cols)}
              aria-pressed={columns === cols}
              title={label}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-2 py-1.5 transition-colors',
                columns === cols
                  ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="ml-1 hidden text-[10px] font-bold tabular-nums lg:inline">{cols}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

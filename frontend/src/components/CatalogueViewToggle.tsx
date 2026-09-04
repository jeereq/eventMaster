'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, List, Map, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import useIsMobile from '@/hooks/useIsMobile';
import type { CatalogueViewMode } from '@/lib/marketplace';

const STORAGE_KEY = 'em-catalogue-view';
const COLS_KEY = 'em-catalogue-grid-cols';
const VIEW_MODES: CatalogueViewMode[] = ['grid', 'list', 'map', 'focus'];

function parseViewParam(value: string | null): CatalogueViewMode | null {
  return value && VIEW_MODES.includes(value as CatalogueViewMode) ? (value as CatalogueViewMode) : null;
}

export type CatalogueGridCols = 2 | 3 | 4 | 5;

export function useCatalogueGridCols(defaultCols: CatalogueGridCols = 4) {
  const [gridCols, setGridColsState] = useState<CatalogueGridCols>(defaultCols);

  useEffect(() => {
    try {
      const cols = Number(localStorage.getItem(COLS_KEY));
      if (cols === 2 || cols === 3 || cols === 4 || cols === 5) setGridColsState(cols);
    } catch {
      /* ignore */
    }
  }, []);

  const setGridCols = (next: CatalogueGridCols) => {
    setGridColsState(next);
    try {
      localStorage.setItem(COLS_KEY, String(next));
    } catch {
      /* ignore */
    }
  };

  return { gridCols, setGridCols };
}

export function useCatalogueView(defaultMode: CatalogueViewMode = 'grid') {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const urlView = parseViewParam(searchParams.get('view'));
  const [mode, setMode] = useState<CatalogueViewMode>(urlView || defaultMode);
  const { gridCols, setGridCols } = useCatalogueGridCols();

  useEffect(() => {
    if (urlView) {
      setMode(urlView);
      try {
        localStorage.setItem(STORAGE_KEY, urlView);
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list' || stored === 'map' || stored === 'focus') {
        setMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, [urlView]);

  const setView = (next: CatalogueViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'grid') params.delete('view');
    else params.set('view', next);
    const qs = params.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    const current = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (href === current) return;
    router.replace(href, { scroll: false });
  };

  return { mode: isMobile ? 'grid' : mode, setView, gridCols, setGridCols };
}

export function CatalogueGridColsToggle({
  value,
  onChange,
  className,
  options = [2, 3, 4],
}: {
  value: CatalogueGridCols;
  onChange: (cols: CatalogueGridCols) => void;
  className?: string;
  options?: CatalogueGridCols[];
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[var(--radius-button)] border border-border bg-surface-muted p-0.5',
        className,
      )}
      role="group"
      aria-label="Nombre de colonnes"
    >
      {options.map((cols) => (
        <button
          key={cols}
          type="button"
          onClick={() => onChange(cols)}
          aria-pressed={value === cols}
          title={`${cols} colonnes`}
          className={cn(
            'min-w-8 px-2 py-1.5 rounded-[var(--radius-button)] text-[11px] font-semibold transition',
            value === cols
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground',
          )}
        >
          {cols}
        </button>
      ))}
    </div>
  );
}

export default function CatalogueViewToggle({
  value,
  onChange,
  className,
  compact = false,
  hideMap = false,
}: {
  value: CatalogueViewMode;
  onChange: (mode: CatalogueViewMode) => void;
  className?: string;
  compact?: boolean;
  hideMap?: boolean;
}) {
  const options: Array<{ id: CatalogueViewMode; label: string; icon: typeof LayoutGrid }> = hideMap
    ? [
        { id: 'grid', label: 'Grille', icon: LayoutGrid },
        { id: 'list', label: 'Liste', icon: List },
      ]
    : [
        { id: 'grid', label: 'Grille', icon: LayoutGrid },
        { id: 'list', label: 'Liste', icon: List },
        { id: 'map', label: 'Carte', icon: Map },
        { id: 'focus', label: 'Focus', icon: Maximize2 },
      ];

  return (
    <div
      className={cn(
        'hidden md:flex items-center rounded-[var(--radius-button)] border border-border bg-surface-muted p-0.5',
        className,
      )}
      role="group"
      aria-label="Mode d’affichage du marketplace"
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          title={`Vue ${label.toLowerCase()}`}
          className={cn(
            'inline-flex flex-1 sm:flex-none min-h-11 items-center justify-center rounded-[var(--radius-button)] px-2.5 py-1.5 transition-colors',
            id === 'focus' && 'hidden md:inline-flex',
            value === id
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          <span className={cn('ml-1 text-xs font-semibold', !compact && 'hidden lg:inline')}>{label}</span>
        </button>
      ))}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { LayoutGrid, List, Map, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { CatalogueViewMode } from '@/lib/marketplace';

const STORAGE_KEY = 'em-catalogue-view';

export function useCatalogueView(defaultMode: CatalogueViewMode = 'grid') {
  const [mode, setMode] = useState<CatalogueViewMode>(defaultMode);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'grid' || stored === 'list' || stored === 'map' || stored === 'focus') {
        setMode(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setView = (next: CatalogueViewMode) => {
    setMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return { mode, setView };
}

export default function CatalogueViewToggle({
  value,
  onChange,
  className,
}: {
  value: CatalogueViewMode;
  onChange: (mode: CatalogueViewMode) => void;
  className?: string;
}) {
  const options: Array<{ id: CatalogueViewMode; label: string; icon: typeof LayoutGrid }> = [
    { id: 'grid', label: 'Grille', icon: LayoutGrid },
    { id: 'list', label: 'Liste', icon: List },
    { id: 'map', label: 'Carte', icon: Map },
    { id: 'focus', label: 'Focus', icon: Maximize2 },
  ];

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border bg-surface-muted p-0.5',
        className,
      )}
      role="group"
      aria-label="Mode d’affichage du catalogue"
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          title={`Vue ${label.toLowerCase()}`}
          className={cn(
            'inline-flex flex-1 sm:flex-none items-center justify-center rounded-full px-2.5 py-1.5 transition-colors',
            value === id
              ? 'bg-surface text-primary shadow-sm ring-1 ring-border'
              : 'text-muted hover:text-foreground',
          )}
        >
          <Icon className="h-4 w-4" />
          <span className="ml-1 hidden text-xs font-semibold lg:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

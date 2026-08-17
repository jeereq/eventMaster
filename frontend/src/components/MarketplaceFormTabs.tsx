'use client';

import React from 'react';
import { cn } from '@/lib/cn';

export type MarketplaceFormTab = 'details' | 'map' | 'medias';

const TABS: Array<{ id: MarketplaceFormTab; label: string }> = [
  { id: 'details', label: 'Détails' },
  { id: 'map', label: 'Carte' },
  { id: 'medias', label: 'Médias' },
];

export default function MarketplaceFormTabs({
  value,
  onChange,
}: {
  value: MarketplaceFormTab;
  onChange: (next: MarketplaceFormTab) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-surface-muted border border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition',
            value === tab.id
              ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
              : 'text-muted hover:text-foreground',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { Images, Map, AlignLeft } from 'lucide-react';

export type MarketplaceFormTab = 'details' | 'map' | 'medias';

const TABS: Array<{ id: MarketplaceFormTab; label: string; icon: React.ReactNode }> = [
  { id: 'details', label: 'Détails', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { id: 'map', label: 'Carte', icon: <Map className="w-3.5 h-3.5" /> },
  { id: 'medias', label: 'Médias', icon: <Images className="w-3.5 h-3.5" /> },
];

export default function MarketplaceFormTabs({
  value,
  onChange,
}: {
  value: MarketplaceFormTab;
  onChange: (next: MarketplaceFormTab) => void;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 min-h-9 sm:min-h-11 px-2 sm:px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center justify-center gap-1.5',
            value === tab.id
              ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
              : 'text-muted hover:text-foreground',
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

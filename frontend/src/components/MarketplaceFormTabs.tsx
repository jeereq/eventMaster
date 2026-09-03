'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { Images, Map, AlignLeft, Rss } from 'lucide-react';

export type MarketplaceFormTab = 'details' | 'map' | 'medias' | 'activity';

const TABS: Array<{ id: MarketplaceFormTab; label: string; icon: React.ReactNode }> = [
  { id: 'details', label: 'Détails', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { id: 'map', label: 'Carte', icon: <Map className="w-3.5 h-3.5" /> },
  { id: 'medias', label: 'Médias', icon: <Images className="w-3.5 h-3.5" /> },
  { id: 'activity', label: 'Publications', icon: <Rss className="w-3.5 h-3.5" /> },
];

export default function MarketplaceFormTabs({
  value,
  onChange,
  include,
  icons = true,
  badges,
}: {
  value: MarketplaceFormTab;
  onChange: (next: MarketplaceFormTab) => void;
  include?: MarketplaceFormTab[];
  icons?: boolean;
  badges?: Partial<Record<MarketplaceFormTab, number | string>>;
}) {
  const tabs = include ? TABS.filter((tab) => include.includes(tab.id)) : TABS;
  return (
    <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border" role="tablist" aria-label="Sections de la fiche">
      {tabs.map((tab) => {
        const badge = badges?.[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={value === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 min-h-11 px-2 sm:px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center justify-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              value === tab.id
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-muted hover:text-foreground',
            )}
          >
            {icons ? tab.icon : null}
            <span>{tab.label}</span>
            {badge != null && Number(badge) > 0 ? (
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px] font-bold tabular-nums',
                  value === tab.id
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface-muted text-muted',
                )}
              >
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

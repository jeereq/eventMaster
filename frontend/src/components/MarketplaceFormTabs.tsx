'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/cn';
import { Images, Map, AlignLeft, Rss, Sparkles, Building2 } from 'lucide-react';

export type MarketplaceFormTab = 'details' | 'services' | 'venues' | 'activity' | 'map' | 'medias';

const TABS: Array<{ id: MarketplaceFormTab; label: string; icon: React.ReactNode }> = [
  { id: 'details', label: 'Détails', icon: <AlignLeft className="w-3.5 h-3.5" /> },
  { id: 'services', label: 'Prestations', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'venues', label: 'Salles', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: 'activity', label: 'Réalisations', icon: <Rss className="w-3.5 h-3.5" /> },
  { id: 'map', label: 'Carte', icon: <Map className="w-3.5 h-3.5" /> },
  { id: 'medias', label: 'Médias', icon: <Images className="w-3.5 h-3.5" /> },
];

export function listingTabPanelId(tab: MarketplaceFormTab) {
  return `listing-panel-${tab}`;
}

export default function MarketplaceFormTabs({
  value,
  onChange,
  include,
  icons = true,
  badges,
  labels,
  labelledPanels = false,
}: {
  value: MarketplaceFormTab;
  onChange: (next: MarketplaceFormTab) => void;
  include?: MarketplaceFormTab[];
  icons?: boolean;
  badges?: Partial<Record<MarketplaceFormTab, number | string>>;
  labels?: Partial<Record<MarketplaceFormTab, string>>;
  labelledPanels?: boolean;
}) {
  const tabs = include ? TABS.filter((tab) => include.includes(tab.id)) : TABS;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (index: number) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    const nextIndex = tabs.findIndex((tab) => tab.id === next.id);
    tabRefs.current[nextIndex]?.focus();
    onChange(next.id);
  };

  return (
    <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border" role="tablist" aria-label="Sections de la fiche">
      {tabs.map((tab, index) => {
        const badge = badges?.[tab.id];
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={labelledPanels ? `listing-tab-${tab.id}` : undefined}
            aria-selected={selected}
            aria-controls={labelledPanels ? listingTabPanelId(tab.id) : undefined}
            tabIndex={selected ? 0 : -1}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                moveFocus(index + 1);
              } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                moveFocus(index - 1);
              } else if (event.key === 'Home') {
                event.preventDefault();
                moveFocus(0);
              } else if (event.key === 'End') {
                event.preventDefault();
                moveFocus(tabs.length - 1);
              }
            }}
            className={cn(
              'flex-1 min-h-11 px-2 sm:px-3 rounded-[var(--radius-button)] text-xs font-semibold transition inline-flex items-center justify-center gap-1.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              selected
                ? 'bg-surface text-foreground shadow-[var(--shadow-soft)]'
                : 'text-muted hover:text-foreground',
            )}
          >
            {icons ? tab.icon : null}
            <span>{labels?.[tab.id] || tab.label}</span>
            {badge != null && Number(badge) > 0 ? (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums',
                  selected
                    ? 'bg-primary/15 text-primary'
                    : 'bg-surface text-muted',
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

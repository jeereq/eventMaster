'use client';

import React from 'react';
import { ChevronDown, type LucideIcon } from '@/components/icons';
import OverflowMenu from '@/components/ui/OverflowMenu';
import { cn } from '@/lib/cn';

export interface TabsMoreItem<T extends string = string> {
  id: T;
  label: string;
  /** Libellé affiché sous `sm` dans le bouton quand l’onglet actif est rangé ici. */
  shortLabel?: string;
  icon?: LucideIcon;
  badge?: string | number | null;
}

/** Vrai pour un compteur strictement positif (« 3 », 3) ; faux pour un nom de forfait ou « 0 ». */
function isNonZeroCount(badge: TabsMoreItem['badge']): boolean {
  if (typeof badge === 'number') return badge > 0;
  if (typeof badge !== 'string') return false;
  return /^\d+$/.test(badge.trim()) && Number(badge) > 0;
}

/**
 * Bouton « Plus » d’une rangée d’onglets : les onglets au-delà des premiers y sont rangés.
 * Quand l’onglet actif en fait partie, le bouton prend son libellé et l’aspect actif ;
 * le libellé porte `activeLabelId` pour que le panneau (aria-labelledby) garde son nom.
 * Une pastille signale un compteur non nul parmi les onglets rangés.
 */
export default function TabsMoreMenu<T extends string>({
  items,
  activeId,
  onSelect,
  baseClassName,
  activeClassName,
  inactiveClassName,
  activeLabelId,
  align = 'right',
}: {
  items: TabsMoreItem<T>[];
  activeId: T;
  onSelect: (id: T) => void;
  baseClassName: string;
  activeClassName: string;
  inactiveClassName: string;
  /** Identifiant posé sur le libellé de l’onglet actif quand il est rangé ici. */
  activeLabelId?: (id: T) => string;
  align?: 'left' | 'right';
}) {
  if (items.length === 0) return null;
  const active = items.find((item) => item.id === activeId);
  const hasCount = items.some((item) => item.id !== activeId && isNonZeroCount(item.badge));
  const ActiveIcon = active?.icon;

  return (
    <OverflowMenu
      align={align}
      menuWidth={272}
      triggerClassName={cn(baseClassName, active ? activeClassName : inactiveClassName)}
      trigger={
        <>
          {active ? (
            <>
              {ActiveIcon ? <ActiveIcon className="w-4 h-4 shrink-0" aria-hidden /> : null}
              <span id={activeLabelId?.(active.id)} className="min-w-0 truncate">
                {active.shortLabel ? (
                  <>
                    <span className="hidden sm:inline">{active.label}</span>
                    <span className="sm:hidden">{active.shortLabel}</span>
                  </>
                ) : (
                  active.label
                )}
              </span>
            </>
          ) : (
            'Plus'
          )}
          <ChevronDown className="w-3.5 h-3.5 shrink-0" aria-hidden />
          {hasCount ? <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden /> : null}
        </>
      }
      items={items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        badge: item.badge ?? undefined,
        onSelect: () => onSelect(item.id),
      }))}
    />
  );
}

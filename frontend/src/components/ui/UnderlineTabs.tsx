'use client';

import React from 'react';
import type { LucideIcon } from '@/components/icons';
import { cn } from '@/lib/cn';

export interface UnderlineTab<T extends string = string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Compteur affiché après le libellé (masqué à 0 ou si absent). */
  count?: number | null;
}

/**
 * Onglets soulignés d’une page de liste, avec l’action principale à droite de la même ligne.
 * Même présentation sur Événements, Billetterie et Modèles.
 */
export default function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel = 'Sections',
  idPrefix,
  action,
  className,
}: {
  tabs: Array<UnderlineTab<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
  /** Préfixe des identifiants des boutons (`${idPrefix}-${id}`), pour les panneaux qui s’y réfèrent. */
  idPrefix?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3 border-b border-border', className)}>
      <nav className="flex min-w-0 flex-wrap items-center" aria-label={ariaLabel}>
        {tabs.map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            id={idPrefix ? `${idPrefix}-${id}` : undefined}
            type="button"
            onClick={() => onChange(id)}
            aria-current={value === id ? 'page' : undefined}
            className={cn(
              'relative inline-flex min-h-12 items-center gap-2 px-4 text-sm transition-colors touch-manipulation whitespace-nowrap',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              value === id
                ? 'font-semibold text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-[3px] after:rounded-t-full after:bg-primary'
                : 'font-medium text-muted hover:text-foreground',
            )}
          >
            {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
            {label}
            {count ? <span className="text-xs font-medium tabular-nums text-muted">{count}</span> : null}
          </button>
        ))}
      </nav>
      {action ? <div className="mb-1.5 flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

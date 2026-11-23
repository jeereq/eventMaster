'use client';

import React, { forwardRef } from 'react';
import type { LucideIcon } from '@/components/icons';
import Tooltip, { type TooltipSide } from './Tooltip';
import Kbd, { ariaKeyShortcuts, type KbdKey } from './Kbd';
import { cn } from '@/lib/cn';

type IconButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  /** Verbe d'abord (« Dupliquer la sélection ») : nom accessible et texte de l'infobulle. */
  label: string;
  icon: LucideIcon;
  /** Raccourci affiché dans l'infobulle, ex. ['Mod', 'D']. */
  shortcut?: KbdKey[];
  tooltipSide?: TooltipSide;
  /** Bouton bascule ou mode actif : fond plein d'accent. */
  active?: boolean;
  /** Action destructive : icône en rose. */
  tone?: 'default' | 'danger';
};

/**
 * Bouton icône carré (44 × 44) avec une vraie infobulle au survol et au focus clavier.
 * Ne pas utiliser `title` : l'infobulle porte le libellé et le raccourci.
 */
const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon: Icon, shortcut, tooltipSide = 'top', active = false, tone = 'default', className, type, ...rest },
  ref,
) {
  return (
    <Tooltip
      side={tooltipSide}
      content={
        <span className="inline-flex items-center gap-2 whitespace-nowrap">
          {label}
          {shortcut?.length ? <Kbd keys={shortcut} /> : null}
        </span>
      }
    >
      <button
        ref={ref}
        type={type ?? 'button'}
        aria-label={label}
        aria-keyshortcuts={shortcut?.length ? ariaKeyShortcuts(shortcut) : undefined}
        data-toolbar-item=""
        className={cn(
          // 44 × 44 px (cible tactile minimale) : la racine du site est à 15px, `h-11` ne ferait que 41px.
          'inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-button)] transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:pointer-events-none disabled:opacity-50',
          active
            ? 'bg-primary-solid text-primary-foreground'
            : tone === 'danger'
              ? 'text-danger hover:bg-danger/10'
              : 'text-foreground hover:bg-surface-muted',
          className,
        )}
        {...rest}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </button>
    </Tooltip>
  );
});

export default IconButton;

'use client';

import { BrandLogoIcon } from '@/components/SiteBrandMark';
import { cn } from '@/lib/cn';

/**
 * Chargement d’un simulateur ou d’un éditeur (budget, invitation, plan de salle 2D / 3D)
 * pendant que son code se télécharge : logo, une ligne de titre, une ligne d’explication
 * et une fine barre qui avance. Même rendu partout, pour qu’on reconnaisse l’attente.
 */
export default function StudioLoadingPanel({
  label,
  hint,
  className,
  compact = false,
}: {
  /** Ce qui se charge, ex. « Chargement du simulateur de budget ». */
  label: string;
  /** Une phrase courte sur ce qui se prépare. */
  hint?: string;
  className?: string;
  /** Version réduite pour les petits encarts (aperçus, panneaux). */
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center text-center rounded-[var(--radius-card)] border border-border bg-surface-muted/50',
        compact ? 'min-h-[10rem] p-4' : 'min-h-[22rem] p-8',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className={cn('w-full', compact ? 'max-w-[14rem]' : 'max-w-xs')}>
        <span
          className={cn(
            'mx-auto flex items-center justify-center bg-black shadow-sm',
            compact ? 'w-9 h-9 rounded-[10px]' : 'w-12 h-12 rounded-xl',
          )}
          aria-hidden
        >
          <BrandLogoIcon className={compact ? 'w-6 h-6' : 'w-8 h-8'} />
        </span>
        <p className={cn('font-semibold text-foreground', compact ? 'mt-2.5 text-xs' : 'mt-4 text-sm')}>
          {label}
          <span aria-hidden>…</span>
        </p>
        {hint && !compact ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        <div
          className={cn('mx-auto h-1 overflow-hidden rounded-full bg-border', compact ? 'mt-3 w-24' : 'mt-4 w-40')}
          aria-hidden
        >
          <div className="em-loader-slide h-full w-2/5 rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

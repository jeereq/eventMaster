import React from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  /** Boutons de la page (ex. « Créer un événement »). */
  action?: React.ReactNode;
  /** Information propre à la page, absente ailleurs à l’écran (ex. taux de commission). Jamais une phrase qui décrit l’écran. */
  note?: React.ReactNode;
  className?: string;
}

/**
 * Barre d’actions en tête de page.
 * Le titre de l’écran est affiché une seule fois, dans la barre du haut (`DashboardTopBar`) : pas de second titre ici.
 */
export default function PageHeader({ action, note, className }: PageHeaderProps) {
  if (!action && !note) return null;
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-between gap-3', className)}>
      {note ? <p className="text-sm text-muted">{note}</p> : <span aria-hidden />}
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

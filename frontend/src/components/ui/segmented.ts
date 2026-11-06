import { cn } from '@/lib/cn';

/**
 * Contrôle segmenté du simulateur (« À chiffrer », mode d’invitation) :
 * rail gris clair, segment choisi en blanc légèrement soulevé.
 * Partagé par les onglets internes des pages publiques pour qu’ils se ressemblent tous.
 */
export const SEGMENTED_TRACK = 'gap-0.5 rounded-[10px] bg-surface-muted p-[3px]';

export function segmentedItem(selected: boolean, className?: string) {
  return cn(
    'min-h-11 sm:min-h-9 px-3 rounded-lg text-sm font-semibold transition-colors touch-manipulation',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    selected
      ? 'bg-surface text-foreground shadow-[0_1px_3px_rgba(23,22,20,0.12)]'
      : 'text-muted hover:text-foreground',
    className,
  );
}

/**
 * Languette d’onglet posée sur un bandeau vert profond (simulateur) :
 * l’onglet choisi prend la couleur du fond de page et se soude au contenu.
 */
export function folderTab(selected: boolean, className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 min-h-12 rounded-t-xl font-semibold text-sm sm:text-[15px] transition-colors touch-manipulation',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#fbbf24]',
    selected ? 'bg-background text-foreground' : 'text-[#d7f6e9] hover:bg-white/10 hover:text-white',
    className,
  );
}

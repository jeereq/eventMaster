import { cn } from '@/lib/cn';

/**
 * Contrôle segmenté du simulateur (« À chiffrer », mode d’invitation) :
 * rail gris clair, segment choisi en blanc légèrement soulevé.
 * Partagé par les onglets internes des pages publiques pour qu’ils se ressemblent tous.
 */
export const SEGMENTED_TRACK = 'gap-1 rounded-full bg-surface-muted p-1';

export function segmentedItem(selected: boolean, className?: string) {
  return cn(
    'min-h-11 sm:min-h-10 px-4 rounded-full text-sm font-semibold transition-colors touch-manipulation',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    selected
      ? 'bg-surface text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.06),0_4px_12px_-6px_rgba(16,24,40,0.18)]'
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
    'inline-flex items-center justify-center gap-2 min-h-12 rounded-t-xl font-semibold text-sm sm:text-base transition-colors touch-manipulation',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#fbbf24]',
    selected ? 'bg-background text-foreground' : 'text-[#d7f6e9] hover:bg-white/10 hover:text-white',
    className,
  );
}

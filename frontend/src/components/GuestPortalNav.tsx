import Link from 'next/link';
import { Home, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

interface GuestPortalHomeLinkProps {
  guestId: string;
  /** @deprecated Conservé pour compat — le style unique suit le thème plateforme. */
  variant?: 'dark' | 'light';
  label?: string;
  className?: string;
}

export function GuestPortalHomeLink({
  guestId,
  label = 'Accueil',
  className,
}: GuestPortalHomeLinkProps) {
  return (
    <Link
      href={`/rsvp/${guestId}/home`}
      aria-label="Mes invitations"
      title="Mes invitations"
      className={cn(
        'inline-flex items-center justify-center h-11 w-11 rounded-full',
        'border border-border bg-surface text-foreground',
        'hover:bg-surface-muted transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        className,
      )}
    >
      <Home className="w-[18px] h-[18px]" aria-hidden />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

export function GuestPortalBackLink({ guestId }: { guestId: string }) {
  return (
    <Link
      href={`/rsvp/${guestId}/home`}
      className="inline-flex items-center gap-1.5 min-h-11 text-xs font-semibold text-muted hover:text-primary transition"
    >
      <ChevronLeft className="w-4 h-4" />
      Retour à mes invitations
    </Link>
  );
}

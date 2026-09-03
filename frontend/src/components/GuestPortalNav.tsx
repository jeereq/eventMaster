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
  label = 'Mes invitations',
  className,
}: GuestPortalHomeLinkProps) {
  return (
    <Link
      href={`/rsvp/${guestId}/home`}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 min-h-11 min-w-11 sm:min-w-0 px-2.5 py-1.5 rounded-[var(--radius-button)]',
        'border border-border bg-surface text-[11px] font-semibold text-muted',
        'hover:text-foreground hover:bg-surface-muted transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        className,
      )}
    >
      <Home className="w-3.5 h-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function GuestPortalBackLink({ guestId }: { guestId: string }) {
  return (
    <Link
      href={`/rsvp/${guestId}/home`}
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary transition"
    >
      <ChevronLeft className="w-4 h-4" />
      Retour à mes invitations
    </Link>
  );
}

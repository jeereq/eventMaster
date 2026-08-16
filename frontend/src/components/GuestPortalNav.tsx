import Link from 'next/link';
import { Home, ChevronLeft } from 'lucide-react';

interface GuestPortalHomeLinkProps {
  guestId: string;
  variant?: 'dark' | 'light';
  label?: string;
}

export function GuestPortalHomeLink({
  guestId,
  variant = 'dark',
  label = 'Mes invitations',
}: GuestPortalHomeLinkProps) {
  const styles =
    variant === 'dark'
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted border border-border text-[10px] font-bold text-primary hover:bg-surface-muted hover:text-foreground transition'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface border border-border text-[10px] font-bold text-primary hover:bg-primary/10 transition shadow-xs';

  return (
    <Link href={`/rsvp/${guestId}/home`} className={styles}>
      <Home className="w-3.5 h-3.5" />
      {label}
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

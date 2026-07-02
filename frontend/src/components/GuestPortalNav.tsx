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
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-indigo-300 hover:bg-slate-700 hover:text-white transition'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition shadow-xs';

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
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
    >
      <ChevronLeft className="w-4 h-4" />
      Retour à mes invitations
    </Link>
  );
}

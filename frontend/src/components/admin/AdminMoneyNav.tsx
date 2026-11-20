'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { SEGMENTED_TRACK, segmentedItem } from '@/components/ui/segmented';

export type AdminMoneySection = 'payments' | 'payouts' | 'donations' | 'ai-tokens';

const SECTIONS: { id: AdminMoneySection; label: string; href: string; tourId: string }[] = [
  { id: 'payments', label: 'Paiements', href: '/dashboard/admin/payments', tourId: 'nav-payments-admin-tab' },
  { id: 'payouts', label: 'Versements', href: '/dashboard/admin/payouts', tourId: 'nav-payouts' },
  { id: 'donations', label: 'Dons', href: '/dashboard/admin/donations', tourId: 'nav-donations-admin' },
  { id: 'ai-tokens', label: 'Jetons IA', href: '/dashboard/admin/ai-tokens', tourId: 'nav-ai-tokens' },
];

/**
 * Sélecteur commun des pages « argent » du Super Admin : un lien par page,
 * le segment actif correspond à la page courante.
 */
export default function AdminMoneyNav({
  active,
  payoutsDue,
  className,
}: {
  active: AdminMoneySection;
  /** Pastille « versements dus », si la page dispose déjà du compteur. */
  payoutsDue?: number;
  className?: string;
}) {
  return (
    <nav
      aria-label="Finances"
      className={cn(
        'flex w-fit max-w-full items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        SEGMENTED_TRACK,
        className,
      )}
    >
      {SECTIONS.map(({ id, label, href, tourId }) => {
        const selected = id === active;
        const badge = id === 'payouts' && payoutsDue && payoutsDue > 0 ? payoutsDue : null;
        return (
          <Link
            key={id}
            href={href}
            data-tour={tourId}
            aria-current={selected ? 'page' : undefined}
            className={segmentedItem(selected, 'inline-flex items-center gap-2 whitespace-nowrap shrink-0')}
          >
            {label}
            {badge != null && (
              <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-festive-accent-soft text-festive-accent text-xs font-bold tabular-nums">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

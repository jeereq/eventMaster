'use client';

import Link from 'next/link';
import { Building2, Calendar, KeyRound, Sparkles, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MarketplaceNavId = 'hub' | 'venues' | 'services' | 'rentals' | 'events';

export default function MarketplacePublicNav({
  active,
  className,
  dense = false,
}: {
  active: MarketplaceNavId;
  className?: string;
  /** Une ligne scrollable — carte / focus mobile. */
  dense?: boolean;
}) {
  const items = [
    { id: 'hub' as const, href: '/marketplace', label: 'Marketplace', short: 'Hub', icon: Store },
    { id: 'venues' as const, href: '/marketplace/salles', label: 'Salles', short: 'Salles', icon: Building2 },
    { id: 'services' as const, href: '/marketplace/prestataires', label: 'Prestataires', short: 'Prestataires', icon: Sparkles },
    { id: 'rentals' as const, href: '/marketplace/locations', label: 'Matériel & Équipements', short: 'Matériel', icon: KeyRound },
    { id: 'events' as const, href: '/marketplace/evenements', label: 'Événements', short: 'Agenda', icon: Calendar },
  ];
  return (
    <div
      className={cn(
        'inline-flex gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted',
        'w-full max-w-full flex-nowrap overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:w-auto md:flex-wrap md:overflow-visible',
        className,
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'inline-flex items-center rounded-[var(--radius-button)] text-xs font-semibold transition shrink-0',
              dense ? 'gap-1 px-2.5 py-1' : 'gap-1.5 px-3.5 py-1.5',
              active === item.id
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="md:hidden">{item.short}</span>
            <span className="hidden md:inline">{dense ? item.short : item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Building2, Calendar, KeyRound, Sparkles, Store, Wine } from 'lucide-react';
import { cn } from '@/lib/cn';

export type MarketplaceNavId = 'hub' | 'venues' | 'services' | 'rentals' | 'drinks' | 'events';

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
    { id: 'drinks' as const, href: '/marketplace/boissons', label: 'Boissons', short: 'Boissons', icon: Wine },
    { id: 'events' as const, href: '/marketplace/evenements', label: 'Événements', short: 'Agenda', icon: Calendar },
  ];
  return (
    <div
      className={cn(
        'gap-0.5 p-0.5 rounded-[var(--radius-button)] border border-border bg-surface-muted',
        // Mobile : deux rangées de trois onglets, tout reste visible sans défilement caché.
        'grid grid-cols-3 w-full max-w-full md:inline-flex md:w-auto md:flex-wrap',
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
              'inline-flex items-center justify-center md:justify-start rounded-[var(--radius-button)] text-xs font-semibold transition shrink-0 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              dense ? 'min-h-11 gap-1 px-2.5' : 'min-h-11 gap-1.5 px-3.5',
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

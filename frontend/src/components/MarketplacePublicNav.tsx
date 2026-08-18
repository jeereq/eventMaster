'use client';

import Link from 'next/link';
import { Building2, Calendar, KeyRound, Sparkles, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function MarketplacePublicNav({
  active,
  className,
}: {
  active: 'hub' | 'venues' | 'services' | 'rentals' | 'events';
  className?: string;
}) {
  const items = [
    { id: 'hub' as const, href: '/marketplace', label: 'Marketplace', icon: Store },
    { id: 'venues' as const, href: '/marketplace/salles', label: 'Salles', icon: Building2 },
    { id: 'services' as const, href: '/marketplace/prestataires', label: 'Prestataires', icon: Sparkles },
    { id: 'rentals' as const, href: '/marketplace/locations', label: 'Locations', icon: KeyRound },
    { id: 'events' as const, href: '/marketplace/evenements', label: 'Événements', icon: Calendar },
  ];
  return (
    <div className={cn('inline-flex flex-wrap gap-0.5 p-0.5 rounded-full border border-border bg-surface-muted', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition',
              active === item.id
                ? 'bg-surface text-foreground shadow-sm'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

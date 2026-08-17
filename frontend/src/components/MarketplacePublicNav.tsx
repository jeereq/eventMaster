'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function MarketplacePublicNav({ active }: { active: 'hub' | 'venues' | 'services' }) {
  const items = [
    { id: 'hub' as const, href: '/marketplace', label: 'Tous' },
    { id: 'venues' as const, href: '/marketplace/salles', label: 'Salles' },
    { id: 'services' as const, href: '/marketplace/prestataires', label: 'Prestataires' },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition',
            active === item.id
              ? 'bg-foreground text-background'
              : 'bg-surface-muted text-muted hover:text-foreground border border-border',
          )}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
}

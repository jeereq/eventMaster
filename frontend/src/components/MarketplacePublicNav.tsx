'use client';

import Link from 'next/link';
import { Building2, Sparkles, Store } from 'lucide-react';
import { cn } from '@/lib/cn';

export default function MarketplacePublicNav({ active }: { active: 'hub' | 'venues' | 'services' }) {
  const items = [
    { id: 'hub' as const, href: '/marketplace', label: 'Tous', icon: Store },
    { id: 'venues' as const, href: '/marketplace/salles', label: 'Salles', icon: Building2 },
    { id: 'services' as const, href: '/marketplace/prestataires', label: 'Prestataires', icon: Sparkles },
  ];
  return (
    <div className="inline-flex flex-wrap gap-0.5 p-0.5 rounded-full border border-border bg-surface-muted">
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

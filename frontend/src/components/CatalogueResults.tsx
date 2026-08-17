'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, MapPin, Sparkles } from 'lucide-react';
import { formatFc } from '@/config/landingPricing';
import { cn } from '@/lib/cn';
import { listStackClass } from '@/components/ui';
import type { CatalogueItem, CatalogueViewMode } from '@/lib/marketplace';

function Cover({ item, className }: { item: CatalogueItem; className?: string }) {
  if (item.coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={item.coverUrl} alt="" className={cn('object-cover', className)} />
    );
  }
  const Icon = item.kind === 'venue' ? Building2 : Sparkles;
  return (
    <div className={cn('flex items-center justify-center bg-surface-muted text-muted', className)}>
      <Icon className="w-7 h-7" />
    </div>
  );
}

function Price({ item }: { item: CatalogueItem }) {
  return (
    <span className="text-sm font-semibold text-foreground">
      {item.priceFromFc != null ? `Dès ${formatFc(item.priceFromFc)}` : 'Sur devis'}
      <span className="block text-[11px] font-normal text-muted">{item.priceUnitLabel}</span>
    </span>
  );
}

function GridCard({ item }: { item: CatalogueItem }) {
  return (
    <Link
      href={item.href}
      className="group bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden hover:border-primary/40 transition"
    >
      <div className="aspect-[16/10] bg-surface-muted overflow-hidden">
        <Cover item={item} className="w-full h-full" />
      </div>
      <div className="p-4 space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {item.kind === 'venue' ? 'Salle' : item.categoryLabel}
        </p>
        <h2 className="font-display font-semibold text-foreground group-hover:text-primary transition">
          {item.title}
        </h2>
        <p className="text-xs text-muted truncate">{item.orgName}</p>
        {item.location ? (
          <p className="text-xs text-muted inline-flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{item.location}</span>
          </p>
        ) : null}
        <div className="pt-2 border-t border-border">
          <Price item={item} />
        </div>
      </div>
    </Link>
  );
}

function ListRow({ item }: { item: CatalogueItem }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 sm:gap-4 bg-surface border border-border rounded-[var(--radius-card)] p-3 hover:border-primary/40 transition"
    >
      <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
        <Cover item={item} className="w-full h-full" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {item.kind === 'venue' ? 'Salle' : item.categoryLabel}
        </p>
        <h2 className="font-semibold text-sm text-foreground group-hover:text-primary transition truncate">
          {item.title}
        </h2>
        <p className="text-xs text-muted truncate">
          {[item.orgName, item.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <Price item={item} />
      </div>
    </Link>
  );
}

export default function CatalogueResults({
  items,
  mode,
  emptyTitle,
  emptyDescription,
}: {
  items: CatalogueItem[];
  mode: Exclude<CatalogueViewMode, 'map' | 'focus'>;
  emptyTitle: string;
  emptyDescription: string;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 px-6 border border-border rounded-[var(--radius-card)] bg-surface">
        <Building2 className="w-10 h-10 text-muted mx-auto mb-3" />
        <h2 className="font-semibold text-foreground">{emptyTitle}</h2>
        <p className="text-sm text-muted mt-2 max-w-md mx-auto leading-relaxed">{emptyDescription}</p>
      </div>
    );
  }

  if (mode === 'list') {
    return (
      <div className={listStackClass}>
        {items.map((item) => (
          <ListRow key={item.id} item={item} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <GridCard key={item.id} item={item} />
      ))}
    </div>
  );
}

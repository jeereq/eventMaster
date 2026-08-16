'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  if (!items.length) return null;

  return (
    <nav aria-label="Fil d'Ariane" className={cn('flex flex-wrap items-center gap-1 text-xs text-muted', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && <ChevronRight className="w-3 h-3 opacity-50 shrink-0" aria-hidden />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-primary transition font-medium truncate max-w-[10rem] sm:max-w-none">
                {item.label}
              </Link>
            ) : (
              <span className={cn('truncate max-w-[12rem] sm:max-w-none', isLast && 'text-foreground font-medium')}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

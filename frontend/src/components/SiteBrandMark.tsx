'use client';

import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

const ICON = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-8 h-8',
} as const;

export default function SiteBrandMark({
  name,
  href = '/',
  size = 'md',
  tone = 'default',
  showLabel = true,
  meta,
  className,
}: {
  name?: string;
  href?: string | null;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'onDark';
  showLabel?: boolean;
  meta?: string;
  className?: string;
}) {
  const { site } = usePlatformSite();
  const label = name ?? site.platformName;
  const interactive = Boolean(href);

  const inner = (
    <>
      <span
        className={cn(
          'bg-primary-solid text-primary-foreground shadow-sm shadow-primary/30 shrink-0',
          size === 'lg' ? 'p-3 rounded-xl' : 'p-1.5 rounded-lg',
          interactive && 'group-hover:scale-105 transition-transform',
        )}
      >
        <PartyPopper className={ICON[size]} />
      </span>
      {showLabel ? (
        <span className="min-w-0">
          <span
            className={cn(
              'font-bold tracking-tight block leading-none',
              tone === 'onDark' ? 'text-white' : 'text-foreground',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-[15px]',
            )}
          >
            {label}
          </span>
          {meta ? (
            <span
              className={cn(
                'block text-[10px] font-medium mt-1',
                tone === 'onDark' ? 'text-white/65' : 'text-muted',
              )}
            >
              {meta}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const sharedClass = cn(
    'inline-flex items-center gap-2.5 shrink-0 min-w-0',
    interactive && 'hover:opacity-90 transition group',
    className,
  );

  if (!href) {
    return (
      <span className={sharedClass} aria-hidden={!showLabel}>
        {inner}
      </span>
    );
  }

  return (
    <Link href={href} className={sharedClass} aria-label={showLabel ? undefined : label}>
      {inner}
    </Link>
  );
}

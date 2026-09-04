'use client';

import Link from 'next/link';
import { PartyPopper } from 'lucide-react';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

export default function SiteBrandMark({
  name,
  href = '/',
  size = 'md',
  className,
}: {
  name?: string;
  href?: string;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const { site } = usePlatformSite();
  const label = name ?? site.platformName;

  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-2.5 hover:opacity-90 transition shrink-0 group', className)}
    >
      <span className="bg-primary-solid text-primary-foreground p-1.5 rounded-lg shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
        <PartyPopper className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </span>
      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          size === 'sm' ? 'text-sm' : 'text-[15px]',
        )}
      >
        {label}
      </span>
    </Link>
  );
}

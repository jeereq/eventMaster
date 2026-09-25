'use client';

import Link from 'next/link';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';

/** Double étoile emblème d'EventMaster (étoile or cérémoniale + reflet blanc). */
export function BrandStarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M256 0 C256 150 362 256 512 256 C362 256 256 362 256 512 C256 362 150 256 0 256 C150 256 256 150 256 0 Z"
        fill="#fbbf24"
      />
      <path
        d="M384 128 C384 180 437 224 512 224 C437 224 384 268 384 320 C384 268 331 224 256 224 C331 224 384 180 384 128 Z"
        fill="#ffffff"
        opacity="0.9"
      />
    </svg>
  );
}

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
          'font-display font-bold shrink-0 flex items-center justify-center leading-none',
          tone === 'onDark'
            ? 'bg-brand-accent text-[#022c22]'
            : 'bg-primary-solid text-primary-foreground',
          size === 'lg'
            ? 'w-11 h-11 rounded-xl text-xl'
            : size === 'sm'
              ? 'w-6 h-6 rounded-md text-xs'
              : 'w-8 h-8 sm:w-[34px] sm:h-[34px] rounded-[10px] text-base',
          interactive && 'group-hover:scale-105 transition-transform',
        )}
        aria-hidden
      >
        {label.trim().charAt(0).toUpperCase() || 'E'}
      </span>
      {showLabel ? (
        <span className="min-w-0">
          <span
            className={cn(
              'font-display font-semibold block leading-none truncate max-w-[9.5rem] sm:max-w-[14rem]',
              tone === 'onDark' ? 'text-white' : 'text-foreground',
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg sm:text-xl' : 'text-base sm:text-[1.3rem]',
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

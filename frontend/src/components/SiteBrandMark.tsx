'use client';

import Link from 'next/link';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { cn } from '@/lib/cn';
import {
  BRAND_LOGO_DARK,
  BRAND_LOGO_MINT,
  BRAND_LOGO_PATH_PETALS,
  BRAND_LOGO_PATH_STAR,
  BRAND_LOGO_VIEWBOX,
} from '@/lib/brandLogo';

/** Logo EventMaster (pétales verts + étoile menthe), version détourée. */
export function BrandLogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox={BRAND_LOGO_VIEWBOX}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d={BRAND_LOGO_PATH_PETALS} fill={BRAND_LOGO_DARK} />
      <path d={BRAND_LOGO_PATH_STAR} fill={BRAND_LOGO_MINT} />
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
          'shrink-0 flex items-center justify-center',
          // Sur fond sombre/coloré, les pétales vert foncé se fondent : on pose le logo sur sa tuile noire.
          tone === 'onDark' && 'bg-black',
          tone === 'onDark' && (size === 'lg' ? 'rounded-xl' : size === 'sm' ? 'rounded-md' : 'rounded-[10px]'),
          size === 'lg'
            ? 'w-11 h-11'
            : size === 'sm'
              ? 'w-6 h-6'
              : 'w-8 h-8 sm:w-[34px] sm:h-[34px]',
          interactive && 'group-hover:scale-105 transition-transform',
        )}
        aria-hidden
      >
        <BrandLogoIcon className={tone === 'onDark' ? 'w-[74%] h-[74%]' : 'w-full h-full'} />
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

'use client';

import React from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { cn } from '@/lib/cn';

export default function PublicPageShell({
  children,
  faqHref = '/#faq',
  hideFooter = false,
  hideHeader = false,
  mobileFooterPad = false,
}: {
  children: React.ReactNode;
  faqHref?: string;
  hideFooter?: boolean;
  hideHeader?: boolean;
  mobileFooterPad?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col min-h-screen bg-background text-foreground font-sans antialiased pb-16 md:pb-0',
      hideFooter && 'h-dvh overflow-hidden',
    )}>
      {hideHeader ? null : <SiteHeader />}
      <main
        id="main-content"
        className={cn('flex-1 flex flex-col min-w-0', hideFooter && 'min-h-0 overflow-hidden')}
      >
        {children}
      </main>
      {hideFooter ? null : (
        <SiteFooter faqHref={faqHref} className={mobileFooterPad ? 'pb-24 lg:pb-0' : undefined} />
      )}
    </div>
  );
}

export function PublicPageHero({
  chip,
  title,
  description,
  children,
  compact = false,
}: {
  chip?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="relative em-landing-hero">
      <div className={cn(
        'page-container relative z-10',
        compact ? 'py-5 sm:py-8 lg:py-10' : 'py-7 sm:py-12 lg:py-14',
      )}>
        <div className="max-w-3xl space-y-2.5 sm:space-y-3.5">
          {chip ? <span className="em-festive-chip text-[11px] sm:text-xs">{chip}</span> : null}
          <h1 className={cn(
            'font-display font-semibold tracking-tight text-foreground leading-[1.14]',
            compact
              ? 'text-xl sm:text-3xl lg:text-4xl'
              : 'text-2xl sm:text-4xl lg:text-[2.75rem]',
          )}>
            {title}
          </h1>
          {description ? (
            <p className="text-xs sm:text-base text-muted leading-relaxed max-w-2xl line-clamp-2 sm:line-clamp-none">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

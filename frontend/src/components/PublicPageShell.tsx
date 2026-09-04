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
      'flex flex-col min-h-screen bg-background text-foreground font-sans antialiased em-public-bottom-pad',
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
  title,
  description,
  children,
  compact = false,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="relative em-landing-hero">
      <div className={cn(
        'page-container relative z-10',
        compact ? 'py-3 md:py-8 lg:py-10' : 'py-4 md:py-12 lg:py-14',
      )}>
        <div className="max-w-3xl space-y-1.5 md:space-y-3.5">
          <h1 className={cn(
            'em-landing-heading text-foreground',
            compact
              ? 'text-base md:text-3xl lg:text-4xl'
              : 'text-lg md:text-4xl lg:text-[2.75rem]',
          )}>
            {title}
          </h1>
          {description ? (
            <p className="hidden md:block text-base text-muted leading-relaxed max-w-2xl">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

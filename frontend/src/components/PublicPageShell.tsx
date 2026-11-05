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
  tone = 'default',
  aside,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  compact?: boolean;
  /** `deep` : bandeau vert profond de la maquette (texte clair). */
  tone?: 'default' | 'deep';
  /** Contenu court à droite du titre (badge, moyens de paiement…). */
  aside?: React.ReactNode;
}) {
  const deep = tone === 'deep';
  return (
    <section className={cn('relative', deep ? 'bg-[#064e3b] text-white overflow-hidden' : 'em-landing-hero')}>
      {deep ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-36 -top-36 w-96 h-96 rounded-[60px] border-[60px] border-[#0b5e48] hidden md:block"
        />
      ) : null}
      <div className={cn(
        'page-container relative z-10',
        compact ? 'pt-6 pb-4 md:py-8 lg:py-10' : 'pt-7 pb-5 md:py-12 lg:py-14',
      )}>
        <div className={cn(aside ? 'flex flex-col md:flex-row md:items-end md:justify-between gap-3 md:gap-6' : undefined)}>
        <div className="max-w-3xl space-y-1.5 md:space-y-3.5">
          <h1 className={cn(
            deep ? 'font-display font-semibold tracking-[-0.02em] text-white' : 'em-landing-heading text-foreground',
            compact
              ? (deep ? 'text-2xl md:text-[2.5rem] leading-tight' : 'text-xl md:text-2xl lg:text-3xl')
              : 'text-xl md:text-3xl lg:text-[2.5rem]',
          )}>
            {title}
          </h1>
          {description ? (
            <p className={cn('text-sm md:text-base leading-relaxed max-w-2xl', deep ? 'text-[#d1fae5]' : 'text-muted')}>
              {description}
            </p>
          ) : null}
          {aside ? null : children}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>
        {aside && children ? <div className="mt-3 md:mt-5">{children}</div> : null}
      </div>
    </section>
  );
}

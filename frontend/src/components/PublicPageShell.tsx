'use client';

import React from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';
import { cn } from '@/lib/cn';

export default function PublicPageShell({
  children,
  faqHref = '/#faq',
}: {
  children: React.ReactNode;
  faqHref?: string;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased">
      <CelebrateMood />
      <SiteHeader />
      {children}
      <SiteFooter faqHref={faqHref} />
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
        compact ? 'py-8 sm:py-10 lg:py-12' : 'py-12 sm:py-16 lg:py-[4.5rem]',
      )}>
        <div className="max-w-3xl space-y-4">
          {chip ? <span className="em-festive-chip">{chip}</span> : null}
          <h1 className={cn(
            'font-display font-semibold tracking-tight text-foreground leading-[1.12]',
            compact
              ? 'text-[1.85rem] sm:text-3xl lg:text-4xl'
              : 'text-[2.15rem] sm:text-4xl lg:text-[2.75rem]',
          )}>
            {title}
          </h1>
          {description ? (
            <p className="text-[15px] sm:text-base text-muted leading-relaxed max-w-2xl">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </section>
  );
}

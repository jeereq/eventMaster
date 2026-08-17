'use client';

import React from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CelebrateMood from '@/components/CelebrateMood';

export default function PublicPageShell({
  children,
  faqHref = '/#faq',
}: {
  children: React.ReactNode;
  faqHref?: string;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans antialiased transition-colors duration-200">
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
}: {
  chip?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative em-landing-hero">
      <div className="page-container relative z-10 py-12 sm:py-16 lg:py-[4.5rem]">
        <div className="max-w-3xl space-y-4">
          {chip ? <span className="em-festive-chip">{chip}</span> : null}
          <h1 className="font-display text-[2.15rem] sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-foreground leading-[1.12]">
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

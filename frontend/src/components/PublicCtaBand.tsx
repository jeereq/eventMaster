'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export type PublicCtaHighlight = {
  icon: LucideIcon;
  label: string;
};

const HIGHLIGHT_ICON_TONE = 'text-brand-accent';

export default function PublicCtaBand({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  highlights,
  actions,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  highlights?: PublicCtaHighlight[];
  actions?: React.ReactNode;
}) {
  return (
    <section className="em-landing-defer relative overflow-hidden bg-[#064e3b] text-white py-14 sm:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -bottom-40 w-[26rem] h-[26rem] rounded-full border-[64px] border-brand-accent opacity-15"
      />
      <div className="page-container relative z-10">
        <div className="flex flex-col items-center text-center gap-6 sm:gap-8">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <h2 className="em-landing-heading text-3xl sm:text-5xl text-white">
                {title}
              </h2>
              <p className="text-base sm:text-lg text-[#d1fae5] leading-relaxed">
                {description}
              </p>
              {highlights?.length ? (
                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 pt-1 text-sm text-[#d1fae5] font-medium">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 shrink-0 ${HIGHLIGHT_ICON_TONE}`} />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto [&>*]:justify-center [&_.bg-primary-solid]:bg-white [&_.bg-primary-solid]:text-[#064e3b] [&_.bg-primary-solid:hover]:bg-[#ecfdf5]">
              {actions || (
                <>
                  {primaryHref && primaryLabel ? (
                    <Button
                      href={primaryHref}
                      size="lg"
                      variant="primary"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="w-full sm:w-auto justify-center font-semibold"
                    >
                      {primaryLabel}
                    </Button>
                  ) : null}
                  {secondaryHref && secondaryLabel ? (
                    <Button
                      href={secondaryHref}
                      size="lg"
                      variant="secondary"
                      className="w-full sm:w-auto justify-center bg-transparent text-white hover:bg-white/10 border-[#6ee7b7] font-semibold"
                    >
                      {secondaryLabel}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui';

export type PublicCtaHighlight = {
  icon: LucideIcon;
  label: string;
};

const HIGHLIGHT_ICON_TONE = 'text-festive-on-stage';

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
    <section className="em-landing-defer py-10 sm:py-14 border-t border-border bg-gradient-to-b from-surface/90 to-surface-muted/50">
      <div className="page-container relative z-10">
        <div className="rounded-[var(--radius-card)] border border-primary/30 em-stage p-6 sm:p-10 shadow-xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            <div className="max-w-2xl space-y-3">
              <h2 className="em-landing-heading text-xl sm:text-3xl lg:text-4xl text-stage-foreground">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-stage-foreground/80 leading-relaxed max-w-xl">
                {description}
              </p>
              {highlights?.length ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-stage-foreground/90 font-medium">
                  {highlights.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${HIGHLIGHT_ICON_TONE}`} />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full sm:w-auto lg:min-w-[16rem] [&>*]:w-full [&>*]:justify-center">
              {actions || (
                <>
                  {primaryHref && primaryLabel ? (
                    <Button
                      href={primaryHref}
                      size="lg"
                      variant="primary"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="w-full justify-center shadow-md font-semibold text-xs sm:text-sm"
                    >
                      {primaryLabel}
                    </Button>
                  ) : null}
                  {secondaryHref && secondaryLabel ? (
                    <Button
                      href={secondaryHref}
                      size="lg"
                      variant="secondary"
                      className="w-full justify-center bg-stage-foreground/10 text-stage-foreground hover:bg-stage-foreground/20 border-stage-foreground/20 text-xs sm:text-sm font-semibold"
                    >
                      {secondaryLabel}
                    </Button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

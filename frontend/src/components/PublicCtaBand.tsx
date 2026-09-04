'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { ArrowRight } from 'lucide-react';

export default function PublicCtaBand({
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  actions,
}: {
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="em-landing-defer relative overflow-hidden py-10 sm:py-16 lg:py-20 em-stage border-t border-primary/25">
      <div
        className="absolute inset-0 bg-radial-[at_50%_20%] from-primary/35 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-radial-[at_80%_90%] from-festive-accent/20 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="page-container relative z-10 text-center space-y-4 sm:space-y-5">
        <h2 className="em-landing-heading text-xl sm:text-3xl lg:text-4xl text-stage-foreground max-w-xl mx-auto">
          {title}
        </h2>

        <p className="text-xs sm:text-base text-stage-foreground/75 max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center pt-2 sm:pt-3 w-full max-w-sm mx-auto sm:max-w-none [&>*]:w-full sm:[&>*]:w-auto">
          {actions || (
            <>
              {primaryHref && primaryLabel ? (
                <Button
                  href={primaryHref}
                  size="lg"
                  variant="primary"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="shadow-lg shadow-primary/40 text-sm font-bold"
                >
                  {primaryLabel}
                </Button>
              ) : null}
              {secondaryHref && secondaryLabel ? (
                <Button
                  href={secondaryHref}
                  size="lg"
                  variant="secondary"
                  className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-sm font-semibold"
                >
                  {secondaryLabel}
                </Button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

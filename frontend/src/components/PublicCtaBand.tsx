'use client';

import React from 'react';
import { Button } from '@/components/ui';
import { ArrowRight, Sparkles } from 'lucide-react';

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
    <section className="relative overflow-hidden py-16 sm:py-20 em-stage border-t border-primary/25">
      <div
        className="absolute inset-0 bg-radial-[at_50%_20%] from-primary/35 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-radial-[at_80%_90%] from-festive-accent/20 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="page-container relative z-10 text-center space-y-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-festive-accent/35 text-[11px] font-bold text-festive-on-stage uppercase tracking-wider mx-auto">
          <Sparkles className="w-3.5 h-3.5" />
          Rejoignez EventMaster
        </div>

        <h2 className="em-landing-heading text-2xl sm:text-3xl lg:text-4xl text-stage-foreground max-w-xl mx-auto">
          {title}
        </h2>

        <p className="text-sm sm:text-base text-stage-foreground/70 max-w-md mx-auto leading-relaxed">
          {description}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-3">
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

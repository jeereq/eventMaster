'use client';

import React from 'react';
import Link from 'next/link';
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
    <section className="py-16 sm:py-20 bg-foreground text-background">
      <div className="page-container text-center space-y-5">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight max-w-xl mx-auto">
          {title}
        </h2>
        <p className="text-sm text-background/70 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
          {actions || (
            <>
              {primaryHref && primaryLabel ? (
                <Link href={primaryHref}>
                  <Button size="lg" variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    {primaryLabel}
                  </Button>
                </Link>
              ) : null}
              {secondaryHref && secondaryLabel ? (
                <Link href={secondaryHref}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-background/80 hover:text-background hover:bg-background/10 border border-background/20"
                  >
                    {secondaryLabel}
                  </Button>
                </Link>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

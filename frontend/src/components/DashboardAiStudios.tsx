'use client';

import React from 'react';
import { Sparkles } from '@/components/icons';
import { usePlatformSite } from '@/context/PlatformSiteContext';

/** Le simulateur du tableau de bord ne porte plus que le studio Budget. */
export default function DashboardAiStudios({ budget }: { budget: React.ReactNode }) {
  const { site } = usePlatformSite();
  const budgetVisible = site?.studioVisibility?.budget ?? true;

  if (!budgetVisible) {
    return (
      <div className="rounded-2xl border border-border bg-surface-muted/50 p-8 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-muted mx-auto" />
        <h3 className="text-base font-semibold text-foreground">Studios temporairement indisponibles</h3>
        <p className="text-xs text-muted max-w-md mx-auto">
          Les studios IA et simulateurs sont actuellement masqués par l’administration de la plateforme. Vous pouvez continuer d&apos;utiliser le catalogue et vos réservations normalement.
        </p>
      </div>
    );
  }

  return <div className="space-y-6">{budget}</div>;
}

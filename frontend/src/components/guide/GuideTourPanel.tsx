'use client';

import React from 'react';
import { Play, RotateCcw, ListOrdered, LayoutGrid, Sparkles } from 'lucide-react';
import { useTour } from '@/context/TourContext';
import { useAuth } from '@/context/AuthContext';
import { getProductTour } from '@/config/productTours';
import type { UserGuideId } from '@/config/userGuides';
import { getGuideLabel } from '@/lib/resolveUserGuideRole';
import { Button } from '@/components/ui';

interface GuideTourPanelProps {
  guideId: UserGuideId;
}

export default function GuideTourPanel({ guideId }: GuideTourPanelProps) {
  const { access } = useAuth();
  const { startTour, isActive } = useTour();
  const steps = getProductTour(guideId, access);
  const tabSteps = steps.filter((s) => s.target);

  if (guideId === 'guest' || steps.length === 0) {
    return (
      <div className="text-center py-10 px-4 border border-dashed border-border rounded-[var(--radius-card)] bg-surface">
        <p className="text-sm text-muted">Aucune visite guidée disponible pour ce profil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="p-5 sm:p-6 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 space-y-4">
        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            Visite interactive
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            Parcours des onglets — {getGuideLabel(guideId)}
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-2xl">
            Survolez votre menu : chaque étape met en surbrillance un onglet et explique son rôle.
            Relancez la visite à tout moment.
          </p>
        </div>
        <Button
          onClick={() => startTour(guideId, access)}
          disabled={isActive}
          leftIcon={
            isActive ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />
          }
        >
          {isActive ? 'Visite en cours…' : `Lancer la visite (${tabSteps.length} étapes)`}
        </Button>
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-primary" />
          Étapes du parcours
          <span className="text-[10px] font-medium text-muted bg-surface-muted px-1.5 py-0.5 rounded-md">
            {tabSteps.length}
          </span>
        </h3>
        <ol className="space-y-2.5">
          {tabSteps.map((step, i) => (
            <li
              key={step.id}
              className="flex gap-3 rounded-[var(--radius-button)] border border-border bg-background p-3 text-sm"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-md bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">{step.title}</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

'use client';

/**
 * Bandeau de la page Salles : ce que l’éditeur permet avec le forfait de l’organisation,
 * la visite guidée et, s’il existe, le niveau suivant à débloquer.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, GraduationCap } from '@/components/icons';
import { Button } from '@/components/ui';
import { roomEditorCapabilities } from '@/lib/roomEditorAccess';
import { editorTourSummary } from '@/lib/roomEditorTour';

/** Événement écouté par l’éditeur déjà ouvert ; `?guide=1` couvre celui qui s’ouvrira ensuite. */
export const START_EDITOR_TOUR_EVENT = 'em-start-editor-tour';

export default function RoomEditorPlanCard({ level, themesFixtures }: { level?: string | null; themesFixtures?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caps = roomEditorCapabilities(level, themesFixtures ?? true);
  const summary = editorTourSummary(caps);
  const [waiting, setWaiting] = useState(() => searchParams.get('guide') === '1');

  const startGuide = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('guide', '1');
    router.replace(`?${params.toString()}`, { scroll: false });
    // Un éditeur ouvert annule l’événement ; sinon la visite attend l’ouverture d’une salle.
    const handled = !window.dispatchEvent(new CustomEvent(START_EDITOR_TOUR_EVENT, { cancelable: true }));
    setWaiting(!handled);
  };

  return (
    <section
      aria-label="Éditeur de salles"
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-2.5"
    >
      <p className="min-w-0 text-sm text-foreground">
        <span className="font-semibold">Éditeur {caps.label}</span>
        {summary.included.length > 0 ? (
          <span className="text-muted"> · {summary.included.join(' · ')}</span>
        ) : null}
        {waiting ? (
          <span className="block text-xs font-semibold text-primary" role="status">
            Ouvrez ou créez une salle : la visite démarrera dans l’éditeur.
          </span>
        ) : null}
      </p>
      <div className="flex shrink-0 flex-wrap items-center gap-1">
        <Button type="button" size="sm" variant="ghost" onClick={startGuide} leftIcon={<GraduationCap className="h-4 w-4" />}>
          Visite guidée
        </Button>
        {summary.nextPlan ? (
          <Button href="/dashboard/billing" size="sm" variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Passer à {summary.nextPlan}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

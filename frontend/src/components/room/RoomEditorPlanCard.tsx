'use client';

/**
 * Bandeau de la page Salles : ce que l’éditeur permet avec le forfait de l’organisation,
 * la visite guidée et, s’il existe, le niveau suivant à débloquer.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, GraduationCap, LayoutGrid } from 'lucide-react';
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
      aria-labelledby="room-editor-plan-title"
      className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="min-w-0 space-y-2">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
          <LayoutGrid className="h-4 w-4" aria-hidden /> Éditeur de salles 2D / 3D
        </p>
        <h2 id="room-editor-plan-title" className="text-base font-bold text-foreground">
          Votre niveau d’éditeur : {caps.label}
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground">
          {summary.included.map((item) => (
            <li key={item} className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden /> {item}
            </li>
          ))}
        </ul>
        <p className={waiting ? 'text-xs font-semibold text-primary' : 'text-xs text-muted'} role={waiting ? 'status' : undefined}>
          {waiting
            ? 'Visite prête : ouvrez une salle ou créez-en une, elle démarrera dans l’éditeur.'
            : 'La visite guidée montre l’éditeur pas à pas, et ce que débloque le niveau suivant.'}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button type="button" size="sm" onClick={startGuide} leftIcon={<GraduationCap className="h-4 w-4" />}>
          Visite guidée
        </Button>
        {summary.nextPlan ? (
          <Button href="/dashboard/billing" size="sm" variant="secondary" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Passer à {summary.nextPlan}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

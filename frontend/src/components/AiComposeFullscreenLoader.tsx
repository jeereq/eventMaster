'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AiProcessStep = {
  id: string;
  label: string;
};

const COMPOSE_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du brief' },
  { id: 'faces', label: 'Yeux, sourire et joues' },
  { id: 'layout', label: 'Composition 9:16' },
  { id: 'photo', label: 'Rendu de la carte' },
  { id: 'finish', label: 'Finition de l’invitation' },
];

const BUDGET_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du projet et du budget' },
  { id: 'venues', label: 'Salles du catalogue' },
  { id: 'vendors', label: 'Prestataires et matériel' },
  { id: 'packs', label: '3 formules chiffrées' },
  { id: 'split', label: 'Répartition des coûts' },
];

const ROOM_PLAN_STEPS: AiProcessStep[] = [
  { id: 'brief', label: 'Lecture du brief' },
  { id: 'photo', label: 'Lecture de la photo' },
  { id: 'layout', label: 'Placement du mobilier' },
  { id: 'look', label: 'Matières et couleurs' },
  { id: 'finish', label: 'Finition du plan' },
];

export function AiProcessFullscreenLoader({
  active,
  eyebrow,
  title,
  footnote,
  steps,
  stageHint,
  icon: Icon = Sparkles,
  onCancel,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  footnote?: string;
  steps: AiProcessStep[];
  stageHint?: string | null;
  icon?: LucideIcon;
  onCancel?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      return;
    }
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = window.setInterval(() => {
      setStepIndex((i) => (i + 1) % steps.length);
    }, 2800);
    return () => window.clearInterval(timer);
  }, [active, steps.length]);

  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onCancel) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = rootRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (!current || current === first || !root.contains(current)) {
          event.preventDefault();
          last.focus();
        }
      } else if (!current || current === last || !root.contains(current)) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      (cancelRef.current ?? root).focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [active, onCancel]);

  if (!active) return null;

  const current = steps[stepIndex] || steps[0];

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="fixed inset-0 z-[12000] flex items-center justify-center bg-[#0b0907]/92 px-5"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="ai-process-loader-title"
      aria-describedby="ai-process-loader-desc"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl motion-safe:animate-pulse" />
      </div>

      <div className="relative w-full max-w-md text-center text-white">
        <div className="relative mx-auto mb-7 h-28 w-28">
          <div
            className="absolute inset-0 rounded-full border border-white/10"
            style={{
              background:
                'conic-gradient(from 180deg, color-mix(in oklab, var(--primary) 85%, white), transparent 55%, color-mix(in oklab, var(--primary) 40%, transparent))',
            }}
          />
          <div className="absolute inset-[7px] rounded-full bg-[#110e0b] border border-white/10 shadow-2xl flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary motion-safe:animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary motion-safe:animate-spin motion-reduce:animate-none" />
          <div className="absolute inset-3 rounded-full border border-transparent border-b-white/40 motion-safe:animate-spin motion-reduce:animate-none [animation-direction:reverse] [animation-duration:2.4s]" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary/90">{eyebrow}</p>
        <h2 id="ai-process-loader-title" className="mt-2 text-xl sm:text-2xl font-bold tracking-tight">
          {title}
        </h2>
        <p id="ai-process-loader-desc" className="mt-2 text-sm text-white/70 leading-relaxed">
          {stageHint || current.label}
        </p>
        {footnote ? <p className="mt-1 text-xs text-white/45">{footnote}</p> : null}

        <ol className="mt-6 space-y-2 text-left" aria-label="Étapes en cours">
          {steps.map((step, index) => {
            const isCurrent = index === stepIndex;
            const isDone = index < stepIndex;
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2 text-xs transition-colors',
                  isCurrent
                    ? 'border-primary/45 bg-primary/15 text-white'
                    : isDone
                      ? 'border-white/10 bg-white/5 text-white/70'
                      : 'border-white/5 bg-white/[0.03] text-white/40',
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] font-bold shrink-0',
                    isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : isDone
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white/50',
                  )}
                >
                  {index + 1}
                </span>
                <span className="font-semibold">{step.label}</span>
                {isCurrent ? (
                  <span className="ml-auto flex gap-1" aria-hidden>
                    <span className="w-1 h-1 rounded-full bg-primary motion-safe:animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-primary motion-safe:animate-pulse [animation-delay:120ms]" />
                    <span className="w-1 h-1 rounded-full bg-primary motion-safe:animate-pulse [animation-delay:240ms]" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        {onCancel ? (
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="mt-6 min-h-11 px-5 rounded-xl border border-white/20 bg-white/8 text-sm font-semibold text-white hover:bg-white/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Annuler
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function AiComposeFullscreenLoader({
  active,
  embedText = false,
  hasReferences = false,
  stageHint,
  onCancel,
}: {
  active: boolean;
  embedText?: boolean;
  hasReferences?: boolean;
  stageHint?: string | null;
  onCancel?: () => void;
}) {
  const steps = COMPOSE_STEPS.map((step) => {
    if (step.id === 'faces' && !hasReferences) {
      return { ...step, label: 'Ambiance et matières' };
    }
    if (step.id === 'finish' && embedText) {
      return { ...step, label: 'Incrustation de la typographie' };
    }
    return step;
  });

  return (
    <AiProcessFullscreenLoader
      active={active}
      eyebrow="Invitation"
      title="Votre carte se prépare"
      stageHint={stageHint}
      steps={steps}
      onCancel={onCancel}
      footnote={
        hasReferences
          ? 'Les regards, le sourire et le volume des joues restent fidèles aux photos.'
          : 'Carte composée uniquement à partir de votre brief.'
      }
    />
  );
}

export function AiBudgetFullscreenLoader({
  active,
  stageHint,
}: {
  active: boolean;
  stageHint?: string | null;
}) {
  return (
    <AiProcessFullscreenLoader
      active={active}
      eyebrow="Simulation IA"
      title="Calcul des formules"
      stageHint={stageHint}
      steps={BUDGET_STEPS}
      footnote="Catalogue réel : salles, prestataires et matériel de votre ville."
    />
  );
}

export function AiRoomPlanFullscreenLoader({
  active,
  hasPhoto = false,
  stageHint,
  onCancel,
}: {
  active: boolean;
  hasPhoto?: boolean;
  stageHint?: string | null;
  onCancel?: () => void;
}) {
  const steps = hasPhoto
    ? ROOM_PLAN_STEPS
    : ROOM_PLAN_STEPS.filter((step) => step.id !== 'photo');
  return (
    <AiProcessFullscreenLoader
      active={active}
      eyebrow="Plan de salle"
      title="Le studio compose votre plan"
      stageHint={stageHint}
      steps={steps}
      onCancel={onCancel}
      footnote={
        hasPhoto
          ? 'Les tables, rangées et zones visibles sont déduites de la photo et du brief.'
          : 'Le mobilier est placé à partir de votre brief, prêt à ajuster en 2D / 3D.'
      }
    />
  );
}

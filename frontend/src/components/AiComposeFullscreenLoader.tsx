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

const STEP_INTERVAL_MS = 2800;
const PROGRESS_TICK_MS = 400;
const PROGRESS_START = 10;
const PROGRESS_CAP = 92;

export function nextAiLoaderStepIndex(current: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(current + 1, stepCount - 1);
}

export function nextAiLoaderProgress(current: number): number {
  if (current >= PROGRESS_CAP) return current;
  const remaining = PROGRESS_CAP - current;
  return Math.min(PROGRESS_CAP, current + Math.max(1.2, remaining * 0.09));
}

export function AiProcessFullscreenLoader({
  active,
  eyebrow,
  title,
  footnote,
  steps,
  stageHint,
  icon: Icon = Sparkles,
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  footnote?: string;
  steps: AiProcessStep[];
  stageHint?: string | null;
  icon?: LucideIcon;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setProgress(0);
      return;
    }
    setProgress(PROGRESS_START);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStepIndex(Math.max(0, steps.length - 1));
      setProgress(PROGRESS_CAP);
      return;
    }
    const stepTimer = window.setInterval(() => {
      setStepIndex((index) => nextAiLoaderStepIndex(index, steps.length));
    }, STEP_INTERVAL_MS);
    const progressTimer = window.setInterval(() => {
      setProgress((value) => nextAiLoaderProgress(value));
    }, PROGRESS_TICK_MS);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
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
    rootRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = rootRef.current;
      if (!root) return;
      event.preventDefault();
      root.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      root.focus();
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [active]);

  if (!active) return null;

  const current = steps[stepIndex] || steps[0];
  const shownProgress = Math.round(progress);

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

        <div className="mt-5 space-y-1.5">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shownProgress}
            aria-label="Progression de la génération"
          >
            <div
              className="h-full rounded-full bg-primary-solid transition-[width] duration-500 ease-out"
              style={{ width: `${shownProgress}%` }}
            />
          </div>
          <p className="text-xs text-white/45 tabular-nums">{shownProgress} %</p>
        </div>

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

        <p className="mt-6 text-xs text-white/40">La génération continue jusqu’à la fin. Merci de patienter.</p>
      </div>
    </div>
  );
}

export default function AiComposeFullscreenLoader({
  active,
  embedText = false,
  hasReferences = false,
  stageHint,
}: {
  active: boolean;
  embedText?: boolean;
  hasReferences?: boolean;
  stageHint?: string | null;
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
}: {
  active: boolean;
  hasPhoto?: boolean;
  stageHint?: string | null;
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
      footnote={
        hasPhoto
          ? 'Les tables, rangées et zones visibles sont déduites de la photo et du brief.'
          : 'Le mobilier est placé à partir de votre brief, prêt à ajuster en 2D / 3D.'
      }
    />
  );
}

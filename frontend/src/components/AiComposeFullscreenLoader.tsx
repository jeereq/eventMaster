'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AiLoaderVariant = 'invitation' | 'room' | 'budget';

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

const WAIT_LINES = [
  'L’atelier pose les détails un à un.',
  'On ne précipite pas la fête.',
  'Encore un instant — le rendu se précise.',
];

function InvitationVignette({ progress, stepIndex }: { progress: number; stepIndex: number }) {
  return (
    <div className="relative h-[4.75rem] w-[3.15rem] rounded-t-[1.35rem] rounded-b-lg border border-festive-on-stage/35 bg-stage-elevated overflow-hidden">
      <div className="absolute inset-x-1.5 top-2.5 space-y-1">
        <div className={cn('mx-auto h-1 w-6 rounded-full transition-colors duration-500', stepIndex >= 1 ? 'bg-stage-foreground/55' : 'bg-stage-foreground/15')} />
        <div className={cn('h-0.5 rounded-full transition-colors duration-500', stepIndex >= 2 ? 'bg-stage-foreground/40' : 'bg-stage-foreground/10')} />
        <div className={cn('h-0.5 w-3/4 rounded-full transition-colors duration-500', stepIndex >= 3 ? 'bg-stage-foreground/35' : 'bg-stage-foreground/10')} />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/40 to-transparent transition-[height] duration-700 ease-out"
        style={{ height: `${Math.max(14, progress)}%` }}
      />
      <div className="em-studio-scan absolute inset-x-0 h-px bg-festive-on-stage/80 shadow-[0_0_12px_var(--festive-on-stage)]" />
    </div>
  );
}

function RoomVignette({ progress }: { progress: number }) {
  const tables: Array<{ style: React.CSSProperties; showAt: number }> = [
    { showAt: 22, style: { left: '18%', top: '20%', animationDelay: '0ms' } },
    { showAt: 38, style: { right: '18%', top: '20%', animationDelay: '90ms' } },
    { showAt: 54, style: { left: '18%', bottom: '18%', animationDelay: '180ms' } },
    { showAt: 70, style: { right: '18%', bottom: '18%', animationDelay: '270ms' } },
  ];
  return (
    <div className="relative h-[4.75rem] w-[4.75rem] rounded-xl border border-primary/30 bg-stage-elevated overflow-hidden">
      <div className="absolute inset-2 rounded-md border border-dashed border-stage-foreground/15" />
      <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-festive-on-stage/25" />
      {tables.map((table, index) =>
        progress > table.showAt ? (
          <span
            key={index}
            className="em-studio-dot-in absolute h-2.5 w-2.5 rounded-full bg-primary-solid/90 ring-2 ring-primary/30"
            style={table.style}
          />
        ) : null,
      )}
    </div>
  );
}

function BudgetVignette({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="relative flex h-[4.75rem] w-[4.75rem] items-end justify-center gap-1">
      {[40, 64, 50].map((height, index) => (
        <span
          key={index}
          className={cn(
            'w-3 rounded-t-md border transition-all duration-700',
            stepIndex >= index
              ? 'border-primary/45 bg-primary/35'
              : 'border-stage-foreground/10 bg-stage-foreground/5',
          )}
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

function StudioVignette({
  variant,
  progress,
  stepIndex,
  Icon,
}: {
  variant: AiLoaderVariant;
  progress: number;
  stepIndex: number;
  Icon: LucideIcon;
}) {
  return (
    <div className="em-studio-float relative flex h-full w-full items-center justify-center">
      {variant === 'invitation' ? (
        <InvitationVignette progress={progress} stepIndex={stepIndex} />
      ) : variant === 'room' ? (
        <RoomVignette progress={progress} />
      ) : (
        <BudgetVignette stepIndex={stepIndex} />
      )}
      <Icon className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-festive-on-stage drop-shadow" aria-hidden />
    </div>
  );
}

export function AiProcessFullscreenLoader({
  active,
  eyebrow,
  title,
  footnote,
  steps,
  stageHint,
  icon: Icon = Sparkles,
  variant = 'invitation',
}: {
  active: boolean;
  eyebrow: string;
  title: string;
  footnote?: string;
  steps: AiProcessStep[];
  stageHint?: string | null;
  icon?: LucideIcon;
  variant?: AiLoaderVariant;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [waitLine, setWaitLine] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setProgress(0);
      setElapsed(0);
      setWaitLine(0);
      return;
    }
    setProgress(PROGRESS_START);
    setElapsed(0);
    setWaitLine(0);
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
    const elapsedTimer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    const waitTimer = window.setInterval(() => {
      setWaitLine((value) => (value + 1) % WAIT_LINES.length);
    }, 4200);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
      window.clearInterval(elapsedTimer);
      window.clearInterval(waitTimer);
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
  const elapsedLabel = elapsed < 60 ? `${elapsed} s` : `${Math.floor(elapsed / 60)} min ${elapsed % 60} s`;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="em-stage fixed inset-0 z-[12000] flex items-center justify-center px-5"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="ai-process-loader-title"
      aria-describedby="ai-process-loader-desc"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl motion-safe:animate-pulse" />
        <div className="absolute bottom-[-3rem] right-[-2rem] h-72 w-72 rounded-full bg-festive-accent/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md text-center text-stage-foreground">
        <div className="relative mx-auto mb-7 h-36 w-36">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(from -90deg, var(--primary-solid) ${shownProgress}%, color-mix(in srgb, var(--stage-foreground) 12%, transparent) 0)`,
            }}
            aria-hidden
          />
          <div className="absolute inset-[8px] rounded-full bg-stage-elevated border border-stage-foreground/10 flex items-center justify-center overflow-hidden">
            <StudioVignette variant={variant} progress={shownProgress} stepIndex={stepIndex} Icon={Icon} />
          </div>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2
          id="ai-process-loader-title"
          className="mt-2 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-stage-foreground"
        >
          {title}
        </h2>
        <p id="ai-process-loader-desc" className="mt-2 text-sm text-stage-foreground/75 leading-relaxed">
          {stageHint || current.label}
        </p>
        {footnote ? <p className="mt-1 text-xs text-stage-foreground/50">{footnote}</p> : null}

        <div className="mt-5 space-y-1.5">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-stage-foreground/10"
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
          <p className="text-xs text-stage-foreground/50 tabular-nums">
            {shownProgress} % · {elapsedLabel}
          </p>
        </div>

        <ol className="mt-6 space-y-2 text-left" aria-label="Étapes en cours">
          {steps.map((step, index) => {
            const isCurrent = index === stepIndex;
            const isDone = index < stepIndex;
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs transition-colors duration-500',
                  isCurrent
                    ? 'border-primary/45 bg-primary/15 text-stage-foreground'
                    : isDone
                      ? 'border-stage-foreground/10 bg-stage-foreground/5 text-stage-foreground/70'
                      : 'border-stage-foreground/5 bg-stage-foreground/[0.03] text-stage-foreground/40',
                )}
              >
                <span
                  className={cn(
                    'w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0',
                    isCurrent
                      ? 'bg-primary-solid text-primary-foreground'
                      : isDone
                        ? 'bg-primary/25 text-primary'
                        : 'bg-stage-foreground/10 text-stage-foreground/50',
                  )}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" aria-hidden /> : index + 1}
                </span>
                <span className="font-semibold">{step.label}</span>
                {isCurrent ? (
                  <span className="ml-auto flex gap-1" aria-hidden>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary motion-safe:animate-pulse [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary motion-safe:animate-pulse [animation-delay:240ms]" />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <p className="mt-6 text-xs text-stage-foreground/45" aria-live="polite">
          {WAIT_LINES[waitLine]} La génération continue jusqu’à la fin.
        </p>
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
      variant="invitation"
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
      variant="budget"
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
      variant="room"
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

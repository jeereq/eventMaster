'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BrandLogoIcon } from '@/components/SiteBrandMark';
import {
  isLocalAudioMuted,
  setLocalAudioMuted,
  playStudioStepSound,
  unlockAudioNotifications,
} from '@/lib/audioNotifications';

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
const PROGRESS_TICK_MS = 350;
const PROGRESS_START = 8;
const PROGRESS_CAP = 94;

export function nextAiLoaderStepIndex(current: number, stepCount: number): number {
  if (stepCount <= 0) return 0;
  return Math.min(current + 1, stepCount - 1);
}

export function nextAiLoaderProgress(current: number): number {
  if (current >= PROGRESS_CAP) return current;
  const remaining = PROGRESS_CAP - current;
  return Math.min(PROGRESS_CAP, current + Math.max(1.2, remaining * 0.085));
}

const LOADER_VARIANT_META: Record<AiLoaderVariant, { badge: string; progressLabel: string }> = {
  invitation: { badge: 'Invitation 9:16', progressLabel: 'Progression de la carte' },
  room: { badge: 'Plan de salle', progressLabel: 'Progression du plan' },
  budget: { badge: 'Budget', progressLabel: 'Progression du calcul' },
};

const LOADER_FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function listLoaderFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(LOADER_FOCUSABLE_SELECTOR)).filter(
    (node) => node.getClientRects().length > 0,
  );
}

function cycleLoaderFocus(root: HTMLElement, event: KeyboardEvent) {
  const items = listLoaderFocusable(root);
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  const goingBack = event.shiftKey;
  if (currentIndex === -1) {
    event.preventDefault();
    (goingBack ? items[items.length - 1] : items[0]).focus();
    return;
  }
  const wrapStart = goingBack && currentIndex === 0;
  const wrapEnd = !goingBack && currentIndex === items.length - 1;
  if (!wrapStart && !wrapEnd) return;
  event.preventDefault();
  (wrapStart ? items[items.length - 1] : items[0]).focus();
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`;
}

/** Logo du site entouré d’un fin anneau qui tourne : signe d’activité sobre, sans décor. */
function LoaderBrandSpinner() {
  return (
    <div className="relative w-20 h-20 mx-auto" aria-hidden>
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
        <circle cx="40" cy="40" r="36" fill="none" strokeWidth="3" className="stroke-stage-foreground/10" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="60 167"
          className="stroke-emerald-300 origin-center motion-safe:animate-spin [animation-duration:1.4s]"
        />
      </svg>
      <span className="absolute inset-3 rounded-2xl bg-black flex items-center justify-center">
        <BrandLogoIcon className="w-9 h-9" />
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ÉCRAN DE CHARGEMENT DES STUDIOS IA (budget, invitation, plan de salle)
   Une carte centrée : logo, titre, étape en cours, barre de progression,
   liste courte des étapes et une sortie claire (« Continuer en arrière-plan »).
───────────────────────────────────────────────────────────── */
export function AiProcessFullscreenLoader({
  active,
  title,
  footnote,
  steps,
  stageHint,
  variant = 'invitation',
  onContinueInBackground,
}: {
  active: boolean;
  title: string;
  footnote?: string;
  steps: AiProcessStep[];
  stageHint?: string | null;
  variant?: AiLoaderVariant;
  onContinueInBackground?: () => void;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [muted, setMuted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevStepIndexRef = useRef(0);

  useEffect(() => {
    setMounted(true);
    setMuted(isLocalAudioMuted());
  }, []);

  // Petit son à chaque étape franchie (coupable depuis l’écran).
  useEffect(() => {
    if (active && stepIndex > prevStepIndexRef.current) {
      playStudioStepSound();
    }
    prevStepIndexRef.current = stepIndex;
  }, [active, stepIndex]);

  // Horloge d'étape et progression
  useEffect(() => {
    if (!active) {
      setStepIndex(0);
      setProgress(0);
      setElapsed(0);
      return;
    }

    setProgress(PROGRESS_START);
    setElapsed(0);

    const elapsedTimer = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setStepIndex(Math.max(0, steps.length - 1));
      setProgress(PROGRESS_CAP);
      return () => window.clearInterval(elapsedTimer);
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
      window.clearInterval(elapsedTimer);
    };
  }, [active, steps.length]);

  // Verrouillage du scroll en arrière-plan
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);

  // Capture et maintien du focus d'accessibilité
  useEffect(() => {
    if (!active) return;
    rootRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (onContinueInBackground) onContinueInBackground();
        return;
      }
      if (event.key !== 'Tab') return;
      const root = rootRef.current;
      if (!root) return;
      cycleLoaderFocus(root, event);
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
  }, [active, onContinueInBackground]);

  if (!active || !mounted) return null;

  const current = steps[stepIndex] || steps[0];
  const shownProgress = Math.round(progress);
  const meta = LOADER_VARIANT_META[variant];

  return createPortal(
    <div
      ref={rootRef}
      tabIndex={-1}
      className="em-stage em-stage-overlay flex items-center justify-center p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom))] focus:outline-none"
      role="alertdialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="ai-process-loader-title"
      aria-describedby="ai-process-loader-desc"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-stage-foreground/15 bg-stage-elevated/85 backdrop-blur-md p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 min-h-8 px-3 rounded-full bg-stage-foreground/[0.06] border border-stage-foreground/15 text-xs font-semibold text-stage-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" aria-hidden />
            {meta.badge}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-xs tabular-nums text-stage-foreground/70" aria-label={`Temps écoulé : ${formatElapsed(elapsed)}`}>
              {formatElapsed(elapsed)}
            </span>
            <button
              type="button"
              onClick={() => {
                unlockAudioNotifications();
                const next = !muted;
                setMuted(next);
                setLocalAudioMuted(next);
              }}
              aria-label={muted ? 'Activer le son du studio' : 'Couper le son du studio'}
              aria-pressed={!muted}
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-full text-stage-foreground/70 hover:text-stage-foreground hover:bg-stage-foreground/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            </button>
          </div>
        </div>

        <div className="mt-4 text-center">
          <LoaderBrandSpinner />
          <h2
            id="ai-process-loader-title"
            className="mt-4 font-display text-xl sm:text-2xl font-bold tracking-tight text-stage-foreground"
          >
            {title}
          </h2>
          <p
            id="ai-process-loader-desc"
            className="mt-1.5 text-sm font-medium text-emerald-300 min-h-5"
            aria-live="polite"
          >
            {stageHint || current?.label}
          </p>
        </div>

        <div className="mt-5 space-y-1.5">
          <div
            className="h-2 overflow-hidden rounded-full bg-stage-foreground/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shownProgress}
            aria-label={meta.progressLabel}
          >
            <div
              className="h-full rounded-full bg-emerald-300 transition-[width] duration-300 ease-out"
              style={{ width: `${shownProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stage-foreground/70 tabular-nums">
            <span>
              Étape {Math.min(stepIndex + 1, steps.length)} sur {steps.length}
            </span>
            <span className="font-semibold text-stage-foreground">{shownProgress} %</span>
          </div>
        </div>

        <ol className="mt-4 space-y-1" aria-label="Étapes">
          {steps.map((step, index) => {
            const isCurrent = index === stepIndex;
            const isDone = index < stepIndex;
            return (
              <li
                key={step.id}
                className={cn(
                  'flex items-center gap-2.5 min-h-8 text-sm',
                  isCurrent
                    ? 'text-stage-foreground font-semibold'
                    : isDone
                      ? 'text-stage-foreground/70'
                      : 'text-stage-foreground/50',
                )}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0',
                    isDone
                      ? 'bg-emerald-300 text-emerald-900'
                      : isCurrent
                        ? 'border-2 border-emerald-300'
                        : 'border border-stage-foreground/25',
                  )}
                  aria-hidden
                >
                  {isDone ? (
                    <Check className="w-3 h-3" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
                  ) : null}
                </span>
                <span className="flex-1 truncate">{step.label}</span>
                <span className="sr-only">{isDone ? ' (fait)' : isCurrent ? ' (en cours)' : ''}</span>
              </li>
            );
          })}
        </ol>

        {footnote ? (
          <p className="mt-4 text-xs text-stage-foreground/65 text-center leading-relaxed">{footnote}</p>
        ) : null}

        {onContinueInBackground ? (
          <div className="mt-5 space-y-1.5">
            <button
              type="button"
              onClick={onContinueInBackground}
              className="w-full inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-lg bg-primary-solid text-primary-foreground text-sm font-semibold hover:bg-primary-solid-hover transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--stage)]"
            >
              Continuer en arrière-plan
              <ChevronRight className="w-4 h-4" aria-hidden />
            </button>
            <p className="text-xs text-stage-foreground/60 text-center">
              Le travail continue, le résultat s’affichera tout seul.
            </p>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ─────────────────────────────────────────────────────────────
   EXPORTS SPÉCIFIQUES POUR CHAQUE STUDIO
───────────────────────────────────────────────────────────── */
export default function AiComposeFullscreenLoader({
  active,
  embedText = false,
  hasReferences = false,
  stageHint,
  title = 'Création de votre invitation',
  footnote,
  onContinueInBackground,
}: {
  active: boolean;
  embedText?: boolean;
  hasReferences?: boolean;
  stageHint?: string | null;
  title?: string;
  footnote?: string;
  onContinueInBackground?: () => void;
}) {
  const steps = COMPOSE_STEPS.map((step) => {
    if (step.id === 'faces' && !hasReferences) {
      return { ...step, label: 'Ambiance, matières & textures' };
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
      title={title}
      stageHint={stageHint}
      steps={steps}
      onContinueInBackground={onContinueInBackground}
      footnote={
        footnote ||
        (hasReferences
          ? 'Les regards, sourires et volumes faciaux restent fidèles aux photos de référence.'
          : 'Une carte 9:16 composée à partir de votre brief.')
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
      title="Calcul de votre budget"
      stageHint={stageHint}
      steps={BUDGET_STEPS}
      footnote="Prix tirés des salles et prestataires de votre ville."
    />
  );
}

export function AiRoomPlanFullscreenLoader({
  active,
  hasPhoto = false,
  stageHint,
  onContinueInBackground,
}: {
  active: boolean;
  hasPhoto?: boolean;
  stageHint?: string | null;
  onContinueInBackground?: () => void;
}) {
  const steps = hasPhoto
    ? ROOM_PLAN_STEPS
    : ROOM_PLAN_STEPS.filter((step) => step.id !== 'photo');

  return (
    <AiProcessFullscreenLoader
      active={active}
      variant="room"
      title="Création de votre plan de salle"
      stageHint={stageHint}
      steps={steps}
      onContinueInBackground={onContinueInBackground}
      footnote={
        hasPhoto
          ? 'Le plan suit la forme de la salle sur votre photo.'
          : 'Tables, allées et scène placées pour une circulation fluide.'
      }
    />
  );
}

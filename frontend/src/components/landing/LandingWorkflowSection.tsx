'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowLeft, CheckCircle2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { usePlatformSite } from '@/context/PlatformSiteContext';
import { interpolateRates } from '@/lib/platformRates';
import {
  LANDING_PROFILES,
  getLandingProfile,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { useLandingReveal } from '@/components/landing/useLandingReveal';

export default function LandingWorkflowSection({
  profileId,
  onProfileChange,
}: {
  profileId: LandingProfileId;
  onProfileChange: (id: LandingProfileId) => void;
}) {
  const { site } = usePlatformSite();
  const revealRef = useLandingReveal<HTMLElement>();
  const [stepIndex, setStepIndex] = useState(0);
  const tabsId = useId();
  const source = getLandingProfile(profileId);

  const journey = useMemo(
    () => ({
      ...source,
      intro: interpolateRates(source.intro, site),
      steps: source.steps.map((step) => ({
        ...step,
        description: interpolateRates(step.description, site),
        detail: interpolateRates(step.detail, site),
      })),
    }),
    [source, site],
  );

  const step = journey.steps[stepIndex] ?? journey.steps[0];
  const StepIcon = step.icon;
  const progress = ((stepIndex + 1) / journey.steps.length) * 100;

  useEffect(() => {
    setStepIndex(0);
  }, [profileId]);

  const goStep = useCallback(
    (next: number) => {
      setStepIndex(Math.max(0, Math.min(journey.steps.length - 1, next)));
    },
    [journey.steps.length],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      goStep(stepIndex + 1);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      goStep(stepIndex - 1);
    }
    if (event.key === 'Home') {
      event.preventDefault();
      goStep(0);
    }
    if (event.key === 'End') {
      event.preventDefault();
      goStep(journey.steps.length - 1);
    }
  };

  return (
    <section
      ref={revealRef}
      id="parcours"
      className="em-reveal py-16 sm:py-20 bg-background border-t border-border scroll-mt-16"
    >
      <div className="page-container space-y-8">
        <div className="max-w-2xl space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            En un clic
          </p>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">
            Voici exactement quoi faire
          </h2>
          <p className="text-sm text-muted leading-relaxed">{journey.intro}</p>
        </div>

        <div
          role="tablist"
          aria-label="Changer de profil"
          className="flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {LANDING_PROFILES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabsId}-${item.id}`}
              aria-selected={profileId === item.id}
              aria-controls={`${tabsId}-panel`}
              onClick={() => onProfileChange(item.id)}
              className={cn(
                'shrink-0 px-3 py-2 rounded-[var(--radius-button)] text-xs font-semibold transition border',
                profileId === item.id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-muted border-border hover:text-foreground hover:bg-surface-muted',
              )}
            >
              {item.shortLabel}
            </button>
          ))}
        </div>

        <div
          id={`${tabsId}-panel`}
          role="tabpanel"
          aria-labelledby={`${tabsId}-${profileId}`}
          className="rounded-[var(--radius-card)] border border-border bg-surface overflow-hidden"
          onKeyDown={onKeyDown}
        >
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
            <div className="p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-border space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{journey.eyebrow}</p>
                <h3 className="text-lg font-semibold text-foreground tracking-tight">{journey.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{journey.registerHint}</p>
              </div>

              <div className="space-y-1" role="list" aria-label="Étapes du parcours">
                {journey.steps.map((item, index) => {
                  const Icon = item.icon;
                  const selected = index === stepIndex;
                  const done = index < stepIndex;
                  return (
                    <button
                      key={item.title}
                      type="button"
                      role="listitem"
                      aria-current={selected ? 'step' : undefined}
                      onClick={() => setStepIndex(index)}
                      className={cn(
                        'w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-[var(--radius-button)] border transition',
                        selected
                          ? 'bg-primary/5 border-primary/25'
                          : 'bg-transparent border-transparent hover:bg-surface-muted',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-button)] border text-[11px] font-bold',
                          selected
                            ? 'bg-primary text-white border-primary'
                            : done
                              ? 'bg-surface-muted text-foreground border-border'
                              : 'bg-surface text-muted border-border',
                        )}
                      >
                        {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <Icon className="w-3.5 h-3.5 text-muted shrink-0" />
                          <span className={cn('text-sm font-semibold', selected ? 'text-foreground' : 'text-foreground/80')}>
                            {item.title}
                          </span>
                        </span>
                        <span className="block text-xs text-muted leading-relaxed mt-0.5 line-clamp-2">
                          {item.description}
                        </span>
                      </span>
                      <ChevronRight className={cn('w-4 h-4 shrink-0 mt-1', selected ? 'text-primary' : 'text-border')} />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 sm:p-7 flex flex-col bg-background/40">
              <div className="flex items-center justify-between gap-3 mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Étape {stepIndex + 1} / {journey.steps.length}
                </p>
                <div className="flex-1 max-w-[140px] h-1 rounded-full bg-surface-muted overflow-hidden" aria-hidden>
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className="inline-flex items-center justify-center w-11 h-11 rounded-[var(--radius-button)] border border-border bg-surface text-foreground mb-4">
                <StepIcon className="w-5 h-5" />
              </div>
              <h4 className="text-xl font-semibold text-foreground tracking-tight">{step.title}</h4>
              <p className="text-sm text-muted leading-relaxed mt-2">{step.detail}</p>

              <div className="mt-5 rounded-[var(--radius-card)] border border-border bg-surface p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">À cette étape</p>
                <p className="text-sm font-medium text-foreground leading-relaxed">{step.outcome}</p>
              </div>

              <div className="mt-auto pt-6 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goStep(stepIndex - 1)}
                    disabled={stepIndex === 0}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-button)] border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-surface-muted transition"
                    aria-label="Étape précédente"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goStep(stepIndex + 1)}
                    disabled={stepIndex === journey.steps.length - 1}
                    className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-button)] border border-border bg-surface text-foreground disabled:opacity-40 hover:bg-surface-muted transition"
                    aria-label="Étape suivante"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-muted hidden sm:block">Flèches du clavier pour parcourir</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 sm:px-6 py-4 border-t border-border bg-surface">
            <Link href={journey.cta.href}>
              <Button size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {journey.cta.label}
              </Button>
            </Link>
            <div className="flex flex-wrap gap-2">
              {journey.results.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-button)] bg-background border border-border text-xs font-medium text-foreground"
                >
                  <Icon className="w-3.5 h-3.5 text-muted" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

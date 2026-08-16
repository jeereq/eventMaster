'use client';

import React, { useEffect } from 'react';
import { useTour } from '@/context/TourContext';
import { ChevronLeft, ChevronRight, X, Loader2, MapPin } from 'lucide-react';

export default function ProductTourOverlay() {
  const {
    isActive,
    currentStep,
    stepIndex,
    steps,
    nextStep,
    prevStep,
    stopTour,
    targetRect,
    waitingForTarget,
  } = useTour();

  useEffect(() => {
    if (!isActive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isActive]);

  if (!isActive || !currentStep) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const cardStyle: React.CSSProperties = (() => {
    if (typeof window === 'undefined') return { position: 'fixed', zIndex: 10002 };
    if (targetRect) {
      return {
        position: 'fixed',
        top: Math.min(targetRect.bottom + 12, window.innerHeight - 220),
        left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 340)),
        maxWidth: 320,
        zIndex: 10002,
      };
    }
    return {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      maxWidth: 360,
      zIndex: 10002,
    };
  })();

  return (
    <>
      <div className="fixed inset-0 z-[10000] pointer-events-none" aria-hidden>
        {!targetRect && (
          <div className="absolute inset-0 bg-foreground/60 backdrop-blur-[2px] pointer-events-auto" />
        )}
      </div>

      {targetRect && (
        <div
          className="fixed z-[10001] pointer-events-none rounded-xl ring-4 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)',
          }}
        />
      )}

      <div
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-desc"
        className="bg-surface border border-border rounded-[var(--radius-card)] shadow-2xl p-5 space-y-4 pointer-events-auto"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-primary">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {currentStep.target ? (
                <span>Onglet du menu · {stepIndex + 1}/{steps.length}</span>
              ) : (
                <span>Étape {stepIndex + 1}/{steps.length}</span>
              )}
            </div>
            <h2 id="tour-title" className="font-extrabold text-foreground text-sm leading-snug">
              {currentStep.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={stopTour}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-muted transition shrink-0"
            aria-label="Quitter la visite"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p id="tour-desc" className="text-xs text-muted leading-relaxed">
          {currentStep.description}
        </p>

        <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {waitingForTarget && (
          <p className="text-[10px] text-muted flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Chargement de l&apos;élément…
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={prevStep}
            disabled={isFirst}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-muted border border-border disabled:opacity-40 hover:bg-surface-muted transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Précédent
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-white transition"
          >
            {isLast ? 'Terminer' : 'Suivant'}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
}

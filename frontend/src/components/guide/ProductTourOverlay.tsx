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
      <div className="fixed inset-0 z-[10000] pointer-events-auto" aria-hidden>
        {!targetRect && <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]" />}
      </div>

      {targetRect && (
        <div
          className="fixed z-[10001] pointer-events-none rounded-xl ring-4 ring-indigo-500 ring-offset-2 ring-offset-transparent transition-all duration-300"
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
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-5 space-y-4 pointer-events-auto"
        style={cardStyle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {currentStep.target ? (
                <span>Onglet du menu · {stepIndex + 1}/{steps.length}</span>
              ) : (
                <span>Étape {stepIndex + 1}/{steps.length}</span>
              )}
            </div>
            <h2 id="tour-title" className="font-extrabold text-slate-900 dark:text-white text-sm leading-snug">
              {currentStep.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={stopTour}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Quitter la visite"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p id="tour-desc" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {currentStep.description}
        </p>

        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {waitingForTarget && (
          <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            Chargement de l&apos;élément…
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={prevStep}
            disabled={isFirst}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Précédent
          </button>
          <button
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition"
          >
            {isLast ? 'Terminer' : 'Suivant'}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </>
  );
}

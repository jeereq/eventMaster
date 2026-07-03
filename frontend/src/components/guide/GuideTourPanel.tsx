'use client';

import React from 'react';
import { Play, RotateCcw, ListOrdered, LayoutGrid } from 'lucide-react';
import { useTour } from '@/context/TourContext';
import { useAuth } from '@/context/AuthContext';
import { getProductTour } from '@/config/productTours';
import type { UserGuideId } from '@/config/userGuides';
import { getGuideLabel } from '@/lib/resolveUserGuideRole';

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
      <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
        Aucune visite guidée disponible pour ce profil.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            Visite des onglets — {getGuideLabel(guideId)}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Tour interactif de <strong className="font-semibold text-slate-800 dark:text-slate-200">{tabSteps.length} onglets</strong> de
            votre menu. Chaque étape met en surbrillance un onglet et décrit ce que vous pouvez y faire. Relancez quand vous voulez.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startTour(guideId, access)}
          disabled={isActive}
          className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-sm transition shadow-md shadow-indigo-500/20"
        >
          {isActive ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              Visite en cours…
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Lancer la visite des onglets
            </>
          )}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Onglets parcourus ({tabSteps.length})
        </h3>
        <ol className="space-y-3">
          {tabSteps.map((step, i) => (
            <li
              key={step.id}
              className="flex gap-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed"
            >
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <LayoutGrid className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{step.title}</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

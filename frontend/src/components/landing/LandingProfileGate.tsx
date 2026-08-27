'use client';

import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  type LandingProfileId,
} from '@/lib/landingProfiles';
import { Check, Sparkles } from 'lucide-react';

export default function LandingProfileGate({
  selectedId,
  onSelect,
}: {
  selectedId: LandingProfileId;
  onSelect: (id: LandingProfileId) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Choisissez votre objectif
          </p>
          <p className="text-xs sm:text-sm text-muted">
            Sélectionnez votre profil pour adapter instantanément les outils et le parcours.
          </p>
        </div>
        <span className="hidden sm:inline-block text-[11px] font-medium text-muted bg-surface px-2.5 py-1 rounded-full border border-border">
          4 profils adaptés
        </span>
      </div>

      <ul
        id="profils"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5"
        role="list"
      >
        {LANDING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const selected = selectedId === profile.id;
          return (
            <li key={profile.id} className="w-full">
              <button
                type="button"
                onClick={() => onSelect(profile.id)}
                aria-pressed={selected}
                className={cn(
                  'w-full h-full text-left rounded-xl border p-4 sm:p-4.5 transition-all duration-200 flex flex-col justify-between relative overflow-hidden',
                  selected
                    ? 'border-primary bg-primary/[0.04] shadow-md ring-2 ring-primary/30'
                    : 'border-border bg-surface hover:border-foreground/20 hover:bg-surface/80 shadow-xs',
                )}
              >
                {/* Indicateur de sélection */}
                {selected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] shadow-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}

                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
                        selected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/30 text-foreground/80',
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-0.5 rounded bg-muted/20">
                      {profile.eyebrow}
                    </span>
                  </div>

                  <h3
                    className={cn(
                      'text-sm font-bold mb-1 leading-snug',
                      selected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {profile.label}
                  </h3>

                  <p className="text-xs text-muted leading-relaxed line-clamp-2 mb-3">
                    {profile.intro}
                  </p>
                </div>

                {/* 3 micro-pills visuels */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
                  {profile.results.map((res) => {
                    const ResIcon = res.icon;
                    return (
                      <span
                        key={res.label}
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                          selected
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'bg-muted/30 text-muted-foreground',
                        )}
                      >
                        <ResIcon className="w-2.5 h-2.5" />
                        {res.label}
                      </span>
                    );
                  })}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

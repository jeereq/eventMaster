'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  LANDING_PROFILES,
  type LandingProfileId,
} from '@/lib/landingProfiles';

export default function LandingProfileGate({
  selectedId,
  onSelect,
}: {
  selectedId: LandingProfileId;
  onSelect: (id: LandingProfileId) => void;
}) {
  return (
    <div className="mt-10 space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
          Vous venez pour… ?
        </h2>
        <p className="text-sm text-muted">Un clic. Le parcours, les tarifs et les questions s’adaptent.</p>
      </div>

      <ul id="profils" className="em-landing-hero-grid" role="list">
        {LANDING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const selected = selectedId === profile.id;
          return (
            <li key={profile.id}>
              <button
                type="button"
                onClick={() => onSelect(profile.id)}
                aria-pressed={selected}
                className={cn(
                  'group relative w-full h-full text-left rounded-[var(--radius-card)] border p-4 sm:p-5 transition duration-200',
                  'hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]',
                  selected
                    ? 'bg-surface border-primary ring-2 ring-primary/25 shadow-[var(--shadow-soft)]'
                    : 'bg-surface/80 border-border hover:border-foreground/20',
                )}
              >
                <span
                  className={cn(
                    'mb-3 flex h-10 w-10 items-center justify-center rounded-[var(--radius-button)] border',
                    selected
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface-muted text-[color:var(--festive-accent)] border-border group-hover:border-foreground/15',
                  )}
                >
                  {selected ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <Icon className="w-5 h-5" />}
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  {profile.eyebrow}
                </p>
                <p className="text-sm font-semibold text-foreground mb-1 leading-snug">{profile.label}</p>
                <p className="text-xs text-muted leading-relaxed mb-3">{profile.examples}</p>
                <p className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] font-medium text-muted">
                  {profile.clicks.map((click, index) => (
                    <span key={click} className="inline-flex items-center gap-1">
                      {index > 0 ? <span className="text-border" aria-hidden>→</span> : null}
                      <span className={selected ? 'text-foreground' : undefined}>{click}</span>
                    </span>
                  ))}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

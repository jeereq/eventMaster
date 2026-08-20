'use client';

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
    <div className="mt-12 space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Vous venez pour… ?</p>
        <p className="text-sm text-muted">Un clic. Le parcours, les tarifs et les questions s’adaptent.</p>
      </div>

              <ul id="profils" className="em-landing-hero-grid em-stagger" role="list">
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
                  'w-full h-full text-left rounded-[var(--radius-card)] border bg-surface p-4 shadow-[var(--shadow-soft)] em-soft-hover transition',
                  selected
                    ? 'border-foreground/20'
                    : 'border-border hover:border-foreground/15',
                )}
              >
                <Icon className="w-5 h-5 text-[color:var(--festive-accent)] mb-3" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  {profile.eyebrow}
                </p>
                <h2 className="text-sm font-semibold text-foreground mb-1">{profile.label}</h2>
                <p className="text-xs text-muted leading-relaxed">{profile.examples}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

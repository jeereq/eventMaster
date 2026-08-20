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
    <ul id="profils" className="em-landing-hero-grid mt-10" role="list">
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
                'w-full h-full text-left rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-soft)] transition',
                selected
                  ? 'bg-surface border-primary ring-1 ring-primary/30'
                  : 'bg-surface border-border hover:border-foreground/20 hover:bg-surface-muted/60',
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
  );
}

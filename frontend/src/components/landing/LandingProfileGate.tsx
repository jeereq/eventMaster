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
      <div className="space-y-1 px-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Vous venez pour… ?</p>
        <p className="text-sm text-muted">Faites glisser et choisissez le profil qui vous correspond.</p>
      </div>

      <ul
        id="profils"
        className="flex overflow-x-auto snap-x snap-mandatory flex-nowrap gap-3 pb-4 pt-1 px-1 -mx-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:snap-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {LANDING_PROFILES.map((profile) => {
          const Icon = profile.icon;
          const selected = selectedId === profile.id;
          return (
            <li key={profile.id} className="snap-center shrink-0 w-[75vw] sm:w-auto">
              <button
                type="button"
                onClick={() => onSelect(profile.id)}
                aria-pressed={selected}
                className={cn(
                  'w-full h-full text-left rounded-[var(--radius-card)] border bg-surface p-4 sm:p-5 shadow-[var(--shadow-soft)] em-soft-hover transition',
                  selected
                    ? 'border-primary/40 ring-1 ring-primary/40'
                    : 'border-border hover:border-foreground/15',
                )}
              >
                <Icon className="w-6 h-6 text-[color:var(--festive-accent)] mb-4" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1.5">
                  {profile.eyebrow}
                </p>
                <h2 className="text-sm font-semibold text-foreground mb-1.5">{profile.label}</h2>
                <p className="text-xs text-muted leading-relaxed line-clamp-3 sm:line-clamp-none">{profile.examples}</p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

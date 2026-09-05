'use client';

import React from 'react';
import Link from 'next/link';
import { ImagePlus, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AI_ROOM_PLAN_TOKEN_COST } from '@/lib/aiTokens';

export type PlanCreationPathId = 'manual' | 'photo';

const OPTIONS: Array<{
  id: PlanCreationPathId;
  label: string;
  description: string;
  icon: typeof Pencil;
}> = [
  {
    id: 'manual',
    label: 'À la main',
    description: 'Placez tables, murs et décor avec les outils.',
    icon: Pencil,
  },
  {
    id: 'photo',
    label: 'Depuis une photo',
    description: `L’IA reprend ce qui est visible — emplacements, couleurs, matières. ${AI_ROOM_PLAN_TOKEN_COST} jetons.`,
    icon: ImagePlus,
  },
];

export default function PlanCreationPath({
  value,
  onChange,
  photoLocked = false,
  busy = false,
  heading = 'Créer le plan',
}: {
  value?: PlanCreationPathId;
  onChange: (next: PlanCreationPathId) => void;
  photoLocked?: boolean;
  busy?: boolean;
  heading?: string;
}) {
  const headingId = React.useId();

  return (
    <section className="space-y-2 min-w-0" aria-labelledby={headingId} aria-busy={busy || undefined}>
      <h3 id={headingId} className="text-sm font-semibold text-foreground">
        {heading}
      </h3>
      <div
        role="radiogroup"
        aria-labelledby={headingId}
        className="grid sm:grid-cols-2 gap-2"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const selected = value === option.id;
          const locked = option.id === 'photo' && photoLocked;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={locked || undefined}
              disabled={locked || busy}
              onClick={() => {
                if (locked || busy) return;
                onChange(option.id);
              }}
              className={cn(
                'text-left p-3.5 rounded-[var(--radius-card)] border min-h-11 min-w-0 transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                'disabled:cursor-not-allowed disabled:opacity-60',
                selected
                  ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                  : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted',
              )}
            >
              <p className="text-sm font-bold text-foreground flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 shrink-0 text-primary" aria-hidden />
                <span className="truncate">{option.label}</span>
              </p>
              <p className={cn(
                'text-sm mt-1 leading-snug break-words',
                selected ? 'text-foreground' : 'text-muted',
              )}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
      {photoLocked ? (
        <p className="text-sm text-foreground">
          L’import photo n’est pas inclus dans ce forfait.{' '}
          <Link
            href="/dashboard/billing"
            className="font-semibold text-primary underline-offset-2 hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Voir les forfaits
          </Link>
        </p>
      ) : null}
    </section>
  );
}

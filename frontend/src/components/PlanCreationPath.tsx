'use client';

import React, { useId, useRef, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, Pencil } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AI_ROOM_PLAN_TOKEN_COST } from '@/lib/aiTokens';
import { ROOM_PLAN_PHOTO_ACCEPT, roomPlanPhotoError } from '@/lib/roomPlanAi';

export type PlanCreationPathId = 'manual' | 'photo';

export default function PlanCreationPath({
  value,
  onChange,
  onPhotoFile,
  photoLocked = false,
  busy = false,
  heading = 'Créer le plan',
}: {
  value?: PlanCreationPathId;
  onChange: (next: PlanCreationPathId) => void;
  onPhotoFile?: (file: File) => void;
  photoLocked?: boolean;
  busy?: boolean;
  heading?: string;
}) {
  const headingId = useId();
  const photoInputId = useId();
  const photoErrorId = useId();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState('');

  const pickPhoto = () => {
    if (photoLocked || busy) return;
    setPhotoError('');
    photoInputRef.current?.click();
  };

  return (
    <section className="space-y-2 min-w-0" aria-labelledby={headingId} aria-busy={busy || undefined}>
      <h3 id={headingId} className="text-sm font-semibold text-foreground">
        {heading}
      </h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={value === 'manual'}
          disabled={busy}
          onClick={() => onChange('manual')}
          className={cn(
            'text-left p-3.5 rounded-[var(--radius-card)] border min-h-11 min-w-0 transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            'disabled:cursor-not-allowed disabled:opacity-60',
            value === 'manual'
              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
              : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted',
          )}
        >
          <p className="text-sm font-bold text-foreground flex items-center gap-2 min-w-0">
            <Pencil className="w-4 h-4 shrink-0 text-primary-solid" aria-hidden />
            <span className="truncate">À la main</span>
          </p>
          <p className={cn('text-sm mt-1 leading-snug break-words', value === 'manual' ? 'text-foreground' : 'text-muted')}>
            Placez tables, murs et décor avec les outils.
          </p>
        </button>

        <div className="min-w-0 space-y-2">
          <label htmlFor={photoInputId} className="sr-only">
            Choisir une photo de la salle
          </label>
          <input
            id={photoInputId}
            ref={photoInputRef}
            type="file"
            accept={ROOM_PLAN_PHOTO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            disabled={photoLocked || busy}
            aria-invalid={photoError ? true : undefined}
            aria-describedby={photoError ? photoErrorId : undefined}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              const problem = roomPlanPhotoError(file);
              if (problem) {
                setPhotoError(problem);
                return;
              }
              setPhotoError('');
              onPhotoFile?.(file);
              onChange('photo');
            }}
          />
          <button
            type="button"
            aria-pressed={value === 'photo'}
            aria-disabled={photoLocked || undefined}
            disabled={photoLocked || busy}
            onClick={pickPhoto}
            className={cn(
              'w-full text-left p-3.5 rounded-[var(--radius-card)] border min-h-11 min-w-0 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              'disabled:cursor-not-allowed disabled:opacity-60',
              value === 'photo'
                ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-muted',
            )}
          >
            <p className="text-sm font-bold text-foreground flex items-center gap-2 min-w-0">
              <ImagePlus className="w-4 h-4 shrink-0 text-primary-solid" aria-hidden />
              <span className="truncate">Choisir une photo de la salle</span>
            </p>
            <p className={cn('text-sm mt-1 leading-snug break-words', value === 'photo' ? 'text-foreground' : 'text-muted')}>
              L’IA analyse la photo, déduit tables, rangées et décor, puis les pose sur le plan. JPEG, PNG ou WebP, 10 Mo max. {AI_ROOM_PLAN_TOKEN_COST} jetons.
            </p>
          </button>
        </div>
      </div>
      {photoError ? (
        <p id={photoErrorId} role="alert" className="text-sm text-foreground">
          {photoError} Choisissez un autre fichier pour réessayer.
        </p>
      ) : null}
      {photoLocked ? (
        <p className="text-sm text-foreground">
          L’import photo n’est pas inclus dans ce forfait.{' '}
          <Link
            href="/dashboard/billing"
            className="font-semibold text-primary-solid underline-offset-2 hover:underline rounded-[var(--radius-button)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Voir les forfaits
          </Link>
        </p>
      ) : null}
    </section>
  );
}

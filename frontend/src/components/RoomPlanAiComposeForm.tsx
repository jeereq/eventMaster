'use client';

import React, { useRef, useState } from 'react';
import { AlertCircle, ImagePlus, PenLine, Upload, Users, X } from 'lucide-react';
import { ROOM_PLAN_PHOTO_ACCEPT } from '@/lib/roomPlanAi';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Formulaire « Composer » du Studio IA de l’éditeur de salle, partagé avec le simulateur
 * public et les studios du tableau de bord : même parcours, qu’on soit connecté ou non.
 * L’hôte garde l’appel IA, les jetons et l’application du plan.
 */

export type RoomPlanComposeIntent = 'brief' | 'photo';

export const ROOM_SCENARIOS = [
  { label: '💍 Mariage 100 pl.', prompt: 'Mariage princier 100 convives, tables rondes avec chemin d’honneur, piste de danse centrale et estrade d’honneur.' },
  { label: '🥂 Gala VIP 80 pl.', prompt: 'Gala de charité VIP 80 personnes, tables rondes de 8 places, espace cocktail avec mange-debout et estrade.' },
  { label: '🍽️ Bistrot & Lounge', prompt: 'Restaurant bistrot chic avec banquettes confortables le long des murs, tables duo, grand comptoir bar et tabourets.' },
  { label: '🎤 Conférence 120 pl.', prompt: 'Conférence plénière 120 places en rangées amphithéâtre, allée centrale dégagée, pupitre, estrade et écran géant.' },
  { label: '🌿 Plein air & Jardin', prompt: 'Terrasse festive en plein air, parasols, mange-debout, buffet traiteur avec pergola et guirlandes lumineuses.' },
];

const CAPACITY_PRESETS = [50, 80, 100, 150, 200];

function withCapacity(prompt: string, capacity: number): string {
  if (!prompt.trim()) return `Plan de réception pour ${capacity} personnes, disposition harmonieuse.`;
  if (/\b\d+\s*(personnes|convives|places|invités)\b/i.test(prompt)) {
    return prompt.replace(/\b\d+\s*(personnes|convives|places|invités)\b/i, `${capacity} personnes`);
  }
  return `${prompt.trim()}, prévu pour ${capacity} personnes.`;
}

export default function RoomPlanAiComposeForm({
  idPrefix,
  intent,
  onIntentChange,
  prompt,
  onPromptChange,
  file,
  previewUrl,
  onPickFile,
  onRemovePhoto,
  busy,
  error,
  onDismissError,
  onRetry,
  onRecharge,
  onShowExamples,
  beforeBrief,
  note,
}: {
  idPrefix: string;
  intent: RoomPlanComposeIntent;
  onIntentChange: (intent: RoomPlanComposeIntent) => void;
  prompt: string;
  onPromptChange: (next: string) => void;
  file: File | null;
  previewUrl: string;
  /** Reçoit le fichier choisi ou déposé ; l’hôte le valide. */
  onPickFile: (file: File | undefined) => void;
  onRemovePhoto: () => void;
  busy: boolean;
  error?: string;
  onDismissError: () => void;
  onRetry: () => void;
  onRecharge: () => void;
  onShowExamples: () => void;
  /** Champs propres à l’hôte, posés avant la description (ex. type de salle). */
  beforeBrief?: React.ReactNode;
  /** Rappel affiché sous le formulaire (ex. salle actuelle, plan remplacé). */
  note?: React.ReactNode;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept={ROOM_PLAN_PHOTO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Ajouter une photo de la salle"
        onChange={(event) => {
          onPickFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />

      <div role="radiogroup" aria-label="Point de départ" className="grid grid-cols-2 gap-1 p-1 rounded-[var(--radius-card)] bg-surface-muted border border-border">
        {([
          { id: 'brief', label: 'Décrire l’événement', hint: 'Quelques mots suffisent', icon: PenLine },
          { id: 'photo', label: 'Partir d’une photo', hint: 'Photo ou plan de la salle', icon: ImagePlus },
        ] as const).map((option) => {
          const active = intent === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={busy}
              onClick={() => onIntentChange(option.id)}
              className={cn(
                'min-h-11 px-3 py-2 rounded-[var(--radius-button)] text-left transition flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                active ? 'bg-surface shadow-[var(--shadow-soft)] text-foreground' : 'text-muted hover:text-foreground',
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', active ? 'text-primary-solid' : '')} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{option.label}</span>
                <span className="hidden sm:block text-xs text-muted truncate">{option.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {intent === 'photo' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) onPickFile(dropped);
          }}
          className={cn(
            'rounded-[var(--radius-card)] border-2 border-dashed transition overflow-hidden',
            isDraggingOver ? 'border-primary bg-primary/10' : 'border-border bg-surface',
          )}
        >
          {previewUrl ? (
            <div className="flex flex-col sm:flex-row gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Photo à analyser" className="w-full sm:w-40 h-32 object-cover rounded-[var(--radius-button)] border border-border" />
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-sm font-semibold text-foreground truncate">{file?.name}</p>
                <p className="text-xs text-muted">
                  {file ? `${(file.size / (1024 * 1024)).toFixed(2)} Mo` : ''} · l’IA reprend les murs, les tables et le décor visibles.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
                    Changer de photo
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onRemovePhoto}>
                    Retirer
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 px-4 py-8 text-center hover:bg-surface-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Upload className="w-5 h-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-foreground">Glissez une photo ici ou choisissez un fichier</span>
              <span className="text-xs text-muted">JPEG, PNG ou WebP jusqu’à 8 Mo · photo de la salle ou plan dessiné</span>
            </button>
          )}
        </div>
      ) : null}

      {beforeBrief}

      <label className="block space-y-1.5" htmlFor={`${idPrefix}-brief`}>
        <span className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            {intent === 'photo' ? 'Précisions (facultatif)' : 'Votre événement'}
          </span>
          <span className="text-xs text-muted tabular-nums">{prompt.length}/1500</span>
        </span>
        <textarea
          id={`${idPrefix}-brief`}
          rows={intent === 'photo' ? 2 : 4}
          maxLength={1500}
          value={prompt}
          disabled={busy}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={intent === 'photo'
            ? 'Ex. Garder la scène au fond, 10 tables rondes…'
            : 'Ex. Mariage de 120 invités, tables rondes, piste de danse au centre, estrade d’honneur…'}
          className="w-full rounded-[var(--radius-button)] border border-border bg-surface px-3.5 py-2.5 text-base sm:text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
        />
      </label>

      {intent === 'brief' ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted font-semibold flex items-center gap-1 mr-0.5">
              <Users className="w-3.5 h-3.5 text-primary" aria-hidden />
              Invités
            </span>
            {CAPACITY_PRESETS.map((cap) => (
              <button
                key={cap}
                type="button"
                disabled={busy}
                onClick={() => onPromptChange(withCapacity(prompt, cap))}
                className="min-h-9 px-2.5 text-xs font-semibold rounded-full border border-border hover:border-primary/50 hover:bg-primary/10 text-foreground transition bg-surface"
              >
                {cap}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted font-semibold mr-0.5">Idées</span>
            {ROOM_SCENARIOS.map((sc) => (
              <button
                key={sc.label}
                type="button"
                disabled={busy}
                onClick={() => onPromptChange(sc.prompt)}
                aria-pressed={prompt === sc.prompt}
                className={cn(
                  'min-h-9 px-2.5 text-xs font-semibold rounded-full border transition',
                  prompt === sc.prompt
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-surface hover:border-primary/50 hover:bg-primary/5 text-foreground',
                )}
              >
                {sc.label}
              </button>
            ))}
            <button
              type="button"
              className="min-h-9 px-1 text-xs font-semibold text-primary hover:underline"
              onClick={onShowExamples}
            >
              Plus d’exemples
            </button>
          </div>
        </div>
      ) : null}

      {note ? <p className="text-xs text-muted leading-relaxed">{note}</p> : null}

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl border border-rose-500/50 bg-rose-50 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ring-1 ring-rose-500/20 animate-in fade-in"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-1 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                Composition interrompue
              </p>
              <p className="text-xs text-rose-800 dark:text-rose-200 mt-0.5 leading-relaxed break-words">{error}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {error.toLowerCase().includes('jeton') ? (
              <Button size="sm" type="button" onClick={onRecharge}>
                Recharger
              </Button>
            ) : (
              <Button size="sm" type="button" disabled={busy} onClick={onRetry}>
                Réessayer
              </Button>
            )}
            <button
              type="button"
              onClick={onDismissError}
              className="p-1 text-muted hover:text-foreground rounded"
              aria-label="Fermer l'erreur"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

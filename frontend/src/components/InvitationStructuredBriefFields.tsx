'use client';

import { cn } from '@/lib/cn';
import {
  INVITATION_BRIEF_LANGUAGE_OPTIONS,
  INVITATION_CEREMONY_OPTIONS,
  INVITATION_MOOD_CHIPS,
  toggleInvitationMood,
  type InvitationStructuredBrief,
} from '@/config/invitationStructuredBrief';

type InvitationStructuredBriefFieldsProps = {
  id: string;
  value: InvitationStructuredBrief;
  onChange: (next: InvitationStructuredBrief) => void;
  disabled?: boolean;
  compact?: boolean;
};

export default function InvitationStructuredBriefFields({
  id,
  value,
  onChange,
  disabled,
  compact,
}: InvitationStructuredBriefFieldsProps) {
  return (
    <div className={cn('space-y-3', compact && 'space-y-2.5')}>
      <div>
        <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>Cérémonie</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-ceremony`}>
          <span id={`${id}-ceremony`} className="sr-only">Type de cérémonie</span>
          {INVITATION_CEREMONY_OPTIONS.map((option) => {
            const selected = value.ceremony === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange({ ...value, ceremony: selected ? null : option.id })}
                className={cn(
                  'min-h-11 px-3 rounded-md text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
                  selected
                    ? 'border-primary/40 bg-primary-solid text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/40',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>Langue des textes</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-language`}>
          <span id={`${id}-language`} className="sr-only">Langue des calques</span>
          {INVITATION_BRIEF_LANGUAGE_OPTIONS.map((option) => {
            const selected = value.language === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange({ ...value, language: selected ? null : option.id })}
                className={cn(
                  'min-h-11 px-3 rounded-md text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
                  selected
                    ? 'border-primary/40 bg-primary-solid text-primary-foreground'
                    : 'border-border bg-surface text-foreground hover:border-primary/40',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className={cn('font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
          Ambiance <span className="font-medium text-muted">(3 mots max.)</span>
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-labelledby={`${id}-mood`}>
          <span id={`${id}-mood`} className="sr-only">Mots d’ambiance</span>
          {INVITATION_MOOD_CHIPS.map((chip) => {
            const selected = value.mood.includes(chip);
            return (
              <button
                key={chip}
                type="button"
                disabled={disabled}
                aria-pressed={selected}
                onClick={() => onChange({ ...value, mood: toggleInvitationMood(value.mood, chip) })}
                className={cn(
                  'min-h-11 px-3 rounded-md text-xs font-bold border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60',
                  selected
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-surface text-foreground hover:border-primary/40',
                )}
              >
                {chip}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-keep`} className={cn('block font-semibold text-foreground', compact ? 'text-xs' : 'text-sm')}>
          À garder absolument
        </label>
        <input
          id={`${id}-keep`}
          type="text"
          value={value.mustKeep}
          disabled={disabled}
          maxLength={160}
          onChange={(event) => onChange({ ...value, mustKeep: event.target.value })}
          placeholder="Ex. cadre doré, visages tels quels, date en haut…"
          className="mt-1.5 min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-60"
        />
      </div>
    </div>
  );
}

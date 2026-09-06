'use client';

import { Building2, History, Minus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { InvitationContextSource } from '@/lib/invitationContextSource';

const OPTIONS: Array<{
  id: InvitationContextSource;
  label: string;
  hint: string;
  icon: typeof Minus;
}> = [
  {
    id: 'none',
    label: 'Aucun',
    hint: 'Seulement le brief de cette demande',
    icon: Minus,
  },
  {
    id: 'org',
    label: 'Organisation',
    hint: 'Nom, type de compte et événements récents',
    icon: Building2,
  },
  {
    id: 'history',
    label: 'Historique',
    hint: 'Vos briefs d’invitation déjà demandés',
    icon: History,
  },
];

export default function InvitationContextSourcePicker({
  value,
  onChange,
  disabled = false,
  canUseOrg = false,
  id = 'invitation-context-source',
}: {
  value: InvitationContextSource;
  onChange: (source: InvitationContextSource) => void;
  disabled?: boolean;
  canUseOrg?: boolean;
  id?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-xs font-bold text-foreground">Contexte à appliquer</legend>
      <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
        Choisissez l’organisation ou votre historique de recherches — pas les deux.
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-legend`}
        className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2"
      >
        <span id={`${id}-legend`} className="sr-only">
          Contexte à appliquer
        </span>
        {OPTIONS.map((option) => {
          const orgLocked = option.id === 'org' && !canUseOrg;
          const selected = value === option.id;
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={orgLocked || disabled}
              disabled={disabled || orgLocked}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-surface-muted/40 hover:border-primary/30',
                (disabled || orgLocked) && 'opacity-60 cursor-not-allowed hover:border-border',
              )}
            >
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground">{option.label}</span>
                <span className="block text-[11px] text-muted mt-0.5 leading-relaxed">
                  {orgLocked ? 'Connectez-vous à une organisation pour l’utiliser.' : option.hint}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

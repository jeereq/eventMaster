'use client';

import { useRef } from 'react';
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
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const enabledIndices = OPTIONS.map((opt, i) => {
    const isLocked = opt.id === 'org' && !canUseOrg;
    return isLocked ? -1 : i;
  }).filter((i) => i !== -1);

  const activeIndex = OPTIONS.findIndex((opt) => opt.id === value);
  const rovingIndex = enabledIndices.includes(activeIndex)
    ? activeIndex
    : enabledIndices[0] ?? 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    if (disabled || enabledIndices.length === 0) return;

    const currentPos = enabledIndices.indexOf(currentIndex);
    let targetIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextPos = (currentPos + 1) % enabledIndices.length;
      targetIndex = enabledIndices[nextPos];
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevPos = (currentPos - 1 + enabledIndices.length) % enabledIndices.length;
      targetIndex = enabledIndices[prevPos];
    } else if (e.key === 'Home') {
      e.preventDefault();
      targetIndex = enabledIndices[0];
    } else if (e.key === 'End') {
      e.preventDefault();
      targetIndex = enabledIndices[enabledIndices.length - 1];
    }

    if (targetIndex !== null && targetIndex !== undefined) {
      const targetOpt = OPTIONS[targetIndex];
      onChange(targetOpt.id);
      buttonRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-xs font-bold text-foreground">Contexte à appliquer</legend>
      <p className="mt-0.5 text-xs text-muted leading-relaxed">
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
        {OPTIONS.map((option, index) => {
          const orgLocked = option.id === 'org' && !canUseOrg;
          const selected = value === option.id;
          const Icon = option.icon;
          const isFocusable = index === rovingIndex && !disabled && !orgLocked;

          return (
            <button
              key={option.id}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-disabled={orgLocked || disabled}
              tabIndex={isFocusable ? 0 : -1}
              disabled={disabled || orgLocked}
              onClick={() => onChange(option.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={cn(
                'min-h-[44px] flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected
                  ? 'border-primary-solid bg-primary/10 shadow-xs ring-1 ring-primary/20'
                  : 'border-border bg-surface-muted/40 hover:border-primary/40',
                (disabled || orgLocked) && 'opacity-60 cursor-not-allowed hover:border-border',
              )}
            >
              <Icon className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-foreground">{option.label}</span>
                <span className="block text-xs text-muted mt-0.5 leading-relaxed">
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

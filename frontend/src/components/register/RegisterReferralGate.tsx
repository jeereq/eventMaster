'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import { Input } from '@/components/ui';
import { cn } from '@/lib/cn';

type ReferralChoice = 'yes' | 'no';

export default function RegisterReferralGate({
  choice,
  onChoice,
  code,
  onCodeChange,
  fromLink,
}: {
  choice: ReferralChoice | null;
  onChoice: (next: ReferralChoice) => void;
  code: string;
  onCodeChange: (next: string) => void;
  fromLink: boolean;
}) {
  if (fromLink && code) {
    return (
      <div className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-card)] bg-primary/8 border border-primary/20 text-xs">
        <UserCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Parrainage déjà appliqué</p>
          <p className="text-muted mt-0.5">
            Code : <span className="font-mono font-bold text-foreground">{code}</span>
            {' '}— facultatif, vous pouvez le retirer.
          </p>
          <button
            type="button"
            onClick={() => {
              onChoice('no');
              onCodeChange('');
            }}
            className="mt-1.5 inline-flex items-center min-h-11 text-xs font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
          >
            Continuer sans parrain
          </button>
        </div>
      </div>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold text-foreground">
        Avez-vous été parrainé ?
      </legend>
      <p className="text-xs text-muted leading-relaxed">
        Un commercial EventMaster vous a-t-il transmis un code ? Ce n’est <strong className="font-semibold text-foreground">pas obligatoire</strong>. Sans parrain, continuez.
      </p>
      <div role="radiogroup" aria-label="Parrainage" className="grid grid-cols-2 gap-1.5">
        {([
          { id: 'no' as const, label: 'Non, je n’ai pas de parrain' },
          { id: 'yes' as const, label: 'Oui, j’ai un code' },
        ]).map((option) => {
          const selected = choice === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChoice(option.id)}
              className={cn(
                'min-h-11 px-3 py-2 rounded-[var(--radius-button)] border text-left text-xs font-semibold transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                  : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {choice === 'yes' && (
        <Input
          label="Code de parrainage — facultatif"
          id="referralCode"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
          placeholder="EM-XXXX-XXXX"
          hint="Si vous ne l’avez plus sous la main, laissez vide et continuez."
        />
      )}
    </fieldset>
  );
}

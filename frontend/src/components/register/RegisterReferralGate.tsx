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
      <div className="flex items-start gap-2.5 p-2.5 rounded-[var(--radius-card)] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs">
        <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">Parrainage déjà appliqué</p>
          <p className="text-emerald-700 dark:text-emerald-400 text-[11px] mt-0.5">
            Code : <span className="font-mono font-bold">{code}</span>
            {' '}— facultatif, vous pouvez le retirer.
          </p>
          <button
            type="button"
            onClick={() => {
              onChoice('no');
              onCodeChange('');
            }}
            className="mt-1.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 underline underline-offset-2"
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
      <p className="text-[11px] text-muted leading-relaxed">
        Un commercial EventMaster vous a-t-il transmis un code ? Ce n’est <strong className="font-semibold text-foreground">pas obligatoire</strong>. Sans parrain, continuez.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {([
          { id: 'no' as const, label: 'Non, je n’ai pas de parrain' },
          { id: 'yes' as const, label: 'Oui, j’ai un code' },
        ]).map((option) => {
          const selected = choice === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChoice(option.id)}
              className={cn(
                'min-h-11 px-3 py-2 rounded-[var(--radius-button)] border text-left text-xs font-semibold transition touch-manipulation',
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

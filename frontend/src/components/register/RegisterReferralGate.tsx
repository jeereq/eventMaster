'use client';

import React from 'react';
import { UserCheck } from 'lucide-react';
import { Input } from '@/components/ui';

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

  if (choice !== 'yes') {
    return (
      <button
        type="button"
        onClick={() => onChoice('yes')}
        className="text-xs font-semibold text-muted hover:text-foreground underline underline-offset-2 min-h-11 inline-flex items-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
      >
        J’ai un code de parrainage
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        label="Code de parrainage — facultatif"
        id="referralCode"
        value={code}
        onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
        placeholder="EM-XXXX-XXXX"
        hint="Laissez vide si vous ne l’avez plus. Ce n’est pas obligatoire."
      />
      <button
        type="button"
        onClick={() => {
          onChoice('no');
          onCodeChange('');
        }}
        className="text-xs font-semibold text-muted hover:text-foreground underline underline-offset-2 min-h-11 inline-flex items-center touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
      >
        Continuer sans parrain
      </button>
    </div>
  );
}

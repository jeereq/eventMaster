'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Input, { type InputProps } from './Input';

export default function PasswordInput({
  autoComplete = 'current-password',
  ...props
}: Omit<InputProps, 'type' | 'rightIcon' | 'rightAction'>) {
  const [visible, setVisible] = useState(false);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      rightAction={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-[var(--radius-button)] text-muted hover:text-foreground hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
        </button>
      }
    />
  );
}

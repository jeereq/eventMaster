'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Lien ou action à droite du label (ex. « Mot de passe oublié ? »). */
  labelExtra?: React.ReactNode;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Bouton ou contrôle cliquable à droite du champ. */
  rightAction?: React.ReactNode;
}

export default function Input({
  label,
  labelExtra,
  hint,
  error,
  leftIcon,
  rightIcon,
  rightAction,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const hasRight = Boolean(rightAction || rightIcon);

  return (
    <div className="space-y-1.5">
      {(label || labelExtra) && (
        <div className="flex items-center justify-between gap-2">
          {label ? (
            <label htmlFor={id} className="block text-xs font-semibold text-muted">
              {label}
              {props.required ? <span className="text-danger"> *</span> : null}
            </label>
          ) : (
            <span />
          )}
          {labelExtra}
        </div>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={cn(
            'block w-full min-h-11 py-2.5 bg-surface-muted dark:bg-background border rounded-[var(--radius-button)]',
            'text-base sm:text-sm text-foreground placeholder:text-muted',
            'transition duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:border-primary',
            error
              ? 'border-danger/40 focus-visible:ring-danger/25 focus-visible:border-danger'
              : 'border-border',
            leftIcon ? 'pl-10' : 'px-3.5',
            hasRight ? 'pr-12' : leftIcon ? 'pr-3.5' : undefined,
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {rightAction ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">
            {rightAction}
          </div>
        ) : rightIcon ? (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted">
            {rightIcon}
          </div>
        ) : null}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

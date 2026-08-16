'use client';

import React, { useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  className,
  id: externalId,
  ...props
}: InputProps) {
  const autoId = useId();
  const id = externalId ?? autoId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          className={cn(
            'block w-full py-2.5 bg-slate-50 dark:bg-slate-950 border rounded-xl',
            'text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600',
            'transition duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
            error
              ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/25 focus:border-rose-500'
              : 'border-slate-200 dark:border-slate-800',
            leftIcon ? 'pl-10 pr-3.5' : 'px-3.5',
            rightIcon ? 'pr-10' : undefined,
            className,
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-rose-600 dark:text-rose-400 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}

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
 <label htmlFor={id} className="block text-xs font-semibold text-muted dark:text-muted">
 {label}
 {props.required ? <span className="text-rose-500"> *</span> : null}
 </label>
 )}
 <div className="relative">
 {leftIcon && (
 <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted dark:text-muted">
 {leftIcon}
 </div>
 )}
 <input
 id={id}
 className={cn(
 'block w-full py-2.5 bg-surface-muted dark:bg-background border rounded-[var(--radius-button)]',
 'text-sm text-foreground dark:text-foreground placeholder:text-muted dark:placeholder:text-muted',
 'transition duration-150',
 'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
 error
 ? 'border-rose-300 dark:border-rose-800 focus:ring-rose-500/25 focus:border-rose-500'
 : 'border-border dark:border-border',
 leftIcon ? 'pl-10 pr-3.5' : 'px-3.5',
 rightIcon ? 'pr-10' : undefined,
 className,
 )}
 aria-invalid={error ? true : undefined}
 aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
 {...props}
 />
 {rightIcon && (
 <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-muted">
 {rightIcon}
 </div>
 )}
 </div>
 {hint && !error && (
 <p id={`${id}-hint`} className="text-xs text-muted dark:text-muted">
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

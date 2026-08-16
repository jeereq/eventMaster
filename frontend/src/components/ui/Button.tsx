'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 focus-visible:ring-indigo-500',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-card-hover focus-visible:ring-primary/40',
  ghost:
    'bg-transparent text-muted hover:bg-surface-muted hover:text-foreground focus-visible:ring-primary/40',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-500/20 focus-visible:ring-rose-500',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 focus-visible:ring-emerald-500',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-5 py-2.5 text-sm gap-2 rounded-lg',
} as const;

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'cursor-pointer active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}

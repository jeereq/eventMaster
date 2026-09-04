'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

const variants = {
  primary:
    'bg-primary-solid text-primary-foreground hover:bg-primary-solid-hover focus-visible:ring-primary',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-card-hover focus-visible:ring-primary/30',
  ghost:
    'bg-transparent text-muted hover:bg-surface-muted hover:text-foreground focus-visible:ring-primary/30',
  danger:
    'bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-500',
  success:
    'bg-emerald-800 text-white hover:bg-emerald-900 focus-visible:ring-emerald-700',
} as const;

const sizes = {
  sm: 'min-h-11 sm:min-h-[36px] px-3 py-1.5 text-xs gap-1.5 rounded-[var(--radius-button)]',
  md: 'min-h-11 sm:min-h-[40px] px-3.5 py-2 text-sm gap-2 rounded-[var(--radius-button)]',
  lg: 'min-h-[44px] px-4 py-2.5 text-sm gap-2 rounded-[var(--radius-button)]',
} as const;

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'href'> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Rend un lien Next.js avec le même style — évite <a><button>. */
  href?: string;
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
  href,
  type = 'button',
  onClick,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center font-medium transition duration-120 touch-manipulation select-none active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
    'cursor-pointer',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );

  const inner = (
    <>
      {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (href) {
    const inactive = Boolean(disabled || loading);
    return (
      <Link
        href={href}
        className={cn(classes, inactive && 'opacity-50 pointer-events-none')}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        tabIndex={inactive ? -1 : undefined}
        onClick={(event) => {
          if (inactive) {
            event.preventDefault();
            return;
          }
          onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
        }}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      onClick={onClick}
      {...props}
    >
      {inner}
    </button>
  );
}

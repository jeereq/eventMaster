import React from 'react';
import { cn } from '@/lib/cn';

const variants = {
  default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
  primary: 'bg-primary/10 text-primary border border-primary/20',
  success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50',
  warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50',
  danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/50',
} as const;

export interface BadgeProps {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

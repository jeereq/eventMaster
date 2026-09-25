import React from 'react';
import { cn } from '@/lib/cn';

const variants = {
 default: 'bg-surface-muted dark:bg-surface-muted text-foreground dark:text-foreground',
 primary: 'bg-emerald-100 text-emerald-800 dark:bg-primary/15 dark:text-primary',
 success: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
 warning: 'bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300',
 danger: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
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
 'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
 variants[variant],
 className,
 )}
 >
 {children}
 </span>
 );
}

import React from 'react';
import { cn } from '@/lib/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6 rounded-2xl',
        'border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

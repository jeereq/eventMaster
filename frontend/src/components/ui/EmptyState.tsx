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
        'flex flex-col items-center justify-center text-center py-12 px-6 rounded-[var(--radius-card)]',
        'border border-border/60 bg-surface-muted/30 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface border border-border/80 text-primary shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

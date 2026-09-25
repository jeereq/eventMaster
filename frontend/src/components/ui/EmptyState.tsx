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
        'border border-dashed border-border bg-surface',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
          {icon}
        </div>
      )}
      <h3 className="em-dash-title text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

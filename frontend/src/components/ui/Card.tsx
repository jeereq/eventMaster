import React from 'react';
import { cn } from '@/lib/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  /** Soft elevate on hover (Asana-style lift) */
  interactive?: boolean;
  elevated?: boolean;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

export function Card({
  children,
  className,
  padding = 'md',
  hover = false,
  interactive = false,
  elevated = false,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[var(--radius-card)]',
        elevated ? 'shadow-sm' : 'shadow-none',
        (hover || interactive) &&
          'transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out hover:bg-card-hover hover:border-border-subtle hover:-translate-y-px',
        paddingMap[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="min-w-0 space-y-1">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
        {description && (
          <p className="text-sm text-muted leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

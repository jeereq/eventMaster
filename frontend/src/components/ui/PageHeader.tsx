import React from 'react';
import { cn } from '@/lib/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export default function PageHeader({ title, description, action, breadcrumbs, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 sm:mb-7', className)}>
      {breadcrumbs && (
        <div className="mb-2 text-xs text-muted">{breadcrumbs}</div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl sm:text-[1.65rem] font-semibold text-foreground tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && <div className="shrink-0 flex flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}

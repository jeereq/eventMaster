import React from 'react';
import { cn } from '@/lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-surface-muted',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 dark:before:via-white/10 before:to-transparent',
        className,
      )}
    />
  );
}

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6', className)}>
      <div className="space-y-2 flex-1 min-w-0">
        <Skeleton className="h-7 w-48 sm:w-64" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-9 w-36 rounded-lg shrink-0" />
    </div>
  );
}

export function SkeletonProjectCard() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <Skeleton className="h-14 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-2">
          <Skeleton className="h-7 w-20 rounded-lg" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5">
      <Skeleton className="h-9 w-1.5 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-7 w-16 rounded-lg shrink-0" />
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  columns = 3,
  className,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const cols =
    columns === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : columns === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={cn('grid gap-4', cols, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonProjectCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDashboardHome() {
  return (
    <div className="space-y-8 animate-fade-in">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        <SkeletonGrid count={4} columns={2} />
      </div>
    </div>
  );
}

export function SkeletonEventsView({ mode = 'grid' }: { mode?: 'grid' | 'list' }) {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      {mode === 'list' ? <SkeletonList count={6} /> : <SkeletonGrid count={6} columns={3} />}
    </div>
  );
}

export function SkeletonRoomsView({ mode = 'grid' }: { mode?: 'grid' | 'list' }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 space-y-5 animate-fade-in">
      <div className="flex justify-between gap-4 pb-3 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      {mode === 'list' ? <SkeletonList count={4} /> : <SkeletonGrid count={6} columns={3} />}
    </div>
  );
}

export function SkeletonTemplatesView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="min-h-[420px] w-full rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}

export function SkeletonBillingView() {
  return (
    <div className="space-y-8 animate-fade-in">
      <SkeletonPageHeader />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

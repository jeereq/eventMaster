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
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-soft)]">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonListRow() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-2.5 sm:p-3">
      <Skeleton className="w-20 h-16 sm:w-28 sm:h-20 rounded-md shrink-0" />
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-4 w-4 rounded shrink-0" />
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
    <div className={cn('flex flex-col gap-2.5', className)}>
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

/** Stats KPI (analytics, commercial, home). */
export function SkeletonStatsRow({ count = 4 }: { count?: number }) {
  return (
    <div className={cn('grid gap-4', count >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3')}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Contenu d’onglet / panneau générique (grille de cartes par défaut). */
export function SkeletonTabContent({
  mode = 'grid',
  count = 6,
  columns = 3,
  withHeader = false,
}: {
  mode?: 'grid' | 'list';
  count?: number;
  columns?: 2 | 3 | 4;
  withHeader?: boolean;
}) {
  return (
    <div className="space-y-5 animate-fade-in">
      {withHeader && <SkeletonPageHeader />}
      {mode === 'list' ? <SkeletonList count={count} /> : <SkeletonGrid count={count} columns={columns} />}
    </div>
  );
}

export function SkeletonAnalyticsView() {
  return (
    <div className="space-y-8 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonStatsRow count={4} />
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
      <SkeletonGrid count={3} columns={3} />
    </div>
  );
}

export function SkeletonInvoicesView() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonPageHeader />
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-4">
        <Skeleton className="h-5 w-40" />
        <SkeletonList count={5} />
      </div>
    </div>
  );
}

export function SkeletonCommercialView() {
  return (
    <div className="space-y-8 animate-fade-in">
      <SkeletonPageHeader />
      <SkeletonStatsRow count={3} />
      <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
      <SkeletonGrid count={6} columns={3} />
    </div>
  );
}

export function SkeletonLandingTemplateCard() {
  return (
    <div className="bg-background border border-border rounded-[var(--radius-card)] p-3.5 flex flex-col" aria-hidden>
      <Skeleton className="w-full h-[200px] rounded-[var(--radius-button)]" />
      <div className="mt-3 space-y-2 flex-1">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
      <div className="border-t border-border pt-3 mt-4">
        <Skeleton className="h-3 w-36" />
      </div>
    </div>
  );
}

export function SkeletonLandingTemplateGrid({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      role="status"
      aria-live="polite"
      aria-label="Chargement des modèles"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLandingTemplateCard key={i} />
      ))}
      <span className="sr-only">Chargement des modèles…</span>
    </div>
  );
}

export function SkeletonProfileView() {
  return (
    <div className="space-y-6 animate-fade-in w-full">
      <SkeletonPageHeader />
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonListingDetail() {
  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-8 items-start animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Chargement de la fiche"
    >
      <div className="lg:col-span-3 space-y-4 sm:space-y-5">
        <Skeleton className="aspect-[5/4] sm:aspect-[16/9] w-full rounded-[var(--radius-card)]" />
        <div className="lg:hidden flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
          <div className="space-y-1.5 min-w-0 flex-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-5 w-28" />
          </div>
          <Skeleton className="h-10 w-20 rounded-[var(--radius-button)] shrink-0" />
        </div>
        <div className="flex gap-1 p-1 rounded-[var(--radius-button)] bg-surface-muted border border-border">
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-button)]" />
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-button)]" />
          <Skeleton className="h-11 flex-1 rounded-[var(--radius-button)]" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-8 w-36 rounded-[var(--radius-button)] shrink-0" />
          <Skeleton className="h-8 w-24 rounded-[var(--radius-button)] shrink-0" />
          <Skeleton className="h-8 w-28 rounded-[var(--radius-button)] shrink-0" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-border bg-surface p-3 space-y-2">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-md" />
            ))}
          </div>
        </div>
      </div>
      <aside className="hidden lg:block lg:col-span-2 space-y-4">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
            <Skeleton className="h-10 w-full rounded-[var(--radius-button)]" />
          </div>
          <Skeleton className="h-24 w-full rounded-[var(--radius-button)]" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-button)]" />
        </div>
      </aside>
      <span className="sr-only">Chargement de la fiche…</span>
    </div>
  );
}

'use client';

import React from 'react';
import { cn } from '@/lib/cn';
import {
  formatQuotaMax,
  getQuotaPercentage,
  type QuotaSnapshot,
} from '@/lib/quotaDisplay';

type QuotaKey = 'events' | 'guests' | 'templates' | 'rooms' | 'services' | 'orgManagers';

function quotaBarClass(pct: number) {
  if (pct >= 90) return 'bg-danger';
  if (pct >= 70) return 'bg-festive-accent';
  return 'bg-primary';
}

interface QuotaUsagePanelProps {
  quota: QuotaSnapshot;
  className?: string;
}

export default function QuotaUsagePanel({ quota, className = '' }: QuotaUsagePanelProps) {
  const items: Array<{
    key: QuotaKey;
    label: string;
    used: number;
    max: number;
    guests?: boolean;
  }> = [
    { key: 'events', label: 'Événements', used: quota.usage.events, max: quota.limits.maxEvents },
    { key: 'guests', label: 'Invités', used: quota.usage.guests, max: quota.limits.maxGuests, guests: true },
    { key: 'templates', label: 'Modèles', used: quota.usage.templates, max: quota.limits.maxTemplates },
    { key: 'rooms', label: 'Salles', used: quota.usage.rooms ?? 0, max: quota.limits.maxRooms ?? 0 },
    { key: 'services', label: 'Prestations', used: quota.usage.services ?? 0, max: quota.limits.maxServices ?? 0 },
    { key: 'orgManagers', label: 'Managers', used: quota.usage.orgManagers ?? 0, max: quota.limits.maxOrgManagers ?? 0 },
  ];

  const visible = items.filter(({ max }) => max > 0);

  return (
    <ul className={cn('grid gap-x-6 gap-y-3 grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]', className)}>
      {visible.map(({ key, label, used, max, guests }) => {
        const cap = guests ? 99999 : 9999;
        const pct = getQuotaPercentage(used, max, cap);
        const limited = max < cap;

        return (
          <li key={key} className="min-w-0 space-y-1.5">
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-medium text-foreground truncate">{label}</span>
              <span className={cn('tabular-nums shrink-0', limited && pct >= 100 ? 'font-semibold text-danger' : 'text-muted')}>
                {used.toLocaleString('fr-FR')} / {formatQuotaMax(max, guests)}
              </span>
            </div>
            {limited ? (
              <div
                className="w-full bg-surface-muted rounded-full h-1 overflow-hidden"
                role="meter"
                aria-label={label}
                aria-valuenow={Math.round(pct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', quotaBarClass(pct))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

interface PlanQuotaLimitsProps {
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxServices?: number;
  maxOrgManagers?: number;
  compact?: boolean;
}

export function PlanQuotaLimits({
  maxEvents = 0,
  maxGuests = 0,
  maxTemplates = 0,
  maxRooms = 0,
  maxServices = 0,
  maxOrgManagers = 0,
  compact = false,
}: PlanQuotaLimitsProps) {
  const rows = [
    { label: 'Événements', max: maxEvents },
    { label: 'Modèles', max: maxTemplates },
    { label: 'Invités', max: maxGuests, guests: true },
    { label: 'Salles', max: maxRooms },
    { label: 'Prestations', max: maxServices },
    { label: 'Managers', max: maxOrgManagers },
  ];

  return (
    <ul
      className={cn(
        'space-y-1 text-xs text-muted border-t border-border pt-3 mt-3',
        compact && 'leading-relaxed',
      )}
    >
      {rows
        .filter(({ max }) => max > 0)
        .map(({ label, max, guests }) => (
          <li key={label} className="flex justify-between gap-2">
            <span>{label}</span>
            <span className="font-semibold text-foreground tabular-nums">{formatQuotaMax(max, guests)}</span>
          </li>
        ))}
    </ul>
  );
}

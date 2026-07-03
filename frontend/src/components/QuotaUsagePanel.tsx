'use client';

import React from 'react';
import { Calendar, Users, Mail, LayoutGrid, UserCog } from 'lucide-react';
import {
  formatQuotaMax,
  formatQuotaRemaining,
  getQuotaPercentage,
  type QuotaSnapshot,
} from '@/lib/quotaDisplay';

const ICONS = {
  events: Calendar,
  guests: Users,
  templates: Mail,
  rooms: LayoutGrid,
  orgManagers: UserCog,
} as const;

const STYLES = {
  events: { icon: 'bg-indigo-50 text-indigo-600', bar: 'bg-indigo-600' },
  guests: { icon: 'bg-violet-50 text-violet-600', bar: 'bg-violet-600' },
  templates: { icon: 'bg-amber-50 text-amber-600', bar: 'bg-amber-500' },
  rooms: { icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-600' },
  orgManagers: { icon: 'bg-sky-50 text-sky-600', bar: 'bg-sky-600' },
} as const;

type QuotaKey = keyof typeof ICONS;

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
    { key: 'orgManagers', label: 'Managers', used: quota.usage.orgManagers ?? 0, max: quota.limits.maxOrgManagers ?? 0 },
  ];

  return (
    <div className={`grid sm:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {items.map(({ key, label, used, max, guests }) => {
        const Icon = ICONS[key];
        const style = STYLES[key];
        const pct = getQuotaPercentage(used, max, guests ? 99999 : 9999);

        return (
          <div
            key={key}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
              <div className={`p-2 rounded-xl shrink-0 ${style.icon}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {formatQuotaRemaining(used, max, guests)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {used.toLocaleString('fr-FR')} utilisé{used !== 1 ? 's' : ''} · max {formatQuotaMax(max, guests)}
              </p>
              {!guests && max < 9999 ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>
              ) : guests && max < 99999 ? (
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface PlanQuotaLimitsProps {
  maxEvents?: number;
  maxGuests?: number;
  maxTemplates?: number;
  maxRooms?: number;
  maxOrgManagers?: number;
  compact?: boolean;
}

export function PlanQuotaLimits({
  maxEvents = 0,
  maxGuests = 0,
  maxTemplates = 0,
  maxRooms = 0,
  maxOrgManagers = 0,
  compact = false,
}: PlanQuotaLimitsProps) {
  const rows = [
    { label: 'Événements', max: maxEvents },
    { label: 'Modèles', max: maxTemplates },
    { label: 'Invités', max: maxGuests, guests: true },
    { label: 'Salles', max: maxRooms },
    { label: 'Managers', max: maxOrgManagers },
  ];

  return (
    <ul className={`space-y-1 ${compact ? 'text-[11px]' : 'text-xs'} text-slate-600 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 mt-3`}>
      {rows.map(({ label, max, guests }) => (
        <li key={label} className="flex justify-between gap-2">
          <span>{label}</span>
          <span className="font-bold text-slate-800 dark:text-slate-200">{formatQuotaMax(max, guests)}</span>
        </li>
      ))}
    </ul>
  );
}

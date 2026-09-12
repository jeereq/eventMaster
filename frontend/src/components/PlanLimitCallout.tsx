'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Zap, Crown, Info } from 'lucide-react';
import {
  FEATURE_GUIDES,
  QUOTA_GUIDES,
  getFeatureLockMessage,
  getQuotaLockMessage,
  isUnlimitedQuota,
  type QuotaKind,
} from '@/lib/planAccess';
import type { PlanCapabilities, PlanQuotaInfo } from '@/context/AuthContext';
import { cn } from '@/lib/cn';

interface PlanLimitCalloutProps {
  kind?: QuotaKind;
  feature?: keyof PlanCapabilities;
  planQuota?: PlanQuotaInfo | null;
  planName?: string | null;
  compact?: boolean;
  className?: string;
}

export default function PlanLimitCallout({
  kind,
  feature,
  planQuota,
  planName,
  compact = false,
  className = '',
}: PlanLimitCalloutProps) {
  const quotaMsg = kind ? getQuotaLockMessage(kind, planQuota) : null;
  const featureMsg = feature ? getFeatureLockMessage(feature, planName) : null;
  if (kind && !quotaMsg && !feature) return null;
  if (feature && !featureMsg && !quotaMsg) return null;

  const guide = (kind ? QUOTA_GUIDES[kind] : null) || (feature ? FEATURE_GUIDES[feature] : null);
  if (!guide) return null;

  // Calcul du quota si kind est présent
  let usage: number | null = null;
  let limit: number | null = null;
  let percent: number | null = null;

  if (kind && planQuota) {
    const map = {
      events: { u: planQuota.usage.events, l: planQuota.limits.maxEvents },
      guests: { u: planQuota.usage.guests, l: planQuota.limits.maxGuests },
      templates: { u: planQuota.usage.templates, l: planQuota.limits.maxTemplates },
      rooms: { u: planQuota.usage.rooms, l: planQuota.limits.maxRooms },
      services: { u: planQuota.usage.services ?? 0, l: planQuota.limits.maxServices ?? 0 },
      orgManagers: { u: planQuota.usage.orgManagers, l: planQuota.limits.maxOrgManagers },
    };
    const row = map[kind];
    if (row && !isUnlimitedQuota(row.l)) {
      usage = row.u;
      limit = row.l;
      percent = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 100;
    }
  }

  const isFeatureCallout = Boolean(feature && !kind);
  const headline = isFeatureCallout
    ? featureMsg || guide.title
    : quotaMsg || guide.title;

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition',
          isFeatureCallout
            ? 'border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/90 to-purple-50/40 dark:from-purple-950/30 dark:to-purple-950/10 text-purple-950 dark:text-purple-200'
            : 'border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50/90 to-amber-50/40 dark:from-amber-950/30 dark:to-amber-950/10 text-amber-950 dark:text-amber-200',
          className,
        )}
        role="status"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'p-1.5 rounded-lg shrink-0',
              isFeatureCallout
                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300',
            )}
          >
            {isFeatureCallout ? <Sparkles className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{headline}</p>
            {usage !== null && limit !== null && (
              <p className="text-[11px] text-muted dark:text-muted">
                {usage} / {limit} utilisé{usage > 1 ? 's' : ''} ({percent}%)
              </p>
            )}
          </div>
        </div>

        <Link
          href={guide.href}
          className={cn(
            'inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition shrink-0',
            isFeatureCallout
              ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
              : 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
          )}
        >
          <span>Augmenter</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition shadow-xs space-y-3.5',
        isFeatureCallout
          ? 'border-purple-200/90 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/90 via-surface to-purple-50/30 dark:from-purple-950/25 dark:via-surface dark:to-purple-950/10'
          : 'border-amber-200/90 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/90 via-surface to-amber-50/30 dark:from-amber-950/25 dark:via-surface dark:to-amber-950/10',
        className,
      )}
      role="status"
    >
      {/* En-tête : Badge & titre chaleureux */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-xl shrink-0 shadow-xs',
              isFeatureCallout
                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300'
                : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300',
            )}
          >
            {isFeatureCallout ? <Crown className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
                  isFeatureCallout
                    ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300',
                )}
              >
                {isFeatureCallout ? 'Fonctionnalité Premium' : 'Limite de forfait atteinte'}
              </span>
              {planName && (
                <span className="text-[11px] text-muted">
                  Formule actuelle : <strong className="font-semibold text-foreground">{planName}</strong>
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground mt-0.5">{headline}</h3>
          </div>
        </div>

        {/* Jauge si limite chiffrée */}
        {usage !== null && limit !== null && (
          <div className="sm:text-right shrink-0">
            <span className="text-xs font-bold text-foreground">
              {usage} / {limit} utilisé{usage > 1 ? 's' : ''}
            </span>
            <div className="w-32 sm:w-28 h-2 bg-surface-muted border border-border rounded-full overflow-hidden mt-1">
              <div
                className={cn(
                  'h-full transition-all duration-500 rounded-full',
                  percent && percent >= 100
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-primary to-amber-500',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Description bienveillante et incitative */}
      <div className="space-y-1.5 text-xs text-muted dark:text-muted leading-relaxed">
        <p className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" />
          <span>{guide.what}</span>
        </p>
        <p className="pl-5 text-muted/90">{guide.why}</p>
      </div>

      {/* Action concrète et incitation d'upgrade */}
      <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-foreground font-medium">
          <span className="text-muted">Comment débloquer :</span> {guide.how}
        </p>

        <Link
          href={guide.href}
          className={cn(
            'inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition hover:scale-[1.02] active:scale-[0.98] shrink-0',
            isFeatureCallout
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/20'
              : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-500/20',
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Passer au forfait supérieur</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

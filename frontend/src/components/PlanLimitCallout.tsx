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
          'rounded-xl border border-border bg-surface p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition text-foreground shadow-2xs',
          className,
        )}
        role="status"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              'p-1.5 rounded-lg shrink-0',
              isFeatureCallout
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            {isFeatureCallout ? (
              <Sparkles className="w-4 h-4" aria-hidden />
            ) : (
              <Zap className="w-4 h-4" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{headline}</p>
            {usage !== null && limit !== null && (
              <p className="text-[11px] text-muted">
                {usage} / {limit} utilisé{usage > 1 ? 's' : ''} ({percent}%)
              </p>
            )}
          </div>
        </div>

        <Link
          href={guide.href}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-muted text-foreground transition shrink-0 active:scale-[0.98] motion-reduce:active:scale-100"
        >
          <span>Augmenter</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted" aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-2xl border border-border bg-surface p-4 sm:p-5 transition shadow-2xs space-y-3.5 text-foreground',
        className,
      )}
      role="status"
    >
      {/* En-tête : Badge sobre & titre clair */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-2 rounded-xl shrink-0 border border-border/60',
              isFeatureCallout
                ? 'bg-primary/10 text-primary'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            )}
          >
            {isFeatureCallout ? (
              <Crown className="w-4 h-4" aria-hidden />
            ) : (
              <Zap className="w-4 h-4" aria-hidden />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider',
                  isFeatureCallout
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20',
                )}
              >
                {isFeatureCallout ? 'Fonctionnalité Premium' : 'Limite de forfait'}
              </span>
              {planName && (
                <span className="text-[11px] text-muted">
                  Formule actuelle : <strong className="font-semibold text-foreground">{planName}</strong>
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground mt-0.5">{headline}</h3>
          </div>
        </div>

        {/* Jauge si limite chiffrée - sobre et lisible */}
        {usage !== null && limit !== null && (
          <div className="sm:text-right shrink-0">
            <span className="text-xs font-semibold text-foreground">
              {usage} / {limit} utilisé{usage > 1 ? 's' : ''}
            </span>
            <div
              role="progressbar"
              aria-valuenow={percent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Quota consommé : ${usage} sur ${limit}`}
              className="w-32 sm:w-28 h-2 bg-surface-muted border border-border/60 rounded-full overflow-hidden mt-1"
            >
              <div
                className={cn(
                  'h-full transition-all duration-500 rounded-full',
                  percent && percent >= 100
                    ? 'bg-amber-600 dark:bg-amber-500'
                    : 'bg-primary',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Description sobre et lisible */}
      <div className="space-y-1 text-xs text-muted leading-relaxed">
        <p className="flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted" aria-hidden />
          <span>{guide.what}</span>
        </p>
        <p className="pl-5 text-muted/90">{guide.why}</p>
      </div>

      {/* Action concrète et incitation d'upgrade */}
      <div className="pt-2.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-muted">
          <span className="font-semibold text-foreground">Pour débloquer :</span> {guide.how}
        </p>

        <Link
          href={guide.href}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary-solid hover:bg-primary-solid-hover text-primary-foreground shadow-2xs transition active:scale-[0.98] motion-reduce:active:scale-100 shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          <span>Passer au forfait supérieur</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

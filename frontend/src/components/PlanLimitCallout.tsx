'use client';
import { ChannelText } from '@/components/ChannelText';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Zap, Crown, Info } from '@/components/icons';
import { Tooltip } from '@/components/ui';
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
    }
  }

  const isFeatureCallout = Boolean(feature && !kind);
  const Icon = isFeatureCallout ? Crown : Zap;

  // Une ligne : ce qui bloque, le chiffre, une action. Le « comment débloquer » est au survol de l’icône info.
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border bg-surface text-foreground shadow-2xs',
        compact ? 'px-3 py-2' : 'px-3.5 py-2.5',
        className,
      )}
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon
          className={cn('h-4 w-4 shrink-0', isFeatureCallout ? 'text-primary' : 'text-amber-600 dark:text-amber-400')}
          aria-hidden
        />
        <p className="min-w-0 text-sm font-semibold text-foreground">
          {guide.title}
          {usage !== null && limit !== null ? (
            <span className="font-normal text-muted tabular-nums"> · {usage} / {limit}</span>
          ) : null}
        </p>
        {guide.how ? (
          <Tooltip side="top" content={<span className="block max-w-[16rem] whitespace-normal"><ChannelText text={guide.how} /></span>}>
            <button
              type="button"
              aria-label={`Comment débloquer : ${guide.how}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Info className="h-4 w-4" aria-hidden />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <Link
        href={guide.href}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary-solid px-4 py-2 text-xs font-semibold text-primary-foreground shadow-2xs transition hover:bg-primary-solid-hover"
      >
        Changer de forfait
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

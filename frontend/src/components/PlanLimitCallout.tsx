'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Sparkles } from 'lucide-react';
import {
  FEATURE_GUIDES,
  QUOTA_GUIDES,
  getFeatureLockMessage,
  getQuotaLockMessage,
  type QuotaKind,
} from '@/lib/planAccess';
import type { PlanCapabilities, PlanQuotaInfo } from '@/context/AuthContext';

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

  const headline = quotaMsg || featureMsg || guide.title;

  return (
    <div
      className={`rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 text-amber-950 ${compact ? 'p-3' : 'p-4'} space-y-2 ${className}`}
      role="status"
    >
      <p className={`font-semibold flex items-start gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
        <span>{headline}</span>
      </p>
      {!compact && (
        <>
          <p className="text-xs leading-relaxed text-amber-900/90">{guide.what}</p>
          <p className="text-xs leading-relaxed text-amber-900/90">{guide.why}</p>
        </>
      )}
      <p className="text-xs leading-relaxed">
        <span className="font-semibold">Pour augmenter la capacité :</span> {guide.how}
      </p>
      <Link
        href={guide.href}
        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Voir les forfaits et accroître les capacités
      </Link>
    </div>
  );
}

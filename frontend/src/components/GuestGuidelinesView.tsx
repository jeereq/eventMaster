'use client';

import React from 'react';
import {
  Shirt, Car, Gift, CloudSun, Clock, Baby, Camera, Bus, Accessibility, Info, Wallet, Sparkles,
  type LucideIcon,
} from 'lucide-react';
import {
  type GuestGuidelines,
  type RecommendationType,
  normalizeGuestGuidelines,
  formatDressCodeText,
  RECOMMENDATION_PRESETS,
  hasVisibleGuestGuidelines,
} from '@/lib/guestGuidelines';
import { cn } from '@/lib/cn';

const RECOMMENDATION_ICONS: Record<RecommendationType, LucideIcon> = {
  perks: Sparkles,
  parking: Car,
  gifts: Gift,
  cash_gift: Wallet,
  weather: CloudSun,
  schedule: Clock,
  children: Baby,
  photos: Camera,
  transport: Bus,
  accessibility: Accessibility,
  custom: Info,
};

interface GuestGuidelinesViewProps {
  guidelines: GuestGuidelines | unknown;
  /** Conservé pour compat — le rendu suit désormais les tokens du thème. */
  variant?: 'light' | 'dark';
  accentColor?: string;
  className?: string;
}

export default function GuestGuidelinesView({
  guidelines: raw,
  accentColor,
  className = '',
}: GuestGuidelinesViewProps) {
  const guidelines = normalizeGuestGuidelines(raw);
  if (!hasVisibleGuestGuidelines(guidelines)) return null;

  const accent = accentColor || 'var(--primary)';
  const dressText = formatDressCodeText(guidelines);
  const activeRecs = guidelines.recommendations.filter((r) => r.enabled && (r.content.trim() || (r.imageUrls?.length ?? 0) > 0));

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-xl bg-primary/10" style={{ color: accent }}>
          <Info className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Infos pour le jour J</h3>
        </div>
      </div>

      {guidelines.dressCode.enabled && (dressText || (guidelines.dressCode.imageUrls?.length ?? 0) > 0) && (
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 shrink-0" style={{ color: accent }} />
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Tenue recommandée</span>
          </div>
          {dressText ? <p className="text-sm leading-relaxed text-muted">{dressText}</p> : null}
          {guidelines.dressCode.presetId === 'theme_color' && guidelines.dressCode.themeColor && (
            <div className="flex items-center gap-2 pt-1">
              <span
                className="w-6 h-6 rounded-lg border border-border"
                style={{ backgroundColor: guidelines.dressCode.themeColor }}
              />
              {guidelines.dressCode.themeColorLabel && (
                <span className="text-xs font-semibold text-muted">{guidelines.dressCode.themeColorLabel}</span>
              )}
            </div>
          )}
          <GuidelineImageGrid urls={guidelines.dressCode.imageUrls} />
        </div>
      )}

      {activeRecs.map((rec) => {
        const Icon = RECOMMENDATION_ICONS[rec.type] ?? Info;
        const label = rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Info';
        return (
          <div key={rec.id} className="rounded-2xl border border-border bg-surface p-4 space-y-1.5 text-foreground shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </div>
            {rec.content ? <p className="text-sm leading-relaxed text-muted">{rec.content}</p> : null}
            <GuidelineImageGrid urls={rec.imageUrls} />
          </div>
        );
      })}

      {guidelines.additionalNotes?.trim() && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface-muted p-4">
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted">
            {guidelines.additionalNotes}
          </p>
        </div>
      )}
    </div>
  );
}

function GuidelineImageGrid({ urls }: { urls?: string[] }) {
  if (!urls?.length) return null;
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {urls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className="h-20 w-20 rounded-[var(--radius-button)] object-cover border border-border"
        />
      ))}
    </div>
  );
}

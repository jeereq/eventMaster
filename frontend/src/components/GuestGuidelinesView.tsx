'use client';

import React from 'react';
import {
  Shirt, Car, Gift, CloudSun, Clock, Baby, Camera, Bus, Accessibility, Info, Wallet,
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

  const accent = accentColor || 'var(--festive-accent)';
  const dressText = formatDressCodeText(guidelines);
  const activeRecs = guidelines.recommendations.filter((r) => r.enabled && r.content.trim());

  return (
    <div className={cn('space-y-3', className)}>
      <h3 className="text-sm font-display font-semibold flex items-center gap-2 text-foreground">
        <Info className="w-4 h-4" style={{ color: accent }} />
        Infos pratiques
      </h3>

      {guidelines.dressCode.enabled && dressText && (
        <div className="rounded-[var(--radius-card)] border border-border bg-surface em-celebrate-stripe p-4 space-y-1.5 text-foreground">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 shrink-0" style={{ color: accent }} />
            <span className="em-festive-chip">Tenue recommandée</span>
          </div>
          <p className="text-sm leading-relaxed text-muted">{dressText}</p>
          {guidelines.dressCode.presetId === 'theme_color' && guidelines.dressCode.themeColor && (
            <div className="flex items-center gap-2 pt-1">
              <span
                className="w-6 h-6 rounded-full border-2 border-border shadow-sm"
                style={{ backgroundColor: guidelines.dressCode.themeColor }}
              />
              {guidelines.dressCode.themeColorLabel && (
                <span className="text-xs font-semibold text-muted">{guidelines.dressCode.themeColorLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {activeRecs.map((rec) => {
        const Icon = RECOMMENDATION_ICONS[rec.type] ?? Info;
        const label = rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Info';
        return (
          <div key={rec.id} className="rounded-[var(--radius-card)] border border-border bg-surface em-celebrate-stripe p-4 space-y-1 text-foreground">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} />
              <span className="text-xs font-semibold text-foreground">{label}</span>
            </div>
            <p className="text-sm leading-relaxed text-muted">{rec.content}</p>
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

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
  variant?: 'light' | 'dark';
  accentColor?: string;
  className?: string;
}

export default function GuestGuidelinesView({
  guidelines: raw,
  variant = 'dark',
  accentColor = '#6366f1',
  className = '',
}: GuestGuidelinesViewProps) {
  const guidelines = normalizeGuestGuidelines(raw);
  if (!hasVisibleGuestGuidelines(guidelines)) return null;

  const isDark = variant === 'dark';
  const cardClass = isDark
    ? 'bg-slate-800/50 border-slate-700/50 text-slate-200'
    : 'bg-white border-slate-200 text-slate-800';
  const titleClass = isDark ? 'text-white' : 'text-slate-900';
  const mutedClass = isDark ? 'text-slate-400' : 'text-slate-500';

  const dressText = formatDressCodeText(guidelines);
  const activeRecs = guidelines.recommendations.filter((r) => r.enabled && r.content.trim());

  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className={`text-sm font-bold flex items-center gap-2 ${titleClass}`}>
        <Info className="w-4 h-4" style={{ color: accentColor }} />
        Infos pratiques
      </h3>

      {guidelines.dressCode.enabled && dressText && (
        <div className={`rounded-2xl border p-4 space-y-1.5 ${cardClass}`}>
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
            <span className={`text-xs font-bold uppercase tracking-wider ${titleClass}`}>Tenue recommandée</span>
          </div>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{dressText}</p>
          {guidelines.dressCode.presetId === 'theme_color' && guidelines.dressCode.themeColor && (
            <div className="flex items-center gap-2 pt-1">
              <span
                className="w-6 h-6 rounded-full border-2 border-white/30 shadow-sm"
                style={{ backgroundColor: guidelines.dressCode.themeColor }}
              />
              {guidelines.dressCode.themeColorLabel && (
                <span className={`text-xs font-semibold ${mutedClass}`}>{guidelines.dressCode.themeColorLabel}</span>
              )}
            </div>
          )}
        </div>
      )}

      {activeRecs.map((rec) => {
        const Icon = RECOMMENDATION_ICONS[rec.type] ?? Info;
        const label = rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Info';
        return (
          <div key={rec.id} className={`rounded-2xl border p-4 space-y-1 ${cardClass}`}>
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
              <span className={`text-xs font-bold ${titleClass}`}>{label}</span>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{rec.content}</p>
          </div>
        );
      })}

      {guidelines.additionalNotes?.trim() && (
        <div className={`rounded-2xl border p-4 ${cardClass}`}>
          <p className={`text-sm leading-relaxed whitespace-pre-line ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {guidelines.additionalNotes}
          </p>
        </div>
      )}
    </div>
  );
}

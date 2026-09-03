'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Shirt, Car, Gift, CloudSun, Clock, Baby, Camera, Bus, Accessibility, Info, Wallet, Sparkles,
  X, ChevronLeft, ChevronRight, Maximize2,
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
    <div className={cn('space-y-4', className)}>
      <h3 className="text-base font-display font-semibold text-foreground tracking-tight">
        Infos pour le jour J
      </h3>

      {guidelines.dressCode.enabled && (dressText || (guidelines.dressCode.imageUrls?.length ?? 0) > 0) && (
        <div className="space-y-2 py-3 border-t border-border/70 text-foreground">
          <div className="flex items-center gap-2">
            <Shirt className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden />
            <span className="text-sm font-semibold text-foreground">Tenue recommandée</span>
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
          <GuidelineImageGrid urls={guidelines.dressCode.imageUrls} label="tenue recommandée" />
        </div>
      )}

      {activeRecs.map((rec) => {
        const Icon = RECOMMENDATION_ICONS[rec.type] ?? Info;
        const label = rec.title || RECOMMENDATION_PRESETS[rec.type]?.label || 'Info';
        return (
          <div key={rec.id} className="space-y-1.5 py-3 border-t border-border/70 text-foreground">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 shrink-0" style={{ color: accent }} aria-hidden />
              <span className="text-sm font-semibold text-foreground">{label}</span>
            </div>
            {rec.content ? <p className="text-sm leading-relaxed text-muted">{rec.content}</p> : null}
            <GuidelineImageGrid urls={rec.imageUrls} label={label} />
          </div>
        );
      })}

      {guidelines.additionalNotes?.trim() && (
        <div className="py-3 border-t border-border/70">
          <p className="text-sm leading-relaxed whitespace-pre-line text-muted">
            {guidelines.additionalNotes}
          </p>
        </div>
      )}
    </div>
  );
}

function GuidelineImageGrid({ urls, label }: { urls?: string[]; label: string }) {
  const images = (urls || []).filter(Boolean);
  const [index, setIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setIndex(null), []);

  useEffect(() => {
    if (index === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (images.length < 2) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setIndex((prev) => (prev === null ? 0 : (prev - 1 + images.length) % images.length));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setIndex((prev) => (prev === null ? 0 : (prev + 1) % images.length));
      }
    };
    document.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, images.length, close]);

  if (!images.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-1">
        {images.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => setIndex(i)}
            className="group relative h-20 w-20 rounded-[var(--radius-button)] overflow-hidden border border-border bg-surface-muted touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label={`Agrandir l’image ${i + 1} — ${label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Aperçu ${i + 1} — ${label}`}
              className="h-full w-full object-cover transition group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition">
              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow" aria-hidden />
            </span>
          </button>
        ))}
      </div>

      {index !== null && (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xs flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-label={`Visionneuse — ${label}, image ${index + 1} sur ${images.length}`}
          onClick={close}
        >
          <div
            className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[index]}
              alt={`${label} — image ${index + 1} sur ${images.length}`}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />

            <button
              ref={closeRef}
              type="button"
              onClick={close}
              className="absolute top-0 right-0 sm:top-2 sm:right-2 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/60 hover:bg-black text-white rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Fermer la visionneuse"
            >
              <X className="w-5 h-5" aria-hidden />
            </button>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev === null ? 0 : (prev - 1 + images.length) % images.length))}
                  className="absolute left-0 sm:left-2 p-3 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/50 hover:bg-black text-white rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label="Image précédente"
                >
                  <ChevronLeft className="w-6 h-6" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setIndex((prev) => (prev === null ? 0 : (prev + 1) % images.length))}
                  className="absolute right-0 sm:right-2 p-3 min-h-11 min-w-11 inline-flex items-center justify-center bg-black/50 hover:bg-black text-white rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                  aria-label="Image suivante"
                >
                  <ChevronRight className="w-6 h-6" aria-hidden />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-white text-xs font-semibold" aria-live="polite">
                  {index + 1} / {images.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

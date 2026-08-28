'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ACCENT_PRESETS,
  useViewPreferencesOptional,
  type AccentPresetId,
} from '@/context/ViewPreferencesContext';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { Palette, Check } from 'lucide-react';

/**
 * Sélecteur de couleur d’accent pour landing / contact / auth.
 * Persiste via ViewPreferences (même localStorage que le dashboard).
 */
export default function PublicAccentPicker({ className }: { className?: string }) {
  const prefs = useViewPreferencesOptional();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent | MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!prefs) return null;

  const { prefs: viewPrefs, setAccent, accentPreset, accentCustomized } = prefs;

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Tooltip content="Accent personnel (cet appareil)" side="bottom">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'p-2.5 sm:p-2 min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg text-muted hover:bg-surface-muted hover:text-foreground transition active:scale-95 touch-manipulation',
            open && 'bg-surface-muted text-foreground',
          )}
          aria-label="Changer l'accent personnel"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          <span className="relative inline-flex">
            <Palette className="w-4 h-4" />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-surface"
              style={{ backgroundColor: accentPreset.primary }}
            />
          </span>
        </button>
      </Tooltip>

      {open && (
        <div
          role="listbox"
          aria-label="Palettes de couleur"
          className={cn(
            'absolute right-0 top-full mt-2 z-[80] w-[17.5rem]',
            'rounded-[var(--radius-card)] border border-border bg-surface shadow-xl p-3',
            'animate-fade-in',
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5">
            <p className="text-[11px] font-semibold text-foreground">Accent personnel</p>
            <span className="text-[10px] text-muted truncate">
              {accentCustomized ? accentPreset.label : 'Thème par défaut'}
            </span>
          </div>
          <p className="text-[10px] text-muted leading-relaxed mb-2.5 px-0.5">
            Préférence sur cet appareil uniquement. Dans le tableau de bord connecté, la marque de l&apos;organisation reste la référence (Profil).
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ACCENT_PRESETS.map((preset) => {
              const selected = accentCustomized && viewPrefs.accent === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    setAccent(preset.id as AccentPresetId);
                    setOpen(false);
                  }}
                  className={cn(
                    'relative flex flex-col items-center gap-1.5 p-2 rounded-[var(--radius-button)] border transition',
                    selected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                      : 'border-border hover:border-primary/30 hover:bg-surface-muted',
                  )}
                >
                  <span className="grid grid-cols-2 gap-0.5 w-7 h-7 rounded-md overflow-hidden border border-border">
                    {preset.swatches.map((c) => (
                      <span key={c} style={{ backgroundColor: c }} />
                    ))}
                  </span>
                  <span className="text-[10px] font-semibold text-foreground">{preset.label}</span>
                  {selected && (
                    <span className="absolute top-1 right-1 text-primary">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

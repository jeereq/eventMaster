'use client';

import React from 'react';
import {
  ACCENT_PRESETS,
  useViewPreferences,
  type AccentPresetId,
  type DensityId,
  type FontScaleId,
  type MoodId,
} from '@/context/ViewPreferencesContext';
import { Tooltip } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  X, Settings2, Palette, Type, LayoutGrid, RotateCcw, Sparkles,
} from '@/components/icons';


function PaletteButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  const { accentPreset } = useViewPreferences();
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-full border border-border bg-surface text-muted hover:bg-surface-muted hover:text-foreground transition',
        className,
      )}
      aria-label="Personnaliser la vue"
    >
      <span className="grid grid-cols-2 gap-0.5 w-4 h-4">
        {accentPreset.swatches.map((c) => (
          <span key={c} className="rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
      </span>
    </button>
  );
}

export function ViewCustomizerTrigger({ className }: { className?: string }) {
  const { toggleDrawer } = useViewPreferences();
  return (
    <Tooltip content="Personnaliser la vue" side="bottom">
      <span>
        <PaletteButton onClick={toggleDrawer} className={className} />
      </span>
    </Tooltip>
  );
}

export default function ViewCustomizerDrawer() {
  const { drawerOpen, setDrawerOpen, resetPreferences } = useViewPreferences();

  if (!drawerOpen) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Fermer"
        className="fixed inset-0 z-[70] bg-black/40 animate-fade-in"
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[75] w-full max-w-sm',
          'bg-surface border-l border-border shadow-2xl',
          'flex flex-col animate-slide-in-right',
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-customizer-title"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">Apparence</p>
            <h2 id="view-customizer-title" className="text-base font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Personnaliser ma vue
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-[var(--radius-button)] border border-border text-muted hover:bg-surface-muted hover:text-foreground transition"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ViewPreferencesFields />
        </div>

        <div className="shrink-0 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={resetPreferences}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-button)] border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Réinitialiser (revenir à la marque org.)
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * Réglages d'affichage (ambiance, accent, densité, taille du texte).
 * Chaque choix s'applique et s'enregistre aussitôt sur cet appareil.
 * Le thème clair / sombre est dans la barre du haut.
 */
export function ViewPreferencesFields({ className }: { className?: string }) {
  const { prefs, setAccent, setDensity, setFontScale, setMood, accentPreset } = useViewPreferences();

  return (
    <div className={cn('space-y-7', className)}>
      {/* Ambiance Work / Celebrate */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Ambiance
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'work' as MoodId, label: 'Work', hint: 'Pro & clair' },
              { id: 'celebrate' as MoodId, label: 'Celebrate', hint: 'Festif' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMood(opt.id)}
              className={cn(
                'flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-[var(--radius-button)] border text-left transition',
                prefs.mood === opt.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted hover:text-foreground',
              )}
            >
              <span className="text-xs font-semibold">{opt.label}</span>
              <span className="text-xs opacity-80">{opt.hint}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Palette */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Palette className="w-3.5 h-3.5" />
          Accent personnel
        </h3>
        <p className="text-xs text-muted leading-relaxed">
          Préférence locale (cet appareil) : <span className="font-semibold text-foreground">{accentPreset.label}</span>.
          Elle remplace temporairement les couleurs de marque de l&apos;organisation.
          La marque org. se configure dans Profil → Couleurs de l&apos;organisation.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ACCENT_PRESETS.map((preset) => {
            const selected = prefs.accent === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setAccent(preset.id as AccentPresetId)}
                className={cn(
                  'flex flex-col items-center gap-2 p-2.5 rounded-[var(--radius-card)] border transition',
                  selected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-border bg-background hover:border-border-subtle',
                )}
                aria-pressed={selected}
              >
                <span className="grid grid-cols-2 gap-0.5 w-8 h-8 rounded-md overflow-hidden border border-border">
                  {preset.swatches.map((c) => (
                    <span key={c} style={{ backgroundColor: c }} />
                  ))}
                </span>
                <span className="text-xs font-semibold text-foreground">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Densité */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5" />
          Densité
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'comfortable' as DensityId, label: 'Confortable' },
              { id: 'compact' as DensityId, label: 'Compacte' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setDensity(opt.id)}
              className={cn(
                'px-3 py-2.5 rounded-[var(--radius-button)] border text-xs font-semibold transition',
                prefs.density === opt.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Taille du texte */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Type className="w-3.5 h-3.5" />
          Taille du texte
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'sm' as FontScaleId, label: 'A', sub: 'Petit' },
              { id: 'md' as FontScaleId, label: 'A', sub: 'Moyen' },
              { id: 'lg' as FontScaleId, label: 'A', sub: 'Grand' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFontScale(opt.id)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-[var(--radius-button)] border transition',
                prefs.fontScale === opt.id
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'font-bold leading-none',
                  opt.id === 'sm' && 'text-sm',
                  opt.id === 'md' && 'text-base',
                  opt.id === 'lg' && 'text-lg',
                )}
              >
                {opt.label}
              </span>
              <span className="text-xs font-medium">{opt.sub}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}

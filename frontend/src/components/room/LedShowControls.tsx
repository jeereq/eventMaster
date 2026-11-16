'use client';

/** Réglages « Jeux de lumière LED » : mode, couleur, vitesse et où poser les LED. */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LED_COLOR_PRESETS, LED_SHOW_MODE_LABELS, isLedShowAnimated, resolveLedShow, type LedShowMode, type LedShowSettings } from '@/lib/roomLedShow';

const MODES: LedShowMode[] = ['off', 'static', 'rainbow', 'pulse', 'chase', 'disco', 'twinkle'];

export default function LedShowControls({
  value,
  onChange,
}: {
  value?: Partial<LedShowSettings> | null;
  onChange: (next: LedShowSettings, message: string) => void;
}) {
  const show = resolveLedShow(value);
  const set = (patch: Partial<LedShowSettings>, message: string) => onChange({ ...show, ...patch }, message);
  const colorful = show.mode === 'rainbow' || show.mode === 'disco';
  return (
    <div className="space-y-2 rounded-[var(--radius-button)] border border-border bg-surface-muted/40 p-2.5">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Jeux de lumière LED
      </p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Effet lumineux">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={show.mode === m}
            onClick={() => set({ mode: m }, m === 'off' ? 'LED éteintes' : `LED : ${LED_SHOW_MODE_LABELS[m]}`)}
            className={cn(
              'min-h-11 rounded-full border px-3 text-xs font-semibold transition-colors',
              show.mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-muted hover:text-foreground',
            )}
          >
            {LED_SHOW_MODE_LABELS[m]}
          </button>
        ))}
      </div>
      {show.mode !== 'off' ? (
        <>
          {!colorful ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {LED_COLOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  aria-label={p.label}
                  aria-pressed={show.color === p.color}
                  onClick={() => set({ color: p.color }, `LED : ${p.label}`)}
                  className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full border-2', show.color === p.color ? 'border-primary' : 'border-transparent')}
                >
                  <span className="h-7 w-7 rounded-full shadow-inner" style={{ background: p.color, boxShadow: `0 0 10px ${p.color}` }} />
                </button>
              ))}
              <input
                type="color"
                value={show.color}
                onChange={(e) => set({ color: e.target.value }, 'Couleur des LED')}
                aria-label="Autre couleur"
                className="h-11 w-14 cursor-pointer rounded-[var(--radius-button)] border border-border"
              />
            </div>
          ) : (
            <p className="text-xs text-muted">Toutes les couleurs défilent : aucune teinte à choisir.</p>
          )}
          {isLedShowAnimated(show) ? (
            <label className="block space-y-1">
              <span className="flex justify-between text-xs font-semibold text-muted">
                Vitesse <span className="tabular-nums text-foreground">{show.speed.toFixed(1)}×</span>
              </span>
              <input type="range" min={0.2} max={3} step={0.1} value={show.speed} onChange={(e) => set({ speed: parseFloat(e.target.value) }, 'Vitesse des LED')} className="w-full accent-primary" />
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="size-4 rounded border-border" checked={show.uplights} onChange={(e) => set({ uplights: e.target.checked }, e.target.checked ? 'Uplights LED activés' : 'Uplights LED masqués')} />
              Uplights au sol
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="size-4 rounded border-border" checked={show.cove} onChange={(e) => set({ cove: e.target.checked }, e.target.checked ? 'Bandeau LED activé' : 'Bandeau LED masqué')} />
              Bandeau en corniche
            </label>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">Uplights colorés au pied des murs et bandeau LED sous le plafond, fixes ou animés.</p>
      )}
    </div>
  );
}

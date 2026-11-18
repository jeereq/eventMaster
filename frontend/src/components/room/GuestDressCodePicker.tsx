'use client';

import React from 'react';
import { Shirt } from '@/components/icons';
import { cn } from '@/lib/cn';
import { GUEST_DRESS_CODES, type GuestDressCode, type GuestDressCodeSetting } from '@/lib/roomGuestSimulation';

/** Couleurs proposées pour « Aux couleurs de la fête » (4 au plus). */
export const PARTY_THEME_COLORS: ReadonlyArray<{ hex: string; name: string }> = [
  { hex: '#c1121f', name: 'Rouge' },
  { hex: '#6d1a2a', name: 'Bordeaux' },
  { hex: '#e5739a', name: 'Rose' },
  { hex: '#b5179e', name: 'Fuchsia' },
  { hex: '#6b2fa0', name: 'Violet' },
  { hex: '#1d4ed8', name: 'Bleu roi' },
  { hex: '#1f2a44', name: 'Bleu marine' },
  { hex: '#7cb7e8', name: 'Bleu ciel' },
  { hex: '#1fb5a8', name: 'Turquoise' },
  { hex: '#0f5c4d', name: 'Émeraude' },
  { hex: '#2d6a4f', name: 'Vert' },
  { hex: '#f2c94c', name: 'Jaune' },
  { hex: '#f28c28', name: 'Orange' },
  { hex: '#c8a24a', name: 'Or' },
  { hex: '#b8b8c0', name: 'Argent' },
  { hex: '#d8c3a5', name: 'Beige' },
  { hex: '#f4f1de', name: 'Blanc' },
  { hex: '#111114', name: 'Noir' },
];

const MAX_COLORS = 4;

/**
 * Thème de la soirée pour les invités simulés : tenues variées, soirée blanche,
 * gala, traditionnel… ou aux couleurs choisies pour la fête.
 */
export default function GuestDressCodePicker({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: GuestDressCodeSetting;
  onChange: (next: GuestDressCodeSetting) => void;
  disabled?: boolean;
  className?: string;
}) {
  const colors = value.colors ?? [];
  const hint = GUEST_DRESS_CODES.find((d) => d.id === value.id)?.hint;
  const toggleColor = (hex: string) => {
    const next = colors.includes(hex) ? colors.filter((c) => c !== hex) : [...colors, hex].slice(-MAX_COLORS);
    onChange({ id: 'couleurs', colors: next });
  };
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <label
        className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 text-xs font-bold text-muted"
        title={hint}
      >
        <Shirt className="h-3.5 w-3.5" aria-hidden />
        <span>Thème</span>
        <select
          value={value.id}
          disabled={disabled}
          onChange={(e) => {
            const id = e.target.value as GuestDressCode;
            onChange(id === 'couleurs' ? { id, colors: colors.length > 0 ? colors : ['#c1121f', '#c8a24a'] } : { id });
          }}
          className="max-w-[11rem] bg-transparent text-xs font-bold text-foreground outline-none"
          aria-label="Thème de la soirée (tenues des invités)"
        >
          {GUEST_DRESS_CODES.map((d) => (
            <option key={d.id} value={d.id}>{d.label}</option>
          ))}
        </select>
      </label>
      {value.id === 'couleurs' ? (
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label={`Couleurs de la fête (${MAX_COLORS} au plus)`}>
          {PARTY_THEME_COLORS.map((c) => {
            const on = colors.includes(c.hex);
            return (
              <button
                key={c.hex}
                type="button"
                disabled={disabled}
                title={c.name}
                aria-label={c.name}
                aria-pressed={on}
                onClick={() => toggleColor(c.hex)}
                className={cn(
                  'h-7 w-7 rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  on ? 'border-foreground ring-2 ring-primary/60' : 'border-border opacity-80 hover:opacity-100',
                )}
                style={{ background: c.hex }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

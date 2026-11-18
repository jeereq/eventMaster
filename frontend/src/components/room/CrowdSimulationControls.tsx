'use client';

/**
 * « Salle remplie » pour les visiteurs : un bouton qui remplit le plan d'invités simulés
 * (2D et 3D), le taux de remplissage et le thème de la soirée.
 */

import React from 'react';
import { Users } from '@/components/icons';
import { cn } from '@/lib/cn';
import GuestDressCodePicker from '@/components/room/GuestDressCodePicker';
import {
  DEFAULT_GUEST_SIMULATION,
  GUEST_FILL_CHOICES,
  type GuestDressCodeSetting,
  type GuestSimulationSettings,
} from '@/lib/roomGuestSimulation';

export default function CrowdSimulationControls({
  crowd,
  onCrowdChange,
  dressCode,
  onDressCodeChange,
  seeded,
  className,
}: {
  crowd: GuestSimulationSettings | null;
  onCrowdChange: (next: GuestSimulationSettings | null) => void;
  dressCode: GuestDressCodeSetting | null;
  onDressCodeChange: (next: GuestDressCodeSetting) => void;
  /** Réglages enregistrés sur le plan, repris à l'activation. */
  seeded?: Partial<GuestSimulationSettings> | null;
  className?: string;
}) {
  const on = Boolean(crowd);
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)} role="group" aria-label="Salle remplie">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => onCrowdChange(on ? null : { ...DEFAULT_GUEST_SIMULATION, ...(seeded ?? {}) })}
        title={on ? 'Vider la salle' : 'Voir la salle remplie d’invités'}
        className={cn(
          'inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] border px-3 text-xs font-semibold transition touch-manipulation',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          on ? 'border-primary bg-primary-solid text-primary-foreground' : 'border-border bg-surface text-foreground hover:bg-surface-muted',
        )}
      >
        <Users className="h-4 w-4" aria-hidden />
        {on ? 'Salle remplie ✓' : 'Salle remplie'}
      </button>
      {crowd ? (
        <>
          <label className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 text-xs font-bold text-muted">
            <span>Remplissage</span>
            <select
              value={String(crowd.fill)}
              onChange={(e) => onCrowdChange({ ...crowd, fill: Number(e.target.value) })}
              className="bg-transparent text-xs font-bold text-foreground outline-none"
              aria-label="Part des places occupées"
            >
              {GUEST_FILL_CHOICES.map((f) => (
                <option key={f} value={String(f)}>{Math.round(f * 100)} %</option>
              ))}
            </select>
          </label>
          <label className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-button)] border border-border bg-surface-muted px-3 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={crowd.dancing}
              onChange={(e) => onCrowdChange({ ...crowd, dancing: e.target.checked })}
              className="size-4 rounded border-border"
            />
            Piste animée
          </label>
          <GuestDressCodePicker value={dressCode ?? { id: 'mixte' }} onChange={onDressCodeChange} />
        </>
      ) : null}
    </div>
  );
}

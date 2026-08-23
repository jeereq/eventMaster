'use client';

import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import {
  applyRoomAmbiencePreset,
  DEFAULT_AMBIENCE_SCOPE,
  type AmbienceApplyScope,
  type RoomAmbiencePreset,
  type RoomLayoutBlueprint,
} from '@/lib/roomLayoutUtils';
import { describeAmbienceChanges } from '@/lib/roomAmbienceUtils';
import { cn } from '@/lib/cn';

const SCOPE_OPTIONS: { key: keyof AmbienceApplyScope; label: string }[] = [
  { key: 'walls', label: 'Murs' },
  { key: 'floor', label: 'Sol' },
  { key: 'theme', label: 'Thème' },
  { key: 'furniture', label: 'Mobilier' },
  { key: 'lighting', label: 'Éclairage' },
];

export default function RoomAmbiencePreviewModal({
  open,
  onClose,
  blueprint,
  preset,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  blueprint: RoomLayoutBlueprint;
  preset: RoomAmbiencePreset;
  onApply: (scope: AmbienceApplyScope) => void;
}) {
  const [scope, setScope] = useState<AmbienceApplyScope>(DEFAULT_AMBIENCE_SCOPE);

  const previewBlueprint = useMemo(
    () => applyRoomAmbiencePreset(blueprint, preset, scope),
    [blueprint, preset, scope],
  );
  const changes = useMemo(
    () => describeAmbienceChanges(blueprint, preset, scope),
    [blueprint, preset, scope],
  );

  const toggleScope = (key: keyof AmbienceApplyScope) => {
    setScope((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Aperçu — ${preset.label}`}
      description="Comparez l’ambiance actuelle et le résultat avant d’appliquer."
      size="xl"
      footer={(
        <div className="flex w-full justify-between gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={() => onApply(scope)}
            disabled={!Object.values(scope).some(Boolean)}
          >
            Appliquer l’ambiance
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map(({ key, label }) => (
            <label
              key={key}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold cursor-pointer transition',
                scope[key]
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={scope[key]}
                onChange={() => toggleScope(key)}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-muted">Actuel</p>
            <div className="h-40 rounded-[var(--radius-card)] overflow-hidden border border-border">
              <RoomLayoutPreview blueprint={blueprint} quality="thumb" force2d className="h-full w-full" />
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-muted mx-auto hidden sm:block" />
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-primary">Après application</p>
            <div className="h-40 rounded-[var(--radius-card)] overflow-hidden border border-primary/30 ring-1 ring-primary/15">
              <RoomLayoutPreview blueprint={previewBlueprint} quality="thumb" force2d className="h-full w-full" />
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-button)] border border-border bg-surface-muted/50 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase text-muted mb-1.5">Modifications</p>
          <ul className="space-y-0.5">
            {changes.map((line) => (
              <li key={line} className="text-[11px] text-foreground">{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
}

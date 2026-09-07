'use client';

import React from 'react';
import { Aperture, Clapperboard, Droplets, Paintbrush, Box } from 'lucide-react';
import {
  INVITATION_ART_STYLES,
  type InvitationArtStyleId,
} from '@/config/invitationArtStyles';
import { cn } from '@/lib/cn';

function iconFor(id: InvitationArtStyleId) {
  if (id === 'dessin-anime') return Clapperboard;
  if (id === 'illustration') return Paintbrush;
  if (id === 'aquarelle') return Droplets;
  if (id === 'stylise-3d') return Box;
  return Aperture;
}

export default function InvitationArtStylePicker({
  id,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  value: InvitationArtStyleId;
  onChange: (id: InvitationArtStyleId) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p id={`${id}-label`} className="text-xs font-bold text-muted uppercase tracking-wider">
        Style de la carte
      </p>
      <div
        role="radiogroup"
        aria-labelledby={`${id}-label`}
        className="grid grid-cols-2 sm:grid-cols-3 gap-1.5"
      >
        {INVITATION_ART_STYLES.map((style) => {
          const Icon = iconFor(style.id);
          const selected = value === style.id;
          return (
            <button
              key={style.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(style.id)}
              className={cn(
                'min-h-11 px-2.5 py-2 rounded-xl border text-left transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                selected
                  ? 'border-primary bg-primary/10 shadow-xs'
                  : 'border-border bg-surface hover:border-primary/40',
                disabled && 'opacity-60',
              )}
            >
              <span className="flex items-center gap-1.5">
                <Icon className={cn('w-3.5 h-3.5 shrink-0', selected ? 'text-primary' : 'text-muted')} aria-hidden />
                <span className="text-xs font-bold text-foreground">{style.label}</span>
              </span>
              <span className="block text-[11px] text-muted mt-0.5 leading-snug">{style.summary}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, Store } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { VendorRegisterTrack } from '@/lib/registerVendorIntent';

const TRACKS: Array<{
  id: VendorRegisterTrack;
  title: string;
  hint: string;
  icon: typeof Building2;
}> = [
  {
    id: 'venue',
    title: 'Je publie une salle',
    hint: 'Espace, domaine ou complexe à réserver, avec plan 2D/3D.',
    icon: Building2,
  },
  {
    id: 'service',
    title: 'Je suis prestataire',
    hint: 'Traiteur, photo, DJ, décoration, location de matériel…',
    icon: Store,
  },
];

export default function RegisterVendorTrackPicker({
  onSelect,
}: {
  onSelect: (track: VendorRegisterTrack) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
          Que souhaitez-vous référencer ?
        </h2>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          Deux inscriptions distinctes : l’une pour les salles, l’autre pour les métiers de service.
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Connectez-vous
          </Link>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {TRACKS.map((track) => {
          const Icon = track.icon;
          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={cn(
                'flex items-start gap-3 min-h-11 p-3.5 rounded-[var(--radius-card)] border border-border bg-surface text-left',
                'hover:border-primary/40 hover:bg-primary/5 transition touch-manipulation',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              )}
            >
              <span className="w-10 h-10 rounded-[var(--radius-button)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{track.title}</span>
                <span className="block text-xs text-muted mt-0.5 leading-relaxed">{track.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

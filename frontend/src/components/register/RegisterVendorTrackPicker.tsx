'use client';

import React from 'react';
import Link from 'next/link';
import { Building2, ChevronLeft, Store } from 'lucide-react';
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
    title: 'Une salle à réserver',
    hint: 'Espace, domaine ou complexe. Les organisateurs voient le lieu, demandent un devis, bloquent une date.',
    icon: Building2,
  },
  {
    id: 'service',
    title: 'Un métier de service',
    hint: 'Traiteur, photo, DJ, décoration, location de matériel… Vous vous déplacez ou livrez.',
    icon: Store,
  },
];

export default function RegisterVendorTrackPicker({
  onSelect,
  onBack,
  loginHref = '/login',
}: {
  onSelect: (track: VendorRegisterTrack) => void;
  onBack?: () => void;
  loginHref?: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 min-h-11 text-xs font-semibold text-muted hover:text-foreground mb-1 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-[var(--radius-button)]"
          >
            <ChevronLeft className="w-3.5 h-3.5" aria-hidden />
            Changer de type de compte
          </button>
        ) : null}
        <p className="text-sm text-muted leading-relaxed">
          Déjà un compte ?{' '}
          <Link href={loginHref} className="font-semibold text-primary hover:underline">
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
                <Icon className="w-5 h-5" aria-hidden />
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

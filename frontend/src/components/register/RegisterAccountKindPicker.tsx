'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Compass, Store, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { TenantAccountKind } from '@/lib/marketplace';
import {
  REGISTER_KIND_DESCRIPTIONS,
  REGISTER_KIND_ORDER,
  REGISTER_KIND_TITLES,
} from '@/lib/registerAccountKinds';

const KIND_ICONS: Record<TenantAccountKind, typeof Calendar> = {
  ORGANIZER: Calendar,
  CLIENT: Compass,
  VENDOR: Store,
  BOTH: Sparkles,
};

export default function RegisterAccountKindPicker({
  loginHref,
  onSelect,
}: {
  loginHref: string;
  onSelect: (kind: TenantAccountKind) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted leading-relaxed">
        Déjà un compte ?{' '}
        <Link href={loginHref} className="font-semibold text-primary hover:underline">
          Connectez-vous
        </Link>
      </p>

      <div className="grid grid-cols-1 gap-2">
        {REGISTER_KIND_ORDER.map((kind) => {
          const Icon = KIND_ICONS[kind];
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
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
                <span className="block text-sm font-semibold text-foreground">
                  {REGISTER_KIND_TITLES[kind]}
                </span>
                <span className="block text-xs text-muted mt-0.5 leading-relaxed">
                  {REGISTER_KIND_DESCRIPTIONS[kind]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => onSelect('BOTH')}
        className="w-full min-h-11 px-3 pt-3 mt-1 border-t border-border rounded-none text-left text-xs text-muted hover:text-foreground transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="font-semibold text-foreground">{REGISTER_KIND_TITLES.BOTH}</span>
        <span className="block mt-0.5 leading-relaxed">{REGISTER_KIND_DESCRIPTIONS.BOTH}</span>
      </button>
    </div>
  );
}

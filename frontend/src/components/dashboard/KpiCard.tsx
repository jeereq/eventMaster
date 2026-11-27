'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/** Ombre douce des cartes posées sur le fond dégradé d'en-tête (`em-header-wash`). */
export const CARD_SHADOW = 'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_rgba(16,24,40,0.18)]';

/** Tuile de chiffre clé : icône ronde + libellé, grande valeur, précision dessous. */
export function KpiCard({
  icon,
  label,
  value,
  hint,
  href,
  className,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  className?: string;
  tone?: 'default' | 'warning' | 'danger';
}) {
  const body = (
    <>
      <p className="flex items-center gap-2.5 min-w-0 text-sm text-foreground/80">
        <span
          className={cn(
            'hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 border border-border bg-surface',
            tone === 'danger' && 'text-danger',
            tone === 'warning' && 'text-festive-accent',
            tone === 'default' && 'text-primary',
          )}
        >
          {icon}
        </span>
        <span className="truncate" title={label}>
          {label}
        </span>
      </p>
      <p
        className={cn(
          'mt-4 text-[28px] leading-none font-semibold tracking-tight tabular-nums',
          tone === 'danger' && 'text-danger',
          tone === 'warning' && 'text-festive-accent',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-[13px] leading-snug text-muted">{hint}</p> : null}
    </>
  );
  const frame = cn('block rounded-[20px] bg-surface p-4 sm:p-5 min-w-0', CARD_SHADOW, className);
  return href ? (
    <Link
      href={href}
      className={cn(
        frame,
        'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(16,24,40,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={frame}>{body}</div>
  );
}

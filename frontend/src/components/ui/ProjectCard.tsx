'use client';

import React from 'react';
import { Eye } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Palette de bandeaux type Asana (couleurs chaudes + indigo EventMaster). */
const ACCENT_STRIPES = [
  '#4573d2',
  '#f06a6a',
  '#f1bd6c',
  '#5da283',
  '#9b51e0',
  '#e362e3',
  '#4f46e5',
  '#4186e0',
  '#aaaca6',
  '#fc8f66',
] as const;

export function accentFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return ACCENT_STRIPES[hash % ACCENT_STRIPES.length];
}

export type ProjectCardLayout = 'grid' | 'list';

export type StatusPillTone = 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate' | 'primary';

const STATUS_PILL_TONES: Record<StatusPillTone, string> = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  slate: 'bg-surface-muted text-muted border border-border',
  primary: 'bg-primary/10 text-primary',
};

/** Pastille statut style KaziPay (texte coloré sur fond teinté). */
export function StatusPill({
  children,
  tone = 'amber',
  className,
}: {
  children: React.ReactNode;
  tone?: StatusPillTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap',
        STATUS_PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Lien d’action « Voir détails » (icône œil). */
export function ListRowAction({
  children = 'Voir détails',
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-muted',
        'group-hover:text-foreground transition-colors',
        className,
      )}
    >
      <Eye className="w-3.5 h-3.5 shrink-0" />
      <span className="hidden sm:inline">{children}</span>
    </span>
  );
}

/** Conteneur vertical pour les lignes liste. */
export const LIST_STACK_CLASS = 'flex flex-col gap-2.5';

export interface ProjectCardProps {
  id: string;
  title: string;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  /**
   * Colonne métrique (ex. montant) — vue liste uniquement.
   * Affichée à droite du titre, avant le statut.
   */
  value?: React.ReactNode;
  /** Sous-ligne sous `value` (référence, id…) */
  valueMeta?: React.ReactNode;
  /** Pastille / statut (vue liste) */
  status?: React.ReactNode;
  /** Contenu aligné à droite (badges…) — alias / complément de status */
  aside?: React.ReactNode;
  /** Icône dans le carré coloré (sinon initiale du titre) */
  icon?: React.ReactNode;
  cover?: React.ReactNode;
  accentColor?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
  layout?: ProjectCardLayout;
  className?: string;
  children?: React.ReactNode;
}

export function ProjectCard({
  id,
  title,
  meta,
  description,
  value,
  valueMeta,
  status,
  aside,
  icon,
  cover,
  accentColor,
  actions,
  footer,
  onClick,
  layout = 'grid',
  className,
  children,
}: ProjectCardProps) {
  const stripe = accentColor ?? accentFromId(id);
  const interactive = Boolean(onClick);
  const initial = (title?.trim()?.charAt(0) || '?').toUpperCase();

  if (layout === 'list') {
    return (
      <div className={cn('space-y-0', className)}>
        <div
          role={interactive ? 'button' : undefined}
          tabIndex={interactive ? 0 : undefined}
          onClick={onClick}
          onKeyDown={
            interactive
              ? (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick?.();
                  }
                }
              : undefined
          }
          className={cn(
            'group relative flex items-center gap-3 sm:gap-4',
            'rounded-[var(--radius-card)] border border-border bg-surface',
            'px-3.5 py-3 sm:px-4 sm:py-3.5',
            'transition-colors duration-120',
            'hover:bg-card-hover hover:border-border-subtle',
            interactive && 'cursor-pointer',
          )}
        >
          {/* Icône carrée */}
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
            style={{ backgroundColor: `${stripe}22`, color: stripe }}
            aria-hidden
          >
            {icon ? (
              icon
            ) : cover ? (
              <div className="h-full w-full overflow-hidden rounded-xl">{cover}</div>
            ) : (
              initial
            )}
          </div>

          {/* Titre + sous-titre */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground tracking-tight">{title}</p>
            {meta && (
              <div className="mt-0.5 truncate text-xs text-muted leading-snug">{meta}</div>
            )}
            {description && (
              <div className="mt-0.5 text-xs text-muted line-clamp-1 leading-relaxed sm:hidden">
                {description}
              </div>
            )}
          </div>

          {/* Métrique (montant / compteur) */}
          {(value != null && value !== '') || valueMeta ? (
            <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[4.5rem] text-right">
              {value != null && value !== '' && (
                <p className="text-sm font-semibold text-foreground tracking-tight tabular-nums">
                  {value}
                </p>
              )}
              {valueMeta && (
                <p className="mt-0.5 text-[11px] text-muted truncate max-w-[9rem]">{valueMeta}</p>
              )}
            </div>
          ) : null}

          {/* Statut / badges */}
          {(status || aside) && (
            <div
              className="hidden md:flex shrink-0 items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {status}
              {aside}
            </div>
          )}

          {/* Actions — toujours visibles (style « Voir détails ») */}
          {actions && (
            <div
              className="flex shrink-0 items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
        {children && (
          <div className="mt-1.5 ml-1 sm:ml-14 space-y-1.5">{children}</div>
        )}
      </div>
    );
  }

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface',
        'transition-[background-color,border-color] duration-120 ease-out',
        'hover:bg-card-hover hover:border-border-subtle',
        interactive && 'cursor-pointer',
        className,
      )}
    >
      <div className="relative h-12 shrink-0 overflow-hidden" style={{ backgroundColor: stripe }}>
        {cover ? (
          <div className="absolute inset-0">{cover}</div>
        ) : (
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 55%)',
            }}
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-semibold leading-snug text-foreground tracking-tight">
            {title}
          </h3>
          {meta && <div className="text-xs text-muted space-y-0.5">{meta}</div>}
          {description && (
            <div className="text-xs text-muted line-clamp-2 leading-relaxed">{description}</div>
          )}
        </div>
        {children}
        {(actions || footer || status) && (
          <div
            className="mt-auto flex items-center justify-between gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {status}
              {footer}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

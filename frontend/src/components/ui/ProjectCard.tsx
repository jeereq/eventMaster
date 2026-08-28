'use client';

import React from 'react';
import { ArrowRight, Eye } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Palette de fonds média (sans photo) — mêmes tons que la vitrine. */
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

export function coverFromPhotos(photos?: Array<string | null> | null): string | undefined {
  if (!Array.isArray(photos)) return undefined;
  return photos.find((u): u is string => typeof u === 'string' && u.trim().length > 0);
}

export type ProjectCardLayout = 'grid' | 'list';

export type StatusPillTone = 'amber' | 'emerald' | 'rose' | 'sky' | 'violet' | 'slate' | 'primary';

const STATUS_PILL_TONES: Record<StatusPillTone, string> = {
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  violet: 'bg-primary/10 text-primary',
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
export const LIST_STACK_CLASS = 'em-list-stack';

const CARD_HOVER =
  'shadow-[var(--shadow-soft)] hover:border-primary/40 hover:shadow-[0_22px_44px_-24px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 transition duration-200';

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
  /** Pastille / statut (vue liste, ou overlay grille si `badge` absent) */
  status?: React.ReactNode;
  /** Contenu aligné à droite (badges…) — alias / complément de status */
  aside?: React.ReactNode;
  /** Pastille overlay (grille) / au-dessus du titre (liste), style vitrine */
  badge?: React.ReactNode;
  /** Ligne sous le titre sur le média (date, forfait…) */
  overlayMeta?: React.ReactNode;
  /** URL de couverture (photo événement, etc.) */
  coverUrl?: string | null;
  /** Icône dans le média / vignette (sinon initiale du titre) */
  icon?: React.ReactNode;
  cover?: React.ReactNode;
  accentColor?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Libellé CTA grille — défaut « Voir la fiche » si la carte est cliquable */
  ctaLabel?: string;
  hideCta?: boolean;
  onClick?: () => void;
  layout?: ProjectCardLayout;
  className?: string;
  children?: React.ReactNode;
}

function MediaFallback({
  stripe,
  icon,
  initial,
  className,
  compact,
}: {
  stripe: string;
  icon?: React.ReactNode;
  initial: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', className)} style={{ backgroundColor: stripe }}>
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, transparent 55%)',
        }}
        aria-hidden
      />
      <span className="relative z-10 text-white/95 drop-shadow-sm">
        {icon ? (
          <span className={cn('flex items-center justify-center', compact ? '[&>svg]:w-5 [&>svg]:h-5' : '[&>svg]:w-8 [&>svg]:h-8')}>
            {icon}
          </span>
        ) : (
          <span className={cn('font-semibold tracking-tight', compact ? 'text-lg' : 'text-3xl')}>{initial}</span>
        )}
      </span>
    </div>
  );
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
  badge,
  overlayMeta,
  coverUrl,
  icon,
  cover,
  accentColor,
  actions,
  footer,
  ctaLabel,
  hideCta,
  onClick,
  layout = 'grid',
  className,
  children,
}: ProjectCardProps) {
  const stripe = accentColor ?? accentFromId(id);
  const interactive = Boolean(onClick);
  const initial = (title?.trim()?.charAt(0) || '?').toUpperCase();
  const overlayBadge = badge ?? (layout === 'grid' ? status : undefined);
  const showCta = !hideCta && interactive;

  const media = coverUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverUrl}
      alt={title ? `Visuel de ${title}` : 'Visuel de l’élément'}
      loading="lazy"
      decoding="async"
      className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
    />
  ) : cover ? (
    <div className="w-full h-full">{cover}</div>
  ) : (
    <MediaFallback stripe={stripe} icon={icon} initial={initial} className="w-full h-full" />
  );

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
            'group relative flex items-center gap-3 sm:gap-4 overflow-hidden',
            'rounded-[var(--radius-card)] border border-border bg-surface',
            'p-2.5 sm:p-3',
            'shadow-[var(--shadow-soft)] hover:border-primary/35 hover:shadow-[var(--shadow-soft)] transition',
            interactive && 'cursor-pointer',
          )}
        >
          <div className="w-20 h-16 sm:w-28 sm:h-20 rounded-md overflow-hidden bg-surface-muted shrink-0">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverUrl}
                alt={title ? `Visuel de ${title}` : 'Visuel de l’élément'}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : cover ? (
              <div className="w-full h-full">{cover}</div>
            ) : (
              <MediaFallback stripe={stripe} icon={icon} initial={initial} compact className="w-full h-full" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            {overlayBadge ? <div className="flex flex-wrap items-center gap-1">{overlayBadge}</div> : null}
            <p className="truncate text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition">
              {title}
            </p>
            {meta && <div className="truncate text-xs text-muted leading-snug">{meta}</div>}
            {description && (
              <div className="text-xs text-muted line-clamp-1 leading-relaxed sm:hidden">{description}</div>
            )}
          </div>

          {(value != null && value !== '') || valueMeta ? (
            <div className="hidden sm:flex flex-col items-end shrink-0 min-w-[4.5rem] text-right">
              {value != null && value !== '' && (
                <p className="text-sm font-semibold text-foreground tracking-tight tabular-nums">{value}</p>
              )}
              {valueMeta && <p className="mt-0.5 text-[11px] text-muted truncate max-w-[9rem]">{valueMeta}</p>}
            </div>
          ) : null}

          {(status || aside) && (
            <div className="hidden md:flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              {overlayBadge ? aside : (
                <>
                  {status}
                  {aside}
                </>
              )}
            </div>
          )}

          {actions && (
            <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
        {children && <div className="mt-1.5 ml-1 sm:ml-[7.5rem] space-y-1.5">{children}</div>}
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
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface',
        CARD_HOVER,
        interactive && 'cursor-pointer',
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        {media}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none" />
        {overlayBadge ? (
          <div className="absolute top-2.5 left-2.5 z-10 max-w-[calc(100%-1.25rem)]">
            <span className="inline-flex items-center rounded-full bg-white/95 backdrop-blur-sm shadow-sm">
              {overlayBadge}
            </span>
          </div>
        ) : null}
        <div className="absolute left-3 right-3 bottom-2.5 text-white z-10">
          <p className="font-display font-semibold text-sm leading-snug line-clamp-2 drop-shadow">{title}</p>
          {overlayMeta ? <p className="text-[11px] text-white/85 mt-0.5 line-clamp-1">{overlayMeta}</p> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        {meta && <div className="text-xs text-muted space-y-0.5 min-w-0">{meta}</div>}
        {description && <div className="text-xs text-muted line-clamp-2 leading-relaxed">{description}</div>}
        {children}
        {(showCta || actions || footer) && (
          <div
            className="mt-auto flex items-center justify-between gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1 flex items-center gap-2">
              {showCta ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  {ctaLabel || 'Voir la fiche'}
                  <ArrowRight className="w-3 h-3 transition group-hover:translate-x-0.5" />
                </span>
              ) : (
                footer
              )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
          </div>
        )}
        {showCta && footer ? <div className="text-[11px] text-muted">{footer}</div> : null}
      </div>
    </div>
  );
}

'use client';

import React from 'react';
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

export interface ProjectCardProps {
  id: string;
  title: string;
  meta?: React.ReactNode;
  description?: React.ReactNode;
  /** Contenu aligné à droite en vue liste (badges, statut…), style Asana */
  aside?: React.ReactNode;
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
  aside,
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
            'group relative flex items-center gap-3 rounded-[var(--radius-button)] px-2.5 py-2',
            'border border-transparent bg-transparent',
            'transition-colors duration-120 em-soft-hover',
            'hover:bg-surface hover:border-border',
            interactive && 'cursor-pointer',
          )}
        >
          <span
            className="h-8 w-1 shrink-0 rounded-full"
            style={{ backgroundColor: stripe }}
            aria-hidden
          />
          {cover && (
            <div className="h-9 w-12 shrink-0 overflow-hidden rounded-md bg-surface-muted border border-border">
              {cover}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground tracking-tight">{title}</p>
            {meta && <div className="mt-0.5 truncate text-xs text-muted">{meta}</div>}
            {description && (
              <div className="mt-0.5 text-xs text-muted line-clamp-1 leading-relaxed">{description}</div>
            )}
          </div>
          {aside && (
            <div
              className="hidden sm:flex shrink-0 items-center gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {aside}
            </div>
          )}
          {actions && (
            <div
              className="flex shrink-0 items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </div>
        {children && (
          <div className="ml-3.5 pl-3 border-l border-border mb-1 space-y-1.5 py-1">
            {children}
          </div>
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
          {description && <div className="text-xs text-muted line-clamp-2 leading-relaxed">{description}</div>}
        </div>
        {children}
        {(actions || footer) && (
          <div
            className="mt-auto flex items-center justify-between gap-2 pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">{footer}</div>
            {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

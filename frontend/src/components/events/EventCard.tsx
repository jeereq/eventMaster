'use client';

import React from 'react';
import { Calendar } from '@/components/icons';
import { cn } from '@/lib/cn';

export interface EventCardProps {
  title: string;
  location?: string | null;
  roomName?: string | null;
  coverUrl?: string | null;
  kindLabel?: string | null;
  guests?: number | null;
  dateLabel: string;
  /** « Dans 12 j », « Demain », « Terminé »… */
  timing?: string;
  past?: boolean;
  isPublic?: boolean;
  layout?: 'grid' | 'list';
  onOpen: () => void;
  /** Menu d’actions (déjà mis en forme par l’appelant). */
  actions?: React.ReactNode;
}

function Cover({ coverUrl, title, className }: { coverUrl?: string | null; title: string; className?: string }) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`Visuel de ${title}`}
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none', className)}
      />
    );
  }
  return (
    <div className={cn('flex h-full w-full items-center justify-center bg-primary/10 text-primary', className)}>
      <Calendar className="h-9 w-9" aria-hidden />
    </div>
  );
}

/** Carte d’événement : visuel (s’il existe), titre, lieu, date et menu d’actions. */
export default function EventCard({
  title,
  location,
  roomName,
  coverUrl,
  kindLabel,
  guests,
  dateLabel,
  timing,
  past,
  isPublic,
  layout = 'list',
  onOpen,
  actions,
}: EventCardProps) {
  const isGrid = layout === 'grid';
  const hasCover = Boolean(coverUrl);
  const details = [
    kindLabel,
    guests && guests > 0 ? `${guests} invité${guests > 1 ? 's' : ''}` : null,
    isPublic ? 'Public' : null,
  ].filter(Boolean) as string[];
  const place = [roomName, location].filter(Boolean).join(' · ');

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'group relative cursor-pointer rounded-[var(--radius-card)] border border-border bg-surface transition hover:border-primary/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        isGrid ? 'p-3' : 'flex items-center gap-4 p-3 pr-16 sm:gap-5',
      )}
    >
      {hasCover || isGrid ? (
        <div
          className={cn(
            'shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-surface-muted',
            isGrid ? 'aspect-[16/10] w-full' : 'h-20 w-28 sm:h-24 sm:w-36',
          )}
        >
          <Cover coverUrl={coverUrl} title={title} />
        </div>
      ) : null}

      <div className={cn('min-w-0 flex-1', isGrid ? 'px-1 pb-1 pt-3' : '')}>
        <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm text-foreground">
          <time>{dateLabel}</time>
          {timing ? <span className={cn('ml-2', past ? 'text-muted' : 'text-primary')}>{timing}</span> : null}
        </p>
        {place ? <p className="mt-0.5 truncate text-sm text-muted">{place}</p> : null}
        {details.length > 0 ? <p className="mt-0.5 truncate text-xs text-muted">{details.join(' · ')}</p> : null}
      </div>

      {actions ? (
        <div
          className={cn('shrink-0', isGrid ? 'absolute bottom-3 right-3' : 'absolute right-3 top-1/2 -translate-y-1/2')}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      ) : null}
    </article>
  );
}

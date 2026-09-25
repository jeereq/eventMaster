'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';

export interface NextEventCardEvent {
  id: string;
  title: string;
  date: string;
  location?: string | null;
}

/** Prochain événement à venir (date ≥ aujourd’hui), le plus proche d’abord. */
export function pickNextEvent<T extends { date: string }>(events: T[]): T | null {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let best: T | null = null;
  let bestTime = Infinity;
  for (const event of events) {
    const time = new Date(event.date).getTime();
    if (Number.isNaN(time) || time < startOfToday.getTime()) continue;
    if (time < bestTime) {
      best = event;
      bestTime = time;
    }
  }
  return best;
}

function countdownLabel(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

/** Carte « prochain événement » du nouveau design : fond vert profond, compte à rebours, date et lieu. */
export default function NextEventCard({
  event,
  href,
}: {
  event: NextEventCardEvent;
  href?: string;
}) {
  const date = new Date(event.date);
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const dateLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = hasTime
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')
    : null;

  return (
    <Link
      href={href ?? `/dashboard/events/${event.id}`}
      className="group relative block overflow-hidden rounded-3xl bg-[#064e3b] p-5 sm:p-6 text-white transition hover:bg-[#065f46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full border-[28px] border-[#10b981] opacity-25"
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#10b981] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-[#022c22]">
            {countdownLabel(date)}
          </span>
          <span className="text-xs text-[#a7f3d0]">Prochain événement</span>
        </div>
        <h2 className="font-display text-2xl sm:text-[1.75rem] font-semibold leading-tight text-white">
          {event.title}
        </h2>
        <div className="flex flex-col gap-2 text-sm text-[#d1fae5] sm:flex-row sm:flex-wrap sm:gap-x-6">
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="first-letter:uppercase">
              {dateLabel}
              {timeLabel ? ` · ${timeLabel}` : ''}
            </span>
          </span>
          {event.location ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin className="h-[18px] w-[18px] shrink-0" aria-hidden />
              <span className="truncate">{event.location}</span>
            </span>
          ) : null}
        </div>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6ee7b7]">
          Ouvrir l’événement
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}

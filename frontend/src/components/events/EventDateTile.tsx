'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { kindPhotoUrl, type EventKindId, EVENT_KIND_IDS } from '@/lib/eventConfig';

const SLIDE_MS = 3500;

/**
 * Pastille de l’en-tête d’un événement : elle alterne entre la date et la photo de l’événement.
 * Photos de l’événement en priorité, sinon celle de son type. Un clic passe à la suivante ;
 * le défilement s’arrête au survol, au focus et si l’utilisateur réduit les animations.
 */
export default function EventDateTile({
  date,
  photos,
  kind,
}: {
  date: string;
  photos?: string[] | null;
  kind?: string | null;
}) {
  const knownKind = (EVENT_KIND_IDS as readonly string[]).includes(kind ?? '') ? (kind as EventKindId) : 'OTHER';
  const own = (Array.isArray(photos) ? photos : []).filter(
    (url) => typeof url === 'string' && url && !/\.(mp4|webm|mov)(\?|$)/i.test(url),
  );
  const images = own.length > 0 ? own.slice(0, 4) : [kindPhotoUrl(knownKind)];
  const [broken, setBroken] = useState<string[]>([]);
  const slides = images.filter((url) => !broken.includes(url));
  const count = slides.length + 1; // la date, puis les photos

  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = step % count;

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setTimeout(() => setStep((n) => n + 1), SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [step, paused, count]);

  const day = new Date(date).toLocaleDateString('fr-FR', { day: 'numeric' });
  const month = new Date(date).toLocaleDateString('fr-FR', { month: 'short' });
  const slide = (index: number) =>
    cn(
      'absolute inset-0 transition-[opacity,translate] duration-700 ease-out motion-reduce:transition-none',
      current === index ? 'translate-x-0 opacity-100' : index < current ? '-translate-x-full opacity-0' : 'translate-x-full opacity-0',
    );

  return (
    <button
      type="button"
      onClick={() => setStep((n) => n + 1)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-label={current === 0 ? `${day} ${month} — voir la photo` : 'Photo de l’événement — voir la date'}
      className="relative h-[84px] w-[84px] shrink-0 overflow-hidden rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-24 sm:w-24"
    >
      <span className={cn(slide(0), 'em-header-wash flex flex-col items-center justify-center')}>
        <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-[32px]">
          {day}
        </span>
        <span className="mt-1 text-xs font-medium text-muted">{month}</span>
      </span>
      {slides.map((url, index) => (
        <span key={url} className={slide(index + 1)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- les photos viennent d’hébergeurs variés. */}
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBroken((list) => [...list, url])}
          />
        </span>
      ))}
      {/* Repères de position. */}
      {count > 1 ? (
        <span aria-hidden className="absolute inset-x-0 bottom-1.5 flex justify-center gap-1">
          {Array.from({ length: count }).map((_, index) => (
            <span
              key={index}
              className={cn(
                'h-1.5 rounded-full shadow-[0_0_3px_rgba(0,0,0,0.35)] transition-all duration-300',
                current === index ? 'w-3.5' : 'w-1.5 opacity-60',
                current === 0 ? 'bg-primary' : 'bg-white',
              )}
            />
          ))}
        </span>
      ) : null}
    </button>
  );
}

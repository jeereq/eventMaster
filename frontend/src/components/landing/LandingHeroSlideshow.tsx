'use client';

import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import { Pause, Play } from '@/components/icons';
import { cn } from '@/lib/cn';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Fond du haut de page : photos qui s'enchaînent en fondu (300ms) toutes les 5 secondes.
 * Plus léger qu'une vidéo ; une seule photo fixe en mouvement réduit ; bouton pause.
 */
export default function LandingHeroSlideshow({
  images,
  overlay,
  className,
  intervalMs = 5000,
}: {
  images: { src: string; position?: string }[];
  overlay?: ReactNode;
  className?: string;
  intervalMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );
  const running = !paused && !reducedMotion && images.length > 1;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [running, images.length, intervalMs]);

  return (
    <div className={cn('absolute inset-0', className)}>
      {images.map((image, i) => (
        <Image
          key={image.src}
          src={image.src}
          alt=""
          aria-hidden
          fill
          priority={i === 0}
          sizes="100vw"
          className={cn(
            'object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none',
            i === index ? 'opacity-100' : 'opacity-0',
          )}
          style={{ objectPosition: image.position ?? 'center' }}
        />
      ))}
      {overlay}
      {!reducedMotion && images.length > 1 ? (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Relancer le défilement des photos' : 'Arrêter le défilement des photos'}
          className="absolute bottom-3 right-3 z-20 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}

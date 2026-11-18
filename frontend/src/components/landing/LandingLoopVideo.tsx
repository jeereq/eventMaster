'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import { Pause, Play } from '@/components/icons';
import { cn } from '@/lib/cn';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Économie de données ou réseau lent : on garde la photo pour ne pas consommer le forfait du visiteur. */
function isConnectionTooSlow() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  }).connection;
  if (!connection) return false;
  // La 3G suffit pour ces boucles courtes (0,2 à 0,9 Mo) : seuls le mode économie de données et la 2G gardent la photo.
  return Boolean(connection.saveData) || ['slow-2g', '2g'].includes(connection.effectiveType ?? '');
}

/**
 * Courte vidéo muette en boucle, posée sur sa première image.
 * La photo s'affiche toujours d'abord : la vidéo ne se charge qu'à l'approche de l'écran
 * et se met en pause dès qu'elle en sort.
 */
export default function LandingLoopVideo({
  src,
  poster,
  alt,
  sizes,
  priority = false,
  className,
  pauseClassName = 'bottom-2 right-2',
  overlay,
}: {
  src: string;
  poster: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Position du bouton pause, si une autre image recouvre le coin par défaut. */
  pauseClassName?: string;
  /** Calques posés sur la vidéo (teinte, dégradé) mais sous le bouton pause, qui reste lisible. */
  overlay?: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [pausedByUser, setPausedByUser] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => true,
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible && !isConnectionTooSlow()) setMounted(true);
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (inView && !pausedByUser && !reducedMotion) {
      // Refus possible (mode économie d'énergie) : la photo reste affichée.
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [inView, pausedByUser, reducedMotion, mounted]);

  const showVideo = mounted && !reducedMotion;

  return (
    <div ref={rootRef} className={cn('absolute inset-0', className)}>
      <Image src={poster} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      {showVideo ? (
        <video
          ref={videoRef}
          src={src}
          aria-hidden
          muted
          loop
          playsInline
          preload="auto"
          onPlaying={() => setPlaying(true)}
          className={cn(
            'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
            playing || pausedByUser ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
      {overlay}
      {showVideo && (playing || pausedByUser) ? (
        <button
          type="button"
          onClick={() => setPausedByUser((paused) => !paused)}
          aria-label={pausedByUser ? 'Lancer la vidéo' : 'Mettre la vidéo en pause'}
          className={cn(
            // 44 × 44 px : la racine du site est à 15px, `h-11` ne ferait que 41px.
            'absolute z-20 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
            pauseClassName,
          )}
        >
          {pausedByUser ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
        </button>
      ) : null}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { isVideoUrl, listingSrcSet, sizedMediaUrl } from '@/lib/marketplace';

const GALLERY_IMAGE_WIDTH = 1600;
const GALLERY_SRCSET_WIDTHS = [800, 1200, 1600, 2000];

interface Props {
  open: boolean;
  onClose: () => void;
  photos: string[];
  title: string;
  startIndex?: number;
}

function GalleryContent({ photos, title, startIndex }: { photos: string[]; title: string; startIndex: number }) {
  const count = photos.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), Math.max(count - 1, 0)));

  const step = useCallback(
    (delta: number) => setIndex((current) => (count === 0 ? 0 : (current + delta + count) % count)),
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, step]);

  const current = photos[index];
  if (!current) return <p className="p-6 text-sm text-muted">Aucune photo pour cette salle.</p>;

  return (
    <div className="relative bg-stage">
      {isVideoUrl(current) ? (
        <video src={current} controls playsInline className="mx-auto max-h-[70vh] w-full object-contain" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sizedMediaUrl(current, GALLERY_IMAGE_WIDTH)}
          srcSet={listingSrcSet(current, GALLERY_SRCSET_WIDTHS)}
          sizes="(min-width: 1024px) 896px, 100vw"
          alt={`${title} — photo ${index + 1} sur ${count}`}
          className="mx-auto max-h-[70vh] w-full object-contain"
        />
      )}
      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Photo précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Photo suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-foreground/70 text-background backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <p className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-foreground/70 px-3 py-1 text-xs font-semibold tabular-nums text-background" aria-live="polite">
            {index + 1} / {count}
          </p>
        </>
      ) : null}
    </div>
  );
}

export default function VenueGalleryDialog({ open, onClose, photos, title, startIndex = 0 }: Props) {
  return (
    <Modal open={open} onClose={onClose} title={`Galerie · ${title}`} size="xl" contentClassName="p-0">
      <GalleryContent photos={photos} title={title} startIndex={startIndex} />
    </Modal>
  );
}

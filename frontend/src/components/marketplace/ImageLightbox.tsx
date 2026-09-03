'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { sizedMediaUrl } from '@/lib/marketplace';

export interface ImageLightboxProps {
  urls: string[] | null;
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

export default function ImageLightbox({
  urls,
  initialIndex = 0,
  onClose,
  title,
}: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const openedAtRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (urls && urls.length > 0) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, urls.length - 1)));
    }
  }, [urls, initialIndex]);

  const total = urls?.length ?? 0;
  const currentUrl = urls && total > 0 ? urls[currentIndex] : null;

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  const requestClose = useCallback(() => {
    if (Date.now() - openedAtRef.current < 350) return;
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!currentUrl || !mounted) return;

    openedAtRef.current = Date.now();
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus sur le bouton fermer
    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [currentUrl, mounted, handleNext, handlePrev, requestClose]);

  if (!mounted || !currentUrl || total === 0) return null;

  const displaySrc = sizedMediaUrl(currentUrl, 1600);

  const content = (
    <div
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Visionneuse photo en plein écran'}
      onClick={requestClose}
    >
      <div
        className="relative max-w-5xl w-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt={title ? `${title} — Photo ${currentIndex + 1} sur ${total}` : `Photo ${currentIndex + 1} sur ${total}`}
          className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-200"
          loading="eager"
          decoding="async"
        />

        {/* Bouton Fermer */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={requestClose}
          className="absolute -top-12 right-0 p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition"
          aria-label="Fermer la visionneuse (Échap)"
        >
          <X className="w-6 h-6" aria-hidden />
        </button>

        {/* Compteur & Légende */}
        <div
          className="absolute -top-12 left-0 text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-xs flex items-center gap-2"
          aria-live="polite"
        >
          <span>{currentIndex + 1} / {total}</span>
          {title && <span className="hidden sm:inline text-white/60">· {title}</span>}
        </div>

        {/* Navigation Précédent / Suivant */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:-left-14 p-3 min-h-11 min-w-11 inline-flex items-center justify-center text-white rounded-full bg-black/60 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition shadow-lg"
              aria-label="Photo précédente (Flèche gauche)"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:-right-14 p-3 min-h-11 min-w-11 inline-flex items-center justify-center text-white rounded-full bg-black/60 hover:bg-black/90 focus-visible:outline-none focus-visible:ring-2 focus-white transition shadow-lg"
              aria-label="Photo suivante (Flèche droite)"
            >
              <ChevronRight className="w-6 h-6" aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

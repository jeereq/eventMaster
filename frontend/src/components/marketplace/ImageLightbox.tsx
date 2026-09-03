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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
    if (Date.now() - openedAtRef.current < 300) return;
    onClose();
  }, [onClose]);

  // Gestes tactiles mobiles : glisser gauche/droite pour naviguer, glisser bas pour fermer
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    // Détection swipe horizontal prioritaire
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
    } else if (deltaY > 90 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      // Glissement vers le bas pour fermer (geste naturel mobile)
      requestClose();
    }
  };

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
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fade-in touch-pan-y"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Visionneuse photo en plein écran'}
      onClick={requestClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Barre d'en-tête responsive garantie visible quel que soit le ratio d'écran / orientation */}
      <div className="absolute top-0 inset-x-0 p-3 sm:p-6 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between z-20 pointer-events-none">
        {/* Compteur & Légende */}
        <div
          className="text-white/90 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md pointer-events-auto flex items-center gap-2 shadow-xs"
          aria-live="polite"
        >
          <span>{currentIndex + 1} / {total}</span>
          {title && <span className="hidden sm:inline text-white/60">· {title}</span>}
        </div>

        {/* Bouton Fermer */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={requestClose}
          className="p-2.5 min-h-11 min-w-11 inline-flex items-center justify-center text-white/90 hover:text-white rounded-full bg-white/10 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition pointer-events-auto shadow-xs"
          aria-label="Fermer la visionneuse (Échap ou glisser vers le bas)"
        >
          <X className="w-6 h-6" aria-hidden />
        </button>
      </div>

      {/* Cadre de visualisation de l'image */}
      <div
        className="relative max-w-5xl w-full flex-1 flex items-center justify-center my-10 sm:my-12"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt={title ? `${title} — Photo ${currentIndex + 1} sur ${total}` : `Photo ${currentIndex + 1} sur ${total}`}
          className="max-h-[78vh] sm:max-h-[84vh] max-w-full object-contain rounded-2xl shadow-2xl transition-all duration-200"
          loading="eager"
          decoding="async"
        />

        {/* Navigation Précédent / Suivant */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 sm:-left-12 p-3 min-h-11 min-w-11 inline-flex items-center justify-center text-white rounded-full bg-black/60 hover:bg-black/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition shadow-lg touch-manipulation"
              aria-label="Photo précédente (Glisser vers la droite)"
            >
              <ChevronLeft className="w-6 h-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 sm:-right-12 p-3 min-h-11 min-w-11 inline-flex items-center justify-center text-white rounded-full bg-black/60 hover:bg-black/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-white transition shadow-lg touch-manipulation"
              aria-label="Photo suivante (Glisser vers la gauche)"
            >
              <ChevronRight className="w-6 h-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Indicateur d'aide gestuelle sur mobile */}
      {total > 1 && (
        <div className="sm:hidden absolute bottom-2 inset-x-0 text-center text-[10px] text-white/50 pointer-events-none pb-[env(safe-area-inset-bottom)]">
          Glissez vers la gauche ou la droite pour défiler
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Plein écran d'un élément précis, sans le recréer (le canvas WebGL garde son contexte).
 * Utilise l'API Fullscreen quand elle existe ; sinon (iPhone) un plein écran « CSS » à position fixe.
 */
export function useElementFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [nativeActive, setNativeActive] = useState(false);
  const [cssActive, setCssActive] = useState(false);

  useEffect(() => {
    const onChange = () => setNativeActive(document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    if (!cssActive) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCssActive(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [cssActive]);

  const enter = useCallback(async () => {
    const element = ref.current;
    if (!element) return;
    if (document.fullscreenEnabled && element.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        /* refusé par le navigateur : on bascule sur le plein écran CSS */
      }
    }
    setCssActive(true);
  }, []);

  const exit = useCallback(async () => {
    setCssActive(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* déjà sorti */
      }
    }
  }, []);

  const isFullscreen = nativeActive || cssActive;
  const toggle = useCallback(() => (isFullscreen ? exit() : enter()), [enter, exit, isFullscreen]);

  return { ref, isFullscreen, cssFullscreen: cssActive, enter, exit, toggle };
}

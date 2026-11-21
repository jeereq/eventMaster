'use client';

import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { ImageCropRect } from '@/lib/roomLayoutUtils';
import { screenImageWindow } from '@/lib/roomScreenImage';

/**
 * Image choisie pour un écran (cinéma, mur LED, télévision) : chargée une fois, recadrée
 * sur la zone choisie dans l'éditeur puis ajustée au format de la dalle, sans déformation.
 */
export function useScreenImageTexture(
  url: string | undefined,
  crop: ImageCropRect | undefined,
  screenAspect: number,
): THREE.Texture | null {
  const [loaded, setLoaded] = useState<{ url: string; tex: THREE.Texture } | null>(null);

  useEffect(() => {
    if (!url) return undefined;
    let alive = true;
    let tex: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      url,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        tex = t;
        if (alive) setLoaded({ url, tex: t });
        else t.dispose();
      },
      undefined,
      () => {
        if (alive) setLoaded(null);
      },
    );
    return () => {
      alive = false;
      tex?.dispose();
    };
  }, [url]);

  const tex = loaded && loaded.url === url ? loaded.tex : null;
  const cx = crop?.x;
  const cy = crop?.y;
  const cw = crop?.w;
  const ch = crop?.h;

  const view = useMemo(() => {
    if (!tex) return null;
    const img = tex.image as { width?: number; height?: number } | undefined;
    const win = screenImageWindow(
      { width: img?.width ?? 1, height: img?.height ?? 1 },
      cx != null && cy != null && cw != null && ch != null ? { x: cx, y: cy, w: cw, h: ch } : undefined,
      screenAspect,
    );
    // Une copie par réglage : la même image peut servir à plusieurs écrans de formats différents.
    const next = tex.clone();
    next.repeat.set(win.repeatX, win.repeatY);
    next.offset.set(win.offsetX, win.offsetY);
    next.wrapS = THREE.ClampToEdgeWrapping;
    next.wrapT = THREE.ClampToEdgeWrapping;
    next.needsUpdate = true;
    return next;
  }, [tex, cx, cy, cw, ch, screenAspect]);
  useEffect(() => () => view?.dispose(), [view]);
  return view;
}

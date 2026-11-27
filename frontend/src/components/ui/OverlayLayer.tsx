'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useOverlayLayer } from './Modal';

type OverlayLayerProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Couche plein écran rendue directement dans `<body>`.
 * Un `fixed inset-0` laissé dans la page reste coincé sous le header et la barre latérale dès qu'un
 * parent crée un contexte d'empilement (z-index, transform, isolation…). Ici la couche échappe à la
 * page et prend sa place dans la pile des fenêtres (voir `useOverlayLayer`).
 */
const OverlayLayer = React.forwardRef<HTMLDivElement, OverlayLayerProps>(function OverlayLayer(
  { style, children, ...rest },
  ref,
) {
  const zIndex = useOverlayLayer(true);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} {...rest} style={{ ...style, zIndex }}>
      {children}
    </div>,
    document.body,
  );
});

export default OverlayLayer;

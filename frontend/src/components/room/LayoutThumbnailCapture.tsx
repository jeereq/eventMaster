'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { RoomWebGLCaptureApi } from '@/components/RoomWebGLViewer';
import { ensureBlueprintDefaults, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';

const RoomWebGLViewer = dynamic(() => import('@/components/RoomWebGLViewer'), { ssr: false });

const CAPTURE_WIDTH_PX = 960;
const CAPTURE_HEIGHT_PX = 600;
const OFFSCREEN_LEFT_PX = -12000;
const CAPTURE_SCALE = 1;
const CAPTURE_RETRY_MS = 700;
const CAPTURE_MAX_ATTEMPTS = 20;

interface Props {
  blueprint: RoomLayoutBlueprint;
  onCaptured: (dataUrl: string) => void;
  onFailed: () => void;
}

/**
 * Rend la salle hors écran puis en tire une image (même procédé que le plan imprimé des invités).
 * Réessaie tant que la scène 3D n'est pas prête.
 */
export default function LayoutThumbnailCapture({ blueprint, onCaptured, onFailed }: Props) {
  const captureRef = useRef<RoomWebGLCaptureApi>(null);
  const onCapturedRef = useRef(onCaptured);
  const onFailedRef = useRef(onFailed);

  useEffect(() => {
    onCapturedRef.current = onCaptured;
    onFailedRef.current = onFailed;
  });

  const webglBlueprint = useMemo(() => {
    const base = ensureBlueprintDefaults(blueprint);
    return {
      ...base,
      metadata: {
        ...base.metadata,
        showChandeliers: base.metadata.showChandeliers ?? true,
        showUplights: base.metadata.showUplights ?? true,
        showDecorPlants: base.metadata.showDecorPlants ?? true,
        renderQuality: 'showcase' as const,
      },
    };
  }, [blueprint]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const tryCapture = () => {
      if (cancelled) return;
      attempts += 1;
      const dataUrl = captureRef.current?.capturePng(CAPTURE_SCALE);
      if (dataUrl) {
        onCapturedRef.current(dataUrl);
        return;
      }
      if (attempts >= CAPTURE_MAX_ATTEMPTS) {
        onFailedRef.current();
        return;
      }
      timer = window.setTimeout(tryCapture, CAPTURE_RETRY_MS);
    };

    timer = window.setTimeout(tryCapture, CAPTURE_RETRY_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [webglBlueprint]);

  return (
    <div
      className="pointer-events-none fixed overflow-hidden opacity-0"
      style={{ left: OFFSCREEN_LEFT_PX, top: 0, width: CAPTURE_WIDTH_PX, height: CAPTURE_HEIGHT_PX }}
      aria-hidden
    >
      <RoomWebGLViewer
        ref={captureRef}
        blueprint={webglBlueprint}
        selected={[]}
        onSelect={() => undefined}
        readOnly
        previewMode
        className="h-[600px] w-[960px]"
      />
    </div>
  );
}

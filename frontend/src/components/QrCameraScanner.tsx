'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Camera, CameraOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface QrCameraScannerProps {
  active: boolean;
  onScan: (payload: string) => void;
  onError?: (message: string) => void;
}

export default function QrCameraScanner({ active, onScan, onError }: QrCameraScannerProps) {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      handledRef.current = false;
      setCameraError(null);
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
        scannerRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const startScanner = async () => {
      setStarting(true);
      setCameraError(null);
      handledRef.current = false;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 12,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const size = Math.min(viewfinderWidth, viewfinderHeight, 280) * 0.75;
              return { width: size, height: size };
            },
            aspectRatio: 1,
          },
          (decodedText) => {
            if (handledRef.current) return;
            handledRef.current = true;
            onScan(decodedText);
            scanner.stop().catch(() => undefined);
            scannerRef.current = null;
          },
          () => {
            // scan failure per frame — ignore
          },
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message.includes('NotAllowed')
              ? 'Accès à la caméra refusé. Autorisez la caméra dans les paramètres du navigateur.'
              : err.message.includes('NotFound')
                ? 'Aucune caméra détectée sur cet appareil.'
                : 'Impossible d\'activer la caméra.'
            : 'Impossible d\'activer la caméra.';
        setCameraError(msg);
        onError?.(msg);
      } finally {
        if (!cancelled) setStarting(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => undefined);
        scannerRef.current = null;
      }
    };
  }, [active, onScan, onError, regionId]);

  if (!active) return null;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-black min-h-[240px]">
        <div id={regionId} className="w-full [&>video]:rounded-2xl [&>video]:w-full [&>video]:object-cover" />
        {starting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 text-white">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Activation de la caméra…</p>
          </div>
        )}
      </div>
      {cameraError && (
        <p className="text-sm text-rose-600 font-medium">{cameraError}</p>
      )}
      <p className="text-xs text-slate-500 text-center">
        Placez le QR code de confirmation de présence de l&apos;invité dans le cadre.
      </p>
    </div>
  );
}

export function QrCameraToggle({
  cameraActive,
  onToggle,
}: {
  cameraActive: boolean;
  onToggle: () => void;
}) {
  return (
    <Button type="button" variant={cameraActive ? 'danger' : 'secondary'} onClick={onToggle}>
      {cameraActive ? (
        <>
          <CameraOff className="w-4 h-4" />
          Fermer la caméra
        </>
      ) : (
        <>
          <Camera className="w-4 h-4" />
          Scanner avec la caméra
        </>
      )}
    </Button>
  );
}

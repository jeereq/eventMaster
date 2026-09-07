'use client';

import React from 'react';
import { Compass } from 'lucide-react';

interface Room2DScaleCompassProps {
  widthM: number;
  heightM: number;
  showGrid?: boolean;
  className?: string;
}

export default function Room2DScaleCompass({
  widthM,
  heightM,
  showGrid = true,
  className = '',
}: Room2DScaleCompassProps) {
  const safeW = Math.max(5, widthM || 20);
  const safeH = Math.max(5, heightM || 16);
  const areaM2 = Math.round(safeW * safeH);

  // Déterminer un segment d'échelle adapté (ex: 2m ou 5m)
  const scaleM = safeW >= 25 ? 5 : safeW >= 12 ? 2 : 1;
  const scalePct = (scaleM / safeW) * 100;

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Grille métrique d'arrière-plan (subdivisions 1m) */}
      {showGrid && (
        <svg
          className="absolute inset-0 w-full h-full opacity-15"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            <pattern
              id="arch-metric-grid"
              width={(1 / safeW) * 100}
              height={(1 / safeH) * 100}
              patternUnits="userSpaceOnUse"
            >
              <rect
                width={(1 / safeW) * 100}
                height={(1 / safeH) * 100}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.15"
                opacity="0.6"
              />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#arch-metric-grid)" />
        </svg>
      )}

      {/* Rose des vents / Boussole NORD (Haut gauche) */}
      <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur-xs text-white shadow-2xs border border-white/10 text-xs font-bold tracking-wider">
        <Compass className="w-4 h-4 text-amber-400" />
        <span>N</span>
      </div>

      {/* Dimensions réelles de la salle (Haut droite) */}
      <div className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur-xs text-white shadow-2xs border border-white/10 text-xs font-mono font-semibold tabular-nums">
        {safeW.toFixed(1)} m × {safeH.toFixed(1)} m ({areaM2} m²)
      </div>

      {/* Barre d'échelle métrique (Bas droite) */}
      <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col items-end gap-0.5 px-2.5 py-1.5 rounded-md bg-black/60 backdrop-blur-xs text-white shadow-2xs border border-white/10">
        <div className="flex items-center justify-between text-xs font-mono font-bold w-full gap-2.5">
          <span>0</span>
          <span>{scaleM} m</span>
        </div>
        <div className="h-1.5 bg-white/20 rounded-xs overflow-hidden flex border border-white/40" style={{ width: `${Math.max(48, Math.min(100, scalePct * 2.5))}px` }}>
          <div className="w-1/2 h-full bg-white" />
          <div className="w-1/2 h-full bg-black/80" />
        </div>
      </div>
    </div>
  );
}

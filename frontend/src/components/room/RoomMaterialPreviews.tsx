'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import {
  getDoorMaterialProps,
  getWallTexture,
  resolveSeatFabricMap,
} from '@/lib/roomWebGLMaterials';
import {
  OPENING_MATERIAL_COLORS,
  SEAT_MATERIAL_COLORS,
  WALL_TEXTURE_COLORS,
  chairTypeLabels,
  getChairVisualClass,
  seatMaterialLabels,
  type ChairType,
  type OpeningMaterial,
  type SeatMaterial,
  type WallTextureStyle,
} from '@/lib/roomLayoutUtils';

function texturePreviewStyle(tex: THREE.Texture | undefined | null): string | undefined {
  if (!tex?.image) return undefined;
  const img = tex.image as HTMLCanvasElement | HTMLImageElement;
  if (img instanceof HTMLCanvasElement) {
    try {
      return `url(${img.toDataURL('image/jpeg', 0.82)})`;
    } catch {
      return undefined;
    }
  }
  if (img instanceof HTMLImageElement && img.src) return `url(${img.src})`;
  return undefined;
}

export function WallTextureSwatch({
  texture,
  className,
}: {
  texture: WallTextureStyle;
  className?: string;
}) {
  const preview = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    try {
      return texturePreviewStyle(getWallTexture(texture).map);
    } catch {
      return undefined;
    }
  }, [texture]);

  return (
    <span
      className={cn('block rounded border border-black/10 bg-cover bg-center', className)}
      style={{
        backgroundColor: WALL_TEXTURE_COLORS[texture],
        backgroundImage: preview,
      }}
    />
  );
}

export function SeatMaterialSwatch({
  material,
  className,
}: {
  material: SeatMaterial;
  className?: string;
}) {
  const preview = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    try {
      const colors = SEAT_MATERIAL_COLORS[material];
      return texturePreviewStyle(resolveSeatFabricMap(material, colors.seat).map);
    } catch {
      return undefined;
    }
  }, [material]);

  return (
    <span
      className={cn('block rounded border border-black/10 bg-cover bg-center', className)}
      style={{
        backgroundColor: SEAT_MATERIAL_COLORS[material].seat,
        backgroundImage: preview,
      }}
    />
  );
}

export function OpeningMaterialSwatch({
  material,
  className,
}: {
  material: OpeningMaterial;
  className?: string;
}) {
  const preview = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    if (material === 'glass') return undefined;
    try {
      return texturePreviewStyle(getDoorMaterialProps(material).map);
    } catch {
      return undefined;
    }
  }, [material]);

  return (
    <span
      className={cn('block rounded border border-black/10 bg-cover bg-center', className)}
      style={{
        backgroundColor: OPENING_MATERIAL_COLORS[material],
        backgroundImage: preview,
      }}
    />
  );
}

export function ChairTypeSwatch({
  chairType,
  className,
}: {
  chairType: ChairType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded border border-black/10 bg-surface-muted min-h-[2rem]',
        className,
      )}
    >
      <span className={getChairVisualClass(chairType)} style={{ transform: 'scale(1.4)' }} />
    </span>
  );
}

export function ChairTypePicker({
  value,
  onChange,
}: {
  value: ChairType;
  onChange: (next: ChairType) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
      {(Object.keys(chairTypeLabels) as ChairType[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            'flex flex-col items-center gap-1 p-1.5 rounded-[var(--radius-button)] border text-center transition',
            value === k ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'border-border hover:bg-surface-muted',
          )}
        >
          <ChairTypeSwatch chairType={k} className="h-8 w-full" />
          <span className="text-[8px] font-semibold leading-tight line-clamp-2">{chairTypeLabels[k]}</span>
        </button>
      ))}
    </div>
  );
}

export function SeatMaterialPicker({
  value,
  onChange,
}: {
  value: SeatMaterial;
  onChange: (next: SeatMaterial) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1">
      {(Object.keys(seatMaterialLabels) as SeatMaterial[]).map((k) => (
        <button
          key={k}
          type="button"
          title={seatMaterialLabels[k]}
          onClick={() => onChange(k)}
          className={cn(
            'p-1 rounded border transition',
            value === k ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:bg-surface-muted',
          )}
        >
          <SeatMaterialSwatch material={k} className="h-5 w-full" />
        </button>
      ))}
    </div>
  );
}

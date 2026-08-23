'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { cn } from '@/lib/cn';
import {
  getDoorMaterialProps,
  getWallTexture,
  resolveSeatFabricMap,
  resolveZoneMaterialMap,
  ZONE_MATERIAL_COLORS,
} from '@/lib/roomWebGLMaterials';
import {
  OPENING_MATERIAL_COLORS,
  SEAT_MATERIAL_COLORS,
  WALL_TEXTURE_COLORS,
  chairTypeLabels,
  getChairVisualClass,
  seatMaterialLabels,
  tableSurfaceLabels,
  zoneMaterialLabels,
  type ChairType,
  type OpeningMaterial,
  type RoomAmbiencePreset,
  type SeatMaterial,
  type TableSurfaceStyle,
  type WallTextureStyle,
  type ZoneMaterial,
} from '@/lib/roomLayoutUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import { lightingPresetLabels } from '@/lib/roomRenderQuality';
import { chandelierTypeLabels } from '@/lib/roomCeilingUtils';
import { Eye } from 'lucide-react';
import type { FloorType } from '@/lib/roomThemeUtils';

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

export function TableSurfaceSwatch({
  surface,
  className,
}: {
  surface: TableSurfaceStyle;
  className?: string;
}) {
  const preview = useMemo(() => {
    if (surface === 'glass') return 'linear-gradient(135deg, rgba(248,250,252,0.9), rgba(203,213,225,0.5))';
    if (surface === 'whiteLacquer') return 'linear-gradient(180deg, #ffffff, #e2e8f0)';
    const urls: Partial<Record<TableSurfaceStyle, string>> = {
      wood: '/floors/table-wood.svg',
      linen: '/floors/table-linen.svg',
      walnut: '/floors/wood-charcoal.png',
      marble: '/floors/marble-calacatta.png',
      darkWood: '/floors/wood-rustic.png',
    };
    const url = urls[surface];
    return url ? `url(${url})` : undefined;
  }, [surface]);

  return (
    <span
      className={cn('block rounded border border-black/10 bg-cover bg-center', className)}
      style={{ background: preview, backgroundColor: '#f5f0e8' }}
    />
  );
}

export function TableSurfacePicker({
  value,
  onChange,
}: {
  value: TableSurfaceStyle;
  onChange: (next: TableSurfaceStyle) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {(Object.keys(tableSurfaceLabels) as TableSurfaceStyle[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            'p-1.5 rounded-[var(--radius-button)] border text-center transition',
            value === k ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:bg-surface-muted',
          )}
        >
          <TableSurfaceSwatch surface={k} className="h-6 w-full mb-1" />
          <span className="text-[8px] font-semibold leading-tight">{tableSurfaceLabels[k]}</span>
        </button>
      ))}
    </div>
  );
}

export function ZoneMaterialSwatch({
  material,
  className,
}: {
  material: ZoneMaterial;
  className?: string;
}) {
  const preview = useMemo(() => {
    if (typeof document === 'undefined') return undefined;
    try {
      const zone = resolveZoneMaterialMap(material);
      return texturePreviewStyle(zone.map);
    } catch {
      return undefined;
    }
  }, [material]);

  return (
    <span
      className={cn('block rounded border border-black/10 bg-cover bg-center', className)}
      style={{
        backgroundColor: ZONE_MATERIAL_COLORS[material],
        backgroundImage: preview,
      }}
    />
  );
}

export function ZoneMaterialPicker({
  value,
  onChange,
}: {
  value: ZoneMaterial;
  onChange: (next: ZoneMaterial) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {(Object.keys(zoneMaterialLabels) as ZoneMaterial[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            'p-1.5 rounded-[var(--radius-button)] border text-center transition',
            value === k ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:bg-surface-muted',
          )}
        >
          <ZoneMaterialSwatch material={k} className="h-6 w-full mb-1" />
          <span className="text-[8px] font-semibold leading-tight">{zoneMaterialLabels[k]}</span>
        </button>
      ))}
    </div>
  );
}

export function RoomAmbienceCard({
  preset,
  onClick,
  onPreview,
  active = false,
  authorName,
}: {
  preset: RoomAmbiencePreset;
  onClick: () => void;
  onPreview?: () => void;
  active?: boolean;
  authorName?: string;
}) {
  return (
    <div className="relative group w-full">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'text-left p-2.5 rounded-[var(--radius-button)] border transition space-y-1.5 w-full',
          active
            ? 'border-primary ring-2 ring-primary/25 bg-primary/5'
            : 'border-border hover:border-primary/40 hover:bg-surface-muted',
        )}
      >
      <div className="flex gap-1 h-8">
        <WallTextureSwatch texture={preset.wallTexture} className="flex-1" />
        <span
          className="flex-1 rounded border border-black/10 bg-cover bg-center"
          style={resolveFloorStyle(preset.floorType as FloorType, preset.floorColor)}
        />
        {preset.tableSurface ? (
          <TableSurfaceSwatch surface={preset.tableSurface} className="w-8 shrink-0" />
        ) : null}
      </div>
      <p className="text-[10px] font-bold text-foreground flex items-center gap-1">
        {preset.label}
        {active ? (
          <span className="text-[8px] font-bold uppercase text-primary bg-primary/10 px-1 py-0.5 rounded">
            Active
          </span>
        ) : null}
      </p>
      <p className="text-[9px] text-muted leading-snug line-clamp-2">{preset.description}</p>
      {authorName ? (
        <p className="text-[8px] text-muted">Par {authorName}</p>
      ) : null}
      {preset.lightingPreset ? (
        <p className="text-[8px] font-semibold text-muted flex flex-wrap gap-x-1.5 gap-y-0.5">
          <span className="inline-flex items-center gap-0.5 rounded bg-surface-muted px-1 py-0.5">
            {lightingPresetLabels[preset.lightingPreset]}
          </span>
          {preset.showChandeliers && preset.chandelierType ? (
            <span className="inline-flex items-center gap-0.5 rounded bg-surface-muted px-1 py-0.5">
              {chandelierTypeLabels[preset.chandelierType]}
            </span>
          ) : null}
        </p>
      ) : null}
      </button>
      {onPreview ? (
        <button
          type="button"
          title="Aperçu avant application"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          className="absolute bottom-2 right-2 p-1 rounded-full border border-border bg-white/95 text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition shadow-sm"
        >
          <Eye className="w-3 h-3" />
        </button>
      ) : null}
    </div>
  );
}

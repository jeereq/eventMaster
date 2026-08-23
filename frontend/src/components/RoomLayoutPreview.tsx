'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  RoomLayoutBlueprint,
  getRoomOutlineClipPath,
  resolveTableColor,
  resolveZonePreviewBackground,
  roomTypeLabels,
  ensureBlueprintDefaults,
} from '@/lib/roomLayoutUtils';
import { getSeatCoordinates, getTableVisualStyle } from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import {
  depthScaleForY,
  furnitureDepthStyle,
  resolveFloorStyle,
} from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import ChairRenderer from '@/components/ChairRenderer';
import FixtureRenderer from '@/components/FixtureRenderer';
import RoomWebGLViewer from '@/components/RoomWebGLViewer';
import { cn } from '@/lib/cn';
import type { LightingPreset } from '@/lib/roomRenderQuality';

export type RoomPreviewQuality = 'thumb' | 'standard' | 'showcase';

interface RoomLayoutPreviewProps {
  blueprint: RoomLayoutBlueprint | null;
  className?: string;
  quality?: RoomPreviewQuality;
  showMeta?: boolean;
  /** Conservé pour compatibilité : le showcase WebGL n’utilise plus le slider 2D. */
  showDepthControls?: boolean;
  /** Forcer le rendu 2D même en showcase (listes légères). */
  force2d?: boolean;
  /** Remplace metadata.lightingPreset (ex. créneau programme événement). */
  lightingPreset?: LightingPreset;
}

/** Miniatures / listes : rendu 2D léger, teintes alignées sur le style WebGL. */
function ThumbPreview({
  blueprint,
  className,
}: {
  blueprint: RoomLayoutBlueprint;
  className?: string;
}) {
  const outline = blueprint.roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;
  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
  const floorStyle = {
    ...resolveFloorStyle(floorType, blueprint.metadata.floorImageUrl, theme.accentColor),
    ...(blueprint.metadata.floorColor
      ? { backgroundColor: blueprint.metadata.floorColor }
      : {}),
  };

  return (
    <div
      className={cn(
        'relative aspect-[4/3] h-full min-h-0 overflow-hidden rounded-2xl border border-border bg-[#1a1410]',
        className,
      )}
    >
      <div className="absolute inset-0 opacity-95" style={floorStyle} />
      {outline && (
        <div
          className="absolute pointer-events-none z-[1] overflow-hidden"
          style={{
            left: `${outline.x}%`,
            top: `${outline.y}%`,
            width: `${outline.w}%`,
            height: `${outline.h}%`,
            border: `2px solid ${outline.stroke ?? theme.roomOutline.stroke}`,
            borderRadius: outline.shape === 'circle' ? '50%' : '4px',
            clipPath,
            boxShadow: theme.roomOutline.innerGlow,
            background: outline.fill ?? 'rgba(248,250,252,0.12)',
          }}
        />
      )}
      {blueprint.fixtures.map((f) => (
        <div
          key={f.id}
          className="absolute z-[2] pointer-events-none opacity-90"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.w}%`,
            height: `${f.h}%`,
          }}
        >
          <FixtureRenderer fixture={f} showLabel={false} fill />
        </div>
      ))}
      {blueprint.furniture.map((item) => {
        if (item.kind === 'zone') {
          return (
            <div
              key={item.id}
              className="absolute z-[2] rounded-sm border border-white/20"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.w}%`,
                height: `${item.h}%`,
                background: resolveZonePreviewBackground(item, item.color ?? 'rgba(99,102,241,0.35)'),
                transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
              }}
            />
          );
        }
        if (item.kind === 'table') {
          const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
          const { className: tableClass, style: tableStyle } = getTableVisualStyle(
            item.shape,
            false,
            tableColor,
            item.tableImageUrl,
            item.tableSurface ?? blueprint.metadata.defaultTableSurface,
          );
          return (
            <div
              key={item.id}
              className="absolute z-[3] flex items-center justify-center"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(0.38)${item.rotation ? ` rotate(${item.rotation}deg)` : ''}`,
              }}
            >
              <div className={`${tableClass} origin-center`} style={tableStyle} />
            </div>
          );
        }
        if (item.kind === 'chair') {
          return (
            <div
              key={item.id}
              className="absolute z-[3]"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(0.55) rotate(${item.rotation ?? 0}deg)`,
              }}
            >
              <ChairRenderer chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
            </div>
          );
        }
        if (item.kind === 'row') {
          return (
            <div
              key={item.id}
              className="absolute z-[3] flex gap-0.5"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(0.45) rotate(${item.rotation ?? 0}deg)`,
              }}
            >
              {Array.from({ length: Math.min(item.seatCount, 6) }).map((_, i) => (
                <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
              ))}
            </div>
          );
        }
        return null;
      })}
      <div className="absolute bottom-1 left-1 rounded bg-black/50 px-1.5 py-0.5 text-[8px] font-bold text-white/80">
        3D · {blueprint.metadata.totalSeats} pl.
      </div>
    </div>
  );
}

/** Aperçu détail encore en 2,5D (fallback si force2d). */
function FlatShowcasePreview({
  blueprint,
  className,
}: {
  blueprint: RoomLayoutBlueprint;
  className?: string;
}) {
  const outline = blueprint.roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;
  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
  const floorStyle = resolveFloorStyle(floorType, blueprint.metadata.floorImageUrl, theme.accentColor);
  const amount = 62;

  return (
    <FloorDepthFrame
      amount={amount}
      floorStyle={{
        ...floorStyle,
        ...(blueprint.metadata.floorColor ? { backgroundColor: blueprint.metadata.floorColor } : {}),
      }}
      maxTilt={44}
      className={cn('aspect-[16/10] min-h-[260px] sm:min-h-[340px] rounded-2xl border border-border overflow-hidden', className)}
    >
      {outline && (
        <div
          className="absolute pointer-events-none z-0 overflow-hidden"
          style={{
            left: `${outline.x}%`,
            top: `${outline.y}%`,
            width: `${outline.w}%`,
            height: `${outline.h}%`,
            border: `2px solid ${outline.stroke ?? theme.roomOutline.stroke}`,
            borderRadius: outline.shape === 'circle' ? '50%' : '4px',
            clipPath,
            boxShadow: theme.roomOutline.innerGlow,
          }}
        />
      )}
      {blueprint.fixtures.map((f) => (
        <div
          key={f.id}
          className="absolute z-[1]"
          style={{ left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%`, ...furnitureDepthStyle(f.y, amount) }}
        >
          <FixtureRenderer fixture={f} />
        </div>
      ))}
      {blueprint.furniture.map((item) => {
        if (item.kind === 'zone') {
          return (
            <div
              key={item.id}
              className="absolute z-[1] rounded border border-white/30"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                width: `${item.w}%`,
                height: `${item.h}%`,
                background: resolveZonePreviewBackground(item, item.color ?? 'rgba(49,46,129,0.45)'),
                transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                ...furnitureDepthStyle(item.y + item.h / 2, amount),
              }}
            />
          );
        }
        if (item.kind === 'row') {
          return (
            <div
              key={item.id}
              className="absolute z-[2] flex gap-0.5"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${0.7 * depthScaleForY(item.y, amount)}) rotate(${item.rotation ?? 0}deg)`,
                ...furnitureDepthStyle(item.y, amount),
              }}
            >
              {Array.from({ length: Math.min(item.seatCount, 12) }).map((_, i) => (
                <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="sm" />
              ))}
            </div>
          );
        }
        if (item.kind === 'chair') {
          return (
            <div
              key={item.id}
              className="absolute z-[2]"
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: `translate(-50%, -50%) scale(${0.75 * depthScaleForY(item.y, amount)}) rotate(${item.rotation ?? 0}deg)`,
                ...furnitureDepthStyle(item.y, amount),
              }}
            >
              <ChairRenderer chairType={item.chairType} imageUrl={item.chairImageUrl} size="sm" />
            </div>
          );
        }
        if (item.kind !== 'table') return null;
        const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
        const { className: tableClass, style: tableStyle } = getTableVisualStyle(
          item.shape,
          false,
          tableColor,
          item.tableImageUrl,
          item.tableSurface ?? blueprint.metadata.defaultTableSurface,
        );
        const depthScale = depthScaleForY(item.y, amount);
        return (
          <div
            key={item.id}
            className="absolute z-[2] flex flex-col items-center"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `translate(-50%, -50%) scale(${0.85 * depthScale})${item.rotation ? ` rotate(${item.rotation}deg)` : ''}`,
              ...furnitureDepthStyle(item.y, amount),
            }}
          >
            <div className="relative flex items-center justify-center">
              <div className={`${tableClass} origin-center flex items-center justify-center`} style={tableStyle}>
                <span className="text-[8px] font-bold px-1 truncate max-w-[72px]">{item.name}</span>
              </div>
              {Array.from({ length: Math.min(item.capacity, 10) }).map((_, seatIndex) => {
                const coords = getSeatCoordinates(item.shape, item.capacity, seatIndex, 44);
                return (
                  <span
                    key={seatIndex}
                    className="absolute"
                    style={{
                      left: `calc(50% + ${coords.x}px)`,
                      top: `calc(50% + ${coords.y}px)`,
                      transform: `translate(-50%, -50%) rotate(${coords.rotationDeg ?? 0}deg)`,
                    }}
                  >
                    <ChairRenderer chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </FloorDepthFrame>
  );
}

export default function RoomLayoutPreview({
  blueprint: rawBlueprint,
  className = '',
  quality = 'standard',
  showMeta,
  force2d = false,
  lightingPreset: lightingPresetOverride,
}: RoomLayoutPreviewProps) {
  const showHeader = showMeta ?? quality !== 'thumb';
  const blueprint = rawBlueprint ? ensureBlueprintDefaults(rawBlueprint) : null;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const canvasClass = useMemo(() => {
    if (quality === 'thumb') return 'aspect-[4/3] h-full min-h-0';
    if (quality === 'showcase') return 'aspect-[16/10] min-h-[280px] sm:min-h-[360px]';
    return 'aspect-[4/3] min-h-[200px]';
  }, [quality]);

  if (!blueprint) {
    return (
      <div className={`aspect-[4/3] bg-surface-muted rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted ${className}`}>
        Aperçu indisponible
      </div>
    );
  }

  const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
  const lightingPreset = lightingPresetOverride ?? blueprint.metadata.lightingPreset ?? 'auto';
  const useWebGL = !force2d && quality !== 'thumb' && mounted;

  const webglBlueprint = quality === 'showcase'
    ? {
        ...blueprint,
        metadata: {
          ...blueprint.metadata,
          showChandeliers: blueprint.metadata.showChandeliers ?? true,
          showUplights: blueprint.metadata.showUplights ?? true,
          showCurtains: blueprint.metadata.showCurtains ?? false,
          showDecorPlants: blueprint.metadata.showDecorPlants ?? true,
          showRoof: blueprint.metadata.showRoof ?? true,
          renderQuality: 'showcase' as const,
        },
      }
    : blueprint;

  return (
    <div className={cn('space-y-2', className)}>
      {showHeader && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
          <span>{roomTypeLabels[blueprint.roomType]} · {theme.name}</span>
          <span>
            {blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
            {useWebGL ? ' · WebGL' : ''}
          </span>
        </div>
      )}

      {quality === 'thumb' ? (
        <ThumbPreview blueprint={blueprint} className={className} />
      ) : (
        <div className={cn('relative overflow-hidden rounded-2xl', canvasClass, className)}>
          {!useWebGL && (
            <FlatShowcasePreview
              blueprint={blueprint}
              className="absolute inset-0 h-full w-full rounded-2xl"
            />
          )}
          {useWebGL && (
            <RoomWebGLViewer
              blueprint={webglBlueprint}
              selected={[]}
              onSelect={() => {}}
              readOnly
              previewMode
              renderQuality={quality === 'showcase' ? 'showcase' : 'standard'}
              lightingPreset={lightingPreset}
              className="absolute inset-0 h-full w-full shadow-[var(--shadow-soft)]"
            />
          )}
          {!mounted && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-3">
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                Chargement 3D…
              </span>
            </div>
          )}
        </div>
      )}

      {quality === 'showcase' && useWebGL && (
        <p className="text-[10px] text-muted leading-relaxed">
          Visualisation <span className="font-semibold text-foreground">3D showcase</span> : textures, bloom, vignette et architecture.
          Orbitez pour inspecter la salle.
        </p>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from 'lucide-react';
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
  /** Bouton plein écran sur mobile (showcase WebGL). */
  allowMobileExpand?: boolean;
}

function useIsMobileViewport(maxWidthPx = 639) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [maxWidthPx]);

  return isMobile;
}

type WebGLPreviewProps = {
  webglBlueprint: RoomLayoutBlueprint;
  quality: RoomPreviewQuality;
  lightingPreset: LightingPreset;
  className?: string;
};

function WebGLPreviewCanvas({
  webglBlueprint,
  quality,
  lightingPreset,
  className,
}: Omit<WebGLPreviewProps, 'blueprint'>) {
  return (
    <RoomWebGLViewer
      blueprint={webglBlueprint}
      selected={[]}
      onSelect={() => {}}
      readOnly
      previewMode
      renderQuality={quality === 'showcase' ? 'showcase' : 'standard'}
      lightingPreset={lightingPreset}
      className={cn('absolute inset-0 h-full w-full shadow-[var(--shadow-soft)] touch-none', className)}
    />
  );
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
  allowMobileExpand,
}: RoomLayoutPreviewProps) {
  const showHeader = showMeta ?? quality !== 'thumb';
  const blueprint = rawBlueprint ? ensureBlueprintDefaults(rawBlueprint) : null;
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobileViewport();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const canvasClass = useMemo(() => {
    if (quality === 'thumb') return 'aspect-[4/3] h-full min-h-0';
    if (quality === 'showcase') {
      return 'aspect-[16/10] min-h-[200px] max-h-[min(52vh,420px)] sm:min-h-[360px] sm:max-h-none';
    }
    return 'aspect-[4/3] min-h-[180px] sm:min-h-[200px]';
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
  const canExpand = (allowMobileExpand ?? quality === 'showcase') && useWebGL && isMobile;

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
        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
          <span className="truncate">{roomTypeLabels[blueprint.roomType]} · {theme.name}</span>
          <span className="shrink-0 tabular-nums">
            {blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
            {useWebGL ? ' · 3D' : ''}
          </span>
        </div>
      )}

      {quality === 'thumb' ? (
        <ThumbPreview blueprint={blueprint} className={className} />
      ) : (
        <div className={cn('relative overflow-hidden rounded-2xl border border-border/60 bg-[#1a1410]', canvasClass, className)}>
          {useWebGL ? (
            <WebGLPreviewCanvas
              webglBlueprint={webglBlueprint}
              quality={quality}
              lightingPreset={lightingPreset}
            />
          ) : (
            <FlatShowcasePreview
              blueprint={blueprint}
              className="absolute inset-0 h-full w-full rounded-2xl"
            />
          )}
          {!mounted && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-center pb-3">
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                Chargement 3D…
              </span>
            </div>
          )}
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="absolute top-2 right-2 z-20 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-2 min-h-[44px] text-[11px] font-bold text-white backdrop-blur-sm border border-white/15 active:scale-[0.98] transition"
              aria-label="Agrandir la vue 3D"
            >
              <Maximize2 className="w-4 h-4 shrink-0" />
              Agrandir
            </button>
          ) : null}
        </div>
      )}

      {quality === 'showcase' && useWebGL ? (
        <p className="text-[10px] text-muted leading-relaxed">
          <span className="hidden sm:inline">
            Visualisation <span className="font-semibold text-foreground">3D showcase</span> : textures, bloom, vignette et architecture.
            Orbitez pour inspecter la salle.
          </span>
          <span className="sm:hidden">
            Vue 3D interactive — utilisez <span className="font-semibold text-foreground">Agrandir</span> pour le plein écran et orbiter la salle.
          </span>
        </p>
      ) : null}

      {expanded && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[250] flex flex-col bg-[#0c0a09]"
          role="dialog"
          aria-modal="true"
          aria-label="Vue 3D plein écran"
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{roomTypeLabels[blueprint.roomType]} · {theme.name}</p>
              <p className="text-[10px] text-white/60 tabular-nums">
                {blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 min-h-[44px] min-w-[44px] text-[11px] font-bold text-white border border-white/15 shrink-0"
              aria-label="Réduire la vue 3D"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="sr-only sm:not-sr-only">Réduire</span>
            </button>
          </div>
          <div className="relative flex-1 min-h-0">
            <WebGLPreviewCanvas
              webglBlueprint={webglBlueprint}
              quality={quality}
              lightingPreset={lightingPreset}
              className="rounded-none"
            />
          </div>
          <p className="text-[10px] text-white/55 text-center px-4 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            Glissez pour orbiter · pincez pour zoomer
          </p>
        </div>,
        document.body,
      )}
    </div>
  );
}

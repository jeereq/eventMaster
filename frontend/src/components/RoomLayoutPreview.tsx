'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
 RoomLayoutBlueprint,
 getRoomOutlineClipPath,
 resolveTableColor,
 roomTypeLabels,
 ensureBlueprintDefaults,
} from '@/lib/roomLayoutUtils';
import { getSeatCoordinates, getTableVisualStyle } from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import {
 depthScaleForY,
 furnitureDepthStyle,
 resolveDepthAmount,
 resolveFloorStyle,
} from '@/lib/roomFloorUtils';
import FloorDepthFrame from '@/components/FloorDepthFrame';
import ChairRenderer from '@/components/ChairRenderer';
import FixtureRenderer from '@/components/FixtureRenderer';
import { cn } from '@/lib/cn';

export type RoomPreviewQuality = 'thumb' | 'standard' | 'showcase';

interface RoomLayoutPreviewProps {
 blueprint: RoomLayoutBlueprint | null;
 className?: string;
 quality?: RoomPreviewQuality;
 showMeta?: boolean;
 showDepthControls?: boolean;
}

function DepthSlider({ value, onChange }: { value: number; onChange: (n: number) => void }) {
 return (
 <label className="flex items-center gap-2 text-[10px] font-bold text-muted min-w-0">
 <span className="shrink-0">Profondeur 2D</span>
 <input
 type="range"
 min={0}
 max={100}
 value={value}
 onChange={(e) => onChange(Number(e.target.value))}
 className="flex-1 min-w-[80px] accent-indigo-600"
 />
 <span className="tabular-nums w-9 text-right">{value}%</span>
 </label>
 );
}

export default function RoomLayoutPreview({
 blueprint: rawBlueprint,
 className = '',
 quality = 'standard',
 showMeta,
 showDepthControls,
}: RoomLayoutPreviewProps) {
 const showHeader = showMeta ?? quality !== 'thumb';
 const showSlider = showDepthControls ?? quality === 'showcase';
 const blueprint = rawBlueprint ? ensureBlueprintDefaults(rawBlueprint) : null;
 const storedDepth = resolveDepthAmount(blueprint?.metadata);
 const [localDepth, setLocalDepth] = useState(storedDepth || (quality === 'showcase' ? 58 : 0));

 useEffect(() => {
 const next = resolveDepthAmount(blueprint?.metadata) || (quality === 'showcase' ? 58 : 0);
 setLocalDepth(next);
 }, [blueprint?.metadata.depthAmount, blueprint?.metadata.depthView, quality]);

 const canvasClass = useMemo(() => {
 if (quality === 'thumb') return 'aspect-[4/3] h-full min-h-0';
 if (quality === 'showcase') return 'aspect-[16/10] min-h-[260px] sm:min-h-[340px]';
 return 'aspect-[4/3]';
 }, [quality]);

 if (!blueprint) {
 return (
 <div className={`aspect-[4/3] bg-surface-muted rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted ${className}`}>
 Aperçu indisponible
 </div>
 );
 }

 const amount = localDepth;
 const outline = blueprint.roomOutline;
 const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;
 const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
 const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
 const floorStyle = resolveFloorStyle(floorType, blueprint.metadata.floorImageUrl, theme.accentColor);
 const chairLimit = quality === 'thumb' ? 0 : quality === 'standard' ? 10 : 24;
 const chairRadius = quality === 'showcase' ? 50 : 36;

 return (
 <div className={cn('space-y-2', className)}>
 {showHeader && (
 <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-muted">
 <span>{roomTypeLabels[blueprint.roomType]} · {theme.name}</span>
 <span>{blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m</span>
 </div>
 )}
 {showSlider && (
 <DepthSlider value={amount} onChange={setLocalDepth} />
 )}
 <FloorDepthFrame
 amount={quality === 'thumb' ? 0 : amount}
 floorStyle={floorStyle}
 maxTilt={quality === 'showcase' ? 44 : 36}
 className={cn(canvasClass, 'rounded-2xl border border-border overflow-hidden')}
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
 >
 <div className="absolute inset-0" style={floorStyle} />
 {theme.ambientOverlay && (
 <div className="absolute inset-0" style={{ background: theme.ambientOverlay }} />
 )}
 </div>
 )}

 {blueprint.fixtures.map((fixture) => (
 <div
 key={fixture.id}
 className="absolute"
 style={{
 left: `${fixture.x}%`,
 top: `${fixture.y}%`,
 width: `${fixture.w}%`,
 height: `${fixture.h}%`,
 transform: `scale(${depthScaleForY(fixture.y, amount)})`,
 transformOrigin: '50% 100%',
 ...furnitureDepthStyle(fixture.y, amount),
 filter: amount > 0 ? 'drop-shadow(var(--em-item-shadow, 0 8px 12px rgba(0,0,0,0.25)))' : undefined,
 }}
 >
 <FixtureRenderer fixture={fixture} />
 </div>
 ))}

 {blueprint.furniture.map((item) => {
 if (item.kind === 'zone') {
 return (
 <div
 key={item.id}
 className="absolute border-2 border-dashed border-sky-300 bg-sky-50/60 rounded-xl flex items-center justify-center text-[9px] font-semibold text-sky-700 z-[6]"
 style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.w}%`, height: `${item.h}%` }}
 >
 {item.label}
 </div>
 );
 }

 if (item.kind === 'row') {
 const depthScale = depthScaleForY(item.y, amount);
 return (
 <div
 key={item.id}
 className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
 style={{
 left: `${item.x}%`,
 top: `${item.y}%`,
 transform: `translate(-50%, -50%) scale(${(quality === 'thumb' ? 0.4 : 0.85) * depthScale})`,
 ...furnitureDepthStyle(item.y, amount),
 }}
 >
 <div className="px-3 py-1.5 bg-white/95 border border-border rounded-lg shadow-sm min-w-[72px] text-center">
 <p className="text-[8px] font-bold text-foreground truncate max-w-[100px]">{item.label}</p>
 {quality !== 'thumb' && (
 <div className="flex justify-center gap-0.5 mt-1 flex-wrap max-w-[120px]">
 {Array.from({ length: Math.min(item.seatCount, quality === 'showcase' ? 16 : 8) }).map((_, i) => (
 <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size={quality === 'showcase' ? 'sm' : 'xs'} />
 ))}
 </div>
 )}
 </div>
 </div>
 );
 }

 const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
 const { className: tableClass, style: tableStyle } = getTableVisualStyle(item.shape, false, tableColor, item.tableImageUrl);
 const depthScale = depthScaleForY(item.y, amount);
 const baseScale = quality === 'thumb' ? 0.42 : quality === 'showcase' ? 0.92 : 0.62;

 return (
 <div
 key={item.id}
 className="absolute flex flex-col items-center"
 style={{
 left: `${item.x}%`,
 top: `${item.y}%`,
 transform: `translate(-50%, -50%) scale(${baseScale * depthScale})${item.rotation ? ` rotate(${item.rotation}deg)` : ''}`,
 transformOrigin: '50% 80%',
 ...furnitureDepthStyle(item.y, amount),
 }}
 >
 <div className="relative flex items-center justify-center" style={{ filter: amount > 0 ? 'drop-shadow(var(--em-item-shadow, 0 8px 12px rgba(0,0,0,0.25)))' : undefined }}>
 <div className={`${tableClass} origin-center flex items-center justify-center`} style={tableStyle}>
 {quality !== 'thumb' && (
 <span className="text-[8px] font-bold drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)] px-1 truncate max-w-[72px]">
 {item.name}
 </span>
 )}
 </div>
 {chairLimit > 0 &&
 Array.from({ length: Math.min(item.capacity, chairLimit) }).map((_, seatIndex) => {
 const coords = getSeatCoordinates(item.shape, item.capacity, seatIndex, chairRadius);
 return (
 <span
 key={seatIndex}
 className="absolute"
 style={{
 left: `calc(50% + ${coords.x}px)`,
 top: `calc(50% + ${coords.y}px)`,
 transform: 'translate(-50%, -50%)',
 }}
 >
 <ChairRenderer chairType={item.chairType} imageUrl={item.chairImageUrl} size={quality === 'showcase' ? 'sm' : 'xs'} />
 </span>
 );
 })}
 </div>
 {quality === 'thumb' && (
 <span className="text-[6px] font-bold text-muted bg-white/90 px-0.5 rounded mt-0.5">{item.name}</span>
 )}
 </div>
 );
 })}
 </FloorDepthFrame>
 {quality === 'showcase' && (
 <p className="text-[10px] text-muted leading-relaxed">
 Rendu <span className="font-semibold text-foreground">2,5D</span> : le sol recule en perspective. Réglez la profondeur ; un moteur 3D n’est pas nécessaire.
 </p>
 )}
 </div>
 );
}

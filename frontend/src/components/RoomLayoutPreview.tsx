'use client';

import React from 'react';
import {
 RoomLayoutBlueprint,
 getRoomOutlineClipPath,
 resolveTableColor,
 roomTypeLabels,
 ensureBlueprintDefaults,
} from '@/lib/roomLayoutUtils';
import { getTableVisualStyle } from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import { resolveFloorStyle } from '@/lib/roomFloorUtils';
import ChairRenderer from '@/components/ChairRenderer';
import FixtureRenderer from '@/components/FixtureRenderer';

interface RoomLayoutPreviewProps {
 blueprint: RoomLayoutBlueprint | null;
 className?: string;
}

export default function RoomLayoutPreview({ blueprint: rawBlueprint, className = '' }: RoomLayoutPreviewProps) {
 if (!rawBlueprint) {
 return (
 <div className={`aspect-[4/3] bg-surface-muted rounded-2xl border border-dashed border-border flex items-center justify-center text-xs text-muted ${className}`}>
 Aperçu indisponible
 </div>
 );
 }

 const blueprint = ensureBlueprintDefaults(rawBlueprint);
 const outline = blueprint.roomOutline;
 const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;
 const theme = getRoomTheme(blueprint.metadata.roomThemeId, blueprint);
 const floorType = blueprint.metadata.floorType ?? theme.defaultFloorType;
 const floorStyle = resolveFloorStyle(floorType, blueprint.metadata.floorImageUrl, theme.accentColor);

 return (
 <div className={`space-y-2 ${className}`}>
 <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted">
 <span>{roomTypeLabels[blueprint.roomType]} · {theme.name}</span>
 <span>{blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m</span>
 </div>
 <div
 className="relative aspect-[4/3] border border-border rounded-2xl overflow-hidden em-floor-canvas em-floor-canvas--photo"
 style={floorStyle}
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
 <FixtureRenderer key={fixture.id} fixture={fixture} />
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
 return (
 <div
 key={item.id}
 className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
 style={{ left: `${item.x}%`, top: `${item.y}%` }}
 >
 <div className="px-3 py-1.5 bg-white border border-border rounded-lg shadow-xs min-w-[72px] text-center">
 <p className="text-[8px] font-bold text-foreground truncate max-w-[80px]">{item.label}</p>
 <div className="flex justify-center gap-0.5 mt-1 flex-wrap max-w-[88px]">
 {Array.from({ length: Math.min(item.seatCount, 8) }).map((_, i) => (
 <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
 ))}
 {item.seatCount > 8 && <span className="text-[7px] text-muted">+{item.seatCount - 8}</span>}
 </div>
 </div>
 </div>
 );
 }

 const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
 const { className: tableClass, style: tableStyle } = getTableVisualStyle(item.shape, false, tableColor, item.tableImageUrl);

 return (
 <div
 key={item.id}
 className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10"
 style={{ left: `${item.x}%`, top: `${item.y}%` }}
 >
 <div className={`${tableClass} scale-[0.45] origin-center shadow-xs flex items-center justify-center`} style={tableStyle} />
 <span className="text-[7px] font-bold text-muted bg-white/90 px-1 rounded">{item.name}</span>
 <div className="flex gap-0.5">
 {Array.from({ length: Math.min(item.capacity, 6) }).map((_, i) => (
 <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
 ))}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
}

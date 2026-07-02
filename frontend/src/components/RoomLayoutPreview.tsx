'use client';

import React from 'react';
import {
  RoomLayoutBlueprint,
  getRoomOutlineClipPath,
  resolveTableColor,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import { getTableVisualStyle } from '@/lib/tablePlanUtils';
import ChairRenderer from '@/components/ChairRenderer';
import FixtureRenderer from '@/components/FixtureRenderer';

interface RoomLayoutPreviewProps {
  blueprint: RoomLayoutBlueprint | null;
  className?: string;
}

export default function RoomLayoutPreview({ blueprint, className = '' }: RoomLayoutPreviewProps) {
  if (!blueprint) {
    return (
      <div className={`aspect-[4/3] bg-slate-100 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400 ${className}`}>
        Aperçu indisponible
      </div>
    );
  }

  const outline = blueprint.roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>{roomTypeLabels[blueprint.roomType]}</span>
        <span>{blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m</span>
      </div>
      <div
        className="relative aspect-[4/3] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.25) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        {outline && (
          <div
            className="absolute pointer-events-none z-0"
            style={{
              left: `${outline.x}%`,
              top: `${outline.y}%`,
              width: `${outline.w}%`,
              height: `${outline.h}%`,
              background: outline.fill ?? 'rgba(241,245,249,0.8)',
              border: `2px solid ${outline.stroke ?? '#cbd5e1'}`,
              borderRadius: outline.shape === 'circle' ? '50%' : '4px',
              clipPath,
            }}
          />
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
                <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-xs min-w-[72px] text-center">
                  <p className="text-[8px] font-bold text-slate-700 truncate max-w-[80px]">{item.label}</p>
                  <div className="flex justify-center gap-0.5 mt-1 flex-wrap max-w-[88px]">
                    {Array.from({ length: Math.min(item.seatCount, 8) }).map((_, i) => (
                      <ChairRenderer key={i} chairType={item.chairType} imageUrl={item.chairImageUrl} size="xs" />
                    ))}
                    {item.seatCount > 8 && <span className="text-[7px] text-slate-400">+{item.seatCount - 8}</span>}
                  </div>
                </div>
              </div>
            );
          }

          const tableColor = resolveTableColor(item.tableColor, blueprint.metadata.defaultTableColor);
          const { className: tableClass, style: tableStyle } = getTableVisualStyle(item.shape, false, tableColor);

          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 z-10"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <div className={`${tableClass} scale-[0.45] origin-center shadow-xs flex items-center justify-center`} style={tableStyle} />
              <span className="text-[7px] font-bold text-slate-600 bg-white/90 px-1 rounded">{item.name}</span>
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

'use client';

import React from 'react';
import {
  RoomLayoutBlueprint,
  getChairVisualClass,
  getFixtureClass,
  roomTypeLabels,
} from '@/lib/roomLayoutUtils';
import { getTableVisualClasses } from '@/lib/tablePlanUtils';

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

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
        <span>{roomTypeLabels[blueprint.roomType]}</span>
        <span>{blueprint.metadata.totalSeats} places · {blueprint.canvas.widthM}×{blueprint.canvas.heightM} m</span>
      </div>
      <div className="relative aspect-[4/3] bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
        {blueprint.fixtures.map((fixture) => (
          <div
            key={fixture.id}
            className={`absolute border text-[8px] font-bold flex items-center justify-center px-1 text-center ${getFixtureClass(fixture.kind)}`}
            style={{
              left: `${fixture.x}%`,
              top: `${fixture.y}%`,
              width: `${fixture.w}%`,
              height: `${fixture.h}%`,
              transform: 'translate(-0%, -0%)',
            }}
            title={fixture.label}
          >
            {fixture.kind !== 'aisle' && fixture.label}
          </div>
        ))}

        {blueprint.furniture.map((item) => {
          if (item.kind === 'zone') {
            return (
              <div
                key={item.id}
                className="absolute border-2 border-dashed border-sky-300 bg-sky-50/60 rounded-xl flex items-center justify-center text-[9px] font-semibold text-sky-700"
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
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${item.x}%`, top: `${item.y}%` }}
              >
                <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg shadow-xs min-w-[72px] text-center">
                  <p className="text-[8px] font-bold text-slate-700 truncate max-w-[80px]">{item.label}</p>
                  <div className="flex justify-center gap-0.5 mt-1 flex-wrap max-w-[88px]">
                    {Array.from({ length: Math.min(item.seatCount, 8) }).map((_, i) => (
                      <span key={i} className={getChairVisualClass(item.chairType)} />
                    ))}
                    {item.seatCount > 8 && <span className="text-[7px] text-slate-400">+{item.seatCount - 8}</span>}
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
              style={{ left: `${item.x}%`, top: `${item.y}%` }}
            >
              <div className={`${getTableVisualClasses(item.shape)} scale-[0.45] origin-center shadow-xs`} />
              <span className="text-[7px] font-bold text-slate-600 bg-white/90 px-1 rounded">{item.name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(item.capacity, 6) }).map((_, i) => (
                  <span key={i} className={getChairVisualClass(item.chairType)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import {
  getSeatCoordinates,
  getTableShapeEmoji,
  getTableShapeLabel,
  getTableVisualStyle,
} from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import ChairRenderer from '@/components/ChairRenderer';
import GuestRoomPlanCanvas from '@/components/GuestRoomPlanCanvas';
import { LayoutGrid, Users, Maximize2 } from 'lucide-react';
import { ChairType } from '@/lib/roomLayoutUtils';
import type { TableShape } from '@/lib/tablePlanUtils';

export interface GuestTableDetails {
  tableName: string;
  shape: TableShape;
  capacity: number;
  seatIndex?: number;
  chairType?: ChairType;
  chairImageUrl?: string;
  neighbors: Array<{ id: string; firstName: string; lastName: string; seatIndex?: number }>;
}

export interface GuestTablePlanOverviewItem {
  id: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  occupiedCount: number;
  isGuestTable: boolean;
  chairType?: ChairType;
  chairImageUrl?: string;
  tableColor?: string;
}

export interface GuestPlanFixture {
  id: string;
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  color?: string;
  columnShape?: string;
  rotation?: number;
  imageUrl?: string;
  imageCrop?: { x: number; y: number; w: number; h: number };
  flowerType?: string;
  flowerColor?: string;
}

export interface GuestRoomOutline {
  shape: import('@/lib/roomLayoutUtils').RoomOutlineShape;
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

interface GuestTablePlanViewProps {
  tableDetails: GuestTableDetails | null;
  tablePlanOverview: GuestTablePlanOverviewItem[] | null;
  planFixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  roomThemeId?: string | null;
  guestFirstName: string;
  guestLastName: string;
}

function getSeatOccupant(
  seatIndex: number,
  tableDetails: GuestTableDetails,
  guestFirstName: string,
  guestLastName: string,
) {
  if (tableDetails.seatIndex === seatIndex) {
    return {
      type: 'guest' as const,
      label: `${guestFirstName} ${guestLastName} (Vous)`,
      initials: `${guestFirstName[0]}${guestLastName[0]}`,
    };
  }
  const neighbor = tableDetails.neighbors.find((n) => n.seatIndex === seatIndex);
  if (neighbor) {
    return {
      type: 'neighbor' as const,
      label: `${neighbor.firstName} ${neighbor.lastName}`,
      initials: `${neighbor.firstName[0]}${neighbor.lastName[0]}`,
    };
  }
  return { type: 'empty' as const, label: `Siège ${seatIndex + 1}` };
}

export default function GuestTablePlanView({
  tableDetails,
  tablePlanOverview,
  planFixtures,
  roomOutline,
  roomThemeId,
  guestFirstName,
  guestLastName,
}: GuestTablePlanViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const guestFullName = `${guestFirstName} ${guestLastName}`;
  const theme = getRoomTheme(roomThemeId);
  const neighborNames = tableDetails?.neighbors.map((n) => `${n.firstName} ${n.lastName}`) ?? [];
  const guestTableId = tablePlanOverview?.find((t) => t.isGuestTable)?.id;

  if (!tableDetails && (!tablePlanOverview || tablePlanOverview.length === 0)) {
    return (
      <div className="text-center py-16 space-y-4 max-w-xs mx-auto">
        <div className="inline-flex items-center justify-center bg-indigo-500/10 p-5 rounded-full text-indigo-400">
          <LayoutGrid className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-white text-base">Plan de table en cours</h3>
        <p className="text-slate-400 text-xs leading-relaxed">
          Les organisateurs finalisent le placement des invités. Revenez bientôt !
        </p>
      </div>
    );
  }

  const planSection = (height: number) =>
    tablePlanOverview && tablePlanOverview.length > 0 ? (
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Plan de la salle</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Thème : <span style={{ color: theme.accentColor }}>{theme.name}</span>
            </p>
          </div>
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10px] font-bold text-slate-300 hover:bg-slate-800"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Agrandir
            </button>
          )}
        </div>
        <GuestRoomPlanCanvas
          tables={tablePlanOverview}
          fixtures={planFixtures}
          roomOutline={roomOutline}
          roomThemeId={roomThemeId}
          guestTableId={guestTableId}
          guestFullName={guestFullName}
          neighborNames={neighborNames}
          height={height}
        />
      </div>
    ) : null;

  const seatDetailSection = tableDetails && (
    <>
      <div
        className="rounded-3xl p-5 sm:p-6 space-y-4 border"
        style={{
          background: `linear-gradient(135deg, ${theme.accentColor}22, ${theme.accentColor}08)`,
          borderColor: `${theme.accentColor}44`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: theme.accentColor }}>
              Votre placement
            </span>
            <h3 className="text-xl font-black text-white leading-none">{tableDetails.tableName}</h3>
          </div>
          <div className="text-3xl p-3 rounded-2xl shrink-0" style={{ background: `${theme.accentColor}18` }}>
            {getTableShapeEmoji(tableDetails.shape)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type</p>
            <p className="text-sm font-bold text-white mt-1">{getTableShapeLabel(tableDetails.shape)}</p>
          </div>
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-3">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Capacité</p>
            <p className="text-sm font-bold text-white mt-1">{tableDetails.capacity} places</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/40 rounded-3xl p-4 sm:p-6">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
          Votre place à la table
        </p>
        <div className="relative flex items-center justify-center py-4" style={{ minHeight: Math.max(180, tableDetails.capacity * 28 + 80) }}>
          {(() => {
            const seatRadius = Math.min(48, Math.max(32, 160 / tableDetails.capacity));
            const { className: detailTableClass, style: detailTableStyle } = getTableVisualStyle(tableDetails.shape, true);
            return (
              <div
                className={`relative flex items-center justify-center font-bold text-xs text-center shadow-xl ${detailTableClass}`}
                style={{ ...detailTableStyle, minWidth: seatRadius * 2.2, minHeight: seatRadius * 1.6 }}
              >
                <div className="px-2 z-10">
                  <div className="font-black text-[11px]">{tableDetails.tableName}</div>
                </div>
                {Array.from({ length: tableDetails.capacity }).map((_, index) => {
                  const coords = getSeatCoordinates(tableDetails.shape, tableDetails.capacity, index, seatRadius);
                  const occupant = getSeatOccupant(index, tableDetails, guestFirstName, guestLastName);
                  return (
                    <div
                      key={index}
                      style={{
                        left: `calc(50% + ${coords.x}px)`,
                        top: `calc(50% + ${coords.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className="absolute flex items-center justify-center z-20"
                      title={occupant.label}
                    >
                      {occupant.type === 'guest' || occupant.type === 'neighbor' ? (
                        <div
                          className={`w-9 h-9 rounded-full border flex items-center justify-center text-[8px] font-bold shadow-md ${
                            occupant.type === 'guest'
                              ? 'bg-amber-400 border-amber-500 text-amber-950 ring-2 ring-amber-300/50'
                              : 'bg-emerald-500 border-emerald-600 text-white'
                          }`}
                        >
                          {occupant.initials}
                        </div>
                      ) : (
                        <ChairRenderer chairType={tableDetails.chairType ?? 'BANQUET'} imageUrl={tableDetails.chairImageUrl} size="lg" />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        <p className="text-[10px] text-center text-amber-400/90 font-semibold mt-2">Votre siège est surligné en doré</p>
      </div>

      <div className="space-y-3">
        <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: theme.accentColor }} />
          Vos voisins de table
        </h4>
        {tableDetails.neighbors.length === 0 ? (
          <p className="text-slate-500 text-xs italic">Vous êtes seul(e) à cette table pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tableDetails.neighbors.map((neighbor) => (
              <div key={neighbor.id} className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-xs border" style={{ background: `${theme.accentColor}15`, borderColor: `${theme.accentColor}33`, color: theme.accentColor }}>
                  {neighbor.firstName[0]}{neighbor.lastName[0]}
                </div>
                <div>
                  <span className="font-bold text-white text-xs block">{neighbor.firstName} {neighbor.lastName}</span>
                  <span className="text-[9px] text-slate-400">{neighbor.seatIndex !== undefined ? `Siège ${neighbor.seatIndex + 1}` : 'Invité'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[80] bg-slate-950/98 flex flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-sm font-bold text-white">Plan de la salle · {theme.name}</p>
          <button type="button" onClick={() => setIsFullscreen(false)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold">
            Fermer
          </button>
        </div>
        <div className="flex-1 min-h-0">{planSection(typeof window !== 'undefined' ? window.innerHeight - 120 : 600)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in w-full max-w-3xl mx-auto">
      {seatDetailSection}
      {planSection(420)}
    </div>
  );
}

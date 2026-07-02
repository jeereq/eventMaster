'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  getSeatCoordinates,
  getTableShapeDescription,
  getTableShapeEmoji,
  getTableShapeLabel,
  getTableVisualClasses,
  TableShape,
} from '@/lib/tablePlanUtils';
import { getFixtureClass, getRoomOutlineClipPath, RoomOutlineShape } from '@/lib/roomLayoutUtils';
import ChairRenderer from '@/components/ChairRenderer';
import { LayoutGrid, Users, Maximize2 } from 'lucide-react';
import { ChairType } from '@/lib/roomLayoutUtils';

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
}

export interface GuestRoomOutline {
  shape: RoomOutlineShape;
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
  guestFirstName: string;
  guestLastName: string;
}

function TableHoverTooltip({
  table,
  guestNames,
}: {
  table: GuestTablePlanOverviewItem;
  guestNames?: string[];
}) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 z-50 pointer-events-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-xl text-left space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-white text-xs leading-tight">{table.name}</p>
          {table.isGuestTable && (
            <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-1.5 py-0.5 rounded-full shrink-0">
              Vous
            </span>
          )}
        </div>
        <p className="text-[10px] text-indigo-300 font-semibold">
          {getTableShapeEmoji(table.shape)} Table {getTableShapeLabel(table.shape)}
        </p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {getTableShapeDescription(table.shape)}
        </p>
        <p className="text-[10px] text-slate-500 font-medium">
          {table.occupiedCount}/{table.capacity} places occupées
        </p>
        {guestNames && guestNames.length > 0 && (
          <div className="pt-1 border-t border-slate-800">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">À votre table</p>
            <ul className="space-y-0.5">
              {guestNames.map((name) => (
                <li key={name} className="text-[10px] text-slate-300 truncate">{name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeatOccupant(
  seatIndex: number,
  tableDetails: GuestTableDetails,
  guestFirstName: string,
  guestLastName: string,
): { type: 'guest' | 'neighbor' | 'empty'; label: string; initials?: string } {
  if (tableDetails.seatIndex === seatIndex) {
    return {
      type: 'guest',
      label: `${guestFirstName} ${guestLastName} (Vous)`,
      initials: `${guestFirstName[0]}${guestLastName[0]}`,
    };
  }

  const neighbor = tableDetails.neighbors.find((n) => n.seatIndex === seatIndex);
  if (neighbor) {
    return {
      type: 'neighbor',
      label: `${neighbor.firstName} ${neighbor.lastName}`,
      initials: `${neighbor.firstName[0]}${neighbor.lastName[0]}`,
    };
  }

  return { type: 'empty', label: `Siège ${seatIndex + 1}` };
}

export default function GuestTablePlanView({
  tableDetails,
  tablePlanOverview,
  planFixtures,
  roomOutline,
  guestFirstName,
  guestLastName,
}: GuestTablePlanViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
  const [canvasHeight, setCanvasHeight] = useState(320);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const guestFullName = `${guestFirstName} ${guestLastName}`;

  useEffect(() => {
    const updateHeight = () => {
      const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const tableCount = tablePlanOverview?.length ?? 0;
      const base = isFullscreen ? vh - 120 : Math.min(vh * 0.55, 520);
      const scaled = tableCount > 12 ? base + 40 : base;
      setCanvasHeight(Math.max(260, Math.min(scaled, isFullscreen ? vh - 80 : 560)));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [tablePlanOverview?.length, isFullscreen]);

  if (!tableDetails && (!tablePlanOverview || tablePlanOverview.length === 0)) {
    return (
      <div className="text-center py-16 space-y-4 max-w-xs mx-auto">
        <div className="inline-flex items-center justify-center bg-indigo-500/10 p-5 rounded-full text-indigo-400">
          <LayoutGrid className="w-8 h-8" />
        </div>
        <h3 className="font-bold text-white text-base">Plan de table en cours</h3>
        <p className="text-slate-400 text-xs leading-relaxed">
          Les organisateurs finalisent le placement des invités. Revenez bientôt pour découvrir vos voisins de table !
        </p>
      </div>
    );
  }

  const neighborNames = tableDetails?.neighbors.map((n) => `${n.firstName} ${n.lastName}`) ?? [];
  const outline = roomOutline;
  const clipPath = outline ? getRoomOutlineClipPath(outline.shape) : undefined;

  const renderOverviewCanvas = (height: number) => (
    <div
      ref={canvasRef}
      className="relative w-full bg-slate-950/60 border border-slate-700/60 rounded-3xl overflow-hidden touch-pan-y"
      style={{
        height: `${height}px`,
        backgroundImage: 'linear-gradient(rgba(51,65,85,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(51,65,85,0.4) 1px, transparent 1px)',
        backgroundSize: 'clamp(16px, 3vw, 28px) clamp(16px, 3vw, 28px)',
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
            background: outline.fill ?? 'rgba(30,41,59,0.5)',
            border: `2px solid ${outline.stroke ?? '#475569'}`,
            borderRadius: outline.shape === 'circle' ? '50%' : '6px',
            clipPath,
          }}
        />
      )}

      {(planFixtures ?? []).map((fixture) => {
        const isColumn = fixture.kind === 'pillar' || fixture.kind === 'column';
        return (
          <div
            key={fixture.id}
            className={`absolute pointer-events-none z-[5] border text-[8px] font-bold flex items-center justify-center opacity-80 ${getFixtureClass(fixture.kind)} ${isColumn && fixture.columnShape === 'round' ? 'rounded-full' : isColumn ? 'rounded-sm' : ''}`}
            style={{
              left: `${fixture.x}%`,
              top: `${fixture.y}%`,
              width: `${fixture.w}%`,
              height: `${fixture.h}%`,
              backgroundColor: isColumn && fixture.color ? fixture.color : undefined,
              transform: fixture.rotation ? `rotate(${fixture.rotation}deg)` : undefined,
            }}
          >
            {fixture.kind !== 'aisle' && fixture.label}
          </div>
        );
      })}

      {tablePlanOverview!.map((table) => {
        const isHovered = hoveredTableId === table.id;
        const isGuestTable = table.isGuestTable;
        const scale = height > 400 ? 1 : 0.85;

        return (
          <div
            key={table.id}
            style={{
              left: `${table.x}%`,
              top: `${table.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
            }}
            className="absolute select-none z-10"
            onMouseEnter={() => setHoveredTableId(table.id)}
            onMouseLeave={() => setHoveredTableId(null)}
            onTouchStart={() => setHoveredTableId(table.id)}
          >
            {isHovered && (
              <TableHoverTooltip
                table={table}
                guestNames={isGuestTable ? [guestFullName, ...neighborNames] : undefined}
              />
            )}
            <div
              className={`relative flex items-center justify-center font-bold text-xs text-center cursor-default transition-all duration-200 ${
                isGuestTable
                  ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-500/30'
                  : isHovered
                    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-lg'
                    : 'hover:shadow-md'
              } ${getTableVisualClasses(table.shape, isGuestTable)}`}
            >
              <div className="px-1.5">
                <div className="truncate max-w-[min(72px,18vw)] font-black text-[10px]">{table.name}</div>
                <div className="text-[8px] opacity-80 mt-0.5">{getTableShapeLabel(table.shape)}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const content = (
    <div className="space-y-6 animate-fade-in w-full max-w-3xl mx-auto">
      {tableDetails && (
        <>
          <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-3xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                  Votre placement
                </span>
                <h3 className="text-xl font-black text-white leading-none">{tableDetails.tableName}</h3>
              </div>
              <div className="text-3xl p-3 bg-indigo-500/10 rounded-2xl shrink-0">
                {getTableShapeEmoji(tableDetails.shape)}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Type de table</p>
                <p className="text-sm font-bold text-white mt-1">{getTableShapeLabel(tableDetails.shape)}</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-700/50 rounded-2xl p-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Capacité</p>
                <p className="text-sm font-bold text-white mt-1">{tableDetails.capacity} places</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-3xl p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Votre place à la table
            </p>
            <div className="relative flex items-center justify-center min-h-[clamp(160px,35vw,220px)]">
              <div
                className={`relative flex items-center justify-center font-bold text-xs text-center shadow-lg scale-[clamp(0.85,2.5vw,1.1)] ${getTableVisualClasses(tableDetails.shape, true)}`}
              >
                <div className="px-2">
                  <div className="truncate max-w-[90px] font-black text-[11px]">{tableDetails.tableName}</div>
                </div>

                {Array.from({ length: tableDetails.capacity }).map((_, index) => {
                  const coords = getSeatCoordinates(tableDetails.shape, tableDetails.capacity, index, 38);
                  const occupant = getSeatOccupant(index, tableDetails, guestFirstName, guestLastName);

                  return (
                    <div
                      key={index}
                      style={{
                        left: `calc(50% + ${coords.x}px)`,
                        top: `calc(50% + ${coords.y}px)`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute flex items-center justify-center ${
                        occupant.type === 'guest'
                          ? 'z-10'
                          : occupant.type === 'neighbor'
                            ? ''
                            : ''
                      }`}
                      title={occupant.label}
                    >
                      {occupant.type === 'guest' || occupant.type === 'neighbor' ? (
                        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[8px] font-bold shadow-sm ${
                          occupant.type === 'guest'
                            ? 'bg-amber-400 border-amber-500 text-amber-950 ring-2 ring-amber-300/50'
                            : 'bg-emerald-500 border-emerald-600 text-white'
                        }`}>
                          {occupant.initials}
                        </div>
                      ) : (
                        <ChairRenderer
                          chairType={tableDetails.chairType ?? 'BANQUET'}
                          imageUrl={tableDetails.chairImageUrl}
                          size="lg"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-center text-amber-400/90 font-semibold mt-3">
              Votre siège est surligné en doré
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              Partagez votre table avec
            </h4>
            {tableDetails.neighbors.length === 0 ? (
              <p className="text-slate-500 text-xs italic">
                Vous êtes le seul invité actuellement placé à cette table.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tableDetails.neighbors.map((neighbor) => (
                  <div
                    key={neighbor.id}
                    className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 flex items-center gap-3.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs">
                      {neighbor.firstName[0]}{neighbor.lastName[0]}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">
                        {neighbor.firstName} {neighbor.lastName}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">
                        {neighbor.seatIndex !== undefined ? `Siège ${neighbor.seatIndex + 1}` : 'Invité'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tablePlanOverview && tablePlanOverview.length > 0 && (
        <div className="space-y-3 w-full">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Plan de la salle</h4>
              <p className="text-[10px] text-slate-500 mt-1">
                Pincez ou faites défiler · Survolez une table pour les détails
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 text-[10px] font-bold text-slate-300 hover:bg-slate-800"
            >
              <Maximize2 className="w-3.5 h-3.5" /> Agrandir
            </button>
          </div>
          {renderOverviewCanvas(canvasHeight)}
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[80] bg-slate-950/95 flex flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-sm font-bold text-white">Plan de la salle</p>
          <button type="button" onClick={() => setIsFullscreen(false)} className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold">
            Fermer
          </button>
        </div>
        <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto">
          {renderOverviewCanvas(typeof window !== 'undefined' ? window.innerHeight - 100 : 600)}
        </div>
      </div>
    );
  }

  return content;
}

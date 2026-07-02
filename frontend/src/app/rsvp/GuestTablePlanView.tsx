'use client';

import React, { useRef, useState } from 'react';
import {
  getSeatCoordinates,
  getTableShapeDescription,
  getTableShapeEmoji,
  getTableShapeLabel,
  getTableVisualClasses,
  TableShape,
} from '@/lib/tablePlanUtils';
import { LayoutGrid, Users } from 'lucide-react';

export interface GuestTableDetails {
  tableName: string;
  shape: TableShape;
  capacity: number;
  seatIndex?: number;
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
}

interface GuestTablePlanViewProps {
  tableDetails: GuestTableDetails | null;
  tablePlanOverview: GuestTablePlanOverviewItem[] | null;
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
  guestFirstName,
  guestLastName,
}: GuestTablePlanViewProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);

  const guestFullName = `${guestFirstName} ${guestLastName}`;

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

  return (
    <div className="space-y-6 animate-fade-in">
      {tableDetails && (
        <>
          <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30 rounded-3xl p-6 space-y-4">
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

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {getTableShapeDescription(tableDetails.shape)}
            </p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/40 rounded-3xl p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">
              Votre place à la table
            </p>
            <div className="relative flex items-center justify-center min-h-[180px]">
              <div
                className={`relative flex items-center justify-center font-bold text-xs text-center shadow-lg ${getTableVisualClasses(tableDetails.shape, true)}`}
              >
                <div className="px-2">
                  <div className="truncate max-w-[90px] font-black text-[11px]">{tableDetails.tableName}</div>
                  <div className="text-[9px] opacity-85 mt-0.5">{getTableShapeLabel(tableDetails.shape)}</div>
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
                      className={`absolute w-8 h-8 rounded-full border flex items-center justify-center text-[8px] font-bold shadow-sm ${
                        occupant.type === 'guest'
                          ? 'bg-amber-400 border-amber-500 text-amber-950 ring-2 ring-amber-300/50 z-10'
                          : occupant.type === 'neighbor'
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'bg-slate-700/80 border-slate-600 text-slate-400'
                      }`}
                      title={occupant.label}
                    >
                      {occupant.initials ?? index + 1}
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
        <div className="space-y-3">
          <div>
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider">Plan de la salle</h4>
            <p className="text-[10px] text-slate-500 mt-1">
              Survolez une table pour voir son type et sa capacité.
            </p>
          </div>

          <div
            ref={canvasRef}
            className="relative w-full h-[280px] bg-slate-950/50 border border-slate-800 rounded-3xl overflow-hidden bg-grid-slate-800/30"
          >
            {tablePlanOverview.map((table) => {
              const isHovered = hoveredTableId === table.id;
              const isGuestTable = table.isGuestTable;

              return (
                <div
                  key={table.id}
                  style={{
                    left: `${table.x}%`,
                    top: `${table.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  className="absolute select-none"
                  onMouseEnter={() => setHoveredTableId(table.id)}
                  onMouseLeave={() => setHoveredTableId(null)}
                >
                  {isHovered && (
                    <TableHoverTooltip
                      table={table}
                      guestNames={isGuestTable ? [guestFullName, ...neighborNames] : undefined}
                    />
                  )}
                  <div
                    className={`relative flex items-center justify-center font-bold text-xs text-center cursor-default transition-shadow ${
                      isGuestTable
                        ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-amber-500/20'
                        : isHovered
                          ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950 shadow-lg'
                          : 'hover:shadow-md'
                    } ${getTableVisualClasses(table.shape, isGuestTable)}`}
                  >
                    <div className="px-1.5">
                      <div className="truncate max-w-[72px] font-black text-[10px]">{table.name}</div>
                      <div className="text-[8px] opacity-80 mt-0.5">
                        {getTableShapeLabel(table.shape)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

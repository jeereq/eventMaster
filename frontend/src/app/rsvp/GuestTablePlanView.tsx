'use client';

import React, { useState } from 'react';
import {
  getSeatCoordinates,
  getTableShapeLabel,
  getTableVisualStyle,
} from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import ChairRenderer from '@/components/ChairRenderer';
import GuestRoomPlanCanvas from '@/components/GuestRoomPlanCanvas';
import { LayoutGrid, Users, Maximize2, Download } from 'lucide-react';
import { api } from '@/lib/api';
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
  tableImageUrl?: string;
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
  guestId?: string;
  seatingInvitationPdfUrl?: string | null;
  placementAccessible?: boolean;
  tableDetails: GuestTableDetails | null;
  tablePlanOverview: GuestTablePlanOverviewItem[] | null;
  planFixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
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
  guestId,
  seatingInvitationPdfUrl,
  tableDetails,
  tablePlanOverview,
  planFixtures,
  roomOutline,
  roomThemeId,
  floorType,
  floorImageUrl,
  guestFirstName,
  guestLastName,
  placementAccessible = false,
}: GuestTablePlanViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const guestFullName = `${guestFirstName} ${guestLastName}`;
  const theme = getRoomTheme(roomThemeId);
  const neighborNames = tableDetails?.neighbors.map((n) => `${n.firstName} ${n.lastName}`) ?? [];
  const guestTableId = tablePlanOverview?.find((t) => t.isGuestTable)?.id;

  if (!placementAccessible) {
    return (
      <div className="text-center py-12 space-y-3 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-primary/10 text-primary border border-primary/15">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Placement en cours</h3>
        <p className="text-muted text-xs leading-relaxed">
          Votre plan de table, invitation PDF et localisation GPS sont disponibles dès votre confirmation RSVP,
          dès que les organisateurs vous ont assigné une place.
        </p>
      </div>
    );
  }

  if (!tableDetails && (!tablePlanOverview || tablePlanOverview.length === 0)) {
    return (
      <div className="text-center py-12 space-y-3 max-w-xs mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-surface-muted text-muted border border-border">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Plan de table en cours</h3>
        <p className="text-muted text-xs leading-relaxed">
          Les organisateurs finalisent le placement. Revenez bientôt.
        </p>
      </div>
    );
  }

  const planSection = (height: number) =>
    tablePlanOverview && tablePlanOverview.length > 0 ? (
      <div className="space-y-3 w-full">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="font-semibold text-foreground text-xs">Plan de la salle</h4>
            <p className="text-[10px] text-muted mt-0.5">
              Thème : <span style={{ color: theme.accentColor }}>{theme.name}</span>
            </p>
          </div>
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] border border-border text-[10px] font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
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
          floorType={floorType}
          floorImageUrl={floorImageUrl}
          guestTableId={guestTableId}
          guestFullName={guestFullName}
          neighborNames={neighborNames}
          height={height}
        />
      </div>
    ) : null;

  const seatDetailSection = tableDetails && (
    <>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5 space-y-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Votre placement</span>
            <h3 className="text-lg font-semibold text-foreground leading-tight">{tableDetails.tableName}</h3>
            {tableDetails.seatIndex !== undefined && (
              <p className="text-xs text-primary font-semibold">Siège n°{tableDetails.seatIndex + 1}</p>
            )}
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-md border shrink-0"
            style={{ color: theme.accentColor, borderColor: `${theme.accentColor}44`, background: `${theme.accentColor}12` }}
          >
            {getTableShapeLabel(tableDetails.shape)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface-muted border border-border rounded-[var(--radius-button)] p-3">
            <p className="text-[10px] font-semibold text-muted">Type</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{getTableShapeLabel(tableDetails.shape)}</p>
          </div>
          <div className="bg-surface-muted border border-border rounded-[var(--radius-button)] p-3">
            <p className="text-[10px] font-semibold text-muted">Capacité</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{tableDetails.capacity} places</p>
          </div>
        </div>
        {(guestId || seatingInvitationPdfUrl) && (
          <button
            type="button"
            onClick={() => {
              if (seatingInvitationPdfUrl) {
                window.open(seatingInvitationPdfUrl, '_blank', 'noopener,noreferrer');
                return;
              }
              if (guestId) {
                void api.download(`/rsvp/${guestId}/seating-invitation.pdf`, `invitation-${guestLastName || 'invite'}.pdf`);
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-button)] text-xs font-semibold bg-primary text-white hover:bg-primary/90 transition"
          >
            <Download className="w-4 h-4" />
            Télécharger l&apos;invitation PDF
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-4 sm:p-5 shadow-[var(--shadow-soft)]">
        <p className="text-[10px] font-semibold text-muted mb-4 text-center">
          Votre place à la table
        </p>
        <div className="relative flex items-center justify-center py-4" style={{ minHeight: Math.max(180, tableDetails.capacity * 28 + 80) }}>
          {(() => {
            const seatRadius = Math.min(48, Math.max(32, 160 / tableDetails.capacity));
            const { className: detailTableClass, style: detailTableStyle } = getTableVisualStyle(tableDetails.shape, true);
            return (
              <div
                className={`relative flex items-center justify-center font-semibold text-xs text-center shadow-[var(--shadow-soft)] ${detailTableClass}`}
                style={{ ...detailTableStyle, minWidth: seatRadius * 2.2, minHeight: seatRadius * 1.6 }}
              >
                <div className="px-2 z-10">
                  <div className="font-semibold text-[11px]">{tableDetails.tableName}</div>
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
                          className={`w-9 h-9 rounded-full border flex items-center justify-center text-[8px] font-semibold ${
                            occupant.type === 'guest'
                              ? 'bg-primary text-white border-primary ring-2 ring-primary/25'
                              : 'bg-surface-muted border-border text-foreground'
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
        <p className="text-[10px] text-center text-muted font-medium mt-2">Votre siège est mis en évidence</p>
      </div>

      <div className="space-y-3">
        <h4 className="font-semibold text-foreground text-xs flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Voisins de table
        </h4>
        {tableDetails.neighbors.length === 0 ? (
          <p className="text-muted text-xs">Vous êtes seul(e) à cette table pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tableDetails.neighbors.map((neighbor) => (
              <div key={neighbor.id} className="bg-surface border border-border rounded-[var(--radius-card)] p-3 flex items-center gap-3 shadow-[var(--shadow-soft)]">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-[10px] bg-primary/10 text-primary border border-primary/15">
                  {neighbor.firstName[0]}{neighbor.lastName[0]}
                </div>
                <div>
                  <span className="font-semibold text-foreground text-xs block">{neighbor.firstName} {neighbor.lastName}</span>
                  <span className="text-[10px] text-muted">{neighbor.seatIndex !== undefined ? `Siège ${neighbor.seatIndex + 1}` : 'Invité'}</span>
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
      <div className="fixed inset-0 z-[80] bg-background flex flex-col p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-sm font-semibold text-foreground">Plan de la salle · {theme.name}</p>
          <button type="button" onClick={() => setIsFullscreen(false)} className="px-3 py-1.5 border border-border bg-surface text-foreground rounded-[var(--radius-button)] text-xs font-semibold hover:bg-surface-muted transition">
            Fermer
          </button>
        </div>
        <div className="flex-1 min-h-0">{planSection(typeof window !== 'undefined' ? window.innerHeight - 120 : 600)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {seatDetailSection}
      {planSection(420)}
    </div>
  );
}

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  getSeatCoordinates,
  getTableShapeLabel,
  getTableVisualStyle,
} from '@/lib/tablePlanUtils';
import { getRoomTheme } from '@/lib/roomThemeUtils';
import ChairRenderer from '@/components/ChairRenderer';
import GuestRoomPlanCanvas from '@/components/GuestRoomPlanCanvas';
import RoomLayoutPreview from '@/components/RoomLayoutPreview';
import { buildTablePlanPreviewBlueprint } from '@/lib/tablePlanPreviewBlueprint';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import { LayoutGrid, Users, Maximize2, Download, Box } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/api';
import { ChairType, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { TableShape } from '@/lib/tablePlanUtils';

type GuestPlanView = '2d' | '3d';

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
  /** Index du siège de l’invité (0-based) si isGuestTable. */
  guestSeatIndex?: number;
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
  depthAmount?: number | null;
  depthView?: boolean | null;
  roomLayoutPreview?: RoomLayoutBlueprint | null;
  sourceRoomType?: string | null;
  previewLightingPreset?: Exclude<LightingPreset, 'auto'> | null;
  guestFirstName: string;
  guestLastName: string;
  immersive?: boolean;
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
  depthAmount,
  depthView,
  roomLayoutPreview = null,
  sourceRoomType,
  previewLightingPreset,
  guestFirstName,
  guestLastName,
  placementAccessible = false,
  immersive = false,
}: GuestTablePlanViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [planView, setPlanView] = useState<GuestPlanView>('3d');
  const [planHeight, setPlanHeight] = useState(360);
  const guestFullName = `${guestFirstName} ${guestLastName}`;
  const theme = getRoomTheme(roomThemeId);
  const neighborNames = tableDetails?.neighbors.map((n) => `${n.firstName} ${n.lastName}`) ?? [];
  const guestTableId = tablePlanOverview?.find((t) => t.isGuestTable)?.id;

  const previewBlueprint = useMemo(
    () => {
      if (!tablePlanOverview?.length) return null;
      return buildTablePlanPreviewBlueprint(
        {
          roomOutline: roomOutline ?? undefined,
          roomThemeId,
          floorType,
          floorImageUrl,
          depthAmount,
          depthView,
          fixtures: planFixtures,
          sourceRoomType,
        },
        tablePlanOverview.map((table) => ({
          id: table.id,
          name: table.name,
          shape: table.shape,
          capacity: table.capacity,
          x: table.x,
          y: table.y,
          chairType: table.chairType,
          tableColor: table.tableColor,
        })),
        roomLayoutPreview,
      );
    },
    [
      tablePlanOverview,
      roomOutline,
      roomThemeId,
      floorType,
      floorImageUrl,
      depthAmount,
      depthView,
      planFixtures,
      sourceRoomType,
      roomLayoutPreview,
    ],
  );

  const canShow3d = Boolean(previewBlueprint);
  const effectivePlanView: GuestPlanView = canShow3d ? planView : '2d';
  const previewLighting = previewLightingPreset ?? 'dusk';

  useEffect(() => {
    const update = () => {
      const h = window.innerHeight;
      setPlanHeight(Math.round(Math.max(280, Math.min(h * 0.62, 560))));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (!placementAccessible) {
    return (
      <div className="text-center py-12 space-y-3 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[var(--radius-card)] bg-surface-muted text-muted border border-border">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <h3 className="font-semibold text-foreground text-sm">Votre place arrive</h3>
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

  const planSection = (opts: { height?: number; fill?: boolean }) =>
    tablePlanOverview && tablePlanOverview.length > 0 ? (
      <div className={opts.fill ? 'space-y-2 w-full h-full min-h-0 flex flex-col' : 'space-y-3 w-full'}>
        <div className="flex items-center justify-between gap-2 shrink-0">
          <div>
            <h4 className="font-semibold text-foreground text-xs">Plan de la salle</h4>
            <p className="text-[10px] text-muted mt-0.5">
              Thème : <span style={{ color: theme.accentColor }}>{theme.name}</span>
              {effectivePlanView === '3d' ? ' · vue 3D showcase' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canShow3d && (
              <div className="flex gap-1 rounded-full border border-border bg-surface p-0.5">
                <button
                  type="button"
                  onClick={() => setPlanView('2d')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition',
                    effectivePlanView === '2d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
                  )}
                >
                  <LayoutGrid className="w-3 h-3" />
                  2D
                </button>
                <button
                  type="button"
                  onClick={() => setPlanView('3d')}
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition',
                    effectivePlanView === '3d' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground',
                  )}
                >
                  <Box className="w-3 h-3" />
                  3D
                </button>
              </div>
            )}
            {!isFullscreen && !immersive && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-button)] border border-border text-[10px] font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Agrandir
              </button>
            )}
          </div>
        </div>
        {effectivePlanView === '3d' && previewBlueprint ? (
          <>
            <RoomLayoutPreview
              blueprint={previewBlueprint}
              quality="showcase"
              lightingPreset={previewLighting}
              showMeta={false}
              className={cn(
                opts.fill ? 'flex-1 min-h-[280px] h-full' : undefined,
                '[&_.em-floor-canvas]:min-h-[280px]',
              )}
            />
            <p className="text-[10px] text-muted leading-relaxed shrink-0">
              Orbitez pour explorer la salle. Votre table est visible sur le{' '}
              <button type="button" onClick={() => setPlanView('2d')} className="font-semibold text-primary hover:underline">
                plan 2D
              </button>
              .
            </p>
          </>
        ) : (
          <GuestRoomPlanCanvas
            tables={tablePlanOverview}
            fixtures={planFixtures}
            roomOutline={roomOutline}
            roomThemeId={roomThemeId}
            floorType={floorType}
            floorImageUrl={floorImageUrl}
            depthAmount={depthAmount}
            depthView={depthView}
            guestTableId={guestTableId}
            guestFullName={guestFullName}
            neighborNames={neighborNames}
            height={opts.height}
            fill={opts.fill}
            className={opts.fill ? 'flex-1 min-h-0' : undefined}
          />
        )}
      </div>
    ) : null;

  const seatDetailSection = tableDetails && (
    <>
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3 sm:p-5 space-y-3 sm:space-y-4 shadow-[var(--shadow-soft)]">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Votre placement</span>
            <h3 className="text-lg font-semibold text-foreground leading-tight">{tableDetails.tableName}</h3>
            {tableDetails.seatIndex !== undefined && (
              <p className="text-xs text-primary font-semibold">Siège n°{tableDetails.seatIndex + 1}</p>
            )}
          </div>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-[var(--radius-button)] border shrink-0"
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

      <div className="bg-surface border border-border rounded-[var(--radius-card)] p-3 sm:p-5 shadow-[var(--shadow-soft)]">
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
                          className={`w-9 h-9 rounded-[var(--radius-button)] border flex items-center justify-center text-[8px] font-semibold ${
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
                <div className="w-8 h-8 rounded-[var(--radius-button)] flex items-center justify-center font-semibold text-[10px] bg-primary/10 text-primary border border-primary/15">
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
      <div className="fixed inset-0 z-[80] bg-background flex flex-col p-2 sm:p-4" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-sm font-semibold text-foreground truncate">Plan de la salle · {theme.name}</p>
          <button type="button" onClick={() => setIsFullscreen(false)} className="px-3 py-1.5 border border-border bg-surface text-foreground rounded-[var(--radius-button)] text-xs font-semibold hover:bg-surface-muted transition shrink-0">
            Fermer
          </button>
        </div>
        <div className="flex-1 min-h-0">{planSection({ fill: true })}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {immersive ? (
        <>
          {planSection({ height: planHeight })}
          {seatDetailSection}
        </>
      ) : (
        <>
          <div className="order-1 md:order-2">{planSection({ height: planHeight })}</div>
          <div className="order-2 md:order-1 space-y-4">{seatDetailSection}</div>
        </>
      )}
    </div>
  );
}

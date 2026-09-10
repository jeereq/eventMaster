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
import { LayoutGrid, Users, Maximize2, Download, MapPin, EyeOff, ShieldCheck, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PlanViewToggle, type PlanViewMode } from '@/components/PlanViewChrome';
import { api } from '@/lib/api';
import { ChairType, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { TableShape } from '@/lib/tablePlanUtils';
import type { PricingZone } from '@/lib/ticketPricing';
import type { GuestTicketPlacement } from '@/app/rsvp/guestRsvpTypes';

type GuestPlanView = PlanViewMode;

export interface GuestTableNeighbor {
  id: string;
  firstName: string;
  lastName: string;
  seatIndex?: number;
  anonymous?: boolean;
}

export interface GuestZoneNeighbor {
  id: string;
  firstName: string;
  lastName: string;
  tableName: string;
  anonymous?: boolean;
}

export interface GuestPrivacyPolicy {
  mode: 'full' | 'first_name' | 'hidden';
  shareSameTable: boolean;
  shareSameZone: boolean;
  isPublic?: boolean;
}

export interface GuestTableDetails {
  tableName: string;
  shape: TableShape;
  capacity: number;
  seatIndex?: number;
  chairType?: ChairType;
  chairImageUrl?: string;
  pricingZoneId?: string | null;
  zoneName?: string | null;
  zoneColor?: string | null;
  privacyPolicy?: GuestPrivacyPolicy;
  neighbors: GuestTableNeighbor[];
  zoneNeighborsCount?: number;
  zoneNeighbors?: GuestZoneNeighbor[];
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
  pricingZoneId?: string;
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
  pricingZones?: PricingZone[] | null;
  guestFirstName: string;
  guestLastName: string;
  ticketPlacement?: GuestTicketPlacement | null;
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
      label: `${guestFirstName} ${guestLastName} (Vous - Mon emplacement)`,
      initials: `${guestFirstName[0] || 'V'}${guestLastName[0] || ''}`,
      anonymous: false,
    };
  }
  const neighbor = tableDetails.neighbors.find((n) => n.seatIndex === seatIndex);
  if (neighbor) {
    if (neighbor.anonymous) {
      return {
        type: 'neighbor' as const,
        label: `Place occupée (Profil privé)`,
        initials: '?',
        anonymous: true,
      };
    }
    const full = `${neighbor.firstName} ${neighbor.lastName}`.trim();
    return {
      type: 'neighbor' as const,
      label: full || 'Participant',
      initials: `${neighbor.firstName[0] || ''}${neighbor.lastName[0] || ''}` || 'P',
      anonymous: false,
    };
  }
  return { type: 'empty' as const, label: `Siège ${seatIndex + 1} (libre)`, initials: '', anonymous: false };
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
  pricingZones = null,
  guestFirstName,
  guestLastName,
  ticketPlacement = null,
  placementAccessible = false,
  immersive = false,
}: GuestTablePlanViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [planView, setPlanView] = useState<GuestPlanView>('3d');
  const [planHeight, setPlanHeight] = useState(360);
  const guestFullName = `${guestFirstName} ${guestLastName}`;
  const theme = getRoomTheme(roomThemeId);
  const neighborNames = tableDetails?.neighbors.map((n) => (n.anonymous ? 'Place occupée' : `${n.firstName} ${n.lastName}`.trim())) ?? [];
  const guestTableId = useMemo(() => {
    return (
      tablePlanOverview?.find((t) => t.isGuestTable)?.id ||
      ticketPlacement?.tableId ||
      null
    );
  }, [tablePlanOverview, ticketPlacement?.tableId]);

  const guestSeatIndex = useMemo(() => {
    if (typeof tableDetails?.seatIndex === 'number') return tableDetails.seatIndex;
    const overviewTable = tablePlanOverview?.find((t) => t.isGuestTable || t.id === guestTableId);
    if (typeof overviewTable?.guestSeatIndex === 'number') return overviewTable.guestSeatIndex;
    if (typeof ticketPlacement?.seatIndex === 'number') return ticketPlacement.seatIndex;
    if (typeof ticketPlacement?.seatNumber === 'number' && ticketPlacement.seatNumber > 0) {
      return ticketPlacement.seatNumber - 1;
    }
    return undefined;
  }, [tableDetails?.seatIndex, tablePlanOverview, guestTableId, ticketPlacement?.seatIndex, ticketPlacement?.seatNumber]);

  const guestSeatNumber = typeof guestSeatIndex === 'number' ? guestSeatIndex + 1 : undefined;

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
          pricingZones: pricingZones ?? undefined,
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
          pricingZoneId: table.pricingZoneId,
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
      pricingZones,
      roomLayoutPreview,
    ],
  );

  const canShow3d = Boolean(previewBlueprint);
  const effectivePlanView: GuestPlanView = canShow3d ? planView : '2d';
  const previewLighting = previewLightingPreset ?? 'dusk';

  const [inspectedTableId, setInspectedTableId] = useState<string | null>(guestTableId ?? null);
  const inspectedTable = useMemo(() => {
    if (!inspectedTableId || !tablePlanOverview) return null;
    return tablePlanOverview.find((t) => t.id === inspectedTableId) ?? null;
  }, [inspectedTableId, tablePlanOverview]);

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
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/15">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-base">Votre place arrive</h3>
        <p className="text-muted text-xs leading-relaxed">
          Le plan de table et l&apos;invitation PDF apparaissent dès que l&apos;organisateur vous a assigné une place.
          L&apos;itinéraire est déjà dans l&apos;onglet Itinéraire.
        </p>
      </div>
    );
  }

  if (!tableDetails && (!tablePlanOverview || tablePlanOverview.length === 0)) {
    return (
      <div className="text-center py-12 space-y-3 max-w-sm mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/15">
          <LayoutGrid className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-semibold text-foreground text-base">
            {ticketPlacement?.hasTicket ? 'Billet réservé & confirmé' : 'Plan de table en cours'}
          </h3>
          {ticketPlacement?.zoneName && (
            <p className="text-xs font-bold text-primary">
              Zone assignée : {ticketPlacement.zoneName}
            </p>
          )}
          <p className="text-muted text-xs leading-relaxed">
            {ticketPlacement?.hasTicket
              ? 'Votre paiement a bien été validé. La disposition exacte des tables et de votre siège est en cours de finalisation par les organisateurs.'
              : 'Les organisateurs finalisent le placement. Revenez bientôt.'}
          </p>
        </div>
      </div>
    );
  }

  const planSection = (opts: { height?: number; fill?: boolean }) =>
    tablePlanOverview && tablePlanOverview.length > 0 ? (
      <div className={opts.fill ? 'space-y-2 w-full h-full min-h-0 flex flex-col' : 'space-y-3 w-full'}>
        <div className="flex items-center justify-between gap-2 shrink-0 px-1">
          <div>
            <h4 className="font-semibold text-foreground text-sm">Plan de table</h4>
            <p className="text-xs text-muted mt-0.5">
              Votre table est marquée.{effectivePlanView === '3d' ? ' Vue 3D.' : ' Vue 2D.'} Touchez une table pour les détails.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canShow3d && (
              <PlanViewToggle value={effectivePlanView} onChange={setPlanView} />
            )}
            {!isFullscreen && !immersive && (
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-11 rounded-xl border border-border text-xs font-semibold text-muted hover:text-foreground hover:bg-surface-muted transition touch-manipulation"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Agrandir
              </button>
            )}
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border overflow-hidden bg-surface shadow-[var(--shadow-soft)]">
        {effectivePlanView === '3d' && previewBlueprint ? (
          <div className="p-2 sm:p-3 space-y-2">
            <div className="relative overflow-hidden rounded-xl border border-border bg-foreground/5 shadow-[var(--shadow-soft)]">
              <RoomLayoutPreview
                blueprint={previewBlueprint}
                quality="showcase"
                lightingPreset={previewLighting}
                showMeta={false}
                selectedTableId={inspectedTableId || guestTableId}
                selectedSeats={
                  guestTableId && typeof guestSeatIndex === 'number'
                    ? [{ tableId: guestTableId, seatIndex: guestSeatIndex }]
                    : undefined
                }
                onSelectTable={(tableId) => setInspectedTableId(tableId)}
                className={cn(
                  opts.fill ? 'flex-1 min-h-[300px] h-full' : 'min-h-[300px] h-[360px] sm:h-[420px]',
                  '[&_.em-floor-canvas]:min-h-[300px] [&_.em-floor-canvas]:rounded-xl',
                )}
              />

              {/* Beacon HUD 3D "Mon emplacement" */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2.5 rounded-2xl bg-foreground/90 backdrop-blur-md px-3.5 py-2 text-background shadow-lg border border-background/20 animate-fade-in pointer-events-none max-w-[85%]">
                <span className="relative flex h-3 w-3 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400"></span>
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Mon emplacement 3D
                    </p>
                    {(tableDetails?.zoneName || ticketPlacement?.zoneName) && (
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-primary/20 text-primary border border-primary/30 truncate">
                        {tableDetails?.zoneName || ticketPlacement?.zoneName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-white truncate">
                    {tableDetails?.tableName || ticketPlacement?.tableName || 'Votre table'}
                    {guestSeatNumber != null
                      ? ` · Siège n°${guestSeatNumber}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Carte d'inspection d'une table sélectionnée en 3D */}
              {inspectedTable && inspectedTable.id !== guestTableId && (
                <div className="absolute bottom-16 left-3 right-3 sm:right-auto z-20 rounded-2xl bg-foreground/90 backdrop-blur-md p-3 text-background shadow-lg border border-background/20 animate-fade-in max-w-sm flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-white truncate">{inspectedTable.name}</p>
                      <span className="text-xs text-primary font-semibold tabular-nums">
                        ({inspectedTable.occupiedCount}/{inspectedTable.capacity} pl.)
                      </span>
                      {inspectedTable.pricingZoneId && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold uppercase bg-white/20 text-white truncate">
                          {pricingZones?.find((z) => z.id === inspectedTable.pricingZoneId)?.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-background/80 mt-0.5">{getTableShapeLabel(inspectedTable.shape)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {guestTableId && (
                      <button
                        type="button"
                        onClick={() => setInspectedTableId(guestTableId)}
                        className="px-2.5 py-1.5 min-h-11 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary-hover transition active:scale-95"
                      >
                        Mon siège
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setInspectedTableId(null)}
                      className="text-white/70 hover:text-white min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-white/10"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}

              {/* Bouton pour basculer en 2D */}
              <div className="absolute bottom-3 right-3 z-20">
                <button
                  type="button"
                  onClick={() => setPlanView('2d')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-11 rounded-xl bg-surface/95 backdrop-blur-md text-foreground border border-border text-xs font-semibold hover:bg-surface shadow-sm transition active:scale-95 touch-manipulation"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span>Voir en 2D</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed shrink-0 px-1 flex items-center justify-between">
              <span>Orbitez pour explorer la salle. Touchez une table pour voir ses détails ou revenez à votre place.</span>
              <button type="button" onClick={() => setPlanView('2d')} className="font-semibold text-primary hover:underline ml-2 shrink-0">
                Voir en 2D →
              </button>
            </p>
          </div>
        ) : (
          <GuestRoomPlanCanvas
            tables={tablePlanOverview}
            fixtures={planFixtures}
            roomOutline={roomOutline}
            pricingZones={pricingZones}
            walls={previewBlueprint?.walls}
            canvasWidthM={previewBlueprint?.canvas.widthM}
            canvasHeightM={previewBlueprint?.canvas.heightM}
            roomThemeId={roomThemeId}
            floorType={floorType}
            floorImageUrl={floorImageUrl}
            depthAmount={depthAmount}
            depthView={depthView}
            guestTableId={guestTableId}
            guestSeatIndex={guestSeatIndex}
            guestFullName={guestFullName}
            neighborNames={neighborNames}
            height={opts.height}
            fill={opts.fill}
            className={opts.fill ? 'flex-1 min-h-0' : 'rounded-none border-0'}
          />
        )}
        </div>
      </div>
    ) : null;

  const seatDetailSection = tableDetails && (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4 sm:p-6 space-y-4 shadow-[0_10px_40px_rgba(15,23,42,0.05)]"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${theme.accentColor} 14%, var(--surface)), var(--surface))`,
          borderColor: `color-mix(in srgb, ${theme.accentColor} 28%, var(--border))`,
        }}
      >
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Mon emplacement</span>
          </span>
          {tableDetails.zoneName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3 h-3" />
              <span>Zone {tableDetails.zoneName}</span>
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <h3 className="text-2xl font-display font-semibold text-foreground leading-none">{tableDetails.tableName}</h3>
            {tableDetails.seatIndex !== undefined && (
              <p className="text-sm font-bold mt-2" style={{ color: theme.accentColor }}>
                Siège n°{tableDetails.seatIndex + 1}
              </p>
            )}
          </div>
          <div
            className="rounded-2xl px-3.5 py-3 text-center min-w-[76px] shrink-0 border bg-surface/80"
            style={{ borderColor: `color-mix(in srgb, ${theme.accentColor} 22%, var(--border))` }}
          >
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Siège</p>
            <p className="text-lg font-black text-foreground mt-0.5">
              {tableDetails.seatIndex !== undefined ? tableDetails.seatIndex + 1 : '—'}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-surface/80 border border-border rounded-xl p-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Type</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{getTableShapeLabel(tableDetails.shape)}</p>
          </div>
          <div className="bg-surface/80 border border-border rounded-xl p-3">
            <p className="text-xs font-semibold text-muted uppercase tracking-wider">Capacité</p>
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
            className="w-full flex items-center justify-center gap-2 min-h-11 py-3 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Télécharger l&apos;invitation PDF
          </button>
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-[0_10px_40px_rgba(15,23,42,0.05)]">
        <p className="text-sm font-semibold text-foreground mb-4 text-center">
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
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-semibold ${
                            occupant.type === 'guest'
                              ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/25 shadow-sm'
                              : occupant.anonymous
                                ? 'bg-surface-muted/80 border-border/80 text-muted'
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
        <p className="text-xs text-center text-muted font-medium mt-2">Votre siège est mis en évidence</p>
      </div>

      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground text-xs flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span>Voisins de table</span>
            </h4>
            {tableDetails.neighbors.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                {tableDetails.neighbors.length} convive{tableDetails.neighbors.length > 1 ? 's' : ''} à votre table
              </span>
            )}
          </div>
          {tableDetails.privacyPolicy && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted bg-surface-muted px-2 py-0.5 rounded-full border border-border">
              {tableDetails.privacyPolicy.mode === 'hidden' ? (
                <>
                  <EyeOff className="w-3 h-3 text-muted" />
                  <span>Anonymat préservé</span>
                </>
              ) : tableDetails.privacyPolicy.mode === 'first_name' ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-primary" />
                  <span>Prénoms partagés</span>
                </>
              ) : (
                <span>Partage complet</span>
              )}
            </span>
          )}
        </div>

        {tableDetails.privacyPolicy && !tableDetails.privacyPolicy.shareSameTable ? (
          <div className="rounded-xl border border-border bg-surface-muted/60 p-3 text-xs text-muted space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <EyeOff className="w-4 h-4 text-muted" />
              <span>Confidentialité activée</span>
            </div>
            <p>
              Le partage d&apos;informations nominatives entre convives de la même table est désactivé pour cet événement public afin de respecter la vie privée des participants.
            </p>
          </div>
        ) : tableDetails.neighbors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-4 text-center">
            <p className="text-muted text-xs">Vous êtes le premier convive confirmé à cette table.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {tableDetails.neighbors.map((neighbor) => (
              <div key={neighbor.id} className="bg-surface border border-border/90 rounded-2xl p-3 flex items-center gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {neighbor.anonymous ? '?' : `${neighbor.firstName[0] || ''}${neighbor.lastName[0] || ''}`}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-foreground text-xs block truncate">
                    {neighbor.anonymous ? 'Place réservée' : `${neighbor.firstName} ${neighbor.lastName}`.trim()}
                  </span>
                  <span className="text-xs text-muted block truncate mt-0.5">
                    {neighbor.seatIndex !== undefined ? `Siège n°${neighbor.seatIndex + 1}` : 'Invité'}
                    {neighbor.anonymous ? ' · Profil privé' : ' · Même table'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {tableDetails.zoneNeighbors && tableDetails.zoneNeighbors.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h4 className="font-semibold text-foreground text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Autres convives dans votre zone ({tableDetails.zoneName ?? 'Zone'})</span>
            </h4>
            <span className="text-xs text-muted font-medium">
              {tableDetails.zoneNeighborsCount ?? tableDetails.zoneNeighbors.length} participant{(tableDetails.zoneNeighborsCount ?? tableDetails.zoneNeighbors.length) > 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tableDetails.zoneNeighbors.map((zNeighbor, idx) => (
              <div key={`${zNeighbor.id}-${idx}`} className="bg-surface border border-border rounded-2xl p-2.5 flex items-center gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {zNeighbor.anonymous ? '?' : `${zNeighbor.firstName[0] || ''}${zNeighbor.lastName[0] || ''}`}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-foreground text-xs block truncate">
                    {zNeighbor.anonymous ? 'Participant' : `${zNeighbor.firstName} ${zNeighbor.lastName}`.trim()}
                  </span>
                  <span className="text-xs text-muted truncate block">
                    {zNeighbor.tableName} {zNeighbor.anonymous ? '· Profil privé' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Plan de la salle en plein écran"
        className="fixed inset-0 z-[80] bg-background flex flex-col p-2 sm:p-4"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-2 shrink-0">
          <p className="text-sm font-semibold text-foreground truncate">Plan de la salle · {theme.name}</p>
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="min-h-11 px-3.5 inline-flex items-center justify-center border border-border bg-surface text-foreground rounded-[var(--radius-button)] text-xs font-semibold hover:bg-surface-muted transition shrink-0 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Fermer
          </button>
        </div>
        <div className="flex-1 min-h-0">{planSection({ fill: true })}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full pb-20 sm:pb-28">
      {immersive ? (
        <>
          {planSection({ height: planHeight })}
          {seatDetailSection}
        </>
      ) : (
        <>
          <div className="order-1 md:order-2">{planSection({ height: planHeight })}</div>
          <div className="order-2 md:order-1">{seatDetailSection}</div>
        </>
      )}
    </div>
  );
}

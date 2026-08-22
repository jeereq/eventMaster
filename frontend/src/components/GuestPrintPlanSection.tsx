'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import GuestRoomPlanCanvas from '@/components/GuestRoomPlanCanvas';
import RoomWebGLViewer, { type RoomWebGLCaptureApi } from '@/components/RoomWebGLViewer';
import { buildTablePlanPreviewBlueprint } from '@/lib/tablePlanPreviewBlueprint';
import { ensureBlueprintDefaults, type RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';
import type {
  GuestPlanFixture,
  GuestRoomOutline,
  GuestTablePlanOverviewItem,
} from '@/app/rsvp/GuestTablePlanView';

type CaptureState = 'pending' | 'ready' | 'skipped';

interface GuestPrintPlanSectionProps {
  tables: GuestTablePlanOverviewItem[];
  fixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  roomLayoutPreview?: RoomLayoutBlueprint | null;
  sourceRoomType?: string | null;
  previewLightingPreset?: Exclude<LightingPreset, 'auto'> | null;
  guestTableId?: string | null;
  guestFullName: string;
  neighborNames?: string[];
  primaryColor: string;
  onCaptureStateChange?: (state: CaptureState) => void;
}

export default function GuestPrintPlanSection({
  tables,
  fixtures,
  roomOutline,
  roomThemeId,
  floorType,
  floorImageUrl,
  depthAmount,
  depthView,
  roomLayoutPreview = null,
  sourceRoomType,
  previewLightingPreset,
  guestTableId,
  guestFullName,
  neighborNames = [],
  primaryColor,
  onCaptureStateChange,
}: GuestPrintPlanSectionProps) {
  const captureRef = useRef<RoomWebGLCaptureApi>(null);
  const [captureUrl, setCaptureUrl] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<CaptureState>('pending');

  const previewBlueprint = useMemo(() => {
    if (!tables.length) return null;
    return buildTablePlanPreviewBlueprint(
      {
        roomOutline: roomOutline ?? undefined,
        roomThemeId,
        floorType,
        floorImageUrl,
        depthAmount,
        depthView,
        fixtures,
        sourceRoomType,
      },
      tables.map((table) => ({
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
  }, [
    tables,
    roomOutline,
    roomThemeId,
    floorType,
    floorImageUrl,
    depthAmount,
    depthView,
    fixtures,
    sourceRoomType,
    roomLayoutPreview,
  ]);

  const webglBlueprint = useMemo(() => {
    if (!previewBlueprint) return null;
    const base = ensureBlueprintDefaults(previewBlueprint);
    return {
      ...base,
      metadata: {
        ...base.metadata,
        showChandeliers: base.metadata.showChandeliers ?? true,
        showUplights: base.metadata.showUplights ?? true,
        showDecorPlants: base.metadata.showDecorPlants ?? true,
        showRoof: base.metadata.showRoof ?? true,
        renderQuality: 'showcase' as const,
      },
    };
  }, [previewBlueprint]);

  const lighting = previewLightingPreset ?? 'dusk';

  useEffect(() => {
    if (!webglBlueprint) {
      setCaptureState('skipped');
      onCaptureStateChange?.('skipped');
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tryCapture = () => {
      if (cancelled) return;
      attempts += 1;
      const url = captureRef.current?.capturePng(2);
      if (url) {
        setCaptureUrl(url);
        setCaptureState('ready');
        onCaptureStateChange?.('ready');
        return;
      }
      if (attempts < 20) {
        window.setTimeout(tryCapture, 700);
        return;
      }
      setCaptureState('skipped');
      onCaptureStateChange?.('skipped');
    };

    const starter = window.setTimeout(tryCapture, 2800);
    return () => {
      cancelled = true;
      window.clearTimeout(starter);
    };
  }, [webglBlueprint, onCaptureStateChange]);

  return (
    <section
      data-plan-capture={captureState}
      className="overflow-hidden rounded-[22px] border bg-white"
      style={{ borderColor: '#e2e8f0' }}
    >
      <div
        className="px-5 py-4 border-b flex items-end justify-between gap-3"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${primaryColor} 10%, #fff), #f8fafc)`,
          borderColor: '#e2e8f0',
        }}
      >
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: primaryColor }}
          >
            Plan de la salle
          </p>
          <p className="text-xs text-muted mt-1">
            Vue 3D de l&apos;ambiance · repère 2D avec votre table
          </p>
        </div>
        {captureUrl ? (
          <span
            className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full border"
            style={{
              color: primaryColor,
              borderColor: `color-mix(in srgb, ${primaryColor} 35%, #e2e8f0)`,
              background: `color-mix(in srgb, ${primaryColor} 8%, #fff)`,
            }}
          >
            Rendu 3D
          </span>
        ) : null}
      </div>

      {webglBlueprint && !captureUrl ? (
        <div
          className="pointer-events-none fixed opacity-0 overflow-hidden"
          style={{ left: -12000, top: 0, width: 960, height: 600 }}
          aria-hidden
        >
          <RoomWebGLViewer
            ref={captureRef}
            blueprint={webglBlueprint}
            selected={[]}
            onSelect={() => {}}
            readOnly
            previewMode
            renderQuality="showcase"
            lightingPreset={lighting}
            className="h-[600px] w-[960px]"
          />
        </div>
      ) : null}

      {captureUrl ? (
        <div className="relative bg-[#0c0a09]">
          <img
            src={captureUrl}
            alt="Vue 3D de la salle"
            className="w-full h-auto block"
            style={{ maxHeight: 340, objectFit: 'cover', objectPosition: 'center 42%' }}
          />
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(12,10,9,0.55), transparent)' }}
          />
        </div>
      ) : null}

      <div className={captureUrl ? 'border-t' : ''} style={{ borderColor: '#e2e8f0' }}>
        <div className="px-5 py-3 border-b bg-[#fafafa]" style={{ borderColor: '#eef2f6' }}>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
            Repère plan · votre table surlignée
          </p>
        </div>
        <GuestRoomPlanCanvas
          tables={tables}
          fixtures={fixtures}
          roomOutline={roomOutline}
          roomThemeId={roomThemeId}
          floorType={floorType}
          floorImageUrl={floorImageUrl}
          depthAmount={depthAmount}
          depthView={depthView}
          guestTableId={guestTableId}
          guestFullName={guestFullName}
          neighborNames={neighborNames}
          height={240}
          className="rounded-none border-0"
        />
      </div>
    </section>
  );
}

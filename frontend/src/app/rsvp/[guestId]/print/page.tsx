'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import GuestInvitationPrintDocument, {
  type GuestPrintDocumentData,
} from '@/components/GuestInvitationPrintDocument';
import type { GuestGuidelines } from '@/lib/guestGuidelines';
import type {
  GuestPlanFixture,
  GuestRoomOutline,
  GuestTablePlanOverviewItem,
} from '@/app/rsvp/GuestTablePlanView';
import { Loader2 } from 'lucide-react';

type GuestApiResponse = {
  id: string;
  firstName: string;
  lastName: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  placementAccessible?: boolean;
  tableDetails?: {
    tableName: string;
    seatIndex?: number;
    neighbors?: Array<{ firstName: string; lastName: string }>;
  } | null;
  tablePlanOverview?: GuestTablePlanOverviewItem[] | null;
  planFixtures?: GuestPlanFixture[] | null;
  roomOutline?: GuestRoomOutline | null;
  roomThemeId?: string | null;
  floorType?: string | null;
  floorImageUrl?: string | null;
  depthAmount?: number | null;
  depthView?: boolean | null;
  branding?: GuestPrintDocumentData['branding'];
  organizationName?: string;
  event: {
    title: string;
    description?: string | null;
    date: string;
    location: string;
    guestGuidelines?: GuestGuidelines | null;
    invitations?: Array<{
      template?: {
        content?: GuestPrintDocumentData['templateContent'];
      } | null;
    }>;
  };
};

export default function GuestInvitationPrintPage() {
  const params = useParams();
  const guestId = params.guestId as string;
  const [data, setData] = useState<GuestPrintDocumentData | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const guest = await api.get(`/rsvp/${guestId}?print=1`) as GuestApiResponse;
        if (cancelled) return;

        const templateContent = guest.event?.invitations?.[0]?.template?.content ?? null;

        setData({
          guestId: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          rsvp: guest.rsvp,
          event: {
            title: guest.event.title,
            description: guest.event.description,
            date: guest.event.date,
            location: guest.event.location,
            guestGuidelines: guest.event.guestGuidelines,
          },
          templateContent,
          tableDetails: guest.tableDetails
            ? {
                tableName: guest.tableDetails.tableName,
                seatIndex: guest.tableDetails.seatIndex,
                neighbors: guest.tableDetails.neighbors,
              }
            : null,
          tablePlanOverview: guest.placementAccessible ? guest.tablePlanOverview ?? null : null,
          planFixtures: guest.placementAccessible ? guest.planFixtures ?? null : null,
          roomOutline: guest.placementAccessible ? guest.roomOutline ?? null : null,
          roomThemeId: guest.placementAccessible ? guest.roomThemeId ?? null : null,
          floorType: guest.placementAccessible ? guest.floorType ?? null : null,
          floorImageUrl: guest.placementAccessible ? guest.floorImageUrl ?? null : null,
          depthAmount: guest.placementAccessible ? guest.depthAmount ?? null : null,
          depthView: guest.placementAccessible ? guest.depthView ?? null : null,
          showQrCode: guest.rsvp === 'ACCEPTED',
          branding: guest.branding,
          organizationName: guest.organizationName,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Invitation introuvable.');
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [guestId]);

  useEffect(() => {
    if (!data) return;

    const markReady = () => {
      if (document.fonts?.ready) {
        void document.fonts.ready.then(() => {
          setTimeout(() => setReady(true), 1200);
        });
      } else {
        setTimeout(() => setReady(true), 1500);
      }
    };

    markReady();
  }, [data]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div data-pdf-ready={ready ? 'true' : 'false'}>
      <GuestInvitationPrintDocument data={data} />
    </div>
  );
}

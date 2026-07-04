'use client';

import React from 'react';
import { getCanvasStyle } from '@/lib/rsvpFormFields';
import { getTemplateBackgroundStyle } from '@/lib/templateBackgroundStyle';
import { formatGuestInvitationText, type GuestInvitationContext } from '@/lib/guestInvitationText';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import GuestRoomPlanCanvas from '@/components/GuestRoomPlanCanvas';
import type { GuestGuidelines } from '@/lib/guestGuidelines';
import type {
  GuestPlanFixture,
  GuestRoomOutline,
  GuestTablePlanOverviewItem,
} from '@/app/rsvp/GuestTablePlanView';

function buildQrCodeUrl(rsvpUrl: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(rsvpUrl)}&color=4f-46e5&bgcolor=ffffff&qzone=2`;
}

const PRINT_FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;700&family=Alex+Brush&family=Cinzel:wght@400;600;700&family=Dancing+Script:wght@500;700&family=Pinyon+Script&display=swap';

type TemplateElement = {
  id: string;
  type: string;
  text?: string;
  color?: string;
  fontSize?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  letterSpacing?: string;
  bold?: boolean;
  italic?: boolean;
  buttonStyle?: string;
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageObjectFit?: string;
  imageStyle?: string;
  dividerStyle?: string;
  width?: 'full' | 'half' | 'third';
  rsvpPlacement?: string;
};

export type GuestPrintDocumentData = {
  guestId: string;
  firstName: string;
  lastName: string;
  rsvp: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  event: {
    title: string;
    description?: string | null;
    date: string;
    location: string;
    guestGuidelines?: GuestGuidelines | null;
  };
  templateContent?: {
    global?: Record<string, unknown>;
    elements?: TemplateElement[];
  } | null;
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
  showQrCode?: boolean;
};

function widthClass(width?: string) {
  if (width === 'half') return 'w-1/2 px-2';
  if (width === 'third') return 'w-1/3 px-2';
  return 'w-full px-2';
}

function alignFlex(align?: string) {
  if (align === 'left') return 'justify-start';
  if (align === 'right') return 'justify-end';
  return 'justify-center';
}

function rsvpStatusLabel(status: string) {
  if (status === 'ACCEPTED') return 'Présence confirmée';
  if (status === 'DECLINED') return 'Absence déclinée';
  return 'En attente de réponse';
}

export default function GuestInvitationPrintDocument({ data }: { data: GuestPrintDocumentData }) {
  const rsvpLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/rsvp/${data.guestId}`
      : `${process.env.NEXT_PUBLIC_APP_URL || ''}/rsvp/${data.guestId}`;

  const ctx: GuestInvitationContext = {
    firstName: data.firstName,
    lastName: data.lastName,
    event: data.event,
    rsvpLink,
  };

  const global = (data.templateContent?.global || {}) as Record<string, string | number | undefined>;
  const bgType = (global.bgType as string) || 'color';
  const bgColor = (global.bgColor as string) || '#ffffff';
  const bgImageUrl = (global.bgImageUrl as string) || '';
  const bgPattern = (global.bgPattern as string) || 'none';
  const frameType = (global.frameType as string) || 'none';
  const canvasStyle = getCanvasStyle(global);
  const backgroundStyle = getTemplateBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern);

  const elements = (data.templateContent?.elements || []).filter(
    (el) => el.type !== 'rsvp-block' || el.rsvpPlacement !== 'outside',
  );
  const outsideRsvp = (data.templateContent?.elements || []).find(
    (el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside',
  );
  const inlineRsvp = (data.templateContent?.elements || []).find(
    (el) => el.type === 'rsvp-block' && el.rsvpPlacement !== 'outside',
  );
  const rsvpBlock = outsideRsvp || inlineRsvp;

  const renderElement = (el: TemplateElement) => {
    const textStyle: React.CSSProperties = {
      color: el.color || '#334155',
      fontSize: el.fontSize || '16px',
      textAlign: el.align || 'center',
      fontFamily: el.fontFamily ? `"${el.fontFamily}", serif` : '"Cormorant Garamond", serif',
      letterSpacing: el.letterSpacing && el.letterSpacing !== 'normal' ? el.letterSpacing : undefined,
      fontWeight: el.bold ? 'bold' : undefined,
      fontStyle: el.italic ? 'italic' : undefined,
    };

    if (el.type === 'text') {
      return (
        <div className="leading-relaxed break-words whitespace-pre-line" style={textStyle}>
          {formatGuestInvitationText(el.text || '', ctx)}
        </div>
      );
    }

    if (el.type === 'button') {
      return (
        <div className={`flex ${alignFlex(el.align)}`}>
          <span
            style={{
              ...textStyle,
              backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#4f46e5',
              color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#4f46e5' : '#ffffff',
              borderColor: el.color || '#4f46e5',
              display: 'inline-block',
              padding: '10px 24px',
              borderRadius: '12px',
              borderWidth: el.buttonStyle === 'outline' || el.buttonStyle === 'double-border' ? 2 : 0,
              borderStyle: 'solid',
            }}
          >
            {formatGuestInvitationText(el.text || 'Confirmer ma présence', ctx)}
          </span>
        </div>
      );
    }

    if (el.type === 'image' && el.imageUrl) {
      return (
        <div className={`flex ${alignFlex(el.align)}`}>
          <img
            src={el.imageUrl}
            alt=""
            style={{
              width: el.imageWidth || '100%',
              height: el.imageHeight || 'auto',
              maxWidth: '100%',
              objectFit: (el.imageObjectFit as React.CSSProperties['objectFit']) || 'cover',
              borderRadius: el.imageStyle === 'circle' ? '9999px' : '16px',
            }}
          />
        </div>
      );
    }

    if (el.type === 'divider') {
      const color = el.color || '#c5a059';
      return (
        <div className={`flex items-center gap-3 py-2 ${alignFlex(el.align)}`}>
          <div className="flex-1 border-t" style={{ borderColor: color }} />
          <span style={{ color }} className="text-sm select-none">❀</span>
          <div className="flex-1 border-t" style={{ borderColor: color }} />
        </div>
      );
    }

    if (el.type === 'rsvp-block') {
      return renderRsvpBlock(el);
    }

    return null;
  };

  const renderRsvpBlock = (el: TemplateElement) => (
    <div className="bg-white/90 border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
      <p className="font-bold text-slate-800 text-base" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
        {formatGuestInvitationText(el.text || 'Merci de confirmer votre présence', ctx)}
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
        <div className={`py-3 rounded-xl border-2 ${data.rsvp === 'ACCEPTED' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>
          Oui, avec joie !
        </div>
        <div className={`py-3 rounded-xl border-2 ${data.rsvp === 'DECLINED' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500'}`}>
          Non, désolé(e)
        </div>
      </div>
      <p className="text-xs text-slate-500 font-semibold">Statut actuel : {rsvpStatusLabel(data.rsvp)}</p>
      <p className="text-[11px] text-indigo-600 break-all">{ctx.rsvpLink}</p>
    </div>
  );

  const hasTemplate = Boolean(data.templateContent?.elements?.length);
  const showQr = data.showQrCode !== false && data.rsvp === 'ACCEPTED';
  const guestTableId =
    data.tablePlanOverview?.find((t) => t.isGuestTable)?.id ??
    data.tablePlanOverview?.find((t) => t.name === data.tableDetails?.tableName)?.id ??
    null;
  const neighborNames =
    data.tableDetails?.neighbors?.map((n) => `${n.firstName} ${n.lastName}`.trim()) ?? [];

  return (
    <div className="min-h-screen bg-white print:bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
      <link href={PRINT_FONTS} rel="stylesheet" />

      <div className="mx-auto py-8 px-4 flex flex-col items-center gap-6" style={{ maxWidth: canvasStyle.maxWidth || 520 }}>
        <div
          className="w-full relative overflow-hidden flex flex-col shadow-none border border-slate-200 rounded-3xl"
          style={{
            ...backgroundStyle,
            minHeight: canvasStyle.minHeight || 640,
            maxWidth: canvasStyle.maxWidth || 480,
          }}
        >
          {!hasTemplate && (
            <div className="h-2 bg-gradient-to-r from-indigo-500 to-violet-500" />
          )}

          {frameType === 'double-border' && (
            <>
              <div className="absolute inset-3 border border-amber-500/20 rounded-2xl pointer-events-none" />
              <div className="absolute inset-4 border border-amber-500/10 rounded-2xl pointer-events-none" />
            </>
          )}

          {frameType === 'gold-border' && (
            <div className="absolute inset-3 border border-amber-500/30 rounded-2xl pointer-events-none" />
          )}

          <div className="p-8 space-y-6 relative z-10 flex-1">
            {hasTemplate ? (
              <div className="flex flex-wrap -mx-2">
                {elements.map((el) => (
                  <div key={el.id} className={widthClass(el.width)}>
                    {renderElement(el)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-4" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                <p className="text-sm uppercase tracking-widest text-indigo-600 font-bold">Invitation</p>
                <h1 className="text-3xl font-bold text-slate-900">{data.event.title}</h1>
                <p className="text-slate-600 whitespace-pre-line">{data.event.description || ''}</p>
                <p className="text-slate-700 font-semibold">
                  {new Date(data.event.date).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="text-slate-600">{data.event.location}</p>
                <p className="text-lg text-slate-800">
                  Cher/Chère {data.firstName} {data.lastName},
                </p>
              </div>
            )}
          </div>
        </div>

        {rsvpBlock && outsideRsvp && (
          <div className="w-full" style={{ maxWidth: canvasStyle.maxWidth || 480 }}>
            {renderRsvpBlock(rsvpBlock)}
          </div>
        )}

        {data.tableDetails && (
          <div
            className="w-full rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50 p-6 space-y-3"
            style={{ maxWidth: canvasStyle.maxWidth || 480 }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Votre placement</p>
            <p className="text-2xl font-black text-slate-900">{data.tableDetails.tableName}</p>
            {typeof data.tableDetails.seatIndex === 'number' && (
              <p className="text-indigo-700 font-semibold">Siège n°{data.tableDetails.seatIndex + 1}</p>
            )}
            {data.tableDetails.neighbors && data.tableDetails.neighbors.length > 0 && (
              <div className="text-sm text-slate-700 space-y-1 pt-2 border-t border-indigo-100">
                <p className="font-bold text-indigo-900">À votre table :</p>
                {data.tableDetails.neighbors.map((n, i) => (
                  <p key={i}>• {n.firstName} {n.lastName}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {data.tablePlanOverview && data.tablePlanOverview.length > 0 && (
          <div
            className="w-full rounded-2xl border border-slate-200 bg-white overflow-hidden"
            style={{ maxWidth: canvasStyle.maxWidth || 480 }}
          >
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Plan de la salle</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Votre table est mise en évidence</p>
            </div>
            <GuestRoomPlanCanvas
              tables={data.tablePlanOverview}
              fixtures={data.planFixtures}
              roomOutline={data.roomOutline}
              roomThemeId={data.roomThemeId}
              floorType={data.floorType}
              floorImageUrl={data.floorImageUrl}
              guestTableId={guestTableId}
              guestFullName={`${data.firstName} ${data.lastName}`}
              neighborNames={neighborNames}
              height={300}
              className="rounded-none border-0"
            />
          </div>
        )}

        {showQr && (
          <div
            className="w-full rounded-2xl border border-indigo-200 bg-white p-6 text-center space-y-3"
            style={{ maxWidth: canvasStyle.maxWidth || 480 }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Badge QR — confirmation de présence
            </p>
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <img
                  src={buildQrCodeUrl(rsvpLink, 180)}
                  alt="QR Code de confirmation de présence"
                  width={180}
                  height={180}
                  className="w-[180px] h-[180px]"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
              Présentez ce QR code à l&apos;entrée de l&apos;événement pour valider votre présence.
            </p>
          </div>
        )}

        {data.event.guestGuidelines && (
          <div className="w-full" style={{ maxWidth: canvasStyle.maxWidth || 480 }}>
            <GuestGuidelinesView guidelines={data.event.guestGuidelines} variant="light" />
          </div>
        )}

        <div className="text-center text-[10px] text-slate-400 pb-4">
          Document généré pour {data.firstName} {data.lastName} — EventMaster
        </div>
      </div>
    </div>
  );
}

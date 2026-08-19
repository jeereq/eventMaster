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

import { getGuestQrImageUrl } from '@/lib/guestQr';
import { guestRsvpUrl } from '@/lib/share';
import { applyOrgInvitationThemeIfNeeded } from '@/lib/templateColorThemes';

function buildQrCodeUrl(guestId: string, size = 200): string {
  return getGuestQrImageUrl(guestId, size);
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
  positionMode?: 'flow' | 'absolute';
  xPct?: number;
  yPct?: number;
  wPct?: number;
  zIndex?: number;
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
  depthAmount?: number | null;
  depthView?: boolean | null;
  showQrCode?: boolean;
  branding?: {
    primary?: string;
    accent?: string;
    sidebar?: string;
  } | null;
  organizationName?: string;
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
  const rsvpLink = guestRsvpUrl(data.guestId);

  const ctx: GuestInvitationContext = {
    firstName: data.firstName,
    lastName: data.lastName,
    event: data.event,
    rsvpLink,
  };

  const global = (data.templateContent?.global || {}) as Record<string, string | number | undefined>;
  const themed = applyOrgInvitationThemeIfNeeded(
    {
      colorThemeId: global.colorThemeId as string | undefined,
      importedFromMockup: Boolean(global.importedFromMockup),
    },
    data.templateContent?.elements || [],
    data.branding,
  );
  const bgType = (global.bgType as string) || 'color';
  const bgColor = themed.background || (global.bgColor as string) || '#ffffff';
  const bgImageUrl = (global.bgImageUrl as string) || '';
  const bgPattern = (global.bgPattern as string) || 'none';
  const frameType = (global.frameType as string) || 'none';
  const canvasStyle = getCanvasStyle(global);
  const backgroundStyle = getTemplateBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern);

  const elements = themed.elements.filter(
    (el) => el.type !== 'rsvp-block' || el.rsvpPlacement !== 'outside',
  );
  const outsideRsvp = themed.elements.find(
    (el) => el.type === 'rsvp-block' && el.rsvpPlacement === 'outside',
  );
  const inlineRsvp = themed.elements.find(
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
    <div className="bg-surface/90 border border-border rounded-2xl p-6 text-center space-y-4 shadow-sm">
      <p className="font-bold text-foreground text-base" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
        {formatGuestInvitationText(el.text || 'Merci de confirmer votre présence', ctx)}
      </p>
      <div className="grid grid-cols-2 gap-3 text-xs font-bold">
        <div className={`py-3 rounded-xl border-2 ${data.rsvp === 'ACCEPTED' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-border text-muted'}`}>
          Oui, avec joie !
        </div>
        <div className={`py-3 rounded-xl border-2 ${data.rsvp === 'DECLINED' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-border text-muted'}`}>
          Non, désolé(e)
        </div>
      </div>
      <p className="text-xs text-muted font-semibold">Statut actuel : {rsvpStatusLabel(data.rsvp)}</p>
      <p className="text-[11px] text-primary break-all">{ctx.rsvpLink}</p>
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

  const primary = data.branding?.primary || '#4f46e5';
  const accent = data.branding?.accent || primary;
  const orgName = data.organizationName?.trim() || 'Organisation';
  const cardMax = Number.parseInt(String(canvasStyle.maxWidth), 10) || 480;
  const eventDateLabel = data.event.date
    ? new Date(data.event.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const brandVars = {
    ['--primary' as string]: primary,
    ['--primary-hover' as string]: primary,
    ['--color-primary' as string]: primary,
    ['--brand-accent' as string]: accent,
    WebkitPrintColorAdjust: 'exact' as const,
    printColorAdjust: 'exact' as const,
  };

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc', ...brandVars }}>
      <link href={PRINT_FONTS} rel="stylesheet" />

      <div className="mx-auto py-8 px-4 flex flex-col items-center gap-5" style={{ maxWidth: cardMax + 32 }}>
        <article
          className="w-full overflow-hidden border shadow-sm"
          style={{
            maxWidth: cardMax,
            borderRadius: 24,
            borderColor: '#e2e8f0',
            background: '#ffffff',
          }}
        >
          <header
            className="px-8 py-8 text-center text-white"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/85">{orgName}</p>
            <p className="mt-2 text-[22px] font-extrabold tracking-tight">Votre invitation</p>
            <p className="mt-1.5 text-sm font-medium text-white/90">{data.event.title}</p>
          </header>

          <div
            className="w-full relative overflow-hidden flex flex-col"
            style={{
              ...backgroundStyle,
              minHeight: hasTemplate ? canvasStyle.minHeight || 640 : undefined,
            }}
          >
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
                <div
                  className={
                    global.layoutMode === 'free'
                      ? 'relative min-h-[240px] w-full'
                      : 'flex flex-wrap -mx-2'
                  }
                >
                  {elements.map((el, index) => {
                    const isFree = global.layoutMode === 'free' || el.positionMode === 'absolute';
                    return (
                      <div
                        key={el.id}
                        className={isFree ? '' : widthClass(el.width)}
                        style={
                          isFree
                            ? {
                                position: 'absolute',
                                left: `${el.xPct ?? 8}%`,
                                top: `${el.yPct ?? 8}%`,
                                width: `${el.wPct ?? 84}%`,
                                zIndex: el.zIndex ?? index + 1,
                              }
                            : undefined
                        }
                      >
                        {renderElement(el)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <p className="text-[17px] font-bold text-foreground">Bonjour {data.firstName},</p>
                  <p className="text-sm text-muted leading-relaxed">
                    Voici votre invitation. Conservez ce document pour le jour J.
                  </p>
                  {data.event.description ? (
                    <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                      {data.event.description}
                    </p>
                  ) : null}
                  <div
                    className="rounded-2xl border px-4 py-3.5 space-y-1.5 text-sm"
                    style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}
                  >
                    {eventDateLabel ? (
                      <p className="text-foreground">
                        <span className="font-semibold" style={{ color: primary }}>Date</span>
                        {'  ·  '}
                        {eventDateLabel}
                      </p>
                    ) : null}
                    {data.event.location ? (
                      <p className="text-foreground">
                        <span className="font-semibold" style={{ color: primary }}>Lieu</span>
                        {'  ·  '}
                        {data.event.location}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {rsvpBlock && outsideRsvp && (
          <div className="w-full" style={{ maxWidth: cardMax }}>
            {renderRsvpBlock(rsvpBlock)}
          </div>
        )}

        {data.tableDetails && (
          <div
            className="w-full rounded-2xl border p-6 space-y-2 text-center"
            style={{
              maxWidth: cardMax,
              background: `linear-gradient(180deg, color-mix(in srgb, ${primary} 12%, #fff), color-mix(in srgb, ${primary} 5%, #fff))`,
              borderColor: `color-mix(in srgb, ${primary} 28%, #e2e8f0)`,
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: primary }}>
              Votre place
            </p>
            <p className="text-2xl font-black text-foreground">{data.tableDetails.tableName}</p>
            {typeof data.tableDetails.seatIndex === 'number' && (
              <p className="font-semibold" style={{ color: primary }}>
                Siège n°{data.tableDetails.seatIndex + 1}
              </p>
            )}
            {data.tableDetails.neighbors && data.tableDetails.neighbors.length > 0 && (
              <div className="text-sm text-foreground space-y-1 pt-3 border-t text-left" style={{ borderColor: `color-mix(in srgb, ${primary} 20%, #e2e8f0)` }}>
                <p className="font-bold text-center" style={{ color: primary }}>À votre table</p>
                {data.tableDetails.neighbors.map((n, i) => (
                  <p key={i}>• {n.firstName} {n.lastName}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {data.tablePlanOverview && data.tablePlanOverview.length > 0 && (
          <div
            className="w-full rounded-2xl border bg-white overflow-hidden"
            style={{ maxWidth: cardMax, borderColor: '#e2e8f0' }}
          >
            <div className="px-5 py-3 border-b" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: primary }}>
                Plan de la salle
              </p>
              <p className="text-[10px] text-muted mt-0.5">Votre table est mise en évidence</p>
            </div>
            <GuestRoomPlanCanvas
              tables={data.tablePlanOverview}
              fixtures={data.planFixtures}
              roomOutline={data.roomOutline}
              roomThemeId={data.roomThemeId}
              floorType={data.floorType}
              floorImageUrl={data.floorImageUrl}
              depthAmount={data.depthAmount}
              depthView={data.depthView}
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
            className="w-full rounded-2xl border bg-white p-6 text-center space-y-3"
            style={{ maxWidth: cardMax, borderColor: '#e2e8f0' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: primary }}>
              Badge QR
            </p>
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl border shadow-sm" style={{ borderColor: '#e2e8f0' }}>
                <img
                  src={buildQrCodeUrl(data.guestId, 180)}
                  alt="QR Code de confirmation de présence"
                  width={180}
                  height={180}
                  className="w-[180px] h-[180px]"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted leading-relaxed max-w-xs mx-auto">
              Présentez ce code à l&apos;entrée pour valider votre présence.
            </p>
          </div>
        )}

        {data.event.guestGuidelines && (
          <div className="w-full" style={{ maxWidth: cardMax }}>
            <GuestGuidelinesView
              guidelines={data.event.guestGuidelines}
              variant="light"
              accentColor={primary}
            />
          </div>
        )}

        <div className="text-center text-[10px] text-muted pb-4">
          Pour {data.firstName} {data.lastName} — envoyé par {orgName}
        </div>
      </div>
    </div>
  );
}

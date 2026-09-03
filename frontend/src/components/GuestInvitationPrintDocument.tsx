'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { getCanvasStyle } from '@/lib/rsvpFormFields';
import { getTemplateBackgroundStyle } from '@/lib/templateBackgroundStyle';
import { formatGuestInvitationText, type GuestInvitationContext } from '@/lib/guestInvitationText';
import GuestGuidelinesView from '@/components/GuestGuidelinesView';
import GuestPrintPlanSection from '@/components/GuestPrintPlanSection';
import type { GuestGuidelines } from '@/lib/guestGuidelines';
import type {
  GuestPlanFixture,
  GuestRoomOutline,
  GuestTablePlanOverviewItem,
} from '@/app/rsvp/GuestTablePlanView';
import type { RoomLayoutBlueprint } from '@/lib/roomLayoutUtils';
import type { LightingPreset } from '@/lib/roomRenderQuality';

import { getGuestQrImageUrl } from '@/lib/guestQr';
import { guestRsvpUrl } from '@/lib/share';
import { applyOrgInvitationThemeIfNeeded } from '@/lib/templateColorThemes';
import {
  buildInvitationGoogleFontsHref,
  collectInvitationFontFamilies,
  ensureHeadStylesheet,
} from '@/lib/headStylesheet';

function buildQrCodeUrl(guestId: string, size = 200): string {
  return getGuestQrImageUrl(guestId, size);
}

const PRINT_FONTS_ID = 'em-invitation-print-google-fonts';

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
  roomLayoutPreview?: RoomLayoutBlueprint | null;
  sourceRoomType?: string | null;
  previewLightingPreset?: Exclude<LightingPreset, 'auto'> | null;
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
  const [fontsReady, setFontsReady] = useState(false);
  const [planCaptureState, setPlanCaptureState] = useState<'pending' | 'ready' | 'skipped'>(
    data.tablePlanOverview?.length ? 'pending' : 'skipped',
  );

  const pdfReady = fontsReady && planCaptureState !== 'pending';

  useEffect(() => {
    const families = collectInvitationFontFamilies(data.templateContent?.elements, [
      'Playfair Display',
      'Great Vibes',
      'Alex Brush',
      'Cinzel',
      'Dancing Script',
      'Pinyon Script',
    ]);
    ensureHeadStylesheet(buildInvitationGoogleFontsHref(families), PRINT_FONTS_ID);
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => setFontsReady(true));
    } else {
      const t = window.setTimeout(() => setFontsReady(true), 800);
      return () => window.clearTimeout(t);
    }
  }, [data.templateContent?.elements]);

  const handlePlanCaptureState = useCallback((state: 'pending' | 'ready' | 'skipped') => {
    setPlanCaptureState(state);
  }, []);

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
              backgroundColor: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? 'transparent' : el.color || '#059669',
              color: el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist' ? el.color || '#059669' : '#ffffff',
              borderColor: el.color || '#059669',
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
    <div
      className="rounded-[22px] border p-6 text-center space-y-4"
      style={{
        background: '#ffffff',
        borderColor: '#e2e8f0',
        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.06)',
      }}
    >
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

  const primary = data.branding?.primary || '#059669';
  const accent = data.branding?.accent || primary;
  const orgName = data.organizationName?.trim() || 'Organisation';
  const cardMax = Number.parseInt(String(canvasStyle.maxWidth), 10) || 520;
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

  const hasPlacement = Boolean(data.tableDetails || (data.tablePlanOverview && data.tablePlanOverview.length > 0));

  return (
    <div
      className="min-h-screen guest-print-doc"
      style={{ background: 'linear-gradient(180deg, #f1f5f9 0%, #f8fafc 40%, #ffffff 100%)', ...brandVars }}
      data-pdf-ready={pdfReady ? 'true' : 'false'}
    >
      <style>{`
        @media print {
          .guest-print-doc { background: #fff !important; }
          .guest-print-page { box-shadow: none !important; }
          .guest-print-actions { display: none !important; }
        }
      `}</style>

      <div className="mx-auto py-10 px-5 flex flex-col items-center gap-6" style={{ maxWidth: cardMax + 48 }}>
        <div className="guest-print-actions flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!pdfReady}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-95 transition disabled:opacity-50"
          >
            {pdfReady ? 'Imprimer' : 'Préparation…'}
          </button>
        </div>
        <article
          className="guest-print-page w-full overflow-hidden border"
          style={{
            maxWidth: cardMax,
            borderRadius: 28,
            borderColor: '#dbe3ec',
            background: '#ffffff',
            boxShadow: '0 20px 60px rgba(15, 23, 42, 0.08)',
          }}
        >
          <header
            className="relative px-8 py-9 text-center text-white overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 55%, color-mix(in srgb, ${accent} 70%, #0f172a) 100%)` }}
          >
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 20% 0%, #fff 0%, transparent 42%), radial-gradient(circle at 80% 100%, #fff 0%, transparent 38%)',
              }}
            />
            <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-white/80">{orgName}</p>
            <p className="relative mt-3 text-[26px] font-black tracking-tight leading-tight" style={{ fontFamily: '"Playfair Display", serif' }}>
              Votre invitation
            </p>
            <div className="relative mx-auto mt-3 h-px w-16 bg-white/45" />
            <p className="relative mt-3 text-sm font-medium text-white/92">{data.event.title}</p>
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
                <div className="space-y-5 text-left">
                  <p className="text-[18px] font-bold text-foreground" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                    Bonjour {data.firstName},
                  </p>
                  <p className="text-sm text-muted leading-relaxed">
                    Voici votre invitation personnelle. Conservez ce document pour le jour J — placement, plan et badge d&apos;entrée.
                  </p>
                  {data.event.description ? (
                    <p className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed border-l-2 pl-4" style={{ borderColor: `color-mix(in srgb, ${primary} 40%, #e2e8f0)` }}>
                      {data.event.description}
                    </p>
                  ) : null}
                  <div
                    className="rounded-[18px] border px-5 py-4 space-y-2 text-sm"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in srgb, ${primary} 6%, #fff), #f8fafc)`,
                      borderColor: '#e2e8f0',
                    }}
                  >
                    {eventDateLabel ? (
                      <p className="text-foreground flex gap-2">
                        <span className="font-bold shrink-0" style={{ color: primary, minWidth: '3.5rem' }}>Date</span>
                        <span>{eventDateLabel}</span>
                      </p>
                    ) : null}
                    {data.event.location ? (
                      <p className="text-foreground flex gap-2">
                        <span className="font-bold shrink-0" style={{ color: primary, minWidth: '3.5rem' }}>Lieu</span>
                        <span>{data.event.location}</span>
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

        {hasPlacement && (
          <div className="w-full space-y-4" style={{ maxWidth: cardMax }}>
            {data.tableDetails && (
              <div
                className="rounded-[22px] border p-6"
                style={{
                  background: `linear-gradient(145deg, color-mix(in srgb, ${primary} 14%, #fff), #ffffff)`,
                  borderColor: `color-mix(in srgb, ${primary} 24%, #e2e8f0)`,
                  boxShadow: '0 10px 40px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: primary }}>
                      Votre place
                    </p>
                    <p className="text-[28px] font-black text-foreground leading-none">{data.tableDetails.tableName}</p>
                    {typeof data.tableDetails.seatIndex === 'number' && (
                      <p className="text-sm font-bold mt-2" style={{ color: primary }}>
                        Siège n°{data.tableDetails.seatIndex + 1}
                      </p>
                    )}
                  </div>
                  <div
                    className="rounded-2xl px-4 py-3 text-center min-w-[88px]"
                    style={{
                      background: `color-mix(in srgb, ${primary} 12%, #fff)`,
                      border: `1px solid color-mix(in srgb, ${primary} 22%, #e2e8f0)`,
                    }}
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Table</p>
                    <p className="text-lg font-black text-foreground mt-0.5">
                      {typeof data.tableDetails.seatIndex === 'number' ? data.tableDetails.seatIndex + 1 : '—'}
                    </p>
                  </div>
                </div>

                {data.tableDetails.neighbors && data.tableDetails.neighbors.length > 0 && (
                  <div
                    className="mt-5 pt-4 border-t space-y-2"
                    style={{ borderColor: `color-mix(in srgb, ${primary} 18%, #e2e8f0)` }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: primary }}>
                      À votre table
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {data.tableDetails.neighbors.map((n, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/80 border text-sm"
                          style={{ borderColor: '#e2e8f0' }}
                        >
                          <span
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              background: `color-mix(in srgb, ${primary} 12%, #fff)`,
                              color: primary,
                            }}
                          >
                            {n.firstName[0]}{n.lastName[0]}
                          </span>
                          <span className="font-medium text-foreground">{n.firstName} {n.lastName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {data.tablePlanOverview && data.tablePlanOverview.length > 0 && (
              <GuestPrintPlanSection
                tables={data.tablePlanOverview}
                fixtures={data.planFixtures}
                roomOutline={data.roomOutline}
                roomThemeId={data.roomThemeId}
                floorType={data.floorType}
                floorImageUrl={data.floorImageUrl}
                depthAmount={data.depthAmount}
                depthView={data.depthView}
                roomLayoutPreview={data.roomLayoutPreview ?? null}
                sourceRoomType={data.sourceRoomType}
                previewLightingPreset={data.previewLightingPreset}
                guestTableId={guestTableId}
                guestFullName={`${data.firstName} ${data.lastName}`}
                neighborNames={neighborNames}
                primaryColor={primary}
                onCaptureStateChange={handlePlanCaptureState}
              />
            )}
          </div>
        )}

        {showQr && (
          <div
            className="w-full rounded-[22px] border bg-white p-7 text-center space-y-4"
            style={{
              maxWidth: cardMax,
              borderColor: '#e2e8f0',
              boxShadow: '0 10px 40px rgba(15, 23, 42, 0.05)',
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: primary }}>
              Badge d&apos;entrée
            </p>
            <div className="flex justify-center">
              <div
                className="p-4 bg-white rounded-[20px] border"
                style={{
                  borderColor: '#e2e8f0',
                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.8), 0 8px 24px rgba(15,23,42,0.08)',
                }}
              >
                <img
                  src={buildQrCodeUrl(data.guestId, 200)}
                  alt="QR Code de confirmation de présence"
                  width={200}
                  height={200}
                  className="w-[200px] h-[200px]"
                />
              </div>
            </div>
            <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto">
              Présentez ce code à l&apos;accueil le jour de l&apos;événement.
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

        <div
          className="w-full text-center pt-2 pb-6 space-y-2"
          style={{ maxWidth: cardMax }}
        >
          <div className="mx-auto h-px w-24" style={{ background: `color-mix(in srgb, ${primary} 35%, #e2e8f0)` }} />
          <p className="text-[10px] text-muted tracking-wide">
            Document personnel · {data.firstName} {data.lastName}
          </p>
          <p className="text-[10px] text-muted/80">Envoyé par {orgName}</p>
        </div>
      </div>
    </div>
  );
}

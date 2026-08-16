'use client';

import React from 'react';
import type { LandingTemplate } from '@/config/landingTemplates';
import { getCanvasStyle } from '@/lib/rsvpFormFields';
import { getTemplateBackgroundStyle } from '@/lib/templateBackgroundStyle';

const LANDING_PREVIEW_FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Montserrat:wght@400;600;700&family=Playfair+Display:wght@400;700&display=swap';

interface PreviewElement {
  id?: string;
  type?: string;
  text?: string;
  color?: string;
  fontSize?: string;
  align?: 'left' | 'center' | 'right';
  fontFamily?: string;
  letterSpacing?: string;
  bold?: boolean;
  italic?: boolean;
  buttonStyle?: string;
  buttonLink?: string;
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageObjectFit?: string;
  imageStyle?: string;
  dividerStyle?: string;
  width?: 'full' | 'half' | 'third';
}

interface LandingInvitationPreviewProps {
  template: LandingTemplate;
  compact?: boolean;
  className?: string;
}

function isTailwindTypography(value?: string): boolean {
  if (!value) return false;
  return /\b(text-|font-|tracking-|leading-)/.test(value);
}

function resolveTypography(fontSize?: string, compact?: boolean) {
  if (!fontSize || isTailwindTypography(fontSize)) {
    return {
      className: fontSize || (compact ? 'text-xs' : 'text-base'),
      style: undefined as React.CSSProperties | undefined,
    };
  }
  if (fontSize.endsWith('px') && compact) {
    const px = Math.max(8, Math.round(parseInt(fontSize, 10) * 0.55));
    return { className: undefined, style: { fontSize: `${px}px` } as React.CSSProperties };
  }
  return { className: undefined, style: { fontSize } as React.CSSProperties };
}

function alignClass(align?: string) {
  if (align === 'left') return 'justify-start text-left';
  if (align === 'right') return 'justify-end text-right';
  return 'justify-center text-center';
}

function widthClass(width?: string) {
  if (width === 'half') return 'w-1/2';
  if (width === 'third') return 'w-1/3';
  return 'w-full';
}

function buttonClasses(buttonStyle?: string) {
  switch (buttonStyle) {
    case 'outline':
      return 'px-4 py-2 rounded-xl border-2';
    case 'pill':
      return 'px-4 py-2 rounded-full shadow-md';
    case 'gold-glow':
      return 'px-4 py-2 rounded-xl shadow-[0_0_12px_rgba(197,160,89,0.35)]';
    case 'double-border':
      return 'px-4 py-1.5 rounded-xl border-4 border-double';
    case 'minimalist':
      return 'px-2 py-1 border-b-2 rounded-none';
    default:
      return 'px-4 py-2 rounded-xl shadow-md';
  }
}

function renderDivider(el: PreviewElement, compact?: boolean) {
  const color = el.color || '#c5a059';
  const symbolSize = compact ? 'text-[10px]' : 'text-sm';
  if (el.dividerStyle === 'dashed') {
    return <div className="w-full border-t border-dashed" style={{ borderColor: color }} />;
  }
  if (el.dividerStyle === 'solid') {
    return <div className="w-full border-t" style={{ borderColor: color }} />;
  }
  const ornament =
    el.dividerStyle === 'ornament-diamond' ? '✦ ❖ ✦' :
    el.dividerStyle === 'ornament-star' ? '✦' :
    el.dividerStyle === 'ornament-leaves' ? '🌿 ❀ 🌿' :
    '❀';
  return (
    <div className={`flex items-center gap-2 w-full ${compact ? 'py-1' : 'py-2'}`}>
      <div className="flex-1 border-t" style={{ borderColor: color }} />
      <span style={{ color }} className={`${symbolSize} select-none shrink-0`}>{ornament}</span>
      <div className="flex-1 border-t" style={{ borderColor: color }} />
    </div>
  );
}

function renderElement(el: PreviewElement, compact?: boolean) {
  const typography = resolveTypography(el.fontSize, compact);
  const textStyle: React.CSSProperties = {
    color: el.color || '#334155',
    textAlign: el.align || 'center',
    fontFamily: el.fontFamily ? `"${el.fontFamily}", serif` : undefined,
    letterSpacing: el.letterSpacing && el.letterSpacing !== 'normal' ? el.letterSpacing : undefined,
    fontWeight: el.bold ? 'bold' : undefined,
    fontStyle: el.italic ? 'italic' : undefined,
    ...typography.style,
  };

  switch (el.type) {
    case 'text':
      return (
        <div
          className={`leading-relaxed break-words ${typography.className || ''} ${compact ? 'line-clamp-3' : ''}`}
          style={textStyle}
        >
          {el.text}
        </div>
      );

    case 'button': {
      const isOutline = el.buttonStyle === 'outline' || el.buttonStyle === 'minimalist';
      return (
        <div className={`flex ${alignClass(el.align)}`}>
          <span
            style={{
              backgroundColor: isOutline ? 'transparent' : el.color || '#4f46e5',
              color: isOutline ? el.color || '#4f46e5' : '#ffffff',
              borderColor: isOutline || el.buttonStyle === 'double-border' ? el.color || '#4f46e5' : 'transparent',
              fontFamily: el.fontFamily ? `"${el.fontFamily}", serif` : undefined,
              letterSpacing: el.letterSpacing && el.letterSpacing !== 'normal' ? el.letterSpacing : undefined,
              fontWeight: el.bold ? 'bold' : 600,
              fontStyle: el.italic ? 'italic' : undefined,
              ...resolveTypography(el.fontSize, compact).style,
            }}
            className={`inline-block pointer-events-none ${buttonClasses(el.buttonStyle)} ${compact ? 'text-[10px]' : 'text-sm'}`}
          >
            {el.text || 'Confirmer'}
          </span>
        </div>
      );
    }

    case 'image': {
      const imgHeight = compact ? '3.5rem' : el.imageHeight || '8rem';
      const imgWidth = compact ? '100%' : el.imageWidth || '100%';
      return (
        <div className={`flex ${alignClass(el.align)} w-full`}>
          {el.imageUrl ? (
            <img
              src={el.imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className={`border border-slate-200/80 bg-slate-50 object-cover ${compact ? 'rounded-md' : 'rounded-xl'}`}
              style={{
                width: imgWidth,
                height: imgHeight,
                maxWidth: '100%',
                objectFit: (el.imageObjectFit as React.CSSProperties['objectFit']) || 'cover',
              }}
            />
          ) : (
            <div
              className={`bg-slate-100 border border-dashed border-slate-300 text-slate-400 flex items-center justify-center ${compact ? 'h-12 text-[9px] rounded-md' : 'h-24 text-xs rounded-xl'}`}
              style={{ width: imgWidth }}
            >
              Image
            </div>
          )}
        </div>
      );
    }

    case 'divider':
      return renderDivider(el, compact);

    case 'rsvp-block':
      return (
        <div
          className={`border border-dashed rounded-xl text-center ${compact ? 'px-2 py-2 text-[9px]' : 'px-4 py-3 text-xs'}`}
          style={{ borderColor: el.color || '#c5a059', color: el.color || '#c5a059' }}
        >
          {el.text || 'Bloc RSVP'}
        </div>
      );

    default:
      return null;
  }
}

function renderLegacyElement(
  el: LandingTemplate['elements'][number],
  compact?: boolean,
) {
  const typography = resolveTypography(el.fontSize, compact);
  if (el.type === 'button') {
    return (
      <div className="flex justify-center">
        <span
          className={`inline-block rounded-xl font-bold text-white bg-primary ${compact ? 'px-3 py-1 text-[10px]' : 'px-5 py-2.5 text-sm'}`}
        >
          {el.content || 'Confirmer'}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`text-center leading-relaxed ${typography.className || ''} ${compact ? 'line-clamp-2' : ''}`}
      style={{ color: el.color || '#334155', ...typography.style }}
    >
      {el.content}
    </div>
  );
}

export default function LandingInvitationPreview({
  template,
  compact = false,
  className = '',
}: LandingInvitationPreviewProps) {
  const global = template.previewContent?.global;
  const rawElements = (template.previewContent?.elements || []) as PreviewElement[];
  const bgColor = global?.bgColor || template.style.bgColor || '#faf8f5';
  const bgType = (global?.bgType as string | undefined) || 'color';
  const bgImageUrl = (global?.bgImageUrl as string | undefined) || '';
  const bgPattern = (global?.bgPattern as string | undefined) || 'paper';
  const canvasStyle = getCanvasStyle(global as Parameters<typeof getCanvasStyle>[0]);
  const backgroundStyle = getTemplateBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern);
  const hasBackgroundImage = bgType === 'image' && Boolean(bgImageUrl);
  const useLegacyOnly = rawElements.length === 0;

  const visibleElements = useLegacyOnly
    ? template.elements
    : rawElements.filter((el) =>
        ['text', 'button', 'image', 'divider', 'rsvp-block'].includes(el.type || ''),
      );

  const elementsToRender = compact && hasBackgroundImage
    ? (visibleElements as PreviewElement[]).filter((el) => el.type === 'image' || el.type === 'divider').slice(0, 2)
    : visibleElements;

  return (
    <>
      <link href={LANDING_PREVIEW_FONTS} rel="stylesheet" />
      <div
        className={`rounded-[var(--radius-card)] border shadow-[var(--shadow-soft)] transition-all duration-300 flex flex-col relative overflow-hidden ${compact ? 'min-h-[180px]' : 'p-6 sm:p-8 min-h-[340px]'} ${className}`}
        style={{
          ...backgroundStyle,
          borderColor: template.style.borderColor || 'rgba(226,232,240,0.9)',
          ...(compact ? { padding: hasBackgroundImage ? '0.5rem' : '0.75rem' } : { maxWidth: canvasStyle.maxWidth, minHeight: canvasStyle.minHeight }),
        }}
      >
        {hasBackgroundImage && compact && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none z-[1]" />
        )}

        <div
          className={`relative z-10 flex flex-wrap gap-y-2 w-full ${
            compact && hasBackgroundImage ? 'mt-auto pt-8' : compact ? '' : ''
          }`}
        >
          {useLegacyOnly
            ? template.elements.map((el, i) => (
                <div key={i} className="w-full">
                  {renderLegacyElement(el, compact)}
                </div>
              ))
            : (elementsToRender as PreviewElement[]).map((el, i) => (
                <div key={el.id || i} className={`${widthClass(el.width)} px-1`}>
                  {renderElement(el, compact)}
                </div>
              ))}
        </div>
      </div>
    </>
  );
}

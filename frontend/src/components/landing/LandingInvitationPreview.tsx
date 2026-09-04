'use client';

import React, { useState } from 'react';
import type { LandingTemplate } from '@/config/landingTemplates';
import { getTemplateBackgroundStyle } from '@/lib/templateBackgroundStyle';
import { useHeadStylesheet } from '@/lib/headStylesheet';
import { ImageIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

const LANDING_PREVIEW_FONTS =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Great+Vibes&family=Playfair+Display:wght@400;700&display=swap';

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

export interface LandingInvitationPreviewProps {
  template: LandingTemplate;
  compact?: boolean;
  /** hero = aperçu landing, default = carte standard, compact = miniature */
  variant?: 'default' | 'hero' | 'compact' | 'studio';
  className?: string;
  showOnlyBackground?: boolean;
  aspectRatio?: 'auto' | 'portrait' | 'card' | '9/16';
  fitMode?: 'cover' | 'contain';
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

/**
 * Image robuste avec repli en cas d'erreur de chargement
 */
function PreviewImage({
  src,
  alt = '',
  className,
  style,
  compact,
}: {
  src?: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  compact?: boolean;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'bg-surface-muted/80 border border-dashed border-border/80 text-muted flex flex-col items-center justify-center p-2 rounded-xl text-xs select-none',
          className,
        )}
        style={style}
      >
        <ImageIcon className={cn('text-muted/60', compact ? 'w-3.5 h-3.5' : 'w-5 h-5 mb-1')} aria-hidden />
        {!compact && <span className="text-[10px] opacity-75">Image de référence</span>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      style={style}
    />
  );
}

function renderDivider(el: PreviewElement, compact?: boolean, accentColor = '#c5a059') {
  const color = el.color || accentColor;
  const symbolSize = compact ? 'text-[10px]' : 'text-sm';
  if (el.dividerStyle === 'dashed') {
    return <div className="w-full border-t border-dashed my-1" style={{ borderColor: color }} />;
  }
  if (el.dividerStyle === 'solid') {
    return <div className="w-full border-t my-1" style={{ borderColor: color }} />;
  }
  const ornament =
    el.dividerStyle === 'ornament-diamond'
      ? '✦ ❖ ✦'
      : el.dividerStyle === 'ornament-star'
        ? '✦'
        : el.dividerStyle === 'ornament-leaves'
          ? '🌿 ❀ 🌿'
          : '❀';
  return (
    <div className={`flex items-center gap-2 w-full ${compact ? 'py-1' : 'py-2'}`}>
      <div className="flex-1 border-t opacity-70" style={{ borderColor: color }} />
      <span style={{ color }} className={`${symbolSize} select-none shrink-0 font-serif`}>
        {ornament}
      </span>
      <div className="flex-1 border-t opacity-70" style={{ borderColor: color }} />
    </div>
  );
}

function renderElement(el: PreviewElement, compact?: boolean, paletteAccent = '#c5a059', textColor?: string) {
  const typography = resolveTypography(el.fontSize, compact);
  const textStyle: React.CSSProperties = {
    color: el.color || textColor || 'inherit',
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
      const btnColor = el.color || paletteAccent;
      return (
        <div className={`flex ${alignClass(el.align)} my-1`}>
          <span
            style={{
              backgroundColor: isOutline ? 'transparent' : btnColor,
              color: isOutline ? btnColor : '#ffffff',
              borderColor: isOutline || el.buttonStyle === 'double-border' ? btnColor : 'transparent',
              fontFamily: el.fontFamily ? `"${el.fontFamily}", serif` : undefined,
              letterSpacing: el.letterSpacing && el.letterSpacing !== 'normal' ? el.letterSpacing : undefined,
              fontWeight: el.bold ? 'bold' : 600,
              fontStyle: el.italic ? 'italic' : undefined,
              ...resolveTypography(el.fontSize, compact).style,
            }}
            className={`inline-block pointer-events-none transition-shadow ${buttonClasses(el.buttonStyle)} ${
              compact ? 'text-[10px] px-3 py-1' : 'text-sm px-5 py-2.5'
            }`}
          >
            {el.text || 'Confirmer votre présence'}
          </span>
        </div>
      );
    }

    case 'image': {
      const imgHeight = compact ? '3.5rem' : el.imageHeight || '8rem';
      const imgWidth = compact ? '100%' : el.imageWidth || '100%';
      return (
        <div className={`flex ${alignClass(el.align)} w-full my-1`}>
          <PreviewImage
            src={el.imageUrl}
            compact={compact}
            className={`border border-border/80 bg-surface-muted object-cover ${
              compact ? 'rounded-md' : 'rounded-xl'
            }`}
            style={{
              width: imgWidth,
              height: imgHeight,
              maxWidth: '100%',
              objectFit: (el.imageObjectFit as React.CSSProperties['objectFit']) || 'cover',
            }}
          />
        </div>
      );
    }

    case 'divider':
      return renderDivider(el, compact, paletteAccent);

    case 'rsvp-block': {
      const accent = el.color || paletteAccent;
      return (
        <div
          className={`border border-dashed rounded-xl text-center w-full my-1 ${
            compact ? 'px-2 py-2 text-[9px]' : 'px-4 py-3 text-xs'
          }`}
          style={{ borderColor: accent, color: accent }}
        >
          {el.text || 'Confirmer votre présence'}
        </div>
      );
    }

    default:
      return null;
  }
}

function renderLegacyElement(el: LandingTemplate['elements'][number], compact?: boolean) {
  const typography = resolveTypography(el.fontSize, compact);
  if (el.type === 'button') {
    return (
      <div className="flex justify-center my-1">
        <span
          className={`inline-block rounded-xl font-bold text-white bg-primary shadow-sm ${
            compact ? 'px-3 py-1 text-[10px]' : 'px-5 py-2.5 text-sm'
          }`}
        >
          {el.content || 'Confirmer votre présence'}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`text-center leading-relaxed ${typography.className || ''} ${compact ? 'line-clamp-2' : ''}`}
      style={{ color: el.color || 'inherit', ...typography.style }}
    >
      {el.content}
    </div>
  );
}

/**
 * Rendu du style de cadre IA (frameType)
 */
function renderFrame(frameType?: string) {
  switch (frameType) {
    case 'gold-border':
      return (
        <div className="absolute inset-2 sm:inset-3 border border-amber-500/40 rounded-xl pointer-events-none z-[3] shadow-[inset_0_0_0_1px_rgba(217,175,90,0.35)]">
          {/* Coins dorés ornementaux */}
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-amber-400" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-amber-400" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-amber-400" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-amber-400" />
        </div>
      );

    case 'double-border':
      return (
        <div className="absolute inset-2 sm:inset-3 border border-primary/40 rounded-xl pointer-events-none z-[3]">
          <div className="absolute inset-1 border border-primary/20 rounded-lg pointer-events-none" />
        </div>
      );

    case 'floral-wreath':
      return (
        <div className="absolute inset-2 sm:inset-3.5 border border-amber-500/35 rounded-2xl pointer-events-none z-[3]">
          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-surface/90 px-2 text-[10px] text-amber-500 select-none font-serif">
            ❀ ✦ ❀
          </span>
          <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-surface/90 px-2 text-[10px] text-amber-500 select-none font-serif">
            ❀ ✦ ❀
          </span>
        </div>
      );

    case 'minimal-leaves':
      return (
        <div className="absolute inset-2.5 sm:inset-4 border border-foreground/15 rounded-xl pointer-events-none z-[3]">
          <div className="absolute -top-1 left-4 text-[9px] text-foreground/45 select-none bg-surface/90 px-1">🌿</div>
          <div className="absolute -bottom-1 right-4 text-[9px] text-foreground/45 select-none bg-surface/90 px-1">🌿</div>
        </div>
      );

    default:
      return null;
  }
}

export default function LandingInvitationPreview({
  template,
  compact = false,
  variant,
  className = '',
  showOnlyBackground = false,
  aspectRatio = 'auto',
  fitMode = 'cover',
}: LandingInvitationPreviewProps) {
  useHeadStylesheet(LANDING_PREVIEW_FONTS, 'em-landing-preview-fonts');

  const mode = variant || (compact ? 'compact' : 'default');
  const isCompact = mode === 'compact' || mode === 'hero';
  const isHero = mode === 'hero';

  const global = template.previewContent?.global as Record<string, unknown> | undefined;
  const rawElements = (template.previewContent?.elements || []) as PreviewElement[];
  const palette = (global?.palette || {}) as Record<string, string>;
  const paletteAccent = palette.accent || palette.primary || '#c5a059';

  const bgColor = (global?.bgColor as string) || template.style.bgColor || '#faf8f5';
  const bgType = (global?.bgType as string | undefined) || 'color';
  const bgImageUrl = (global?.bgImageUrl as string | undefined) || '';
  const bgPattern = (global?.bgPattern as string | undefined) || 'paper';
  const frameType = (global?.frameType as string | undefined) || 'none';

  const baseBackgroundStyle = getTemplateBackgroundStyle(bgType, bgColor, bgImageUrl, bgPattern);
  const hasBackgroundImage = bgType === 'image' && Boolean(bgImageUrl);
  const useLegacyOnly = rawElements.length === 0;

  const backgroundStyle: React.CSSProperties = {
    ...baseBackgroundStyle,
    ...(hasBackgroundImage
      ? {
          backgroundSize: fitMode === 'contain' ? 'contain' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : {}),
  };

  const visibleElements = useLegacyOnly
    ? template.elements
    : rawElements.filter((el) => ['text', 'button', 'image', 'divider', 'rsvp-block'].includes(el.type || ''));

  const elementsToRender = isCompact
    ? (visibleElements as PreviewElement[]).slice(0, isHero ? 5 : hasBackgroundImage ? 5 : 6)
    : visibleElements;

  // Calcul du format physique de carte proportionnel 9:16
  const is916 = aspectRatio === '9/16' || aspectRatio === 'card' || aspectRatio === 'portrait' || (!isCompact && aspectRatio === 'auto');

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[var(--radius-card)] border shadow-md transition-all duration-300 overflow-hidden select-none',
        isHero
          ? 'h-full max-h-full p-4 sm:p-5 justify-center'
          : isCompact
            ? 'min-h-[180px] max-h-[240px] p-3'
            : is916
              ? 'w-full max-w-[340px] sm:max-w-[360px] mx-auto aspect-[9/16] justify-end'
              : 'p-6 sm:p-8 min-h-[280px] max-h-[min(520px,70vh)]',
        className,
      )}
      style={{
        ...backgroundStyle,
        borderColor: template.style.borderColor || 'rgba(197, 160, 89, 0.4)',
      }}
    >
      {/* Cadre ornemental physique (frameType) si non masqué */}
      {renderFrame(frameType)}

      {/* Si l'utilisateur choisit d'admirer uniquement l'illustration générée */}
      {showOnlyBackground ? (
        <div className="relative z-10 flex flex-col items-center justify-end h-full p-3 pointer-events-none">
          <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-sm animate-fade-in">
            Illustration haute définition générée par IA
          </span>
        </div>
      ) : (
        <>
          {/* Rendu réaliste et proportionnel : aucun gros bloc opaque ne masque la photo */}
          {hasBackgroundImage ? (
            <div
              className={cn(
                'relative z-10 flex flex-col justify-end w-full mt-auto',
                isCompact
                  ? 'bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 text-white'
                  : 'bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-14 pb-4 px-3.5 sm:px-4 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] rounded-b-[inherit]',
              )}
            >
              <div className="flex flex-wrap gap-y-1 w-full">
                {useLegacyOnly
                  ? template.elements.map((el, i) => (
                      <div key={i} className="w-full">
                        {renderLegacyElement(el, isCompact)}
                      </div>
                    ))
                  : (elementsToRender as PreviewElement[]).map((el, i) => (
                      <div key={el.id || i} className={`${widthClass(el.width)} px-0.5`}>
                        {renderElement(el, isCompact, paletteAccent, '#ffffff')}
                      </div>
                    ))}
              </div>
            </div>
          ) : (
            /* Arrière-plan uni ou texturé (papier, parchemin) */
            <div
              className={cn(
                'relative z-10 flex flex-wrap gap-y-1.5 w-full p-4 sm:p-5',
                isHero && 'overflow-hidden max-h-full',
              )}
            >
              {useLegacyOnly
                ? template.elements.map((el, i) => (
                    <div key={i} className="w-full">
                      {renderLegacyElement(el, isCompact)}
                    </div>
                  ))
                : (elementsToRender as PreviewElement[]).map((el, i) => (
                    <div key={el.id || i} className={`${widthClass(el.width)} px-0.5`}>
                      {renderElement(el, isCompact, paletteAccent)}
                    </div>
                  ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

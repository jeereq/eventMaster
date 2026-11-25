/* eslint-disable @next/next/no-img-element -- images d’invitation (URL libres, data URI, masques CSS) */
import React from 'react';
import { templateImageStyleClass, templateImageStyleExtra } from '@/lib/templateImageStyle';
import {
  hasTemplateImageEffects,
  templateImageLayerStyles,
  type TemplateImageEffects,
} from '@/lib/templateImageEffects';

export type TemplateImageElement = TemplateImageEffects & {
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageObjectFit?: 'cover' | 'contain' | 'fill' | 'none' | string;
  imageStyle?: string;
  text?: string;
};

/**
 * Rendu unique d’une image de modèle d’invitation (éditeur, invitation invitée,
 * impression, vitrine). Sans effet, le rendu est identique à l’historique.
 */
export default function TemplateImage({
  el,
  alt,
  className = '',
  draggable,
}: {
  el: TemplateImageElement;
  alt?: string;
  className?: string;
  draggable?: boolean;
}) {
  if (!el.imageUrl) return null;
  const altText = alt ?? (el.text && el.text !== "Image d'illustration" ? el.text : '');

  if (!hasTemplateImageEffects(el)) {
    return (
      <img
        src={el.imageUrl}
        alt={altText}
        draggable={draggable}
        style={{
          width: el.imageWidth || '100%',
          height: el.imageHeight || 'auto',
          maxWidth: '100%',
          objectFit: (el.imageObjectFit as React.CSSProperties['objectFit']) || 'cover',
          ...templateImageStyleExtra(el.imageStyle),
        }}
        className={`${templateImageStyleClass(el.imageStyle)} ${className}`.trim()}
      />
    );
  }

  const layers = templateImageLayerStyles(el);
  const hasShape = Boolean(el.imageShape && el.imageShape !== 'none');
  return (
    <div style={layers.outer} className={className}>
      <div
        style={{ ...(hasShape ? {} : templateImageStyleExtra(el.imageStyle)), ...layers.frame }}
        className={hasShape ? '' : templateImageStyleClass(el.imageStyle)}
      >
        <div style={layers.fade}>
          <img src={el.imageUrl} alt={altText} draggable={draggable} style={layers.img} />
          {layers.overlay && (
            <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...layers.overlay }} />
          )}
        </div>
      </div>
    </div>
  );
}

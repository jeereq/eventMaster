import type { CSSProperties } from 'react';

export const TEMPLATE_TEXT_EFFECTS = [
  { id: 'none', label: 'Aucun' },
  { id: 'gold-foil', label: 'Or métallique' },
  { id: 'outline', label: 'Contour' },
] as const;

export type TemplateTextEffectId = (typeof TEMPLATE_TEXT_EFFECTS)[number]['id'];

export function templateTextEffectStyle(effect?: string, color?: string): CSSProperties {
  if (effect === 'gold-foil') {
    return {
      backgroundImage: 'linear-gradient(180deg, #f8e7a0 0%, #d4af37 45%, #8a6a1a 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    };
  }
  if (effect === 'outline') {
    return {
      WebkitTextStroke: `1.15px ${color || '#ffffff'}`,
      color: 'transparent',
      WebkitTextFillColor: 'transparent',
    };
  }
  return {};
}

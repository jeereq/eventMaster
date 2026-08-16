import type { TemplatePalette } from '@/lib/imagePalette';

export interface InvitationColorTheme {
  id: string;
  name: string;
  description: string;
  palette: TemplatePalette;
}

export const INVITATION_COLOR_THEMES: InvitationColorTheme[] = [
  {
    id: 'ivory-gold',
    name: 'Ivoire & or',
    description: 'Classique mariage',
    palette: { primary: '#1e293b', secondary: '#475569', accent: '#c5a059', background: '#faf7f2', isDark: false },
  },
  {
    id: 'night-indigo',
    name: 'Nuit indigo',
    description: 'Soirée élégante',
    palette: { primary: '#e0e7ff', secondary: '#a5b4fc', accent: '#818cf8', background: '#1e1b4b', isDark: true },
  },
  {
    id: 'emerald-garden',
    name: 'Jardin émeraude',
    description: 'Nature & fraîcheur',
    palette: { primary: '#064e3b', secondary: '#047857', accent: '#34d399', background: '#ecfdf5', isDark: false },
  },
  {
    id: 'powder-rose',
    name: 'Rose poudré',
    description: 'Romantique doux',
    palette: { primary: '#9f1239', secondary: '#be123c', accent: '#fb7185', background: '#fff1f2', isDark: false },
  },
  {
    id: 'charcoal-gold',
    name: 'Charcoal & or',
    description: 'Luxe sombre',
    palette: { primary: '#f5f5f4', secondary: '#d6d3d1', accent: '#d4a017', background: '#1c1917', isDark: true },
  },
  {
    id: 'ocean-sky',
    name: 'Océan',
    description: 'Bleu contemporain',
    palette: { primary: '#0c4a6e', secondary: '#0369a1', accent: '#38bdf8', background: '#f0f9ff', isDark: false },
  },
  {
    id: 'terracotta',
    name: 'Terracotta',
    description: 'Chaleur méditerranéenne',
    palette: { primary: '#7c2d12', secondary: '#9a3412', accent: '#ea580c', background: '#fff7ed', isDark: false },
  },
  {
    id: 'mono-ink',
    name: 'Encre mono',
    description: 'Minimal noir & blanc',
    palette: { primary: '#0f172a', secondary: '#334155', accent: '#64748b', background: '#ffffff', isDark: false },
  },
];

export type ColorableElement = {
  id: string;
  type: string;
  color?: string;
  fontSize?: string;
  text?: string;
};

/** Recolorise les éléments selon des rôles simples (titre / corps / accent). */
export function applyPaletteToElements<T extends ColorableElement>(
  elements: T[],
  palette: TemplatePalette,
): T[] {
  return elements.map((el, index) => {
    if (el.type === 'divider' || el.type === 'curve' || el.type === 'triangle') {
      return { ...el, color: palette.accent };
    }
    if (el.type === 'button') {
      return { ...el, color: palette.accent };
    }
    if (el.type === 'text') {
      const size = parseInt(String(el.fontSize || '16'), 10);
      const isTitle = size >= 24 || index === 0 || index === 1;
      return { ...el, color: isTitle ? palette.primary : palette.secondary };
    }
    return el;
  });
}

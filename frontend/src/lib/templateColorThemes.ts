import type { TemplatePalette } from '@/lib/imagePalette';
import { adjustHex, hexToRgbChannels, type TenantBranding } from '@/lib/brandTheme';

export interface InvitationColorTheme {
  id: string;
  name: string;
  description: string;
  palette: TemplatePalette;
}

export const ORG_BRAND_THEME_ID = 'org-brand';

function mixWithWhite(hex: string, whiteRatio: number): string {
  const channels = hexToRgbChannels(hex).split(',').map((part) => Number(part.trim()));
  if (channels.length !== 3 || channels.some((n) => Number.isNaN(n))) return '#f8fafc';
  const mix = (channel: number) => Math.round(channel * (1 - whiteRatio) + 255 * whiteRatio);
  return `#${channels.map((channel) => mix(channel).toString(16).padStart(2, '0')).join('')}`;
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
    if (el.type === 'button' || el.type === 'rsvp-block') {
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

/** Palette d’invitation dérivée des couleurs de l’organisation. */
export function buildOrgBrandInvitationTheme(branding?: TenantBranding | null): InvitationColorTheme {
  const primary = branding?.primary || '#4f46e5';
  const accent = branding?.accent || primary;
  return {
    id: ORG_BRAND_THEME_ID,
    name: 'Organisation',
    description: 'Couleurs de votre organisation',
    palette: {
      primary: adjustHex(primary, -18),
      secondary: adjustHex(primary, 12),
      accent,
      background: mixWithWhite(primary, 0.94),
      isDark: false,
    },
  };
}

export function invitationColorThemes(branding?: TenantBranding | null): InvitationColorTheme[] {
  return [buildOrgBrandInvitationTheme(branding), ...INVITATION_COLOR_THEMES];
}

export function usesLiveOrgInvitationTheme(
  global?: { colorThemeId?: string; importedFromMockup?: boolean } | null,
): boolean {
  if (global?.importedFromMockup) return false;
  if (!global?.colorThemeId) return true;
  return global.colorThemeId === ORG_BRAND_THEME_ID;
}

export function applyOrgInvitationThemeIfNeeded<T extends ColorableElement>(
  global: { colorThemeId?: string; importedFromMockup?: boolean } | undefined,
  elements: T[],
  branding?: TenantBranding | null,
): { elements: T[]; background?: string } {
  if (!usesLiveOrgInvitationTheme(global)) {
    return { elements };
  }
  const theme = buildOrgBrandInvitationTheme(branding);
  return {
    elements: applyPaletteToElements(elements, theme.palette),
    background: theme.palette.background,
  };
}

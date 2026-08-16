export type FontThemeId = 'classic' | 'modern' | 'script' | 'editorial';

export interface FontThemeDef {
  id: FontThemeId;
  name: string;
  titleFont: string;
  bodyFont: string;
  accentFont: string;
}

export const FONT_THEMES: FontThemeDef[] = [
  {
    id: 'classic',
    name: 'Classique',
    titleFont: 'Cormorant Garamond',
    bodyFont: 'Cormorant Garamond',
    accentFont: 'Montserrat',
  },
  {
    id: 'modern',
    name: 'Moderne',
    titleFont: 'Playfair Display',
    bodyFont: 'Montserrat',
    accentFont: 'Montserrat',
  },
  {
    id: 'script',
    name: 'Calligraphie',
    titleFont: 'Great Vibes',
    bodyFont: 'Cormorant Garamond',
    accentFont: 'Montserrat',
  },
  {
    id: 'editorial',
    name: 'Éditorial',
    titleFont: 'Cinzel',
    bodyFont: 'Prata',
    accentFont: 'Montserrat',
  },
];

export function getFontTheme(id?: string): FontThemeDef {
  return FONT_THEMES.find((t) => t.id === id) || FONT_THEMES[0];
}

export function applyFontThemeToElements<T extends { type: string; fontFamily?: string; fontSize?: string }>(
  elements: T[],
  themeId: string,
): T[] {
  const theme = getFontTheme(themeId);
  return elements.map((el, index) => {
    if (el.type !== 'text' && el.type !== 'button') return el;
    const size = parseInt(String(el.fontSize || '16'), 10);
    const isTitle = size >= 24 || index <= 1;
    return {
      ...el,
      fontFamily: isTitle ? theme.titleFont : theme.bodyFont,
    };
  });
}

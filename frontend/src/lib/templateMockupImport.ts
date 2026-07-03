import type { TemplatePalette } from '@/lib/imagePalette';

export type MockupRsvpFieldType = 'text' | 'select' | 'checkbox';

export interface MockupRsvpField {
  id: string;
  type: MockupRsvpFieldType;
  label: string;
  options?: string;
  required: boolean;
}

export type MockupDividerStyle =
  | 'solid'
  | 'dashed'
  | 'ornament-flower'
  | 'ornament-diamond'
  | 'ornament-star'
  | 'ornament-leaves'
  | 'ornament-lace';

export type MockupButtonStyle =
  | 'filled'
  | 'outline'
  | 'pill'
  | 'gold-glow'
  | 'double-border'
  | 'minimalist';

export type MockupBgPattern =
  | 'none'
  | 'paper'
  | 'watercolor'
  | 'boho'
  | 'linen'
  | 'marble'
  | 'gold-dust'
  | 'parchment'
  | 'velvet';

export type MockupFrameType =
  | 'none'
  | 'arch'
  | 'double-border'
  | 'gold-border'
  | 'floral-wreath'
  | 'floral-arch'
  | 'boho-dried'
  | 'gold-leaves-circle'
  | 'minimal-leaves';

export type MockupFloralType =
  | 'roses'
  | 'cherry-blossom'
  | 'gold-leaves'
  | 'sunflowers'
  | 'eucalyptus';

export interface MockupCanvasElement {
  id: string;
  type: 'text' | 'image' | 'button' | 'rsvp-block' | 'curve' | 'triangle' | 'divider';
  text: string;
  color: string;
  fontSize: string;
  align: 'left' | 'center' | 'right';
  width?: 'full' | 'half' | 'third';
  fontFamily?: string;
  letterSpacing?: string;
  bold?: boolean;
  italic?: boolean;
  dividerStyle?: MockupDividerStyle;
  buttonStyle?: MockupButtonStyle;
  rsvpFields?: MockupRsvpField[];
}

export interface MockupTemplateGlobal {
  bgType: 'color' | 'image' | 'pattern';
  bgColor: string;
  bgImageUrl: string;
  bgPattern: MockupBgPattern;
  frameType: MockupFrameType;
  fontTheme: string;
  floralColor: string;
  floralType: MockupFloralType;
  floralDensity: number;
  importedFromMockup?: boolean;
  palette?: TemplatePalette;
}

export interface MockupImportResult {
  templateName: string;
  global: MockupTemplateGlobal;
  elements: MockupCanvasElement[];
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Niveau 2 : fond image Cloudinary + blocs texte pré-positionnés + palette extraite. */
export function buildMockupTemplate(imageUrl: string, palette: TemplatePalette): MockupImportResult {
  const textPrimary = palette.isDark ? '#f8fafc' : palette.primary;
  const textSecondary = palette.isDark ? '#cbd5e1' : palette.secondary;
  const accent = palette.accent;

  return {
    templateName: 'Maquette importée',
    global: {
      bgType: 'image',
      bgColor: palette.background,
      bgImageUrl: imageUrl,
      bgPattern: 'paper',
      frameType: palette.isDark ? 'gold-border' : 'double-border',
      fontTheme: 'classic',
      floralColor: accent,
      floralType: 'gold-leaves',
      floralDensity: 30,
      importedFromMockup: true,
      palette,
    },
    elements: [
      {
        id: uid(),
        type: 'text',
        text: 'TITRE DE L\'ÉVÉNEMENT',
        color: accent,
        fontSize: '11px',
        align: 'center',
        width: 'full',
        fontFamily: 'Montserrat',
        letterSpacing: '0.2em',
        bold: true,
      },
      {
        id: uid(),
        type: 'text',
        text: 'Nom ou thème principal',
        color: textPrimary,
        fontSize: '34px',
        align: 'center',
        width: 'full',
        fontFamily: 'Great Vibes',
      },
      {
        id: uid(),
        type: 'divider',
        text: '',
        color: accent,
        fontSize: '14px',
        align: 'center',
        width: 'full',
        dividerStyle: 'ornament-flower',
      },
      {
        id: uid(),
        type: 'text',
        text: 'Sous-titre ou message d\'accueil personnalisable',
        color: textSecondary,
        fontSize: '16px',
        align: 'center',
        width: 'full',
        fontFamily: 'Cormorant Garamond',
        italic: true,
      },
      {
        id: uid(),
        type: 'text',
        text: 'DATE',
        color: textPrimary,
        fontSize: '11px',
        align: 'center',
        width: 'third',
        fontFamily: 'Montserrat',
        letterSpacing: '0.12em',
        bold: true,
      },
      {
        id: uid(),
        type: 'text',
        text: 'LIEU',
        color: accent,
        fontSize: '14px',
        align: 'center',
        width: 'third',
        fontFamily: 'Cormorant Garamond',
        bold: true,
      },
      {
        id: uid(),
        type: 'text',
        text: 'HEURE',
        color: textPrimary,
        fontSize: '11px',
        align: 'center',
        width: 'third',
        fontFamily: 'Montserrat',
        letterSpacing: '0.12em',
        bold: true,
      },
      {
        id: uid(),
        type: 'divider',
        text: '',
        color: palette.isDark ? '#475569' : '#cbd5e1',
        fontSize: '12px',
        align: 'center',
        width: 'full',
        dividerStyle: 'solid',
      },
      {
        id: uid(),
        type: 'text',
        text: 'Détails supplémentaires, dress code, programme…',
        color: textSecondary,
        fontSize: '14px',
        align: 'center',
        width: 'full',
        fontFamily: 'Cormorant Garamond',
      },
      {
        id: uid(),
        type: 'button',
        text: 'Confirmer ma présence',
        color: accent,
        fontSize: '14px',
        align: 'center',
        width: 'full',
        fontFamily: 'Montserrat',
        bold: true,
        buttonStyle: palette.isDark ? 'gold-glow' : 'filled',
      },
      {
        id: uid(),
        type: 'rsvp-block',
        text: 'Formulaire RSVP',
        color: accent,
        fontSize: '15px',
        align: 'center',
        width: 'full',
        rsvpFields: [
          { id: uid(), type: 'select', label: 'Choix du menu', options: 'Standard, Végétarien, Enfant', required: true },
          { id: uid(), type: 'checkbox', label: 'Je viens accompagné(e)', required: false },
        ],
      },
    ],
  };
}

export interface MockupEditorSetters {
  setTemplateName: (v: string) => void;
  setCanvasElements: (v: MockupCanvasElement[]) => void;
  setBgType: (v: 'color' | 'image' | 'pattern') => void;
  setBgColor: (v: string) => void;
  setBgImageUrl: (v: string) => void;
  setBgPattern: (v: MockupBgPattern) => void;
  setFrameType: (v: MockupFrameType) => void;
  setFontTheme: (v: string) => void;
  setFloralColor: (v: string) => void;
  setFloralType: (v: MockupFloralType) => void;
  setFloralDensity: (v: number) => void;
  setSelectedElementId: (v: string | null) => void;
}

export function applyMockupToEditor(mockup: MockupImportResult, setters: MockupEditorSetters) {
  setters.setTemplateName(mockup.templateName);
  setters.setCanvasElements(mockup.elements);
  setters.setBgType(mockup.global.bgType);
  setters.setBgColor(mockup.global.bgColor);
  setters.setBgImageUrl(mockup.global.bgImageUrl);
  setters.setBgPattern(mockup.global.bgPattern);
  setters.setFrameType(mockup.global.frameType);
  setters.setFontTheme(mockup.global.fontTheme);
  setters.setFloralColor(mockup.global.floralColor);
  setters.setFloralType(mockup.global.floralType);
  setters.setFloralDensity(mockup.global.floralDensity);
  setters.setSelectedElementId(null);
}

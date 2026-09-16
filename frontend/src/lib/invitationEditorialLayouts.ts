import type { InvitationArtStyleId } from '@/config/invitationArtStyles';
import type { TemplateImageStyleId } from '@/lib/templateImageStyle';

const photo = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const COUPLE = photo('1519741497674-611481863552');
const COUPLE_2 = photo('1511285560929-80b456fea0af');
const COUPLE_3 = photo('1522673607200-164d1b6ce486');
const PORTRAIT_F = photo('1531123897727-8f129e1688ce');
const PORTRAIT_M = photo('1507003211169-0a1dd7228f2d');
const PARTY = photo('1492684223066-81342ee5ff30');
const SUIT = photo('1507679799987-c73779587ccf');

export type EditorialLayoutId =
  | 'wedding-arch'
  | 'moodboard'
  | 'diamonds'
  | 'club-flyer'
  | 'magazine-cover'
  | 'affiche-hero'
  | 'portrait-regard';

export type EditorialLayoutCategory = 'mariage' | 'soiree' | 'affiche';

export type EditorialLayoutElement = {
  id: string;
  type: 'text' | 'image' | 'button' | 'rsvp-block' | 'divider';
  text: string;
  color: string;
  fontSize: string;
  align: 'left' | 'center' | 'right';
  fontFamily?: string;
  letterSpacing?: string;
  bold?: boolean;
  italic?: boolean;
  imageUrl?: string;
  imageWidth?: string;
  imageHeight?: string;
  imageObjectFit?: 'cover' | 'contain';
  imageStyle?: TemplateImageStyleId;
  positionMode: 'absolute';
  xPct: number;
  yPct: number;
  wPct: number;
  zIndex: number;
  rsvpPlacement?: 'inline' | 'outside';
  buttonStyle?: 'filled' | 'outline';
  buttonLink?: string;
};

export type EditorialLayout = {
  id: EditorialLayoutId;
  name: string;
  hint: string;
  category: EditorialLayoutCategory;
  suggestedArtStyle: InvitationArtStyleId;
  layoutMode: 'free';
  bgType: 'color' | 'image';
  bgColor: string;
  bgImageUrl?: string;
  frameType: string;
  fontTheme: string;
  canvasWidth: number;
  canvasHeight: number;
  canvasSizePreset: 'custom';
  elements: EditorialLayoutElement[];
};

export function fillEditorialTokens(
  text: string,
  values: { title?: string; date?: string; location?: string },
): string {
  return text
    .replaceAll('{{title}}', values.title?.trim() || 'Votre événement')
    .replaceAll('{{date}}', values.date?.trim() || 'Samedi 20 décembre')
    .replaceAll('{{location}}', values.location?.trim() || 'Kinshasa');
}

function img(
  id: string,
  url: string,
  style: TemplateImageStyleId,
  box: { x: number; y: number; w: number; h: string; z: number },
): EditorialLayoutElement {
  return {
    id,
    type: 'image',
    text: 'Photo',
    color: '#ffffff',
    fontSize: '12px',
    align: 'center',
    imageUrl: url,
    imageWidth: '100%',
    imageHeight: box.h,
    imageObjectFit: 'cover',
    imageStyle: style,
    positionMode: 'absolute',
    xPct: box.x,
    yPct: box.y,
    wPct: box.w,
    zIndex: box.z,
  };
}

function copy(
  id: string,
  text: string,
  box: { x: number; y: number; w: number; z: number },
  style: Partial<EditorialLayoutElement>,
): EditorialLayoutElement {
  return {
    id,
    type: 'text',
    text,
    color: style.color ?? '#f7f4ef',
    fontSize: style.fontSize ?? '14px',
    align: style.align ?? 'center',
    fontFamily: style.fontFamily,
    letterSpacing: style.letterSpacing,
    bold: style.bold,
    italic: style.italic,
    positionMode: 'absolute',
    xPct: box.x,
    yPct: box.y,
    wPct: box.w,
    zIndex: box.z,
  };
}

export const EDITORIAL_LAYOUT_CATEGORIES: Array<{ id: EditorialLayoutCategory; label: string }> = [
  { id: 'mariage', label: 'Mariage' },
  { id: 'soiree', label: 'Soirée' },
  { id: 'affiche', label: 'Affiche' },
];

export const EDITORIAL_LAYOUTS: EditorialLayout[] = [
  {
    id: 'wedding-arch',
    name: 'Mariage arche',
    hint: 'Photo couple en arche dorée, noms, date, lieu',
    category: 'mariage',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#0b1220',
    frameType: 'gold-border',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('wa-photo', COUPLE, 'arch-gold', { x: 12, y: 5, w: 76, h: '280px', z: 1 }),
      copy('wa-names', '{{title}}', { x: 8, y: 46, w: 84, z: 2 }, {
        fontSize: '34px',
        fontFamily: 'Cormorant Garamond',
        color: '#f7f4ef',
      }),
      copy('wa-date', '{{date}}', { x: 10, y: 58, w: 80, z: 3 }, {
        fontSize: '16px',
        letterSpacing: '0.18em',
        color: '#d4af37',
        bold: true,
      }),
      copy('wa-place', '{{location}}', { x: 10, y: 64, w: 80, z: 4 }, {
        fontSize: '13px',
        color: '#cfc8bc',
      }),
      copy('wa-line', 'Nous nous marions', { x: 10, y: 70, w: 80, z: 5 }, {
        fontSize: '12px',
        letterSpacing: '0.22em',
        color: '#d4af37',
      }),
      {
        id: 'wa-rsvp',
        type: 'rsvp-block',
        text: 'Confirmer votre présence',
        color: '#d4af37',
        fontSize: '14px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 14,
        yPct: 78,
        wPct: 72,
        zIndex: 6,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'moodboard',
    name: 'Moodboard N&B',
    hint: 'Collage de photos et mots d’inspiration',
    category: 'mariage',
    suggestedArtStyle: 'minimaliste-luxe',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#111111',
    frameType: 'none',
    fontTheme: 'minimal',
    canvasWidth: 480,
    canvasHeight: 780,
    canvasSizePreset: 'custom',
    elements: [
      img('mb-1', COUPLE, 'vintage', { x: 4, y: 3, w: 36, h: '120px', z: 1 }),
      img('mb-2', COUPLE_2, 'circle', { x: 44, y: 3, w: 24, h: '110px', z: 2 }),
      img('mb-3', COUPLE_3, 'rounded', { x: 70, y: 3, w: 26, h: '120px', z: 3 }),
      copy('mb-title', 'INSPO', { x: 8, y: 22, w: 84, z: 4 }, {
        fontSize: '28px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.28em',
        color: '#f7f4ef',
      }),
      copy(
        'mb-words',
        'AMOUR\nÉLÉGANCE\nCONNEXION\nLOYAUTÉ\nCROISSANCE\nFOI',
        { x: 8, y: 30, w: 36, z: 5 },
        { fontSize: '11px', letterSpacing: '0.16em', align: 'left', color: '#cfc8bc' },
      ),
      img('mb-4', COUPLE_2, 'shadow-luxury', { x: 46, y: 30, w: 50, h: '150px', z: 6 }),
      img('mb-5', PORTRAIT_M, 'circle', { x: 6, y: 58, w: 28, h: '110px', z: 7 }),
      img('mb-6', PORTRAIT_F, 'oval', { x: 38, y: 58, w: 28, h: '120px', z: 8 }),
      copy('mb-event', '{{title}}\n{{date}}', { x: 68, y: 62, w: 28, z: 9 }, {
        fontSize: '11px',
        align: 'right',
        color: '#f7f4ef',
      }),
      {
        id: 'mb-rsvp',
        type: 'rsvp-block',
        text: 'Répondre',
        color: '#f7f4ef',
        fontSize: '13px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 18,
        yPct: 86,
        wPct: 64,
        zIndex: 10,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'diamonds',
    name: 'Galerie losanges',
    hint: 'Cadres en losange sur fond coloré',
    category: 'mariage',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#f5c400',
    frameType: 'none',
    fontTheme: 'modern',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('dm-1', COUPLE, 'diamond-frame', { x: 8, y: 4, w: 34, h: '150px', z: 1 }),
      img('dm-2', COUPLE_2, 'diamond-frame', { x: 58, y: 4, w: 34, h: '150px', z: 2 }),
      img('dm-3', COUPLE_3, 'diamond-frame', { x: 26, y: 26, w: 48, h: '210px', z: 3 }),
      img('dm-4', PORTRAIT_M, 'diamond-frame', { x: 8, y: 56, w: 34, h: '150px', z: 4 }),
      img('dm-5', PORTRAIT_F, 'diamond-frame', { x: 58, y: 56, w: 34, h: '150px', z: 5 }),
      copy('dm-title', '{{title}}', { x: 8, y: 80, w: 84, z: 6 }, {
        fontSize: '22px',
        fontFamily: 'Cinzel',
        color: '#171614',
        bold: true,
      }),
      {
        id: 'dm-rsvp',
        type: 'rsvp-block',
        text: 'Confirmer',
        color: '#171614',
        fontSize: '14px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 20,
        yPct: 88,
        wPct: 60,
        zIndex: 7,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'club-flyer',
    name: 'Flyer soirée',
    hint: 'Portrait dramatique, gros titre, line-up',
    category: 'soiree',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#09090b',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('cf-hero', PORTRAIT_F, 'full-bleed', { x: 0, y: 0, w: 100, h: '520px', z: 1 }),
      copy('cf-brand', 'EVENTMASTER PRÉSENTE', { x: 6, y: 4, w: 88, z: 2 }, {
        fontSize: '10px',
        letterSpacing: '0.32em',
        color: '#f7f4ef',
      }),
      copy('cf-title', '{{title}}', { x: 6, y: 48, w: 88, z: 3 }, {
        fontSize: '42px',
        fontFamily: 'Cinzel',
        color: '#ffffff',
        bold: true,
        letterSpacing: '-0.03em',
      }),
      copy('cf-when', '{{date}}  ·  {{location}}', { x: 6, y: 64, w: 88, z: 4 }, {
        fontSize: '13px',
        letterSpacing: '0.12em',
        color: '#fbbf24',
      }),
      copy(
        'cf-lineup',
        'LINE-UP\nDJ ALPHA\nDJ TONY\nMC KING',
        { x: 8, y: 72, w: 44, z: 5 },
        { fontSize: '12px', align: 'left', letterSpacing: '0.14em', color: '#f7f4ef' },
      ),
      {
        id: 'cf-rsvp',
        type: 'rsvp-block',
        text: 'Prendre sa place',
        color: '#fbbf24',
        fontSize: '14px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 48,
        yPct: 78,
        wPct: 44,
        zIndex: 6,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'magazine-cover',
    name: 'Couverture magazine',
    hint: 'Photo en pied, masthead, date, code-barres',
    category: 'soiree',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#2a2a2c',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('mg-hero', SUIT, 'magazine', { x: 18, y: 16, w: 64, h: '420px', z: 1 }),
      copy('mg-mast', 'ANNIVERSAIRE', { x: 4, y: 3, w: 92, z: 2 }, {
        fontSize: '28px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.22em',
        color: '#f7f4ef',
      }),
      copy('mg-name', '{{title}}', { x: 6, y: 74, w: 54, z: 3 }, {
        fontSize: '16px',
        align: 'left',
        color: '#f7f4ef',
        letterSpacing: '0.08em',
      }),
      copy('mg-date', '{{date}}', { x: 58, y: 72, w: 36, z: 4 }, {
        fontSize: '18px',
        align: 'right',
        color: '#f7f4ef',
        bold: true,
      }),
      copy('mg-bar', '||||||||||||||||||||', { x: 62, y: 84, w: 32, z: 5 }, {
        fontSize: '14px',
        align: 'right',
        letterSpacing: '-0.08em',
        color: '#cfc8bc',
      }),
      {
        id: 'mg-rsvp',
        type: 'rsvp-block',
        text: 'Confirmer',
        color: '#f7f4ef',
        fontSize: '13px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 8,
        yPct: 86,
        wPct: 48,
        zIndex: 6,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'affiche-hero',
    name: 'Affiche héro',
    hint: 'Portrait dramatique plein cadre, titre en bas',
    category: 'affiche',
    suggestedArtStyle: 'encre-trait',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#0a0606',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('ah-hero', PARTY, 'full-bleed', { x: 0, y: 0, w: 100, h: '620px', z: 1 }),
      copy('ah-kicker', 'PRÉSENTE', { x: 8, y: 72, w: 84, z: 2 }, {
        fontSize: '11px',
        letterSpacing: '0.32em',
        color: '#fbbf24',
      }),
      copy('ah-title', '{{title}}', { x: 6, y: 76, w: 88, z: 3 }, {
        fontSize: '36px',
        fontFamily: 'Cinzel',
        color: '#f7f4ef',
        bold: true,
      }),
      copy('ah-when', '{{date}}  ·  {{location}}', { x: 8, y: 86, w: 84, z: 4 }, {
        fontSize: '12px',
        letterSpacing: '0.14em',
        color: '#cfc8bc',
      }),
      {
        id: 'ah-rsvp',
        type: 'rsvp-block',
        text: 'Répondre',
        color: '#fbbf24',
        fontSize: '13px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 22,
        yPct: 91,
        wPct: 56,
        zIndex: 5,
        rsvpPlacement: 'outside',
      },
    ],
  },
  {
    id: 'portrait-regard',
    name: 'Portrait regard',
    hint: 'Gros plan éditorial, texte discret',
    category: 'affiche',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#111111',
    frameType: 'none',
    fontTheme: 'minimal',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('pr-face', PORTRAIT_F, 'full-bleed', { x: 0, y: 0, w: 100, h: '680px', z: 1 }),
      copy('pr-title', '{{title}}', { x: 8, y: 86, w: 84, z: 2 }, {
        fontSize: '18px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.16em',
        color: '#f7f4ef',
      }),
      copy('pr-when', '{{date}}', { x: 8, y: 91, w: 84, z: 3 }, {
        fontSize: '12px',
        letterSpacing: '0.18em',
        color: '#d4af37',
      }),
      {
        id: 'pr-rsvp',
        type: 'rsvp-block',
        text: 'Confirmer',
        color: '#f7f4ef',
        fontSize: '13px',
        align: 'center',
        positionMode: 'absolute',
        xPct: 22,
        yPct: 94,
        wPct: 56,
        zIndex: 4,
        rsvpPlacement: 'outside',
      },
    ],
  },
];

export function editorialLayoutById(id: EditorialLayoutId): EditorialLayout {
  const found = EDITORIAL_LAYOUTS.find((layout) => layout.id === id);
  if (!found) throw new Error(`Mise en page inconnue: ${id}`);
  return found;
}

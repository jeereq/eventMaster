import type { InvitationArtStyleId } from '@/config/invitationArtStyles';
import type { TemplateImageStyleId } from '@/lib/templateImageStyle';
import type { TemplateImageEffects } from '@/lib/templateImageEffects';
import type { TemplateElementEffects } from '@/lib/templateElementStyle';
import { illustrationDataUri } from '@/lib/templateIllustrations';

const photo = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const COUPLE = photo('1519741497674-611481863552');
// L’ancienne photo (1511285560929) n’existe plus chez Unsplash (404) : cadres vides.
const COUPLE_2 = photo('1537633552985-df8429e8048b');
const COUPLE_4 = photo('1583939003579-730e3918a45a');
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
  | 'portrait-regard'
  | 'garden-laurel'
  | 'dot-wax'
  | 'birthday-balloons'
  | 'baptism-dove'
  | 'gala-crown';

export type EditorialLayoutCategory = 'mariage' | 'fete' | 'soiree' | 'affiche';

export type EditorialLayoutElement = TemplateImageEffects & TemplateElementEffects & {
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
  illustrationId?: string;
  illustrationColor?: string;
  illustrationColor2?: string;
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
  effects: Partial<EditorialLayoutElement> = {},
): EditorialLayoutElement {
  return {
    ...effects,
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
    rotation: style.rotation,
    opacity: style.opacity,
    textShadow: style.textShadow,
    textShadowColor: style.textShadowColor,
  };
}

/** Illustration vectorielle de la bibliothèque (recolorable dans l’éditeur). */
function illu(
  id: string,
  illustrationId: string,
  color: string,
  box: { x: number; y: number; w: number; z: number },
  extra: Partial<EditorialLayoutElement> & { color2?: string } = {},
): EditorialLayoutElement {
  const { color2, ...rest } = extra;
  return {
    ...rest,
    id,
    type: 'image',
    text: 'Illustration',
    color,
    fontSize: '12px',
    align: 'center',
    imageUrl: illustrationDataUri(illustrationId, color, color2) || '',
    imageWidth: '100%',
    imageHeight: 'auto',
    imageObjectFit: 'contain',
    imageStyle: 'plain',
    illustrationId,
    illustrationColor: color,
    illustrationColor2: color2,
    positionMode: 'absolute',
    xPct: box.x,
    yPct: box.y,
    wPct: box.w,
    zIndex: box.z,
  };
}

const rsvp = (id: string, text: string, color: string, box: { x: number; y: number; w: number; z: number }): EditorialLayoutElement => ({
  id,
  type: 'rsvp-block',
  text,
  color,
  fontSize: '14px',
  align: 'center',
  positionMode: 'absolute',
  xPct: box.x,
  yPct: box.y,
  wPct: box.w,
  zIndex: box.z,
  rsvpPlacement: 'outside',
});

export const EDITORIAL_LAYOUT_CATEGORIES: Array<{ id: EditorialLayoutCategory; label: string }> = [
  { id: 'mariage', label: 'Mariage' },
  { id: 'fete', label: 'Anniversaire et baptême' },
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
      img('wa-photo', COUPLE, 'arch-gold', { x: 12, y: 5, w: 76, h: '280px', z: 1 }, { imageFilter: 'warm' }),
      illu('wa-spark', 'sparkles', '#d4af37', { x: 2, y: 2, w: 18, z: 7 }, { opacity: 85 }),
      copy('wa-names', '{{title}}', { x: 8, y: 46, w: 84, z: 2 }, {
        fontSize: '34px',
        fontFamily: 'Cormorant Garamond',
        color: '#f7f4ef',
        textShadow: 'soft',
      }),
      illu('wa-branch-l', 'leafy-branch', '#d4af37', { x: 4, y: 55, w: 14, z: 8 }, { opacity: 80, rotation: -20 }),
      illu('wa-branch-r', 'leafy-branch', '#d4af37', { x: 82, y: 55, w: 14, z: 9 }, { opacity: 80, rotation: 20, imageFlipX: true }),
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
      img('mb-1', COUPLE, 'vintage', { x: 4, y: 3, w: 36, h: '120px', z: 1 }, { imageFilter: 'bw', rotation: -4 }),
      img('mb-2', COUPLE_2, 'circle', { x: 44, y: 3, w: 24, h: '110px', z: 2 }, { imageFilter: 'bw' }),
      img('mb-3', COUPLE_3, 'rounded', { x: 70, y: 3, w: 26, h: '120px', z: 3 }, { imageFilter: 'bw', rotation: 5 }),
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
      img('mb-4', COUPLE_2, 'shadow-luxury', { x: 46, y: 30, w: 50, h: '150px', z: 6 }, { imageFilter: 'bw', rotation: 2, imageShadow: true }),
      img('mb-5', PORTRAIT_M, 'circle', { x: 6, y: 58, w: 28, h: '110px', z: 7 }, { imageFilter: 'bw' }),
      img('mb-6', PORTRAIT_F, 'oval', { x: 38, y: 58, w: 28, h: '120px', z: 8 }, { imageFilter: 'bw', rotation: -3 }),
      illu('mb-heart', 'hearts', '#f7f4ef', { x: 74, y: 50, w: 18, z: 11 }, { opacity: 80, rotation: 12 }),
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
      illu('dm-spark', 'sparkles', '#171614', { x: 80, y: 44, w: 14, z: 8 }),
      illu('dm-spark-2', 'sparkles', '#171614', { x: 6, y: 44, w: 10, z: 9 }, { rotation: 20 }),
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
      img('cf-hero', PORTRAIT_F, 'full-bleed', { x: 0, y: 0, w: 100, h: '520px', z: 1 }, {
        imageFade: 'bottom',
        imageFadeSize: 35,
        imageOverlayColor: '#7c2d12',
        imageOverlayDirection: 'to bottom',
        imageOverlayOpacity: 45,
        imageOverlayBlend: 'soft-light',
        imageFilter: 'dramatic',
      }),
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
        textShadow: 'strong',
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
      img('mg-hero', SUIT, 'magazine', { x: 18, y: 16, w: 64, h: '420px', z: 1 }, { imageFade: 'bottom', imageFadeSize: 22, imageShadow: true }),
      copy('mg-mast', 'ANNIVERSAIRE', { x: 4, y: 3, w: 92, z: 2 }, {
        fontSize: '28px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.22em',
        color: '#f7f4ef',
        textShadow: 'soft',
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
      img('ah-hero', PARTY, 'full-bleed', { x: 0, y: 0, w: 100, h: '620px', z: 1 }, {
        imageFade: 'bottom',
        imageFadeSize: 30,
        imageOverlayColor: '#0a0606',
        imageOverlayDirection: 'to bottom',
        imageOverlayOpacity: 55,
      }),
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
        textShadow: 'strong',
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
      img('pr-face', PORTRAIT_F, 'full-bleed', { x: 0, y: 0, w: 100, h: '680px', z: 1 }, {
        imageFade: 'bottom',
        imageFadeSize: 25,
        imageOverlayColor: '#000000',
        imageOverlayDirection: 'radial',
        imageOverlayOpacity: 55,
      }),
      copy('pr-title', '{{title}}', { x: 8, y: 86, w: 84, z: 2 }, {
        fontSize: '18px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.16em',
        color: '#f7f4ef',
        textShadow: 'soft',
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
  {
    id: 'garden-laurel',
    name: 'Mariage champêtre',
    hint: 'Photo ovale dans une couronne de laurier',
    category: 'mariage',
    suggestedArtStyle: 'aquarelle',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#f6f1e7',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      copy('gl-kicker', 'NOUS NOUS MARIONS', { x: 10, y: 4, w: 80, z: 1 }, {
        fontSize: '11px',
        letterSpacing: '0.32em',
        color: '#5f6f45',
        bold: true,
      }),
      img('gl-photo', COUPLE_3, 'plain', { x: 25, y: 12, w: 50, h: '280px', z: 2 }, {
        imageShape: 'oval',
        imageFilter: 'soft',
        imageShadow: true,
      }),
      illu('gl-laurel', 'laurel', '#6b7c4b', { x: 13, y: 9, w: 74, z: 3 }, { color2: '#a3b18a' }),
      copy('gl-names', '{{title}}', { x: 6, y: 56, w: 88, z: 4 }, {
        fontSize: '40px',
        fontFamily: 'Great Vibes',
        color: '#3f4a2c',
      }),
      copy('gl-date', '{{date}}', { x: 10, y: 67, w: 80, z: 5 }, {
        fontSize: '15px',
        letterSpacing: '0.2em',
        color: '#5f6f45',
        bold: true,
      }),
      copy('gl-place', '{{location}}', { x: 10, y: 72, w: 80, z: 6 }, {
        fontSize: '13px',
        color: '#6b6a5e',
        italic: true,
      }),
      illu('gl-flower', 'flower', '#e8b4b8', { x: 44, y: 78, w: 12, z: 7 }, { color2: '#c98a92', opacity: 90 }),
      rsvp('gl-rsvp', 'Confirmer votre présence', '#5f6f45', { x: 14, y: 88, w: 72, z: 8 }),
    ],
  },
  {
    id: 'dot-wax',
    name: 'Dot et coutume',
    hint: 'Motifs wax, photo festonnée, tons terre',
    category: 'mariage',
    suggestedArtStyle: 'afro-luxe',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#2b1a12',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      illu('dw-wax-1', 'wax', '#d9893b', { x: -16, y: -7, w: 48, z: 1 }, { opacity: 35 }),
      illu('dw-wax-2', 'wax', '#d9893b', { x: 68, y: 76, w: 48, z: 2 }, { opacity: 35 }),
      copy('dw-kicker', 'CÉRÉMONIE DE LA DOT', { x: 8, y: 8, w: 84, z: 3 }, {
        fontSize: '12px',
        letterSpacing: '0.3em',
        color: '#e9b872',
        bold: true,
      }),
      img('dw-photo', COUPLE_4, 'plain', { x: 22, y: 13, w: 56, h: 'auto', z: 4 }, {
        imageShape: 'scallop',
        imageAspect: '1/1',
        imageFilter: 'warm',
        imageShadow: true,
      }),
      copy('dw-names', '{{title}}', { x: 6, y: 52, w: 88, z: 5 }, {
        fontSize: '34px',
        fontFamily: 'Cinzel',
        color: '#f7e7ce',
        textShadow: 'soft',
      }),
      copy('dw-date', '{{date}}', { x: 10, y: 62, w: 80, z: 6 }, {
        fontSize: '15px',
        letterSpacing: '0.18em',
        color: '#e9b872',
        bold: true,
      }),
      copy('dw-place', '{{location}}', { x: 10, y: 67, w: 80, z: 7 }, {
        fontSize: '13px',
        color: '#d8c3a5',
      }),
      illu('dw-rings', 'rings', '#e9b872', { x: 43, y: 72, w: 14, z: 8 }),
      rsvp('dw-rsvp', 'Confirmer votre présence', '#e9b872', { x: 14, y: 88, w: 72, z: 9 }),
    ],
  },
  {
    id: 'birthday-balloons',
    name: 'Anniversaire festif',
    hint: 'Photo ronde, ballons et confettis',
    category: 'fete',
    suggestedArtStyle: 'realiste',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#fff4ec',
    frameType: 'none',
    fontTheme: 'modern',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      illu('bb-confetti', 'confetti', '#f472b6', { x: 0, y: 0, w: 100, z: 1 }, { color2: '#f59e0b', opacity: 70 }),
      illu('bb-balloons', 'balloons', '#ec4899', { x: 64, y: 3, w: 32, z: 2 }, { color2: '#8b5cf6', rotation: 8 }),
      copy('bb-kicker', 'JOYEUX\nANNIVERSAIRE', { x: 6, y: 6, w: 58, z: 3 }, {
        fontSize: '22px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.12em',
        align: 'left',
        color: '#9d174d',
        bold: true,
      }),
      img('bb-photo', PORTRAIT_F, 'plain', { x: 20, y: 22, w: 60, h: 'auto', z: 4 }, {
        imageShape: 'circle',
        imageShadow: true,
      }),
      illu('bb-spark', 'sparkles', '#f59e0b', { x: 12, y: 21, w: 16, z: 5 }),
      copy('bb-name', '{{title}}', { x: 6, y: 63, w: 88, z: 6 }, {
        fontSize: '36px',
        fontFamily: 'Dancing Script',
        color: '#831843',
        bold: true,
      }),
      copy('bb-date', '{{date}}', { x: 10, y: 73, w: 80, z: 7 }, {
        fontSize: '15px',
        letterSpacing: '0.16em',
        color: '#be185d',
        bold: true,
      }),
      copy('bb-place', '{{location}}', { x: 10, y: 78, w: 80, z: 8 }, {
        fontSize: '13px',
        color: '#9d174d',
      }),
      rsvp('bb-rsvp', 'Je serai là !', '#be185d', { x: 14, y: 88, w: 72, z: 9 }),
    ],
  },
  {
    id: 'baptism-dove',
    name: 'Baptême colombe',
    hint: 'Colombe, croix dorée, tons ciel',
    category: 'fete',
    suggestedArtStyle: 'aquarelle',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#eef4fb',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      copy('bd-kicker', 'BAPTÊME', { x: 8, y: 7, w: 84, z: 1 }, {
        fontSize: '26px',
        fontFamily: 'Cinzel',
        letterSpacing: '0.3em',
        color: '#1e3a5f',
      }),
      illu('bd-dove', 'dove', '#7aa7d6', { x: 30, y: 14, w: 40, z: 2 }, { color2: '#1e3a5f' }),
      illu('bd-spark', 'sparkles', '#c5a059', { x: 68, y: 14, w: 14, z: 3 }),
      copy('bd-invite', 'Nous avons la joie de vous inviter au baptême de', { x: 10, y: 42, w: 80, z: 4 }, {
        fontSize: '14px',
        italic: true,
        color: '#475569',
      }),
      copy('bd-name', '{{title}}', { x: 6, y: 48, w: 88, z: 5 }, {
        fontSize: '40px',
        fontFamily: 'Great Vibes',
        color: '#1e3a5f',
      }),
      illu('bd-cross', 'cross', '#c5a059', { x: 44, y: 59, w: 12, z: 6 }, { opacity: 90 }),
      copy('bd-date', '{{date}}', { x: 10, y: 70, w: 80, z: 7 }, {
        fontSize: '15px',
        letterSpacing: '0.18em',
        color: '#1e3a5f',
        bold: true,
      }),
      copy('bd-place', '{{location}}', { x: 10, y: 75, w: 80, z: 8 }, {
        fontSize: '13px',
        color: '#475569',
      }),
      rsvp('bd-rsvp', 'Confirmer votre présence', '#1e3a5f', { x: 14, y: 88, w: 72, z: 9 }),
    ],
  },
  {
    id: 'gala-crown',
    name: 'Gala doré',
    hint: 'Photo fondue dans le noir, couronne dorée',
    category: 'soiree',
    suggestedArtStyle: 'minimaliste-luxe',
    layoutMode: 'free',
    bgType: 'color',
    bgColor: '#0a0a0a',
    frameType: 'none',
    fontTheme: 'editorial',
    canvasWidth: 480,
    canvasHeight: 760,
    canvasSizePreset: 'custom',
    elements: [
      img('gc-hero', SUIT, 'full-bleed', { x: 0, y: 0, w: 100, h: '440px', z: 1 }, {
        imageFade: 'bottom',
        imageFadeSize: 45,
        imageFilter: 'dramatic',
        imageOverlayColor: '#d4af37',
        imageOverlayDirection: 'to top',
        imageOverlayOpacity: 25,
        imageOverlayBlend: 'soft-light',
      }),
      illu('gc-crown', 'crown', '#d4af37', { x: 40, y: 50, w: 20, z: 2 }, { color2: '#f5e6a8' }),
      copy('gc-kicker', 'SOIRÉE DE GALA', { x: 8, y: 61, w: 84, z: 3 }, {
        fontSize: '12px',
        letterSpacing: '0.34em',
        color: '#d4af37',
        bold: true,
      }),
      copy('gc-title', '{{title}}', { x: 6, y: 65, w: 88, z: 4 }, {
        fontSize: '34px',
        fontFamily: 'Cinzel',
        color: '#f5e6a8',
        textShadow: 'glow',
        textShadowColor: '#b8860b',
      }),
      copy('gc-date', '{{date}}  ·  {{location}}', { x: 8, y: 76, w: 84, z: 5 }, {
        fontSize: '13px',
        letterSpacing: '0.14em',
        color: '#cfc8bc',
      }),
      rsvp('gc-rsvp', 'Réserver ma place', '#d4af37', { x: 18, y: 88, w: 64, z: 6 }),
    ],
  },
];

export function editorialLayoutById(id: EditorialLayoutId): EditorialLayout {
  const found = EDITORIAL_LAYOUTS.find((layout) => layout.id === id);
  if (!found) throw new Error(`Mise en page inconnue: ${id}`);
  return found;
}

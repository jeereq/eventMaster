import type { PlanType } from '@prisma/client';

export const SEED_PASSWORD = 'password123';

export function billingPeriod(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function addDays(days: number, from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

export function licenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `EM-${segment()}-${segment()}-${segment()}`;
}

type TemplateElement = Record<string, unknown>;

export function buildTemplateContent(
  elements: TemplateElement[],
  global: Record<string, unknown> = {},
) {
  return {
    customDesign: true,
    elements,
    global: {
      bgType: 'pattern',
      bgColor: '#faf8f5',
      bgPattern: 'paper',
      frameType: 'double-border',
      fontTheme: 'classic',
      floralColor: '#b91c1c',
      floralType: 'roses',
      floralDensity: 35,
      canvasSizePreset: 'standard',
      canvasWidth: 480,
      canvasHeight: 720,
      landingCategory: 'private',
      ...global,
    },
  };
}

export const GLOBAL_CATALOG_TEMPLATES: Array<{
  name: string;
  showOnLanding: boolean;
  global: Record<string, unknown>;
  elements: TemplateElement[];
}> = [
  {
    name: 'Mariage Élégant — Or & Ivoire',
    showOnLanding: true,
    global: { bgColor: '#fdf8f3', floralColor: '#c5a059', landingCategory: 'wedding' },
    elements: [
      { id: 'g1', type: 'text', text: 'NOUS VOUS INVITONS', color: '#c5a059', fontSize: '11px', align: 'center', letterSpacing: '0.2em' },
      { id: 'g2', type: 'text', text: 'Célébration de notre union', color: '#78350f', fontSize: '30px', align: 'center', fontFamily: 'Cormorant Garamond' },
      { id: 'g3', type: 'divider', dividerStyle: 'ornament-flower', color: '#c5a059', align: 'center' },
      { id: 'g4', type: 'text', text: 'Rejoignez-nous pour une soirée inoubliable entourés de nos proches.', color: '#57534e', fontSize: '14px', align: 'center' },
      { id: 'g5', type: 'rsvp-block', text: 'Confirmer ma présence', color: '#c5a059', fontSize: '15px', align: 'center', rsvpPlacement: 'outside' },
    ],
  },
  {
    name: 'Gala Corporate — Bleu Nuit',
    showOnLanding: true,
    global: { bgColor: '#0f172a', bgType: 'color', frameType: 'none', landingCategory: 'corporate' },
    elements: [
      { id: 'g1', type: 'text', text: 'SOIRÉE D\'ENTREPRISE', color: '#93c5fd', fontSize: '11px', align: 'center', letterSpacing: '0.15em' },
      { id: 'g2', type: 'text', text: 'Gala Annuel 2026', color: '#f8fafc', fontSize: '32px', align: 'center', bold: true },
      { id: 'g3', type: 'text', text: 'Tenue de soirée souhaitée · Cocktail & dîner assis', color: '#94a3b8', fontSize: '13px', align: 'center' },
      { id: 'g4', type: 'rsvp-block', text: 'Répondre à l\'invitation', color: '#3b82f6', fontSize: '15px', align: 'center' },
    ],
  },
  {
    name: 'Anniversaire Festif — Pop',
    showOnLanding: true,
    global: { bgColor: '#fff7ed', bgPattern: 'watercolor', floralColor: '#ea580c', landingCategory: 'birthday' },
    elements: [
      { id: 'g1', type: 'text', text: "C'EST LA FÊTE !", color: '#ea580c', fontSize: '12px', align: 'center', bold: true },
      { id: 'g2', type: 'text', text: 'Venez célébrer avec nous', color: '#9a3412', fontSize: '28px', align: 'center' },
      { id: 'g3', type: 'text', text: 'Musique, buffet et surprises vous attendent.', color: '#7c2d12', fontSize: '14px', align: 'center' },
      { id: 'g4', type: 'button', text: 'Je serai là !', color: '#ea580c', fontSize: '14px', align: 'center', buttonStyle: 'pill', buttonLink: '#rsvp-section' },
      { id: 'g5', type: 'rsvp-block', text: 'Confirmer', color: '#ea580c', fontSize: '15px', align: 'center', rsvpPlacement: 'outside' },
    ],
  },
  {
    name: 'Conférence Pro — Minimal',
    showOnLanding: false,
    global: { bgColor: '#ffffff', frameType: 'double-border', landingCategory: 'conference' },
    elements: [
      { id: 'g1', type: 'text', text: 'CONFÉRENCE & NETWORKING', color: '#4f46e5', fontSize: '11px', align: 'center' },
      { id: 'g2', type: 'text', text: 'Rencontre des professionnels', color: '#1e293b', fontSize: '26px', align: 'center' },
      { id: 'g3', type: 'rsvp-block', text: 'Inscription', color: '#4f46e5', fontSize: '15px', align: 'center' },
    ],
  },
];

export const PLAN_AMOUNTS: Partial<Record<PlanType, number>> = {
  PERSONAL_50: 10000,
  PERSONAL_100: 15000,
  PERSONAL_200: 20000,
  PERSONAL_PLUS: 30000,
  STANDARD: 30000,
  PREMIUM_1: 55000,
  PREMIUM_2: 85000,
  ENTERPRISE_2: 525000,
  VENUE: 14900,
  SERVICE: 9900,
  CATALOG: 19900,
};

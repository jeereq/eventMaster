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

export { GLOBAL_CATALOG_TEMPLATES } from './invitationTemplates';

export const PLAN_AMOUNTS: Partial<Record<PlanType, number>> = {
  PERSONAL_50: 60000,
  PERSONAL_100: 90000,
  PERSONAL_200: 120000,
  PERSONAL_PLUS: 180000,
  STANDARD: 30000,
  PREMIUM_1: 55000,
  PREMIUM_2: 85000,
  ENTERPRISE_2: 525000,
  VENUE: 14900,
  SERVICE: 9900,
  CATALOG: 19900,
};

import type { LandingTemplate } from '@/config/landingTemplates';
import { LEGACY_STATIC_LANDING_IDS } from '@/config/landingTemplates';

export interface PublicTemplateDto {
  id: string;
  name: string;
  tenantId?: string | null;
  isGlobal?: boolean;
  showOnLanding?: boolean;
  content?: {
    global?: {
      bgColor?: string;
      landingCategory?: 'private' | 'corporate' | 'casual';
      landingDescription?: string;
    };
    elements?: Array<{
      type: string;
      text?: string;
      color?: string;
      fontSize?: string;
    }>;
  };
  category?: 'private' | 'corporate' | 'casual';
  description?: string | null;
  createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:5001/api';

function isDarkHex(hex?: string): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

function isUuidLike(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function dbTemplateToLandingTemplate(t: PublicTemplateDto): LandingTemplate {
  const global = t.content?.global || {};
  const rawElements = t.content?.elements || [];
  const category =
    t.category ||
    global.landingCategory ||
    'private';
  const bgColor = global.bgColor || '#faf8f5';
  const dark = isDarkHex(bgColor);

  let previewElements: LandingTemplate['elements'] = rawElements
    .filter((el) => el.type === 'text' || el.type === 'button')
    .slice(0, 4)
    .map((el) => ({
      type: (el.type === 'button' ? 'button' : 'text') as 'text' | 'button',
      content: el.text || '',
      color: el.color || (dark ? '#e2e8f0' : '#334155'),
      fontSize: el.fontSize || (el.type === 'button' ? undefined : 'text-sm'),
    }));

  if (previewElements.length === 0) {
    previewElements = [
      { type: 'text', content: t.name.toUpperCase(), color: dark ? '#cbd5e1' : '#64748b', fontSize: 'text-xs tracking-widest' },
      { type: 'text', content: t.name, color: dark ? '#f8fafc' : '#0f172a', fontSize: 'text-2xl font-extrabold' },
      { type: 'button', content: 'Confirmer ma présence' },
    ];
  }

  return {
    id: t.id,
    name: t.name,
    category,
    group: category,
    description:
      t.description ||
      global.landingDescription ||
      `Modèle « ${t.name} » — personnalisable dans le concepteur visuel EventMaster.`,
    style: {
      bg: 'bg-transparent',
      border: 'border-transparent',
      bgColor,
      borderColor: dark ? 'rgba(148,163,184,0.35)' : 'rgba(226,232,240,0.95)',
      textTitle: dark ? 'text-white' : 'text-slate-900',
      textBody: dark ? 'text-slate-400' : 'text-slate-600',
      btnBg: 'bg-indigo-600 hover:bg-indigo-700',
      btnText: 'text-white font-bold',
    },
    elements: previewElements,
    previewContent:
      t.content && typeof t.content === 'object'
        ? {
            global: (t.content as { global?: Record<string, unknown> }).global,
            elements: Array.isArray((t.content as { elements?: unknown[] }).elements)
              ? ((t.content as { elements: Array<Record<string, unknown>> }).elements)
              : [],
          }
        : undefined,
  };
}

function normalizePublicTemplateList(data: unknown): PublicTemplateDto[] {
  if (Array.isArray(data)) return data as PublicTemplateDto[];
  if (data && typeof data === 'object' && Array.isArray((data as { templates?: unknown }).templates)) {
    return (data as { templates: PublicTemplateDto[] }).templates;
  }
  return [];
}

function isGlobalLandingTemplate(t: PublicTemplateDto): boolean {
  if (t.tenantId != null && t.tenantId !== '') return false;
  if (t.isGlobal === false) return false;
  if (t.showOnLanding === false) return false;
  return true;
}

export function publicTemplatesToLanding(publicTemplates: PublicTemplateDto[]): LandingTemplate[] {
  return publicTemplates
    .filter((t) => t?.id && isUuidLike(t.id) && !LEGACY_STATIC_LANDING_IDS.has(t.id))
    .filter(isGlobalLandingTemplate)
    .map(dbTemplateToLandingTemplate);
}

/** Charge les modèles vitrine depuis l'API publique (sans cache navigateur). */
export async function fetchPublicLandingTemplates(): Promise<LandingTemplate[]> {
  try {
    const response = await fetch(`${API_BASE}/public/templates`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return publicTemplatesToLanding(normalizePublicTemplateList(data));
  } catch {
    return [];
  }
}

export function templateContentToLandingPreview(params: {
  id: string;
  name: string;
  content?: unknown;
}): LandingTemplate {
  return dbTemplateToLandingTemplate({
    id: params.id,
    name: params.name,
    content: params.content as PublicTemplateDto['content'],
    createdAt: new Date().toISOString(),
  });
}

export function getTemplateElementSummary(content: unknown): string {
  const c = content as { elements?: Array<{ type: string }> } | null | undefined;
  const elements = c?.elements;
  if (!Array.isArray(elements) || elements.length === 0) return 'Aucun élément';

  const textCount = elements.filter((e) => e.type === 'text').length;
  const btnCount = elements.filter((e) => e.type === 'button').length;
  const rsvpCount = elements.filter((e) => e.type === 'rsvp-block').length;
  const parts = [`${elements.length} élément${elements.length > 1 ? 's' : ''}`];
  if (textCount) parts.push(`${textCount} texte`);
  if (btnCount) parts.push(`${btnCount} bouton`);
  if (rsvpCount) parts.push(`${rsvpCount} RSVP`);
  return parts.join(' · ');
}

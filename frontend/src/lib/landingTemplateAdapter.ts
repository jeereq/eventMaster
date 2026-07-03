import type { LandingTemplate } from '@/config/landingTemplates';

export interface PublicTemplateDto {
  id: string;
  name: string;
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
  createdAt: string;
}

function isDarkHex(hex?: string): boolean {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

export function dbTemplateToLandingTemplate(t: PublicTemplateDto): LandingTemplate {
  const global = t.content?.global || {};
  const rawElements = t.content?.elements || [];
  const category = global.landingCategory || 'private';
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
  };
}

export function publicTemplatesToLanding(publicTemplates: PublicTemplateDto[]): LandingTemplate[] {
  return publicTemplates.map(dbTemplateToLandingTemplate);
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

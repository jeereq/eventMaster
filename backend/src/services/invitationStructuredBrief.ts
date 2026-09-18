import type { InvitationCopyLanguage } from './invitationPromptFidelity.ts';

export type InvitationCeremonyId =
  | 'mariage'
  | 'dot'
  | 'anniversaire'
  | 'gala'
  | 'bapteme'
  | 'autre';

export type InvitationStructuredBrief = {
  ceremony: InvitationCeremonyId | null;
  language: InvitationCopyLanguage | null;
  mood: string[];
  mustKeep: string;
  title: string;
  honorees: string;
  date: string;
  description: string;
  /** En mode modification : quels champs remplacer sur le modèle. */
  replaceTitle: boolean;
  replaceHonorees: boolean;
  replaceDate: boolean;
  replaceDescription: boolean;
};

export const INVITATION_CEREMONIES: readonly InvitationCeremonyId[] = [
  'mariage',
  'dot',
  'anniversaire',
  'gala',
  'bapteme',
  'autre',
];

const CEREMONY_LABELS: Record<InvitationCeremonyId, string> = {
  mariage: 'wedding',
  dot: 'customary dowry / dot',
  anniversaire: 'birthday',
  gala: 'gala',
  bapteme: 'baptism',
  autre: 'celebration',
};

export const EVENTMASTER_STYLE_FEWSHOT = `EVENTMASTER STYLE (object fidelity — not people):
- Example 1: tall 9:16 cotton-paper card, double gold fillet, ivory field, tropical florals receding, empty lower third for later type.
- Example 2: Afro-luxe Kuba / Kasai velvet border, burnished gold, warm Kinshasa light, no painted letters.`;

export function emptyInvitationStructuredBrief(): InvitationStructuredBrief {
  return {
    ceremony: null,
    language: null,
    mood: [],
    mustKeep: '',
    title: '',
    honorees: '',
    date: '',
    description: '',
    replaceTitle: true,
    replaceHonorees: true,
    replaceDate: true,
    replaceDescription: true,
  };
}

export function parseInvitationCeremony(value: unknown): InvitationCeremonyId | null {
  return typeof value === 'string' && (INVITATION_CEREMONIES as readonly string[]).includes(value)
    ? (value as InvitationCeremonyId)
    : null;
}

function parseShortText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function parseInvitationStructuredBrief(raw: unknown): InvitationStructuredBrief {
  const empty = emptyInvitationStructuredBrief();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty;
  const value = raw as Record<string, unknown>;
  const mood = Array.isArray(value.mood)
    ? value.mood
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim().slice(0, 32))
        .slice(0, 3)
    : typeof value.mood === 'string' && value.mood.trim()
      ? value.mood.split(/[,/|]/).map((item) => item.trim()).filter(Boolean).slice(0, 3)
      : [];
  const language =
    value.language === 'fr' ||
    value.language === 'ln' ||
    value.language === 'sw' ||
    value.language === 'kg' ||
    value.language === 'lua'
      ? value.language
      : null;
  return {
    ceremony: parseInvitationCeremony(value.ceremony),
    language,
    mood,
    mustKeep: parseShortText(value.mustKeep, 160),
    title: parseShortText(value.title, 120),
    honorees: parseShortText(value.honorees, 160),
    date: parseShortText(value.date, 80),
    description: parseShortText(value.description, 280),
    replaceTitle: value.replaceTitle !== false,
    replaceHonorees: value.replaceHonorees !== false,
    replaceDate: value.replaceDate !== false,
    replaceDescription: value.replaceDescription !== false,
  };
}

export function hasInvitationStructuredBrief(brief: InvitationStructuredBrief): boolean {
  return Boolean(
    brief.ceremony ||
      brief.language ||
      brief.mood.length ||
      brief.mustKeep ||
      brief.title ||
      brief.honorees ||
      brief.date ||
      brief.description,
  );
}

export function formatInvitationStructuredBrief(brief: InvitationStructuredBrief): string {
  if (!hasInvitationStructuredBrief(brief)) return '';
  const lines = ['STRUCTURED BRIEF:'];
  if (brief.ceremony) lines.push(`- Ceremony: ${CEREMONY_LABELS[brief.ceremony]}`);
  if (brief.language) lines.push(`- Language: ${brief.language}`);
  if (brief.mood.length) lines.push(`- Mood: ${brief.mood.join(', ')}`);
  if (brief.mustKeep) lines.push(`- Must keep: ${brief.mustKeep}`);
  if (brief.title || brief.honorees || brief.date || brief.description) {
    lines.push('CARD VARIABLES:');
    if (brief.title) lines.push(`- Title: ${brief.title}`);
    if (brief.honorees) lines.push(`- Honorees / couple / hosts: ${brief.honorees}`);
    if (brief.date) lines.push(`- Date: ${brief.date}`);
    if (brief.description) lines.push(`- Description: ${brief.description}`);
    const replace: string[] = [];
    if (brief.title && brief.replaceTitle) replace.push('title');
    if (brief.honorees && brief.replaceHonorees) replace.push('honorees');
    if (brief.date && brief.replaceDate) replace.push('date');
    if (brief.description && brief.replaceDescription) replace.push('description');
    if (replace.length) {
      lines.push(`- Replace on model image (keep layout): ${replace.join(', ')}`);
    }
  }
  return lines.join('\n');
}

export function mergeInvitationStructuredBrief(
  freeText: string,
  brief: InvitationStructuredBrief,
): string {
  const formatted = formatInvitationStructuredBrief(brief);
  const base = String(freeText || '').trim();
  if (!formatted) return base;
  if (!base) return formatted;
  return `${base}\n\n${formatted}`;
}

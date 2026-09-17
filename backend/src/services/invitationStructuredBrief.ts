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
  return { ceremony: null, language: null, mood: [], mustKeep: '' };
}

export function parseInvitationCeremony(value: unknown): InvitationCeremonyId | null {
  return typeof value === 'string' && (INVITATION_CEREMONIES as readonly string[]).includes(value)
    ? (value as InvitationCeremonyId)
    : null;
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
    mustKeep: typeof value.mustKeep === 'string' ? value.mustKeep.trim().slice(0, 160) : '',
  };
}

export function hasInvitationStructuredBrief(brief: InvitationStructuredBrief): boolean {
  return Boolean(brief.ceremony || brief.language || brief.mood.length || brief.mustKeep);
}

export function formatInvitationStructuredBrief(brief: InvitationStructuredBrief): string {
  if (!hasInvitationStructuredBrief(brief)) return '';
  const lines = ['STRUCTURED BRIEF:'];
  if (brief.ceremony) lines.push(`- Ceremony: ${CEREMONY_LABELS[brief.ceremony]}`);
  if (brief.language) lines.push(`- Language: ${brief.language}`);
  if (brief.mood.length) lines.push(`- Mood: ${brief.mood.join(', ')}`);
  if (brief.mustKeep) lines.push(`- Must keep: ${brief.mustKeep}`);
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

export type InvitationCeremonyId =
  | 'mariage'
  | 'dot'
  | 'anniversaire'
  | 'gala'
  | 'bapteme'
  | 'autre';

export type InvitationBriefLanguage = 'fr' | 'ln' | 'sw' | 'kg' | 'lua';

export type InvitationStructuredBrief = {
  ceremony: InvitationCeremonyId | null;
  language: InvitationBriefLanguage | null;
  mood: string[];
  mustKeep: string;
  title: string;
  honorees: string;
  date: string;
  description: string;
  replaceTitle: boolean;
  replaceHonorees: boolean;
  replaceDate: boolean;
  replaceDescription: boolean;
};

export const INVITATION_CEREMONY_OPTIONS: Array<{ id: InvitationCeremonyId; label: string }> = [
  { id: 'mariage', label: 'Mariage' },
  { id: 'dot', label: 'Dot' },
  { id: 'anniversaire', label: 'Anniversaire' },
  { id: 'gala', label: 'Gala' },
  { id: 'bapteme', label: 'Baptême' },
  { id: 'autre', label: 'Autre' },
];

export const INVITATION_BRIEF_LANGUAGE_OPTIONS: Array<{ id: InvitationBriefLanguage; label: string }> = [
  { id: 'fr', label: 'Français' },
  { id: 'ln', label: 'Lingala' },
  { id: 'sw', label: 'Swahili' },
  { id: 'kg', label: 'Kikongo' },
  { id: 'lua', label: 'Tshiluba' },
];

export const INVITATION_MOOD_CHIPS = [
  'Or ivoire',
  'Wax royal',
  'Kuba',
  'Floral',
  'Sobre',
  'Crépuscule',
  'Champagne',
  'Forêt',
] as const;

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

export function toggleInvitationMood(current: string[], chip: string): string[] {
  if (current.includes(chip)) return current.filter((item) => item !== chip);
  if (current.length >= 3) return current;
  return [...current, chip];
}

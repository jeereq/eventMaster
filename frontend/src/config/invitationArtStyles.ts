export type InvitationArtStyleId =
  | 'realiste'
  | 'dessin-anime'
  | 'illustration'
  | 'aquarelle'
  | 'stylise-3d';

export const DEFAULT_INVITATION_ART_STYLE: InvitationArtStyleId = 'realiste';

export const INVITATION_ART_STYLES: Array<{
  id: InvitationArtStyleId;
  label: string;
  summary: string;
}> = [
  {
    id: 'realiste',
    label: 'Réaliste',
    summary: 'Photo ultra-réelle : grain, or, lumière volume.',
  },
  {
    id: 'dessin-anime',
    label: 'Dessin animé',
    summary: '2D immersif, plans et profondeur.',
  },
  {
    id: 'illustration',
    label: 'Illustration',
    summary: 'Peinture en volume, scène où l’on entre.',
  },
  {
    id: 'aquarelle',
    label: 'Aquarelle',
    summary: 'Lavis en profondeur, papier coton.',
  },
  {
    id: 'stylise-3d',
    label: '3D stylisé',
    summary: 'Volume cinéma, on tourne autour.',
  },
];

const STYLE_IDS = new Set(INVITATION_ART_STYLES.map((item) => item.id));

export function parseInvitationArtStyle(raw: unknown): InvitationArtStyleId {
  if (typeof raw !== 'string') return DEFAULT_INVITATION_ART_STYLE;
  const id = raw.trim().toLowerCase() as InvitationArtStyleId;
  return STYLE_IDS.has(id) ? id : DEFAULT_INVITATION_ART_STYLE;
}

const STORAGE_KEY = 'em-invitation-art-style';

export function readStoredInvitationArtStyle(): InvitationArtStyleId {
  if (typeof window === 'undefined') return DEFAULT_INVITATION_ART_STYLE;
  try {
    return parseInvitationArtStyle(localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_INVITATION_ART_STYLE;
  }
}

export function persistInvitationArtStyle(id: InvitationArtStyleId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* quota / private */
  }
}
